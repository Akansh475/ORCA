const fs = require('fs');
const path = require('path');

function searchFiles(startPath, keyword) {
  const results = [];

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.name.toLowerCase().includes(keyword.toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  if (!fs.existsSync(startPath)) {
    return { success: false, message: `Path does not exist: ${startPath}` };
  }

  walk(startPath);
  return { success: true, results };
}

module.exports = { searchFiles };