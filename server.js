const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const BEARER_TOKEN = process.env.BEARER_TOKEN;

if (!BEARER_TOKEN) {
  console.error('ERROR: BEARER_TOKEN environment variable is required');
  process.exit(1);
}

// Middleware to parse JSON bodies
app.use(express.json());

// Bearer token authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Bearer token required' });
  }
  
  const token = authHeader.substring(7);
  
  if (token !== BEARER_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
  
  next();
};

// Apply authentication to all routes
app.use(authenticate);

// Proxy configuration
const proxyOptions = {
  target: OLLAMA_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // Keep /api prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    // Remove authorization header before forwarding to Ollama
    proxyReq.removeHeader('authorization');
    
    // Forward original headers (except authorization)
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ 
      error: 'Bad Gateway', 
      message: 'Failed to connect to Ollama service' 
    });
  },
  logLevel: 'warn',
};

// Proxy all /api/* routes to Ollama
app.use('/api', createProxyMiddleware(proxyOptions));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ollama-proxy' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    service: 'Ollama API Proxy',
    version: '1.0.0',
    message: 'Use /api/* endpoints to access Ollama API'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ollama Proxy Server running on port ${PORT}`);
  console.log(`Proxying to Ollama at: ${OLLAMA_URL}`);
  console.log('Bearer token authentication enabled');
});

