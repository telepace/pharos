import { useState, useEffect } from 'react';
import { LLMModel } from '../types';

interface ModelStatus {
  isAvailable: boolean;
  reason?: string;
}

// 创建初始状态对象
const getInitialModelStatus = (): Record<LLMModel, ModelStatus> => {
  const initialStatus: ModelStatus = {
    isAvailable: false,
    reason: undefined
  };

  // 创建一个包含所有 LLMModel 枚举值的记录
  const allModelStatus: Record<LLMModel, ModelStatus> = {} as Record<LLMModel, ModelStatus>;
  
  // 为每个模型设置初始状态
  Object.values(LLMModel).forEach(model => {
    allModelStatus[model] = initialStatus;
  });

  return allModelStatus;
};

export const useModelStatus = () => {
  // 使用创建的初始状态
  const [modelStatuses, setModelStatuses] = useState<Record<LLMModel, ModelStatus>>(
    getInitialModelStatus()
  );

  const checkModelStatus = async (model: LLMModel): Promise<ModelStatus> => {
    // 直接返回模型可用状态，移除网络请求逻辑
    return {
      isAvailable: true, // 或者根据实际需求设置为 false
      reason: '',
    };
  };

  useEffect(() => {
    const updateModelStatuses = async () => {
      const newStatuses = getInitialModelStatus(); // 创建新的状态对象
      
      for (const model of Object.values(LLMModel)) {
        newStatuses[model] = await checkModelStatus(model);
      }
      
      setModelStatuses(newStatuses);
    };

    updateModelStatuses();
  }, []);

  const getModelStatus = (model: LLMModel): ModelStatus => {
    return modelStatuses[model] || { isAvailable: false, reason: '未知状态' };
  };

  return { getModelStatus };
}; 