import {Injectable} from "@nestjs/common";
import {UserModel} from "./user.model";
import {DBService} from "../../services/db.service";

@Injectable()
export class UserService {
	constructor(
		private DBService: DBService,
	) {}
	users: UserModel[] = [];

	async getUser(username: string): Promise<UserModel | null> {
		const user = this.users.filter(user => user.username === username);
		if (user.length !== 1) return null;

		return user[0];
	}

	async createUser(user: UserModel): Promise<boolean> {
		this.users.push(user);
		return true;
	}
}