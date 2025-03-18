/**
 * 搜索服务
 * 用于判断消息是否需要联网搜索，并提供搜索功能
 */
import { tavilySearch, formatTavilyResults } from './tavilyService';

/**
 * 判断消息是否需要联网搜索
 * @param message 用户消息
 * @returns 是否需要联网搜索
 */
export const shouldPerformWebSearch = (message: string): boolean => {
  // 消息内容为空，不需要搜索
  if (!message.trim()) return false;
  
  // 关键词匹配
  const searchKeywords = [
    '最新', '最近', '新闻', '今天', '昨天', '本周', '本月',
    '现在', '目前', '当前', '实时', '最新消息', '最新动态',
    '最新情况', '最新进展', '最新发展', '最新趋势',
    '查询', '搜索', '查找', '查看', '了解', '获取',
    '多少', '怎么样', '如何', '是什么', '为什么',
    '发生了什么', '有什么', '什么情况',
    '最新版本', '最新版', '最新消息',
    '股价', '股市', '行情', '价格', '汇率', '天气',
    '疫情', '比赛', '赛事', '结果', '比分',
    '发布', '发表', '公布', '宣布', '宣告',
    '最新研究', '最新发现', '最新技术', '最新产品',
    '最新报告', '最新数据', '最新统计',
    '今日', '本日', '当日', '近期', '最近'
  ];
  
  // 时间相关关键词
  const timeKeywords = [
    '2023年', '2024年', '2025年',
    '2023', '2024', '2025',
    '今年', '去年', '明年',
    '上个月', '这个月', '下个月',
    '上周', '这周', '下周',
    '今天', '昨天', '明天',
    '现在', '目前', '当前'
  ];
  
  // 问题模式匹配
  const questionPatterns = [
    /最近.*?有什么/,
    /最新.*?是什么/,
    /现在.*?怎么样/,
    /目前.*?情况/,
    /当前.*?状态/,
    /最近发生了什么/,
    /最新.*?消息/,
    /最新.*?动态/,
    /最新.*?进展/,
    /最新.*?发展/,
    /最新.*?趋势/,
    /最新.*?版本/,
    /最新.*?版/,
    /最新.*?研究/,
    /最新.*?发现/,
    /最新.*?技术/,
    /最新.*?产品/,
    /最新.*?报告/,
    /最新.*?数据/,
    /最新.*?统计/
  ];
  
  // 检查关键词
  for (const keyword of searchKeywords) {
    if (message.includes(keyword)) {
      return true;
    }
  }
  
  // 检查时间关键词
  for (const timeKeyword of timeKeywords) {
    if (message.includes(timeKeyword)) {
      return true;
    }
  }
  
  // 检查问题模式
  for (const pattern of questionPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // 默认不需要搜索
  return false;
};

/**
 * 执行自动网络搜索
 * @param message 用户消息
 * @returns 搜索结果
 */
export const performAutoWebSearch = async (message: string): Promise<{
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
} | null> => {
  // 判断是否需要搜索
  if (!shouldPerformWebSearch(message)) {
    return null;
  }
  
  try {
    // 使用消息内容作为搜索查询
    const query = message.trim();
    
    // 执行搜索
    const tavilyResult = await tavilySearch({
      query,
      search_depth: 'basic',
      max_results: 5
    });
    
    // 格式化结果
    const formattedResults = formatTavilyResults(tavilyResult);
    
    // 返回搜索结果
    return {
      query,
      results: formattedResults.results
    };
  } catch (error) {
    console.error('自动搜索错误:', error);
    return null;
  }
}; 