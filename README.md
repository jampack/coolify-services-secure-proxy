# Ollama API Proxy

A secure proxy server for Ollama API with Bearer token authentication. Designed for Coolify deployment.

## Features

- 🔒 Bearer token authentication
- 🔄 Full API proxying to Ollama
- 🐳 Docker-ready for Coolify
- 🏥 Health check endpoint
- ⚡ Lightweight and fast

## Configuration

Set the following environment variables:

- `PORT` - Port for the proxy server (default: 3000)
- `OLLAMA_URL` - Ollama service URL (default: http://localhost:11434)
- `BEARER_TOKEN` - Required bearer token for authentication

## Usage

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and set your BEARER_TOKEN
```

3. Start the server:
```bash
npm start
```

### Docker/Coolify Deployment

1. Build the image:
```bash
docker build -t ollama-proxy .
```

2. Run the container:
```bash
docker run -d \
  -p 3000:3000 \
  -e BEARER_TOKEN=your-secure-token \
  -e OLLAMA_URL=http://ollama:11434 \
  ollama-proxy
```

### Coolify Setup

1. Create a new application in Coolify
2. Connect your repository
3. Set environment variables:
   - `BEARER_TOKEN` - Your secure token
   - `OLLAMA_URL` - Your Ollama service URL (e.g., `http://ollama:11434` if using service name)
4. Deploy

## API Usage

All requests must include the Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer your-token" \
  http://localhost:3000/api/tags
```

```bash
curl -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"model": "llama2", "prompt": "Hello"}' \
  http://localhost:3000/api/generate
```

## Endpoints

- `GET /health` - Health check (no auth required)
- `GET /` - Service info (requires auth)
- `GET /api/*` - All Ollama API endpoints (requires auth)

## Security Notes

- Always use a strong, randomly generated token in production
- Keep your `BEARER_TOKEN` secret and never commit it to version control
- The proxy removes the authorization header before forwarding to Ollama
- Consider using HTTPS in production (configure in Coolify)

