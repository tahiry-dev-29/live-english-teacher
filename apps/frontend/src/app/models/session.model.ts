export interface Session {
  id: string;
  title: string;
  learningLanguage: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}
