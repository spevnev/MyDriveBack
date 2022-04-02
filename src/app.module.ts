import {Module} from "@nestjs/common";
import {GraphQLModule} from "@nestjs/graphql";
import {ApolloDriver, ApolloDriverConfig} from "@nestjs/apollo";
import * as path from "path";
import {AppResolver} from "./app.resolver";

@Module({
	imports: [
		GraphQLModule.forRoot<ApolloDriverConfig>({
			driver: ApolloDriver,
			autoSchemaFile: path.join(process.cwd(), "schema.gql"),
			buildSchemaOptions: {
				numberScalarMode: "integer",
			},
		}),
	],
	providers: [AppResolver],
})
export class AppModule {}