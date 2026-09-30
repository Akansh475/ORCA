const { createFolder } = require('../tools/createFolder');
const { createFile } = require('../tools/createFile');
const { readFile } = require('../tools/readFile');
const { listDir } = require('../tools/listDir');
const { runCommand } = require('../tools/runCommand');
const { searchFiles } = require('../tools/searchFiles');
const { confirmAction } = require('./confirmAction');

class UserCancelledError extends Error {}

async function executeTool(decision) {
  const { tool, args } = decision;

  switch (tool) {
    case 'createFolder':
      return createFolder(args.path);
    case 'createFile': {
      const result = createFile(args.path, args.content);
      if (!result.success && result.message.includes('already exists')) {
        const confirmed = await confirmAction(`ORCA wants to overwrite existing file: "${args.path}".`);
        if (!confirmed) {
          throw new UserCancelledError('Overwrite cancelled by user.');
        }
        return createFile(args.path, args.content, true);
      }
      return result;
    }
    case 'readFile':
      return readFile(args.path);
    case 'listDir':
      return listDir(args.path);
    case 'searchFiles':
      return searchFiles(args.path, args.keyword);
    case 'runCommand': {
      const confirmed = await confirmAction(`ORCA wants to run: "${args.command}".`);
      if (!confirmed) {
        throw new UserCancelledError('Command cancelled by user.');
      }
      return runCommand(args.command);
    }
    case 'done':
      return { success: true, message: decision.message };
    default:
      return { success: false, message: `Unknown tool: ${tool}` };
  }
}

module.exports = { executeTool, UserCancelledError };