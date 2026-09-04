import { DataAccessPrismaModule } from '@live-languages-teacher/data-access-prisma';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { FeatureLiveModule } from '@live-languages-teacher/feature-live';

@Module({
  imports: [
    DataAccessPrismaModule,
    FeatureLiveModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
