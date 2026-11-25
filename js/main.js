(() => {
  "use strict";

  // 공연 일시 (KST)
  const EVENT = new Date("2026-12-10T19:30:00+09:00");

  /* ---------- 달력 (2026년 12월) ---------- */
  const cal = document.getElementById("calendar");
  if (cal) {
    const year = 2026, month = 11; // 0-based: 11 = December
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const dows = ["S", "M", "T", "W", "T", "F", "S"];
    const frag = document.createDocumentFragment();

    dows.forEach((d, i) => {
      const el = document.createElement("span");
      el.className = "dow" + (i === 0 ? " sun" : "");
      el.textContent = d;
      frag.appendChild(el);
    });
    for (let i = 0; i < first; i++) frag.appendChild(document.createElement("span"));
    for (let d = 1; d <= last; d++) {
      const el = document.createElement("span");
      const dow = (first + d - 1) % 7;
      el.className = "d" + (dow === 0 ? " sun" : "") + (d === 10 ? " is-day" : "");
      el.textContent = d;
      if (d === 10) el.setAttribute("aria-label", "12월 10일 목요일 공연일");
      frag.appendChild(el);
    }
    cal.appendChild(frag);
  }

  /* ---------- D-day ---------- */
  const dday = document.getElementById("dday");
  if (dday) {
    // 한국 시간 기준 날짜 차이
    const kstDate = (t) => new Date(t.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const today = kstDate(new Date()); today.setHours(0, 0, 0, 0);
    const eventDay = kstDate(EVENT); eventDay.setHours(0, 0, 0, 0);
    const diff = Math.round((eventDay - today) / 86400000);

    if (diff > 0) dday.innerHTML = `공연까지 <b>${diff}</b>일 남았습니다`;
    else if (diff === 0) dday.innerHTML = `<b>오늘</b> 저녁 7시 30분, 공연이 시작됩니다`;
    else dday.textContent = "함께해 주셔서 감사합니다";
  }

  /* ---------- 스크롤 등장 효과 ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      }),
      { threshold: 0.15 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- 작가 노트 펼치기 ---------- */
  const essay = document.getElementById("essay");
  const essayBtn = document.getElementById("essay-toggle");
  if (essay && essayBtn) {
    essay.classList.add("is-collapsed"); // JS가 없으면 처음부터 전체 노출
    essayBtn.addEventListener("click", () => {
      const open = essay.classList.contains("is-collapsed");
      if (open) {
        essay.style.maxHeight = essay.scrollHeight + "px";
        essay.classList.remove("is-collapsed");
        essayBtn.textContent = "접기";
      } else {
        essay.style.maxHeight = "";
        essay.classList.add("is-collapsed");
        essayBtn.textContent = "작가 노트 전체 보기";
        essay.closest("section").scrollIntoView({ behavior: "smooth", block: "start" });
      }
      essayBtn.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- 공유 / 링크 복사 ---------- */
  const toast = document.getElementById("toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200);
  };

  const copyText = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    showToast(msg);
  };
  const copyLink = () => copyText(location.href.split("#")[0], "링크가 복사되었습니다");

  document.getElementById("btn-copy")?.addEventListener("click", copyLink);
  const addrBtn = document.getElementById("btn-addr");
  addrBtn?.addEventListener("click", () => copyText(addrBtn.dataset.addr, "주소가 복사되었습니다"));
  document.getElementById("btn-share")?.addEventListener("click", async () => {
    const data = {
      title: "211Hz · 작곡가 이원희 작품발표회",
      text: "현대음악과 가곡을 만나다 — 2026. 12. 10 Thu. 19:30",
      url: location.href.split("#")[0],
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* 사용자가 취소 */ }
    } else {
      copyLink();
    }
  });

  /* ---------- 눈 효과 ---------- */
  const canvas = document.getElementById("snow");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canvas || reduce) return;

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, flakes = [];

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(90, (W * H) / 9000));
    while (flakes.length < target) flakes.push(makeFlake(true));
    flakes.length = target;
  };

  const makeFlake = (anyY) => {
    const depth = Math.random(); // 0 = 멀리, 1 = 가까이
    return {
      x: Math.random() * W,
      y: anyY ? Math.random() * H : -10,
      r: 0.6 + depth * 2.2,
      vy: 0.25 + depth * 0.9,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.004 + Math.random() * 0.01,
      alpha: 0.25 + depth * 0.6,
      warm: Math.random() < 0.18, // 일부는 금빛
    };
  };

  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      f.sway += f.swaySpeed;
      f.y += f.vy;
      f.x += Math.sin(f.sway) * 0.35;
      if (f.y > H + 10) Object.assign(f, makeFlake(false));
      if (f.x > W + 10) f.x = -10; else if (f.x < -10) f.x = W + 10;

      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2.4);
      const c = f.warm ? "255,214,160" : "236,242,255";
      g.addColorStop(0, `rgba(${c},${f.alpha})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
