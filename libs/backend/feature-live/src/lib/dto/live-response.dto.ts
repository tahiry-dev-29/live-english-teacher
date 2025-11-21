import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatResponse {
  @Field()
  text: string | undefined;

  @Field({ nullable: true })
  audioData?: string;

  @Field({ nullable: true })
  mimeType?: string;
}

@ObjectType()
export class AudioResponse {
  @Field()
  audioData: string | undefined;

  @Field()
  mimeType: string | undefined;
}
