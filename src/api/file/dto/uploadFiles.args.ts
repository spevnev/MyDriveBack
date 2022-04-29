import {ArgsType, Field, InputType} from "@nestjs/graphql";
import {IsOptional, Min, MinLength} from "class-validator";

@InputType()
export class SimpleFileEntryInput {
	@Field(type => String)
	@MinLength(1)
	name: string;

	@Field(type => String, {nullable: true})
	@IsOptional()
	newName?: string;

	@Field(type => Number)
	@Min(0)
	size: number;

	@Field(type => String, {nullable: true})
	type: string | null;
}

@ArgsType()
export class UploadFilesArgs {
	@Field(type => [SimpleFileEntryInput])
	entries: SimpleFileEntryInput[];

	@Field(type => Number, {nullable: true})
	parent_id: number | null;
}