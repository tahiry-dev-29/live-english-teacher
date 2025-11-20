import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatResponse {
  @Field()
  text: string | undefined;
}

@ObjectType()
export class AudioResponse {
  @Field()
  audioData: string | undefined;

  @Field()
  mimeType: string | undefined;
}
