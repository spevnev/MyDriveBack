import {Field, ObjectType} from "@nestjs/graphql";
import {MaxLength} from "class-validator";

@ObjectType()
export class FileModel {
	@Field(type => Number)
	id: number;

	@Field(type => Number)
	parent_id: number;

	@Field(type => Number)
	owner_id: number;

	@Field(type => String)
	@MaxLength(75)
	type: string;

	@Field(type => Number)
	size: number;

	@Field(type => String)
	@MaxLength(256)
	name: string;

	@Field(type => Number)
	modified_at: number;
}