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
  saveConversations,
  deleteConversation
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

  // 初始化对话列表
  useEffect(() => {
    const storedConversations = getConversations();
    setConversations(storedConversations);
    
    const storedCurrentConversation = getCurrentConversation();
    
    if (storedCurrentConversation) {
      setCurrentConversation(storedCurrentConversation);
      setMessages(storedCurrentConversation.messages);
    } else {
      // 创建新对话
      createNewConversation();
    }
  }, []);

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
  }, [activeSceneId, getActivePrompt]);

  // 更新对话
  const updateConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setMessages(conversation.messages);
    
    // 更新对话列表
    const updatedConversations = conversations.map(conv => 
      conv.id === conversation.id ? conversation : conv
    );
    setConversations(updatedConversations);
    
    // 保存到本地存储
    saveCurrentConversation(conversation);
    saveConversations(updatedConversations);
  };

  // 创建新对话
  const createNewConversation = () => {
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
  };

  // 切换对话
  const switchConversation = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      setMessages(conversation.messages);
      saveCurrentConversation(conversation);
    }
  };

  // 重命名对话
  const renameConversation = (conversationId: string, newName: string) => {
    const updatedConversations = conversations.map(conv => 
      conv.id === conversationId 
        ? { ...conv, name: newName, updatedAt: Date.now() } 
        : conv
    );
    
    setConversations(updatedConversations);
    
    if (currentConversation?.id === conversationId) {
      const updatedCurrentConversation = { 
        ...currentConversation, 
        name: newName,
        updatedAt: Date.now()
      };
      setCurrentConversation(updatedCurrentConversation);
    }
    
    saveConversations(updatedConversations);
  };

  // 删除对话
  const handleDeleteConversation = (conversationId: string) => {
    // 从列表中删除
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    
    // 如果删除的是当前对话，切换到另一个对话或创建新对话
    if (currentConversation?.id === conversationId) {
      if (updatedConversations.length > 0) {
        const newCurrentConversation = updatedConversations[0];
        setCurrentConversation(newCurrentConversation);
        setMessages(newCurrentConversation.messages);
        saveCurrentConversation(newCurrentConversation);
      } else {
        createNewConversation();
      }
    }
    
    // 从本地存储中删除
    deleteConversation(conversationId);
    saveConversations(updatedConversations);
  };

  // 使用防抖动更新消息内容
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
    
    try {
      // 确定是否使用特定模型
      const hasSpecificModel = activePrompt?.model && activePrompt.model !== LLMModel.GPT35;
      
      // 处理流式响应的回调函数
      const handleStreamChunk = (chunk: string) => {
        // 更新完整内容
        fullStreamContent += chunk;
        
        // 更新消息内容
        setMessages(currentMessages => {
          const updatedMessages = currentMessages.map(msg => {
            if (msg.id === assistantMessageId) {
              return {
                ...msg,
                content: fullStreamContent
              };
            }
            return msg;
          });
          
          // 更新当前对话
          if (currentConversation) {
            const updatedConversation: Conversation = {
              ...currentConversation,
              messages: updatedMessages,
              updatedAt: Date.now()
            };
            
            // 清除之前的计时器
            if (saveTimer) {
              clearTimeout(saveTimer);
            }
            
            // 设置新的计时器，500ms后保存到本地存储
            saveTimer = setTimeout(() => {
              saveCurrentConversation(updatedConversation);
              
              // 更新对话列表
              setConversations(currentConversations => {
                const updatedConversations = currentConversations.map(conv => 
                  conv.id === updatedConversation.id ? updatedConversation : conv
                );
                saveConversations(updatedConversations);
                return updatedConversations;
              });
            }, 500);
          }
          
          return updatedMessages;
        });
      };
      
      const aiResponse = await sendMessageToAI(
        updatedMessages,
        activePrompt?.content || null,
        activePrompt?.type || PromptType.SYSTEM,
        activePrompt?.model as LLMModel || LLMModel.GPT35,
        true, // 使用全局设置
        {
          defaultModel: settings.defaultModel,
          globalPrompt: settings.globalPrompt,
          useGlobalPrompt: settings.useGlobalPrompt,
          globalPromptType: settings.globalPromptType
        },
        handleStreamChunk, // 传递流式处理回调
        currentConversation?.id // 传递会话ID用于监控
      );
      
      // 创建 Langfuse 跟踪并记录 AI 生成
      const trace = getOrCreateTrace(currentConversation.id, currentConversation.name);
      if (trace) {
        const generation = trackAIGeneration(
          trace,
          updatedMessages,
          activePrompt?.content || null,
          activePrompt?.model as LLMModel || LLMModel.GPT35,
          aiResponse.provider,
          aiResponse
        );
        
        // 保存生成的 observationId，用于后续反馈
        if (generation) {
          setObservationIds(prev => ({
            ...prev,
            [assistantMessageId]: generation.id
          }));
        }
      }
      
      // 流式响应完成后，确保最终消息内容与AI响应一致
      setMessages(currentMessages => {
        const finalMessages = currentMessages.map(msg => {
          if (msg.id === assistantMessageId) {
            return {
              ...msg,
              content: aiResponse.content
            };
          }
          return msg;
        });
        
        // 更新对话
        if (currentConversation) {
          const finalConversation: Conversation = {
            ...currentConversation,
            messages: finalMessages,
            updatedAt: Date.now()
          };
          
          updateConversation(finalConversation);
        }
        
        return finalMessages;
      });
    } catch (error) {
      console.error('Error sending message to AI:', error);
      
      // 更新错误消息
      setMessages(currentMessages => {
        const errorMessages = currentMessages.map(msg => {
          if (msg.id === assistantMessageId) {
            return {
              ...msg,
              content: `抱歉，发生了错误，请稍后再试。\n\n错误详情: ${error instanceof Error ? error.message : '未知错误'}`
            };
          }
          return msg;
        });
        
        // 更新对话
        if (currentConversation) {
          const errorConversation: Conversation = {
            ...currentConversation,
            messages: errorMessages,
            updatedAt: Date.now()
          };
          
          updateConversation(errorConversation);
        }
        
        return errorMessages;
      });
    } finally {
      // 清除计时器
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
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