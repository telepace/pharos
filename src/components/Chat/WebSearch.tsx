import React, { useState } from 'react';
import { Input, Button, Card, List, Typography, Space, Spin, Empty, Select, message } from 'antd';
import { SearchOutlined, LinkOutlined, LoadingOutlined, SettingOutlined } from '@ant-design/icons';
import { performWebSearch } from '../../utils/messageUtils';

const { Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface WebSearchProps {
  onSearchComplete: (query: string, results: Array<{ title: string; url: string; snippet: string }>) => void;
}

const WebSearch: React.FC<WebSearchProps> = ({ onSearchComplete }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchDepth, setSearchDepth] = useState<'basic' | 'advanced'>('basic');
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (value: string) => {
    if (!value.trim()) return;
    
    setLoading(true);
    setQuery(value);
    setError(null);
    
    try {
      // 传递searchDepth参数
      const searchResults = await performWebSearch(value, searchDepth);
      setResults(searchResults.results);
      setSearched(true);
      
      // 不在这里调用onSearchComplete，等待用户点击"引用搜索结果"按钮
    } catch (error) {
      console.error('搜索失败:', error);
      setError(error instanceof Error ? error.message : '搜索过程中发生未知错误');
      message.error('搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDepthChange = (value: 'basic' | 'advanced') => {
    setSearchDepth(value);
  };

  // 处理用户点击引用搜索结果按钮
  const handleUseResults = () => {
    onSearchComplete(query, results);
  };

  return (
    <Card 
      title={
        <Space>
          <SearchOutlined />
          <span>网络搜索</span>
        </Space>
      }
      extra={
        <Space>
          <Select 
            value={searchDepth} 
            onChange={handleDepthChange}
            style={{ width: 120 }}
          >
            <Option value="basic">基础搜索</Option>
            <Option value="advanced">深度搜索</Option>
          </Select>
          <SettingOutlined />
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      <Search
        placeholder="输入搜索关键词..."
        enterButton="搜索"
        size="middle"
        loading={loading}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <div style={{ marginTop: 8 }}>正在搜索中...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#ff4d4f' }}>
          <div>搜索出错</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>{error}</div>
          <Button type="primary" size="small" style={{ marginTop: 16 }} onClick={() => handleSearch(query)}>
            重试
          </Button>
        </div>
      ) : searched && results.length === 0 ? (
        <Empty description="未找到相关结果" />
      ) : (
        <List
          itemLayout="vertical"
          size="small"
          dataSource={results}
          renderItem={(item) => (
            <List.Item>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#1890ff', fontWeight: 500 }}
              >
                {item.title}
              </a>
              <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                <LinkOutlined style={{ fontSize: 12, color: '#52c41a', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                  {item.url}
                </Text>
              </div>
              <Paragraph 
                ellipsis={{ rows: 2 }} 
                style={{ fontSize: 14, margin: 0 }}
              >
                {item.snippet}
              </Paragraph>
            </List.Item>
          )}
        />
      )}
      
      {results.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button 
            type="primary" 
            size="small"
            onClick={handleUseResults}
          >
            引用搜索结果
          </Button>
        </div>
      )}
    </Card>
  );
};

export default WebSearch; 