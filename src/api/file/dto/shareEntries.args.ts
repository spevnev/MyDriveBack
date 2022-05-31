import {ArgsType, Field, InputType, ObjectType} from "@nestjs/graphql";

@InputType()
@ObjectType("SharePoliciesObjectType")
export class SharePolicies {
	@Field(type => [Number])
	can_read_users: number[];

	@Field(type => [Number])
	can_edit_users: number[];
}

@ArgsType()
export class ShareEntriesArgs {
	@Field(type => Number)
	file_id: number;

	@Field(type => SharePolicies)
	policies: SharePolicies;
}