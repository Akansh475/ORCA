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

function extractContentBlock(text) {
  const marker = text.indexOf('<<<CONTENT');
  if (marker === -1) return null;
  const lineEnd = text.indexOf('\n', marker);
  if (lineEnd === -1) return null;
  const end = text.indexOf('CONTENT>>>', lineEnd);
  let body = end === -1 ? text.slice(lineEnd + 1) : text.slice(lineEnd + 1, end);
  body = body.trim();
  body = body.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '').trim();
  return body;
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

    const jsonText = extractFirstJSON(rawResponse);
    let decision;
    try {
      if (!jsonText) throw new Error('No JSON object found in response.');
      decision = JSON.parse(jsonText);
    } catch (err) {
      jsonRetries++;
      console.log(`Invalid JSON from model (${err.message}).`);
      console.log('Response started with:', rawResponse.slice(0, 150).replace(/\n/g, ' '));
      if (jsonRetries > MAX_JSON_RETRIES) {
        console.log('Stopped: too many invalid responses from the model.');
        break;
      }
      console.log('Asking it to retry...');
      messages.push({ role: 'assistant', content: '(invalid response omitted)' });
      messages.push({
        role: 'user',
        content: `Your last response was not valid JSON (${err.message}). Respond again with ONLY a single valid JSON object in the required format. For long file content, put the content after the JSON between a <<<CONTENT line and a CONTENT>>> line instead of inside the JSON.`
      });
      continue;
    }

    messages.push({ role: 'assistant', content: rawResponse });

    const block = extractContentBlock(rawResponse);
    if (block !== null && decision.tool === 'createFile') {
      decision.args = decision.args || {};
      decision.args.content = block;
    }

    const preview =
      decision.args && typeof decision.args.content === 'string'
        ? {
            ...decision,
            args: {
              ...decision.args,
              content: decision.args.content.slice(0, 120) + `... (${decision.args.content.length} characters)`
            }
          }
        : decision;
    console.log('Decision:', preview);

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