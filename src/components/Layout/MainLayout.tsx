import React, { useState } from 'react';
import { Layout, Typography } from 'antd';
import { ResizeBox } from 'react-resizable-layout';
import ChatWindow from '../Chat/ChatWindow';
import SceneSelector from '../Prompt/SceneSelector';
import PromptList from '../Prompt/PromptList';
import ConversationList from '../Chat/ConversationList';
import './MainLayout.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  // 保存左侧边栏和中间内容区的宽度
  const [leftSiderWidth, setLeftSiderWidth] = useState(250);
  const [contentSplitPosition, setContentSplitPosition] = useState(0.5);
  
  // 计算右侧区域宽度
  const handleContentResize = (position: number) => {
    setContentSplitPosition(position);
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={3} style={{ margin: '16px 0' }}>Pharos - Prompt管理与AI对话</Title>
      </Header>
      <Layout>
        {/* 左侧可调节边栏 */}
        <ResizeBox
          style={{
            width: leftSiderWidth,
            height: 'calc(100vh - 64px)',
            background: '#fff',
            borderRight: '1px solid #f0f0f0'
          }}
          handlePosition="right"
          handleStyles={{
            width: '4px',
            background: '#f0f0f0',
            cursor: 'col-resize',
            '&:hover': {
              background: '#1890ff'
            }
          }}
          minWidth={200}
          maxWidth={400}
          onResize={(width) => setLeftSiderWidth(width)}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            padding: '16px' 
          }}>
            <ConversationList />
          </div>
        </ResizeBox>

        {/* 主内容区域 */}
        <Content style={{ 
          height: 'calc(100vh - 64px)', 
          overflow: 'hidden',
          display: 'flex'
        }}>
          {/* 聊天窗口和提示列表的可调节分隔 */}
          <ResizeBox
            style={{
              flex: 1,
              display: 'flex',
              background: '#fff'
            }}
            handlePosition="right"
            handleStyles={{
              width: '4px',
              background: '#f0f0f0',
              cursor: 'col-resize',
              '&:hover': {
                background: '#1890ff'
              }
            }}
            minWidth="30%"
            maxWidth="70%"
            defaultSize={contentSplitPosition}
            onResize={handleContentResize}
          >
            {/* 聊天窗口 */}
            <div style={{ 
              flex: 1,
              padding: '24px',
              height: '100%',
              overflow: 'hidden'
            }}>
              <ChatWindow />
            </div>

            {/* 右侧提示区域 */}
            <div style={{ 
              width: `${(1 - contentSplitPosition) * 100}%`,
              background: '#fff',
              padding: '24px',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <SceneSelector />
              <div style={{ flex: 1, overflow: 'auto' }}>
                <PromptList />
              </div>
            </div>
          </ResizeBox>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 