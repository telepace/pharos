import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, message, Tabs } from 'antd';
import { AIProvider, LLMModel } from '../types';
import { testAIConnection } from '../services/aiService';

const { TabPane } = Tabs;
const { Option } = Select;

interface AISettingsProps {
  onSave: (settings: {
    provider: AIProvider;
    apiKey: string;
    baseUrl: string;
  }) => void;
}

const AISettings: React.FC<AISettingsProps> = ({ onSave }) => {
  const [activeProvider, setActiveProvider] = useState<AIProvider>(AIProvider.OPENAI);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [openaiSettings, setOpenaiSettings] = useState({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
    baseUrl: process.env.REACT_APP_OPENAI_BASE_URL || 'https://api.openai.com/v1'
  });
  
  const [claudeSettings, setClaudeSettings] = useState({
    apiKey: process.env.REACT_APP_CLAUDE_API_KEY || '',
    baseUrl: process.env.REACT_APP_CLAUDE_BASE_URL || 'https://api.anthropic.com'
  });
  
  const [geminiSettings, setGeminiSettings] = useState({
    apiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
    baseUrl: process.env.REACT_APP_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      let settings;
      
      switch (activeProvider) {
        case AIProvider.OPENAI:
          settings = { provider: AIProvider.OPENAI, ...openaiSettings };
          break;
        case AIProvider.CLAUDE:
          settings = { provider: AIProvider.CLAUDE, ...claudeSettings };
          break;
        case AIProvider.GEMINI:
          settings = { provider: AIProvider.GEMINI, ...geminiSettings };
          break;
        default:
          throw new Error(`不支持的AI提供商: ${activeProvider}`);
      }
      
      // 测试连接
      const isConnected = await testAIConnection(activeProvider);
      
      if (isConnected) {
        onSave(settings);
        message.success(`${activeProvider}配置已保存并连接成功`);
      } else {
        message.error(`无法连接到${activeProvider}，请检查API密钥和基础URL`);
      }
    } catch (error) {
      message.error(`保存设置时出错: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const isConnected = await testAIConnection(activeProvider);
      
      if (isConnected) {
        message.success(`成功连接到${activeProvider}`);
      } else {
        message.error(`无法连接到${activeProvider}，请检查API密钥和基础URL`);
      }
    } catch (error) {
      message.error(`测试连接时出错: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="AI设置" style={{ width: '100%' }}>
      <Tabs activeKey={activeProvider} onChange={(key) => setActiveProvider(key as AIProvider)}>
        <TabPane tab="OpenAI" key={AIProvider.OPENAI}>
          <Form layout="vertical">
            <Form.Item label="API密钥">
              <Input.Password
                value={openaiSettings.apiKey}
                onChange={(e) => setOpenaiSettings({ ...openaiSettings, apiKey: e.target.value })}
                placeholder="输入OpenAI API密钥"
              />
            </Form.Item>
            <Form.Item label="基础URL">
              <Input
                value={openaiSettings.baseUrl}
                onChange={(e) => setOpenaiSettings({ ...openaiSettings, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </Form.Item>
            <Form.Item label="可用模型">
              <Select disabled style={{ width: '100%' }} mode="multiple" defaultValue={[LLMModel.GPT35, LLMModel.GPT4]}>
                <Option value={LLMModel.GPT35}>GPT-3.5 Turbo</Option>
                <Option value={LLMModel.GPT4}>GPT-4</Option>
                <Option value={LLMModel.GPT4_TURBO}>GPT-4 Turbo</Option>
                <Option value={LLMModel.GPT4O}>GPT-4O</Option>
                <Option value={LLMModel.GPT4O_MINI}>GPT-4O Mini</Option>
                <Option value={LLMModel.GPT4O_MINI_CA}>GPT-4O Mini CA</Option>
                <Option value={LLMModel.O3_MINI}>O3 Mini</Option>
              </Select>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab="Claude" key={AIProvider.CLAUDE}>
          <Form layout="vertical">
            <Form.Item label="API密钥">
              <Input.Password
                value={claudeSettings.apiKey}
                onChange={(e) => setClaudeSettings({ ...claudeSettings, apiKey: e.target.value })}
                placeholder="输入Claude API密钥"
              />
            </Form.Item>
            <Form.Item label="基础URL">
              <Input
                value={claudeSettings.baseUrl}
                onChange={(e) => setClaudeSettings({ ...claudeSettings, baseUrl: e.target.value })}
                placeholder="https://api.anthropic.com"
              />
            </Form.Item>
            <Form.Item label="可用模型">
              <Select disabled style={{ width: '100%' }} mode="multiple" defaultValue={[LLMModel.CLAUDE3_SONNET]}>
                <Option value={LLMModel.CLAUDE3_OPUS}>Claude 3 Opus</Option>
                <Option value={LLMModel.CLAUDE3_SONNET}>Claude 3 Sonnet</Option>
                <Option value={LLMModel.CLAUDE3_HAIKU}>Claude 3 Haiku</Option>
                <Option value={LLMModel.CLAUDE_3_7_SONNET}>Claude 3.7 Sonnet</Option>
                <Option value={LLMModel.CLAUDE_3_5_HAIKU}>Claude 3.5 Haiku</Option>
              </Select>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab="Gemini" key={AIProvider.GEMINI}>
          <Form layout="vertical">
            <Form.Item label="API密钥">
              <Input.Password
                value={geminiSettings.apiKey}
                onChange={(e) => setGeminiSettings({ ...geminiSettings, apiKey: e.target.value })}
                placeholder="输入Gemini API密钥"
              />
            </Form.Item>
            <Form.Item label="基础URL">
              <Input
                value={geminiSettings.baseUrl}
                onChange={(e) => setGeminiSettings({ ...geminiSettings, baseUrl: e.target.value })}
                placeholder="https://generativelanguage.googleapis.com/v1beta"
              />
            </Form.Item>
            <Form.Item label="可用模型">
              <Select disabled style={{ width: '100%' }} mode="multiple" defaultValue={[LLMModel.GEMINI_PRO]}>
                <Option value={LLMModel.GEMINI_PRO}>Gemini Pro</Option>
                <Option value={LLMModel.GEMINI_PRO_VISION}>Gemini Pro Vision</Option>
                <Option value={LLMModel.GEMINI_2_FLASH}>Gemini 2.0 Flash</Option>
                <Option value={LLMModel.GEMINI_1_5_FLASH}>Gemini 1.5 Flash</Option>
              </Select>
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
      
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={handleTestConnection} loading={loading}>
          测试连接
        </Button>
        <Button type="primary" onClick={handleSave} loading={loading}>
          保存设置
        </Button>
      </div>
    </Card>
  );
};

export default AISettings; 