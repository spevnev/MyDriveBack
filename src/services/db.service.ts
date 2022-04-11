import {Injectable} from "@nestjs/common";
import {Pool, QueryResult} from "pg";

const CONNECTION_STRING = "postgresql://root:root@localhost:5432/mydrive";

// TODO: Move to class/constructor
const client: Pool = new Pool({
	connectionString: CONNECTION_STRING,
	max: 20,
});

@Injectable()
export class DBService {
	constructor() {
		void this.testConnection();
	}

	async query(expression: string, values?: any[]): Promise<null | QueryResult> {
		try {
			return await client.query(expression, values);
		} catch (e) {
			if (process.env.NODE_ENV === "development") console.log(e);
			return null;
		}
	}

	async transaction(...queries: [string, any[]]): Promise<(null | QueryResult)[]> { // TODO: test!
		try {
			await this.query("begin;");

			const res: (null | QueryResult)[] = [];
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

	async testConnection(): Promise<void> {
		const res = await this.query("select now()");
		if (res === null) throw new Error(`Couldn't connect to DB with string ${CONNECTION_STRING}`);
	}
}