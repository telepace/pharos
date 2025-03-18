// 消息处理工具函数
import { tavilySearch, formatTavilyResults } from '../services/tavilyService';

/**
 * 解析文本中的URL链接
 * @param text 需要解析的文本
 * @returns 包含链接信息的数组
 */
export const parseLinks = (text: string): { url: string, startIndex: number, endIndex: number }[] => {
  // URL正则表达式，匹配http/https链接
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links: { url: string, startIndex: number, endIndex: number }[] = [];
  
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    links.push({
      url: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }
  
  return links;
};

/**
 * 获取链接的元数据（标题、描述等）
 * @param url 链接URL
 * @returns 链接元数据
 */
export const getLinkMetadata = async (url: string): Promise<{
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}> => {
  try {
    // 这里应该调用后端API来获取链接元数据
    // 前端直接获取可能会有CORS问题
    const response = await fetch(`/api/link-metadata?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error('获取链接元数据失败');
    }
    return await response.json();
  } catch (error) {
    console.error('获取链接元数据错误:', error);
    // 如果获取失败，至少返回域名信息
    try {
      const domain = new URL(url).hostname;
      return { domain };
    } catch {
      return {};
    }
  }
};

/**
 * 执行网络搜索
 * @param query 搜索查询
 * @param searchDepth 搜索深度，默认为basic
 * @returns 搜索结果
 */
export const performWebSearch = async (
  query: string, 
  searchDepth: 'basic' | 'advanced' = 'basic'
): Promise<{
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}> => {
  try {
    // 使用Tavily API执行搜索
    const tavilyResult = await tavilySearch({
      query,
      search_depth: searchDepth,
      max_results: 10
    });
    
    // 将Tavily结果转换为标准格式
    return formatTavilyResults(tavilyResult);
  } catch (error) {
    console.error('搜索错误:', error);
    
    // 如果Tavily搜索失败，尝试使用备用搜索API
    try {
      // 调用后端API执行搜索
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('搜索请求失败');
      }
      return await response.json();
    } catch (backupError) {
      console.error('备用搜索也失败:', backupError);
      return { results: [] };
    }
  }
};

/**
 * 文本转语音
 * @param text 要转换的文本
 * @returns 音频URL
 */
export const textToSpeech = async (text: string): Promise<string> => {
  try {
    // 调用后端API进行文本转语音
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error('文本转语音请求失败');
    }
    
    const data = await response.json();
    return data.audioUrl;
  } catch (error) {
    console.error('文本转语音错误:', error);
    throw error;
  }
};

/**
 * 语音转文本
 * @param audioBlob 音频数据
 * @returns 转换后的文本
 */
export const speechToText = async (audioBlob: Blob): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    const response = await fetch('/api/speech-to-text', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('语音转文本请求失败');
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('语音转文本错误:', error);
    throw error;
  }
}; 