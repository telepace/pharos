const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// 启用CORS
app.use(cors());

// 解析JSON请求体
app.use(bodyParser.json());

// 火山API代理
app.use('/api/huoshan', createProxyMiddleware({
  target: 'https://ark.cn-beijing.volces.com/api/v3',
  changeOrigin: true,
  pathRewrite: {
    '^/api/huoshan': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // 转发原始请求头
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    
    // 如果请求体已被解析，需要重新写入到代理请求中
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  // 支持流式响应
  selfHandleResponse: false,
  // 确保流式响应能够正确传递
  onProxyRes: (proxyRes, req, res) => {
    // 如果是流式响应，确保正确设置响应头
    if (req.body && req.body.stream === true) {
      proxyRes.headers['Cache-Control'] = 'no-cache';
      proxyRes.headers['Connection'] = 'keep-alive';
      proxyRes.headers['Content-Type'] = 'text/event-stream';
    }
  },
  // 处理代理错误
  onError: (err, req, res) => {
    console.error('代理请求错误:', err);
    res.writeHead(500, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      error: {
        message: `代理请求错误: ${err.message}`,
        code: 'PROXY_ERROR'
      }
    }));
  }
}));

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: {
      message: '服务器内部错误',
      details: err.message
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`支持流式输出的API代理已启动`);
});