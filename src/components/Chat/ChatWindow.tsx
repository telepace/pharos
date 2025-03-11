import React, { useEffect, useRef, useState } from 'react';
import { Card, Spin, Empty } from 'antd';
import { useChatContext } from '../../contexts/ChatContext';
import Message from './Message';
import MessageInput from './MessageInput';

const ChatWindow: React.FC = () => {
  const { messages, isLoading, isStreaming, observationIds } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const shouldScrollRef = useRef(true);
  const userScrolledRef = useRef(false);
  
  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'auto',
      block: 'end'
    });
  };

  // 检查是否在底部（100px误差范围内）
  const isAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    
    // 如果内容高度小于容器高度，说明没有滚动条，视为在底部
    if (container.scrollHeight <= container.clientHeight) {
      return true;
    }
    
    return container.scrollHeight - container.scrollTop - container.clientHeight < 150;
  };

  // 处理滚动事件
  const handleScroll = () => {
    // 记录用户是否在底部
    shouldScrollRef.current = isAtBottom();
    
    // 只有在流式输出时且用户明确向上滚动时才标记为用户滚动
    if (isStreaming) {
      const container = messagesContainerRef.current;
      if (container && container.scrollHeight - container.scrollTop - container.clientHeight > 150) {
        userScrolledRef.current = true;
      }
    }
  };

  // 添加滚动监听
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isStreaming]);

  // 处理消息更新
  useEffect(() => {
    // 当消息数量增加时
    if (messages.length > prevMessagesLengthRef.current) {
      // 使用 requestAnimationFrame 确保在下一帧渲染后再检查
      requestAnimationFrame(() => {
        // 消息少于3条时总是滚动到底部
        const messageCount = Math.ceil(messages.length / 2); // 计算对话轮次
        if (messageCount < 3 || shouldScrollRef.current) {
          scrollToBottom();
        }
      });
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);
  
  // 处理流式输出时的滚动
  useEffect(() => {
    // 流式开始时重置用户滚动标记
    if (isStreaming) {
      userScrolledRef.current = false;
      
      // 初始滚动到底部
      scrollToBottom();
      
      // 使用 requestAnimationFrame 而不是 setInterval 来实现更平滑的滚动
      let animationFrameId: number;
      
      const scrollLoop = () => {
        if (isStreaming && !userScrolledRef.current) {
          scrollToBottom();
          animationFrameId = requestAnimationFrame(scrollLoop);
        }
      };
      
      // 启动滚动循环
      animationFrameId = requestAnimationFrame(scrollLoop);
      
      return () => {
        // 清理
        cancelAnimationFrame(animationFrameId);
        // 流式输出结束时重置用户滚动标记
        setTimeout(() => {
          userScrolledRef.current = false;
        }, 500);
      };
    }
  }, [isStreaming]);
  
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
        ref={messagesContainerRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
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