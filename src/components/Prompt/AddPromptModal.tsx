import React, { useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import { Prompt, LLMModel } from '../../types';
import { usePromptContext } from '../../contexts/PromptContext';
import { useSceneContext } from '../../contexts/SceneContext';

const { TextArea } = Input;
const { Option } = Select;

interface AddPromptModalProps {
  visible: boolean;
  onCancel: () => void;
  editMode?: boolean;
  initialValues?: Prompt;
}

const AddPromptModal: React.FC<AddPromptModalProps> = ({
  visible,
  onCancel,
  editMode = false,
  initialValues
}) => {
  const [form] = Form.useForm();
  const { addPrompt, updatePrompt } = usePromptContext();
  const { activeSceneId } = useSceneContext();
  
  useEffect(() => {
    if (visible) {
      if (editMode && initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          content: initialValues.content,
          model: initialValues.model
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, editMode, initialValues, form]);
  
  const handleOk = () => {
    form.validateFields().then(values => {
      if (editMode && initialValues) {
        updatePrompt(
          initialValues.id,
          values.name,
          values.content,
          values.model
        );
      } else if (activeSceneId) {
        addPrompt(
          values.name,
          values.content,
          values.model,
          activeSceneId
        );
      }
      
      form.resetFields();
      onCancel();
    });
  };
  
  return (
    <Modal
      title={editMode ? "编辑提示" : "添加提示"}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="name"
          label="提示名称"
          rules={[{ required: true, message: '请输入提示名称' }]}
        >
          <Input placeholder="例如：专业写作助手、代码优化器" />
        </Form.Item>
        
        <Form.Item
          name="content"
          label="提示内容"
          rules={[{ required: true, message: '请输入提示内容' }]}
        >
          <TextArea
            placeholder="输入提示内容..."
            autoSize={{ minRows: 4, maxRows: 8 }}
          />
        </Form.Item>
        
        <Form.Item
          name="model"
          label="LLM模型"
          initialValue={LLMModel.GPT35}
          rules={[{ required: true, message: '请选择LLM模型' }]}
        >
          <Select>
            <Option value={LLMModel.GPT35}>GPT-3.5 Turbo</Option>
            <Option value={LLMModel.GPT4}>GPT-4</Option>
            <Option value={LLMModel.CLAUDE3_OPUS}>Claude 3 Opus</Option>
            <Option value={LLMModel.CLAUDE3_SONNET}>Claude 3 Sonnet</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddPromptModal; 