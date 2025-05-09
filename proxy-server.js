if (typeof ReadableStream === 'undefined') {
  const { ReadableStream } = require('stream/web');
  global.ReadableStream = ReadableStream;
}

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');
const { Readable } = require('stream');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// 启用CORS
app.use(cors());

// 解析JSON请求体
app.use(bodyParser.json());

// 配置文件上传
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 限制10MB
});

// 创建临时目录
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// 火山API代理
app.use('/api/huoshan', createProxyMiddleware({
  target: 'https://ark.cn-beijing.volces.com/api/v3',
  changeOrigin: true,
  pathRewrite: {
    '^/api/huoshan': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    // 添加详细的请求日志
    console.log('发送火山API请求:', {
      method: req.method,
      path: req.path,
      body: req.body
    });

    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
    
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // 添加详细的响应处理
    let responseBody = '';
    
    proxyRes.on('data', function(chunk) {
      responseBody += chunk;
    });
    
    proxyRes.on('end', function() {
      try {
        // 尝试解析响应
        const parsedBody = JSON.parse(responseBody);
        console.log('火山API响应:', parsedBody);
      } catch (error) {
        console.error('火山API响应解析失败:', {
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          rawBody: responseBody,
          error: error.message,
          requestDetails: {
            method: req.method,
            path: req.path,
            headers: req.headers,
            body: req.body
          }
        });
        
        // 如果是非JSON响应，尝试直接返回原始响应
        if (proxyRes.headers['content-type'] && !proxyRes.headers['content-type'].includes('application/json')) {
          console.log('收到非JSON响应，content-type:', proxyRes.headers['content-type']);
        }
      }
    });

    if (req.body && req.body.stream === true) {
      proxyRes.headers['Cache-Control'] = 'no-cache';
      proxyRes.headers['Connection'] = 'keep-alive';
      proxyRes.headers['Content-Type'] = 'text/event-stream';
    }
  },
  onError: (err, req, res) => {
    console.error('火山API代理错误:', {
      error: err.message,
      stack: err.stack,
      request: {
        method: req.method,
        path: req.path,
        body: req.body
      }
    });
    
    res.writeHead(500, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      error: {
        message: `火山API请求失败: ${err.message}`,
        code: 'HUOSHAN_API_ERROR',
        details: err.stack
      }
    }));
  }
}));

// 代理AI API请求
app.post('/api/ai/:provider', async (req, res) => {
  const { provider } = req.params;
  const { endpoint, headers, data } = req.body;
  
  try {
    const response = await axios({
      method: 'post',
      url: endpoint,
      headers,
      data,
      responseType: req.query.stream === 'true' ? 'stream' : 'json'
    });
    
    if (req.query.stream === 'true') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      response.data.pipe(res);
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error(`Error proxying to ${provider}:`, error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: true,
        message: error.message,
        data: error.response.data
      });
    } else {
      res.status(500).json({
        error: true,
        message: error.message
      });
    }
  }
});

// 获取链接元数据
app.get('/api/link-metadata', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL参数是必需的' });
  }
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    });
    
    const $ = cheerio.load(response.data);
    
    // 提取元数据
    const metadata = {
      title: $('title').text() || $('meta[property="og:title"]').attr('content') || '',
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      domain: new URL(url).hostname
    };
    
    res.json(metadata);
  } catch (error) {
    console.error('获取链接元数据失败:', error.message);
    res.status(500).json({ 
      error: '获取链接元数据失败',
      domain: new URL(url).hostname
    });
  }
});

// 网络搜索API
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: '搜索查询是必需的' });
  }
  
  try {
    const tavilyApiKey = process.env.REACT_APP_TAVILY_API_KEY;
    if (!tavilyApiKey) {
      throw new Error('Tavily API key not configured');
    }

    const response = await axios.post('https://api.tavily.com/search', {
      query: q,
      search_depth: "advanced",
      include_answer: true,
      include_domains: [],
      exclude_domains: [],
      max_results: 5
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': tavilyApiKey
      }
    });

    // 直接返回Tavily的搜索结果
    res.json(response.data);
  } catch (error) {
    console.error('Tavily搜索失败:', error.message);
    res.status(500).json({ 
      error: '搜索请求失败',
      details: error.message
    });
  }
});

// 文本转语音API
app.post('/api/text-to-speech', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: '文本内容是必需的' });
  }
  
  try {
    // 这里应该集成实际的TTS API，如Google TTS、Azure等
    // 以下是模拟的音频URL
    const audioFileName = `speech_${Date.now()}.mp3`;
    const audioFilePath = path.join(tempDir, audioFileName);
    
    // 模拟生成音频文件（实际应用中应调用TTS API）
    fs.writeFileSync(audioFilePath, 'dummy audio content');
    
    // 返回音频URL
    const audioUrl = `/api/audio/${audioFileName}`;
    
    // 模拟处理延迟
    setTimeout(() => {
      res.json({ audioUrl });
    }, 1000);
  } catch (error) {
    console.error('文本转语音失败:', error.message);
    res.status(500).json({ error: '文本转语音请求失败' });
  }
});

// 语音转文本API
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '音频文件是必需的' });
  }
  
  try {
    // 这里应该集成实际的STT API，如Google STT、Azure等
    // 以下是模拟的转录结果
    
    // 模拟处理延迟
    setTimeout(() => {
      res.json({ 
        text: '这是从语音中识别出的文本内容。实际应用中，这里会返回真实的语音识别结果。' 
      });
    }, 2000);
  } catch (error) {
    console.error('语音转文本失败:', error.message);
    res.status(500).json({ error: '语音转文本请求失败' });
  }
});

// 提供临时音频文件
app.get('/api/audio/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(tempDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: '音频文件不存在' });
  }
});

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

// 启动服务器
app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`支持流式输出的API代理已启动`);
});