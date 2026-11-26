// 212Hz 초대장 화면 캡처 (휴대폰 390×844) — Claude 작업 확인용. 사이트에는 배포되지 않음.
//
// 사용 (프로젝트 폴더, 미리보기 서버 실행 중일 때):
//   node tools/shot.mjs <url> <저장경로접두어> [sections|open|intro]
//   예) node tools/shot.mjs http://127.0.0.1:8212/ C:\temp\shot\a sections
//
//   sections : 섹션별 캡처 (애니메이션 끝난 상태, 하단 바 숨김)
//   open     : sections + 프로그램·연주자 펼침 일부
//   intro    : 인트로 시간대별 캡처
//
// ⛔ 안전장치: 끝나거나, 오류가 나거나, 60초가 지나면 띄운 Edge 를 닫고(CDP Browser.close → 프로필 폴더
//    이름으로 찾아 강제 종료 → 0개 확인) 임시 프로필 폴더를 지운다. 이전에 Edge 가 닫히지 않고 쌓여 PC 전체가 느려진 일이 있었다 (2026-11-26).
//    Edge 프로필 폴더 이름은 항상 "edge-cdp-<포트>" — 남은 것을 찾을 때 이 이름으로 구분한다.
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

const [, , url, out, mode = "sections"] = process.argv;
if (!url || !out) {
  console.error("사용: node tools/shot.mjs <url> <저장경로접두어> [sections|open|intro]");
  process.exit(2);
}
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = 9333 + Math.floor(Math.random() * 400);
const udd = join(tmpdir(), "edge-cdp-" + port);
mkdirSync(udd, { recursive: true });
mkdirSync(dirname(out), { recursive: true });

const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

let ws;
let cleaned = false;
// 이 실행이 띄운 Edge 만 종료: 명령줄에 이 실행의 프로필 폴더(edge-cdp-<포트>)가 들어 있는 msedge 전부.
// ⚠ Edge 는 시작 직후 스스로 재실행되어(--edge-skip-compat-layer-relaunch) 처음 PID 의 자식이 아니게 된다.
//   그래서 PID 트리 종료(taskkill /T)로는 남는다 — 반드시 프로필 폴더 이름으로 찾아 끈다.
function killMyEdge() {
  const ps = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*edge-cdp-${port}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*edge-cdp-${port}*' }).Count`;
  for (let i = 0; i < 3; i++) {
    const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { encoding: "utf8" });
    if (String(r.stdout).trim() === "0") return true;
  }
  return false;
}
async function closeBrowser() {
  // 1차: CDP 로 브라우저 정상 종료
  try {
    const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const b = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise((r, j) => { b.addEventListener("open", r); b.addEventListener("error", j); setTimeout(j, 2000); });
    b.send(JSON.stringify({ id: 1, method: "Browser.close" }));
    await new Promise((r) => setTimeout(r, 800));
  } catch {}
}
async function cleanup(code) {
  if (cleaned) return;
  cleaned = true;
  try { ws?.close(); } catch {}
  await closeBrowser();
  // 2차: 남은 프로세스를 프로필 폴더 이름으로 찾아 강제 종료 + 0개 확인
  const ok = killMyEdge();
  if (!ok) { console.error(`⚠ edge-cdp-${port} Edge 가 남아 있음 — 수동 정리 필요`); code = code || 3; }
  try { rmSync(udd, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  process.exit(code);
}
const hardStop = setTimeout(() => { console.error("60초 초과 — Edge 종료 후 중단"); cleanup(1); }, 60000);
process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));
process.on("uncaughtException", (e) => { console.error(e); cleanup(1); });
process.on("unhandledRejection", (e) => { console.error(e); cleanup(1); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < 50 && !ws; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = list.find((t) => t.type === "page");
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await sleep(200);
}
if (!ws) { console.error("Edge 연결 실패"); cleanup(1); }
await new Promise((r) => ws.addEventListener("open", r));

let id = 0;
const pending = new Map();
ws.addEventListener("message", (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const files = [];
const shot = async (name, clip) => {
  const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}) });
  const f = `${out}-${name}.png`;
  writeFileSync(f, Buffer.from(r.result.data, "base64"));
  files.push(f);
};

const W = 390, H = 844;
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: true });
await send("Page.enable");
await send("Runtime.enable");
if (mode !== "intro") await send("Page.addScriptToEvaluateOnNewDocument", { source: "try{sessionStorage.setItem('211hz-intro','1')}catch(e){}" });
await send("Page.navigate", { url });

if (mode === "intro") {
  let t0 = 0;
  for (const t of [1500, 2600, 3900, 4300, 4800]) { await sleep(t - t0); t0 = t; await shot(`intro-${t}`); }
} else {
  await sleep(2500);
  await evalJs(`(async()=>{
    document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-visible'));
    const dk=document.getElementById('dock'); if(dk) dk.style.display='none';
    document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');
    ${mode === "open" ? "document.querySelectorAll('.crew__row:first-child, .pg__fold').forEach(d=>d.open=true);" : ""}
    await new Promise(r=>setTimeout(r,2600));
  })()`);
  const rects = await evalJs(`[...document.querySelectorAll('main > section, main > footer')].map(s=>{const r=s.getBoundingClientRect();return {n:(s.className.split(' ')[1]||s.className.split(' ')[0]||'x'),y:r.top+scrollY,h:r.height}})`);
  for (const [i, r] of rects.entries()) {
    await evalJs(`window.scrollTo(0, ${Math.max(0, r.y - 40)}); new Promise(r=>setTimeout(r,400))`);
    await shot(`${String(i).padStart(2, "0")}-${r.n}`, { x: 0, y: r.y, width: W, height: Math.min(r.h, 1400) });
  }
}

clearTimeout(hardStop);
console.log(files.join("\n"));
cleanup(0);
