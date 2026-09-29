const { execSync } = require('child_process');

function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    return { success: true, output };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { runCommand };