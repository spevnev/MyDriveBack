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
import {ShareEntriesArgs} from "./dto/shareEntries.args";
import {SimpleFileEntry} from "./dto/simpleFileEntry";
import {MoveEntriesArgs} from "./dto/moveEntries.args";

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
		const file: FileModel | null = await this.fileService.getEntry(id);
		if (file === null) return null;

		const isShared: object | null = await this.fileService.hasAccess(user_id, file.id);
		if (file.owner_id !== user_id && isShared === null) return null;
		return file;
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

		const entries = await this.fileService.getEntries(parent_id);
		return include_previews ? await this.addPreviews(entries, user_id) : entries;
	}

	@Query(returns => [FileModel], {nullable: true})
	async files(
		@Args("parent_id", {type: () => Number, nullable: true, defaultValue: null}) parent_id: number | null,
		@Args("include_previews", {type: () => Boolean, defaultValue: false}) include_previews: boolean,
		@MiddlewareData() {id: user_id, drive_id}: UserData,
	): Promise<FileModel[] | null> {
		parent_id = parent_id || drive_id;

		const hasAccess = await this.fileService.hasAccess(user_id, parent_id);
		if (hasAccess === null) return null;

		const files = await this.fileService.getFiles(parent_id);
		return include_previews ? await this.addPreviews(files, user_id) : files;
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


	@Query(returns => String)
	async downloadLink(
		@Args("id", {type: () => Number}) id: number,
	): Promise<string> {
		// check access
		return "download link";
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

		const hasAccessToEntries = await this.fileService.hasAccess(user_id, entries[0]?.parent_id);
		if (!hasAccessToEntries) return false;

		await this.fileService.moveEntries(entries, parent_id);
		return true;
	}
}