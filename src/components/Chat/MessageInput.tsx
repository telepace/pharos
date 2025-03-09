import React, { useState } from 'react';
import { Input, Button, Space, Tag, Tooltip, Drawer } from 'antd';
import { 
  SendOutlined, 
  ClearOutlined, 
  SearchOutlined, 
  AudioOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';
import { usePromptContext } from '../../contexts/PromptContext';
import VoiceInput from './VoiceInput';
import WebSearch from './WebSearch';

const { TextArea } = Input;

const MessageInput: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const { sendMessage, clearMessages, isLoading, isStreaming } = useChatContext();
  const { getActivePrompt } = usePromptContext();
  const [searchDrawerVisible, setSearchDrawerVisible] = useState(false);
  
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
  
  const handleVoiceTranscript = (text: string) => {
    setInputValue(prev => prev + (prev ? ' ' : '') + text);
  };
  
  const handleSearchComplete = (query: string, results: Array<{ title: string; url: string; snippet: string }>) => {
    // 构建搜索结果摘要
    const searchSummary = `
我搜索了"${query}"，以下是结果：

${results.slice(0, 3).map((result, index) => `${index + 1}. ${result.title}
   ${result.snippet}
   链接: ${result.url}
`).join('\n')}
    `.trim();
    
    setInputValue(prev => prev + (prev ? '\n\n' : '') + searchSummary);
    setSearchDrawerVisible(false);
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
      
      <div style={{ display: 'flex', marginBottom: 8 }}>
        <Tooltip title="网络搜索">
          <Button 
            icon={<SearchOutlined />} 
            onClick={() => setSearchDrawerVisible(true)}
            style={{ marginRight: 8 }}
            disabled={isDisabled}
          />
        </Tooltip>
        
        <VoiceInput 
          onTranscript={handleVoiceTranscript}
          disabled={isDisabled}
        />
      </div>
      
      <Space.Compact style={{ width: '100%' }}>
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "AI正在回复中..." : "输入消息..."}
          autoSize={{ minRows: 1, maxRows: 6 }}
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
      
      {/* 网络搜索抽屉 */}
      <Drawer
        title="网络搜索"
        placement="right"
        onClose={() => setSearchDrawerVisible(false)}
        open={searchDrawerVisible}
        width={320}
      >
        <WebSearch onSearchComplete={handleSearchComplete} />
      </Drawer>
    </div>
  );
};

export default MessageInput; 