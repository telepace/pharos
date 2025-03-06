import React from 'react';
import { Layout, Typography } from 'antd';
import ChatWindow from '../Chat/ChatWindow';
import SceneSelector from '../Prompt/SceneSelector';
import PromptList from '../Prompt/PromptList';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={3} style={{ margin: '16px 0' }}>Pharos - Prompt管理与AI对话</Title>
      </Header>
      <Layout>
        <Content style={{ padding: '24px', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          <Layout style={{ background: '#fff', height: '100%', overflow: 'hidden' }}>
            <Content style={{ padding: '0 24px 24px', width: '50%', height: '100%' }}>
              <ChatWindow />
            </Content>
            <Sider 
              width="50%" 
              style={{ 
                background: '#fff', 
                padding: '0 24px 24px',
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <SceneSelector />
              <div style={{ flex: 1, overflow: 'auto' }}>
                <PromptList />
              </div>
            </Sider>
          </Layout>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 