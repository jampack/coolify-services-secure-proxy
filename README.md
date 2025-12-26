# Coolify Secure API Proxy

A generic secure proxy server with Bearer token authentication. Designed for Coolify deployment, this proxy can secure any HTTP/HTTPS service that lacks built-in authentication.

## Features

- 🔒 Bearer token authentication
- 🔄 Full path forwarding (all paths proxied as-is)
- 🐳 Docker-ready for Coolify
- 🏥 Health check endpoint
- ⚡ Lightweight and fast
- 🌐 Works with any HTTP/HTTPS service

## Configuration

Set the following environment variables:

- `PORT` - Port for the proxy server (default: 3000)
- `TARGET_URL` - Target service URL (required, e.g., `http://service-name:port`)
- `BEARER_TOKEN` - Required bearer token for authentication
- `TARGET_SERVICE_NAME` - Target service name shown in health check (default: "target-service")

## Usage

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
PORT=3000
TARGET_URL=http://localhost:8080
BEARER_TOKEN=your-secure-token-here
```

3. Start the server:

```bash
npm start
```

### Docker/Coolify Deployment

1. Build the image:

```bash
docker build -t secure-api-proxy .
```

2. Run the container:

```bash
docker run -d \
  -p 3000:3000 \
  -e BEARER_TOKEN=your-secure-token \
  -e TARGET_URL=http://target-service:8080 \
  secure-api-proxy
```

### Coolify Setup

1. Create a new application in Coolify
2. Connect your repository
3. Set environment variables:
   - `BEARER_TOKEN` - Your secure token
   - `TARGET_URL` - Your target service URL (use container/service name, e.g., `http://ollama-api:11434`)
4. Deploy

**Note:** In Coolify, containers on the same network can communicate using their container/service names. Use the target container name as the hostname in `TARGET_URL`.

## How It Works

- All requests to the proxy are forwarded to `TARGET_URL` with the same path
- Example: `GET /api/users` → `GET http://target-service:port/api/users`
- The Bearer token is validated but removed before forwarding to the target service
- Paths are forwarded exactly as received (no rewriting)

## API Usage

All requests must include the Bearer token in the Authorization header:

```bash
# Example: Proxying to an API service
curl -H "Authorization: Bearer your-token" \
  http://localhost:3000/api/endpoint

# Example: Proxying to Ollama
curl -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"model": "llama2", "prompt": "Hello"}' \
  http://localhost:3000/api/generate
```

## Endpoints

- `GET /proxy/health` - Health check (no auth required)
- `*` - All other paths are proxied to the target service (requires auth)

## Examples

### Proxying Ollama

```bash
TARGET_URL=http://ollama-api:11434
# Access via: https://your-proxy.com/api/generate
```

### Proxying a REST API

```bash
TARGET_URL=http://api-service:8080
# Access via: https://your-proxy.com/v1/users
```

### Proxying Any Service

```bash
TARGET_URL=http://internal-service:3000
# All paths forwarded as-is
```

## Security Notes

- Always use a strong, randomly generated token in production
- Keep your `BEARER_TOKEN` secret and never commit it to version control
- The proxy removes the authorization header before forwarding to the target service
- Consider using HTTPS in production (configure in Coolify)
- The target service should not be directly accessible from the internet
