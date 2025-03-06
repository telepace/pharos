import React, { useState } from 'react';
import { List, Button, Typography, Dropdown, Input, Modal, Space, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useChatContext } from '../../contexts/ChatContext';

const { Text } = Typography;
const { confirm } = Modal;

const ConversationList: React.FC = () => {
  const { 
    conversations, 
    currentConversation, 
    createNewConversation, 
    switchConversation,
    renameConversation,
    deleteConversation
  } = useChatContext();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // 开始编辑
  const startEditing = (conversation: any) => {
    setEditingId(conversation.id);
    setEditingName(conversation.name);
  };
  
  // 保存编辑
  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      renameConversation(editingId, editingName.trim());
      setEditingId(null);
    }
  };
  
  // 取消编辑
  const cancelEditing = () => {
    setEditingId(null);
  };
  
  // 确认删除
  const showDeleteConfirm = (conversationId: string) => {
    confirm({
      title: '确定要删除这个对话吗？',
      icon: <ExclamationCircleOutlined />,
      content: '删除后将无法恢复',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        deleteConversation(conversationId);
      }
    });
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>对话列表</Text>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={createNewConversation}
        >
          新建对话
        </Button>
      </div>
      
      <List
        style={{ flex: 1, overflow: 'auto' }}
        dataSource={conversations}
        renderItem={conversation => (
          <List.Item
            key={conversation.id}
            style={{ 
              cursor: 'pointer',
              background: currentConversation?.id === conversation.id ? '#f0f0f0' : 'transparent',
              padding: '8px 12px',
              borderRadius: '4px'
            }}
            onClick={() => switchConversation(conversation.id)}
            actions={[
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'rename',
                      icon: <EditOutlined />,
                      label: '重命名',
                      onClick: (e) => {
                        e.domEvent.stopPropagation();
                        startEditing(conversation);
                      }
                    },
                    {
                      key: 'delete',
                      icon: <DeleteOutlined />,
                      label: '删除',
                      danger: true,
                      onClick: (e) => {
                        e.domEvent.stopPropagation();
                        showDeleteConfirm(conversation.id);
                      }
                    }
                  ]
                }}
                trigger={['click']}
              >
                <Button 
                  type="text" 
                  icon={<MoreOutlined />} 
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            ]}
          >
            {editingId === conversation.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onPressEnter={saveEditing}
                onBlur={saveEditing}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <div style={{ flex: 1 }}>
                <div>{conversation.name}</div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    更新于: {formatDate(conversation.updatedAt)}
                  </Text>
                </div>
              </div>
            )}
          </List.Item>
        )}
      />
    </div>
  );
};

export default ConversationList;