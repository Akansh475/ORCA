const { spawn } = require('child_process');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyServer(projectPath, entryFile, port, route = '/') {
  const child = spawn('node', [entryFile], { cwd: projectPath });

  let errorOutput = '';
  child.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  await delay(1500);

  try {
    const response = await fetch(`http://localhost:${port}${route}`);
    const text = await response.text();
    child.kill();
    return {
      success: true,
      message: `Server responded on port ${port}${route}`,
      responseStatus: response.status,
      responseBody: text
    };
  } catch (err) {
    child.kill();
    return {
      success: false,
      message: `Server did not respond: ${err.message}`,
      errorOutput
    };
  }
}

module.exports = { verifyServer };