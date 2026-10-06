function pickModel(instruction) {
  const codingKeywords = ['code', 'build', 'script', 'function', 'app', 'project', 'api', 'bug', 'debug'];
  const isCoding = codingKeywords.some(word => instruction.toLowerCase().includes(word));
  return isCoding ? 'qwen2.5-coder:14b' : 'llama3.1';
}

module.exports = { pickModel };