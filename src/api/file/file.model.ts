import {Field, ObjectType} from "@nestjs/graphql";
import {MaxLength} from "class-validator";

@ObjectType()
export class FileModel {
	@Field(type => Number)
	id: number;

	@Field(type => Number, {nullable: true})
	parent_id: number | null;

	@Field(type => Number)
	owner_id: number;

	@Field(type => Number, {nullable: true})
	share_id: number;

	@Field(type => String)
	@MaxLength(75)
	type: string;

	@Field(type => Number)
	size: number;

	@Field(type => String)
	@MaxLength(256)
	name: string;

	@Field(type => String)
	modified_at: string;
}