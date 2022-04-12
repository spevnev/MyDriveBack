import {Request, Response} from "express";
import {CallHandler, ExecutionContext, NestInterceptor, UseInterceptors} from "@nestjs/common";
import {Observable} from "rxjs";

export const UseMiddlewares = UseInterceptors;

export abstract class InterceptorMiddleware implements NestInterceptor {
	abstract use(req: Request, res: Response): Promise<number | null>;

	async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
		const ctxt: { req: Request } = context.getArgs()[2];
		const req: Request = ctxt.req;
		const res: Response = req.res;

		const result = await this.use(req, res);
		if (result === null) return next.handle();

		res.sendStatus(result);
		return new Observable();

	}
}