import {Field, ObjectType} from "@nestjs/graphql";

@ObjectType()
export class PresignedURLOptions {
	@Field(type => String)
	key: string;

	@Field(type => String)
	bucket: string;

	@Field(type => String)
	Policy: string;

	@Field(type => String)
	Date: string;

	@Field(type => String)
	Algorithm: string;

	@Field(type => String)
	Signature: string;

	@Field(type => String)
	Credential: string;
}

@ObjectType()
export class PresignedURL {
	@Field(type => PresignedURLOptions)
	fields: { [key: string]: any };

	@Field(type => String)
	url: string;
}