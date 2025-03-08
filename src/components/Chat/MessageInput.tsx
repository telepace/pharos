import React, { useState } from 'react';
import { Input, Button, Space, Tag } from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';
import { usePromptContext } from '../../contexts/PromptContext';

const { TextArea } = Input;

const MessageInput: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const { sendMessage, clearMessages, isLoading, isStreaming } = useChatContext();
  const { getActivePrompt } = usePromptContext();
  
  const activePrompt = getActivePrompt();
  const isDisabled = isLoading || isStreaming;
  
  const handleSend = () => {
    if (inputValue.trim() && !isDisabled) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
      {activePrompt && (
        <div style={{ marginBottom: 8 }}>
          <Tag color="blue">
            使用提示: {activePrompt.name} ({activePrompt.model})
          </Tag>
        </div>
      )}
      <Space.Compact style={{ width: '100%' }}>
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "AI正在回复中..." : "输入消息..."}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ borderRadius: '4px 0 0 4px' }}
          disabled={isDisabled}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend}
          loading={isLoading}
          disabled={isStreaming}
          style={{ borderRadius: '0 4px 4px 0' }}
        >
          {isStreaming ? "生成中" : "发送"}
        </Button>
      </Space.Compact>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Button 
          type="text" 
          icon={<ClearOutlined />} 
          onClick={clearMessages}
          size="small"
          disabled={isStreaming}
        >
          清空对话
        </Button>
      </div>
    </div>
  );
};

export default MessageInput; 