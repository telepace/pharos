import React, { useState } from 'react';
import { Tabs, Button, Modal, Input, Form, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useSceneContext } from '../../contexts/SceneContext';
import './SceneSelector.css'; // 导入CSS文件

const { TabPane } = Tabs;
const { confirm } = Modal;

const SceneSelector: React.FC = () => {
  const { scenes, activeSceneId, addScene, setActiveScene, deleteScene, updateScene } = useSceneContext();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentScene, setCurrentScene] = useState<{ id: string; name: string } | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  
  const handleAddScene = () => {
    setIsAddModalVisible(true);
  };
  
  const handleAddModalOk = () => {
    form.validateFields().then(values => {
      addScene(values.sceneName);
      form.resetFields();
      setIsAddModalVisible(false);
    });
  };
  
  const handleAddModalCancel = () => {
    form.resetFields();
    setIsAddModalVisible(false);
  };
  
  const handleTabChange = (activeKey: string) => {
    setActiveScene(activeKey);
  };
  
  const handleDeleteScene = (scene: { id: string; name: string }) => {
    confirm({
      title: '确定要删除此场景吗？',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>您正在删除场景：<strong>{scene.name}</strong></p>
          <p style={{ color: '#ff4d4f' }}>注意：删除场景将同时删除该场景下的所有提示！</p>
        </div>
      ),
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk() {
        deleteScene(scene.id);
      }
    });
  };
  
  const handleEditScene = (scene: { id: string; name: string }) => {
    setCurrentScene(scene);
    editForm.setFieldsValue({ sceneName: scene.name });
    setIsEditModalVisible(true);
  };
  
  const handleEditModalOk = () => {
    if (currentScene) {
      editForm.validateFields().then(values => {
        updateScene(currentScene.id, values.sceneName);
        editForm.resetFields();
        setCurrentScene(null);
        setIsEditModalVisible(false);
      });
    }
  };
  
  // 自定义标签页
  const renderTabBar = (props: any, DefaultTabBar: any) => (
    <DefaultTabBar {...props}>
      {(node: any) => {
        const scene = scenes.find(s => s.id === node.key);
        if (!scene) return node;
        
        // 判断是否为当前激活的标签
        const isActive = scene.id === activeSceneId;
        
        return (
          <div className="custom-tab">
            <div className="tab-content">
              {node}
            </div>
            <div className="tab-actions" style={{ opacity: isActive ? 1 : 0 }}>
              <Tooltip title="编辑场景">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined style={{ fontSize: '12px' }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditScene(scene);
                  }}
                  className="tab-action-btn"
                />
              </Tooltip>
              <Tooltip title="删除场景">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteScene(scene);
                  }}
                  className="tab-action-btn"
                  danger
                />
              </Tooltip>
            </div>
          </div>
        );
      }}
    </DefaultTabBar>
  );
  
  return (
    <>
      <Tabs
        activeKey={activeSceneId || ''}
        onChange={handleTabChange}
        type="card"
        tabBarExtraContent={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddScene}
            size="small"
          >
            添加场景
          </Button>
        }
        style={{ marginBottom: 16 }}
        renderTabBar={renderTabBar}
      >
        {scenes.map(scene => (
          <TabPane tab={scene.name} key={scene.id} />
        ))}
      </Tabs>
      
      {/* 添加场景对话框 */}
      <Modal
        title="添加场景"
        open={isAddModalVisible}
        onOk={handleAddModalOk}
        onCancel={handleAddModalCancel}
      >
        <Form form={form}>
          <Form.Item
            name="sceneName"
            label="场景名称"
            rules={[{ required: true, message: '请输入场景名称' }]}
          >
            <Input placeholder="例如：写作助手、代码调试、学习问答" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 编辑场景对话框 */}
      <Modal
        title="编辑场景"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => {
          editForm.resetFields();
          setIsEditModalVisible(false);
        }}
      >
        <Form form={editForm}>
          <Form.Item
            name="sceneName"
            label="场景名称"
            rules={[{ required: true, message: '请输入场景名称' }]}
          >
            <Input placeholder="例如：写作助手、代码调试、学习问答" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SceneSelector; 