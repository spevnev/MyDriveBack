import {Injectable} from "@nestjs/common";
import {DBService} from "../../services/db.service";
import {FileModel} from "./file.model";

@Injectable()
export class FileService {
	constructor(
		private DBService: DBService,
	) {}

	async getFile(id: number): Promise<FileModel | null> {
		const result = await this.DBService.query("select * from files where id = $1;", [id]) as [FileModel?];
		if (result.length !== 1) return null;
		return result[0];
	}

	async getFilesInDirectory(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1;", [parent_id]) as FileModel[];
	}

	async getFilesInRootDirectory(user_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where owner_id = $1 and parent_id = null;", [user_id]) as FileModel[];
	}

	async getSharePolicy(share_id: number, user_id: number): Promise<{ canEdit: boolean } | null> {
		const result = await this.DBService.query("select * from share where id = $1;", [share_id]) as [{ id: number, can_edit_users: number[], can_read_users: number[] }?];
		if (result.length === 0) return null;

		const {can_edit_users, can_read_users} = result[0];
		if (can_edit_users.includes(user_id)) return {canEdit: true};
		if (can_read_users.includes(user_id)) return {canEdit: false};
		return null;
	}
}