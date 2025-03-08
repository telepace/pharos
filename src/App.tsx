import React, { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { SceneProvider } from './contexts/SceneContext';
import { PromptProvider } from './contexts/PromptContext';
import { ChatProvider } from './contexts/ChatContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useSettings } from './contexts/SettingsContext';
import MainLayout from './components/Layout/MainLayout';
import './styles.css';

// 主题提供者组件
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  
  // 当主题变化时更新body类
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [settings.theme]);
  
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: settings.theme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <SceneProvider>
          <PromptProvider>
            <ChatProvider>
              <MainLayout />
            </ChatProvider>
          </PromptProvider>
        </SceneProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default App; 