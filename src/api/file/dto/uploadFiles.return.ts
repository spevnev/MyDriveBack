import {Field, ObjectType} from "@nestjs/graphql";
import {PresignedURL} from "./presignedURL";

@ObjectType()
export class UploadFilesReturn {
	@Field(type => String)
	path: string;

	@Field(type => PresignedURL)
	url: PresignedURL;

	@Field(type => PresignedURL, {nullable: true})
	additionalUrl?: PresignedURL;

	@Field(type => Number)
	id: number;

	@Field(type => Number)
	parent_id: number;
}