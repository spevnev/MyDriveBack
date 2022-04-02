import {NestFactory} from "@nestjs/core";
import {AppModule} from "./app.module";
import {ValidationPipe} from "@nestjs/common";

const port = process.env.PORT || 3001;

const bootstrap = async () => {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());

	await app.listen(port);
	console.log(`Server is listening on port ${port}!`);
};

bootstrap();