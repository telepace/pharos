import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Scene } from '../types';
import { getScenes, saveScenes, addScene as addSceneToStorage, deleteScene as deleteSceneFromStorage } from '../services/localStorage';

interface SceneContextType {
  scenes: Scene[];
  activeSceneId: string | null;
  addScene: (name: string) => void;
  updateScene: (id: string, name: string) => void;
  deleteScene: (id: string) => void;
  setActiveScene: (id: string | null) => void;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

export const useSceneContext = () => {
  const context = useContext(SceneContext);
  if (context === undefined) {
    throw new Error('useSceneContext must be used within a SceneProvider');
  }
  return context;
};

interface SceneProviderProps {
  children: ReactNode;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({ children }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  // 初始化场景数据
  useEffect(() => {
    const storedScenes = getScenes();
    if (storedScenes.length === 0) {
      // 如果没有场景，创建默认场景
      const defaultScenes: Scene[] = [
        { id: uuidv4(), name: '通用对话' },
        { id: uuidv4(), name: '写作助手' },
        { id: uuidv4(), name: '代码调试' }
      ];
      setScenes(defaultScenes);
      saveScenes(defaultScenes);
      setActiveSceneId(defaultScenes[0].id);
    } else {
      setScenes(storedScenes);
      setActiveSceneId(storedScenes[0].id);
    }
  }, []);

  const addScene = (name: string) => {
    const newScene: Scene = {
      id: uuidv4(),
      name
    };
    
    const updatedScenes = [...scenes, newScene];
    setScenes(updatedScenes);
    addSceneToStorage(newScene);
    
    // 如果是第一个场景，自动设为活动场景
    if (scenes.length === 0) {
      setActiveSceneId(newScene.id);
    }
  };

  const updateScene = (id: string, name: string) => {
    const updatedScenes = scenes.map(scene => 
      scene.id === id ? { ...scene, name } : scene
    );
    setScenes(updatedScenes);
    saveScenes(updatedScenes);
  };

  const deleteScene = (id: string) => {
    const updatedScenes = scenes.filter(scene => scene.id !== id);
    setScenes(updatedScenes);
    deleteSceneFromStorage(id);
    
    // 如果删除的是当前活动场景，重置活动场景
    if (activeSceneId === id) {
      setActiveSceneId(updatedScenes.length > 0 ? updatedScenes[0].id : null);
    }
  };

  const setActiveScene = (id: string | null) => {
    setActiveSceneId(id);
  };

  return (
    <SceneContext.Provider
      value={{
        scenes,
        activeSceneId,
        addScene,
        updateScene,
        deleteScene,
        setActiveScene
      }}
    >
      {children}
    </SceneContext.Provider>
  );
}; 