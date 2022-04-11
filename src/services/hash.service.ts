import {compare, hash} from "bcryptjs";
import {Injectable} from "@nestjs/common";

@Injectable()
export class HashService {
	hash(raw: string): Promise<string> {
		return new Promise((resolve, reject) => {
			hash(raw, 11, (err, hash: string) => {
				if (err) reject(err);
				resolve(hash);
			});
		});
	}

	compare(hash: string, raw: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			compare(raw, hash, (err, res) => {
				if (err) reject(err);
				resolve(res);
			});
		});
	}
}