import {Field, ObjectType} from "@nestjs/graphql";
import {IsOptional} from "class-validator";

@ObjectType()
export class AuthenticationReturn {
	@Field(type => String, {nullable: true})
	@IsOptional()
	token?: string;

	@Field(type => String, {nullable: true})
	@IsOptional()
	error?: string;
}