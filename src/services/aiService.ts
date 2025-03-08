import { Message, LLMModel, AIProvider, AIConfig, AIResponse, AIRequestMessage, PromptType } from '../types';
import { getOrCreateTrace, trackUserMessage, trackAIGeneration, trackError } from './langfuseService';

// 从环境变量中获取配置
const getAIConfig = (provider: AIProvider): AIConfig => {
  switch (provider) {
    case AIProvider.OPENAI:
      return {
        provider: AIProvider.OPENAI,
        apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
        baseUrl: process.env.REACT_APP_OPENAI_BASE_URL || 'https://api.openai.com/v1'
      };
    case AIProvider.CLAUDE:
      return {
        provider: AIProvider.CLAUDE,
        apiKey: process.env.REACT_APP_CLAUDE_API_KEY || '',
        baseUrl: process.env.REACT_APP_CLAUDE_BASE_URL || 'https://api.anthropic.com'
      };
    case AIProvider.GEMINI:
      return {
        provider: AIProvider.GEMINI,
        apiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
        baseUrl: process.env.REACT_APP_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
      };
    case AIProvider.DEEPSEEK:
      return {
        provider: AIProvider.DEEPSEEK,
        apiKey: process.env.REACT_APP_DEEPSEEK_API_KEY || '',
        baseUrl: process.env.REACT_APP_DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
      };
    case AIProvider.HUOSHAN:
      return {
        provider: AIProvider.HUOSHAN,
        apiKey: process.env.REACT_APP_HUOSHAN_API_KEY || '',
        baseUrl: process.env.REACT_APP_HUOSHAN_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
      };
    case AIProvider.QWEN:
      return {
        provider: AIProvider.QWEN,
        apiKey: process.env.REACT_APP_QWEN_API_KEY || '',
        baseUrl: process.env.REACT_APP_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      };
    default:
      throw new Error(`不支持的AI提供商: ${provider}`);
  }
};

// 根据模型确定提供商
const getProviderFromModel = (model: LLMModel): AIProvider => {
  if (model.startsWith('gpt')) {
    return AIProvider.OPENAI;
  } else if (model.startsWith('claude')) {
    return AIProvider.CLAUDE;
  } else if (model.startsWith('gemini')) {
    return AIProvider.GEMINI;
  } else if (model === LLMModel.HUOSHAN_DEEPSEEK_R1 || 
             model === LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_32B || 
             model === LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_7B || 
             model === LLMModel.HUOSHAN_DEEPSEEK_V3) {
    return AIProvider.HUOSHAN;
  } else if (model.startsWith('deepseek')) {
    return AIProvider.DEEPSEEK;
  } else if (model.startsWith('qwen')) {
    return AIProvider.QWEN;
  }
  throw new Error(`无法确定模型 ${model} 的提供商`);
};

// OpenAI API调用
const callOpenAI = async (
  messages: Message[],
  promptContent: string | null,
  model: LLMModel,
  config: AIConfig,
  streamCallback?: (chunk: string) => void
): Promise<AIResponse> => {
  const formattedMessages = [
    ...(promptContent ? [{ role: 'system', content: promptContent }] : []),
    ...messages.map(msg => ({ role: msg.role, content: msg.content }))
  ];

  try {
    // 如果提供了流回调函数，则使用流式响应
    const isStream = !!streamCallback;
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: isStream
      })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text();
        throw new Error(`服务器返回了HTML而不是JSON: ${text.substring(0, 100)}...`);
      }
      const errorData = await response.json();
      throw new Error(`OpenAI API错误: ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    if (isStream && streamCallback && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      
      // 返回一个Promise，在流处理完成后解析
      return new Promise<AIResponse>(async (resolve, reject) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6));
                  if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    fullContent += content;
                    streamCallback(content);
                  }
                } catch (e) {
                  console.warn('解析流数据时出错:', e);
                }
              }
            }
          }
          
          // 流处理完成后返回完整响应
          resolve({
            content: fullContent,
            model,
            provider: AIProvider.OPENAI
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model,
      provider: AIProvider.OPENAI,
      usage: data.usage
    };
  } catch (error) {
    console.error('OpenAI API调用失败:', error);
    throw error;
  }
};

// Claude API调用
const callClaude = async (
  messages: Message[],
  promptContent: string | null,
  model: LLMModel,
  config: AIConfig,
  streamCallback?: (chunk: string) => void
): Promise<AIResponse> => {
  // 构建Claude消息格式
  let systemPrompt = promptContent || '';
  
  // 将消息转换为Claude格式的对话
  const conversation = messages.map(msg => {
    return {
      role: msg.role,
      content: msg.content
    };
  });

  try {
    // 如果提供了流回调函数，则使用流式响应
    const isStream = !!streamCallback;
    
    const response = await fetch(`${config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: conversation,
        system: systemPrompt || undefined,
        stream: isStream,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Claude API错误: ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    if (isStream && streamCallback && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      
      return new Promise<AIResponse>(async (resolve, reject) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6));
                  if (jsonData.type === 'content_block_delta' && jsonData.delta?.text) {
                    const content = jsonData.delta.text;
                    fullContent += content;
                    streamCallback(content);
                  }
                } catch (e) {
                  console.warn('解析Claude流数据时出错:', e);
                }
              }
            }
          }
          
          resolve({
            content: fullContent,
            model,
            provider: AIProvider.CLAUDE
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return {
      content: data.content[0].text,
      model,
      provider: AIProvider.CLAUDE
    };
  } catch (error) {
    console.error('Claude API调用失败:', error);
    throw error;
  }
};

// Gemini API调用
const callGemini = async (
  messages: Message[],
  promptContent: string | null,
  model: LLMModel,
  config: AIConfig,
  streamCallback?: (chunk: string) => void
): Promise<AIResponse> => {
  // 构建Gemini消息格式
  let formattedMessages = [];
  
  // 添加系统提示
  if (promptContent) {
    formattedMessages.push({
      role: 'user',
      parts: [{ text: `系统指令: ${promptContent}` }]
    });
    formattedMessages.push({
      role: 'model',
      parts: [{ text: '我理解并会按照系统指令行动。' }]
    });
  }
  
  // 添加对话历史
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    formattedMessages.push({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }]
    });
  }

  try {
    // 如果提供了流回调函数，则使用流式响应
    const isStream = !!streamCallback;
    
    const endpoint = `${config.baseUrl}/models/${model}:generateContent`;
    const apiKey = config.apiKey;
    
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ],
        stream: isStream
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API错误: ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    if (isStream && streamCallback && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      
      return new Promise<AIResponse>(async (resolve, reject) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6));
                  if (jsonData.candidates && 
                      jsonData.candidates[0]?.content?.parts && 
                      jsonData.candidates[0].content.parts[0]?.text) {
                    const content = jsonData.candidates[0].content.parts[0].text;
                    fullContent += content;
                    streamCallback(content);
                  }
                } catch (e) {
                  console.warn('解析Gemini流数据时出错:', e);
                }
              }
            }
          }
          
          resolve({
            content: fullContent,
            model,
            provider: AIProvider.GEMINI
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      model,
      provider: AIProvider.GEMINI
    };
  } catch (error) {
    console.error('Gemini API调用失败:', error);
    throw error;
  }
};

// DeepSeek API调用
const callDeepSeek = async (
  messages: Message[],
  promptContent: string | null,
  model: LLMModel,
  config: AIConfig,
  streamCallback?: (chunk: string) => void
): Promise<AIResponse> => {
  const formattedMessages = [
    ...(promptContent ? [{ role: 'system', content: promptContent }] : []),
    ...messages.map(msg => ({ role: msg.role, content: msg.content }))
  ];

  try {
    // 如果提供了流回调函数，则使用流式响应
    const isStream = !!streamCallback;
    
    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: isStream
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API错误: ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    if (isStream && streamCallback && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      
      return new Promise<AIResponse>(async (resolve, reject) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6));
                  if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    fullContent += content;
                    streamCallback(content);
                  }
                } catch (e) {
                  console.warn('解析DeepSeek流数据时出错:', e);
                }
              }
            }
          }
          
          resolve({
            content: fullContent,
            model,
            provider: AIProvider.DEEPSEEK
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model,
      provider: AIProvider.DEEPSEEK
    };
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    throw error;
  }
};

// 火山API调用
const callHuoshan = async (
  messages: Message[],
  promptContent: string | null,
  model: LLMModel,
  config: AIConfig,
  streamCallback?: (chunk: string) => void
): Promise<AIResponse> => {
  const formattedMessages = [
    ...(promptContent ? [{ role: 'system', content: promptContent }] : []),
    ...messages.map(msg => ({ role: msg.role, content: msg.content }))
  ];

  try {
    // 使用本地代理服务器
    const proxyUrl = 'http://localhost:3001/api/huoshan/chat/completions';
    
    console.log('火山API请求URL:', proxyUrl);
    
    // 如果提供了流回调函数，则使用流式响应
    const isStream = !!streamCallback;
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: isStream
      })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text();
        throw new Error(`服务器返回了HTML而不是JSON: ${text.substring(0, 100)}...`);
      }
      const errorData = await response.json().catch(() => ({ error: { message: '无法解析错误响应' } }));
      throw new Error(`火山API错误: ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    if (isStream && streamCallback && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      
      return new Promise<AIResponse>(async (resolve, reject) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6));
                  if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    fullContent += content;
                    streamCallback(content);
                  }
                } catch (e) {
                  console.warn('解析火山流数据时出错:', e);
                }
              }
            }
          }
          
          resolve({
            content: fullContent,
            model,
            provider: AIProvider.HUOSHAN
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model,
      provider: AIProvider.HUOSHAN
    };
  } catch (error) {
    console.error('火山API调用失败:', error);
    throw error;
  }
};

// 千问API调用
const callQwen = async (
  messages: Message[],
  promptContent: string | null,
  model: LLMModel,
  config: AIConfig,
  streamCallback?: (chunk: string) => void
): Promise<AIResponse> => {
  const formattedMessages = [
    ...(promptContent ? [{ role: 'system', content: promptContent }] : []),
    ...messages.map(msg => ({ role: msg.role, content: msg.content }))
  ];

  try {
    // 如果提供了流回调函数，则使用流式响应
    const isStream = !!streamCallback;
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: isStream
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`千问API错误: ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    if (isStream && streamCallback && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      
      return new Promise<AIResponse>(async (resolve, reject) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.slice(6));
                  if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    fullContent += content;
                    streamCallback(content);
                  }
                } catch (e) {
                  console.warn('解析千问流数据时出错:', e);
                }
              }
            }
          }
          
          resolve({
            content: fullContent,
            model,
            provider: AIProvider.QWEN
          });
        } catch (error) {
          reject(error);
        }
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model,
      provider: AIProvider.QWEN
    };
  } catch (error) {
    console.error('千问API调用失败:', error);
    throw error;
  }
};

// 主要的API调用函数
export const sendMessageToAI = async (
  messages: Message[],
  promptContent: string | null,
  promptType: PromptType,
  model: LLMModel = LLMModel.GPT35,
  useGlobalSettings: boolean = false,
  globalSettings?: {
    defaultModel?: LLMModel,
    globalPrompt?: string,
    useGlobalPrompt?: boolean,
    globalPromptType?: PromptType
  },
  streamCallback?: (chunk: string) => void,
  conversationId?: string
): Promise<AIResponse> => {
  // 如果使用全局设置，并且提供了全局设置
  let finalModel = model;
  let finalPromptContent = promptContent;
  let finalPromptType = promptType;

  if (useGlobalSettings && globalSettings) {
    // 只有当没有指定模型时（model为默认值），才使用全局默认模型
    if (model === LLMModel.GPT35 && globalSettings.defaultModel) {
      finalModel = globalSettings.defaultModel;
    }

    // 处理全局Prompt
    if (globalSettings.useGlobalPrompt && globalSettings.globalPrompt) {
      if (finalPromptContent && globalSettings.globalPromptType === PromptType.SYSTEM) {
        // 如果已有prompt且全局prompt是system类型，则组合两者
        finalPromptContent = `${globalSettings.globalPrompt}\n\n${finalPromptContent}`;
      } else if (!finalPromptContent) {
        // 如果没有prompt，直接使用全局prompt
        finalPromptContent = globalSettings.globalPrompt;
        finalPromptType = globalSettings.globalPromptType || PromptType.SYSTEM;
      }
    }
  }

  // 创建 Langfuse 跟踪（如果提供了会话ID）
  let trace = null;
  if (conversationId) {
    trace = getOrCreateTrace(conversationId);
    
    // 跟踪最后一条用户消息
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      trackUserMessage(trace, lastUserMessage);
    }
  }

  try {
    // 确定AI提供商
    const provider = getProviderFromModel(finalModel);
    const config = getAIConfig(provider);

    // 根据提供商调用相应的API
    let response: AIResponse;
    switch (provider) {
      case AIProvider.OPENAI:
        response = await callOpenAI(messages, finalPromptContent, finalModel, config, streamCallback);
        break;
      case AIProvider.CLAUDE:
        response = await callClaude(messages, finalPromptContent, finalModel, config, streamCallback);
        break;
      case AIProvider.GEMINI:
        response = await callGemini(messages, finalPromptContent, finalModel, config, streamCallback);
        break;
      case AIProvider.DEEPSEEK:
        response = await callDeepSeek(messages, finalPromptContent, finalModel, config, streamCallback);
        break;
      case AIProvider.HUOSHAN:
        response = await callHuoshan(messages, finalPromptContent, finalModel, config, streamCallback);
        break;
      case AIProvider.QWEN:
        response = await callQwen(messages, finalPromptContent, finalModel, config, streamCallback);
        break;
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }

    // 记录 AI 生成结果
    if (trace) {
      trackAIGeneration(trace, messages, finalPromptContent, finalModel, provider, response);
    }

    return response;
  } catch (error) {
    console.error('发送消息到AI时出错:', error);
    
    // 记录错误
    if (trace) {
      trackError(trace, error, {
        model: finalModel,
        messages: messages.length,
        hasPrompt: !!finalPromptContent
      });
    }
    
    throw error;
  }
};

// 获取可用的模型列表
export const getAvailableModels = (): { model: LLMModel; provider: AIProvider }[] => {
  const models: { model: LLMModel; provider: AIProvider }[] = [];
  
  // 检查OpenAI配置
  if (process.env.REACT_APP_OPENAI_API_KEY) {
    models.push(
      { model: LLMModel.GPT35, provider: AIProvider.OPENAI },
      { model: LLMModel.GPT4, provider: AIProvider.OPENAI },
      { model: LLMModel.GPT4_TURBO, provider: AIProvider.OPENAI }
    );
  }
  
  // 检查Claude配置
  if (process.env.REACT_APP_CLAUDE_API_KEY) {
    models.push(
      { model: LLMModel.CLAUDE3_OPUS, provider: AIProvider.CLAUDE },
      { model: LLMModel.CLAUDE3_SONNET, provider: AIProvider.CLAUDE },
      { model: LLMModel.CLAUDE3_HAIKU, provider: AIProvider.CLAUDE }
    );
  }
  
  // 检查Gemini配置
  if (process.env.REACT_APP_GEMINI_API_KEY) {
    models.push(
      { model: LLMModel.GEMINI_PRO, provider: AIProvider.GEMINI },
      { model: LLMModel.GEMINI_PRO_VISION, provider: AIProvider.GEMINI }
    );
  }
  
  // 检查DeepSeek配置
  if (process.env.REACT_APP_DEEPSEEK_API_KEY) {
    models.push(
      { model: LLMModel.DEEPSEEK_REASONER, provider: AIProvider.DEEPSEEK },
      { model: LLMModel.DEEPSEEK_CHAT, provider: AIProvider.DEEPSEEK }
    );
  }
  
  // 检查火山配置
  if (process.env.REACT_APP_HUOSHAN_API_KEY) {
    models.push(
      { model: LLMModel.HUOSHAN_DEEPSEEK_R1, provider: AIProvider.HUOSHAN },
      { model: LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_32B, provider: AIProvider.HUOSHAN },
      { model: LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_7B, provider: AIProvider.HUOSHAN },
      { model: LLMModel.HUOSHAN_DEEPSEEK_V3, provider: AIProvider.HUOSHAN }
    );
  }
  
  // 检查通义千问配置
  if (process.env.REACT_APP_QWEN_API_KEY) {
    models.push(
      { model: LLMModel.QWEN_PLUS, provider: AIProvider.QWEN },
      { model: LLMModel.QWEN_PLUS_LATEST, provider: AIProvider.QWEN },
      { model: LLMModel.QWEN_MAX, provider: AIProvider.QWEN },
      { model: LLMModel.QWQ_PLUS, provider: AIProvider.QWEN }
    );
  }
  
  return models;
};

// 测试AI连接
export const testAIConnection = async (provider: AIProvider): Promise<boolean> => {
  try {
    const config = getAIConfig(provider);
    
    if (!config.apiKey) {
      return false;
    }
    
    // 根据提供商进行简单的API测试
    switch (provider) {
      case AIProvider.OPENAI: {
        const response = await fetch(`${config.baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          }
        });
        return response.ok;
      }
      case AIProvider.CLAUDE: {
        const response = await fetch(`${config.baseUrl}/models`, {
          headers: {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01'
          }
        });
        return response.ok;
      }
      case AIProvider.GEMINI: {
        const response = await fetch(
          `${config.baseUrl}/models?key=${config.apiKey}`
        );
        return response.ok;
      }
      case AIProvider.DEEPSEEK: {
        const response = await fetch(`${config.baseUrl}/v1/models`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          }
        });
        return response.ok;
      }
      case AIProvider.HUOSHAN: {
        const response = await fetch(`${config.baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          }
        });
        return response.ok;
      }
      case AIProvider.QWEN: {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: 'qwen-plus',
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        return response.ok;
      }
      default:
        return false;
    }
  } catch (error) {
    console.error(`测试${provider}连接失败:`, error);
    return false;
  }
};

// 添加一个新的函数来打印配置信息
const printAIConfigurations = () => {
  console.log('\n=== AI 配置信息 ===');
  
  // OpenAI配置
  const openaiConfig = getAIConfig(AIProvider.OPENAI);
  console.log('\nOpenAI配置:');
  console.log('基础URL:', openaiConfig.baseUrl);
  console.log('API密钥:', openaiConfig.apiKey ? '已配置' : '未配置');
  
  // Claude配置
  const claudeConfig = getAIConfig(AIProvider.CLAUDE);
  console.log('\nClaude配置:');
  console.log('基础URL:', claudeConfig.baseUrl);
  console.log('API密钥:', claudeConfig.apiKey ? '已配置' : '未配置');
  
  // Gemini配置
  const geminiConfig = getAIConfig(AIProvider.GEMINI);
  console.log('\nGemini配置:');
  console.log('基础URL:', geminiConfig.baseUrl);
  console.log('API密钥:', geminiConfig.apiKey ? '已配置' : '未配置');
  
  // DeepSeek配置
  const deepseekConfig = getAIConfig(AIProvider.DEEPSEEK);
  console.log('\nDeepSeek配置:');
  console.log('基础URL:', deepseekConfig.baseUrl);
  console.log('API密钥:', deepseekConfig.apiKey ? '已配置' : '未配置');
  
  // 火山配置
  const huoshanConfig = getAIConfig(AIProvider.HUOSHAN);
  console.log('\n火山配置:');
  console.log('基础URL:', huoshanConfig.baseUrl);
  console.log('API密钥:', huoshanConfig.apiKey ? '已配置' : '未配置');

  // 通义千问配置
  const tongyiConfig = getAIConfig(AIProvider.QWEN);
  console.log('\n通义千问配置:');
  console.log('基础URL:', tongyiConfig.baseUrl);
  console.log('API密钥:', tongyiConfig.apiKey ? '已配置' : '未配置');
  
  console.log('\n=== 配置信息结束 ===\n');
};

// 在初始化时或需要时调用
printAIConfigurations();

export const sendMessage = async (
  provider: AIProvider,
  message: AIRequestMessage,
  model: string
): Promise<AIResponse> => {
  // 获取正确的配置
  const config = getAIConfig(provider);
  
  const requestBody = {
    messages: [
      ...(message.systemPrompt ? [{
        role: 'system',
        content: message.systemPrompt
      }] : []),
      {
        role: 'user',
        content: message.userPrompt
      }
    ],
    model: model
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    model,
    provider,
    usage: data.usage
  };
}; 