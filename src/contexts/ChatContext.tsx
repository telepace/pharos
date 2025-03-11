import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, Conversation } from '../types';
import { sendMessageToAI } from '../services/aiService';
import { usePromptContext } from './PromptContext';
import { useSceneContext } from './SceneContext';
import { useSettings } from './SettingsContext';
import { 
  getCurrentConversation, 
  saveCurrentConversation,
  getConversations,
  saveConversations
} from '../services/localStorage';
import { LLMModel, PromptType } from '../types';
import { getOrCreateTrace, trackAIGeneration } from '../services/langfuseService';

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
  observationIds: Record<string, string>;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  createNewConversation: () => void;
  switchConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, newName: string) => void;
  deleteConversation: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [observationIds, setObservationIds] = useState<Record<string, string>>({});
  
  const { getActivePrompt } = usePromptContext();
  const { activeSceneId } = useSceneContext();
  const { settings } = useSettings();

  // 创建新对话
  const createNewConversation = useCallback(() => {
    const timestamp = Date.now();
    const newConversation: Conversation = {
      id: uuidv4(),
      name: `对话 ${new Date(timestamp).toLocaleString()}`,
      messages: [],
      activePromptId: getActivePrompt()?.id || null,
      sceneId: activeSceneId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    setCurrentConversation(newConversation);
    setMessages([]);
    
    // 更新对话列表
    const updatedConversations = [...conversations, newConversation];
    setConversations(updatedConversations);
    
    // 保存到本地存储
    saveCurrentConversation(newConversation);
    saveConversations(updatedConversations);
  }, [activeSceneId, conversations, getActivePrompt]);

  // 初始化对话列表
  useEffect(() => {
    const storedConversations = getConversations();
    setConversations(storedConversations);
    
    const storedCurrentConversation = getCurrentConversation();
    
    if (storedCurrentConversation) {
      setCurrentConversation(storedCurrentConversation);
      // 确保使用深拷贝，防止引用问题导致消息丢失
      const deepCopiedMessages = storedCurrentConversation.messages.map(msg => ({...msg}));
      setMessages(deepCopiedMessages);
    } else {
      // 创建新对话
      createNewConversation();
    }
  }, [createNewConversation]);

  // 将 updateConversation 的定义移动到使用它的 useEffect 之前
  const updateConversation = useCallback((conversation: Conversation) => {
    // 更新当前对话
    setCurrentConversation(conversation);
    
    // 更新消息列表 - 使用深拷贝防止引用问题
    const deepCopiedMessages = conversation.messages.map(msg => ({...msg}));
    setMessages(deepCopiedMessages);
    
    // 保存到本地存储
    saveCurrentConversation(conversation);
    
    // 更新对话列表
    setConversations(currentConversations => {
      const updatedConversations = currentConversations.map(conv => 
        conv.id === conversation.id ? conversation : conv
      );
      saveConversations(updatedConversations);
      return updatedConversations;
    });
  }, [setConversations]);

  // 当场景或提示变化时，更新当前对话
  useEffect(() => {
    if (currentConversation) {
      const updatedConversation: Conversation = {
        ...currentConversation,
        activePromptId: getActivePrompt()?.id || null,
        sceneId: activeSceneId,
        updatedAt: Date.now()
      };
      
      updateConversation(updatedConversation);
    }
  }, [activeSceneId, getActivePrompt, currentConversation, updateConversation]);

  // 使用防抖动更新消息内容
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateMessageWithDebounce = useCallback((messageId: string, content: string) => {
    setMessages(currentMessages => {
      const updatedMessages = currentMessages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            content
          };
        }
        return msg;
      });
      
      return updatedMessages;
    });
  }, []);

  // 使用防抖动更新对话
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateConversationWithDebounce = useCallback((conversation: Conversation) => {
    // 使用本地变量存储最新的对话，避免频繁更新状态
    const updatedConversation = { ...conversation };
    
    // 更新对话列表
    setConversations(currentConversations => {
      const updatedConversations = currentConversations.map(conv => 
        conv.id === updatedConversation.id ? updatedConversation : conv
      );
      
      // 每500ms保存一次到本地存储
      saveConversations(updatedConversations);
      
      return updatedConversations;
    });
    
    // 保存当前对话到本地存储
    saveCurrentConversation(updatedConversation);
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentConversation) return;
    
    // 创建用户消息
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: Date.now()
    };
    
    // 更新消息列表
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // 更新对话
    const timestamp = Date.now();
    const updatedConversation: Conversation = {
      ...currentConversation,
      messages: updatedMessages,
      updatedAt: timestamp
    };
    
    updateConversation(updatedConversation);
    
    // 获取当前活动提示
    const activePrompt = getActivePrompt();
    
    // 创建一个空的AI回复消息，用于流式更新
    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: Date.now()
    };
    
    // 将空消息添加到消息列表
    const messagesWithEmptyResponse = [...updatedMessages, assistantMessage];
    setMessages(messagesWithEmptyResponse);
    setStreamingMessageId(assistantMessageId);
    
    // 发送消息到AI
    setIsLoading(true);
    setIsStreaming(true);
    
    // 用于存储完整的流式响应内容
    let fullStreamContent = '';
    // 用于控制本地存储更新频率的计时器
    let saveTimer: NodeJS.Timeout | null = null;
    // 标记是否已经完成流式响应
    // let isStreamCompleted = false;
    
    try {
      // 确定是否使用特定模型
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const hasSpecificModel = activePrompt?.model && activePrompt.model !== LLMModel.GPT35;
      
      // 处理流式响应的回调函数
      const handleStreamChunk = (chunk: string) => {
        // 更新完整的流式内容
        fullStreamContent += chunk;
        
        // 直接更新消息列表中的AI回复内容
        setMessages(currentMessages => {
          // 首先检查当前消息列表中是否包含assistantMessage
          const messageIndex = currentMessages.findIndex(msg => msg.id === assistantMessageId);
          
          if (messageIndex === -1) {
            // 检查是否有重复的用户消息
            const userMessages = currentMessages.filter(msg => msg.role === 'user');
            const uniqueUserMessages = userMessages.filter((msg, index, self) => 
              index === self.findIndex(m => m.id === msg.id)
            );
            
            // 如果有重复的用户消息，只保留一个
            const cleanedMessages = uniqueUserMessages.length < userMessages.length 
              ? [...uniqueUserMessages]
              : [...currentMessages];
              
            // 如果不存在，重新添加
            return [
              ...cleanedMessages,
              {
                id: assistantMessageId,
                content: fullStreamContent,
                role: 'assistant' as const,
                timestamp: Date.now()
              }
            ];
          }
          
          // 创建一个新的消息数组，避免直接修改原数组
          const newMessages = [...currentMessages];
          
          // 更新AI回复消息的内容
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            content: fullStreamContent
          };
          
          // 清除之前的计时器
          if (saveTimer) {
            clearTimeout(saveTimer);
          }
          
          // 设置新的计时器，500ms后保存到本地存储
          saveTimer = setTimeout(() => {
            if (currentConversation) {
              const updatedConversation: Conversation = {
                ...currentConversation,
                messages: newMessages,
                updatedAt: Date.now()
              };
              
              saveCurrentConversation(updatedConversation);
              
              // 更新对话列表
              setConversations(currentConversations => {
                const updatedConversations = currentConversations.map(conv => 
                  conv.id === updatedConversation.id ? updatedConversation : conv
                );
                
                saveConversations(updatedConversations);
                return updatedConversations;
              });
            }
          }, 500);
          
          return newMessages;
        });
      };

      // 使用适当的模型和提示发送消息
      let modelToUse = settings.defaultModel as LLMModel;
      let systemPromptToUse = settings.globalPrompt;
      
      // 如果有活动提示，使用其模型和内容
      if (activePrompt) {
        if (activePrompt.model) {
          modelToUse = activePrompt.model as LLMModel;
        }
        
        if (activePrompt.type === PromptType.SYSTEM) {
          systemPromptToUse = activePrompt.content;
        }
      }
      
      // 创建跟踪ID
      const traceId = getOrCreateTrace(currentConversation.id);
      
      // 创建观察ID
      const observationId = uuidv4();
      setObservationIds(prev => ({
        ...prev,
        [assistantMessageId]: observationId
      }));
      
      // 发送消息到AI
      const response = await sendMessageToAI(
        updatedMessages,
        systemPromptToUse,
        activePrompt?.type || PromptType.SYSTEM,
        modelToUse,
        settings.useGlobalPrompt,
        {
          defaultModel: settings.defaultModel as LLMModel,
          globalPrompt: settings.globalPrompt,
          useGlobalPrompt: settings.useGlobalPrompt,
          globalPromptType: settings.globalPromptType
        },
        handleStreamChunk,
        currentConversation.id
      );
      
      // 标记流式响应已完成
      // isStreamCompleted = true;
      
      // 跟踪AI生成
      if (traceId) {
        trackAIGeneration(
          traceId, 
          updatedMessages,
          systemPromptToUse,
          modelToUse,
          response.provider,
          response
        );
      }
      
      // 确保最终消息内容是完整的
      setMessages(currentMessages => {
        // 查找AI回复消息
        const messageIndex = currentMessages.findIndex(msg => msg.id === assistantMessageId);
        
        if (messageIndex === -1) {
          console.warn("警告: 流式响应完成时未找到AI消息，重新添加");
          return [
            ...currentMessages,
            {
              id: assistantMessageId,
              content: fullStreamContent || response.content,
              role: 'assistant',
              timestamp: Date.now()
            }
          ];
        }
        
        // 创建一个新的消息数组
        const finalMessages = [...currentMessages];
        
        // 更新AI回复消息的内容
        finalMessages[messageIndex] = {
          ...finalMessages[messageIndex],
          content: fullStreamContent || response.content
        };
        
        // 更新当前对话
        if (currentConversation) {
          const finalConversation: Conversation = {
            ...currentConversation,
            messages: finalMessages,
            updatedAt: Date.now()
          };
          
          // 保存到本地存储
          saveCurrentConversation(finalConversation);
          
          // 更新对话列表
          setConversations(currentConversations => {
            const updatedConversations = currentConversations.map(conv => 
              conv.id === finalConversation.id ? finalConversation : conv
            );
            
            saveConversations(updatedConversations);
            return updatedConversations;
          });
        }
        
        return finalMessages;
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 即使出错，也尝试保留已收到的内容
      if (fullStreamContent.trim() !== '') {
        setMessages(currentMessages => {
          // 查找AI回复消息
          const messageIndex = currentMessages.findIndex(msg => msg.id === assistantMessageId);
          
          if (messageIndex === -1) {
            return [
              ...currentMessages,
              {
                id: assistantMessageId,
                content: fullStreamContent + '\n\n[出错: ' + (error instanceof Error ? error.message : '未知错误') + ']',
                role: 'assistant',
                timestamp: Date.now()
              }
            ];
          }
          
          // 创建一个新的消息数组
          const errorMessages = [...currentMessages];
          
          // 更新AI回复消息的内容
          errorMessages[messageIndex] = {
            ...errorMessages[messageIndex],
            content: fullStreamContent + '\n\n[出错: ' + (error instanceof Error ? error.message : '未知错误') + ']'
          };
          
          // 更新当前对话
          if (currentConversation) {
            const errorConversation: Conversation = {
              ...currentConversation,
              messages: errorMessages,
              updatedAt: Date.now()
            };
            
            // 保存到本地存储
            saveCurrentConversation(errorConversation);
            
            // 更新对话列表
            setConversations(currentConversations => {
              const updatedConversations = currentConversations.map(conv => 
                conv.id === errorConversation.id ? errorConversation : conv
              );
              
              saveConversations(updatedConversations);
              return updatedConversations;
            });
          }
          
          return errorMessages;
        });
      } else {
        // 如果没有收到任何内容，则显示错误消息
        setMessages(currentMessages => {
          // 查找AI回复消息
          const messageIndex = currentMessages.findIndex(msg => msg.id === assistantMessageId);
          
          if (messageIndex === -1) {
            return [
              ...currentMessages,
              {
                id: assistantMessageId,
                content: '发送消息时出错: ' + (error instanceof Error ? error.message : '未知错误'),
                role: 'assistant',
                timestamp: Date.now()
              }
            ];
          }
          
          // 创建一个新的消息数组
          const errorMessages = [...currentMessages];
          
          // 更新AI回复消息的内容
          errorMessages[messageIndex] = {
            ...errorMessages[messageIndex],
            content: '发送消息时出错: ' + (error instanceof Error ? error.message : '未知错误')
          };
          
          return errorMessages;
        });
      }
    } finally {
      // 无论成功还是失败，都重置加载状态
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
      
      // 确保计时器被清除
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    }
  };

  const clearMessages = () => {
    if (!currentConversation) return;
    
    // 创建新对话
    const timestamp = Date.now();
    const newConversation: Conversation = {
      ...currentConversation,
      messages: [],
      updatedAt: timestamp
    };
    
    setMessages([]);
    updateConversation(newConversation);
  };

  const switchConversation = (conversationId: string) => {
    // 查找要切换到的对话
    const targetConversation = conversations.find(conv => conv.id === conversationId);
    if (!targetConversation) return;
    
    // 确保在切换对话前完成所有正在进行的操作
    setIsLoading(false);
    setIsStreaming(false);
    setStreamingMessageId(null);
    
    // 更新当前对话
    setCurrentConversation(targetConversation);
    
    // 确保消息列表被正确设置 - 使用深拷贝
    const deepCopiedMessages = targetConversation.messages.map(msg => ({...msg}));
    setMessages(deepCopiedMessages);
    
    // 保存到本地存储
    saveCurrentConversation(targetConversation);
  };

  const renameConversation = (conversationId: string, newName: string) => {
    if (!newName.trim()) return;
    
    // 更新对话列表
    setConversations(currentConversations => {
      const updatedConversations = currentConversations.map(conv => {
        if (conv.id === conversationId) {
          const updatedConversation = {
            ...conv,
            name: newName.trim(),
            updatedAt: Date.now()
          };
          
          // 如果是当前对话，也更新当前对话
          if (currentConversation && currentConversation.id === conversationId) {
            setCurrentConversation(updatedConversation);
          }
          
          return updatedConversation;
        }
        return conv;
      });
      
      // 保存到本地存储
      saveConversations(updatedConversations);
      return updatedConversations;
    });
  };

  const handleDeleteConversation = (conversationId: string) => {
    // 更新对话列表
    setConversations(currentConversations => {
      const updatedConversations = currentConversations.filter(conv => conv.id !== conversationId);
      
      // 如果删除的是当前对话，切换到另一个对话或创建新对话
      if (currentConversation && currentConversation.id === conversationId) {
        if (updatedConversations.length > 0) {
          // 切换到列表中的第一个对话
          const newCurrentConversation = updatedConversations[0];
          setCurrentConversation(newCurrentConversation);
          setMessages(newCurrentConversation.messages);
          saveCurrentConversation(newCurrentConversation);
        } else {
          // 如果没有其他对话，创建新对话
          createNewConversation();
        }
      }
      
      // 保存到本地存储
      saveConversations(updatedConversations);
      return updatedConversations;
    });
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        isLoading,
        isStreaming,
        streamingMessageId,
        observationIds,
        sendMessage,
        clearMessages,
        createNewConversation,
        switchConversation,
        renameConversation,
        deleteConversation: handleDeleteConversation
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};