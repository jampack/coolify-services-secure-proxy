const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const SERVICE_NAME = process.env.SERVICE_NAME || "secure-api-proxy";

if (!TARGET_URL) {
  console.error("ERROR: TARGET_URL environment variable is required");
  process.exit(1);
}

if (!BEARER_TOKEN) {
  console.error("ERROR: BEARER_TOKEN environment variable is required");
  process.exit(1);
}

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint (no auth required) - must be defined before auth middleware
app.get("/proxy/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

// Bearer token authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Bearer token required" });
  }

  const token = authHeader.substring(7);

  if (token !== BEARER_TOKEN) {
    return res.status(403).json({ error: "Forbidden: Invalid token" });
  }

  next();
};

// Apply authentication to all routes except /proxy/health
app.use((req, res, next) => {
  if (req.path === "/proxy/health") {
    return next();
  }
  authenticate(req, res, next);
});

// Proxy configuration
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  filter: (pathname, req) => {
    // Exclude /proxy/health from proxying
    return pathname !== "/proxy/health";
  },
  onProxyReq: (proxyReq, req, res) => {
    // Remove authorization header before forwarding to target service
    proxyReq.removeHeader("authorization");

    // Forward original headers (except authorization)
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error("Proxy error:", err.message);
    res.status(502).json({
      error: "Bad Gateway",
      message: "Failed to connect to target service",
    });
  },
  logLevel: "warn",
};

// Proxy all routes to target service (paths forwarded as-is)
app.use("/", createProxyMiddleware(proxyOptions));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Secure API Proxy running on port ${PORT}`);
  console.log(`Proxying to target service at: ${TARGET_URL}`);
  console.log("Bearer token authentication enabled");
});
