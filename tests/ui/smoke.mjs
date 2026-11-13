/**
 * UI smoke test: drives the real app in headless Chrome over the DevTools protocol.
 *
 *   npm run build && npm start        # in another terminal (needs DATABASE_URL)
 *   npm run test:ui                   # BASE_URL, CHROME_PATH and SHOTS_DIR override the defaults
 *
 * Creates its own user, organization and project through the API, then checks the dashboard,
 * search, the board (create, move, realtime), the task dialog, settings, docs and the 404 page,
 * and fails on any uncaught exception or console error.
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = process.env.SHOTS_DIR ?? mkdtempSync(join(tmpdir(), 'fellow-shots-'));
mkdirSync(OUT, { recursive: true });
let failures = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- a signed-in user with an org, a project and two tasks (through the API)
let cookie = '';
async function api(method, path, body) {
  const r = await fetch(B + path, { method, headers: { 'content-type': 'application/json', ...(cookie && { cookie }) }, body: body && JSON.stringify(body) });
  const set = r.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
  return r.json();
}
await api('POST', '/api/v1/auth/register', { name: 'Ui Tester', email: `ui_${Date.now()}@example.com`, password: 'password123' });
const me = (await api('GET', '/api/v1/me')).user;
const org = (await api('POST', '/api/v1/organizations', { name: 'UI Org' })).organization;
const prj = (await api('POST', `/api/v1/organizations/${org.id}/projects`, { name: 'UI Board', visibility: 'organization' })).project;
const statuses = (await api('GET', `/api/v1/projects/${prj.id}/statuses`)).statuses;
const todo = statuses.find((s) => s.isDefault), done = statuses.find((s) => s.key === 'done');
await api('POST', `/api/v1/projects/${prj.id}/tasks`, { title: 'Assigned to me', statusId: todo.id, assigneeId: me.id, priority: 'high' });
await api('POST', `/api/v1/projects/${prj.id}/tasks`, { title: 'Someone else', statusId: todo.id, priority: 'none' });

// --- headless Chrome over CDP
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'fellow-ui-'))}`,
  '--window-size=1440,900', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });
let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description?.split('\n')[0]);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evaluate(expr)) return true; await sleep(100); } return false; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); };
const key = async (k, mods = 0, code = k) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code, modifiers: mods, windowsVirtualKeyCode: k === 'Escape' ? 27 : k.toUpperCase().charCodeAt(0) }); };
const clickText = (tag, text) => evaluate(`(()=>{const el=[...document.querySelectorAll('${tag}')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!el)return false;el.click();return true})()`);
// React-controlled inputs need the native setter plus an input event.
const typeInto = (selector, value) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;const set=Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`);
const result = (name, ok, extra = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};

await send('Page.enable'); await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCookie', { name: 'fellow_session', value: cookie.split('=')[1], url: B });
const go = async (path) => { await send('Page.navigate', { url: B + path }); await sleep(300); };

// Dashboard: my tasks only
await go(`/dashboard?org=${org.id}`);
result('dashboard loads its project', await waitFor(`document.body.innerText.includes('UI Board')`));
const myTasks = await evaluate(`[...document.querySelectorAll('span')].find(s=>s.textContent==='My Tasks')?.nextElementSibling?.textContent`);
result('dashboard counts only my tasks', myTasks === '1', `My Tasks=${myTasks}`);
result('recent list shows my task, not others', await evaluate(`document.body.innerText.includes('Assigned to me') && !document.body.innerText.includes('Someone else')`));
result('no live-sync badge on a page without realtime', await evaluate(`!/\\b(dis)?connected\\b/i.test(document.querySelector('header').innerText)`));
await shot('1-dashboard');

// Navbar: Cmd+K opens search, search finds tasks, Escape closes
await key('k', 4, 'KeyK');
result('Cmd+K opens search', await waitFor(`!!document.querySelector('input[placeholder="Search accessible projects and tasks..."]')`, 2000));
await typeInto('input[placeholder="Search accessible projects and tasks..."]', 'Someone');
result('search returns the matching task', await waitFor(`[...document.querySelectorAll('a')].some(a=>a.textContent.includes('Someone else'))`));
await shot('2-search');
await key('Escape');
result('Escape closes search', await waitFor(`!document.querySelector('input[placeholder="Search accessible projects and tasks..."]')`, 2000));

// Board
await go(`/projects/${prj.id}`);
result('board renders columns and cards', await waitFor(`document.body.innerText.includes('Assigned to me') && document.body.innerText.includes('Someone else')`));
result('"none" priority labelled "No priority"', await evaluate(`document.body.innerText.includes('No priority')`));
result('realtime connects', await waitFor(`document.body.innerText.toLowerCase().includes('connected') && !document.body.innerText.toLowerCase().includes('disconnected')`, 8000));
await shot('3-board');

// Create a task through the dialog: it must appear exactly once (response + realtime event)
await clickText('button', 'Add Task');
result('Add Task opens the dialog', await waitFor(`!!document.querySelector('[role=dialog]')`, 2000));
await typeInto('[role=dialog] input[type=text]', 'Created in browser');
await evaluate(`document.querySelector('[role=dialog] form').requestSubmit()`);
await waitFor(`!document.querySelector('[role=dialog]')`, 4000);
await sleep(1500); // give the realtime event time to arrive too
const copies = await evaluate(`[...document.querySelectorAll('h4')].filter(h=>h.textContent==='Created in browser').length`);
result('new task appears exactly once', copies === 1, `copies=${copies}`);
const createdIn = (await api('GET', `/api/v1/projects/${prj.id}/tasks`)).tasks.find((t) => t.title === 'Created in browser')?.statusId;
result('Add Task uses the default column', createdIn === todo.id);

// Escape closes a dialog
await clickText('button', 'Add Task');
await waitFor(`!!document.querySelector('[role=dialog]')`, 2000);
await key('Escape');
result('Escape closes the dialog', await waitFor(`!document.querySelector('[role=dialog]')`, 2000));

// Keyboard move via the card's "Move to" select, then check the server agrees
await evaluate(`(()=>{const card=[...document.querySelectorAll('h4')].find(h=>h.textContent==='Assigned to me').closest('div.group');const sel=card.querySelector('select[aria-label="Move task to column"]');const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(sel,${JSON.stringify(done.id)});sel.dispatchEvent(new Event('change',{bubbles:true}))})()`);
await sleep(1500);
const serverTasks = (await api('GET', `/api/v1/projects/${prj.id}/tasks`)).tasks;
result('move persists on the server', serverTasks.find((t) => t.title === 'Assigned to me').statusId === done.id);
const inDone = await evaluate(`(()=>{const col=[...document.querySelectorAll('h3')].find(h=>h.textContent.trim()==='Done').closest('div.w-80');return col.innerText.includes('Assigned to me')})()`);
result('moved card shows in Done', inDone);
await shot('4-board-after');

// Task dialog opens with its history; Escape is not wired there (it has its own close)
await evaluate(`[...document.querySelectorAll('h4')].find(h=>h.textContent==='Assigned to me').closest('div.group').click()`);
result('task dialog loads', await waitFor(`document.body.innerText.includes('Save Changes')`));
await shot('5-task-modal');

// Settings
await go(`/organizations/${org.id}/settings`);
result('settings lists members', await waitFor(`document.body.innerText.includes('Team Members (1)')`));
await shot('6-settings');

// Docs and 404
await go('/docs');
result('docs renders the spec', await waitFor(`document.body.innerText.includes('/search')`));
await go('/no-such-page');
result('404 page', await waitFor(`document.body.innerText.includes('Page not found')`));

result('no uncaught errors or console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
ws.close(); chrome.kill();
console.log(`\n${failures ? `${failures} failed` : 'all passed'}; screenshots in ${OUT}`);
process.exit(failures ? 1 : 0);
