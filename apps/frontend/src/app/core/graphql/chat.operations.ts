import { gql } from 'apollo-angular';

export const CHAT_MUTATION = gql`
  mutation Chat(
    $content: String!
    $sessionId: String
    $audioData: String
    $mimeType: String
    $targetLanguage: String
    $model: String
    $provider: String
  ) {
    chat(
      content: $content
      sessionId: $sessionId
      audioData: $audioData
      mimeType: $mimeType
      targetLanguage: $targetLanguage
      model: $model
      provider: $provider
    ) {
      text
      sessionId
    }
  }
`;

export const GET_SESSION_MESSAGES = gql`
  query GetSessionMessages($sessionId: String!) {
    sessionMessages(sessionId: $sessionId) {
      role
      content
      createdAt
    }
  }
`;

export interface ChatMutationResult {
  chat: { text: string; sessionId: string };
}

export interface SessionMessagePayload {
  role: string;
  content: string;
  createdAt: string;
}

export interface SessionMessagesQuery {
  sessionMessages: SessionMessagePayload[];
}
