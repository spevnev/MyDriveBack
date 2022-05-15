import {Field, ObjectType} from "@nestjs/graphql";

@ObjectType()
export class UsernameToId {
	@Field(type => String)
	username: string;

	@Field(type => Number)
	id: number;
}