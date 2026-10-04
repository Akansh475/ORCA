const { createFolder } = require('../tools/createFolder');
const { createFile } = require('../tools/createFile');
const { readFile } = require('../tools/readFile');
const { listDir } = require('../tools/listDir');
const { runCommand } = require('../tools/runCommand');
const { searchFiles } = require('../tools/searchFiles');
const { verifyServer } = require('../tools/verifyServer');
const { deleteFile } = require('../tools/deleteFile');
const { deleteFolder } = require('../tools/deleteFolder');
const { resolvePath } = require('../tools/resolvePath');
const { confirmAction } = require('./confirmAction');

class UserCancelledError extends Error {}

const SAFE_READONLY_PREFIXES = ['df', 'ps', 'ls', 'whoami', 'pwd', 'date', 'uptime'];

function isSafeReadOnly(command) {
  const firstWord = command.trim().split(' ')[0];
  return SAFE_READONLY_PREFIXES.includes(firstWord);
}

function isOutsideProject(path) {
  return path.startsWith('/') || path.startsWith('~');
}

async function executeTool(decision) {
  const { tool, args } = decision;

  switch (tool) {
    case 'createFolder': {
      if (isOutsideProject(args.path)) {
        const confirmed = await confirmAction(`ORCA wants to create a folder outside the project, at: "${args.path}".`);
        if (!confirmed) {
          throw new UserCancelledError('Folder creation cancelled by user.');
        }
      }
      return createFolder(resolvePath(args.path));
    }
    case 'createFile': {
      if (isOutsideProject(args.path)) {
        const confirmed = await confirmAction(`ORCA wants to create a file outside the project, at: "${args.path}".`);
        if (!confirmed) {
          throw new UserCancelledError('File creation cancelled by user.');
        }
      }
      const resolvedPath = resolvePath(args.path);
      const result = createFile(resolvedPath, args.content);
      if (!result.success && result.message.includes('already exists')) {
        const confirmed = await confirmAction(`ORCA wants to overwrite existing file: "${args.path}".`);
        if (!confirmed) {
          throw new UserCancelledError('Overwrite cancelled by user.');
        }
        return createFile(resolvedPath, args.content, true);
      }
      return result;
    }
    case 'readFile':
      return readFile(resolvePath(args.path));
    case 'listDir':
      return listDir(resolvePath(args.path));
    case 'searchFiles':
      return searchFiles(resolvePath(args.path), args.keyword);
    case 'verifyServer':
      return verifyServer(resolvePath(args.projectPath), args.entryFile, args.port, args.route);
    case 'deleteFile': {
      const confirmed = await confirmAction(`ORCA wants to DELETE file: "${args.path}". This cannot be undone.`);
      if (!confirmed) {
        throw new UserCancelledError('File deletion cancelled by user.');
      }
      return deleteFile(resolvePath(args.path));
    }
    case 'deleteFolder': {
      const confirmed = await confirmAction(`ORCA wants to DELETE folder: "${args.path}" and everything inside it. This cannot be undone.`);
      if (!confirmed) {
        throw new UserCancelledError('Folder deletion cancelled by user.');
      }
      return deleteFolder(resolvePath(args.path));
    }
    case 'runCommand': {
      const cwd = resolvePath(args.cwd || '.');
      if (isSafeReadOnly(args.command)) {
        return runCommand(args.command, cwd);
      }
      const confirmed = await confirmAction(`ORCA wants to run: "${args.command}" in "${cwd}".`);
      if (!confirmed) {
        throw new UserCancelledError('Command cancelled by user.');
      }
      return runCommand(args.command, cwd);
    }
    case 'done':
      return { success: true, message: decision.message };
    default:
      return { success: false, message: `Unknown tool: ${tool}` };
  }
}

module.exports = { executeTool, UserCancelledError };