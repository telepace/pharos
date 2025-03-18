/**
 * Tavily搜索服务
 * 参考文档: https://docs.tavily.com/documentation/quickstart
 */

interface TavilySearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

interface TavilySearchParams {
  query: string;
  search_depth?: 'basic' | 'advanced';
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
  include_answer?: boolean;
  include_raw_content?: boolean;
  include_images?: boolean;
}

/**
 * 执行Tavily搜索
 * @param params 搜索参数
 * @returns 搜索结果
 */
export const tavilySearch = async (params: TavilySearchParams): Promise<TavilySearchResult> => {
  const apiKey = process.env.REACT_APP_TAVILY_API_KEY;
  
  if (!apiKey) {
    console.error('Tavily API密钥未配置');
    throw new Error('Tavily API密钥未配置');
  }
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        api_key: apiKey,
        ...params
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily搜索请求失败: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Tavily搜索错误:', error);
    throw error;
  }
};

/**
 * 将Tavily搜索结果转换为标准格式
 * @param tavilyResult Tavily搜索结果
 * @returns 标准格式的搜索结果
 */
export const formatTavilyResults = (tavilyResult: TavilySearchResult): {
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
} => {
  return {
    results: tavilyResult.results.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content
    }))
  };
}; 