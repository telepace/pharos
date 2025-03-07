import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Prompt, LLMModel, PromptType } from '../types';
import { 
  getPrompts, 
  savePrompts, 
  addPrompt as addPromptToStorage,
  deletePrompt as deletePromptFromStorage,
  getPromptsBySceneId
} from '../services/localStorage';
import { useSceneContext } from './SceneContext';

interface PromptContextType {
  prompts: Prompt[];
  activePromptId: string | null;
  addPrompt: (name: string, content: string, model: LLMModel, sceneId: string, type: PromptType) => Prompt;
  updatePrompt: (id: string, name: string, content: string, model: LLMModel, type: PromptType) => void;
  deletePrompt: (id: string) => void;
  setActivePrompt: (id: string | null) => void;
  getActivePrompt: () => Prompt | null;
  getPromptsForActiveScene: () => Prompt[];
  removePromptFromScene: (id: string) => void;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const usePromptContext = () => {
  const context = useContext(PromptContext);
  if (context === undefined) {
    throw new Error('usePromptContext must be used within a PromptProvider');
  }
  return context;
};

interface PromptProviderProps {
  children: ReactNode;
}

export const PromptProvider: React.FC<PromptProviderProps> = ({ children }) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const { activeSceneId } = useSceneContext();

  // 初始化提示数据
  useEffect(() => {
    console.log('初始化提示数据');
    const storedPrompts = getPrompts();
    console.log('从localStorage获取的提示:', storedPrompts);
    setPrompts(storedPrompts);
  }, []);

  // 当场景变化时，重置活动提示并重新获取提示
  useEffect(() => {
    console.log('场景变化, 新场景ID:', activeSceneId);
    setActivePromptId(null);
    
    // 确保提示列表是最新的
    const storedPrompts = getPrompts();
    console.log('场景变化时从localStorage获取的提示:', storedPrompts);
    setPrompts(storedPrompts);
  }, [activeSceneId]);

  const addPrompt = (name: string, content: string, model: LLMModel, sceneId: string, type: PromptType = PromptType.SYSTEM) => {
    const newPrompt: Prompt = {
      id: uuidv4(),
      sceneId,
      name,
      content,
      model,
      type
    };
    
    console.log('添加新提示:', newPrompt);
    console.log('当前场景ID:', sceneId);
    
    // 直接更新状态
    const updatedPrompts = [...prompts, newPrompt];
    setPrompts(updatedPrompts);
    
    // 保存到localStorage
    savePrompts(updatedPrompts);
    
    // 设置新添加的提示为活动提示
    setActivePromptId(newPrompt.id);
    
    console.log('添加后的提示列表:', updatedPrompts);
    console.log('添加后的活动提示ID:', newPrompt.id);
    
    // 确保localStorage中的数据已更新
    const storedPrompts = getPrompts();
    console.log('添加后从localStorage获取的提示:', storedPrompts);
    
    return newPrompt;
  };

  const updatePrompt = (id: string, name: string, content: string, model: LLMModel, type: PromptType) => {
    const promptToUpdate = prompts.find(p => p.id === id);
    if (!promptToUpdate) return;

    const updatedPrompt: Prompt = {
      ...promptToUpdate,
      name,
      content,
      model,
      type
    };
    
    const updatedPrompts = prompts.map(prompt => 
      prompt.id === id ? updatedPrompt : prompt
    );
    
    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  const deletePrompt = (id: string) => {
    const updatedPrompts = prompts.filter(prompt => prompt.id !== id);
    setPrompts(updatedPrompts);
    deletePromptFromStorage(id);
    
    // 如果删除的是当前活动提示，重置活动提示
    if (activePromptId === id) {
      setActivePromptId(null);
    }
  };

  const setActivePrompt = (id: string | null) => {
    setActivePromptId(id);
  };

  const getActivePrompt = (): Prompt | null => {
    if (!activePromptId) return null;
    return prompts.find(prompt => prompt.id === activePromptId) || null;
  };

  const getPromptsForActiveScene = (): Prompt[] => {
    if (!activeSceneId) return [];
    
    console.log('获取当前场景的提示，场景ID:', activeSceneId);
    console.log('当前内存中的所有提示:', prompts);
    
    // 从内存中获取提示，确保数据同步
    const filteredPrompts = prompts.filter(prompt => prompt.sceneId === activeSceneId);
    console.log('过滤后的提示列表:', filteredPrompts);
    
    return filteredPrompts;
  };

  // 从场景中移除提示（但不删除提示）
  const removePromptFromScene = (id: string) => {
    const promptToRemove = prompts.find(p => p.id === id);
    if (!promptToRemove) return;

    // 将提示的sceneId设为空字符串，表示不属于任何场景
    const updatedPrompt: Prompt = {
      ...promptToRemove,
      sceneId: ''
    };
    
    const updatedPrompts = prompts.map(prompt => 
      prompt.id === id ? updatedPrompt : prompt
    );
    
    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
    
    // 如果移除的是当前活动提示，重置活动提示
    if (activePromptId === id) {
      setActivePromptId(null);
    }
  };

  return (
    <PromptContext.Provider
      value={{
        prompts,
        activePromptId,
        addPrompt,
        updatePrompt,
        deletePrompt,
        setActivePrompt,
        getActivePrompt,
        getPromptsForActiveScene,
        removePromptFromScene
      }}
    >
      {children}
    </PromptContext.Provider>
  );
}; 