import React, { useEffect, useRef } from 'react';
import { Card, Spin, Empty } from 'antd';
import { useChatContext } from '../../contexts/ChatContext';
import Message from './Message';
import MessageInput from './MessageInput';

const ChatWindow: React.FC = () => {
  const { messages, isLoading, isStreaming, observationIds } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const hasScrolledDuringStreamRef = useRef(false);
  
  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 只在消息数量增加时滚动到底部（新消息发送时）
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);
  
  // 处理流式输出时的滚动逻辑
  useEffect(() => {
    // 当流式输出开始时，重置滚动标记
    if (isStreaming && !hasScrolledDuringStreamRef.current) {
      // 检查最后一条消息是否至少有3行
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const lineCount = (lastMessage.content.match(/\n/g) || []).length + 1;
        
        // 当达到至少3行且尚未滚动过时，执行一次滚动
        if (lineCount >= 3 && !hasScrolledDuringStreamRef.current) {
          scrollToBottom();
          hasScrolledDuringStreamRef.current = true;
        }
      }
    }
    
    // 流式输出结束时，重置标记
    if (!isStreaming) {
      hasScrolledDuringStreamRef.current = false;
    }
  }, [isStreaming, messages]);
  
  return (
    <Card 
      title="聊天窗口" 
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
        {messages.length === 0 ? (
          <Empty 
            description="暂无消息" 
            style={{ margin: 'auto' }}
          />
        ) : (
          messages.map(message => (
            <Message 
              key={message.id} 
              message={message} 
              observationId={message.role === 'assistant' ? observationIds[message.id] : undefined}
            />
          ))
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
  );
};

export default ChatWindow;