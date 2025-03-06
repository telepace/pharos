import React from 'react';
import { Avatar, Typography, Space } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Message as MessageType } from '../../types';

const { Text, Paragraph } = Typography;

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
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
        style={{
          maxWidth: '70%',
          backgroundColor: isUser ? '#e6f7ff' : '#f6ffed',
          padding: '8px 12px',
          borderRadius: 8,
          position: 'relative'
        }}
      >
        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Paragraph>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      </div>
    </div>
  );
};

export default Message; 