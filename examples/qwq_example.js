import OpenAI from "openai";
import process from 'process';

// 初始化 openai 客户端
const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY, // 从环境变量读取
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

let reasoningContent = '';
let answerContent = '';
let isAnswering = false;

async function main() {
    try {
        const stream = await openai.chat.completions.create({
            model: 'qwq-32b',
            messages: [{ role: 'user', content: '9.9和9.11谁大' }],
            stream: true,
            incremental_output: true
        });

        console.log('\n' + '='.repeat(20) + '思考过程' + '='.repeat(20) + '\n');

        for await (const chunk of stream) {
            if (!chunk.choices?.length) {
                console.log('\nUsage:');
                console.log(chunk.usage);
                continue;
            }

            const delta = chunk.choices[0].delta;
            
            // 处理思考过程
            if (delta.reasoning_content) {
                process.stdout.write(delta.reasoning_content);
                reasoningContent += delta.reasoning_content;
            } 
            // 处理正式回复
            else if (delta.content) {
                if (!isAnswering) {
                    console.log('\n' + '='.repeat(20) + '完整回复' + '='.repeat(20) + '\n');
                    isAnswering = true;
                }
                process.stdout.write(delta.content);
                answerContent += delta.content;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 