const os = require('os');
const path = require('path');

function resolvePath(inputPath) {
  if (inputPath === '~') {
    return os.homedir();
  }
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

module.exports = { resolvePath };
