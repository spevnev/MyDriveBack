import {Injectable} from "@nestjs/common";
import {S3} from "aws-sdk";
import {PresignedURL} from "../api/file/dto/presignedURL";

import("dotenv/config").catch(e => e);

@Injectable()
export class S3Service {
	private readonly client: S3;
	private readonly bucketName: string;

	constructor() {
		this.client = new S3({
			credentials: {accessKeyId: process.env.AWS_API_KEY, secretAccessKey: process.env.AWS_SECRET_KEY},
			region: process.env.AWS_REGION,
			apiVersion: "2006-03-01",
		});
		this.bucketName = process.env.AWS_BUCKET_NAME;

		void this.testConnection();
	}

	async testConnection() {
		try {
			await new Promise((resolve, reject) => this.client.getObject({Bucket: this.bucketName, Key: "NotExistingKey"}, (err, data) => {
				if (err) reject(err);
				resolve(data);
			}));
		} catch (e) {
			if (e.code !== "NoSuchKey") throw new Error("Couldn't connect to AWS S3!");
		}
	}

	async createPresignedPostURL(user_id: number, file_id: number | string, size: number): Promise<PresignedURL | null> {
		const parameters: S3.PresignedPost.Params = {
			Bucket: this.bucketName,
			Fields: {
				key: `${user_id}/${file_id}`,
			},
			Expires: 1800,
			Conditions: [["content-length-range", 0, size]],
		};

		try {
			// const {url, fields} = await this.client.createPresignedPost(parameters);
			const url = "sample url";
			const fields = {
				bucket: "1",
				key: "1",
				Policy: "1",
				"X-Amz-Algorithm": "1",
				"X-Amz-Date": "1",
				"X-Amz-Credential": "1",
				"X-Amz-Signature": "1",
			};

			return {
				url,
				fields: {
					bucket: fields.bucket,
					key: fields.key,
					Policy: fields.Policy,
					Algorithm: fields["X-Amz-Algorithm"],
					Date: fields["X-Amz-Date"],
					Credential: fields["X-Amz-Credential"],
					Signature: fields["X-Amz-Signature"],
				},
			};
		} catch (e) {
			console.log(e);
			return null;
		}
	}

	async createPresignedGet(key: string): Promise<string | null> {
		const parameters = {
			Bucket: this.bucketName,
			Key: key,
			Expires: 1800,
		};

		try {
			// return await this.client.getSignedUrlPromise("getObject", parameters);
			return null;
		} catch (e) {
			console.log(e);
			return null;
		}
	}
}