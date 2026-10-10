const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

async function checkPage(filePath, options = {}) {
  const absolutePath = path.resolve(filePath);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(absolutePath).href);

    const issues = await page.evaluate((expectHover) => {
      const issues = [];
      const SKIP = ['SCRIPT', 'STYLE'];

      const describe = (el) => {
        let d = el.tagName.toLowerCase();
        if (el.id) d += '#' + el.id;
        if (el.classList.length) d += '.' + Array.from(el.classList).join('.');
        return d;
      };

      const isVisible = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
      };

      const all = Array.from(document.body.querySelectorAll('*')).filter(
        (el) => !SKIP.includes(el.tagName)
      );

      // 1. Collapsed containers (zero size but have children)
      for (const el of all) {
        if (el.children.length === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.display === 'contents') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) {
          issues.push(
            `Collapsed container: <${describe(el)}> has zero ${r.width === 0 ? 'width' : 'height'} but contains ${el.children.length} child element(s). If its children are position:absolute, give it an explicit width and height.`
          );
        }
      }

      // 2. Hidden text
      for (const el of all) {
        const ownText = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join(' ')
          .trim();
        if (!ownText) continue;

        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        let reason = null;
        if (cs.display === 'none') reason = 'display: none';
        else if (cs.visibility === 'hidden') reason = 'visibility: hidden';
        else if (parseFloat(cs.fontSize) === 0) reason = 'font-size: 0';
        else if (parseFloat(cs.opacity) === 0) reason = 'opacity: 0';
        else if (r.width === 0 || r.height === 0) reason = 'zero size';

        if (reason) {
          issues.push(`Hidden text: "${ownText.slice(0, 40)}" in <${describe(el)}> is not visible (${reason}).`);
        }
      }

      // 3. Overlapping siblings
      const parents = [document.body, ...all];
      for (const parent of parents) {
        const kids = Array.from(parent.children).filter(
          (k) => !SKIP.includes(k.tagName) && isVisible(k)
        );
        for (let i = 0; i < kids.length; i++) {
          for (let j = i + 1; j < kids.length; j++) {
            const a = kids[i].getBoundingClientRect();
            const b = kids[j].getBoundingClientRect();
            const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            const smaller = Math.min(a.width * a.height, b.width * b.height);
            if (smaller > 0 && w * h > 0.5 * smaller) {
              issues.push(
                `Overlap: <${describe(kids[i])}> and <${describe(kids[j])}> (siblings inside <${describe(parent)}>) overlap by more than half. They may be piled on top of each other.`
              );
            }
          }
        }
      }

      // 4. Hover rules
      let hoverRules = 0;
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes(':hover')) hoverRules++;
          }
        } catch (e) {
          // stylesheet not readable, skip it
        }
      }
      if (expectHover && hoverRules === 0) {
        issues.push('No :hover rule found, but a hover effect was requested.');
      }

      return issues.slice(0, 10);
    }, options.expectHover === true);

    return { success: true, passed: issues.length === 0, issues };
  } catch (err) {
    return { success: false, message: `Page check failed: ${err.message}` };
  } finally {
    await browser.close();
  }
}

module.exports = { checkPage };