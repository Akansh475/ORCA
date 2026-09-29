const fs = require('fs');

function createFolder(path) {
  if (fs.existsSync(path)) {
    return { success: false, message: `Folder already exists: ${path}` };
  }
  fs.mkdirSync(path);
  return { success: true, message: `Folder created: ${path}` };
}

module.exports = { createFolder };