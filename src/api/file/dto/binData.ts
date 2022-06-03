import {Field, ObjectType} from "@nestjs/graphql";

@ObjectType()
export class BinData {
	@Field(type => String)
	put_at: number;

	@Field(type => Number)
	prev_parent_id: number;

	@Field(type => Number, {nullable: true})
	prev_share_id: number | null;
}