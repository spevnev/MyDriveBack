import {Args, Mutation, Query, Resolver} from "@nestjs/graphql";
import {FileModel} from "./file.model";
import {FileService} from "./file.service";
import {AuthenticationMiddleware} from "../../middleware/authentication/authentication.middleware";
import {UseMiddlewares} from "../../middleware/interceptorAsMiddleware";
import {MiddlewareData} from "../../middleware/middlewareDataDecorator";
import {UploadFilesAndFoldersArgs} from "./dto/uploadFilesAndFolders.args";
import {UploadFilesArgs} from "./dto/uploadFiles.args";
import {UserData} from "../../middleware/authentication/user.data";
import {UserService} from "../user/user.service";

@Resolver(of => FileModel)
@UseMiddlewares(AuthenticationMiddleware)
export class FileResolver {
	constructor(
		private fileService: FileService,
		private userService: UserService,
	) {}

	@Query(returns => FileModel, {nullable: true})
	async file(
		@Args("id", {type: () => Number}) id: number,
		@MiddlewareData() {id: user_id}: { id: number },
	): Promise<FileModel | null> {
		const file: FileModel | null = await this.fileService.getFile(id);
		if (file === null) return null;

		const isShared: object | null = await this.fileService.hasAccess(user_id, null, file.share_id);
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

		return await this.fileService.getEntriesInFolder(parent_id);
	}

	@Query(returns => [FileModel], {nullable: true})
	async files(
		@Args("parent_id", {type: () => Number, nullable: true, defaultValue: null}) parent_id: number | null,
		@MiddlewareData() {id: user_id, drive_id}: UserData,
	): Promise<FileModel[] | null> {
		parent_id = parent_id || drive_id;

		const hasAccess = await this.fileService.hasAccess(user_id, parent_id);
		if (hasAccess === null) return null;

		await this.fileService.getFilesInFolder(parent_id);
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
		return await this.fileService.getFoldersInFolder(parent_id);
	}

	@Query(returns => [FileModel], {nullable: true})
	async rootSharedFolders(
		@MiddlewareData() {id: user_id}: { id: number },
	): Promise<FileModel[] | null> {
		return await this.fileService.getRootSharedFolders(user_id);
	}

	@Query(returns => String)
	async downloadLink(
		@Args("id", {type: () => Number}) id: number,
	): Promise<string> {
		// check access
		return "download link";
	}

	@Mutation(returns => String, {nullable: true})
	async uploadFiles(
		@Args() {entries, parent_id}: UploadFilesArgs,
		@MiddlewareData() {id: owner_id, drive_id}: UserData,
	): Promise<string | null> {
		parent_id = parent_id || drive_id;

		const size = entries.reduce((sum, cur) => sum + cur.size, 0);
		const free_space = await this.userService.getFreeSpace(owner_id);
		if (size > free_space) return null;

		const result = await this.fileService.uploadFiles(entries, owner_id, parent_id);
		if (result === false) return null;

		return "UPLOAD LINK";
	}

	@Mutation(returns => String)
	async uploadFilesAndFolders(
		@Args() {entries, parent_id}: UploadFilesAndFoldersArgs,
		@MiddlewareData() {id: owner_id, drive_id}: UserData,
	): Promise<string | null> {
		parent_id = parent_id || drive_id;

		const size = entries.reduce((sum, cur) => sum + cur.size, 0);
		const free_space = await this.userService.getFreeSpace(owner_id);
		if (size > free_space) return null;
		await this.userService.increaseUsedSpace(owner_id, size);

		const result = await this.fileService.uploadFilesAndFolders(entries, owner_id, parent_id);
		if (result === false) return null;

		return "UPLOAD LINK";
	}

	@Mutation(returns => Boolean)
	async rename(
		@Args("id", {type: () => Number}) id: number,
		@Args("newFilename", {type: () => String}) newFilename: string,
	): Promise<boolean> {
		// check access
		return false;
	}
}