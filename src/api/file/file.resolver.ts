import {Args, Mutation, Query, Resolver} from "@nestjs/graphql";
import {FileModel} from "./file.model";
import {FileService} from "./file.service";
import {AuthenticationMiddleware} from "../../middleware/authentication/authentication.middleware";
import {UseMiddlewares} from "../../middleware/interceptorAsMiddleware";
import {MiddlewareData} from "../../middleware/middlewareDataDecorator";
import {FileEntry, UploadFilesAndFoldersArgs} from "./dto/uploadFilesAndFolders.args";
import {UploadFilesArgs} from "./dto/uploadFiles.args";
import {UserData} from "../../middleware/authentication/user.data";
import {UserService} from "../user/user.service";
import {S3Service} from "../../services/s3.service";
import {UploadFilesReturn} from "./dto/uploadFiles.return";
import {ShareEntriesArgs, SharePolicies} from "./dto/shareEntries.args";
import {SimpleFileEntry} from "./dto/simpleFileEntry";
import {MoveEntriesArgs, MoveEntriesEntry} from "./dto/moveEntries.args";
import {GetPresignedUrl} from "./dto/getPresignedUrls";

@Resolver(of => FileModel)
@UseMiddlewares(AuthenticationMiddleware)
export class FileResolver {
	constructor(
		private S3Service: S3Service,
		private fileService: FileService,
		private userService: UserService,
	) {}


	@Query(returns => FileModel, {nullable: true})
	async entry(
		@Args("id", {type: () => Number}) id: number,
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<FileModel | null> {
		const hasAccess = await this.fileService.hasAccess(user_id, id);
		if (hasAccess === null) return null;

		return await this.fileService.getEntry(id, user_id);
	}

	@Query(returns => String, {nullable: true})
	async entryPresignedUrl(
		@Args("file_id", {type: () => Number}) file_id: number,
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<string | null> {
		const hasAccess = await this.fileService.hasAccess(user_id, file_id);
		if (hasAccess === null) return null;

		const file: FileModel | null = await this.fileService.getEntry(file_id);
		if (file === null || file.is_directory) return null;

		const url = await this.S3Service.createPresignedGet(`${file.owner_id}/${file.id}`);
		return url || null;
	}

	async addPreviews(entries: FileModel[], user_id: number): Promise<FileModel[]> {
		return await Promise.all(entries.map(async entry => {
			if (entry.is_directory === true || !this.fileService.isImage(entry.name)) return entry;

			const preview = await this.S3Service.createPresignedGet(`${user_id}/${entry.id}-preview`) || undefined;
			return {...entry, preview};
		}));
	}

	@Query(returns => [FileModel], {nullable: true})
	async entries(
		@Args("parent_id", {type: () => Number, nullable: true, defaultValue: null}) parent_id: number | null,
		@Args("include_previews", {type: () => Boolean, defaultValue: false}) include_previews: boolean,
		@MiddlewareData() {id: user_id, drive_id}: UserData,
	): Promise<FileModel[] | null> {
		parent_id = parent_id || drive_id;

		const hasAccess = await this.fileService.hasAccess(user_id, parent_id);
		if (hasAccess === null) return null;

		const entries = await this.fileService.getEntries(parent_id, user_id);
		if (include_previews) return await this.addPreviews(entries, user_id);

		return entries.map(entry => ({...entry, can_edit: hasAccess.canEdit}));
	}

	@Query(returns => [GetPresignedUrl], {nullable: true})
	async entriesPresignedUrls(
		@Args("file_ids", {type: () => [Number]}) file_ids: number[],
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<GetPresignedUrl[] | null> {
		for (let i = 0; i < file_ids.length; i++) {
			const hasAccess = await this.fileService.hasAccess(user_id, file_ids[i]);
			if (hasAccess === null) return null;
		}

		const entries: FileModel[] = [];
		await Promise.all(file_ids.map(async id => {
			const entry = await this.fileService.getEntry(id);
			if (!entry.is_directory) {
				entries.push(entry);
				return;
			}

			const childEntries = await this.fileService.getEntries(id, user_id, true);
			entries.push(...childEntries);
		}));

		return await Promise.all(
			entries.map(async entry => {
				const {id, parent_id, name, is_directory} = entry;
				const url = await this.S3Service.createPresignedGet(`${entry.owner_id}/${entry.id}`);

				return {file_id: id, parent_id, name, url, is_directory};
			}),
		);
	}

	@Query(returns => [FileModel], {nullable: true})
	async folders(
		@Args("parent_id", {type: () => Number, nullable: true, defaultValue: null}) parent_id: number | null,
		@Args("recursively", {type: () => Boolean, defaultValue: false}) recursively: boolean,
		@MiddlewareData() {id: user_id, drive_id}: UserData,
	): Promise<FileModel[] | null> {
		parent_id = parent_id || drive_id;

		const hasAccess = await this.fileService.hasAccess(user_id, parent_id);
		if (hasAccess === null) return null;

		if (recursively) return this.fileService.getFoldersInFolderRecursively(parent_id);
		return await this.fileService.getFolders(parent_id);
	}

	@Query(returns => [FileModel], {nullable: true})
	async sharedFolders(
		@Args("include_owners", {type: () => Boolean, defaultValue: false}) include_owners: boolean,
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<FileModel[] | null> {
		return include_owners ? await this.fileService.getSharedFoldersAndOwnerUsernames(user_id) : await this.fileService.getSharedFolders(user_id);
	}

	@Query(returns => [String])
	async usernamesWhoShareWithMe(
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<string[]> {
		return await this.fileService.getUsernamesWhoShareWithUser(user_id);
	}

	@Query(returns => [FileModel])
	async usersSharedEntries(
		@Args("username", {type: () => String}) username: string,
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<FileModel[]> {
		return await this.fileService.getUsersSharedEntries(user_id, username);
	}

	@Query(returns => [SharePolicies])
	async entriesSharePolicies(
		@Args("entry_ids", {type: () => [Number]}) entry_ids: number[],
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<SharePolicies[]> {
		return (await Promise.all(entry_ids.map(async id => {
			const hasAccess = await this.fileService.hasAccess(user_id, id);
			if (!hasAccess) return null;

			return await this.fileService.getSharePolicy(id);
		}))).filter(policy => policy !== null);
	}


	async upload(
		{drive_id, id: owner_id}: UserData,
		{parent_id, entries}: UploadFilesAndFoldersArgs,
		topLevelEntries: SimpleFileEntry[] | FileEntry[],
	): Promise<UploadFilesReturn[] | null> {
		parent_id = parent_id || drive_id;

		const size = entries.reduce((sum, cur) => sum + cur.size, 0);
		if (!await this.fileService.canUpload(owner_id, parent_id, topLevelEntries as FileEntry[], size)) return null;
		await this.userService.increaseUsedSpace(owner_id, size);

		const containsFolders = entries.reduce((val, cur) => val ? true : cur.is_directory !== undefined, false);
		const ids = containsFolders ? await this.fileService.uploadFilesAndFolders(entries, owner_id, parent_id) : await this.fileService.uploadFiles(entries, owner_id, parent_id);

		return await Promise.all(
			entries.map(async ({path, size, name, newName}, i) => {
				const newPath = path === undefined ? (newName || name) : path ? `${path}/${name}` : name;
				const [id, parent_id] = ids.get(newPath);

				const url = await this.S3Service.createPresignedPostURL(owner_id, id, size);
				const additionalUrl = this.fileService.isImage(entries[i].name) ? await this.S3Service.createPresignedPostURL(owner_id, `${id}-preview`, 2 ** 20) : null;

				return {path: newPath, url, id, parent_id, additionalUrl};
			}),
		);
	}

	@Mutation(returns => [UploadFilesReturn], {nullable: true})
	async uploadFiles(
		@Args() data: UploadFilesArgs,
		@MiddlewareData() user: UserData,
	): Promise<UploadFilesReturn[] | null> {
		return await this.upload(user, data as UploadFilesAndFoldersArgs, data.entries);
	}

	@Mutation(returns => [UploadFilesReturn], {nullable: true})
	async uploadFilesAndFolders(
		@Args() data: UploadFilesAndFoldersArgs,
		@MiddlewareData() user: UserData,
	): Promise<UploadFilesReturn[] | null> {
		const topLevelEntries = data.entries.filter(entry => entry.path === "");
		return await this.upload(user, data, topLevelEntries);
	}

	@Mutation(returns => Number)
	async createFolder(
		@Args("parent_id", {type: () => Number, nullable: true}) parent_id: number | null,
		@Args("name", {type: () => String}) name: string,
		@MiddlewareData() {id: user_id, drive_id}: UserData,
	): Promise<number | null> {
		parent_id = parent_id || drive_id;

		const hasAccess = await this.fileService.hasAccess(user_id, parent_id);
		if (!hasAccess) return null;

		const hasCollisions = await this.fileService.doFilesCollide([name], parent_id, true);
		if (hasCollisions) return null;

		return await this.fileService.createFolder(parent_id, user_id, name);
	}


	@Mutation(returns => Boolean)
	async rename(
		@Args("file_id", {type: () => Number}) file_id: number,
		@Args("newFilename", {type: () => String}) newFilename: string,
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<boolean> {
		const hasAccess = await this.fileService.hasAccess(user_id, file_id);
		if (!hasAccess) return false;

		await this.fileService.renameEntry(file_id, newFilename);
		return true;
	}

	@Mutation(returns => Boolean)
	async shareEntries(
		@Args() {file_id, policies}: ShareEntriesArgs,
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<boolean> {
		const hasAccess = await this.fileService.hasAccess(user_id, file_id);
		if (!hasAccess) return false;

		const entry = await this.fileService.getEntry(file_id);
		policies.can_edit_users = policies.can_edit_users.filter(id => id !== entry.owner_id);
		policies.can_read_users = policies.can_read_users.filter(id => id !== entry.owner_id);

		await this.fileService.shareEntries(file_id, policies);
		return true;
	}

	@Mutation(returns => Boolean)
	async moveEntries(
		@Args() {entries, parent_id}: MoveEntriesArgs,
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<boolean> {
		const hasAccessToFolder = await this.fileService.hasAccess(user_id, parent_id);
		if (!hasAccessToFolder) return false;

		for (let i = 0; i < entries.length; i++) {
			const hasAccessToEntry = await this.fileService.hasAccess(user_id, entries[i].id);
			if (!hasAccessToEntry) return false;
		}

		await this.fileService.moveEntries(entries, parent_id);
		return true;
	}

	@Mutation(returns => Boolean)
	async putEntriesInBin(
		@Args("entries", {type: () => [MoveEntriesEntry]}) entries: MoveEntriesEntry[],
		@MiddlewareData() {id: user_id, bin_id}: UserData,
	): Promise<boolean> {
		for (let i = 0; i < entries.length; i++) {
			const hasAccess = await this.fileService.hasAccess(user_id, entries[i].id);
			if (!hasAccess) return false;
		}

		for (let i = 0; i < entries.length; i++) {
			const entry = await this.fileService.getEntry(entries[i].id);
			const allEntries = entry.is_directory ? await this.fileService.getEntries(entry.id, user_id, true) : [entry];

			await Promise.all(allEntries.map(async entry => {
				const key = `${entry.owner_id}/${entry.id}`;
				if (!entry.is_directory) await this.S3Service.tagObject(key, "inBin", "true");
				await this.fileService.addEntryToBin(entry.id, entry.parent_id);

				if (this.fileService.isImage(entry.name)) await this.S3Service.tagObject(`${key}-preview`, "inBin", "true");
			}));
		}

		await this.fileService.moveEntries(entries, bin_id);
		return true;
	}

	@Mutation(returns => Boolean)
	async restoreEntries(
		@Args("entry_ids", {type: () => [Number]}) entry_ids: number[],
		@Args("restore_to_drive", {type: () => Boolean}) restore_to_drive: boolean,
		@MiddlewareData() {id: user_id, bin_id, drive_id}: UserData,
	): Promise<boolean> {
		let entries: FileModel[] = [];
		for (let i = 0; i < entry_ids.length; i++) {
			const entry = await this.fileService.getEntry(entry_ids[i]);
			if (entry.parent_id !== bin_id) return false;

			entries.push(...(entry.is_directory ? await this.fileService.getEntries(entry.id, user_id, true) : [entry]));
		}
		entries = entries.filter(entry => !!entry.bin_data);

		const allEntryIds = entries.map(entry => entry.id);
		await Promise.all(entries.map(async entry => {
			const key = `${entry.owner_id}/${entry.id}`;
			await this.S3Service.tagObject(key, "inBin", "false");
			if (this.fileService.isImage(entry.name)) await this.S3Service.tagObject(`${key}-preview`, "inBin", "false");

			let folderIdToRestoreTo: number;
			if (restore_to_drive && entry_ids.includes(entry.id)) {
				folderIdToRestoreTo = drive_id;
			} else {
				const prev_parent_id = entry.bin_data.prev_parent_id;
				const isPrevParentInBin = !allEntryIds.includes(prev_parent_id) && await this.fileService.isInBin(prev_parent_id);
				folderIdToRestoreTo = isPrevParentInBin ? drive_id : prev_parent_id;
			}

			await this.fileService.moveEntries([entry], folderIdToRestoreTo);
		}));

		await this.fileService.removeEntriesFromBin(allEntryIds);
		return true;
	}

	@Mutation(returns => Boolean)
	async fullyDeleteEntries(
		@Args("entry_ids", {type: () => [Number]}) entry_ids: number[],
		@MiddlewareData() {id: user_id, bin_id}: UserData,
	): Promise<boolean> {
		const entries: FileModel[] = [];
		for (let i = 0; i < entry_ids.length; i++) {
			const entry = await this.fileService.getEntry(entry_ids[i]);
			if (entry.parent_id !== bin_id) return false;

			entries.push(...(entry.is_directory ? await this.fileService.getEntries(entry.id, user_id, true) : [entry]));
		}

		const ids: number[] = entries.map(entry => entry.bin_data ? entry.id : null).filter(a => a !== null);
		await this.fileService.fullyDeleteEntries(ids);
		return true;
	}
}