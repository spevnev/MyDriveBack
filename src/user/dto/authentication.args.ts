import {ArgsType, Field} from "@nestjs/graphql";
import {MaxLength, MinLength} from "class-validator";

@ArgsType()
export class AuthenticationArgs {
	@Field(type => String)
	@MinLength(4)
	@MaxLength(32)
	username: string;

	@Field(type => String)
	@MinLength(4)
	@MaxLength(576)
	password: string;
}