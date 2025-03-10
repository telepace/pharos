import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Message from '../components/Chat/Message';
import { ChatContext } from '../contexts/ChatContext';

// 模拟消息数据
const mockUserMessage = {
  id: '1',
  role: 'user',
  content: '你好',
  timestamp: new Date().toISOString()
};

const mockAssistantMessage = {
  id: '2',
  role: 'assistant',
  content: '你好！这是一个[测试链接](https://example.com)。',
  timestamp: new Date().toISOString()
};

// 模拟 ChatContext 值
const mockChatContextValue = {
  isStreaming: false,
  streamingMessageId: null,
  currentConversation: {
    id: 'conv1',
    title: '测试对话'
  },
  sendMessage: jest.fn(),
  clearMessages: jest.fn(),
  deleteMessage: jest.fn(),
  regenerateMessage: jest.fn(),
  stopGenerating: jest.fn(),
  messages: []
};

// 测试组件包装器
const renderMessage = (message, observationId = undefined, contextValue = mockChatContextValue) => {
  return render(
    <ChatContext.Provider value={contextValue}>
      <Message message={message} observationId={observationId} />
    </ChatContext.Provider>
  );
};

describe('Message Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('应该正确渲染用户消息', () => {
    renderMessage(mockUserMessage);
    
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /user/i })).toBeInTheDocument();
  });

  it('应该正确渲染AI助手消息', () => {
    renderMessage(mockAssistantMessage, 'obs1');
    
    expect(screen.getByText(/你好！/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /robot/i })).toBeInTheDocument();
  });

  it('应该在流式输出时显示打字光标', () => {
    renderMessage(mockAssistantMessage, 'obs1', {
      ...mockChatContextValue,
      isStreaming: true,
      streamingMessageId: '2'
    });
    
    expect(document.querySelector('.typing-cursor')).toBeInTheDocument();
  });

  it('应该正确渲染Markdown内容', () => {
    renderMessage(mockAssistantMessage, 'obs1');
    
    const link = screen.getByText('测试链接');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('应该显示时间戳', () => {
    const message = {
      ...mockUserMessage,
      timestamp: new Date('2024-03-10T12:00:00').toISOString()
    };
    renderMessage(message);
    
    expect(screen.getByText('12:00:00')).toBeInTheDocument();
  });

  it('应该为AI消息显示语音播放按钮', () => {
    renderMessage(mockAssistantMessage, 'obs1');
    
    // 假设VoicePlayer组件渲染了一个带有特定aria-label的按钮
    expect(screen.getByRole('button', { name: /播放/i })).toBeInTheDocument();
  });

  it('应该为AI消息显示反馈按钮', () => {
    renderMessage(mockAssistantMessage, 'obs1');
    
    // 假设FeedbackButtons组件渲染了点赞和点踩按钮
    expect(screen.getByRole('button', { name: /赞/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /踩/i })).toBeInTheDocument();
  });

  it('不应在流式输出时显示反馈按钮', () => {
    renderMessage(mockAssistantMessage, 'obs1', {
      ...mockChatContextValue,
      isStreaming: true,
      streamingMessageId: '2'
    });
    
    expect(screen.queryByRole('button', { name: /赞/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /踩/i })).not.toBeInTheDocument();
  });
}); 