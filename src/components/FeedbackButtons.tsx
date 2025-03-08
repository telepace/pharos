import React, { useState } from 'react';
import { Button, Tooltip, Modal, Input, message } from 'antd';
import { LikeOutlined, DislikeOutlined, LikeFilled, DislikeFilled } from '@ant-design/icons';
import { getOrCreateTrace, trackFeedback } from '../services/langfuseService';

const { TextArea } = Input;

interface FeedbackButtonsProps {
  observationId: string;
  conversationId: string;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ observationId, conversationId }) => {
  const [feedback, setFeedback] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [comment, setComment] = useState('');

  const handleFeedback = (value: number) => {
    // 如果已经选择了相同的反馈，则取消选择
    if (feedback === value) {
      setFeedback(null);
      return;
    }

    setFeedback(value);
    setIsModalVisible(true);
  };

  const handleSubmit = () => {
    if (feedback === null) return;

    // 获取跟踪对象
    const trace = getOrCreateTrace(conversationId);
    if (trace) {
      // 记录反馈
      trackFeedback(trace, observationId, feedback, comment);
      
      // 显示成功消息
      message.success('感谢您的反馈！');
    } else {
      message.warning('无法记录反馈，监控服务未启用');
    }

    // 关闭模态框并清空评论
    setIsModalVisible(false);
    setComment('');
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setComment('');
  };

  return (
    <div className="feedback-buttons" style={{ marginTop: 8 }}>
      <Tooltip title="有帮助">
        <Button
          type="text"
          icon={feedback === 1 ? <LikeFilled /> : <LikeOutlined />}
          onClick={() => handleFeedback(1)}
          style={{ color: feedback === 1 ? '#1890ff' : undefined }}
        />
      </Tooltip>
      <Tooltip title="没帮助">
        <Button
          type="text"
          icon={feedback === -1 ? <DislikeFilled /> : <DislikeOutlined />}
          onClick={() => handleFeedback(-1)}
          style={{ color: feedback === -1 ? '#ff4d4f' : undefined }}
        />
      </Tooltip>

      <Modal
        title="提供详细反馈"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        okText="提交"
        cancelText="取消"
      >
        <p>您对这个回答{feedback === 1 ? '满意' : '不满意'}，请告诉我们原因：</p>
        <TextArea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="请输入您的反馈（可选）"
        />
      </Modal>
    </div>
  );
};

export default FeedbackButtons; 