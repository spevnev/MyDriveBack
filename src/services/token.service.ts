import {Injectable} from "@nestjs/common";
import {sign, verify} from "jsonwebtoken";

const PRIVATE_KEY = "AlM/Z1Z1cd0JmPGJGeXxBrFeHmS8UZaLIcD54EVQ0RsH2I2KEKMaeoNf4IDCSJt7hw35xjBNb9tdAZPuaBWKjTbp6fynRXZbNGWPM/AicPYBIx6ThY1ETJRq+qYviQGREjWCi6NZYWK8Pusim6cYf8gqokUfdGfFvWctIIe5ipk=";
const EXPIRES_AFTER = 24 * 60 * 60; // 1 day

@Injectable()
export class TokenService {
	generateJWT(data: object): Promise<string> {
		return new Promise((resolve, reject) => {
			const exp: number = Math.floor(Date.now() / 1000) + EXPIRES_AFTER;

			sign({...data, exp}, PRIVATE_KEY, {}, (err, token) => {
				if (err || !token) reject(err);
				resolve(`Bearer ${token}`);
			});
		});
	}

	verifyJWT(jwt: string): Promise<null | { [key: string]: any }> {
		return new Promise(resolve => {
			verify(jwt, PRIVATE_KEY, (err, value) => {
				if (err) console.log(err);
				resolve(value as object);
			});
		});
	}
}