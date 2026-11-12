import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dependency-free browser checks against an isolated Edge profile and local HTTP.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.qa');
const profile = path.join(output, 'browser-profile');
const screenshots = path.join(output, 'screenshots');
const executable = process.env.QA_EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const simulatorOnly = process.argv.includes('--simulator-only');
const result = { generatedAt: new Date().toISOString(), browser: executable, checks: [], consoleErrors: [], networkFailures: [], resourceResponses: [], screenshots: [] };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (name, passed, detail) => {
  result.checks.push({ name, passed: !!passed, ...(detail === undefined ? {} : { detail }) });
  if (!passed) process.stdout.write(`FAIL ${name}: ${JSON.stringify(detail)}\n`);
};
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
await mkdir(screenshots, { recursive: true });
await mkdir(profile, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    const mask404 = pathname.startsWith('/__qa_mask404__/');
    if (mask404) pathname = pathname.slice('/__qa_mask404__'.length);
    if (mask404 && pathname.endsWith('/ambiente-mascara.png')) { res.writeHead(404); res.end('Intentional QA mask failure'); return; }
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep) || ['.git', '.codex', '.agents', '.aws', '.qa'].some(segment => path.relative(root, filename).split(path.sep).includes(segment))) {
      res.writeHead(403); res.end(); return;
    }
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
result.baseUrl = base;
// Only this temporary profile's discovery file is cleared; no user browser is touched.
await rm(path.join(profile, 'DevToolsActivePort'), { force: true });
const edge = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-extensions', '--disable-features=msEdgeSidebarV2', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let browserErrors = '';
edge.stderr.on('data', chunk => { browserErrors = (browserErrors + chunk).slice(-3000); });
let socket;
let nextId = 0;
const pending = new Map();
const sessions = [];
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
  pending.set(id, { resolve, reject, timeout });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
async function page(width = 1440, height = 1000, options = {}) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const p = { targetId, sessionId, width, height, mode: options.mode || 'normal', requests: new Map() };
  sessions.push(p);
  p.send = (method, params) => send(method, params, sessionId);
  p.eval = async expression => {
    const answer = await p.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (answer.exceptionDetails) throw new Error(answer.exceptionDetails.text + ': ' + answer.exceptionDetails.exception?.description);
    return answer.result.value;
  };
  p.wait = async (expression, timeout = 10000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) { if (await p.eval(expression)) return true; await delay(80); }
    throw new Error(`Browser wait timed out: ${expression}`);
  };
  p.key = async (key, code = key, virtual = key.length === 1 ? key.toUpperCase().charCodeAt(0) : ({ Enter: 13, Escape: 27, Tab: 9, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35 }[key] || 0), modifiers = 0) => {
    const props = { key, code, windowsVirtualKeyCode: virtual, nativeVirtualKeyCode: virtual, modifiers };
    await p.send('Input.dispatchKeyEvent', { type: 'keyDown', ...props, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : key === ' ' ? { text:' ', unmodifiedText:' ' } : {}) });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', ...props });
  };
  p.click = async selector => {
    const rect = await p.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center',behavior:'instant'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...rect });
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...rect });
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...rect });
    await delay(40);
  };
  p.capture = async (name, selector) => {
    let clip;
    if (selector) {
      clip = await p.eval(`(() => {const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'start',behavior:'instant'}); const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);
      await delay(200);
    }
    const { data } = await p.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!clip, ...(clip ? { clip } : {}) });
    const relative = `screenshots/${name}.png`;
    await writeFile(path.join(output, relative), Buffer.from(data, 'base64'));
    result.screenshots.push(relative);
  };
  p.focusCheck = async (name, selector) => {
    const state=await p.eval(`(() => {const e=document.querySelector(${JSON.stringify(selector)}); const s=getComputedStyle(e);return {active:document.activeElement===e,visible:e.matches(':focus-visible'),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,shadow:s.boxShadow};})()`);
    check(name,state.active&&state.visible&&(state.outlineStyle!=='none'&&parseFloat(state.outlineWidth)>0||state.shadow!=='none'),state);
  };
  await Promise.all([p.send('Page.enable'), p.send('Runtime.enable'), p.send('Network.enable'), p.send('Log.enable')]);
  await p.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  if (options.reduced) await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  if (options.nojs) await p.send('Emulation.setScriptExecutionDisabled', { value: true });
  if (options.noio) await p.send('Page.addScriptToEvaluateOnNewDocument', { source: 'delete window.IntersectionObserver;' });
  await p.send('Page.navigate', { url: base + (options.mask404 ? '/__qa_mask404__/index.html' : '/index.html') });
  await p.wait("document.readyState === 'complete'", 45000);
  await delay(1800);
  return p;
}
async function loadAll(p) {
  const count=await p.eval("document.querySelectorAll('img[loading=lazy]').length");
  for(let index=0;index<count;index++){await p.eval(`document.querySelectorAll('img[loading=lazy]')[${index}].scrollIntoView({block:'center',behavior:'instant'})`);await delay(80);}
  await p.eval("window.scrollTo({top:0,behavior:'instant'})");
  await delay(500);
  await p.wait("[...document.querySelectorAll('img[src]')].every(i=>i.complete)");
}
async function layout(p, label) {
  const measured = await p.eval(`(() => ({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth, h1:document.querySelector('h1').textContent.trim(), images:[...document.querySelectorAll('img[src]')].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,loaded:i.complete})), offenders:[...document.body.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)&&getComputedStyle(e).position!=='absolute'&&!e.closest('.hero-art,.living-paint,.lightbox,.skip-link')}).slice(0,12).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left}))}))()`);
  check(`${label}: viewport`, measured.width === p.width, measured);
  check(`${label}: no horizontal overflow`, measured.scroll <= measured.client + 1 && measured.body <= measured.client + 1, measured);
  check(`${label}: images loaded`, measured.images.every(i => i.loaded && i.width > 0), measured.images);
  check(`${label}: principal content`, measured.h1.length > 20);
  await p.capture(`viewport-${label}`);
  await p.capture(`fullpage-${label}`, 'body');
}
async function menu(p, label) {
  if (p.width >= 900) { check(`${label}: desktop menu`, await p.eval("document.querySelector('.menu-toggle').hidden && !document.querySelector('#menu-principal').hidden")); return; }
  check(`${label}: mobile initial menu`, await p.eval("!document.querySelector('.menu-toggle').hidden && document.querySelector('#menu-principal').hidden"));
  await p.click('.menu-toggle');
  check(`${label}: menu opens`, await p.eval("!document.querySelector('#menu-principal').hidden && document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true'"));
  await p.click('.menu-toggle');
  check(`${label}: toggle closes menu`, await p.eval("document.querySelector('#menu-principal').hidden"));
  await p.click('.menu-toggle'); await p.key('Escape');
  check(`${label}: Escape closes and focuses`, await p.eval("document.querySelector('#menu-principal').hidden && document.activeElement.matches('.menu-toggle')"));
  await p.focusCheck(`${label}: menu keyboard focus visible`, '.menu-toggle');
  if(p.width===375) await p.capture('focus-visible-menu');
  await p.key(' ', 'Space', 32);
  check(`${label}: Space opens menu`, await p.eval("!document.querySelector('#menu-principal').hidden"));
  await p.key('Escape');
  await p.click('.menu-toggle'); await p.click('.hero h1');
  check(`${label}: outside closes menu`, await p.eval("document.querySelector('#menu-principal').hidden"));
  await p.click('.menu-toggle'); await p.click('#menu-principal a[href="#sobre"]');
  await delay(500);
  check(`${label}: menu anchor works`, await p.eval("location.hash==='#sobre' && document.querySelector('#menu-principal').hidden"));
  await p.click('.menu-toggle');
  await p.eval("document.querySelector('#menu-principal a').focus()");
  await p.send('Emulation.setDeviceMetricsOverride',{width:1000,height:p.height,deviceScaleFactor:1,mobile:false}); await delay(80);
  check(`${label}: desktop resize shows navigation`,await p.eval("document.querySelector('.menu-toggle').hidden&&!document.querySelector('#menu-principal').hidden"));
  await p.send('Emulation.setDeviceMetricsOverride',{width:p.width,height:p.height,deviceScaleFactor:1,mobile:false}); await delay(80);
  check(`${label}: mobile resize closes and restores focus`,await p.eval("!document.querySelector('.menu-toggle').hidden&&document.querySelector('#menu-principal').hidden&&document.activeElement.matches('.menu-toggle')"));
}
async function fan(p, label) {
  const names = await p.eval("[...document.querySelectorAll('.fan-sheet')].map(e=>({name:e.dataset.fanName,label:e.getAttribute('aria-label'),disabled:e.disabled}))");
  check(`${label}: seven named enabled fan buttons`, names.length === 7 && names.every(n=>n.name && n.label===n.name && !n.disabled), names);
  await p.eval("document.querySelector('.fan-sheet').focus()");
  await p.key('Tab','Tab',9,8);
  await p.key('Tab');
  await p.focusCheck(`${label}: fan keyboard focus visible`,'.fan-sheet');
  for (let index=0;index<names.length;index++) {
    if(index>0) await p.key('Tab');
    await p.key('Enter'); await delay(30);
    const state = await p.eval(`(() => ({count:document.querySelectorAll('.fan-sheet[aria-pressed="true"]').length,name:document.querySelector('.fan-selection-name').textContent,hex:document.querySelector('.fan-selection-hex').textContent,selected:document.querySelectorAll('.fan-sheet')[${index}].getAttribute('aria-pressed'),focus:document.activeElement.className}))()`);
    check(`${label}: fan ${names[index].name}`, state.count===1 && state.selected==='true' && state.name===names[index].name && /^#[A-F\d]{6}$/.test(state.hex), state);
  }
  await p.eval("document.querySelector('.fan-sheet').focus()");
  await p.key(' ','Space',32);
  check(`${label}: fan Space activation`,await p.eval("document.querySelector('.fan-sheet').getAttribute('aria-pressed')==='true'&&document.querySelector('.fan-selection-name').textContent==='Areia'"));
  if(p.width===1440) await p.capture('focus-visible-fan','.hero-visual');
}
async function simulator(p, label, takeShots = false) {
  await p.eval("document.querySelector('.paint-simulator').scrollIntoView({block:'center',behavior:'instant'})");
  await p.wait("!document.querySelector('.simulator-palette').disabled && !document.querySelector('.simulator-wall').hidden");
  const mask = await p.eval("({active:document.querySelector('.simulator-wall').classList.contains('has-png-mask'),feedback:document.querySelector('.simulator-feedback').textContent,feedbackHidden:document.querySelector('.simulator-feedback').hidden})");
  check(`${label}: PNG mask active`, mask.active && mask.feedbackHidden, mask);
  const colors = await p.eval("[...document.querySelectorAll('[data-paint-color]')].map(b=>({name:b.querySelector('.paint-color-name').textContent,hex:b.dataset.paintColor}))");
  check(`${label}: six simulator colors`, colors.length===6, colors);
  await p.eval("document.querySelector('[data-paint-color]').focus()"); await p.key('Tab');
  await p.focusCheck(`${label}: palette keyboard focus visible`,'[data-paint-color="#dfcfb3"]');
  if(takeShots) await p.capture('focus-visible-palette','.paint-simulator');
  for (let index=0;index<colors.length;index++) {
    await p.click(`[data-paint-color="${colors[index].hex}"]`);
    await p.wait("!document.querySelector('.paint-simulator').classList.contains('is-painting') && document.querySelector('.simulator-paint-next').hidden");
    await delay(100);
    const state=await p.eval("({name:document.querySelector('.simulator-color-name').textContent,count:document.querySelectorAll('[data-paint-color][aria-pressed=true]').length,color:getComputedStyle(document.querySelector('.simulator-paint-current')).backgroundColor,selected:document.querySelector('[data-paint-color][aria-pressed=true]').dataset.paintColor})");
    const expectedRgb='rgb('+colors[index].hex.slice(1).match(/../g).map(channel=>parseInt(channel,16)).join(', ')+')';
    check(`${label}: paint ${colors[index].name}`, state.name===colors[index].name && state.count===1 && state.selected===colors[index].hex && state.color===expectedRgb, {...state,expectedRgb});
    if (takeShots && [0,1,5].includes(index)) await p.capture(`simulator-${label}-${colors[index].name.toLowerCase().replaceAll(' ','-')}`, '.paint-simulator');
  }
  await delay(400);
  await p.capture(`simulator-${label}-final`, '.paint-simulator');
}
async function lightbox(p,label) {
  await p.click('.gallery-photo');
  await p.wait("document.querySelector('#visualizacao-trabalho').open && !document.querySelector('.lightbox-image').hidden");
  check(`${label}: lightbox opens`, await p.eval("document.activeElement.matches('.lightbox-close') && document.documentElement.classList.contains('has-work-lightbox') && document.querySelector('.lightbox-image').naturalWidth>0"));
  await p.click('.lightbox-next');
  check(`${label}: next`, await p.eval("document.querySelector('.lightbox-counter').textContent==='2 de 2'"));
  await p.click('.lightbox-prev');
  check(`${label}: previous`, await p.eval("document.querySelector('.lightbox-counter').textContent==='1 de 2'"));
  await p.key('ArrowRight');
  check(`${label}: ArrowRight`, await p.eval("document.querySelector('.lightbox-counter').textContent==='2 de 2'"));
  await p.key('ArrowLeft'); await p.key('End');
  check(`${label}: End`, await p.eval("document.querySelector('.lightbox-counter').textContent==='2 de 2'"));
  await p.key('Home');
  check(`${label}: Home`, await p.eval("document.querySelector('.lightbox-counter').textContent==='1 de 2'"));
  await p.eval("document.querySelector('.lightbox-original').focus()"); await p.key('Tab');
  check(`${label}: focus loops`, await p.eval("document.activeElement.matches('.lightbox-close')"));
  await p.focusCheck(`${label}: lightbox keyboard focus visible`,'.lightbox-close');
  if(p.width===1440) await p.capture('focus-visible-lightbox');
  await p.key('Tab','Tab',9,8);
  check(`${label}: Shift Tab loops`,await p.eval("document.activeElement.matches('.lightbox-original')"));
  await p.key('Escape'); await delay(80);
  check(`${label}: Escape restores focus`, await p.eval("!document.querySelector('#visualizacao-trabalho').open && document.activeElement.matches('.gallery-photo') && !document.documentElement.classList.contains('has-work-lightbox')"));
  await p.click('.gallery-photo'); await p.click('.lightbox-close'); await delay(80);
  check(`${label}: close restores focus`, await p.eval("!document.querySelector('#visualizacao-trabalho').open && document.activeElement.matches('.gallery-photo')"));
  await p.click('.gallery-photo');
  await p.send('Input.dispatchMouseEvent',{type:'mousePressed',x:2,y:2,button:'left',clickCount:1});
  await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:2,y:2,button:'left',clickCount:1});
  await delay(80);
  check(`${label}: backdrop restores focus`, await p.eval("!document.querySelector('#visualizacao-trabalho').open && document.activeElement.matches('.gallery-photo')"));
  if(await p.eval("document.querySelector('#visualizacao-trabalho').open")) await p.key('Escape');
}
try {
  let active;
  for(let attempt=0;attempt<150;attempt++) {
    try { active=await readFile(path.join(profile,'DevToolsActivePort'),'utf8'); if(active.trim()) break; } catch {}
    if(edge.exitCode!==null) throw new Error(`Edge exited: ${edge.exitCode}. ${browserErrors}`);
    await delay(100);
  }
  if(!active) throw new Error('Edge did not expose CDP');
  const [port, endpoint] = active.trim().split(/\r?\n/);
  socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id){const p=pending.get(message.id);if(!p)return;pending.delete(message.id);clearTimeout(p.timeout);message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result);return;}
    const p=sessions.find(p=>p.sessionId===message.sessionId);
    if(message.method==='Runtime.exceptionThrown') result.consoleErrors.push({mode:p?.mode,width:p?.width,exception:message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text});
    if(message.method==='Log.entryAdded' && message.params.entry.level==='error') result.consoleErrors.push({mode:p?.mode,width:p?.width,entry:message.params.entry.text,url:message.params.entry.url});
    if(message.method==='Network.responseReceived'){
      const response={mode:p?.mode,width:p?.width,url:message.params.response.url,status:message.params.response.status,type:message.params.type,mimeType:message.params.response.mimeType};
      result.resourceResponses.push(response);
      if(message.params.response.status>=400)result.networkFailures.push(response);
    }
    if(message.method==='Network.loadingFailed') result.networkFailures.push({mode:p?.mode,width:p?.width,error:message.params.errorText,canceled:message.params.canceled});
  });
  result.browserVersion=await send('Browser.getVersion');
  for(const width of [320,375,600,768,900,1440]) {
    process.stdout.write(`Checking ${width}px\n`);
    const p=await page(width,1000);
    await loadAll(p);
    await layout(p,String(width));
    const fonts=await p.eval("({loaded:document.fonts.check('900 22px \"Font Awesome 6 Free\"'),faces:[...document.fonts].filter(f=>f.family.includes('Awesome')).map(f=>({family:f.family,status:f.status}))})");
    check(`${width}: Font Awesome loaded`,fonts.loaded&&fonts.faces.some(f=>f.status==='loaded'),fonts);
    if(!simulatorOnly){await menu(p,String(width));await fan(p,String(width));}
    await simulator(p,String(width),width===1440);
    if(!simulatorOnly) await lightbox(p,String(width));
    const links=await p.eval("({missing:[...document.querySelectorAll('a[href^=\"#\"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.getAttribute('href')),whatsapp:[...document.querySelectorAll('a[href*=\"wa.me\"]')].map(a=>a.href),mail:[...document.querySelectorAll('a[href^=\"mailto:\"]')].map(a=>a.href)})");
    check(`${width}: internal links and contacts`,links.missing.length===0&&links.whatsapp.length>0&&links.whatsapp.every(h=>/^https:\/\/wa\.me\/\d+\?text=/.test(h))&&links.mail.includes('mailto:resicrilpinturas@gmail.com'),links);
    await send('Target.closeTarget',{targetId:p.targetId});
  }
  if(!simulatorOnly){
    process.stdout.write('Checking reduced motion, no JS and fallbacks\n');
    const reduced=await page(375,1000,{reduced:true,mode:'reduced-motion'}); await loadAll(reduced);
    check('reduced motion: CSS animations disabled',await reduced.eval("[...document.querySelectorAll('.paint-title-text,.paint-ribbon,.fan-blade,.gallery-entry')].every(e=>getComputedStyle(e).animationName==='none')"));
    await fan(reduced,'reduced motion'); await simulator(reduced,'reduced motion'); await lightbox(reduced,'reduced motion');
    check('reduced motion: gallery visible',await reduced.eval("[...document.querySelectorAll('.gallery-entry')].every(e=>getComputedStyle(e).opacity==='1'&&!e.classList.contains('is-pending'))"));
    await reduced.capture('reduced-motion');
    await send('Target.closeTarget',{targetId:reduced.targetId});
    const nojs=await page(375,1000,{nojs:true,mode:'no-js'}); await loadAll(nojs); await layout(nojs,'no-js');
    check('no JS: menu fully visible',await nojs.eval("document.querySelector('.menu-toggle').hidden&&!document.querySelector('#menu-principal').hidden"));
    check('no JS: original photo and noscript',await nojs.eval("document.querySelector('.simulator-wall').hidden && document.querySelector('.simulator-image').naturalWidth>0 && [...document.querySelectorAll('noscript')].some(e=>e.textContent.includes('Ative o JavaScript'))"));
    check('no JS: gallery links usable and visible',await nojs.eval("[...document.querySelectorAll('.gallery-photo')].length===2&&[...document.querySelectorAll('.gallery-entry')].every(e=>getComputedStyle(e).opacity==='1')"));
    await send('Target.closeTarget',{targetId:nojs.targetId});
    const noio=await page(375,1000,{noio:true,mode:'no-intersection-observer'}); await loadAll(noio);
    check('no IntersectionObserver: content visible',await noio.eval("!('IntersectionObserver' in window)&&[...document.querySelectorAll('.gallery-entry')].every(e=>getComputedStyle(e).opacity==='1'&&!e.classList.contains('is-pending'))"));
    await fan(noio,'no IntersectionObserver');
    await send('Target.closeTarget',{targetId:noio.targetId});
    const fallback=await page(1440,1000,{mask404:true,mode:'mask-404'});await loadAll(fallback);
    await fallback.eval("document.querySelector('.paint-simulator').scrollIntoView({behavior:'instant'})");
    await fallback.wait("!document.querySelector('.simulator-palette').disabled");
    check('mask 404: polygon fallback remains usable',await fallback.eval("!document.querySelector('.simulator-wall').hidden&&!document.querySelector('.simulator-wall').classList.contains('has-png-mask')&&!document.querySelector('.simulator-feedback').hidden&&document.querySelector('.simulator-feedback').textContent.includes('recorte anterior')"));
    await fallback.click('[data-paint-color="#28547a"]');await delay(900);
    check('mask 404: color changes',await fallback.eval("document.querySelector('.simulator-color-name').textContent==='Azul Profundo'"));
    await fallback.capture('mask-404-fallback','.paint-simulator');
    await send('Target.closeTarget',{targetId:fallback.targetId});
  }
  check('normal pages: no JavaScript exceptions',result.consoleErrors.filter(e=>e.exception).length===0,result.consoleErrors.filter(e=>e.exception));
  check('normal pages: local resources succeed',result.networkFailures.filter(e=>e.status>=400&&e.mode==='normal'&&e.url.startsWith(base)).length===0,result.networkFailures.filter(e=>e.mode==='normal'&&e.url?.startsWith(base)));
} catch(error) {
  result.fatalError=error.stack || String(error);
  process.stdout.write(`FATAL ${result.fatalError}\n`);
} finally {
  result.summary={total:result.checks.length,passed:result.checks.filter(c=>c.passed).length,failed:result.checks.filter(c=>!c.passed).length,fatal:!!result.fatalError};
  result.browserStderr=browserErrors;
  await writeFile(path.join(output,simulatorOnly?'simulator-results.json':'browser-results.json'),JSON.stringify(result,null,2)+'\n');
  try {if(socket?.readyState===WebSocket.OPEN) await send('Browser.close');}catch{}
  await delay(300);
  socket?.close();
  if(edge.exitCode===null) edge.kill();
  await new Promise(resolve=>server.close(resolve));
  process.stdout.write(JSON.stringify(result.summary)+'\n');
  process.exitCode=result.summary.failed||result.summary.fatal?1:0;
}
