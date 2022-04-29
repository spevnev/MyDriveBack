import {ArgsType, Field, InputType} from "@nestjs/graphql";
import {MinLength} from "class-validator";
import {SimpleFileEntryInput} from "./uploadFiles.args";

@InputType()
export class FileEntry extends SimpleFileEntryInput {
	@Field(type => String)
	@MinLength(1)
	path: string | null;

	@Field(type => Boolean)
	is_directory: boolean;
}

@ArgsType()
export class UploadFilesAndFoldersArgs {
	@Field(type => [FileEntry])
	entries: FileEntry[];

	@Field(type => Number, {nullable: true})
	parent_id: number | null;
}