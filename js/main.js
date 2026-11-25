(() => {
  "use strict";

  const EVENT = new Date("2026-12-10T19:30:00+09:00"); // 공연 일시 (KST)
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);

  /* ---------- 오프닝 인트로 ---------- */
  const intro = $("intro");
  if (intro) {
    const seen = sessionStorage.getItem("211hz-intro");
    if (reduce || seen) {
      intro.remove();
    } else {
      document.body.classList.add("is-locked");
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        intro.classList.add("is-done");
        document.body.classList.remove("is-locked");
        sessionStorage.setItem("211hz-intro", "1");
        setTimeout(() => intro.remove(), 1500);
      };
      intro.addEventListener("click", close);
      setTimeout(close, 3600);
    }
  }

  /* ---------- 순차 등장 인덱스 ---------- */
  document.querySelectorAll(".stagger").forEach((group) => {
    [...group.children].forEach((el, i) => el.style.setProperty("--i", i));
  });

  /* ---------- 스크롤 등장 효과 ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- 포스터 패럴랙스 + 하단 바 ---------- */
  const poster = $("hero-poster");
  const hero = $("hero");
  const dock = $("dock");
  const where = $("where");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      if (poster && !reduce && y < hero.offsetHeight) {
        poster.style.transform = `translate3d(0, ${y * 0.22}px, 0) scale(${1 + y * 0.00008})`;
      }
      if (dock) {
        const pastHero = y > hero.offsetHeight * 0.75;
        const atWhere = where && where.getBoundingClientRect().top < vh * 0.6;
        dock.classList.toggle("is-on", pastHero && !atWhere);
      }
      ticking = false;
    });
  };
  // Ken Burns 애니메이션이 끝난 뒤부터 패럴랙스 적용
  if (poster) {
    poster.addEventListener("animationend", () => { poster.style.animation = "none"; onScroll(); }, { once: true });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 211Hz 파형 + 톤 ---------- */
  const waveCanvas = $("tone-wave");
  const toneBtn = $("tone-btn");
  let amp = 0.35;          // 현재 진폭 (0~1)
  let ampTarget = 0.35;    // 목표 진폭
  if (waveCanvas) {
    const wctx = waveCanvas.getContext("2d");
    let ww = 0, wh = 0, phase = 0, visible = true;
    const sizeWave = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ww = waveCanvas.clientWidth; wh = waveCanvas.clientHeight;
      waveCanvas.width = ww * dpr; waveCanvas.height = wh * dpr;
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const drawWave = () => {
      if (visible) {
        amp += (ampTarget - amp) * 0.05;
        phase += 0.035 + amp * 0.05;
        wctx.clearRect(0, 0, ww, wh);
        const mid = wh / 2;
        const layers = [
          { k: 2.11, a: 1, c: "rgba(243, 220, 180, 0.95)", w: 1.4, blur: 10 },
          { k: 2.11, a: 0.6, c: "rgba(228, 233, 242, 0.55)", w: 1, blur: 0, off: 1.2 },
          { k: 4.22, a: 0.3, c: "rgba(227, 187, 130, 0.4)", w: 0.8, blur: 0, off: 2.4 },
        ];
        for (const L of layers) {
          wctx.beginPath();
          for (let x = 0; x <= ww; x += 2) {
            const t = x / ww;
            const env = Math.sin(Math.PI * t);                    // 양 끝은 잦아들게
            const y = mid + Math.sin(t * Math.PI * 2 * L.k + phase + (L.off || 0)) * env * (wh * 0.42) * amp * L.a;
            x === 0 ? wctx.moveTo(x, y) : wctx.lineTo(x, y);
          }
          wctx.strokeStyle = L.c;
          wctx.lineWidth = L.w;
          wctx.shadowColor = "rgba(255, 200, 130, 0.8)";
          wctx.shadowBlur = L.blur;
          wctx.stroke();
        }
      }
      requestAnimationFrame(drawWave);
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(waveCanvas);
    }
    sizeWave();
    window.addEventListener("resize", sizeWave);
    if (reduce) { amp = ampTarget = 0.35; }
    requestAnimationFrame(drawWave);
  }

  if (toneBtn) {
    let actx = null, playing = null;
    const label = toneBtn.querySelector(".tone__label");
    const stop = () => {
      if (!playing) return;
      const { gain, oscs } = playing;
      const t = actx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 1.2);
      oscs.forEach((o) => o.stop(t + 1.3));
      playing = null;
      ampTarget = 0.35;
      toneBtn.setAttribute("aria-pressed", "false");
      label.textContent = "211Hz 들어보기";
    };
    toneBtn.addEventListener("click", async () => {
      if (playing) { stop(); return; }
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") await actx.resume();
      const t = actx.currentTime;
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 1.4);  // 부드럽게 시작
      gain.connect(actx.destination);
      // 기음 211Hz + 은은한 배음
      const oscs = [[211, 1], [422, 0.18], [633, 0.06]].map(([f, g]) => {
        const o = actx.createOscillator();
        const og = actx.createGain();
        o.type = "sine"; o.frequency.value = f; og.gain.value = g;
        o.connect(og).connect(gain); o.start(t);
        return o;
      });
      playing = { gain, oscs };
      ampTarget = 1;
      toneBtn.setAttribute("aria-pressed", "true");
      label.textContent = "211Hz 울리는 중";
      const mine = playing;
      setTimeout(() => { if (playing === mine) stop(); }, 6000);
    });
  }

  /* ---------- 달력 (2026년 12월) ---------- */
  const cal = $("calendar");
  if (cal) {
    const year = 2026, month = 11; // 0-based
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const frag = document.createDocumentFragment();
    ["S", "M", "T", "W", "T", "F", "S"].forEach((d, i) => {
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

  /* ---------- 카운트다운 ---------- */
  const cd = $("countdown");
  const dday = $("dday");
  if (cd) {
    const cells = { d: cd.querySelector('[data-cd="d"]'), h: cd.querySelector('[data-cd="h"]'), m: cd.querySelector('[data-cd="m"]'), s: cd.querySelector('[data-cd="s"]') };
    const pad = (n) => String(n).padStart(2, "0");
    const set = (el, v) => {
      if (el.textContent === v) return;
      el.textContent = v;
      el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick");
    };
    const update = () => {
      const diff = EVENT - Date.now();
      if (diff <= 0) {
        cd.hidden = true;
        const endOfShow = EVENT.getTime() + 3 * 3600e3;
        dday.innerHTML = Date.now() < endOfShow ? "<b>지금</b> 공연이 열리고 있습니다" : "함께해 주셔서 감사합니다";
        return false;
      }
      const s = Math.floor(diff / 1000);
      set(cells.d, pad(Math.floor(s / 86400)));
      set(cells.h, pad(Math.floor((s % 86400) / 3600)));
      set(cells.m, pad(Math.floor((s % 3600) / 60)));
      set(cells.s, pad(s % 60));
      const days = Math.ceil(diff / 86400e3);
      dday.innerHTML = days <= 1 ? "<b>오늘</b> 저녁, 무대에서 뵙겠습니다" : `공연까지 <b>${Math.floor(s / 86400)}</b>일 남았습니다`;
      return true;
    };
    if (update()) setInterval(update, 1000);
  }

  /* ---------- 캘린더 저장 (.ics) ---------- */
  $("btn-ics")?.addEventListener("click", () => {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//211Hz//Invitation//KO", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:211hz-20261210@211hz.github.io",
      "DTSTAMP:20261201T000000Z",
      "DTSTART:20261210T103000Z",
      "DTEND:20261210T123000Z",
      "SUMMARY:211Hz · 작곡가 이원희 작품발표회",
      "DESCRIPTION:현대음악과 가곡을 만나다 — 낯섦과 익숙함\\n시각예술 임채은\\nhttps://211hz.github.io/211Hz/",
      "LOCATION:엘클래식\\, 대전 유성구 테크노중앙로 50 디티비안S C동 4층",
      "BEGIN:VALARM", "TRIGGER:-PT3H", "ACTION:DISPLAY", "DESCRIPTION:211Hz 공연 3시간 전", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "211Hz-concert.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast("캘린더 파일을 저장했습니다");
  });

  /* ---------- 작가 노트 펼치기 ---------- */
  const essay = $("essay");
  const essayBtn = $("essay-toggle");
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

  /* ---------- 공유 / 복사 ---------- */
  const toast = $("toast");
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200);
  }
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
  const pageUrl = () => location.href.split("#")[0];
  $("btn-copy")?.addEventListener("click", () => copyText(pageUrl(), "링크가 복사되었습니다"));
  const addrBtn = $("btn-addr");
  addrBtn?.addEventListener("click", () => copyText(addrBtn.dataset.addr, "주소가 복사되었습니다"));
  $("btn-share")?.addEventListener("click", async () => {
    const data = {
      title: "211Hz · 작곡가 이원희 작품발표회",
      text: "현대음악과 가곡을 만나다 — 2026. 12. 10 Thu. 19:30 · 대전 엘클래식",
      url: pageUrl(),
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* 사용자가 취소 */ }
    } else {
      copyText(pageUrl(), "링크가 복사되었습니다");
    }
  });

  /* ---------- 눈 효과 ---------- */
  const canvas = $("snow");
  if (!canvas || reduce) return;

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, flakes = [];
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
      depth,
      warm: Math.random() < 0.18, // 일부는 금빛
    };
  };
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(90, (W * H) / 9000));
    while (flakes.length < target) flakes.push(makeFlake(true));
    flakes.length = target;
  };

  // 스크롤 속도에 따라 눈송이가 살짝 밀리는 효과
  let lastY = window.scrollY, drift = 0;
  window.addEventListener("scroll", () => {
    drift += (window.scrollY - lastY) * 0.04;
    lastY = window.scrollY;
  }, { passive: true });

  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  function tick() {
    if (!running) return;
    drift *= 0.9;
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      f.sway += f.swaySpeed;
      f.y += f.vy - drift * f.depth;
      f.x += Math.sin(f.sway) * 0.35;
      if (f.y > H + 10) Object.assign(f, makeFlake(false));
      else if (f.y < -12) f.y = H + 8;
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
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
