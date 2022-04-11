import {Injectable, NestMiddleware} from "@nestjs/common";
import {NextFunction, Request, Response} from "express";
import {TokenService} from "../services/token.service";

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
	constructor(
		private tokenService: TokenService,
	) {}

	async use(req: Request, res: Response, next: NextFunction) {
		let value: string | null = req.header("Authentication");
		if (!value) return res.sendStatus(401);
		if (value.startsWith("Bearer ")) value = value.slice(7);

		const data = await this.tokenService.verifyJWT(value);
		if (data === null) return res.sendStatus(401);

		res.locals.username = data.username;
		next();
	}
}
