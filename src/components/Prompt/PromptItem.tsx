import React, { useState } from 'react';
import { Card, Typography, Space, Button, Modal, Tooltip, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, DisconnectOutlined } from '@ant-design/icons';
import { Prompt, PromptType } from '../../types';
import { usePromptContext } from '../../contexts/PromptContext';
import AddPromptModal from './AddPromptModal';

const { Text, Paragraph } = Typography;

interface PromptItemProps {
  prompt: Prompt;
}

const PromptItem: React.FC<PromptItemProps> = ({ prompt }) => {
  const { activePromptId, setActivePrompt, deletePrompt, removePromptFromScene } = usePromptContext();
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
  
  return (
    <>
      <Card
        hoverable
        style={{ 
          marginBottom: 16, 
          borderColor: isActive ? '#1890ff' : undefined,
          backgroundColor: isActive ? '#e6f7ff' : undefined,
          borderLeft: `4px solid ${getTypeTagColor()}`
        }}
        onClick={handleSelect}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Space align="center">
              <Text strong>{prompt.name}</Text>
              <Tag color={getTypeTagColor()}>{getTypeTagText()}</Tag>
              {isActive && <CheckCircleOutlined style={{ color: '#1890ff' }} />}
            </Space>
            <Paragraph 
              ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
              style={{ marginBottom: 8 }}
            >
              {prompt.content}
            </Paragraph>
            <Text type="secondary">模型: {prompt.model}</Text>
          </div>
          <Space>
            <Tooltip title="编辑">
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                size="small" 
                onClick={handleEdit}
              />
            </Tooltip>
            <Tooltip title="从场景中移除">
              <Button 
                type="text" 
                icon={<DisconnectOutlined />} 
                size="small" 
                onClick={handleRemove}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
                onClick={handleDelete}
              />
            </Tooltip>
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