const { callOllama } = require('../llm/callOllama');
const { pickModel } = require('../llm/pickModel');
const { executeTool, UserCancelledError } = require('./executeTool');

function extractFirstJSON(text) {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

async function runAgent(instruction) {
  const model = pickModel(instruction);
  const messages = [{ role: 'user', content: instruction }];

  while (true) {
    const rawResponse = await callOllama(model, messages);
    messages.push({ role: 'assistant', content: rawResponse });

    const jsonText = extractFirstJSON(rawResponse);
    const decision = JSON.parse(jsonText);
    console.log('Decision:', decision);

    if (decision.tool === 'done') {
      console.log('Task complete:', decision.message);
      break;
    }

    try {
      const result = await executeTool(decision);
      console.log('Result:', result);
      messages.push({ role: 'user', content: `Tool result: ${JSON.stringify(result)}` });
    } catch (err) {
      if (err instanceof UserCancelledError) {
        console.log('Stopped:', err.message);
        break;
      }
      throw err;
    }
  }
}

module.exports = { runAgent };