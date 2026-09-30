const { systemPrompt } = require('./systemPrompt');

async function callOllama(model, messages) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: false
    })
  });

  const data = await response.json();
  return data.message.content;
}

module.exports = { callOllama };