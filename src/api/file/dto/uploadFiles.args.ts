import {ArgsType, Field, InputType} from "@nestjs/graphql";
import {Min, MinLength} from "class-validator";

@InputType()
export class SimpleFileEntry {
	@Field(type => String)
	@MinLength(1)
	name: string;

	@Field(type => Number)
	@Min(0)
	size: number;
}

@ArgsType()
export class UploadFilesArgs {
	@Field(type => [SimpleFileEntry])
	entries: SimpleFileEntry[];

	@Field(type => Number, {nullable: true})
	parent_id: number | null;
}