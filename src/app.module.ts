import {Module} from "@nestjs/common";
import {GraphQLModule} from "@nestjs/graphql";
import {ApolloDriver, ApolloDriverConfig} from "@nestjs/apollo";
import * as path from "path";
import {UserModule} from "./api/user/user.module";
import {ServiceModule} from "./services/service.module";
import {FileModule} from "./api/file/file.module";

@Module({
	imports: [
		GraphQLModule.forRoot<ApolloDriverConfig>({
			driver: ApolloDriver,
			autoSchemaFile: path.join(process.cwd(), "schema.gql"),
			buildSchemaOptions: {
				numberScalarMode: "integer",
			},
		}),
		ServiceModule,
		UserModule,
		FileModule,
	],
})
export class AppModule {}