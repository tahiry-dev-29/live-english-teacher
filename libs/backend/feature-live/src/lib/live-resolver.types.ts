import { Field, ObjectType, InputType } from '@nestjs/graphql';

@ObjectType()
export class SessionResponse {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  learningLanguage?: string;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  @Field({ nullable: true })
  lastMessage?: string;
}

@ObjectType()
export class MessageResponse {
  @Field()
  role!: string;

  @Field()
  content!: string;

  @Field()
  createdAt!: string;
}

@ObjectType()
export class SessionDetailResponse {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field()
  learningLanguage!: string;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  @Field(() => [MessageResponse])
  messages!: MessageResponse[];
}

@InputType()
export class UpdateSessionInput {
  @Field()
  sessionId!: string;

  @Field({ nullable: true })
  title?: string;
}
