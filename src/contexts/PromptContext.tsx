import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Prompt, LLMModel } from '../types';
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
  addPrompt: (name: string, content: string, model: LLMModel, sceneId: string) => void;
  updatePrompt: (id: string, name: string, content: string, model: LLMModel) => void;
  deletePrompt: (id: string) => void;
  setActivePrompt: (id: string | null) => void;
  getActivePrompt: () => Prompt | null;
  getPromptsForActiveScene: () => Prompt[];
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
    const storedPrompts = getPrompts();
    if (storedPrompts.length === 0) {
      // 如果没有提示，创建一些默认提示
      const defaultPrompts: Prompt[] = [];
      setPrompts(defaultPrompts);
      savePrompts(defaultPrompts);
    } else {
      setPrompts(storedPrompts);
    }
  }, []);

  // 当场景变化时，重置活动提示
  useEffect(() => {
    setActivePromptId(null);
  }, [activeSceneId]);

  const addPrompt = (name: string, content: string, model: LLMModel, sceneId: string) => {
    const newPrompt: Prompt = {
      id: uuidv4(),
      sceneId,
      name,
      content,
      model
    };
    
    const updatedPrompts = [...prompts, newPrompt];
    setPrompts(updatedPrompts);
    addPromptToStorage(newPrompt);
  };

  const updatePrompt = (id: string, name: string, content: string, model: LLMModel) => {
    const promptToUpdate = prompts.find(p => p.id === id);
    if (!promptToUpdate) return;

    const updatedPrompt: Prompt = {
      ...promptToUpdate,
      name,
      content,
      model
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
    return prompts.filter(prompt => prompt.sceneId === activeSceneId);
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
        getPromptsForActiveScene
      }}
    >
      {children}
    </PromptContext.Provider>
  );
}; 