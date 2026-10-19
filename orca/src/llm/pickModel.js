const CODING_TERMS =
  /\b(code|coding|build|script|scripts|function|app|apps|project|api|bug|debug|html|css|javascript|web\s?page|website|landing|page|form|dashboard|layout|navbar|sidebar|stylesheet|ui|ux|component|server|express|node|npm)\b/i;

function pickModel(instruction) {
  return CODING_TERMS.test(instruction) ? 'qwen2.5-coder:14b' : 'llama3.1';
}

module.exports = { pickModel };