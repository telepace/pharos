import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Typography, Space, Tooltip } from 'antd';
import { UserOutlined, RobotOutlined, LinkOutlined } from '@ant-design/icons';
import { Message as MessageType } from '../../types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChatContext } from '../../contexts/ChatContext';
import FeedbackButtons from '../FeedbackButtons';
import VoicePlayer from './VoicePlayer';
import LinkPreview from './LinkPreview';
import { parseLinks } from '../../utils/messageUtils';

const { Text } = Typography;

interface MessageProps {
  message: MessageType;
  observationId?: string;
}

const Message: React.FC<MessageProps> = ({ message, observationId }) => {
  const isUser = message.role === 'user';
  const { isStreaming, streamingMessageId, currentConversation } = useChatContext();
  const messageRef = useRef<HTMLDivElement>(null);
  
  // 使用ref来存储消息内容，防止被React状态更新覆盖
  const contentRef = useRef<string>(message.content || '');
  const [links, setLinks] = useState<{ url: string, startIndex: number, endIndex: number }[]>([]);
  
  // 使用一个强制更新的状态，当需要重新渲染时更新它
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // 检查当前消息是否正在流式输出
  const isCurrentlyStreaming = isStreaming && streamingMessageId === message.id;
  
  // 组件挂载时，确保contentRef初始化为消息内容
  useEffect(() => {
    if (message.content) {
      contentRef.current = message.content;
      console.log(`初始化消息内容 [${message.id}] [${message.role}]: 内容长度 ${message.content.length}`);
    }
  }, [message.content, message.id, message.role]);
  
  // 当消息内容更新时，更新contentRef并强制重新渲染
  useEffect(() => {
    // 只有当消息内容不为空且与当前存储的内容不同时才更新
    if (message.content !== undefined && message.content !== null && message.content !== contentRef.current) {
      console.log(`消息内容更新 [${message.id}] [${message.role}]:`, 
        `旧内容长度: ${contentRef.current.length}`, 
        `新内容长度: ${message.content.length}`);
      
      // 更新ref中存储的内容
      contentRef.current = message.content;
      
      // 强制组件重新渲染
      setForceUpdate(prev => prev + 1);
      
      // 应用高亮动画
      if (isCurrentlyStreaming && messageRef.current) {
        messageRef.current.classList.add('message-highlight');
        
        const timer = setTimeout(() => {
          messageRef.current?.classList.remove('message-highlight');
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [message.content, isCurrentlyStreaming, message.id, message.role]);
  
  // 组件卸载前保存消息内容到localStorage
  useEffect(() => {
    return () => {
      // 如果是AI消息且有内容，保存到localStorage
      if (!isUser && contentRef.current) {
        try {
          const key = `message_content_${message.id}`;
          localStorage.setItem(key, contentRef.current);
          console.log(`保存AI消息内容到localStorage [${message.id}]: 内容长度 ${contentRef.current.length}`);
        } catch (error) {
          console.error("保存消息内容到localStorage失败:", error);
        }
      }
    };
  }, [message.id, isUser]);
  
  // 组件挂载时，尝试从localStorage恢复消息内容
  useEffect(() => {
    // 只对AI消息进行恢复
    if (!isUser && (!contentRef.current || contentRef.current.length === 0)) {
      try {
        const key = `message_content_${message.id}`;
        const savedContent = localStorage.getItem(key);
        if (savedContent) {
          console.log(`从localStorage恢复AI消息内容 [${message.id}]: 内容长度 ${savedContent.length}`);
          contentRef.current = savedContent;
          setForceUpdate(prev => prev + 1);
        }
      } catch (error) {
        console.error("从localStorage恢复消息内容失败:", error);
      }
    }
  }, [message.id, isUser]);
  
  // 解析消息中的链接
  useEffect(() => {
    if (!isCurrentlyStreaming && contentRef.current) {
      try {
        const detectedLinks = parseLinks(contentRef.current);
        setLinks(detectedLinks);
      } catch (error) {
        console.error("解析链接出错:", error);
      }
    }
  }, [forceUpdate, isCurrentlyStreaming]);
  
  // 渲染消息内容，包括链接解析
  const renderContent = () => {
    // 使用ref中存储的内容，而不是直接使用message.content
    const content = contentRef.current;
    
    // 如果ref中没有内容但message.content有内容，则使用message.content
    // 这是一个额外的安全措施，确保内容不会丢失
    if (!content && message.content) {
      console.log(`使用message.content作为备份 [${message.id}] [${message.role}]`);
      contentRef.current = message.content;
    }
    
    // 确保内容不为undefined或null
    const safeContent = contentRef.current || '';
    
    // 记录渲染的内容长度，用于调试
    if (isUser) {
      console.log(`渲染用户消息 [${message.id}]: 内容长度 ${safeContent.length}`);
    } else {
      console.log(`渲染AI消息 [${message.id}]: 内容长度 ${safeContent.length}`);
    }
    
    return (
      <div style={{ margin: 0 }}>
        {safeContent ? (
          <ReactMarkdown
            components={{
              code({node, inline, className, children, ...props}: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {safeContent}
          </ReactMarkdown>
        ) : (
          isCurrentlyStreaming ? (
            <span className="typing-cursor"></span>
          ) : (
            <span style={{color: '#999', fontStyle: 'italic'}}>
              正在加载消息...
            </span>
          )
        )}
        
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
  
  // 确保消息组件始终渲染，即使在边缘情况下
  return (
    <div 
      style={{ 
        display: 'flex', 
        marginBottom: 16,
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}
      data-message-id={message.id}
      data-message-role={message.role}
      data-message-timestamp={message.timestamp}
      data-content-length={contentRef.current.length}
      data-force-update={forceUpdate}
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
        className={`message-bubble ${isCurrentlyStreaming ? 'streaming-message' : ''} ${message.role}`}
        style={{
          maxWidth: '70%',
          backgroundColor: isUser ? '#e6f7ff' : '#f6ffed',
          padding: '8px 12px',
          borderRadius: 8,
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
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </Text>
            
            {/* 为AI消息添加语音播放按钮 */}
            {!isUser && !isCurrentlyStreaming && contentRef.current && (
              <VoicePlayer text={contentRef.current} />
            )}
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