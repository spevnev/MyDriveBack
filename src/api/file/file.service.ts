import {Injectable} from "@nestjs/common";
import {DBService} from "../../services/db.service";
import {FileModel} from "./file.model";
import {SimpleFileEntry} from "./dto/uploadFiles.args";
import {FileEntry} from "./dto/uploadFilesAndFolders.args";

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
		return await this.DBService.query("select * from files where parent_id = $1 and is_directory = false;", [parent_id]) as FileModel[];
	}

	async getFoldersInFolder(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1 and is_directory = true;", [parent_id]) as FileModel[];
	}

	async getFoldersInFolderRecursively(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query(`
			with recursive directories as (
			  select f.id, f.parent_id, f.name, 0 as depth from files f
				where parent_id = $1
			  union
			  select f.id, f.parent_id, f.name, d.depth + 1 as depth from files f
				inner join directories d on f.parent_id = d.id
				where  is_directory = true
			) select * from directories;
		`, [parent_id]) as FileModel[];
	}

	async getRootSharedFolders(user_id: number): Promise<FileModel[]> {
		return await this.DBService.query(`
			with
				sub as (select root_file from share as s where s.can_read_users @> $1),
				f as (select * from files where parent_id is null and is_directory = true)
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

	async uploadFiles(entries: SimpleFileEntry[], owner_id: number, parent_id: number): Promise<boolean> {
		const file = await this.getFile(parent_id);
		const share_id = file ? file.share_id : null;

		const statement = "insert into files(owner_id, parent_id, share_id, is_directory, size, name) values($1, $2, $3, false, $4, $5);";
		const queries: [string, any[]][] = entries.map(({name, size}) => [statement, [owner_id, parent_id, share_id, size, name]]);
		const result = await this.DBService.transaction(queries);

		return result.reduce((prev: boolean, cur: any) => prev === false ? false : cur !== null, true);
	}

	async uploadFilesAndFolders(entries: FileEntry[], owner_id: number, parent_id: number): Promise<boolean> {
		const statement = "insert into files(owner_id, parent_id, share_id, size, name, is_directory) values($1, $2, $3, $4, $5, $6) returning id;";
		const pathToId = new Map<string, (number | null)>();
		pathToId.set("", parent_id);

		const file = await this.getFile(parent_id);
		const share_id = file ? file.share_id : null;

		await this.DBService.query("begin;");
		let isError = false;
		for (let i = 0; i < entries.length; i++) {
			const {size, name, path, is_directory} = entries[i];
			const parent_id = path === null ? null : pathToId.get(path);

			const res = await this.DBService.query(statement, [owner_id, parent_id, share_id, size, name, is_directory]);
			if (res === null) {
				await this.DBService.query("rollback;");
				isError = true;
				break;
			}

			if (is_directory) {
				const key = path ? `${path}/${name}` : name;
				pathToId.set(key, res[0].id);
			}
		}
		if (!isError) await this.DBService.query("commit;");

		return !isError;
	}
}