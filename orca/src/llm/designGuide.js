const designGuide = `
DESIGN QUALITY RULES (apply whenever the task is a website, landing page, form, dashboard or any visual UI):
1. Start with CSS variables in :root for the palette: one accent color, a background, a surface (card) color, a text color and a muted text color. Text must be clearly readable on its background: dark text on light backgrounds, white text on dark or accent backgrounds. On a dark theme use a near-black background, a slightly lighter surface for cards, near-white headings, and body and muted text that is still light (at least #cbd5e1 for body text and #94a3b8 for muted text).
2. Add *{box-sizing:border-box;margin:0;padding:0} and use a system font stack with line-height 1.6.
3. Keep content inside a centered .container with max-width 1100px and 24px side padding. Never let anything run past the page width.
4. Give sections generous vertical padding (80 to 100px) and use consistent spacing in multiples of 8px.
5. Stack hero content vertically and center it: headline first, then the subtitle, then the button. Never place them side by side in a row.
6. Lay out groups of cards with CSS grid: grid-template-columns:repeat(auto-fit,minmax(260px,1fr)) with a gap. Cards need padding, border-radius, a soft shadow and a hover effect (translateY plus a stronger shadow, with a transition).
7. Navigation: logo on the left, links on the right (flex, space-between). The main call-to-action button must be a SOLID filled button in the accent color, with text that clearly contrasts with the accent (white text on a dark accent, dark text on a light accent). It needs padding, a border-radius, a hover state and a transition. Never make the main button the same color as its background.
8. Write real, specific content that fits the request. Every card title and description must be about the actual subject: a project card needs a believable project name and one or two sentences about what it does, a feature card needs a real benefit. NEVER use placeholders such as "Project One", "Feature one", "Description of the first project", "Your text here" or lorem ipsum. Do not use external images, fonts or CDNs. Use gradients, emoji or inline SVG for visuals.
9. Include the viewport meta tag and make the layout work on narrow screens.
10. Produce ONE complete, finished page. Style EVERY element. Never leave default browser styling on buttons, inputs or links.

The reference page below shows the expected level of quality and the expected quality of the text. Copy its structure, spacing and polish, but replace ALL of its text and colors with content and a palette that fit the user's request. Do not copy its words.

REFERENCE PAGE START
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clay & Kiln</title>
<style>
:root{--bg:#faf8f5;--surface:#ffffff;--text:#1f2933;--muted:#5f6b76;--accent:#c2410c;--accent-dark:#9a3412;--radius:14px}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.container{max-width:1100px;margin:0 auto;padding:0 24px}
nav{background:var(--surface);box-shadow:0 1px 8px rgba(0,0,0,.06)}
.nav-inner{display:flex;justify-content:space-between;align-items:center;height:68px}
.logo{font-size:1.4rem;font-weight:800;color:var(--accent)}
.nav-links{display:flex;gap:28px;list-style:none}
.nav-links a{color:var(--text);text-decoration:none;font-weight:500}
.nav-links a:hover{color:var(--accent)}
.hero{text-align:center;padding:110px 0 100px;background:linear-gradient(135deg,#fff1e6,#fde4cf)}
.hero h1{font-size:clamp(2.2rem,5vw,3.6rem);line-height:1.15;max-width:760px;margin:0 auto 20px}
.hero p{font-size:1.2rem;color:var(--muted);max-width:560px;margin:0 auto 32px}
.btn{display:inline-block;padding:14px 32px;background:var(--accent);color:#fff;border-radius:999px;text-decoration:none;font-weight:600;transition:background .2s,transform .2s}
.btn:hover{background:var(--accent-dark);transform:translateY(-2px)}
.features{padding:90px 0}
.features h2{text-align:center;font-size:2rem;margin-bottom:48px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:28px}
.card{background:var(--surface);padding:32px;border-radius:var(--radius);box-shadow:0 4px 18px rgba(0,0,0,.07);transition:transform .25s,box-shadow .25s}
.card:hover{transform:translateY(-6px);box-shadow:0 12px 28px rgba(0,0,0,.12)}
.card h3{margin-bottom:10px}
.card p{color:var(--muted)}
footer{background:#1f2933;color:#cbd2d9;text-align:center;padding:32px 0}
</style>
</head>
<body>
<nav><div class="container nav-inner"><span class="logo">Clay & Kiln</span><ul class="nav-links"><li><a href="#">Shop</a></li><li><a href="#">Studio</a></li><li><a href="#">Contact</a></li></ul></div></nav>
<header class="hero"><div class="container"><h1>Handmade pottery for everyday life</h1><p>Small-batch mugs, bowls and vases, shaped and glazed by hand in our studio.</p><a class="btn" href="#">Browse the collection</a></div></header>
<section class="features"><div class="container"><h2>Why people love our pieces</h2><div class="grid">
<div class="card"><h3>Thrown by hand</h3><p>Every piece is shaped on the wheel, so no two mugs are exactly alike.</p></div>
<div class="card"><h3>Food-safe glazes</h3><p>Dishwasher and microwave safe, with colors that stay bright after years of use.</p></div>
<div class="card"><h3>Made to last</h3><p>Fired at high temperature for strength, so your favorite bowl lives for decades.</p></div>
</div></div></section>
<footer><div class="container">© 2026 Clay & Kiln. All rights reserved.</div></footer>
</body>
</html>
REFERENCE PAGE END
`;

module.exports = { designGuide };