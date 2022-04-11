import {Global, Module} from "@nestjs/common";
import {HashService} from "../services/hash.service";
import {TokenService} from "../services/token.service";

@Global()
@Module({
	providers: [HashService, TokenService],
	exports: [HashService, TokenService],
})
export class ServiceModule {}