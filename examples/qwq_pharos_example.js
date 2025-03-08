// 在Pharos应用中使用QWQ模型的示例
import { sendMessageToAI, LLMModel, PromptType } from '../src/services/aiService';

async function testQWQModel() {
  try {
    // 准备消息
    const messages = [
      {
        id: '1',
        content: '9.9和9.11谁大',
        role: 'user',
        timestamp: Date.now()
      }
    ];

    // 可选的系统提示
    const systemPrompt = "你是一个有用的AI助手，请回答用户的问题。";

    // 流式回调函数，用于处理流式响应
    const streamCallback = (chunk) => {
      // 在控制台输出流式响应
      process.stdout.write(chunk);
    };

    console.log('发送请求到QWQ模型...');
    
    // 调用QWQ模型
    const response = await sendMessageToAI(
      messages,
      systemPrompt,
      PromptType.SYSTEM,
      LLMModel.QWQ_PLUS,
      false,
      undefined,
      streamCallback
    );

    console.log('\n\n完整响应:');
    console.log('内容:', response.content);
    
    // 如果有思考过程，也输出
    if (response.reasoning) {
      console.log('\n思考过程:');
      console.log(response.reasoning);
    }
  } catch (error) {
    console.error('调用QWQ模型时出错:', error);
  }
}

testQWQModel(); 