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
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  
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
    
    // 检查是否有AI消息
    const hasAssistantMessage = messages.some(msg => msg.role === 'assistant');
    const hasLocalAssistantMessage = localMessages.some(msg => msg.role === 'assistant');
    
    // 如果消息数量减少且没有AI消息，可能是AI消息被意外移除了
    if ((localMessages.length > messages.length || !hasAssistantMessage) && hasLocalAssistantMessage) {
      console.warn("检测到AI消息可能被意外移除，保留本地消息列表");
      
      // 尝试合并消息列表，保留AI消息
      const mergedMessages = [...messages];
      
      // 找出本地列表中的AI消息
      const assistantMessages = localMessages.filter(msg => msg.role === 'assistant');
      
      // 找出当前消息列表中的用户消息
      const userMessages = messages.filter(msg => msg.role === 'user');
      
      // 检查每条AI消息是否已存在于合并列表中
      assistantMessages.forEach(assistantMsg => {
        const exists = mergedMessages.some(msg => msg.id === assistantMsg.id);
        if (!exists) {
          console.log("添加丢失的AI消息回列表:", assistantMsg.id);
          
          // 查找这条AI消息之前的用户消息
          const prevUserMsgIndex = localMessages.findIndex(msg => msg.id === assistantMsg.id) - 1;
          const prevUserMsg = prevUserMsgIndex >= 0 ? localMessages[prevUserMsgIndex] : null;
          
          // 如果找到了对应的用户消息，并且该用户消息在当前消息列表中
          if (prevUserMsg && prevUserMsg.role === 'user' && 
              userMessages.some(msg => msg.id === prevUserMsg.id)) {
            mergedMessages.push(assistantMsg);
          } else if (!prevUserMsg) {
            // 如果没有找到对应的用户消息，也添加（可能是系统消息）
            mergedMessages.push(assistantMsg);
          }
        }
      });
      
      // 如果合并后的列表包含AI消息且与原始消息列表不同，则更新本地消息列表
      if (mergedMessages.length > messages.length || 
          (mergedMessages.some(msg => msg.role === 'assistant') && !hasAssistantMessage)) {
        console.log("使用合并后的消息列表:", mergedMessages.length, "条消息");
        
        // 按时间戳排序
        mergedMessages.sort((a, b) => a.timestamp - b.timestamp);
        
        const deepCopiedMessages = mergedMessages.map(msg => ({...msg}));
        setLocalMessages(deepCopiedMessages);
        
        // 通知ChatContext恢复消息
        // 这里我们不直接调用setMessages，而是通过一个自定义事件通知ChatContext
        const event = new CustomEvent('restoreMessages', { 
          detail: { messages: deepCopiedMessages } 
        });
        window.dispatchEvent(event);
        
        return;
      }
      
      return; // 不更新本地消息列表，保留当前状态
    }
    
    // 使用深拷贝确保本地消息列表是独立的
    const deepCopiedMessages = messages.map(msg => ({...msg}));
    setLocalMessages(deepCopiedMessages);
  }, [messages, localMessages]);

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