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
  type: PromptType;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  isHidden?: boolean;
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
  DEEPSEEK_CHAT = 'deepseek-chat',
  CLAUDE_3_5_HAIKU = 'claude-3-5-haiku-20241022',
  GEMINI_1_5_FLASH = 'gemini-1.5-flash-latest',
  GPT4O_MINI_CA = 'gpt-4o-mini-ca',
  GPT4O_MINI = 'gpt-4o-mini',
  GPT4O = 'gpt-4o',
  O3_MINI = 'o3-mini',
  HUOSHAN_DEEPSEEK_R1 = 'deepseek-r1-250120',
  HUOSHAN_DEEPSEEK_R1_QWEN_32B = 'deepseek-r1-distill-qwen-32b-250120',
  HUOSHAN_DEEPSEEK_R1_QWEN_7B = 'deepseek-r1-distill-qwen-7b-250120',
  HUOSHAN_DEEPSEEK_V3 = 'deepseek-v3-241226',
  QWEN_PLUS = 'qwen-plus',
  QWEN_PLUS_LATEST = 'qwen-plus-latest',
  QWEN_MAX = 'qwen-max',
  QWQ_PLUS = 'qwq-32b',
  OPENROUTER_GEMINI_FLASH = 'google/gemini-2.0-flash-lite-001',
  OPENROUTER_GEMINI_FLASH_001 = 'google/gemini-2.0-flash-001',
  OPENROUTER_GEMINI_PRO_EXP = 'google/gemini-2.0-pro-exp-02-05:free',
  OPENROUTER_GEMINI_FLASH_THINKING = 'google/gemini-2.0-flash-thinking-exp:free',
  OPENROUTER_CLAUDE_OPUS = 'anthropic/claude-3-opus',
  OPENROUTER_LLAMA = 'meta-llama/llama-3-70b-instruct',
  OPENROUTER_MIXTRAL = 'mistralai/mixtral-8x7b-instruct',
  OPENROUTER_DEEPSEEK_V3 = 'deepseek/deepseek-chat-v3-0324'
}

export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
  HUOSHAN = 'huoshan',
  QWEN = 'qwen',
  OPENROUTER = 'openrouter'
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
  reasoning?: string;
}

export interface AIRequestMessage {
  userPrompt: string;
  systemPrompt?: string;
}

export enum PromptType {
  DIRECT = 'direct',
  SYSTEM = 'system'
}