import {Global, Module} from "@nestjs/common";
import {HashService} from "../services/hash.service";
import {TokenService} from "../services/token.service";
import {DBService} from "./db.service";
import {S3Service} from "./s3.service";

@Global()
@Module({
	providers: [HashService, TokenService, DBService, S3Service],
	exports: [HashService, TokenService, DBService, S3Service],
})
export class ServiceModule {}