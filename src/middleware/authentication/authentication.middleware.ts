import {Injectable} from "@nestjs/common";
import {InterceptorMiddleware} from "../interceptorAsMiddleware";
import {Request} from "express";
import {TokenService} from "../../services/token.service";

@Injectable()
export class AuthenticationMiddleware extends InterceptorMiddleware {
	constructor(
		private tokenService: TokenService,
	) { super(); }

	async use(req: Request): Promise<[number, object?]> {
		let value: string | undefined = req.headers["authorization"];
		if (!value) return [401];
		if (value.startsWith("Bearer ")) value = value.slice(7);

		const data = await this.tokenService.verifyJWT(value);
		if (data === null) return [401];

		return [200, data];
	}
}
