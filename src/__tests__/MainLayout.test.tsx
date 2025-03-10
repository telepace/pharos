import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainLayout from '../components/Layout/MainLayout';
import { SceneProvider } from '../contexts/SceneContext';
import { PromptProvider } from '../contexts/PromptContext';
import { ChatProvider } from '../contexts/ChatContext';
import { SettingsProvider } from '../contexts/SettingsContext';

// 模拟 localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// 模拟 window.innerWidth 和 window.innerHeight
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1920,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  value: 1080,
});

// 包装组件以提供所需的上下文
const MainLayoutWrapper = () => (
  <SettingsProvider>
    <SceneProvider>
      <PromptProvider>
        <ChatProvider>
          <MainLayout />
        </ChatProvider>
      </PromptProvider>
    </SceneProvider>
  </SettingsProvider>
);

describe('MainLayout Component', () => {
  beforeEach(() => {
    // 清除所有模拟调用的历史
    jest.clearAllMocks();
    // 设置默认的 localStorage 返回值
    mockLocalStorage.getItem.mockImplementation((key) => {
      const defaults = {
        leftSiderWidth: '250',
        contentWidth: '768',
        rightSiderWidth: '300',
      };
      return defaults[key] || null;
    });
  });

  it('应该正确渲染主布局', () => {
    render(<MainLayoutWrapper />);
    
    // 检查标题是否存在
    expect(screen.getByText('Pharos - AI指令管理')).toBeInTheDocument();
    // 检查设置按钮是否存在
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('应该能够切换到设置页面', () => {
    render(<MainLayoutWrapper />);
    
    // 点击设置按钮
    const settingsButton = screen.getByText('设置');
    fireEvent.click(settingsButton);
    
    // 验证设置页面是否显示
    expect(screen.getByRole('button', { name: /设置/i })).toHaveClass('ant-btn-primary');
  });

  it('应该从localStorage加载保存的宽度', () => {
    render(<MainLayoutWrapper />);
    
    // 验证是否从localStorage获取了宽度值
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('leftSiderWidth');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('contentWidth');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('rightSiderWidth');
  });

  it('应该在宽度变化时保存到localStorage', () => {
    render(<MainLayoutWrapper />);
    
    // 触发 resize 事件
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);
    
    // 验证是否保存了宽度值
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });
}); 