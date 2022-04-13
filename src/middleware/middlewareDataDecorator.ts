import {createParamDecorator, ExecutionContext} from "@nestjs/common";

export const MiddlewareData = createParamDecorator((data: void, ctxt: ExecutionContext) => ctxt.getArgByIndex(2).middlewareData);