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
    case AIProvider.OPENROUTER:
      return {
        provider: AIProvider.OPENROUTER,
        apiKey: process.env.REACT_APP_OPENROUTER_API_KEY || '',
        baseUrl: process.env.REACT_APP_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
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
  } else if (model.startsWith('qwen') || model.startsWith('qwq')) {
    return AIProvider.QWEN;
  } else if (model === LLMModel.OPENROUTER_GEMINI_FLASH ||
             model === LLMModel.OPENROUTER_CLAUDE_OPUS ||
             model === LLMModel.OPENROUTER_LLAMA || 
             model === LLMModel.OPENROUTER_MIXTRAL ||
             model.includes('/')) {  // OpenRouter模型通常包含提供商前缀
    return AIProvider.OPENROUTER;
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
    // QWQ模型只支持流式输出
    const isQWQModel = model.toString().startsWith('qwq');
    const isStream = !!streamCallback || isQWQModel;
    
    // 准备请求体
    const requestBody: any = {
      model: model.toString(),
      messages: formattedMessages,
      stream: isStream
    };
    
    // QWQ模型特殊处理
    if (isQWQModel) {
      // QWQ模型默认incremental_output为true，且不支持设置为false
      requestBody.incremental_output = true;
      
      // 对于QWQ模型，我们不设置response_format参数
      // 根据错误信息，response_format需要是一个包含type字段的对象
      // 但是我们尝试不设置这个参数，让API使用默认值
    }

    console.log('发送请求到千问API:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`千问API错误: ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    if (isStream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      let reasoningContent = '';
      
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
                  
                  // 处理QWQ模型的特殊响应格式
                  if (isQWQModel && jsonData.choices && jsonData.choices[0]?.delta) {
                    const delta = jsonData.choices[0].delta;
                    
                    // 处理思考过程
                    if (delta.reasoning_content) {
                      reasoningContent += delta.reasoning_content;
                      // 如果有回调函数，可以选择是否传递思考过程
                      if (streamCallback) {
                        // 可以选择是否将思考过程传递给UI
                        // streamCallback(`[思考] ${delta.reasoning_content}`);
                      }
                    } 
                    // 处理正式回复
                    else if (delta.content) {
                      fullContent += delta.content;
                      if (streamCallback) {
                        streamCallback(delta.content);
                      }
                    }
                  } 
                  // 处理标准流式响应
                  else if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    fullContent += content;
                    if (streamCallback) {
                      streamCallback(content);
                    }
                  }
                } catch (e) {
                  console.warn('解析千问流数据时出错:', e);
                }
              }
            }
          }
          
          // 构建响应对象
          const aiResponse: AIResponse = {
            content: fullContent,
            model: model.toString(),
            provider: AIProvider.QWEN
          };
          
          // 如果有思考过程，添加到响应中
          if (reasoningContent) {
            aiResponse.reasoning = reasoningContent;
          }
          
          resolve(aiResponse);
        } catch (error) {
          reject(error);
        }
      });
    }

    // 处理非流式响应
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model: model.toString(),
      provider: AIProvider.QWEN
    };
  } catch (error) {
    console.error('千问API调用失败:', error);
    throw error;
  }
};

// OpenRouter API调用
const callOpenRouter = async (
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

  const headers: HeadersInit = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  // 添加可选的站点信息头，确保编码正确
  try {
    // 从环境变量或localStorage获取值
    const siteUrl = process.env.REACT_APP_OPENROUTER_SITE_URL || localStorage.getItem('openrouter_site_url') || '';
    const siteName = process.env.REACT_APP_OPENROUTER_SITE_NAME || localStorage.getItem('openrouter_site_name') || '';
    
    // 确保使用纯ASCII字符或进行正确编码
    if (siteUrl) {
      // 使用URL构造函数确保URL格式正确
      try {
        const url = new URL(siteUrl);
        headers['HTTP-Referer'] = url.toString();
      } catch (e) {
        console.warn('无效的站点URL:', siteUrl);
      }
    }
    
    if (siteName) {
      // 确保站点名称只包含ASCII字符
      const asciiSiteName = siteName.replace(/[^\x00-\x7F]/g, ''); // 移除非ASCII字符
      if (asciiSiteName.length > 0) {
        headers['X-Title'] = asciiSiteName;
      }
    }
  } catch (error) {
    console.warn('设置OpenRouter头信息时出错:', error);
    // 继续处理，不要因为头信息问题阻止API调用
  }

  const requestBody = {
    model: model.toString(),
    messages: formattedMessages,
    stream: !!streamCallback
  };

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = `OpenRouter API错误: 状态码 ${response.status}`;
      try {
        const errorResponse = await response.json();
        errorMessage = `OpenRouter API错误: ${JSON.stringify(errorResponse)}`;
      } catch (e) {
        // 如果不能解析为JSON，尝试获取文本
        try {
          const errorText = await response.text();
          errorMessage = `OpenRouter API错误: ${errorText}`;
        } catch (textError) {
          // 如果文本也不能获取，使用默认错误信息
          console.error('无法解析错误响应', textError);
        }
      }
      throw new Error(errorMessage);
    }

    // 处理流式响应
    if (streamCallback) {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      let buffer = '';
      let responseContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.substring(6));
              const content = json.choices[0]?.delta?.content || '';
              if (content) {
                responseContent += content;
                streamCallback(content);
              }
            } catch (e) {
              console.warn('解析流式响应时出错:', e, 'line:', line);
              // 继续处理下一行，不中断流
            }
          }
        }
      }

      return {
        content: responseContent,
        model: model,
        provider: AIProvider.OPENROUTER
      };
    }

    // 处理非流式响应
    try {
      const data = await response.json();
      
      // 验证响应结构是否符合预期
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('OpenRouter API响应格式异常:', data);
        throw new Error('OpenRouter API响应格式异常: 找不到choices字段或为空');
      }
      
      const content = data.choices[0]?.message?.content || '';
      
      // 构建返回结果
      return {
        content,
        model: model.toString(), // 使用字符串形式
        provider: AIProvider.OPENROUTER,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      };
    } catch (parseError: any) {
      console.error('解析OpenRouter API响应时出错:', parseError);
      throw new Error(`解析OpenRouter API响应时出错: ${parseError.message || '未知错误'}`);
    }
  } catch (error) {
    console.error('OpenRouter API 错误:', error);
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
      case AIProvider.OPENROUTER:
        response = await callOpenRouter(messages, finalPromptContent, finalModel, config, streamCallback);
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
  
  // 检查OpenRouter配置
  if (process.env.REACT_APP_OPENROUTER_API_KEY) {
    // 默认内置的OpenRouter模型
    const defaultOpenRouterModels = [
      { model: LLMModel.OPENROUTER_GEMINI_FLASH, provider: AIProvider.OPENROUTER },
      { model: LLMModel.OPENROUTER_GEMINI_FLASH_001, provider: AIProvider.OPENROUTER },
      { model: LLMModel.OPENROUTER_GEMINI_PRO_EXP, provider: AIProvider.OPENROUTER },
      { model: LLMModel.OPENROUTER_GEMINI_FLASH_THINKING, provider: AIProvider.OPENROUTER },
      { model: LLMModel.OPENROUTER_CLAUDE_OPUS, provider: AIProvider.OPENROUTER },
      { model: LLMModel.OPENROUTER_LLAMA, provider: AIProvider.OPENROUTER },
      { model: LLMModel.OPENROUTER_MIXTRAL, provider: AIProvider.OPENROUTER }
    ];
    
    // 获取可配置的额外模型（支持从环境变量中配置）
    const additionalOpenRouterModels = getAdditionalOpenRouterModels();
    
    models.push(...defaultOpenRouterModels, ...additionalOpenRouterModels);
  }
  
  return models;
};

// 从配置中获取额外的OpenRouter模型
const getAdditionalOpenRouterModels = (): { model: LLMModel; provider: AIProvider }[] => {
  const additionalModels: { model: LLMModel; provider: AIProvider }[] = [];
  
  // 从环境变量中读取配置的额外模型（如果有的话）
  const openRouterModelsConfig = process.env.REACT_APP_OPENROUTER_MODELS;
  if (openRouterModelsConfig) {
    try {
      // 支持两种格式:
      // 1. 简单的逗号分隔列表: "model1,model2,model3"
      // 2. JSON数组格式: '["model1", "model2", "model3"]'
      let modelNames: string[] = [];
      
      // 尝试解析为JSON数组
      if (openRouterModelsConfig.trim().startsWith('[')) {
        try {
          modelNames = JSON.parse(openRouterModelsConfig);
        } catch {
          // 如果JSON解析失败，回退到逗号分隔格式
          modelNames = openRouterModelsConfig.split(',').map(m => m.trim());
        }
      } else {
        // 使用逗号分隔格式
        modelNames = openRouterModelsConfig.split(',').map(m => m.trim());
      }
      
      // 添加模型到列表
      modelNames.forEach(modelName => {
        if (modelName) {
          // 将模型名称作为动态模型添加
          additionalModels.push({
            model: modelName as LLMModel,
            provider: AIProvider.OPENROUTER
          });
        }
      });
    } catch (error) {
      console.error('解析OpenRouter额外模型配置失败:', error);
    }
  }
  
  // 检查是否已经在LLMModel枚举中定义了这些模型
  // 如果没有，我们仍然可以使用它们，因为我们使用了 as LLMModel 类型断言
  
  return additionalModels;
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