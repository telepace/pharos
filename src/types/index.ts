export interface Scene {
  id: string;
  name: string;
}

export interface Prompt {
  id: string;
  sceneId: string;
  name: string;
  content: string;
  model: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  activePromptId: string | null;
  sceneId: string | null;
  createdAt: number;
  updatedAt: number;
}

export enum LLMModel {
  GPT35 = 'gpt-3.5-turbo',
  GPT4 = 'gpt-4',
  CLAUDE3_OPUS = 'claude-3-opus',
  CLAUDE3_SONNET = 'claude-3-sonnet'
} 