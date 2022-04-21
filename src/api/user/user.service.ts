import {Injectable} from "@nestjs/common";
import {UserModel} from "./user.model";
import {DBService} from "../../services/db.service";

const GIGABYTE = 2 ** 30;

@Injectable()
export class UserService {
	constructor(
		private DBService: DBService,
	) {}

	async getUser(username: string): Promise<UserModel | null> {
		const user = await this.DBService.query("select * from users where username = $1;", [username]) as [UserModel];
		if (user.length !== 1) return null;

		return user[0];
	}

	async getFreeSpace(id: number): Promise<number | null> {
		const user = await this.DBService.query("select * from users where id = $1;", [id]) as [UserModel];
		if (user.length !== 1) return null;

		return GIGABYTE - user[0].space_used;
	}

	async increaseUsedSpace(id: number, size: number): Promise<void> {
		await this.DBService.query("update users set space_used = (select space_used from users where id = $1) + $2 where id = $1;", [id, size]);
	}

	async createUser(user: { username: string, password: string }): Promise<UserModel | null> {
		try {
			await this.DBService.query("begin;");

			const maxUserId = await this.DBService.query("select max(id) as id from users;") as [{ id: number }];
			const nextUserId = maxUserId[0].id + 1;

			const driveId = await this.DBService.query("insert into files(owner_id, parent_id, share_id, is_directory, size, name) values($1, null, null, true, 0, 'Drive') returning id;", [nextUserId]) as [{ id: number }];
			const binId = await this.DBService.query("insert into files(owner_id, parent_id, share_id, is_directory, size, name) values($1, null, null, true, 0, 'Bin') returning id;", [nextUserId]) as [{ id: number }];
			const res = await this.DBService.query("insert into users(username, password, drive_id, bin_id) values($1, $2, $3, $4) returning *;", [user.username, user.password, driveId[0].id, binId[0].id]) as [UserModel];

			await this.DBService.query("commit;");
			return res[0];
		} catch (e) {
			await this.DBService.query("rollback;");
			console.log(e);
			return null;
		}
	}
}