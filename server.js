const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_URL = process.env.TARGET_URL;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const TARGET_SERVICE_NAME = process.env.TARGET_SERVICE_NAME || "target-service";

// CORS configuration
const CORS_ENABLED = process.env.CORS_ENABLED === "true";
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];
const CORS_ALLOWED_METHODS =
  process.env.CORS_ALLOWED_METHODS || "GET,POST,PUT,DELETE,PATCH,OPTIONS";
const CORS_ALLOWED_HEADERS =
  process.env.CORS_ALLOWED_HEADERS || "Content-Type,Authorization";
const CORS_CREDENTIALS = process.env.CORS_CREDENTIALS === "true";

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

// CORS middleware
const corsMiddleware = (req, res, next) => {
  if (!CORS_ENABLED) {
    return next();
  }

  const origin = req.headers.origin;

  // Set allowed origin
  if (CORS_ALLOWED_ORIGINS.length === 0 || CORS_ALLOWED_ORIGINS.includes("*")) {
    // Allow all origins if none specified or wildcard is used
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  } else if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    // Allow specific origin if it's in the allowed list
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);

  if (CORS_CREDENTIALS) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
};

// Apply CORS middleware
app.use(corsMiddleware);

// Health check endpoint (no auth required) - must be defined before auth middleware
app.get("/proxy/health", (req, res) => {
  res.json({ status: "ok", service: TARGET_SERVICE_NAME });
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

// Apply authentication to all routes except /proxy/health and OPTIONS requests
app.use((req, res, next) => {
  if (req.path === "/proxy/health" || req.method === "OPTIONS") {
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
  if (CORS_ENABLED) {
    console.log(
      `CORS enabled - Allowed origins: ${
        CORS_ALLOWED_ORIGINS.join(", ") || "*"
      }`
    );
  }
});
