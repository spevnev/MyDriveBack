import {Field, ObjectType} from "@nestjs/graphql";
import {Min, MinLength} from "class-validator";

@ObjectType()
export class SimpleFileEntry {
	@Field(type => String)
	@MinLength(1)
	name: string;

	@Field(type => Number)
	@Min(0)
	size: number;

	@Field(type => String, {nullable: true})
	type: string | null;
}

@ObjectType()
export class FileEntry extends SimpleFileEntry {
	@Field(type => String, {nullable: true})
	parent_name: string | null;

	@Field(type => String)
	@MinLength(1)
	path: string;
}