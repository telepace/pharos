import React, { useState } from 'react';
import { Card, Typography, Space, Button, Modal, Tooltip, Tag, Menu, Dropdown } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, DisconnectOutlined, SendOutlined, MoreOutlined } from '@ant-design/icons';
import { Prompt, PromptType } from '../../types';
import { usePromptContext } from '../../contexts/PromptContext';
import { useChatContext } from '../../contexts/ChatContext';
import AddPromptModal from './AddPromptModal';
import type { MenuProps } from 'antd';

const { Text, Paragraph } = Typography;

interface PromptItemProps {
  prompt: Prompt;
}

const PromptItem: React.FC<PromptItemProps> = ({ prompt }) => {
  const { activePromptId, setActivePrompt, deletePrompt, removePromptFromScene } = usePromptContext();
  const { sendMessage } = useChatContext();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isRemoveModalVisible, setIsRemoveModalVisible] = useState(false);
  
  const isActive = activePromptId === prompt.id;
  
  const handleSelect = () => {
    setActivePrompt(isActive ? null : prompt.id);
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalVisible(true);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalVisible(true);
  };
  
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemoveModalVisible(true);
  };

  const handleSendDirectly = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage(prompt.content);
  };
  
  const confirmDelete = () => {
    deletePrompt(prompt.id);
    setIsDeleteModalVisible(false);
  };
  
  const confirmRemove = () => {
    removePromptFromScene(prompt.id);
    setIsRemoveModalVisible(false);
  };
  
  // 根据提示类型获取标签颜色
  const getTypeTagColor = () => {
    return prompt.type === PromptType.DIRECT ? '#f50' : '#108ee9';
  };
  
  // 根据提示类型获取标签文本
  const getTypeTagText = () => {
    return prompt.type === PromptType.DIRECT ? '直接发送' : '系统提示';
  };

  // 处理菜单点击
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'send') {
      sendMessage(prompt.content);
    } else if (key === 'edit') {
      setIsEditModalVisible(true);
    } else if (key === 'delete') {
      setIsDeleteModalVisible(true);
    }
  };

  // 下拉菜单选项
  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="send" icon={<SendOutlined />}>
        直接发送
      </Menu.Item>
      <Menu.Item key="edit" icon={<EditOutlined />}>
        编辑
      </Menu.Item>
      <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
        删除
      </Menu.Item>
    </Menu>
  );
  
  return (
    <>
      <Card
        hoverable
        style={{ 
          marginBottom: 4, 
          borderColor: isActive ? '#1890ff' : undefined,
          backgroundColor: isActive ? '#e6f7ff' : undefined,
          borderLeft: `4px solid ${getTypeTagColor()}`
        }}
        onClick={handleSelect}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flexGrow: 1, overflow: 'hidden', paddingRight: 8 }}>
            <Space align="center" style={{ marginBottom: 4 }}>
              <Text strong>{prompt.name}</Text>
              {/* 注释掉类型标签
              <Tag color={getTypeTagColor()}>{getTypeTagText()}</Tag>
              {isActive && <CheckCircleOutlined style={{ color: '#1890ff' }} />}
              */}
            </Space>
            {false && (
              <Paragraph 
                ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                style={{ marginBottom: 8 }}
              >
                {prompt.content}
              </Paragraph>
            )}
            <br />
            <Text type="secondary" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>模型: {prompt.model}</Text>
          </div>
          <Space style={{ flexShrink: 0 }}>
            <Tooltip title="直接发送">
              <Button 
                type="text" 
                icon={<SendOutlined />} 
                size="small" 
                onClick={handleSendDirectly}
              />
            </Tooltip>
            <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
              <Button 
                type="text" 
                icon={<MoreOutlined />} 
                size="small" 
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </Space>
        </div>
      </Card>
      
      <AddPromptModal
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        editMode={true}
        initialValues={prompt}
      />
      
      <Modal
        title="确认删除"
        open={isDeleteModalVisible}
        onOk={confirmDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
      >
        <p>确定要删除提示 "{prompt.name}" 吗？此操作不可撤销。</p>
      </Modal>
      
      <Modal
        title="确认移除"
        open={isRemoveModalVisible}
        onOk={confirmRemove}
        onCancel={() => setIsRemoveModalVisible(false)}
      >
        <p>确定要将提示 "{prompt.name}" 从当前场景中移除吗？</p>
      </Modal>
    </>
  );
};

export default PromptItem;