const { systemPrompt } = require('./systemPrompt');

async function callOllama(model, messages, extraSystem = '') {
  const fullSystemPrompt = extraSystem ? `${systemPrompt}\n\n${extraSystem}` : systemPrompt;

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'system', content: fullSystemPrompt }, ...messages],
      stream: true,
      options: { num_ctx: 8192 }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const part = JSON.parse(line);
      if (part.message && part.message.content) text += part.message.content;
    }
  }
  if (buffer.trim()) {
    const part = JSON.parse(buffer);
    if (part.message && part.message.content) text += part.message.content;
  }

  return text;
}

module.exports = { callOllama };