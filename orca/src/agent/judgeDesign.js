const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const judgeSystemPrompt = `
You are a strict visual QA reviewer. You are shown a screenshot of a web page and the user's ORIGINAL REQUEST.

Step 1: Break the request into a checklist of concrete things that must be visible. Include:
- every drawn thing the request names (each icon, logo, chart, button, image, shape), listed SEPARATELY from its text label
- every text label
- layout requirements (for example "side by side")
- label positions (for example "underneath" means below the thing, not inside it)

Step 2: For each checklist item, look at the screenshot and decide if it is clearly visible and correct.
- Be literal. An empty box is NOT an icon. Text is NOT a drawing.
- If you cannot clearly see the thing, answer false.
- Do NOT judge hover effects or animations. A still image cannot show them.

Keep any reasoning very short. Do not write long explanations. Go straight to the JSON.

Respond with ONLY a JSON object, no other text, in exactly this format:
{ "checklist": [ { "item": "<what must be visible>", "visible": true or false, "note": "<short reason>" } ] }
`;

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

async function takeScreenshot(filePath) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(path.resolve(filePath)).href);
    const buffer = await page.screenshot();
    return buffer.toString('base64');
  } finally {
    await browser.close();
  }
}

async function judgeDesign(filePath, originalRequest, visionModel = 'qwen3-vl:8b') {
  let stage = 'taking the screenshot';
  try {
    const image = await takeScreenshot(filePath);

    stage = 'calling the vision model';
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          { role: 'system', content: judgeSystemPrompt },
          {
            role: 'user',
            content: `ORIGINAL REQUEST:\n${originalRequest}\n\nLook at the screenshot and fill in the checklist.`,
            images: [image]
          }
        ],
        stream: false,
        think: false,
        options: { temperature: 0, num_ctx: 8192, num_predict: 4096 }
      })
    });

    stage = 'reading the model response';
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${raw.slice(0, 200)}`);
    }
    if (!raw.trim()) {
      throw new Error('Ollama sent an empty response');
    }
    const data = JSON.parse(raw);

    stage = 'parsing the checklist';
    const message = data.message || {};
    const content = message.content || '';
    const thinking = message.thinking || '';
    const jsonText = extractFirstJSON(content) || extractFirstJSON(thinking);
    if (!jsonText) {
      throw new Error(
        `No JSON found. Stop reason: ${data.done_reason}. Answer: "${content.slice(0, 200)}" | Thinking length: ${thinking.length} characters | Thinking ended with: "${thinking.slice(-200)}"`
      );
    }

    const result = JSON.parse(jsonText);
    const checklist = Array.isArray(result.checklist) ? result.checklist : [];
    if (checklist.length === 0) {
      throw new Error('The checklist was empty');
    }

    const problems = checklist
      .filter((entry) => entry.visible !== true)
      .map((entry) => `${entry.item}${entry.note ? ' - ' + entry.note : ''}`);

    return {
      success: true,
      matches: problems.length === 0,
      problems,
      checklist
    };
  } catch (err) {
    return { success: false, message: `Design judge failed while ${stage}: ${err.message}` };
  }
}

module.exports = { judgeDesign };