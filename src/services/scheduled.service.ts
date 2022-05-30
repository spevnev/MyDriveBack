import {FileService} from "../api/file/file.service";
import {scheduleJob} from "node-schedule";
import {Injectable} from "@nestjs/common";

@Injectable()
export class ScheduledServices {
	constructor(
		private fileService: FileService,
	) {
		// Every hour
		scheduleJob("* 0 * * * *", () => this.fileService.deleteExpiredEntries());
	}
}