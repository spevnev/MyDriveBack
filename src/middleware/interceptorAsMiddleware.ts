import {Request, Response} from "express";
import {CallHandler, ExecutionContext, NestInterceptor, UseInterceptors} from "@nestjs/common";
import {Observable} from "rxjs";

export const UseMiddlewares = UseInterceptors;

export abstract class InterceptorMiddleware implements NestInterceptor {
	abstract use(req: Request): Promise<[number, object?]>;

	async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
		const ctxt: { req: Request } = context.getArgByIndex(2);
		const req: Request = ctxt.req;
		const res: Response = req.res;

		const [statusCode, middlewareData] = await this.use(req);
		context.getArgByIndex(2).middlewareData = middlewareData;
		if (statusCode === 200) return next.handle();

		res.sendStatus(statusCode);
		return new Observable();
	}
}