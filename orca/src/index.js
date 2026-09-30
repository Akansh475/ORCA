const { callOllama } = require('./llm/callOllama');
const { pickModel } = require('./llm/pickModel');
const { executeTool } = require('./agent/executeTool');

async function run(instruction) {
  const model = pickModel(instruction);
  const rawResponse = await callOllama(model, instruction);
  const decision = JSON.parse(rawResponse);
  const result = executeTool(decision);
  console.log('Decision:', decision);
  console.log('Result:', result);
}

run('Create a folder called notes');