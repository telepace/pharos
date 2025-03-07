import React, { useState, useRef, useEffect } from 'react';
import { Button, Empty, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usePromptContext } from '../../contexts/PromptContext';
import { useSceneContext } from '../../contexts/SceneContext';
import PromptItem from './PromptItem';
import AddPromptModal from './AddPromptModal';

const { Title } = Typography;

const PromptList: React.FC = () => {
  const { getPromptsForActiveScene, prompts, activePromptId } = usePromptContext();
  const { activeSceneId, scenes } = useSceneContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [localPrompts, setLocalPrompts] = useState<any[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 获取当前场景的提示
  useEffect(() => {
    const activePrompts = getPromptsForActiveScene();
    console.log('PromptList useEffect - 更新本地提示列表:', activePrompts);
    setLocalPrompts(activePrompts);
  }, [activeSceneId, prompts, getPromptsForActiveScene]);
  
  const activeScene = scenes.find(scene => scene.id === activeSceneId);
  
  console.log('PromptList 渲染 - 当前场景ID:', activeSceneId);
  console.log('PromptList 渲染 - 当前场景:', activeScene);
  console.log('PromptList 渲染 - 当前提示列表:', localPrompts);
  console.log('PromptList 渲染 - 当前活动提示ID:', activePromptId);
  
  // 当提示列表变化时，滚动到顶部
  useEffect(() => {
    console.log('PromptList useEffect - 提示列表变化:', prompts.length);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeSceneId, prompts.length]);
  
  const handleAddPrompt = () => {
    setIsModalVisible(true);
  };
  
  const handleModalClose = (added = false) => {
    setIsModalVisible(false);
    
    // 如果添加了新提示，强制重新获取提示列表
    if (added) {
      console.log('添加提示后刷新列表');
      const activePrompts = getPromptsForActiveScene();
      setLocalPrompts(activePrompts);
    }
  };
  
  return (
    <div className="prompt-list-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="prompt-list-header">
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
      
      <div 
        className="prompt-list-content" 
        ref={contentRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '16px',
          height: 'calc(100% - 70px)'
        }}
      >
        {localPrompts.length === 0 ? (
          <Empty 
            description={
              !activeSceneId 
                ? "请先选择一个场景" 
                : "当前场景下没有提示，点击\"添加提示\"按钮创建"
            } 
          />
        ) : (
          localPrompts.map(prompt => (
            <PromptItem key={prompt.id} prompt={prompt} />
          ))
        )}
      </div>
      
      <AddPromptModal
        visible={isModalVisible}
        onCancel={handleModalClose}
      />
    </div>
  );
};

export default PromptList;

// 添加全局样式
// 可以在项目的全局CSS文件中添加以下样式
/*
.prompt-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.prompt-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.prompt-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.prompt-list-content .ant-empty {
  margin-top: 20%;
}
*/ 