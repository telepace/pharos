import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatWindow from '../components/Chat/ChatWindow';
import { ChatProvider, ChatContext } from '../contexts/ChatContext';

// 模拟 IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
}));
window.IntersectionObserver = mockIntersectionObserver;

// 模拟消息数据
const mockMessages = [
  { id: '1', role: 'user', content: '你好' },
  { id: '2', role: 'assistant', content: '你好！有什么我可以帮你的吗？' }
];

// 模拟 ChatContext 值
const mockChatContextValue = {
  messages: mockMessages,
  isLoading: false,
  isStreaming: false,
  observationIds: {},
  sendMessage: jest.fn(),
  clearMessages: jest.fn(),
  deleteMessage: jest.fn(),
  regenerateMessage: jest.fn(),
  stopGenerating: jest.fn(),
};

// 测试组件包装器
const renderChatWindow = (contextValue = mockChatContextValue) => {
  return render(
    <ChatContext.Provider value={contextValue}>
      <ChatWindow />
    </ChatContext.Provider>
  );
};

describe('ChatWindow Component', () => {
  it('应该正确渲染空消息状态', () => {
    renderChatWindow({
      ...mockChatContextValue,
      messages: []
    });
    
    expect(screen.getByText('暂无消息')).toBeInTheDocument();
  });

  it('应该正确渲染消息列表', () => {
    renderChatWindow();
    
    expect(screen.getByText('你好')).toBeInTheDocument();
    expect(screen.getByText('你好！有什么我可以帮你的吗？')).toBeInTheDocument();
  });

  it('应该在加载时显示加载状态', () => {
    renderChatWindow({
      ...mockChatContextValue,
      isLoading: true,
      isStreaming: false
    });
    
    expect(screen.getByText('AI正在思考...')).toBeInTheDocument();
  });

  it('不应在流式输出时显示加载状态', () => {
    renderChatWindow({
      ...mockChatContextValue,
      isLoading: true,
      isStreaming: true
    });
    
    expect(screen.queryByText('AI正在思考...')).not.toBeInTheDocument();
  });

  // 测试自动滚动功能
  it('应该在新消息到达时触发滚动', () => {
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = renderChatWindow();

    // 添加新消息
    const newMessages = [
      ...mockMessages,
      { id: '3', role: 'user', content: '新消息' }
    ];

    rerender(
      <ChatContext.Provider value={{
        ...mockChatContextValue,
        messages: newMessages
      }}>
        <ChatWindow />
      </ChatContext.Provider>
    );

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
}); 