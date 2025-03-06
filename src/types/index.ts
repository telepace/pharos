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
  messages: Message[];
  activePromptId: string | null;
  sceneId: string | null;
}

export type LLMModel = 'gpt-3.5-turbo' | 'gpt-4' | 'claude-3-opus' | 'claude-3-sonnet'; 