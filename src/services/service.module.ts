import {Global, Module} from "@nestjs/common";
import {HashService} from "../services/hash.service";
import {TokenService} from "../services/token.service";
import {DBService} from "./db.service";

@Global()
@Module({
	providers: [HashService, TokenService, DBService],
	exports: [HashService, TokenService, DBService],
})
export class ServiceModule {}