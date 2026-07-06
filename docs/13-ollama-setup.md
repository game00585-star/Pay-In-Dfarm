# 13 Ollama Setup

## Objective

D-FARM Pay-in AI supports local vision AI through Ollama only. The system must not depend on OpenAI, Gemini, Claude, or any paid external AI API.

## Install Ollama

1. Download Ollama from `https://ollama.com`.
2. Install it on the local machine that will run the web app.
3. Start Ollama.

Default local endpoint:

```text
http://localhost:11434
```

## Pull Vision Model

Default model:

```bash
ollama pull qwen2.5vl
```

Alternative local vision models can be used if they support image input through Ollama.

## Run Model

Check installed models:

```bash
ollama list
```

Run the default model manually:

```bash
ollama run qwen2.5vl
```

## Configure In App

Open:

```text
AI Settings
```

Set:

```json
{
  "visionProvider": "OLLAMA",
  "ocrProvider": "MOCK",
  "preprocessingProvider": "OPENCV",
  "duplicateProvider": "LOCAL",
  "ollama": {
    "baseUrl": "http://localhost:11434",
    "visionModel": "qwen2.5vl",
    "timeout": 120000
  }
}
```

Use:

```text
AI Test
```

Then:

1. Run Health Check.
2. Upload a test image.
3. Select document type.
4. Click Analyze.
5. Review Raw Response and Parsed JSON.

## Health Check

The app checks:

- Status
- Version
- Model
- Response time

If Ollama is unavailable, the app automatically falls back to `MOCK_AI`.

## Troubleshooting

### Ollama unavailable

Check that Ollama is running:

```bash
ollama list
```

Check the local endpoint:

```text
http://localhost:11434/api/version
```

### Model not found

Pull the model:

```bash
ollama pull qwen2.5vl
```

Confirm the model name in AI Settings matches `ollama list`.

### Slow response

Large images can be slow. The app timeout is 120 seconds by default.

Recommended:

- Use local preprocessing.
- Resize images before analysis.
- Keep the Ollama server on the same machine or same local network.

### Invalid JSON response

The parser extracts JSON from Ollama responses. If the model returns prose, the parser will fail safely and return warning:

```text
OLLAMA_RESPONSE_PARSE_FAILED
```

The app will keep the raw response for review.
