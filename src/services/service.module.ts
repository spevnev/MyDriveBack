import {Global, Module} from "@nestjs/common";
import {HashService} from "../services/hash.service";
import {TokenService} from "../services/token.service";
import {DBService} from "./db.service";
import {S3Service} from "./s3.service";
import {ScheduledServices} from "./scheduled.service";
import {FileModule} from "../api/file/file.module";

@Global()
@Module({
	providers: [HashService, TokenService, DBService, S3Service, ScheduledServices],
	exports: [HashService, TokenService, DBService, S3Service],
	imports: [FileModule],
})
export class ServiceModule {}