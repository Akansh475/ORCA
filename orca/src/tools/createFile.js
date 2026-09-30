const fs = require('fs');

function createFile(path, content = '', overwrite = false) {
  if (fs.existsSync(path) && !overwrite) {
    return { success: false, message: `File already exists: ${path}` };
  }
  fs.writeFileSync(path, content);
  return { success: true, message: `File created: ${path}` };
}

module.exports = { createFile };