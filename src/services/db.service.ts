import {Injectable} from "@nestjs/common";
import {Pool, QueryResult} from "pg";

const CONNECTION_STRING = "postgresql://root:root@localhost:5432/mydrive";

@Injectable()
export class DBService {
	private client: Pool;

	constructor() {
		this.client = new Pool({
			connectionString: CONNECTION_STRING,
			max: 20,
		});

		void this.initDB();
	}

	async initDB(): Promise<void> {
		await this.testConnection();
		await this.createTables();
		await this.createIndexes();
	}

	async testConnection(): Promise<void> {
		const res = await this.query("select now()");
		if (res === null) throw new Error(`Couldn't connect to DB using:  ${CONNECTION_STRING}`);
	}

	async createTables(): Promise<void> {
		await this.transaction([
			[`create table if not exists files
			(
				id         serial       primary key,
				parent_id  int,
				share_id   int,
				owner_id   int          not null,
				type       varchar(10)  not null,
				size       int          not null,
				name       varchar(244) not null,
				modified_at bigint       not null default (round(extract(epoch from now()) * 1000))
			);`],
			[`create table if not exists share
			(
				id             serial primary key,
				root_file       int    unique not null,
				can_edit_users int[]  not null default '{}',
    			can_read_users int[]  not null default '{}'
			);`],
			[`create table if not exists users
    		(
    			id         serial      primary key,
    			username   varchar(32) unique not null,
    			password   varchar(60) not null,
    			space_used int         not null default 0
			);`],
		]);
	}

	async createIndexes(): Promise<void> {
		await this.transaction([
			[`create index if not exists files_parent_idx    on files  (parent_id);`],
			[`create index if not exists files_owner_idx     on files (owner_id);  `],
			[`create index if not exists users_username_idx on users (username); `],
		]);
	}


	async query(expression: string, values?: any[]): Promise<null | any[]> {
		try {
			const query: QueryResult = await this.client.query(expression, values);
			return query.rows;
		} catch (e) {
			console.log(e);
			return null;
		}
	}

	async transaction(queries: ([string, any[]?])[]): Promise<(null | any[])[]> {
		try {
			await this.query("begin;");

			const res: (null | any[])[] = [];
			for (let i = 0; i < queries.length; i++) {
				const [expression, values] = queries[i];
				res.push(await this.query(expression, values));
			}

			await this.query("commit;");
			return res;
		} catch (e) {
			await this.query("rollback;");
			return null;
		}
	}
}