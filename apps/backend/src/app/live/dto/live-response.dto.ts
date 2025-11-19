import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatResponse {
  @Field()
  text: string;
}

@ObjectType()
export class AudioResponse {
  @Field()
  audioData: string;

  @Field()
  mimeType: string;
}
