const fs = require('fs');

function deleteFile(path) {
  if (!fs.existsSync(path)) {
    return { success: false, message: `File does not exist: ${path}` };
  }
  fs.unlinkSync(path);
  return { success: true, message: `File deleted: ${path}` };
}

module.exports = { deleteFile };