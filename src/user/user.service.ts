import {Injectable} from "@nestjs/common";
import {UserModel} from "./user.model";

@Injectable()
export class UserService {
	users: UserModel[] = [];

	async getUser(username: string): Promise<UserModel | null> {
		const user = this.users.filter(user => user.username === username);
		if (user.length !== 1) return null;

		return user[0];
	}

	async createUser(user: UserModel): Promise<boolean>{
		this.users.push(user);
		return true;
	}
}