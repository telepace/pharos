import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LLMModel, PromptType } from '../types';

// 设置类型定义
interface Settings {
  defaultModel: LLMModel;
  globalPrompt: string;
  useGlobalPrompt: boolean;
  globalPromptType: PromptType;
  theme: 'light' | 'dark';
}

// 默认设置
const defaultSettings: Settings = {
  defaultModel: LLMModel.OPENROUTER_DEEPSEEK_V3,
  globalPrompt: '',
  useGlobalPrompt: false,
  globalPromptType: PromptType.SYSTEM,
  theme: 'light'
};

// 设置上下文类型
interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

// 创建上下文
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// 自定义Hook，用于在组件中访问设置上下文
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// 从localStorage获取设置
const getSettingsFromStorage = (): Settings => {
  const settingsStr = localStorage.getItem('settings');
  if (!settingsStr) return defaultSettings;
  
  try {
    const storedSettings = JSON.parse(settingsStr);
    return { ...defaultSettings, ...storedSettings };
  } catch (error) {
    console.error('Failed to parse settings from localStorage:', error);
    return defaultSettings;
  }
};

// 保存设置到localStorage
const saveSettingsToStorage = (settings: Settings): void => {
  localStorage.setItem('settings', JSON.stringify(settings));
};

// 设置提供者组件
interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(getSettingsFromStorage);

  // 当设置变化时保存到localStorage
  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  // 更新设置
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings
    }));
  };

  // 重置设置为默认值
  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 