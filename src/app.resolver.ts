import {Args, Field, Int, ObjectType, Query, Resolver} from "@nestjs/graphql";

@ObjectType()
class Test {
	@Field(type => Int)
	number: number;
}

let test = new Test();
test.number = -1;

@Resolver(of => Test)
export class AppResolver {
	@Query(returns => Test, {nullable: true})
	getTest(): Test {
		return test;
	}

	@Query(returns => Test, {nullable: true})
	setTest(@Args("number", {type: () => Int}) number: number): Test {
		test = new Test();
		test.number = number;

		return test;
	}
}