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

Rewrite the COMPLETE file so every measured problem is fixed AND the original request is fully satisfied. Keep everything that already works.

Rules:
- Output ONLY the complete HTML file. No explanation, no markdown code fences.
- Every label or text the user asked for must stay visible. Never hide it with display: none, font-size: 0, or similar.
- Every icon or drawing must be DRAWN with real child elements (for example <span> bars) or an inline <svg>. An empty box is not an icon. Each drawn part needs an explicit width and height and a color that contrasts with the box background.
- When labels go underneath icons, wrap each item like this: <div class="item"><div class="icon">...drawn parts only, no text...</div><span class="label">Label text</span></div>. The label is a sibling of the icon box, never inside it.
- A container whose children are all position: absolute has no size. Give it an explicit width and height, and position: relative.
- "Side by side" means a flex row with a gap, and each item must have room for its label.
- A hover effect needs a real :hover rule. A permanent transform is not a hover effect.
- A hamburger icon has 3 evenly spaced bars (for example 30px wide and 4px tall, 6px apart). On hover, the top bar rotates 45deg and moves down, the bottom bar rotates -45deg and moves up, and the middle bar fades out, which forms an X.
- Charts must be REAL. A bar chart is a flex container (display:flex; align-items:flex-end; gap:12px; fixed height such as 240px) with one div per data point. Each bar div has a DIFFERENT percentage height (for example height:40%, 65%, 90%), the same width, a solid accent background color and a small label under it. Or use an inline <svg viewBox="0 0 400 200" style="width:100%;height:auto"> with one <rect> per data point. Never use placeholder boxes, X-shaped lines or dots as a chart.
- Repeated items that should match (stat cards, feature cards, tiles) go in a CSS grid: display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px. This makes them equal width and keeps them inside the container.
- Nothing may be wider than its container or the page. Use box-sizing:border-box on everything. Give images, svg and canvas max-width:100% and height:auto. Wrap wide tables in a container with overflow-x:auto and give the table width:100%.
- Text must have strong contrast with its background (at least 4.5:1).
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
      stream: true,
      options: { num_ctx: 8192 }
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
  const expectChart = /\b(chart|graph|plot)s?\b/i.test(originalRequest);
  const labelsOutside = /underneath|beneath|below|under each|under the/i.test(originalRequest);
  let fixesApplied = 0;

  for (let round = 0; round <= MAX_FIXES; round++) {
    console.log(`Checking page in a real browser (check ${round + 1})...`);
    const check = await checkPage(filePath, { expectHover, expectChart, labelsOutside });

    if (!check.success) {
      return `The file was created, but the automatic page check could not run (${check.message}). Treat the file as finished.`;
    }

    if (check.passed) {
      return fixesApplied > 0
        ? 'The file was checked in a real browser, fixed, and now passes all checks. It is finished — no further action needed.'
        : 'The file was checked in a real browser and passes all checks. It is finished — no further action needed.';
    }

    console.log(`Found ${check.issues.length} problem(s):`);
    for (const issue of check.issues) {
      console.log(' -', issue.slice(0, 140));
    }

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