import {Module} from "@nestjs/common";
import {FileService} from "./file.service";
import {FileResolver} from "./file.resolver";
import {UserModule} from "../user/user.module";

@Module({
	providers: [FileService, FileResolver],
	imports: [UserModule],
})
export class FileModule {}