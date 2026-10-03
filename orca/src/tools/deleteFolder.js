const fs = require('fs');

function deleteFolder(path) {
  if (!fs.existsSync(path)) {
    return { success: false, message: `Folder does not exist: ${path}` };
  }
  fs.rmSync(path, { recursive: true, force: true });
  return { success: true, message: `Folder deleted: ${path}` };
}

module.exports = { deleteFolder };