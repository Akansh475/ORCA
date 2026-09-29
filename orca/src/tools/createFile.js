const fs = require('fs');

function createFile(path, content = '') {
  if (fs.existsSync(path)) {
    return { success: false, message: `File already exists: ${path}` };
  }
  fs.writeFileSync(path, content);
  return { success: true, message: `File created: ${path}` };
}

module.exports = { createFile };