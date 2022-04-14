import {Args, Mutation, Query, Resolver} from "@nestjs/graphql";
import {FileModel} from "./file.model";
import {FileService} from "./file.service";
import {AuthenticationMiddleware} from "../../middleware/authentication.middleware";
import {UseMiddlewares} from "../../middleware/interceptorAsMiddleware";
import {MiddlewareData} from "../../middleware/middlewareDataDecorator";

@Resolver(of => FileModel)
@UseMiddlewares(AuthenticationMiddleware)
export class FileResolver {
	constructor(
		private fileService: FileService,
	) {}

	@Query(returns => FileModel, {nullable: true})
	async file(
		@Args("id", {type: () => Number}) id: number,
		@MiddlewareData() {id: user_id}: { id: number },
	): Promise<FileModel | null> {
		const file: FileModel | null = await this.fileService.getFile(id);
		if (file === null) return null;

		const isShared: object | null = await this.fileService.getSharePolicy(id, user_id);
		if (file.owner_id !== user_id && isShared === null) return null;
		return file;
	}

	@Query(returns => [FileModel])
	files(
		@Args("parent_id", {type: () => Number}) parent_id: number,
	): FileModel[] {
		// check access
		return [];
	}

	@Query(returns => String)
	downloadLink(
		@Args("id", {type: () => Number}) id: number,
	): string {
		// check access
		return "download link";
	}

	@Mutation(returns => String)
	uploadLink(
		@Args("parent_id", {type: () => Number}) parent_id: number,
		@Args("size", {type: () => Number}) size: number,
		@Args("type", {type: () => String}) type: string,
		@Args("filename", {type: () => String}) filename: string,
		@MiddlewareData() {id: owner_id}: { id: number },
	): string {
		// check access to parent_id
		return "upload link";
	}

	@Mutation(returns => Boolean)
	rename(
		@Args("id", {type: () => Number}) id: number,
		@Args("newFilename", {type: () => String}) newFilename: string,
	): boolean {
		// check access
		return false;
	}
}