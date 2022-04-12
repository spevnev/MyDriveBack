import {Injectable} from "@nestjs/common";
import {DBService} from "../../services/db.service";

@Injectable()
export class FileService {
	constructor(
		private DBService: DBService,
	) {}
}