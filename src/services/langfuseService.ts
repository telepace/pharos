import { Langfuse } from 'langfuse';
// Removing unused import
import { Message, LLMModel, AIProvider, AIResponse } from '../types';

// 单例模式
let langfuseInstance: Langfuse | null = null;

/**
 * 初始化 Langfuse 客户端
 * 如果环境变量未设置，则返回 null
 */
export const initLangfuse = (): Langfuse | null => {
  // 如果已经初始化，直接返回实例
  if (langfuseInstance) {
    return langfuseInstance;
  }

  const secretKey = process.env.REACT_APP_LANGFUSE_SECRET_KEY;
  const publicKey = process.env.REACT_APP_LANGFUSE_PUBLIC_KEY;
  const host = process.env.REACT_APP_LANGFUSE_HOST || 'https://cloud.langfuse.com';

  // 如果缺少必要的配置，则不初始化
  if (!secretKey || !publicKey) {
    console.warn('Langfuse 配置不完整，监控功能未启用');
    return null;
  }

  try {
    langfuseInstance = new Langfuse({
      secretKey,
      publicKey,
      baseUrl: host,
      flushAt: 10, // 每累积10个事件就发送一次
      flushInterval: 5000, // 或者每5秒发送一次
    });
    
    console.log('Langfuse 监控服务已初始化');
    return langfuseInstance;
  } catch (error) {
    console.error('Langfuse 初始化失败:', error);
    return null;
  }
};

/**
 * 创建或获取会话跟踪
 * @param conversationId 对话ID
 * @param name 会话名称
 */
export const getOrCreateTrace = (conversationId: string, name: string = '未命名会话') => {
  const langfuse = initLangfuse();
  if (!langfuse) return null;

  try {
    return langfuse.trace({
      id: conversationId,
      name,
      tags: ['pharos-app'],
      metadata: {
        source: 'web',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('创建 Langfuse 跟踪失败:', error);
    return null;
  }
};

/**
 * 跟踪用户消息
 * @param trace Langfuse 跟踪对象
 * @param message 用户消息
 */
export const trackUserMessage = (trace: any, message: Message) => {
  if (!trace) return null;

  try {
    return trace.span({
      name: '用户消息',
      input: { content: message.content },
      metadata: {
        messageId: message.id,
        timestamp: message.timestamp,
      },
    });
  } catch (error) {
    console.error('跟踪用户消息失败:', error);
    return null;
  }
};

/**
 * 跟踪 AI 请求和响应
 * @param trace Langfuse 跟踪对象
 * @param messages 消息历史
 * @param promptContent 系统提示内容
 * @param model 使用的模型
 * @param provider AI 提供商
 * @param response AI 响应
 */
export const trackAIGeneration = (
  trace: any,
  messages: Message[],
  promptContent: string | null,
  model: LLMModel,
  provider: AIProvider,
  response: AIResponse
) => {
  if (!trace) return null;

  try {
    const formattedMessages = [
      ...(promptContent ? [{ role: 'system', content: promptContent }] : []),
      ...messages.map(msg => ({ role: msg.role, content: msg.content }))
    ];

    const generation = trace.generation({
      name: `${provider}-${model}`,
      model: model,
      modelParameters: {
        temperature: 0.7, // 默认值，实际应该从请求中获取
        maxTokens: 2048, // 默认值，实际应该从请求中获取
      },
      input: formattedMessages,
      output: response.content,
      usage: response.usage,
      metadata: {
        provider,
        timestamp: Date.now(),
      },
    });

    return generation;
  } catch (error) {
    console.error('跟踪 AI 生成失败:', error);
    return null;
  }
};

/**
 * 跟踪错误
 * @param trace Langfuse 跟踪对象
 * @param error 错误对象
 * @param context 错误上下文
 */
export const trackError = (trace: any, error: any, context: any = {}) => {
  if (!trace) return;

  try {
    trace.event({
      name: '错误',
      level: 'ERROR',
      input: context,
      output: {
        message: error.message || '未知错误',
        stack: error.stack,
      },
    });
  } catch (e) {
    console.error('跟踪错误失败:', e);
  }
};

/**
 * 跟踪用户反馈
 * @param trace Langfuse 跟踪对象
 * @param generationId 生成ID
 * @param score 评分 (1: 👍, -1: 👎)
 * @param comment 评论
 */
export const trackFeedback = (trace: any, generationId: string, score: number, comment?: string) => {
  if (!trace) return;

  const langfuse = initLangfuse();
  if (!langfuse) return;

  try {
    langfuse.score({
      name: score > 0 ? '点赞' : '点踩',
      value: score,
      traceId: trace.id,
      observationId: generationId,
      comment,
    });
  } catch (error) {
    console.error('跟踪反馈失败:', error);
  }
};

/**
 * 结束跟踪
 * @param trace Langfuse 跟踪对象
 */
export const endTrace = (trace: any) => {
  if (!trace) return;

  try {
    trace.update({
      status: 'success',
    });
  } catch (error) {
    console.error('结束跟踪失败:', error);
  }
};