const { createFolder } = require('../tools/createFolder');
const { createFile } = require('../tools/createFile');
const { readFile } = require('../tools/readFile');
const { listDir } = require('../tools/listDir');
const { runCommand } = require('../tools/runCommand');

function executeTool(decision) {
  const { tool, args } = decision;

  switch (tool) {
    case 'createFolder':
      return createFolder(args.path);
    case 'createFile':
      return createFile(args.path, args.content);
    case 'readFile':
      return readFile(args.path);
    case 'listDir':
      return listDir(args.path);
    case 'runCommand':
      return runCommand(args.command);
    case 'done':
      return { success: true, message: decision.message };
    default:
      return { success: false, message: `Unknown tool: ${tool}` };
  }
}

module.exports = { executeTool };