const fs = require('fs');

function readFile(path) {
  if (!fs.existsSync(path)) {
    return { success: false, message: `File does not exist: ${path}` };
  }
  const content = fs.readFileSync(path, 'utf-8');
  return { success: true, content };
}

module.exports = { readFile };