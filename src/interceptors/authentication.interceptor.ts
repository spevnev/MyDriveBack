import {Injectable} from "@nestjs/common";
import {InterceptorMiddleware} from "./interceptorAsMiddleware";
import {Request, Response} from "express";
import {TokenService} from "../services/token.service";

@Injectable()
export class AuthenticationMiddleware extends InterceptorMiddleware {
	constructor(
		private tokenService: TokenService,
	) { super(); }

	async use(req: Request, res: Response): Promise<null | number> {
		let value: string | undefined = req.headers["authorization"];
		if (!value) return 500;
		if (value.startsWith("Bearer ")) value = value.slice(7);

		const data = await this.tokenService.verifyJWT(value);
		if (data === null) return 401;

		res.locals.username = data.username; // TODO: Can be accessed? or other way to pass this down
		return null;
	}
}
