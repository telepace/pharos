import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  
  // 添加一个本地备份，用于恢复可能丢失的AI消息
  const messagesBackupRef = useRef<Message[]>([]);
  
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
    
    // 监听恢复消息事件
    const handleRestoreMessages = (event: any) => {
      console.log("ChatContext收到恢复消息事件");
      if (event.detail && event.detail.messages) {
        const restoredMessages = event.detail.messages;
        
        // 检查是否有AI消息
        const hasAssistantMessage = restoredMessages.some((msg: Message) => msg.role === 'assistant');
        const hasCurrentAssistantMessage = messages.some(msg => msg.role === 'assistant');
        
        // 只有当恢复的消息包含AI消息且当前消息不包含AI消息时才恢复
        if (hasAssistantMessage && !hasCurrentAssistantMessage && restoredMessages.length > messages.length) {
          console.log("从ChatWindow恢复消息:", restoredMessages.length, "条");
          setMessages(restoredMessages);
          
          // 如果有当前对话，也更新对话中的消息
          if (currentConversation) {
            const restoredConversation: Conversation = {
              ...currentConversation,
              messages: restoredMessages,
              updatedAt: Date.now()
            };
            
            // 保存到本地存储
            saveCurrentConversation(restoredConversation);
            
            // 更新对话列表
            setConversations(currentConversations => {
              const updatedConversations = currentConversations.map(conv => 
                conv.id === restoredConversation.id ? restoredConversation : conv
              );
              
              saveConversations(updatedConversations);
              return updatedConversations;
            });
          }
        }
      }
    };
    
    window.addEventListener('restoreMessages', handleRestoreMessages);
    
    return () => {
      window.removeEventListener('restoreMessages', handleRestoreMessages);
    };
  }, [createNewConversation, messages, currentConversation]);

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

  // 当messages更新时，保存一份备份
  useEffect(() => {
    // 只有当消息列表不为空时才更新备份
    if (messages.length > 0) {
      // 检查是否有AI消息
      const hasAssistantMessage = messages.some(msg => msg.role === 'assistant');
      const hasBackupAssistantMessage = messagesBackupRef.current.some(msg => msg.role === 'assistant');
      
      // 如果当前消息列表没有AI消息，但备份中有，则不更新备份
      if (!hasAssistantMessage && hasBackupAssistantMessage && messagesBackupRef.current.length >= messages.length) {
        console.log("当前消息列表缺少AI消息，不更新备份");
        
        // 尝试从备份中恢复AI消息
        const assistantMessages = messagesBackupRef.current.filter(msg => msg.role === 'assistant');
        if (assistantMessages.length > 0) {
          console.log("从备份中恢复AI消息:", assistantMessages.length, "条");
          
          // 创建一个新的消息列表，包含当前的用户消息和备份中的AI消息
          const userMessages = messages.filter(msg => msg.role === 'user');
          const restoredMessages = [...userMessages];
          
          // 为每个用户消息找到对应的AI回复
          userMessages.forEach(userMsg => {
            // 找到用户消息在备份中的位置
            const userIndex = messagesBackupRef.current.findIndex(msg => msg.id === userMsg.id);
            if (userIndex !== -1 && userIndex < messagesBackupRef.current.length - 1) {
              // 检查下一条消息是否是AI回复
              const nextMsg = messagesBackupRef.current[userIndex + 1];
              if (nextMsg && nextMsg.role === 'assistant') {
                // 确保这个AI消息还没有被添加
                if (!restoredMessages.some(msg => msg.id === nextMsg.id)) {
                  restoredMessages.push(nextMsg);
                }
              }
            }
          });
          
          // 如果还有其他AI消息没有被添加，添加它们
          assistantMessages.forEach(aiMsg => {
            if (!restoredMessages.some(msg => msg.id === aiMsg.id)) {
              restoredMessages.push(aiMsg);
            }
          });
          
          // 按时间戳排序
          restoredMessages.sort((a, b) => a.timestamp - b.timestamp);
          
          console.log("恢复后的消息列表:", restoredMessages.length, "条");
          
          // 更新消息列表
          setMessages(restoredMessages);
          
          // 如果有当前对话，也更新对话中的消息
          if (currentConversation) {
            const restoredConversation: Conversation = {
              ...currentConversation,
              messages: restoredMessages,
              updatedAt: Date.now()
            };
            
            // 保存到本地存储
            saveCurrentConversation(restoredConversation);
            
            // 更新对话列表
            setConversations(currentConversations => {
              const updatedConversations = currentConversations.map(conv => 
                conv.id === restoredConversation.id ? restoredConversation : conv
              );
              
              saveConversations(updatedConversations);
              return updatedConversations;
            });
          }
          
          return;
        }
      }
      
      // 创建深拷贝以避免引用问题
      const deepCopy = messages.map(msg => ({...msg}));
      messagesBackupRef.current = deepCopy;
      console.log("更新消息备份:", deepCopy.length, "条");
    }
  }, [messages, currentConversation]);

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
    
    // 将空消息添加到消息列表 - 使用函数式更新确保基于最新状态
    setMessages(prevMessages => {
      const messagesWithEmptyResponse = [...prevMessages, assistantMessage];
      console.log("添加空AI消息:", assistantMessageId, "当前消息数:", messagesWithEmptyResponse.length);
      
      // 立即更新备份
      messagesBackupRef.current = messagesWithEmptyResponse.map(msg => ({...msg}));
      
      return messagesWithEmptyResponse;
    });
    
    setStreamingMessageId(assistantMessageId);
    
    // 发送消息到AI
    setIsLoading(true);
    setIsStreaming(true);
    
    // 用于存储完整的流式响应内容
    let fullStreamContent = '';
    // 用于控制本地存储更新频率的计时器
    let saveTimer: NodeJS.Timeout | null = null;
    
    try {
      // 确定是否使用特定模型
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const hasSpecificModel = activePrompt?.model && activePrompt.model !== LLMModel.GPT35;
      
      // 处理流式响应的回调函数
      const handleStreamChunk = (chunk: string) => {
        // 更新完整的流式内容
        fullStreamContent += chunk;
        
        // 直接更新消息列表中的AI回复内容 - 使用函数式更新确保基于最新状态
        setMessages(currentMessages => {
          // 首先检查当前消息列表中是否包含assistantMessage
          const messageIndex = currentMessages.findIndex(msg => msg.id === assistantMessageId);
          
          if (messageIndex === -1) {
            console.warn("警告: 流式更新时未找到AI消息，重新添加", assistantMessageId);
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
            const updatedMessages = [
              ...cleanedMessages,
              {
                id: assistantMessageId,
                content: fullStreamContent,
                role: 'assistant' as const,
                timestamp: Date.now()
              }
            ];
            
            console.log("重新添加AI消息后的消息数:", updatedMessages.length);
            return updatedMessages;
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
          
          // 检查是否已经有相同内容的AI消息（避免重复）
          const existingAIMessage = currentMessages.find(msg => 
            msg.role === 'assistant' && msg.content === (fullStreamContent || response.content)
          );
          
          if (existingAIMessage) {
            console.log("已存在相同内容的AI消息，不重复添加");
            return currentMessages;
          }
          
          const finalMessages = [
            ...currentMessages,
            {
              id: assistantMessageId,
              content: fullStreamContent || response.content,
              role: 'assistant' as const,
              timestamp: Date.now()
            }
          ];
          
          console.log("流式响应完成，添加AI消息后的消息数:", finalMessages.length);
          
          // 更新备份
          messagesBackupRef.current = finalMessages.map(msg => ({...msg}));
          
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
        }
        
        // 创建一个新的消息数组
        const finalMessages = [...currentMessages];
        
        // 更新AI回复消息的内容
        finalMessages[messageIndex] = {
          ...finalMessages[messageIndex],
          content: fullStreamContent || response.content
        };
        
        console.log("流式响应完成，更新AI消息内容，消息数:", finalMessages.length);
        
        // 更新备份
        messagesBackupRef.current = finalMessages.map(msg => ({...msg}));
        
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
                role: 'assistant' as const,
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
                role: 'assistant' as const,
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
      
      // 最后检查一次消息列表中是否包含AI消息
      setMessages(currentMessages => {
        const hasAssistantMessage = currentMessages.some(msg => msg.role === 'assistant');
        
        if (!hasAssistantMessage && fullStreamContent) {
          console.warn("最终检查: 消息列表中没有AI消息，添加一个");
          
          const finalMessages = [
            ...currentMessages,
            {
              id: assistantMessageId,
              content: fullStreamContent,
              role: 'assistant' as const,
              timestamp: Date.now()
            }
          ];
          
          // 更新备份
          messagesBackupRef.current = finalMessages.map(msg => ({...msg}));
          
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
        }
        
        return currentMessages;
      });
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