const { systemPrompt } = require('./systemPrompt');

async function callOllama(model, userInstruction) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      system: systemPrompt,
      prompt: userInstruction,
      stream: false
    })
  });

  const data = await response.json();
  return data.response;
}

module.exports = { callOllama };