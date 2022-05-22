import {ArgsType, Field, InputType} from "@nestjs/graphql";

@InputType()
export class MoveEntriesEntry {
	@Field(type => Number)
	parent_id: number;

	@Field(type => Number)
	id: number;

	@Field(type => String, {nullable: true})
	name: string;
}

@ArgsType()
export class MoveEntriesArgs {
	@Field(type => Number)
	parent_id: number;

	@Field(type => [MoveEntriesEntry])
	entries: MoveEntriesEntry[];
}