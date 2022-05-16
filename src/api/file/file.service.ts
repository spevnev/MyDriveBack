import {Injectable} from "@nestjs/common";
import {DBService} from "../../services/db.service";
import {FileModel} from "./file.model";
import {SimpleFileEntryInput} from "./dto/uploadFiles.args";
import {FileEntry} from "./dto/uploadFilesAndFolders.args";
import {UserService} from "../user/user.service";

@Injectable()
export class FileService {
	constructor(
		private DBService: DBService,
		private userService: UserService,
	) {}

	async getEntry(entry_id: number): Promise<FileModel | null> {
		const result = await this.DBService.query("select * from files where id = $1;", [entry_id]) as [FileModel?];
		return result.length === 1 ? result[0] : null;
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

	async getSharedFolders(user_id: number): Promise<FileModel[]> {
		return await this.DBService.query(`
			with s as (
				select array_agg(id) ids from share as s where s.can_read_users @> $1
			) select id, name, owner_id, parent_id, share_id, size, name, is_directory, modified_at from files, s
			where is_directory = true and share_id = any(s.ids);
		`, [[user_id]]) as FileModel[];
	}


	async getSharePolicy(entry_id: number, user_id: number): Promise<{ canEdit: boolean } | null> { // TODO. Finish (+ test):
		const result = await this.DBService.query(`
			with recursive
			s as (
			  select * from share where $1 @> can_read_users or $1 @> can_edit_users 
			),
			directories as (
				select * from files where id = $2
				union
				select f.* from s, files as f
				join directories as d
				on f.parent_id = d.id
				where f.share_id = s.id
			)
			select * from directories, s;
		`, [[user_id], entry_id]);
		console.log(result);
		return null;
	}

	async hasAccess(user_id: number, parent_id: number): Promise<{ canEdit: boolean } | null> {
		const file = await this.getEntry(parent_id);
		if (file === null) return null;
		if (file.owner_id === user_id) return {canEdit: true};

		return await this.getSharePolicy(file.id, user_id);
	}

	async doFilesCollide(names: string[], parent_id: number, is_directory: boolean): Promise<boolean> {
		const result = await this.DBService.query("select count(1) from files where parent_id = $1 and is_directory = $2 and name = any($3)", [parent_id, is_directory, names]) as [{ count: number }?];
		if (result.length === 0) return true;

		const count = Number(result[0].count);
		if (isNaN(count)) return true;
		return count !== 0;
	}

	async canUpload(owner_id: number, parent_id: number, topLevelEntries: FileEntry[], size: number): Promise<boolean> {
		const permissions = await this.hasAccess(owner_id, parent_id);
		if (permissions === null || permissions.canEdit === false) return false;

		const free_space = await this.userService.getFreeSpace(owner_id);
		if (size > free_space) return false;

		if (topLevelEntries[0].is_directory !== undefined) {
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


	async uploadFiles(entries: SimpleFileEntryInput[], owner_id: number, parent_id: number): Promise<Map<string, [number, number]> | null> {
		const file = await this.getEntry(parent_id);
		const share_id = file ? file.share_id : null;

		const statement = "insert into files(owner_id, parent_id, share_id, is_directory, size, name) values($1, $2, $3, false, $4, $5) returning name, id;";
		const queries: [string, any[]][] = entries.map(entry => [statement, [owner_id, parent_id, share_id, entry.size, entry.newName || entry.name]]);
		const result = await this.DBService.transaction(queries) as [{ name: string, id: number }][];

		const map = new Map<string, [number, number]>();
		result.forEach(result => map.set(result[0].name, [result[0].id, parent_id]));

		return map;
	}

	async uploadFilesAndFolders(entries: FileEntry[], owner_id: number, parent_id: number): Promise<Map<string, [number, number]> | null> {
		const statement = "insert into files(owner_id, parent_id, share_id, size, name, is_directory) values($1, $2, $3, $4, $5, $6) returning id;";
		const pathToId = new Map<string, [number, number]>();
		pathToId.set("", [parent_id, parent_id]);

		const parent = await this.getEntry(parent_id);
		const share_id = parent ? parent.share_id : null;

		await this.DBService.query("begin;");
		let isError = false;
		for (let i = 0; i < entries.length; i++) {
			const {size, name, newName, path, is_directory} = entries[i];
			const parent_id = path === null ? null : pathToId.get(path)[0];

			const res = await this.DBService.query(statement, [owner_id, parent_id, share_id, size, newName || name, is_directory]) as [{ id: number }];
			if (res === null) {
				await this.DBService.query("rollback;");
				isError = true;
				break;
			}

			const key = path ? `${path}/${name}` : name;
			const id = res[0].id;
			pathToId.set(key, [id, parent_id]);
		}
		if (!isError) await this.DBService.query("commit;");

		return isError ? null : pathToId;
	}

	async createFolder(parent_id: number, user_id: number, name: string): Promise<number | null> {
		const entry = await this.getEntry(parent_id);
		const share_id = entry ? entry.share_id : null;

		const [{id}] = await this.DBService.query("insert into files(owner_id, parent_id, share_id, is_directory, size, name) values ($1, $2, $3, true, 0, $4) returning id;", [user_id, parent_id, share_id, name]) as [{ id: number }];
		return id || null;
	}


	async shareEntries(entry_id: number, policies: { can_read_users: number[], can_edit_users: number[] }) {
		const {can_read_users, can_edit_users} = policies;
		const entry = await this.getEntry(entry_id);
		const parent = await this.getEntry(entry.parent_id);

		if (entry.share_id !== null && parent.share_id !== entry.share_id) {
			await this.DBService.query(`update share set can_read_users = $1, can_edit_users = $2 where id = $3;`, [can_read_users, can_edit_users, entry.share_id]);
		} else {
			const [{id: share_id}] = await this.DBService.query(`insert into share(can_edit_users, can_read_users) values($1, $2) returning id;`, [can_edit_users, can_read_users]) as [{ id: number }];

			await this.DBService.query(`
				with recursive directories as (
					select * from files where id = $1
				  	union
				  	select f.* from files as f
				  	join directories d
				  	on d.id = f.parent_id
				  	where d.share_id = $2 or d.share_id is null
				) update files as f set share_id = $3 from directories as d where f.id = d.id;
			`, [entry_id, entry.share_id, share_id]);
		}
	}
}