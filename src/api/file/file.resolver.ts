import {Args, Mutation, Query, Resolver} from "@nestjs/graphql";
import {FileModel} from "./file.model";
import {FileService} from "./file.service";

@Resolver(of => FileModel)
export class FileResolver {
	constructor(
		private fileService: FileService,
	) {}

	@Query(returns => FileModel, {nullable: true})
	file(
		@Args("id", {type: () => Number}) id: number,
	): FileModel | null {
		return null;
	}

	@Query(returns => [FileModel])
	filesInFolder(
		@Args("id", {type: () => Number}) id: number,
	): FileModel[] {
		return [];
	}

	@Query(returns => String)
	downloadLink(
		@Args("id", {type: () => Number}) id: number,
	): string {
		return "string";
	}

	@Mutation(returns => String)
	upload(
		//	TODO: File
	): string {
		return "string";
	}

	@Mutation(returns => Boolean)
	rename(
		@Args("id", {type: () => Number}) id: number,
		@Args("newFilename", {type: () => String}) newFilename: string,
	): boolean {
		return false;
	}
}