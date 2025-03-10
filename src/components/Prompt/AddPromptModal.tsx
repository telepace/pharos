import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Radio } from 'antd';
import { Prompt, LLMModel, PromptType } from '../../types';
import { usePromptContext } from '../../contexts/PromptContext';
import { useSceneContext } from '../../contexts/SceneContext';
import { useModelStatus } from '../../hooks/useModelStatus';

const { TextArea } = Input;
const { Option } = Select;

interface AddPromptModalProps {
  visible: boolean;
  onCancel: (added?: boolean) => void;
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
  const { getModelStatus } = useModelStatus();
  
  useEffect(() => {
    if (visible) {
      if (editMode && initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          content: initialValues.content,
          model: initialValues.model,
          type: initialValues.type || PromptType.SYSTEM
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: PromptType.SYSTEM
        });
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
          values.model,
          values.type
        );
        onCancel(false);
      } else if (activeSceneId) {
        const newPrompt = addPrompt(
          values.name,
          values.content,
          values.model,
          activeSceneId,
          values.type
        );
        
        console.log('成功添加新提示:', newPrompt);
        
        onCancel(true);
      }
      
      form.resetFields();
    }).catch(info => {
      console.log('验证失败:', info);
    });
  };
  
  const renderModelOption = (model: LLMModel) => {
    const { isAvailable, reason } = getModelStatus(model);
    return (
      <Option 
        value={model} 
        disabled={!isAvailable}
      >
        {model}
        {!isAvailable && (
          <span style={{ color: '#ff4d4f', marginLeft: 8 }}>
            ({reason})
          </span>
        )}
      </Option>
    );
  };

  return (
    <Modal
      title={editMode ? "编辑提示" : "添加提示"}
      open={visible}
      onOk={handleOk}
      onCancel={() => onCancel(false)}
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
          name="type"
          label="提示类型"
          rules={[{ required: true, message: '请选择提示类型' }]}
          initialValue={PromptType.SYSTEM}
        >
          <Radio.Group>
            <Radio value={PromptType.SYSTEM}>
              系统提示（需要用户输入）
            </Radio>
            <Radio value={PromptType.DIRECT}>
              直接发送（点击选项→直接将prompt内容作为用户query发送入聊天窗口）
            </Radio>
          </Radio.Group>
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
            {/* OpenAI 模型 */}
            <Select.OptGroup label="OpenAI">
              {renderModelOption(LLMModel.GPT35)}
              {renderModelOption(LLMModel.GPT4)}
              {renderModelOption(LLMModel.GPT4_TURBO)}
              {renderModelOption(LLMModel.GPT4O)}
              {renderModelOption(LLMModel.GPT4O_MINI)}
              {renderModelOption(LLMModel.GPT4O_MINI_CA)}
              {renderModelOption(LLMModel.O3_MINI)}
            </Select.OptGroup>

            {/* Claude 模型 */}
            <Select.OptGroup label="Claude">
              {renderModelOption(LLMModel.CLAUDE3_OPUS)}
              {renderModelOption(LLMModel.CLAUDE3_SONNET)}
              {renderModelOption(LLMModel.CLAUDE3_HAIKU)}
              {renderModelOption(LLMModel.CLAUDE_3_7_SONNET)}
              {renderModelOption(LLMModel.CLAUDE_3_5_HAIKU)}
            </Select.OptGroup>

            {/* Gemini 模型 */}
            <Select.OptGroup label="Gemini">
              {renderModelOption(LLMModel.GEMINI_PRO)}
              {renderModelOption(LLMModel.GEMINI_PRO_VISION)}
              {renderModelOption(LLMModel.GEMINI_2_FLASH)}
              {renderModelOption(LLMModel.GEMINI_1_5_FLASH)}
            </Select.OptGroup>

            {/* DeepSeek 模型 */}
            <Select.OptGroup label="DeepSeek">
              {renderModelOption(LLMModel.DEEPSEEK_REASONER)}
              {renderModelOption(LLMModel.DEEPSEEK_CHAT)}
            </Select.OptGroup>

            {/* 火山模型 */}
            <Select.OptGroup label="火山">
              {renderModelOption(LLMModel.HUOSHAN_DEEPSEEK_R1)}
              {renderModelOption(LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_32B)}
              {renderModelOption(LLMModel.HUOSHAN_DEEPSEEK_R1_QWEN_7B)}
              {renderModelOption(LLMModel.HUOSHAN_DEEPSEEK_V3)}
            </Select.OptGroup>

            {/* 通义千问 */}
            <Select.OptGroup label="通义千问">
              {renderModelOption(LLMModel.QWEN_PLUS)}
              {renderModelOption(LLMModel.QWEN_PLUS_LATEST)}
              {renderModelOption(LLMModel.QWEN_MAX)}
              {renderModelOption(LLMModel.QWQ_PLUS)}
            </Select.OptGroup>
            
            {/* OpenRouter模型 */}
            <Select.OptGroup label="OpenRouter">
              {renderModelOption(LLMModel.OPENROUTER_GEMINI_FLASH)}
              {renderModelOption(LLMModel.OPENROUTER_CLAUDE_OPUS)}
              {renderModelOption(LLMModel.OPENROUTER_LLAMA)}
              {renderModelOption(LLMModel.OPENROUTER_MIXTRAL)}
            </Select.OptGroup>

            {/* 其他模型 */}
            <Select.OptGroup label="其他">
              {renderModelOption(LLMModel.GROK_3)}
            </Select.OptGroup>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddPromptModal; 