import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Typography, Space, Tooltip } from 'antd';
import { UserOutlined, RobotOutlined, LinkOutlined } from '@ant-design/icons';
import { Message as MessageType } from '../../types';
import ReactMarkdown from 'react-markdown';
import { useChatContext } from '../../contexts/ChatContext';
import FeedbackButtons from '../FeedbackButtons';
import VoicePlayer from './VoicePlayer';
import LinkPreview from './LinkPreview';
import { parseLinks } from '../../utils/messageUtils';
import { PharosIcon } from '../icons/PharosIcon';

const { Text } = Typography;

interface MessageProps {
  message: MessageType;
  observationId?: string;
}

const Message: React.FC<MessageProps> = ({ message, observationId }) => {
  const isUser = message.role === 'user';
  const { isStreaming, streamingMessageId, currentConversation } = useChatContext();
  const messageRef = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<{ url: string, startIndex: number, endIndex: number }[]>([]);
  
  // 检查当前消息是否正在流式输出
  const isCurrentlyStreaming = isStreaming && streamingMessageId === message.id;
  
  // 解析消息中的链接
  useEffect(() => {
    if (!isCurrentlyStreaming && message.content) {
      const detectedLinks = parseLinks(message.content);
      setLinks(detectedLinks);
    }
  }, [message.content, isCurrentlyStreaming]);
  
  // 渲染消息内容，包括链接解析
  const renderContent = () => {
    return (
      <div style={{ margin: 0 }}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
        {isCurrentlyStreaming && (
          <span className="typing-cursor"></span>
        )}
        
        {/* 链接预览 */}
        {!isCurrentlyStreaming && links.length > 0 && (
          <div className="link-previews">
            {links.slice(0, 3).map((link, index) => (
              <LinkPreview key={`${link.url}-${index}`} url={link.url} />
            ))}
            {links.length > 3 && (
              <Tooltip title="查看更多链接">
                <div className="more-links">
                  <LinkOutlined /> 还有 {links.length - 3} 个链接
                </div>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        marginBottom: 32,
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}
    >
      <Avatar 
        icon={isUser ? <UserOutlined style={{ color: 'transparent' }} /> : <PharosIcon />} 
        style={{ 
          backgroundColor: isUser ? 'transparent' : 'transparent',
          marginLeft: isUser ? 12 : 0,
          marginRight: isUser ? 0 : 12,
        }}
      />
      <div
        ref={messageRef}
        className={`message-bubble ${isCurrentlyStreaming ? 'streaming-message' : ''}`}
        style={{
          backgroundColor: isUser ? '#E8E7E5' : '#f5f5f5',
          position: 'relative',
          transition: 'background-color 0.3s ease'
        }}
      >
        {renderContent()}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: 8 
        }}>
          <Space size="small">
            {/* 暂时隐藏时间戳
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </Text>
            */}
            
             {/* 语音播放按钮（已隐藏） */}
             {/* 
             {!isUser && !isCurrentlyStreaming && (
               <VoicePlayer text={message.content} />
             )} 
             */}
          </Space>
          
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