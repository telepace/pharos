import React, { useEffect, useRef } from 'react';
import { Card, Spin, Empty } from 'antd';
import { useChatContext } from '../../contexts/ChatContext';
import Message from './Message';
import MessageInput from './MessageInput';

const ChatWindow: React.FC = () => {
  const { messages, isLoading } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
            <Message key={message.id} message={message} />
          ))
        )}
        {isLoading && (
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