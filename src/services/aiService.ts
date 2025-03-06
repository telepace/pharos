import { Message, LLMModel } from '../types';

// 这里使用模拟的AI响应，实际项目中应该连接到OpenAI API或其他LLM API
export const sendMessageToAI = async (
  messages: Message[],
  promptContent: string | null,
  model: LLMModel = LLMModel.GPT35
): Promise<string> => {
  // 在实际项目中，这里应该是API调用
  // 例如：
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${API_KEY}`
  //   },
  //   body: JSON.stringify({
  //     model,
  //     messages: [
  //       ...(promptContent ? [{ role: 'system', content: promptContent }] : []),
  //       ...messages.map(msg => ({ role: msg.role, content: msg.content }))
  //     ]
  //   })
  // });
  // const data = await response.json();
  // return data.choices[0].message.content;

  // 模拟API响应延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 获取最后一条用户消息
  const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
  
  if (!lastUserMessage) {
    return "我没有收到您的消息，请重新输入。";
  }
  
  // 模拟AI响应
  let response = `这是对"${lastUserMessage.content}"的模拟回复。`;
  
  // 如果有prompt，在回复中提及
  if (promptContent) {
    response += `\n\n(使用了以下prompt: "${promptContent.substring(0, 50)}${promptContent.length > 50 ? '...' : ''}")`;
  }
  
  // 提及使用的模型
  response += `\n\n(使用模型: ${model})`;
  
  return response;
}; 