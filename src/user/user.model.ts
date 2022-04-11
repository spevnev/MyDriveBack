import {Field, ObjectType} from "@nestjs/graphql";
import {MaxLength, MinLength} from "class-validator";

@ObjectType()
export class UserModel {
	@Field(type => String)
	@MinLength(4)
	@MaxLength(32)
	username: string;

	@Field(type => String)
	@MinLength(4)
	@MaxLength(576)
	password: string;
}