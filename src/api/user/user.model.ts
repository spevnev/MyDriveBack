import {Field, ObjectType} from "@nestjs/graphql";
import {MaxLength, Min, MinLength} from "class-validator";

@ObjectType()
export class UserModel {
	@Field(type => Number)
	id: number;

	@Field(type => String)
	@MinLength(4)
	@MaxLength(32)
	username: string;

	@Field(type => String)
	@MinLength(4)
	@MaxLength(576)
	password: string;

	@Field(type => Number)
	@Min(0)
	space_used: number;

	@Field(type => Number)
	@Min(0)
	drive_id: number;

	@Field(type => Number)
	@Min(0)
	bin_id: number;
}