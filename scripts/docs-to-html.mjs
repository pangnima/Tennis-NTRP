// md → 단독 HTML(목차 사이드바·코드 복사·다크 모드). md가 정본이다 — md를 고치면 다시 돌린다.
// 사용: node scripts/docs-to-html.mjs docs/setup-and-release.md docs/setup-and-release.html
import { readFileSync, writeFileSync } from 'node:fs'
import { Marked } from 'marked'

const [, , input, output] = process.argv
const md = readFileSync(input, 'utf8').replace(/\r\n/g, '\n')

// GitHub와 같은 제목 id — md 안의 (#…) 링크가 그대로 맞는다
const slug = (t) => t.trim().toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-')
const toc = []
const marked = new Marked({ gfm: true })
marked.use({
    renderer: {
        heading({ tokens, depth, text }) {
            const html = this.parser.parseInline(tokens)
            const id = slug(text.replace(/`/g, ''))
            if (depth === 2 || depth === 3) toc.push({ depth, id, html })
            return `<h${depth} id="${id}"><a class="anchor" href="#${id}">#</a>${html}</h${depth}>\n`
        },
    },
})

let body = marked.parse(md)
// > 💬 / > ⚠ / > 💡 인용을 색 있는 상자로
body = body.replace(/<blockquote>\s*<p>(💬|⚠|💡)/g, (m, e) => {
    const cls = e === '💬' ? 'claude' : e === '⚠' ? 'warn' : 'tip'
    return `<blockquote class="${cls}"><p>${e}`
})
// marked가 퍼센트 인코딩한 본문 안 링크(#…)를 제목 id와 같은 글자로
body = body.replace(/href="#([^"]+)"/g, (m, h) => `href="#${decodeURIComponent(h)}"`)
// 바깥 링크는 새 탭으로
body = body.replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"')
// 표는 가로 스크롤 상자로
body = body.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>')

const title = (md.match(/^# (.+)$/m) || [, '문서'])[1]
const tocHtml = toc
    .map((t) => `<a class="toc-${t.depth}" href="#${t.id}">${t.html.replace(/<a[^>]*>|<\/a>/g, '')}</a>`)
    .join('\n')

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/<[^>]+>/g, '')}</title>
<style>
:root{--bg:#ffffff;--fg:#1f2328;--muted:#59636e;--line:#d1d9e0;--soft:#f6f8fa;--accent:#0969da;--code:#eff2f5;
  --claude-bg:#eef6ff;--claude-line:#4c8eda;--warn-bg:#fff6e5;--warn-line:#d4a72c;--tip-bg:#ecfbf1;--tip-line:#2da44e}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#9198a1;--line:#30363d;--soft:#151b23;--accent:#4493f8;--code:#1f2630;
  --claude-bg:#0f2135;--claude-line:#4493f8;--warn-bg:#2b2111;--warn-line:#d29922;--tip-bg:#0f2a1a;--tip-line:#3fb950}}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:16px}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;word-break:keep-all}
.layout{display:grid;grid-template-columns:280px minmax(0,1fr);max-width:1280px;margin:0 auto}
nav{position:sticky;top:0;height:100vh;overflow:auto;padding:24px 16px;border-right:1px solid var(--line);font-size:14px}
nav .nav-title{font-weight:700;margin:0 0 12px 8px}
nav a{display:block;padding:4px 8px;border-radius:6px;color:var(--muted);text-decoration:none;line-height:1.4}
nav a:hover{background:var(--soft);color:var(--fg)}
nav a.active{background:var(--soft);color:var(--accent);font-weight:600}
nav .toc-3{padding-left:22px;font-size:13px}
main{padding:32px 48px 120px;min-width:0}
h1{font-size:30px;line-height:1.3;margin:0 0 16px}
h2{font-size:24px;margin:56px 0 16px;padding-bottom:8px;border-bottom:1px solid var(--line)}
h3{font-size:19px;margin:36px 0 12px}
h4{font-size:16px;margin:24px 0 8px}
h1,h2,h3,h4{position:relative}
.anchor{position:absolute;left:-22px;color:var(--muted);text-decoration:none;opacity:0;font-weight:400}
h2:hover .anchor,h3:hover .anchor{opacity:1}
a{color:var(--accent)}
p,ul,ol{margin:0 0 14px}
li{margin:4px 0}
hr{border:0;border-top:1px solid var(--line);margin:40px 0}
code{font:0.88em ui-monospace,SFMono-Regular,Consolas,"D2Coding",monospace;background:var(--code);padding:2px 6px;border-radius:5px}
pre{position:relative;background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:14px 16px;overflow:auto;margin:0 0 16px}
pre code{background:none;padding:0;font-size:14px;line-height:1.6}
.copy{position:absolute;top:8px;right:8px;font:12px sans-serif;padding:4px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--muted);cursor:pointer}
.copy:hover{color:var(--fg)}
.table-wrap{overflow-x:auto;margin:0 0 18px}
table{border-collapse:collapse;width:100%;font-size:14.5px}
th,td{border:1px solid var(--line);padding:8px 12px;text-align:left;vertical-align:top}
th{background:var(--soft);font-weight:600;white-space:nowrap}
blockquote{margin:0 0 16px;padding:10px 16px;border-left:4px solid var(--line);background:var(--soft);border-radius:0 8px 8px 0;color:var(--fg)}
blockquote p:last-child{margin-bottom:0}
blockquote.claude{background:var(--claude-bg);border-color:var(--claude-line)}
blockquote.warn{background:var(--warn-bg);border-color:var(--warn-line)}
blockquote.tip{background:var(--tip-bg);border-color:var(--tip-line)}
input[type=checkbox]{margin-right:6px;transform:translateY(1px)}
li:has(> input[type=checkbox]){list-style:none;margin-left:-20px}
.menu-btn{display:none}
@media (max-width:900px){
  .layout{display:block}
  nav{position:fixed;inset:0 30% 0 0;z-index:10;background:var(--bg);transform:translateX(-100%);transition:transform .2s;box-shadow:0 0 24px rgba(0,0,0,.2)}
  nav.open{transform:none}
  main{padding:56px 18px 100px}
  .menu-btn{display:block;position:fixed;top:10px;left:10px;z-index:11;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px}
  .anchor{display:none}
}
@media print{nav,.menu-btn,.copy{display:none}.layout{display:block}main{padding:0}}
</style>
</head>
<body>
<button class="menu-btn" onclick="document.querySelector('nav').classList.toggle('open')">☰ 목차</button>
<div class="layout">
<nav><p class="nav-title">목차</p>
${tocHtml}
</nav>
<main>
${body}
</main>
</div>
<script>
document.querySelectorAll('pre').forEach(function(pre){
  var b=document.createElement('button');b.className='copy';b.textContent='복사';
  b.onclick=function(){navigator.clipboard.writeText(pre.querySelector('code').innerText).then(function(){b.textContent='복사됨';setTimeout(function(){b.textContent='복사'},1500)})};
  pre.appendChild(b);
});
document.querySelectorAll('nav a').forEach(function(a){a.addEventListener('click',function(){document.querySelector('nav').classList.remove('open')})});
var links=[].slice.call(document.querySelectorAll('nav a'));
var obs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id)})}})},{rootMargin:'0px 0px -75% 0px'});
document.querySelectorAll('main h2[id],main h3[id]').forEach(function(h){obs.observe(h)});
</script>
</body>
</html>
`
writeFileSync(output, html)
console.log('ok', output, 'toc', toc.length)
