import {Injectable} from "@nestjs/common";
import {DBService} from "../../services/db.service";
import {FileModel} from "./file.model";
import {SimpleFileEntryInput} from "./dto/uploadFiles.args";
import {FileEntry} from "./dto/uploadFilesAndFolders.args";
import {UserService} from "../user/user.service";
import {SimpleFileEntry} from "./dto/simpleFileEntry";

@Injectable()
export class FileService {
	constructor(
		private DBService: DBService,
		private userService: UserService,
	) {}

	async getFile(id: number): Promise<FileModel | null> {
		const result = await this.DBService.query("select * from files where id = $1;", [id]) as [FileModel?];
		if (result.length !== 1) return null;
		return result[0];
	}

	async getEntries(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1;", [parent_id]) as FileModel[];
	}

	async getFiles(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1 and is_directory = false;", [parent_id]) as FileModel[];
	}

	async getFolders(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query("select * from files where parent_id = $1 and is_directory = true;", [parent_id]) as FileModel[];
	}

	async getFoldersInFolderRecursively(parent_id: number): Promise<FileModel[]> {
		return await this.DBService.query(`
			with recursive directories as (
			  select f.id, f.parent_id, f.name, 0 as depth from files f
				where parent_id = $1 and is_directory = true
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

	async hasAccess(user_id: number, parent_id: number, share_id?: number): Promise<{ canEdit: boolean } | null> {
		if (share_id) return await this.getSharePolicy(share_id, user_id);

		const file = await this.getFile(parent_id);
		if (file === null) return null;
		if (file.owner_id === user_id) return {canEdit: true};

		return await this.getSharePolicy(file.share_id, user_id);
	}

	async doFilesCollide(names: string[], parent_id: number, is_directory: boolean): Promise<boolean> {
		const result = await this.DBService.query("select count(1) from files where parent_id = $1 and is_directory = $2 and name = any($3)", [parent_id, is_directory, names]) as [{ count: number }?];
		if (result.length === 0) return true;

		const count = Number(result[0].count);
		if (isNaN(count)) return true;
		return count !== 0;
	}

	async canUpload(owner_id: number, parent_id: number, topLevelEntries: SimpleFileEntry[] | FileEntry[], size: number): Promise<boolean> {
		const permissions = await this.hasAccess(owner_id, parent_id);
		if (permissions === null || permissions.canEdit === false) return false;

		const free_space = await this.userService.getFreeSpace(owner_id);
		if (size > free_space) return false;

		if (topLevelEntries[0] instanceof FileEntry) {
			const fileNames = topLevelEntries.map(entry => !entry.is_directory ? entry.newName || entry.name : null).filter(entry => entry !== null);
			const hasFileCollisions = await this.doFilesCollide(fileNames, parent_id, false);
			const folderNames = topLevelEntries.map(entry => entry.is_directory ? entry.newName || entry.name : null).filter(entry => entry !== null);
			const hasFolderCollisions = await this.doFilesCollide(folderNames, parent_id, true);
			if (hasFileCollisions || hasFolderCollisions) return false;
		} else {
			const names = topLevelEntries.map(entry => entry.newName || entry.name);
			const hasFileCollisions = await this.doFilesCollide(names, parent_id, false);
			if (hasFileCollisions) return false;
		}

		return true;
	}

	async uploadFiles(entries: SimpleFileEntryInput[], owner_id: number, parent_id: number): Promise<Map<string, number> | null> {
		const file = await this.getFile(parent_id);
		const share_id = file ? file.share_id : null;

		const statement = "insert into files(owner_id, parent_id, share_id, is_directory, size, name) values($1, $2, $3, false, $4, $5) returning name, id;";
		const queries: [string, any[]][] = entries.map(entry => [statement, [owner_id, parent_id, share_id, entry.size, entry.newName || entry.name]]);
		const result = await this.DBService.transaction(queries) as [{ name: string, id: number }][];

		const map = new Map<string, number>();
		result.forEach(result => map.set(result[0].name, result[0].id));

		return map;
	}

	async uploadFilesAndFolders(entries: FileEntry[], owner_id: number, parent_id: number): Promise<Map<string, number> | null> {
		const statement = "insert into files(owner_id, parent_id, share_id, size, name, is_directory) values($1, $2, $3, $4, $5, $6) returning id;";
		const pathToId = new Map<string, (number | undefined)>();
		pathToId.set("", parent_id);

		const file = await this.getFile(parent_id);
		const share_id = file ? file.share_id : null;

		await this.DBService.query("begin;");
		let isError = false;
		for (let i = 0; i < entries.length; i++) {
			const {size, name, newName, path, is_directory} = entries[i];
			const parent_id = path === null ? null : pathToId.get(path);

			const res = await this.DBService.query(statement, [owner_id, parent_id, share_id, size, newName || name, is_directory]);
			if (res === null) {
				await this.DBService.query("rollback;");
				isError = true;
				break;
			}

			const key = path ? `${path}/${name}` : name;
			const id = res[0].id;
			pathToId.set(key, id);
		}
		if (!isError) await this.DBService.query("commit;");

		return isError ? null : pathToId;
	}
}