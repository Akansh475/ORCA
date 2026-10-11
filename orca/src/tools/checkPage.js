const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');

async function checkPage(filePath, options = {}) {
  const absolutePath = path.resolve(filePath);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(absolutePath).href);

    // Part 1: structure checks, plus a list of text boxes to measure later
    const { issues, textBoxes } = await page.evaluate((expectHover) => {
      const issues = [];
      const textBoxes = [];
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

      const ownTextOf = (el) =>
        Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join(' ')
          .trim();

      // Collapsed containers
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

      // Hidden text
      for (const el of all) {
        const ownText = ownTextOf(el);
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

      // Overlapping siblings (max 3 reported)
      let overlapCount = 0;
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
            if (smaller > 0 && w * h > 0.5 * smaller && overlapCount < 3) {
              overlapCount++;
              issues.push(
                `Overlap: <${describe(kids[i])}> and <${describe(kids[j])}> (siblings inside <${describe(parent)}>) overlap by more than half. They may be piled on top of each other.`
              );
            }
          }
        }
      }

      // Hover rules
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

      // Content running outside the page width
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) {
        issues.push(
          `Horizontal scroll: the page is ${document.documentElement.scrollWidth}px wide but the window is ${vw}px. Something is wider than the page.`
        );
      }
      const reported = [];
      let overflowCount = 0;
      for (const el of all) {
        if (overflowCount >= 3) break;
        if (!isVisible(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) continue;
        if (r.right <= vw + 1 && r.left >= -1) continue;

        let skip = false;
        for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (reported.includes(p) || ox === 'auto' || ox === 'scroll') {
            skip = true;
            break;
          }
        }
        if (skip) continue;

        reported.push(el);
        overflowCount++;
        issues.push(
          `Off-screen content: <${describe(el)}> extends outside the page (left ${Math.round(r.left)}px, right ${Math.round(r.right)}px, page width ${vw}px). All content must fit inside the page width. Use max-width: 100%, box-sizing: border-box, and flex-wrap: wrap or a column layout.`
        );
      }

      // Collect visible text boxes for the pixel-based contrast check
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const toRGBA = (color) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
      };
      const effectiveOpacity = (el) => {
        let o = 1;
        for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
        return o;
      };
      for (const el of all) {
        const ownText = ownTextOf(el);
        if (!ownText || !isVisible(el)) continue;
        const opacity = effectiveOpacity(el);
        if (opacity === 0) continue;
        const r = el.getBoundingClientRect();
        const c = toRGBA(getComputedStyle(el).color);
        textBoxes.push({
          desc: describe(el),
          text: ownText.slice(0, 40),
          x: r.left + window.scrollX,
          y: r.top + window.scrollY,
          w: r.width,
          h: r.height,
          color: { r: c.r, g: c.g, b: c.b, a: c.a * opacity }
        });
      }

      return { issues, textBoxes };
    }, options.expectHover === true);

    // Part 2: find icon-like boxes
    const candidates = await page.evaluate(() => {
      const NAME = /icon|logo|burger|image|chart|graph|avatar|illustration/i;
      const out = [];
      for (const el of document.body.querySelectorAll('*')) {
        const tag = el.tagName.toLowerCase();
        if (['svg', 'img', 'canvas', 'script', 'style'].includes(tag)) continue;
        const name = (typeof el.className === 'string' ? el.className : '') + ' ' + el.id;
        if (!NAME.test(name)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 16 || r.height < 16 || r.width > 200 || r.height > 200) continue;

        let label = tag;
        if (el.id) label += '#' + el.id;
        if (el.classList.length) label += '.' + Array.from(el.classList).join('.');

        out.push({
          label,
          x: r.left + window.scrollX,
          y: r.top + window.scrollY,
          w: r.width,
          h: r.height,
          text: (el.textContent || '').trim().slice(0, 30)
        });
      }
      return out;
    });

    // Label placement: text must not sit inside the icon box
    if (options.labelsOutside === true) {
      for (const box of candidates) {
        if (box.text) {
          issues.push(
            `Label inside icon: <${box.label}> contains the text "${box.text}", but the request puts labels underneath. Move the text out of the icon element and place it below it.`
          );
        }
      }
    }

    // Part 3: hide all text, take one screenshot, measure blank icons and text contrast
    const blankCandidates = candidates.filter((c) => !c.text);
    if (blankCandidates.length > 0 || textBoxes.length > 0) {
      await page.addStyleTag({
        content: '* { color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }'
      });
      const screenshot = (await page.screenshot({ fullPage: true })).toString('base64');

      const measured = await page.evaluate(
        async ({ b64, boxes, texts }) => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + b64;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);

          // Blank icons
          const blank = [];
          for (const box of boxes) {
            const inset = Math.max(6, Math.min(box.w, box.h) * 0.25);
            const x = Math.round(box.x + inset);
            const y = Math.round(box.y + inset);
            const w = Math.round(box.w - 2 * inset);
            const h = Math.round(box.h - 2 * inset);
            if (w < 2 || h < 2) continue;

            const data = ctx.getImageData(x, y, w, h).data;
            const min = [255, 255, 255];
            const max = [0, 0, 0];
            for (let i = 0; i < data.length; i += 4) {
              for (let c = 0; c < 3; c++) {
                if (data[i + c] < min[c]) min[c] = data[i + c];
                if (data[i + c] > max[c]) max[c] = data[i + c];
              }
            }
            const spread = max[0] - min[0] + (max[1] - min[1]) + (max[2] - min[2]);
            if (spread < 30) blank.push(box.label);
          }

          // Text contrast, measured against the real pixels behind each text box
          const lum = (c) => {
            const f = (v) => {
              v /= 255;
              return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
          };
          const contrast = (a, b) => {
            const l1 = lum(a);
            const l2 = lum(b);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };

          const groups = new Map();
          for (const t of texts) {
            const x = Math.max(0, Math.round(t.x));
            const y = Math.max(0, Math.round(t.y));
            const w = Math.min(img.width - x, Math.round(t.w));
            const h = Math.min(img.height - y, Math.round(t.h));
            if (w < 2 || h < 2) continue;

            const data = ctx.getImageData(x, y, w, h).data;
            const step = Math.max(1, Math.floor((w * h) / 400));
            let r = 0;
            let g = 0;
            let b = 0;
            let n = 0;
            for (let i = 0; i < w * h; i += step) {
              const k = i * 4;
              r += data[k];
              g += data[k + 1];
              b += data[k + 2];
              n++;
            }
            const bg = { r: r / n, g: g / n, b: b / n };
            const a = t.color.a;
            const text = {
              r: t.color.r * a + bg.r * (1 - a),
              g: t.color.g * a + bg.g * (1 - a),
              b: t.color.b * a + bg.b * (1 - a)
            };
            const ratio = contrast(text, bg);
            if (ratio >= 3) continue;

            const key = [text.r, text.g, text.b, bg.r, bg.g, bg.b]
              .map((v) => Math.round(v / 16))
              .join(',');
            if (!groups.has(key)) {
              groups.set(key, {
                count: 0,
                ratio,
                text: `rgb(${Math.round(text.r)}, ${Math.round(text.g)}, ${Math.round(text.b)})`,
                bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
                examples: []
              });
            }
            const group = groups.get(key);
            group.count++;
            group.ratio = Math.min(group.ratio, ratio);
            if (group.examples.length < 2) group.examples.push(`"${t.text}" in <${t.desc}>`);
          }

          return { blank, contrastGroups: Array.from(groups.values()) };
        },
        { b64: screenshot, boxes: blankCandidates, texts: textBoxes }
      );

      for (const label of measured.blank) {
        issues.push(
          `Blank icon: <${label}> looks empty. Nothing is drawn inside it, so the requested icon or drawing is missing. Draw it with real child elements or an inline SVG that have an explicit size and a color that contrasts with the box background.`
        );
      }

      for (const group of measured.contrastGroups.slice(0, 4)) {
        issues.push(
          `Low contrast: ${group.count} text element(s), for example ${group.examples.join(' and ')}, have text color ${group.text} on background ${group.bg}, a contrast ratio of ${group.ratio.toFixed(1)}:1. It is hard to read. Use clearly light text on dark backgrounds or dark text on light backgrounds (at least 4.5:1).`
        );
      }
    }

    const finalIssues = issues.slice(0, 12);
    return { success: true, passed: finalIssues.length === 0, issues: finalIssues };
  } catch (err) {
    return { success: false, message: `Page check failed: ${err.message}` };
  } finally {
    await browser.close();
  }
}

module.exports = { checkPage };