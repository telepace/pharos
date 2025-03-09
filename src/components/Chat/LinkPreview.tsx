import React, { useEffect, useState } from 'react';
import { Card, Skeleton, Typography, Space } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { getLinkMetadata } from '../../utils/messageUtils';

const { Text, Paragraph } = Typography;

interface LinkPreviewProps {
  url: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [metadata, setMetadata] = useState<{
    title?: string;
    description?: string;
    image?: string;
    domain?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const data = await getLinkMetadata(url);
        setMetadata(data);
        setError(false);
      } catch (err) {
        console.error('获取链接预览失败:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  // 提取域名显示
  const displayDomain = metadata.domain || new URL(url).hostname;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      style={{ textDecoration: 'none', display: 'block', marginTop: 8, marginBottom: 8 }}
    >
      <Card 
        size="small" 
        hoverable 
        style={{ 
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e8e8e8',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)'
        }}
        bodyStyle={{ padding: 12 }}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : error ? (
          <Space>
            <LinkOutlined />
            <Text>{url}</Text>
          </Space>
        ) : (
          <div style={{ display: 'flex' }}>
            {metadata.image && (
              <div style={{ 
                flexShrink: 0, 
                width: 80, 
                height: 80, 
                marginRight: 12,
                backgroundImage: `url(${metadata.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 4
              }} />
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Text strong ellipsis style={{ fontSize: 14 }}>
                {metadata.title || url}
              </Text>
              {metadata.description && (
                <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>
                  {metadata.description}
                </Paragraph>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                <LinkOutlined style={{ marginRight: 4 }} />
                {displayDomain}
              </Text>
            </div>
          </div>
        )}
      </Card>
    </a>
  );
};

export default LinkPreview; 