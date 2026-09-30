const readline = require('readline');

function confirmAction(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} Type "yes" or "y" to proceed: `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'yes' || normalized === 'y');
    });
  });
}

module.exports = { confirmAction };