// 环境变量工具函数

// 获取环境变量，如果不存在则返回默认值
export const getEnvVariable = (key: string, defaultValue: string = ''): string => {
  return process.env[`REACT_APP_${key}`] || defaultValue;
};

// 检查环境变量是否存在
export const hasEnvVariable = (key: string): boolean => {
  return !!process.env[`REACT_APP_${key}`];
};

// 获取所有AI相关的环境变量
export const getAIEnvVariables = () => {
  return {
    openai: {
      apiKey: getEnvVariable('OPENAI_API_KEY'),
      baseUrl: getEnvVariable('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    },
    claude: {
      apiKey: getEnvVariable('CLAUDE_API_KEY'),
      baseUrl: getEnvVariable('CLAUDE_BASE_URL', 'https://api.anthropic.com')
    },
    gemini: {
      apiKey: getEnvVariable('GEMINI_API_KEY'),
      baseUrl: getEnvVariable('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta')
    },
    deepseek: {
      apiKey: getEnvVariable('DEEPSEEK_API_KEY'),
      baseUrl: getEnvVariable('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')
    },
    huoshan: {
      apiKey: getEnvVariable('HUOSHAN_API_KEY'),
      baseUrl: getEnvVariable('HUOSHAN_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3')
    }
  };
};

// 检查是否配置了任何AI提供商
export const hasAnyAIConfigured = (): boolean => {
  return hasEnvVariable('OPENAI_API_KEY') || 
         hasEnvVariable('CLAUDE_API_KEY') || 
         hasEnvVariable('GEMINI_API_KEY') ||
         hasEnvVariable('DEEPSEEK_API_KEY') ||
         hasEnvVariable('HUOSHAN_API_KEY');
}; 