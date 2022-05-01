import {PresignedURLOptions} from "../api/file/dto/presignedURL";
import {Injectable} from "@nestjs/common";
import {GetObjectCommand, S3} from "@aws-sdk/client-s3";
import {createPresignedPost, PresignedPostOptions} from "@aws-sdk/s3-presigned-post";

import("dotenv/config").catch(e => e);

@Injectable()
export class S3Service {
	private readonly client: S3;
	private readonly bucketName: string;

	constructor() {
		this.client = new S3({credentials: {accessKeyId: process.env.AWS_API_KEY, secretAccessKey: process.env.AWS_SECRET_KEY}, region: process.env.AWS_REGION});
		this.bucketName = process.env.AWS_BUCKET_NAME;

		void this.testConnection();
	}

	async testConnection() {
		try {
			await this.client.send(new GetObjectCommand({Bucket: this.bucketName, Key: "NotExistingKey"}));
		} catch (e) {
			if (e.Code !== "NoSuchKey") throw new Error("Couldn't connect to AWS S3!");
		}
	}

	async createPresignedPostURL(user_id: number, file_id: number, size: number): Promise<[string, PresignedURLOptions] | null> {
		const params: PresignedPostOptions = {
			Bucket: this.bucketName,
			Key: `${user_id}/${file_id}`,
			Conditions: [["content-length-range", 0, size]],
		};

		try {
			const {url, fields} = await createPresignedPost(this.client, params);
			return [url, {
				bucket: fields.bucket,
				key: fields.key,
				Policy: fields.Policy,
				Algorithm: fields["X-Amz-Algorithm"],
				Date: fields["X-Amz-Date"],
				Credential: fields["X-Amz-Credential"],
				Signature: fields["X-Amz-Signature"],
			}];
		} catch (e) {
			console.log(e);
			return null;
		}
	}
}