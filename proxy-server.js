const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();

// 启用CORS
app.use(cors());

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
  }
}));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
});