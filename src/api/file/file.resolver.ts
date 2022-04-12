import {Query, Resolver} from "@nestjs/graphql";
import {FileModel} from "./file.model";
import {FileService} from "./file.service";

@Resolver(of => FileModel)
export class FileResolver {
	constructor(
		private fileService: FileService,
	) {}

	@Query(returns => String)
	test(): string {return "string";}
}