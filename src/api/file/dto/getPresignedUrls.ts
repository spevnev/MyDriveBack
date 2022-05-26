import {Field, ObjectType} from "@nestjs/graphql";

@ObjectType()
export class GetPresignedUrl {
	@Field(type => String)
	url: string;

	@Field(type => Number)
	file_id: number;

	@Field(type => Number)
	parent_id: number;

	@Field(type => String)
	name: string;

	@Field(type => Boolean)
	is_directory: boolean;
}