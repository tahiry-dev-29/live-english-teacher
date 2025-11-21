export interface Session {
  id: string;
  title: string;
  learningLanguage: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export interface SessionDetail extends Session {
  messages: Message[];
}

export interface Message {
  role: string;
  content: string;
  createdAt: string;
}
