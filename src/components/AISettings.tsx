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
  
  const [deepseekSettings, setDeepseekSettings] = useState({
    apiKey: process.env.REACT_APP_DEEPSEEK_API_KEY || '',
    baseUrl: process.env.REACT_APP_DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  });
  
  const [huoshanSettings, setHuoshanSettings] = useState({
    apiKey: process.env.REACT_APP_HUOSHAN_API_KEY || '',
    baseUrl: process.env.REACT_APP_HUOSHAN_BASE_URL || 'https://api.deepseek.com'
  });
  
  const [qwenSettings, setQwenSettings] = useState({
    apiKey: process.env.REACT_APP_QWEN_API_KEY || '',
    baseUrl: process.env.REACT_APP_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  });
  
  const [openrouterSettings, setOpenrouterSettings] = useState({
    apiKey: process.env.REACT_APP_OPENROUTER_API_KEY || '',
    baseUrl: process.env.REACT_APP_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    siteUrl: process.env.REACT_APP_OPENROUTER_SITE_URL || '',
    siteName: process.env.REACT_APP_OPENROUTER_SITE_NAME || '',
    models: process.env.REACT_APP_OPENROUTER_MODELS || ''
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
        case AIProvider.DEEPSEEK:
          settings = { provider: AIProvider.DEEPSEEK, ...deepseekSettings };
          break;
        case AIProvider.HUOSHAN:
          settings = { provider: AIProvider.HUOSHAN, ...huoshanSettings };
          break;
        case AIProvider.QWEN:
          settings = { provider: AIProvider.QWEN, ...qwenSettings };
          break;
        case AIProvider.OPENROUTER:
          settings = { provider: AIProvider.OPENROUTER, 
                       apiKey: openrouterSettings.apiKey, 
                       baseUrl: openrouterSettings.baseUrl };
          // 保存附加设置到localStorage或其他持久化存储
          localStorage.setItem('openrouter_site_url', openrouterSettings.siteUrl);
          localStorage.setItem('openrouter_site_name', openrouterSettings.siteName);
          localStorage.setItem('openrouter_models', openrouterSettings.models);
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
        
        <TabPane tab="DeepSeek" key={AIProvider.DEEPSEEK}>
          <Form layout="vertical">
            <Form.Item label="API密钥">
              <Input.Password
                value={deepseekSettings.apiKey}
                onChange={(e) => setDeepseekSettings({ ...deepseekSettings, apiKey: e.target.value })}
                placeholder="输入DeepSeek API密钥"
              />
            </Form.Item>
            <Form.Item label="基础URL">
              <Input
                value={deepseekSettings.baseUrl}
                onChange={(e) => setDeepseekSettings({ ...deepseekSettings, baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com"
              />
            </Form.Item>
            <Form.Item label="可用模型">
              <Select disabled style={{ width: '100%' }} mode="multiple" defaultValue={[LLMModel.DEEPSEEK_REASONER, LLMModel.DEEPSEEK_CHAT]}>
                <Option value={LLMModel.DEEPSEEK_REASONER}>DeepSeek Reasoner</Option>
                <Option value={LLMModel.DEEPSEEK_CHAT}>DeepSeek Chat</Option>
              </Select>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab="Huoshan" key={AIProvider.HUOSHAN}>
          <Form layout="vertical">
            <Form.Item label="API密钥">
              <Input.Password
                value={huoshanSettings.apiKey}
                onChange={(e) => setHuoshanSettings({ ...huoshanSettings, apiKey: e.target.value })}
                placeholder="输入Huoshan API密钥"
              />
            </Form.Item>
            <Form.Item label="基础URL">
              <Input
                value={huoshanSettings.baseUrl}
                onChange={(e) => setHuoshanSettings({ ...huoshanSettings, baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com"
              />
            </Form.Item>
            <Form.Item label="可用模型">
              <Select disabled style={{ width: '100%' }} mode="multiple" 
                      defaultValue={[LLMModel.HUOSHAN_DEEPSEEK_R1, LLMModel.HUOSHAN_DEEPSEEK_V3]}>
                <Option value={LLMModel.HUOSHAN_DEEPSEEK_R1}>DeepSeek R1</Option>
                <Option value={LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_32B}>DeepSeek R1 Qwen 32B</Option>
                <Option value={LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_7B}>DeepSeek R1 Qwen 7B</Option>
                <Option value={LLMModel.HUOSHAN_DEEPSEEK_V3}>DeepSeek V3</Option>
              </Select>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab="Qwen" key={AIProvider.QWEN}>
          <Form layout="vertical">
            <Form.Item label="API密钥">
              <Input.Password
                value={qwenSettings.apiKey}
                onChange={(e) => setQwenSettings({ ...qwenSettings, apiKey: e.target.value })}
                placeholder="输入Qwen API密钥"
              />
            </Form.Item>
            <Form.Item label="基础URL">
              <Input
                value={qwenSettings.baseUrl}
                onChange={(e) => setQwenSettings({ ...qwenSettings, baseUrl: e.target.value })}
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
              />
            </Form.Item>
            <Form.Item label="可用模型">
              <Select disabled style={{ width: '100%' }} mode="multiple" 
                      defaultValue={[LLMModel.QWEN_PLUS, LLMModel.QWEN_MAX]}>
                <Option value={LLMModel.QWEN_PLUS}>Qwen Plus</Option>
                <Option value={LLMModel.QWEN_PLUS_LATEST}>Qwen Plus Latest</Option>
                <Option value={LLMModel.QWEN_MAX}>Qwen Max</Option>
                <Option value={LLMModel.QWQ_PLUS}>QWQ Plus</Option>
              </Select>
            </Form.Item>
          </Form>
        </TabPane>
        
        <TabPane tab="OpenRouter" key={AIProvider.OPENROUTER}>
          <Form layout="vertical">
            <Form.Item label="API密钥">
              <Input.Password
                value={openrouterSettings.apiKey}
                onChange={(e) => setOpenrouterSettings({ ...openrouterSettings, apiKey: e.target.value })}
                placeholder="输入OpenRouter API密钥"
              />
            </Form.Item>
            <Form.Item label="基础URL">
              <Input
                value={openrouterSettings.baseUrl}
                onChange={(e) => setOpenrouterSettings({ ...openrouterSettings, baseUrl: e.target.value })}
                placeholder="https://openrouter.ai/api/v1"
              />
            </Form.Item>
            <Form.Item label="站点URL (可选)">
              <Input
                value={openrouterSettings.siteUrl}
                onChange={(e) => setOpenrouterSettings({ ...openrouterSettings, siteUrl: e.target.value })}
                placeholder="您的网站URL，用于OpenRouter排名"
              />
            </Form.Item>
            <Form.Item label="站点名称 (可选)">
              <Input
                value={openrouterSettings.siteName}
                onChange={(e) => setOpenrouterSettings({ ...openrouterSettings, siteName: e.target.value })}
                placeholder="您的网站名称，用于OpenRouter排名"
              />
            </Form.Item>
            <Form.Item label="额外模型 (以逗号分隔)">
              <Input
                value={openrouterSettings.models}
                onChange={(e) => setOpenrouterSettings({ ...openrouterSettings, models: e.target.value })}
                placeholder="例如: anthropic/claude-3-haiku,meta-llama/llama-3-8b-instruct,google/gemini-2.0-flash-001"
              />
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