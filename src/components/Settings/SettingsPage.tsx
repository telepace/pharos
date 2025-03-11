import React, { useState } from 'react';
import { Card, Form, Select, Input, Switch, Button, Typography, Divider, Radio, Space, message, Tabs } from 'antd';
import { SaveOutlined, UndoOutlined, ArrowLeftOutlined, DashboardOutlined, SettingOutlined } from '@ant-design/icons';
import { useSettings } from '../../contexts/SettingsContext';
import { PromptType } from '../../types';
import { getAvailableModels } from '../../services/aiService';
import MonitoringDashboard from '../Monitoring/MonitoringDashboard';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface SettingsPageProps {
  onBack?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [form] = Form.useForm();
  const availableModels = getAvailableModels();
  const [activeTab, setActiveTab] = useState('settings');

  // 初始化表单值
  React.useEffect(() => {
    form.setFieldsValue({
      defaultModel: settings.defaultModel,
      useGlobalPrompt: settings.useGlobalPrompt,
      globalPrompt: settings.globalPrompt,
      globalPromptType: settings.globalPromptType,
      theme: settings.theme
    });
  }, [settings, form]);

  // 保存设置
  const handleSave = (values: any) => {
    updateSettings({
      defaultModel: values.defaultModel,
      useGlobalPrompt: values.useGlobalPrompt,
      globalPrompt: values.globalPrompt,
      globalPromptType: values.globalPromptType,
      theme: values.theme
    });
    message.success('设置已保存');
    if (onBack) {
      onBack();
    }
  };

  // 重置设置
  const handleReset = () => {
    resetSettings();
    message.info('设置已重置为默认值');
  };

  // 渲染设置表单
  const renderSettingsForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
      initialValues={settings}
      style={{ marginTop: '24px' }}
    >
      <Card title="大模型设置" style={{ marginBottom: '24px' }}>
        <Form.Item
          name="defaultModel"
          label="默认大模型"
          rules={[{ required: true, message: '请选择默认大模型' }]}
        >
          <Select placeholder="选择默认使用的大模型">
            {availableModels.map(({ model, provider }) => (
              <Option key={model} value={model}>
                {model} ({provider})
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Text type="secondary">
          此设置将作为全局默认大模型，当没有为特定提示选择模型时使用
        </Text>
      </Card>

      <Card title="全局提示设置" style={{ marginBottom: '24px' }}>
        <Form.Item
          name="useGlobalPrompt"
          valuePropName="checked"
          label="启用全局通用Prompt"
        >
          <Switch />
        </Form.Item>
        
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.useGlobalPrompt !== currentValues.useGlobalPrompt
          }
        >
          {({ getFieldValue }) => 
            getFieldValue('useGlobalPrompt') ? (
              <>
                <Form.Item
                  name="globalPromptType"
                  label="全局Prompt类型"
                >
                  <Radio.Group>
                    <Radio value={PromptType.SYSTEM}>System Prompt</Radio>
                    <Radio value={PromptType.DIRECT}>Direct Prompt</Radio>
                  </Radio.Group>
                </Form.Item>
                
                <Form.Item
                  name="globalPrompt"
                  label="全局通用Prompt内容"
                >
                  <TextArea 
                    rows={6} 
                    placeholder="输入全局通用的Prompt内容，将与每个对话的特定Prompt组合使用"
                  />
                </Form.Item>
                
                <Text type="secondary">
                  全局Prompt将与每个对话的特定Prompt组合使用。如果选择System Prompt类型，
                  它将与对话特定的System Prompt组合；如果选择Direct Prompt类型，它将直接作为用户输入。
                </Text>
              </>
            ) : null
          }
        </Form.Item>
      </Card>

      <Card title="界面设置" style={{ marginBottom: '24px' }}>
        <Form.Item
          name="theme"
          label="主题"
        >
          <Radio.Group>
            <Radio value="light">浅色</Radio>
            <Radio value="dark">深色</Radio>
          </Radio.Group>
        </Form.Item>
      </Card>

      <Divider />
      
      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SaveOutlined />}
          >
            保存并返回
          </Button>
          <Button 
            onClick={handleReset} 
            icon={<UndoOutlined />}
          >
            重置为默认
          </Button>
          {onBack && (
            <Button 
              onClick={onBack}
            >
              取消
            </Button>
          )}
        </Space>
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '1000px', 
      margin: '0 auto',
      height: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        {onBack && (
          <Button 
            icon={<ArrowLeftOutlined />} 
            style={{ marginRight: '16px' }}
            onClick={onBack}
          >
            返回
          </Button>
        )}
        <Title level={2} style={{ margin: 0 }}>设置与监控</Title>
      </div>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={{ marginBottom: '16px' }}
      >
        <TabPane 
          tab={<span><SettingOutlined />应用设置</span>} 
          key="settings"
        >
          <Text type="secondary">配置全局默认设置，这些设置将应用于所有新的对话</Text>
          {renderSettingsForm()}
        </TabPane>
        <TabPane 
          tab={<span><DashboardOutlined />监控仪表板</span>} 
          key="monitoring"
        >
          <MonitoringDashboard />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SettingsPage;