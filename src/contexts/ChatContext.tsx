import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, Conversation } from '../types';
import { sendMessageToAI } from '../services/aiService';
import { usePromptContext } from './PromptContext';
import { useSceneContext } from './SceneContext';
import { 
  getCurrentConversation, 
  saveCurrentConversation 
} from '../services/localStorage';
import { LLMModel } from '../types';

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
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
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getActivePrompt } = usePromptContext();
  const { activeSceneId } = useSceneContext();

  // 初始化对话
  useEffect(() => {
    const storedConversation = getCurrentConversation();
    
    if (storedConversation) {
      setCurrentConversation(storedConversation);
      setMessages(storedConversation.messages);
    } else {
      // 创建新对话
      const newConversation: Conversation = {
        id: uuidv4(),
        messages: [],
        activePromptId: null,
        sceneId: activeSceneId
      };
      
      setCurrentConversation(newConversation);
      saveCurrentConversation(newConversation);
    }
  }, [activeSceneId]);

  // 当场景或提示变化时，更新当前对话
  useEffect(() => {
    if (currentConversation) {
      const updatedConversation: Conversation = {
        ...currentConversation,
        activePromptId: getActivePrompt()?.id || null,
        sceneId: activeSceneId
      };
      
      setCurrentConversation(updatedConversation);
      saveCurrentConversation(updatedConversation);
    }
  }, [activeSceneId, getActivePrompt]);

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
    const updatedConversation: Conversation = {
      ...currentConversation,
      messages: updatedMessages
    };
    setCurrentConversation(updatedConversation);
    saveCurrentConversation(updatedConversation);
    
    // 获取当前活动提示
    const activePrompt = getActivePrompt();
    
    // 发送消息到AI
    setIsLoading(true);
    try {
      const aiResponse = await sendMessageToAI(
        updatedMessages,
        activePrompt?.content || null,
        activePrompt?.model as LLMModel
      );
      
      // 创建AI回复消息
      const assistantMessage: Message = {
        id: uuidv4(),
        content: aiResponse,
        role: 'assistant',
        timestamp: Date.now()
      };
      
      // 更新消息列表
      const messagesWithResponse = [...updatedMessages, assistantMessage];
      setMessages(messagesWithResponse);
      
      // 更新对话
      const conversationWithResponse: Conversation = {
        ...updatedConversation,
        messages: messagesWithResponse
      };
      setCurrentConversation(conversationWithResponse);
      saveCurrentConversation(conversationWithResponse);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      
      // 创建错误消息
      const errorMessage: Message = {
        id: uuidv4(),
        content: '抱歉，发生了错误，请稍后再试。',
        role: 'assistant',
        timestamp: Date.now()
      };
      
      // 更新消息列表
      const messagesWithError = [...updatedMessages, errorMessage];
      setMessages(messagesWithError);
      
      // 更新对话
      const conversationWithError: Conversation = {
        ...updatedConversation,
        messages: messagesWithError
      };
      setCurrentConversation(conversationWithError);
      saveCurrentConversation(conversationWithError);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    if (!currentConversation) return;
    
    // 创建新对话
    const newConversation: Conversation = {
      ...currentConversation,
      id: uuidv4(),
      messages: []
    };
    
    setMessages([]);
    setCurrentConversation(newConversation);
    saveCurrentConversation(newConversation);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        clearMessages
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}; 