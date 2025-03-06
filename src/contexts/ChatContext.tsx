import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, Conversation } from '../types';
import { sendMessageToAI } from '../services/aiService';
import { usePromptContext } from './PromptContext';
import { useSceneContext } from './SceneContext';
import { 
  getCurrentConversation, 
  saveCurrentConversation,
  getConversations,
  saveConversations,
  deleteConversation
} from '../services/localStorage';
import { LLMModel } from '../types';

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
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
  
  const { getActivePrompt } = usePromptContext();
  const { activeSceneId } = useSceneContext();

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
        content: aiResponse.content,
        role: 'assistant',
        timestamp: Date.now()
      };
      
      // 更新消息列表
      const messagesWithResponse = [...updatedMessages, assistantMessage];
      setMessages(messagesWithResponse);
      
      // 更新对话
      const conversationWithResponse: Conversation = {
        ...updatedConversation,
        messages: messagesWithResponse,
        updatedAt: Date.now()
      };
      
      updateConversation(conversationWithResponse);
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
        messages: messagesWithError,
        updatedAt: Date.now()
      };
      
      updateConversation(conversationWithError);
    } finally {
      setIsLoading(false);
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