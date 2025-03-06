import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import { SceneProvider } from './contexts/SceneContext';
import { PromptProvider } from './contexts/PromptContext';
import { ChatProvider } from './contexts/ChatContext';
import MainLayout from './components/Layout/MainLayout';
import './styles.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <SceneProvider>
        <PromptProvider>
          <ChatProvider>
            <MainLayout />
          </ChatProvider>
        </PromptProvider>
      </SceneProvider>
    </ConfigProvider>
  );
};

export default App; 