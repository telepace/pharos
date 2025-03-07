import React, { useState, useEffect } from 'react';
import { Layout, Typography } from 'antd';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import ChatWindow from '../Chat/ChatWindow';
import SceneSelector from '../Prompt/SceneSelector';
import PromptList from '../Prompt/PromptList';
import ConversationList from '../Chat/ConversationList';
import './MainLayout.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  // 从 localStorage 读取保存的宽度，如果没有则使用默认值
  const [leftSiderWidth, setLeftSiderWidth] = useState(() => {
    const saved = localStorage.getItem('leftSiderWidth');
    return saved ? parseInt(saved) : 250;
  });
  
  const [contentWidth, setContentWidth] = useState(() => {
    const saved = localStorage.getItem('contentWidth');
    return saved ? parseInt(saved) : window.innerWidth * 0.4;
  });
  
  const [rightSiderWidth, setRightSiderWidth] = useState(() => {
    const saved = localStorage.getItem('rightSiderWidth');
    return saved ? parseInt(saved) : 300;
  });

  // 保存宽度到 localStorage
  const saveWidths = () => {
    localStorage.setItem('leftSiderWidth', leftSiderWidth.toString());
    localStorage.setItem('contentWidth', contentWidth.toString());
    localStorage.setItem('rightSiderWidth', rightSiderWidth.toString());
  };

  // 当宽度变化时保存
  useEffect(() => {
    saveWidths();
  }, [leftSiderWidth, contentWidth, rightSiderWidth]);

  const onLeftSiderResize = (e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setLeftSiderWidth(size.width);
  };

  const onContentResize = (e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setContentWidth(size.width);
  };

  const onRightSiderResize = (e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
    setRightSiderWidth(size.width);
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={3} style={{ margin: '16px 0' }}>Pharos - Prompt管理与AI对话</Title>
      </Header>
      <Layout>
        {/* 左侧可调节边栏 */}
        <Resizable
          width={leftSiderWidth}
          height={window.innerHeight - 64} // 减去header高度
          onResize={onLeftSiderResize}
          minConstraints={[200, window.innerHeight - 64]}
          maxConstraints={[400, window.innerHeight - 64]}
          handle={<div className="custom-handle custom-handle-e" />}
          axis="x"
          resizeHandles={['e']}
        >
          <Sider 
            width={leftSiderWidth}
            style={{ 
              background: '#fff',
              height: 'calc(100vh - 64px)',
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%', 
              padding: '16px' 
            }}>
              <ConversationList />
            </div>
          </Sider>
        </Resizable>

        {/* 主内容区域 */}
        <Layout style={{ position: 'relative' }}>
          <Resizable
            width={contentWidth}
            height={window.innerHeight - 64}
            onResize={onContentResize}
            minConstraints={[window.innerWidth * 0.3, window.innerHeight - 64]}
            maxConstraints={[window.innerWidth * 0.7, window.innerHeight - 64]}
            handle={<div className="custom-handle custom-handle-e" />}
            axis="x"
            resizeHandles={['e']}
          >
            <Content style={{ 
              padding: '24px',
              height: 'calc(100vh - 64px)',
              overflow: 'hidden',
              background: '#fff'
            }}>
              <ChatWindow />
            </Content>
          </Resizable>

          {/* 右侧提示区域 - 添加可调整大小功能 */}
          <Resizable
            width={rightSiderWidth}
            height={window.innerHeight - 64}
            onResize={onRightSiderResize}
            minConstraints={[250, window.innerHeight - 64]}
            maxConstraints={[500, window.innerHeight - 64]}
            handle={<div className="custom-handle custom-handle-w" />}
            axis="x"
            resizeHandles={['w']}
          >
            <Sider 
              width={rightSiderWidth}
              style={{ 
                background: '#fff', 
                padding: '24px 24px 0 24px',
                height: 'calc(100vh - 64px)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <SceneSelector />
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100% - 70px)'
              }}>
                <PromptList />
              </div>
            </Sider>
          </Resizable>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 