import React, { useState } from 'react';
import { Input, Button, Card, List, Typography, Space, Spin, Empty } from 'antd';
import { SearchOutlined, LinkOutlined, LoadingOutlined } from '@ant-design/icons';
import { performWebSearch } from '../../utils/messageUtils';

const { Text, Paragraph } = Typography;
const { Search } = Input;

interface WebSearchProps {
  onSearchComplete: (query: string, results: Array<{ title: string; url: string; snippet: string }>) => void;
}

const WebSearch: React.FC<WebSearchProps> = ({ onSearchComplete }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (value: string) => {
    if (!value.trim()) return;
    
    setLoading(true);
    setQuery(value);
    
    try {
      const searchResults = await performWebSearch(value);
      setResults(searchResults.results);
      setSearched(true);
      
      // 回调通知父组件搜索完成
      onSearchComplete(value, searchResults.results);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <SearchOutlined />
          <span>网络搜索</span>
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
            onClick={() => onSearchComplete(query, results)}
          >
            引用搜索结果
          </Button>
        </div>
      )}
    </Card>
  );
};

export default WebSearch; 