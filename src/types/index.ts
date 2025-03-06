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
  GPT4_TURBO = 'gpt-4-turbo',
  CLAUDE3_OPUS = 'claude-3-opus',
  CLAUDE3_SONNET = 'claude-3-sonnet',
  CLAUDE3_HAIKU = 'claude-3-haiku',
  GEMINI_PRO = 'gemini-pro',
  GEMINI_PRO_VISION = 'gemini-pro-vision',
  GEMINI_2_FLASH = 'gemini-2.0-flash',
  GROK_3 = 'grok-3',
  CLAUDE_3_7_SONNET = 'claude-3-7-sonnet-20250219',
  DEEPSEEK_REASONER = 'deepseek-reasoner',
  CLAUDE_3_5_HAIKU = 'claude-3-5-haiku-20241022',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash-latest',
  GPT4O_MINI_CA = 'gpt-4o-mini-ca',
  GPT4O_MINI = 'gpt-4o-mini',
  GPT4O = 'gpt-4o',
  O3_MINI = 'o3-mini'
}

export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini'
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIRequestMessage {
  userPrompt: string;
  systemPrompt?: string;
} 