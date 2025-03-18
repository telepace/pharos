import React, { useState } from 'react';
import { Input, Button, Space, Tag, Tooltip, Drawer, message } from 'antd';
import { 
  SendOutlined, 
  ClearOutlined, 
  SearchOutlined, 
  AudioOutlined,
  LinkOutlined,
  CloseCircleOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';
import { usePromptContext } from '../../contexts/PromptContext';
import { useSettings } from '../../contexts/SettingsContext';
import VoiceInput from './VoiceInput';
import WebSearch from './WebSearch';
import { performWebSearch } from '../../utils/messageUtils';

const { TextArea } = Input;

const MessageInput: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const { sendMessage, clearMessages, isLoading, isStreaming } = useChatContext();
  const { getActivePrompt } = usePromptContext();
  const { settings } = useSettings();
  const [searchDrawerVisible, setSearchDrawerVisible] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const activePrompt = getActivePrompt();
  const isDisabled = isLoading || isStreaming;
  
  const handleSend = async () => {
    if (!inputValue.trim() || isDisabled) return;
    
    if (isSearchMode) {
      // 搜索模式：执行网络搜索
      setIsSearching(true);
      try {
        // 使用设置中的默认搜索深度
        const searchResults = await performWebSearch(inputValue, settings.defaultSearchDepth);
        
        // 构建搜索结果摘要
        const searchSummary = `
用户可能需要最新信息。我已经为"${inputValue}"执行了网络搜索，以下是搜索结果：

${searchResults.results.slice(0, 3).map((result, index) => `[${index + 1}] ${result.title}
${result.snippet}
来源: ${result.url}
`).join('\n')}

请根据这些搜索结果回答用户的问题。如果搜索结果不相关或不足以回答问题，请基于你已有的知识回答，并说明可能需要更多信息。
        `.trim();
        
        // 发送用户原始消息，同时附加系统消息包含搜索结果
        sendMessage(inputValue, {
          systemMessage: searchSummary
        });
        
        setInputValue('');
        
        // 退出搜索模式
        setIsSearchMode(false);
      } catch (error) {
        console.error('搜索失败:', error);
        message.error('搜索失败，请稍后重试');
      } finally {
        setIsSearching(false);
      }
    } else {
      // 普通模式：直接发送消息
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
  
  const toggleSearchMode = () => {
    setIsSearchMode(prev => !prev);
    if (!isSearchMode) {
      message.info('已进入搜索模式，输入内容将直接作为搜索内容');
    }
  };
  
  const handleSearchComplete = (query: string, results: Array<{ title: string; url: string; snippet: string }>) => {
    // 构建搜索结果摘要
    const searchSummary = `
用户可能需要最新信息。我已经为"${query}"执行了网络搜索，以下是搜索结果：

${results.slice(0, 3).map((result, index) => `[${index + 1}] ${result.title}
${result.snippet}
来源: ${result.url}
`).join('\n')}

请根据这些搜索结果回答用户的问题。如果搜索结果不相关或不足以回答问题，请基于你已有的知识回答，并说明可能需要更多信息。
    `.trim();
    
    // 发送用户原始查询，同时附加一个隐藏的系统消息包含搜索结果
    if (inputValue) {
      // 如果输入框已有内容，直接发送
      sendMessage(inputValue, {
        systemMessage: searchSummary
      });
    } else {
      // 如果输入框为空，将搜索查询作为用户消息发送
      sendMessage(query, {
        systemMessage: searchSummary
      });
    }
    
    // 清空输入框
    setInputValue('');
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
      
      {isSearchMode && (
        <div style={{ marginBottom: 8 }}>
          <Tag color="green" icon={<SearchOutlined />}>
            搜索模式已启用
          </Tag>
        </div>
      )}
      
      <div style={{ display: 'flex', marginBottom: 8 }}>
        <Tooltip title={isSearchMode ? "退出搜索模式" : "启用搜索模式"}>
          <Button 
            icon={isSearchMode ? <CloseCircleOutlined /> : <SearchOutlined />}
            onClick={toggleSearchMode}
            style={{ marginRight: 8 }}
            disabled={isDisabled}
            type={isSearchMode ? "primary" : "default"}
            danger={isSearchMode}
          />
        </Tooltip>
        
        <Tooltip title="高级网络搜索">
          <Button 
            icon={<GlobalOutlined />} 
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
          placeholder={isSearchMode ? "输入搜索关键词..." : isStreaming ? "AI正在回复中..." : "输入消息..."}
          autoSize={{ minRows: 1, maxRows: 6 }}
          style={{ 
            borderRadius: '4px 0 0 4px',
            borderColor: isSearchMode ? '#52c41a' : undefined,
            backgroundColor: isSearchMode ? 'rgba(82, 196, 26, 0.05)' : undefined
          }}
          disabled={isDisabled}
        />
        <Button 
          type="primary" 
          icon={isSearchMode ? <SearchOutlined /> : <SendOutlined />}
          onClick={handleSend}
          loading={isLoading || isSearching}
          disabled={isStreaming}
          style={{ 
            borderRadius: '0 4px 4px 0',
            backgroundColor: isSearchMode ? '#52c41a' : undefined,
            borderColor: isSearchMode ? '#52c41a' : undefined
          }}
        >
          {isSearchMode ? "搜索" : isStreaming ? "生成中" : "发送"}
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
        title="高级网络搜索"
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