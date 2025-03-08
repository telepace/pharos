import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Statistic, Row, Col, Divider, Alert, Spin, Empty } from 'antd';
import { initLangfuse } from '../../services/langfuseService';

const { Title, Paragraph, Text, Link } = Typography;

const MonitoringDashboard: React.FC = () => {
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const langfuseHost = process.env.REACT_APP_LANGFUSE_HOST || 'https://cloud.langfuse.com';

  useEffect(() => {
    // 检查 Langfuse 是否已配置
    const langfuse = initLangfuse();
    setIsMonitoringEnabled(!!langfuse);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }}>正在加载监控信息...</Paragraph>
      </div>
    );
  }

  if (!isMonitoringEnabled) {
    return (
      <Card>
        <Empty
          description={
            <span>
              监控服务未启用。请在 <code>.env</code> 文件中配置 Langfuse 相关环境变量。
            </span>
          }
        />
        <Alert
          message="配置说明"
          description={
            <>
              <p>请在 <code>.env</code> 文件中添加以下配置：</p>
              <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
                {`REACT_APP_LANGFUSE_SECRET_KEY=''
REACT_APP_LANGFUSE_PUBLIC_KEY=''
REACT_APP_LANGFUSE_HOST='https://cloud.langfuse.com'`}
              </pre>
              <p>您可以在 <a href="https://langfuse.com" target="_blank" rel="noopener noreferrer">Langfuse 官网</a> 注册并获取密钥。</p>
            </>
          }
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card>
      <Title level={3}>AI 监控仪表板</Title>
      <Paragraph>
        通过 Langfuse 监控您的 AI 应用，跟踪性能、用户反馈和错误。
      </Paragraph>

      <Divider />

      <Row gutter={16}>
        <Col span={8}>
          <Statistic title="监控状态" value="已启用" valueStyle={{ color: '#3f8600' }} />
        </Col>
        <Col span={8}>
          <Statistic title="服务提供商" value="Langfuse" />
        </Col>
        <Col span={8}>
          <Statistic title="数据收集" value="实时" />
        </Col>
      </Row>

      <Divider />

      <Title level={4}>监控内容</Title>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small" title="请求跟踪">
            <ul>
              <li>AI 请求和响应</li>
              <li>模型使用情况</li>
              <li>Token 消耗</li>
            </ul>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="用户反馈">
            <ul>
              <li>用户评分（点赞/点踩）</li>
              <li>详细反馈评论</li>
              <li>满意度分析</li>
            </ul>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="错误监控">
            <ul>
              <li>API 错误</li>
              <li>请求失败</li>
              <li>异常情况</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={4}>访问仪表板</Title>
      <Paragraph>
        点击下方按钮访问 Langfuse 仪表板，查看详细的监控数据和分析报告。
      </Paragraph>
      <Button 
        type="primary" 
        href={langfuseHost} 
        target="_blank"
        rel="noopener noreferrer"
      >
        打开 Langfuse 仪表板
      </Button>

      <Divider />

      <Alert
        message="提示"
        description="监控数据会实时收集，但可能需要几分钟才能在 Langfuse 仪表板中显示。"
        type="info"
        showIcon
      />
    </Card>
  );
};

export default MonitoringDashboard; 