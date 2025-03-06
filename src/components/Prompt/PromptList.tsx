import React, { useState } from 'react';
import { Button, Empty, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usePromptContext } from '../../contexts/PromptContext';
import { useSceneContext } from '../../contexts/SceneContext';
import PromptItem from './PromptItem';
import AddPromptModal from './AddPromptModal';

const { Title } = Typography;

const PromptList: React.FC = () => {
  const { getPromptsForActiveScene } = usePromptContext();
  const { activeSceneId, scenes } = useSceneContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const prompts = getPromptsForActiveScene();
  const activeScene = scenes.find(scene => scene.id === activeSceneId);
  
  const handleAddPrompt = () => {
    setIsModalVisible(true);
  };
  
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16 
      }}>
        <Title level={4} style={{ margin: 0 }}>
          {activeScene ? `${activeScene.name}的提示列表` : '提示列表'}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddPrompt}
          disabled={!activeSceneId}
        >
          添加提示
        </Button>
      </div>
      
      {prompts.length === 0 ? (
        <Empty 
          description={
            !activeSceneId 
              ? "请先选择一个场景" 
              : "当前场景下没有提示，点击\"添加提示\"按钮创建"
          } 
        />
      ) : (
        prompts.map(prompt => (
          <PromptItem key={prompt.id} prompt={prompt} />
        ))
      )}
      
      <AddPromptModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
      />
    </div>
  );
};

export default PromptList; 