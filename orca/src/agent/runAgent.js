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
  const MAX_JSON_RETRIES = 3;
  const MAX_ERROR_RETRIES = 3;
  let jsonRetries = 0;
  let errorRetries = 0;

  while (true) {
    const rawResponse = await callOllama(model, messages);
    messages.push({ role: 'assistant', content: rawResponse });

    const jsonText = extractFirstJSON(rawResponse);
    let decision;
    try {
      if (!jsonText) throw new Error('No JSON object found in response.');
      decision = JSON.parse(jsonText);
    } catch (err) {
      jsonRetries++;
      if (jsonRetries > MAX_JSON_RETRIES) {
        console.log('Stopped: too many invalid responses from the model.');
        break;
      }
      console.log('Invalid JSON from model, asking it to retry...');
      messages.push({
        role: 'user',
        content: `Your last response was not valid JSON (${err.message}). Respond again with ONLY a single valid JSON object in the required format.`
      });
      continue;
    }

    console.log('Decision:', decision);

    if (decision.tool === 'done') {
      console.log('Task complete:', decision.message);
      break;
    }

    try {
      const result = await executeTool(decision, { instruction });
      console.log('Result:', result);
      messages.push({ role: 'user', content: `Tool result: ${JSON.stringify(result)}` });
    } catch (err) {
      if (err instanceof UserCancelledError) {
        console.log('Stopped:', err.message);
        break;
      }
      errorRetries++;
      if (errorRetries > MAX_ERROR_RETRIES) {
        console.log('Stopped: too many tool execution errors.');
        break;
      }
      console.log('Tool execution error:', err.message);
      messages.push({
        role: 'user',
        content: `Tool execution failed with error: ${err.message}. Try a different approach or fix the issue.`
      });
    }
  }
}

module.exports = { runAgent };