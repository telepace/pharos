import React, { useState } from 'react';
import { Tabs, Button, Modal, Input, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSceneContext } from '../../contexts/SceneContext';

const { TabPane } = Tabs;

const SceneSelector: React.FC = () => {
  const { scenes, activeSceneId, addScene, setActiveScene } = useSceneContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  const handleAddScene = () => {
    setIsModalVisible(true);
  };
  
  const handleModalOk = () => {
    form.validateFields().then(values => {
      addScene(values.sceneName);
      form.resetFields();
      setIsModalVisible(false);
    });
  };
  
  const handleModalCancel = () => {
    form.resetFields();
    setIsModalVisible(false);
  };
  
  const handleTabChange = (activeKey: string) => {
    setActiveScene(activeKey);
  };
  
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
      >
        {scenes.map(scene => (
          <TabPane tab={scene.name} key={scene.id} />
        ))}
      </Tabs>
      
      <Modal
        title="添加场景"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
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
    </>
  );
};

export default SceneSelector; 