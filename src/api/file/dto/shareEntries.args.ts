import {ArgsType, Field, InputType} from "@nestjs/graphql";

@InputType()
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