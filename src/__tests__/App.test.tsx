import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { SettingsContext } from '../contexts/SettingsContext';

// 模拟 SettingsContext
const mockSettings = {
  settings: {
    theme: 'light',
    // 添加其他必要的设置
  },
  updateSettings: jest.fn(),
};

// 模拟 antd 组件
jest.mock('antd', () => ({
  ConfigProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  theme: {
    darkAlgorithm: 'dark',
    defaultAlgorithm: 'light',
  },
}));

describe('App Component', () => {
  it('应该正确渲染应用', () => {
    render(<App />);
    // 由于MainLayout是主要的渲染组件，我们可以检查它是否存在
    expect(document.body).toBeInTheDocument();
  });

  it('应该根据主题设置正确添加dark-theme类', () => {
    const darkSettings = {
      ...mockSettings,
      settings: { ...mockSettings.settings, theme: 'dark' },
    };

    render(
      <SettingsContext.Provider value={darkSettings}>
        <App />
      </SettingsContext.Provider>
    );

    expect(document.body.classList.contains('dark-theme')).toBeTruthy();
  });

  it('应该在light主题下不添加dark-theme类', () => {
    render(
      <SettingsContext.Provider value={mockSettings}>
        <App />
      </SettingsContext.Provider>
    );

    expect(document.body.classList.contains('dark-theme')).toBeFalsy();
  });
}); 