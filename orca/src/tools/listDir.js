const fs = require('fs');

function listDir(path) {
  if (!fs.existsSync(path)) {
    return { success: false, message: `Directory does not exist: ${path}` };
  }
  const items = fs.readdirSync(path);
  return { success: true, items };
}

module.exports = { listDir };