import {Field, ObjectType} from "@nestjs/graphql";
import {MaxLength, Min} from "class-validator";

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
	@MaxLength(255)
	name: string;

	@Field(type => Boolean)
	is_directory: boolean;

	@Field(type => String)
	modified_at: string;
}