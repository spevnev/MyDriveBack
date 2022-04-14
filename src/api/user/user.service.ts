import {Injectable} from "@nestjs/common";
import {UserModel} from "./user.model";
import {DBService} from "../../services/db.service";

@Injectable()
export class UserService {
	constructor(
		private DBService: DBService,
	) {}

	async getUser(username: string): Promise<UserModel | null> {
		const user = await this.DBService.query("select * from users where username = $1;", [username]);
		if (user.length !== 1) return null;

		return user[0];
	}

	async createUser(user: { username: string, password: string }): Promise<number | null> {
		const result = await this.DBService.query("insert into users(username, password) values($1, $2) returning id;", [user.username, user.password]);
		if (!result[0]) return null;

		return result[0].id;
	}
}