const { reviewPrompt } = require('../llm/reviewPrompt');
const { readFile } = require('../tools/readFile');
const { createFile } = require('../tools/createFile');

function extractFirstJSON(text) {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

async function runReviewPass(filePath, model) {
  const fileResult = readFile(filePath);
  if (!fileResult.success) {
    return { reviewed: false };
  }

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: reviewPrompt },
        { role: 'user', content: fileResult.content }
      ],
      stream: false
    })
  });

  const data = await response.json();
  const jsonText = extractFirstJSON(data.message.content);
  if (!jsonText) {
    return { reviewed: false };
  }

  const review = JSON.parse(jsonText);
  if (review.needsFix && review.fixedHtml) {
    createFile(filePath, review.fixedHtml, true);
    return { reviewed: true, fixed: true };
  }
  return { reviewed: true, fixed: false };
}

async function reviewHtmlFile(filePath, model) {
  const MAX_PASSES = 2;
  let anyFixApplied = false;

  for (let i = 0; i < MAX_PASSES; i++) {
    const pass = await runReviewPass(filePath, model);
    if (!pass.reviewed) break;
    if (pass.fixed) {
      anyFixApplied = true;
    } else {
      break;
    }
  }

  return anyFixApplied
    ? 'The file was automatically reviewed and corrected. It is already finished — no further action needed.'
    : 'The file was automatically reviewed and no issues were found.';
}

module.exports = { reviewHtmlFile };