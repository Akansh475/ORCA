const { readFile } = require('../tools/readFile');
const { createFile } = require('../tools/createFile');
const { checkPage } = require('../tools/checkPage');

const MAX_FIXES = 3;

const fixSystemPrompt = `
You are an expert front-end developer fixing an HTML file.

You will receive:
- ORIGINAL REQUEST: what the user asked for
- CURRENT FILE: the file as it is now
- PROBLEMS MEASURED IN A REAL BROWSER: facts about what is wrong

Rewrite the COMPLETE file so every measured problem is fixed AND the original request is fully satisfied.

Rules:
- Output ONLY the complete HTML file. No explanation, no markdown code fences.
- Every label or text the user asked for must stay visible. Never hide it with display: none, font-size: 0, or similar.
- A container whose children are all position: absolute has no size. Give it an explicit width and height.
- "Side by side" means a flex row with a gap, and each item must have room for its label.
- A hover effect needs a real :hover rule. A permanent transform is not a hover effect.
- A hamburger icon has 3 evenly spaced bars. On hover, the top bar rotates 45deg, the bottom bar rotates -45deg, and the middle bar fades out, which forms an X.
- Only use CSS that really exists. Do not invent pseudo-elements.
`;

async function askModel(model, userMessage) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: fixSystemPrompt },
        { role: 'user', content: userMessage }
      ],
      stream: true
    })
  });

  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const part = JSON.parse(line);
      if (part.message && part.message.content) text += part.message.content;
    }
  }
  if (buffer.trim()) {
    const part = JSON.parse(buffer);
    if (part.message && part.message.content) text += part.message.content;
  }

  return text;
}

function cleanHtml(text) {
  let html = text.trim();
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = html.search(/<!DOCTYPE|<html/i);
  return start === -1 ? null : html.slice(start);
}

async function reviewHtmlFile(filePath, model, originalRequest = '') {
  const expectHover = /hover/i.test(originalRequest);
  let fixesApplied = 0;

  for (let round = 0; round <= MAX_FIXES; round++) {
    console.log(`Checking page in a real browser (check ${round + 1})...`);
    const check = await checkPage(filePath, { expectHover });

    if (!check.success) {
      return `The file was created, but the automatic page check could not run (${check.message}). Treat the file as finished.`;
    }

    if (check.passed) {
      return fixesApplied > 0
        ? 'The file was checked in a real browser, fixed, and now passes all checks. It is finished — no further action needed.'
        : 'The file was checked in a real browser and passes all checks. It is finished — no further action needed.';
    }

    console.log(`Found ${check.issues.length} problem(s).`);

    if (round === MAX_FIXES) {
      return `After ${fixesApplied} automatic fix attempts the file still has these problems: ${check.issues.join(' ')} Do not try to fix them yourself. Respond with done and tell the user these problems remain.`;
    }

    const current = readFile(filePath);
    if (!current.success) {
      return 'The file could not be read back for fixing. Treat the file as finished.';
    }

    const message =
      `ORIGINAL REQUEST:\n${originalRequest}\n\n` +
      `CURRENT FILE:\n${current.content}\n\n` +
      `PROBLEMS MEASURED IN A REAL BROWSER:\n- ${check.issues.join('\n- ')}\n\n` +
      `Rewrite the complete file so every problem is fixed and the ORIGINAL REQUEST is fully satisfied.`;

    console.log(`Asking the model to fix it (fix ${round + 1} of ${MAX_FIXES}). This can take a few minutes...`);

    let reply;
    try {
      reply = await askModel(model, message);
    } catch (err) {
      return `The automatic fix step failed (${err.message}). Treat the file as finished.`;
    }

    const html = cleanHtml(reply);
    if (!html) {
      return 'The model did not return valid HTML, so the file was left as it is. Treat the file as finished.';
    }

    createFile(filePath, html, true);
    fixesApplied++;
  }
}

module.exports = { reviewHtmlFile };