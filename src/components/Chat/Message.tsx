import React, { useEffect, useRef } from 'react';
import { Avatar, Typography, Space } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Message as MessageType } from '../../types';
import ReactMarkdown from 'react-markdown';
import { useChatContext } from '../../contexts/ChatContext';
import FeedbackButtons from '../FeedbackButtons';

const { Text } = Typography;

interface MessageProps {
  message: MessageType;
  observationId?: string;
}

const Message: React.FC<MessageProps> = ({ message, observationId }) => {
  const isUser = message.role === 'user';
  const { isStreaming, streamingMessageId, currentConversation } = useChatContext();
  const messageRef = useRef<HTMLDivElement>(null);
  
  // 检查当前消息是否正在流式输出
  const isCurrentlyStreaming = isStreaming && streamingMessageId === message.id;
  
  // 当消息内容更新时，应用高亮动画
  useEffect(() => {
    if (isCurrentlyStreaming && messageRef.current) {
      messageRef.current.classList.add('message-highlight');
      
      const timer = setTimeout(() => {
        messageRef.current?.classList.remove('message-highlight');
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [message.content, isCurrentlyStreaming]);
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        marginBottom: 16,
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}
    >
      <Avatar 
        icon={isUser ? <UserOutlined /> : <RobotOutlined />} 
        style={{ 
          backgroundColor: isUser ? '#1890ff' : '#52c41a',
          marginLeft: isUser ? 12 : 0,
          marginRight: isUser ? 0 : 12
        }}
      />
      <div
        ref={messageRef}
        className={`message-bubble ${isCurrentlyStreaming ? 'streaming-message' : ''}`}
        style={{
          maxWidth: '70%',
          backgroundColor: isUser ? '#e6f7ff' : '#f6ffed',
          padding: '8px 12px',
          borderRadius: 8,
          position: 'relative',
          transition: 'background-color 0.3s ease'
        }}
      >
        <div style={{ margin: 0 }}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
          {isCurrentlyStreaming && (
            <span className="typing-indicator">▋</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
          
          {/* 只为AI消息添加反馈按钮，且不在流式输出时显示 */}
          {!isUser && !isCurrentlyStreaming && currentConversation && observationId && (
            <FeedbackButtons 
              observationId={observationId} 
              conversationId={currentConversation.id} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Message; 