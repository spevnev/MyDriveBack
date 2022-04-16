import {Field, ObjectType} from "@nestjs/graphql";
import {MaxLength, Min, MinLength} from "class-validator";

@ObjectType()
export class FileModel {
	@Field(type => Number)
	id: number;

	@Field(type => Number)
	owner_id: number;

	@Field(type => Number, {nullable: true})
	parent_id: number | null;

	@Field(type => Number, {nullable: true})
	share_id: number | null;

	@Field(type => Number)
	@Min(0)
	size: number;

	@Field(type => String)
	@MaxLength(244)
	name: string;

	@Field(type => String)
	@MaxLength(10)
	@MinLength(1)
	type: string;

	@Field(type => String)
	modified_at: string;
}