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

	@Query(returns => [FileModel], {nullable: true})
	async entries(
		@Args("parent_id", {type: () => Number, nullable: true, defaultValue: null}) parent_id: number | null,
		@MiddlewareData() {id: user_id, drive_id}: UserData,
	): Promise<FileModel[] | null> {
		parent_id = parent_id || drive_id;

		const hasAccess = await this.fileService.hasAccess(user_id, parent_id);
		if (hasAccess === null) return null;

		return await this.fileService.getEntries(parent_id);
	}

	@Query(returns => [FileModel], {nullable: true})
	async files(
		@Args("parent_id", {type: () => Number, nullable: true, defaultValue: null}) parent_id: number | null,
		@MiddlewareData() {id: user_id, drive_id}: UserData,
	): Promise<FileModel[] | null> {
		parent_id = parent_id || drive_id;

		const hasAccess = await this.fileService.hasAccess(user_id, parent_id);
		if (hasAccess === null) return null;

		return await this.fileService.getFiles(parent_id);
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
		@MiddlewareData() {id: user_id}: UserData,
	): Promise<FileModel[] | null> {
		return await this.fileService.getSharedFolders(user_id);
	}


	async isImage(entry: SimpleFileEntry): Promise<boolean> {
		return false;
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

		const containsFolders = entries.reduce((val, cur) => val ? cur.is_directory !== undefined : true, false);
		const ids = containsFolders ? await this.fileService.uploadFilesAndFolders(entries, owner_id, parent_id) : await this.fileService.uploadFiles(entries, owner_id, parent_id);

		return await Promise.all(
			entries.map(async ({path, size, name, newName}, i) => {
				const newPath = path === undefined ? (newName || name) : path ? `${path}/${name}` : name;
				const [id, parent_id] = ids.get(newPath);

				const url = await this.S3Service.createPresignedPostURL(owner_id, id, size);
				const additionalUrl = await this.isImage(entries[i]) ? await this.S3Service.createPresignedPostURL(owner_id, `${id}-preview`, 2 ** 20) : null;

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
		@Args("id", {type: () => Number}) id: number,
		@Args("newFilename", {type: () => String}) newFilename: string,
	): Promise<boolean> {
		// check access
		return false;
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
}