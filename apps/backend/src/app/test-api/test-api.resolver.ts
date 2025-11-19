import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class TestApiResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello from GraphQL!';
  }
}
