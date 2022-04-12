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
				id          serial    primary key,
				parent_id   int          not null,
				type        varchar(75)  not null,
				size        int          not null,
				name        varchar(256) not null,
				modified_at  varchar(16)  not null default (round(extract(epoch from now()) * 1000))
			);`],
			[`create table if not exists shared
			(
				owner       varchar(32) not null,
				sharer      varchar(32) not null,
				file_id      int         not null,
				can_modify  boolean     not null
			);`],
			[`create table if not exists users
    		(
    			username    varchar(32) primary key,
    			password    varchar(60) not null
			);`],
		]);
	}

	async createIndexes(): Promise<void> {
		await this.transaction([
			[`create index if not exists files_parent_idx   on files   (parent_id);`],
			[`create index if not exists shared_sharer_idx on shared (sharer);`],
			[`create index if not exists shared_file_idx    on shared (file_id);`],
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