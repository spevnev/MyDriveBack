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

	async getRootFile(user_id: number): Promise<FileModel | null> {
		const result = await this.DBService.query("select * from files where owner_id = $1 and parent_id is null;", [user_id]) as [FileModel?];
		if (result.length !== 1) return null;
		return result[0];
	}

	async getEntriesInFolder(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1;", [parent_id]) as FileModel[];
	}

	async getFilesInFolder(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1 and type != 'directory';", [parent_id]) as FileModel[];
	}

	async getFoldersInFolder(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1 and type = 'directory';", [parent_id]) as FileModel[];
	}

	async getEntriesInRoot(user_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id is null and owner_id = $1;", [user_id]) as FileModel[];
	}

	async getFilesInRoot(user_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id is null and owner_id = $1 and type != 'directory';", [user_id]) as FileModel[];
	}

	async getFoldersInRoot(user_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id is null and owner_id = $1 and type = 'directory';", [user_id]) as FileModel[];
	}

	async getSharedFoldersInRoot(user_id: number): Promise<FileModel[]> {
		return await this.DBService.query(`
			with
				sub as (select root_file from share as s where s.can_read_users @> $1),
				f as (select * from files where parent_id is null and type = 'directory')
			select *
			from f, sub
			where f.id = sub.root_file;
		`, [[user_id]]) as FileModel[];
	}

	async getSharePolicy(share_id: number, user_id: number): Promise<{ canEdit: boolean } | null> {
		const result = await this.DBService.query("select * from share where id = $1;", [share_id]) as [{ id: number, can_edit_users: number[], can_read_users: number[] }?];
		if (result.length === 0) return null;

		const {can_edit_users, can_read_users} = result[0];
		if (can_edit_users.includes(user_id)) return {canEdit: true};
		if (can_read_users.includes(user_id)) return {canEdit: false};
		return null;
	}

	async hasAccess(user_id: number, parent_id: number | null, share_id?: number): Promise<{ canEdit: boolean } | null> {
		if (share_id) return await this.getSharePolicy(share_id, user_id);
		if (parent_id === null && share_id === undefined) return {canEdit: true};

		const file = !parent_id ? await this.getRootFile(user_id) : await this.getFile(parent_id);
		if (file === null) return null;
		if (file.owner_id === user_id) return {canEdit: true};

		return await this.getSharePolicy(file.share_id, user_id);
	}
}