import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Spin, Empty, Button, message, Drawer, Typography, Switch, Divider } from 'antd';
import { ReloadOutlined, SyncOutlined, BugOutlined } from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';
import Message from './Message';
import MessageInput from './MessageInput';
import { Message as MessageType } from '../../types';

const { Text, Title } = Typography;

const ChatWindow: React.FC = () => {
  const { messages, isLoading, isStreaming, observationIds } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const hasScrolledDuringStreamRef = useRef(false);
  const [localMessages, setLocalMessages] = useState<MessageType[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [renderKey, setRenderKey] = useState(0); // 用于强制重新渲染
  const [debugVisible, setDebugVisible] = useState(false);
  const [showRawMessages, setShowRawMessages] = useState(false);
  
  // 当消息列表更新时，更新本地消息列表
  useEffect(() => {
    console.log("消息列表更新:", messages.length, "条消息");
    
    // 记录每条消息的信息
    messages.forEach((msg, index) => {
      console.log(`消息[${index}]:`, 
        `ID: ${msg.id}`, 
        `角色: ${msg.role}`, 
        `内容长度: ${msg.content?.length || 0}`, 
        `内容前20字符: ${msg.content ? msg.content.substring(0, 20) + '...' : '空内容'}`);
    });
    
    // 使用深拷贝确保本地消息列表是独立的
    const deepCopiedMessages = messages.map(msg => ({...msg}));
    setLocalMessages(deepCopiedMessages);
  }, [messages]);
  
  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // 只在消息数量增加时滚动到底部（新消息发送时）
  useEffect(() => {
    if (localMessages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = localMessages.length;
  }, [localMessages, scrollToBottom]);
  
  // 处理流式输出时的滚动逻辑
  useEffect(() => {
    // 当流式输出开始时，重置滚动标记
    if (isStreaming && !hasScrolledDuringStreamRef.current) {
      // 检查最后一条消息是否至少有3行
      const lastMessage = localMessages[localMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const lineCount = (lastMessage.content?.match(/\n/g) || []).length + 1;
        
        // 当达到至少3行且尚未滚动过时，执行一次滚动
        if (lineCount >= 3 && !hasScrolledDuringStreamRef.current) {
          scrollToBottom();
          hasScrolledDuringStreamRef.current = true;
        }
      }
    }
    
    // 流式输出结束时，重置标记并滚动到底部
    if (!isStreaming && hasScrolledDuringStreamRef.current) {
      hasScrolledDuringStreamRef.current = false;
      scrollToBottom();
    }
  }, [isStreaming, localMessages, scrollToBottom]);
  
  // 强制刷新消息列表
  const forceRefresh = useCallback(() => {
    console.log("强制刷新消息列表");
    setIsRefreshing(true);
    
    // 增加渲染键，强制整个组件重新渲染
    setRenderKey(prev => prev + 1);
    
    // 先清空本地消息列表，然后重新设置
    setTimeout(() => {
      const deepCopiedMessages = messages.map(msg => ({...msg}));
      setLocalMessages(deepCopiedMessages);
      setIsRefreshing(false);
      scrollToBottom();
      message.success('消息列表已刷新');
    }, 100);
  }, [messages, scrollToBottom]);
  
  // 渲染单个消息
  const renderMessage = useCallback((msg: MessageType, index: number) => {
    return (
      <Message 
        key={`${msg.id}-${index}-${renderKey}`} 
        message={msg} 
        observationId={msg.role === 'assistant' ? observationIds[msg.id] : undefined}
      />
    );
  }, [observationIds, renderKey]);
  
  // 渲染原始消息（用于调试）
  const renderRawMessage = useCallback((msg: MessageType, index: number) => {
    return (
      <div 
        key={`raw-${msg.id}-${index}`}
        style={{ 
          padding: '10px', 
          margin: '5px 0', 
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          backgroundColor: msg.role === 'user' ? '#e6f7ff' : '#f6ffed'
        }}
      >
        <div><Text strong>ID:</Text> {msg.id}</div>
        <div><Text strong>角色:</Text> {msg.role}</div>
        <div><Text strong>时间:</Text> {new Date(msg.timestamp).toLocaleString()}</div>
        <div><Text strong>内容长度:</Text> {msg.content?.length || 0}</div>
        <div style={{ marginTop: '5px' }}>
          <Text strong>内容:</Text>
          <div style={{ 
            maxHeight: '100px', 
            overflow: 'auto', 
            padding: '5px', 
            backgroundColor: '#f5f5f5',
            borderRadius: '2px',
            marginTop: '5px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {msg.content || '空内容'}
          </div>
        </div>
      </div>
    );
  }, []);
  
  // 切换调试抽屉
  const toggleDebug = useCallback(() => {
    setDebugVisible(prev => !prev);
  }, []);
  
  return (
    <>
      <Card 
        key={`chat-window-${renderKey}`}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>聊天窗口</span>
            <div>
              <Button 
                icon={<BugOutlined />}
                size="small"
                onClick={toggleDebug}
                style={{ marginRight: '8px' }}
                title="调试工具"
              />
              <Button 
                icon={isRefreshing ? <SyncOutlined spin /> : <ReloadOutlined />} 
                size="small" 
                onClick={forceRefresh}
                title="刷新消息列表"
                disabled={isRefreshing}
              />
            </div>
          </div>
        }
        bordered={false}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {localMessages.length === 0 ? (
            <Empty 
              description="暂无消息" 
              style={{ margin: 'auto' }}
            />
          ) : (
            <>
              {localMessages.map(renderMessage)}
              {localMessages.length > 0 && (
                <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', margin: '10px 0' }}>
                  共 {localMessages.length} 条消息
                </div>
              )}
            </>
          )}
          {isLoading && !isStreaming && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Spin tip="AI正在思考..." />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <MessageInput />
      </Card>
      
      {/* 调试抽屉 */}
      <Drawer
        title="消息调试工具"
        placement="right"
        onClose={() => setDebugVisible(false)}
        open={debugVisible}
        width={500}
      >
        <div style={{ marginBottom: '16px' }}>
          <Switch 
            checked={showRawMessages} 
            onChange={setShowRawMessages} 
            style={{ marginRight: '8px' }}
          />
          <Text>显示原始消息数据</Text>
        </div>
        
        <Button 
          type="primary" 
          onClick={forceRefresh}
          style={{ marginBottom: '16px' }}
        >
          强制刷新消息列表
        </Button>
        
        <Divider />
        
        <div>
          <Title level={5}>状态信息</Title>
          <div><Text strong>原始消息数量:</Text> {messages.length}</div>
          <div><Text strong>本地消息数量:</Text> {localMessages.length}</div>
          <div><Text strong>正在加载:</Text> {isLoading ? '是' : '否'}</div>
          <div><Text strong>正在流式输出:</Text> {isStreaming ? '是' : '否'}</div>
          <div><Text strong>渲染键:</Text> {renderKey}</div>
        </div>
        
        <Divider />
        
        {showRawMessages && (
          <div>
            <Title level={5}>原始消息列表</Title>
            {messages.map(renderRawMessage)}
          </div>
        )}
      </Drawer>
    </>
  );
};

export default ChatWindow;