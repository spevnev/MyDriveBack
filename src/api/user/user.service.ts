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

	async createUser(user: UserModel): Promise<boolean> {
		const result = await this.DBService.query("insert into users(username, password) values($1, $2);", [user.username, user.password]);
		if (result === null) return false;

		return true;
	}
}