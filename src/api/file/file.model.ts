import {Field, ObjectType} from "@nestjs/graphql";
import {MaxLength, Min} from "class-validator";
import {BinData} from "./dto/binData";

@ObjectType()
export class FileModel {
	@Field(type => Number)
	id: number;

	@Field(type => Number)
	owner_id: number;

	@Field(type => Number)
	parent_id: number;

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

	@Field(type => String, {nullable: true})
	preview?: string;

	@Field(type => String, {nullable: true})
	username?: string;

	@Field(type => BinData, {nullable: true})
	bin_data?: BinData;
}