const fs = require('fs');
const path = require('path');
const util = require('util');
const { pathToFileURL } = require('url');

process.chdir(path.join(__dirname, '..'));

// Unattended run: auto-decline every confirmation prompt so a run can never hang waiting for "yes".
// This must happen BEFORE runAgent is loaded, because executeTool picks up confirmAction when it loads.
const confirmModule = require('../src/agent/confirmAction');
confirmModule.confirmAction = async (message) => {
  console.log(`${message} -> auto-declined (unattended benchmark run)`);
  return false;
};

const { runAgent } = require('../src/agent/runAgent');
const { pickModel } = require('../src/llm/pickModel');
const { checkPage } = require('../src/tools/checkPage');
const { chromium } = require('playwright');
const { prompts, suffix } = require('./prompts');

const OUTPUT_DIR = path.join(__dirname, 'output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Optional: run only some prompts, for example: node benchmark/run.js yoga faq
const wanted = process.argv.slice(2);
const selected = wanted.length > 0 ? prompts.filter((p) => wanted.includes(p.id)) : prompts;
if (selected.length === 0) {
  console.log('No matching prompt ids. Available ids: ' + prompts.map((p) => p.id).join(', '));
  process.exit(1);
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function takeScreenshot(htmlPath, pngPath) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(htmlPath).href);
    await page.screenshot({ path: pngPath, fullPage: true });
  } finally {
    await browser.close();
  }
}

function buildReport(results) {
  const passedCount = results.filter((r) => r.passed).length;
  const cards = results
    .map((r) => {
      const image = r.screenshot
        ? `<a href="output/${r.id}.html" target="_blank"><img src="output/${r.id}.png" alt="${escapeHtml(r.id)}"></a>`
        : '<div class="nofile">No file was created</div>';
      const issues = r.issues.length
        ? `<ul>${r.issues.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
        : '';
      return `
      <div class="card">
        <div class="head">
          <h2>${escapeHtml(r.id)}</h2>
          <span class="badge ${r.passed ? 'pass' : 'fail'}">${r.passed ? 'PASS' : 'FAIL'}</span>
        </div>
        <div class="meta">first-draft model: ${escapeHtml(r.model)} &middot; fix rounds: ${r.fixRounds} &middot; ${r.minutes} min</div>
        ${image}
        ${issues}
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ORCA benchmark report</title>
<style>
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#f3f4f6;color:#111827;margin:0;padding:32px}
  h1{margin:0 0 4px}
  .summary{color:#4b5563;margin-bottom:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:24px}
  .card{background:#fff;border-radius:12px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .head{display:flex;justify-content:space-between;align-items:center}
  h2{margin:0;font-size:1.1rem}
  .badge{padding:4px 12px;border-radius:999px;font-size:.8rem;font-weight:700;color:#fff}
  .pass{background:#16a34a}
  .fail{background:#dc2626}
  .meta{font-size:.8rem;color:#6b7280;margin:6px 0 12px}
  img{width:100%;height:340px;object-fit:cover;object-position:top;border:1px solid #e5e7eb;border-radius:8px;display:block}
  .nofile{height:120px;display:flex;align-items:center;justify-content:center;background:#fee2e2;border-radius:8px;color:#991b1b}
  ul{font-size:.78rem;color:#374151;padding-left:18px;margin:12px 0 0}
  li{margin-bottom:6px}
</style>
</head>
<body>
  <h1>ORCA benchmark report</h1>
  <div class="summary">${passedCount} of ${results.length} pages passed every measured check. Click a screenshot to open the page.</div>
  <div class="grid">
    ${cards}
  </div>
</body>
</html>`;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const results = [];

  for (const p of selected) {
    const instruction = `Create a file at ./benchmark/output/${p.id}.html with a single HTML page: ${p.request}${suffix}`;
    const htmlPath = path.join(OUTPUT_DIR, `${p.id}.html`);
    const pngPath = path.join(OUTPUT_DIR, `${p.id}.png`);
    fs.rmSync(htmlPath, { force: true });
    fs.rmSync(pngPath, { force: true });

    console.log(`\n=== ${p.id} ===`);
    const started = Date.now();
    const lines = [];
    const originalLog = console.log;
    console.log = (...args) => {
      const line = util.format(...args);
      lines.push(line);
      originalLog(line);
    };

    let crashed = null;
    try {
      await runAgent(instruction);
    } catch (err) {
      crashed = err.message;
      lines.push('CRASH: ' + err.message);
    } finally {
      console.log = originalLog;
    }

    const seconds = Math.round((Date.now() - started) / 1000);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${p.id}.log`), lines.join('\n'));
    const fixRounds = lines.filter((l) => l.includes('Asking the model to fix it')).length;

    let passed = false;
    let issues = [];
    let screenshot = false;

    if (fs.existsSync(htmlPath)) {
      const check = await checkPage(htmlPath, {
        expectHover: /hover/i.test(p.request),
        expectChart: /\b(chart|graph|plot)s?\b/i.test(p.request),
        labelsOutside: /underneath|beneath|below|under each|under the/i.test(p.request)
      });
      if (check.success) {
        passed = check.passed;
        issues = check.issues;
      } else {
        issues = [check.message];
      }
      try {
        await takeScreenshot(htmlPath, pngPath);
        screenshot = true;
      } catch (err) {
        issues.push('Screenshot failed: ' + err.message);
      }
    } else {
      issues = [crashed ? `Run crashed: ${crashed}` : 'The agent did not create the file at the requested path.'];
    }

    results.push({
      id: p.id,
      model: pickModel(instruction),
      fixRounds,
      passed,
      issues,
      screenshot,
      minutes: Math.round((seconds / 60) * 10) / 10
    });

    fs.writeFileSync(path.join(__dirname, `results-${stamp}.json`), JSON.stringify(results, null, 2));
    fs.writeFileSync(path.join(__dirname, 'report.html'), buildReport(results));
    console.log(`Finished ${p.id}: ${passed ? 'PASS' : 'FAIL'} (${issues.length} problem(s) left, ${fixRounds} fix round(s), ${seconds}s)`);
  }

  console.log('\nSUMMARY');
  console.table(
    results.map((r) => ({
      id: r.id,
      model: r.model,
      passed: r.passed,
      fixRounds: r.fixRounds,
      problemsLeft: r.issues.length,
      minutes: r.minutes
    }))
  );
  console.log(`${results.filter((r) => r.passed).length} of ${results.length} passed.`);
  console.log('Open the report with: open benchmark/report.html');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });