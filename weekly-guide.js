(function () {
  "use strict";

  const VERSION = "20260913-week3";
  const REMINDER_KEY = "infinity_channel_reminders_v1";
  const BLOCKED_RATED_TITLES = new Set([
    "galaxy of terror", "chopping mall", "far out man", "fatal combat", "hologram man",
    "breakfast of champions", "eulogy", "serenity", "mean girls", "blitz", "alone",
    "the fanatic", "the presence", "monsters of man", "wanted", "zodiac", "payback",
    "ava", "assault on precinct 13", "the fog", "rage", "a good marriage", "the seeds",
    "fright", "feet of death", "terminator 2: judgment day", "robocop", "highlander: the final dimension",
    "waiting for guffman", "return of the living dead part ii", "michael collins", "deathtrap"
  ]);

  function safeText(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
    }[char]));
  }

  function programOf(block) {
    return block && (block.documentary || block.program || block.show || block.item || block);
  }

  function safeProgram(program) {
    if (!program) return false;
    const rating = String(program.rating || program.mpaaRating || program.contentRating || "").toUpperCase();
    const title = String(program.title || program.name || "").trim().toLowerCase();
    if (/^(R|NC-17|TV-MA)$/.test(rating)) return false;
    return !BLOCKED_RATED_TITLES.has(title);
  }

  function adapter() {
    const candidates = [
      [window.HermitEngine, window.HERMIT_CATALOG || window.STAR_LAUNCHER_CATALOG, null],
      [window.WGNEngine, window.WGN_PROGRAMS, window.WGN_DAY_TEMPLATE],
      [window.NBCEngine, window.NBC_PROGRAMS, window.NBC_DAY_TEMPLATE],
      [window.FOXEngine, window.FOX_PROGRAMS, window.FOX_DAY_TEMPLATE],
      [window.PBSEngine, window.PBS_PROGRAMS, window.PBS_DAY_TEMPLATE],
      [window.TrumpTvEngine, window.TRUMP_TV_CATALOG, window.TRUMP_TV_BLOCKS]
    ];
    for (const [engine, catalog, template] of candidates) {
      if (!engine || typeof engine.createDaySchedule !== "function" || !catalog) continue;
      return {
        engine,
        build(dayMs) {
          const list = template
            ? engine.createDaySchedule(dayMs, catalog, template)
            : engine.createDaySchedule(dayMs, catalog);
          return (Array.isArray(list) ? list : []).filter(block => safeProgram(programOf(block)));
        }
      };
    }
    return null;
  }

  function localNoon(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date.getTime();
  }

  function formatDay(ms) {
    return new Intl.DateTimeFormat("en-US", {weekday:"short", month:"short", day:"numeric"}).format(new Date(ms));
  }

  function formatLongDay(ms) {
    return new Intl.DateTimeFormat("en-US", {weekday:"long", month:"long", day:"numeric"}).format(new Date(ms));
  }

  function formatTime(ms) {
    return new Intl.DateTimeFormat("en-US", {hour:"numeric", minute:"2-digit"}).format(new Date(ms));
  }

  function art(program) {
    if (program.posterUrl || program.thumbnail) return program.posterUrl || program.thumbnail;
    const id = program.videoId || program.youtubeId || program.vid || "";
    return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : "";
  }

  function loadReminders() {
    try { return JSON.parse(localStorage.getItem(REMINDER_KEY)) || {}; } catch (_) { return {}; }
  }

  function saveReminders(value) {
    try { localStorage.setItem(REMINDER_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function reminderId(block, program) {
    return `${location.pathname}:${block.startsAtMs}:${program.videoId || program.youtubeId || program.title}`;
  }

  function armReminder(block, program, button) {
    const id = reminderId(block, program);
    const reminders = loadReminders();
    if (reminders[id]) {
      delete reminders[id];
      saveReminders(reminders);
      button.textContent = "Remind me";
      button.setAttribute("aria-pressed", "false");
      return;
    }
    reminders[id] = {title:program.title, startsAtMs:block.startsAtMs, url:location.href, createdAt:Date.now()};
    saveReminders(reminders);
    button.textContent = "Reminder set";
    button.setAttribute("aria-pressed", "true");
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  }

  function startReminderClock() {
    function check() {
      const reminders = loadReminders();
      const now = Date.now();
      let changed = false;
      Object.entries(reminders).forEach(([id, reminder]) => {
        if (!reminder || reminder.startsAtMs > now || now - reminder.startsAtMs > 10 * 60 * 1000) return;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`${reminder.title} is starting`, {body:"Open the channel to join the live showing."});
        }
        delete reminders[id];
        changed = true;
      });
      if (changed) saveReminders(reminders);
    }
    check();
    setInterval(check, 30000);
  }

  async function addWikipedia(card, program) {
    if (card.dataset.wikiLoaded === "1") return;
    card.dataset.wikiLoaded = "1";
    const synopsis = card.querySelector(".weekly-guide-synopsis");
    const image = card.querySelector("img");
    const title = String(program.title || "").replace(/\s+[—-].*$/, "").trim();
    try {
      const query = new URLSearchParams({
        action:"query", generator:"search", gsrsearch:`${title} ${program.year || ""}`.trim(), gsrlimit:"1",
        prop:"pageimages|extracts", exintro:"1", explaintext:"1", pithumbsize:"640", origin:"*", format:"json"
      });
      const response = await fetch(`https://en.wikipedia.org/w/api.php?${query}`, {cache:"force-cache"});
      if (!response.ok) throw new Error("Wikipedia unavailable");
      const data = await response.json();
      const page = data.query && Object.values(data.query.pages || {})[0];
      if (!page) throw new Error("No matching article");
      if (page.extract) synopsis.textContent = page.extract.slice(0, 620);
      if (page.thumbnail && page.thumbnail.source) image.src = page.thumbnail.source;
      card.querySelector(".weekly-guide-source").textContent = "Synopsis and image: Wikipedia";
    } catch (_) {
      synopsis.textContent = `${program.collection || program.era || "Scheduled programming"}. Full details will be added as the verified catalog grows.`;
    }
  }

  function cardHTML(block) {
    const program = programOf(block) || {};
    const image = art(program);
    const id = reminderId(block, program);
    const reminded = !!loadReminders()[id];
    return `<details class="weekly-guide-card" data-start="${Number(block.startsAtMs) || 0}">
      <summary>
        <img src="${safeText(image)}" alt="" loading="lazy">
        <span class="weekly-guide-time">${safeText(formatTime(block.startsAtMs))}</span>
        <span class="weekly-guide-title">${safeText(program.title || "Scheduled program")}</span>
        <span class="weekly-guide-kind">${safeText(program.collection || program.era || "Full program")}</span>
      </summary>
      <div class="weekly-guide-detail">
        <p class="weekly-guide-synopsis">Open for a synopsis and reference image.</p>
        <small class="weekly-guide-source">Program artwork</small>
        <button type="button" class="weekly-guide-reminder" aria-pressed="${reminded}">${reminded ? "Reminder set" : "Remind me"}</button>
      </div>
    </details>`;
  }

  function installStyle() {
    if (document.getElementById("infinity-weekly-guide-style")) return;
    const style = document.createElement("style");
    style.id = "infinity-weekly-guide-style";
    style.textContent = `
      .weekly-guide-shell{display:grid;gap:16px}.weekly-guide-intro{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .weekly-guide-open,.weekly-guide-days button,.weekly-guide-arrow,.weekly-guide-reminder{min-height:44px;padding:0 15px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:#15111d;color:#fff;font:800 14px system-ui;cursor:pointer}
      .weekly-guide-panel[hidden],.weekly-guide-preview[hidden]{display:none}.weekly-guide-panel{display:grid;gap:14px}.weekly-guide-nav{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center}
      .weekly-guide-days{display:flex;gap:7px;overflow-x:auto;padding:4px;scrollbar-width:thin}.weekly-guide-days button{flex:0 0 auto}.weekly-guide-days button[aria-current="date"]{background:#f3c76a;color:#09070f}
      .weekly-guide-date{margin:0;font:700 clamp(1.45rem,4vw,2.4rem)/1.1 Georgia,serif}.weekly-guide-preview,.weekly-guide-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .weekly-guide-card{overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(10,10,18,.88)}.weekly-guide-card>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:90px 1fr;grid-template-areas:"art time" "art title" "art kind";gap:3px 12px;align-items:center;min-height:106px;padding:8px}
      .weekly-guide-card>summary::-webkit-details-marker{display:none}.weekly-guide-card img{grid-area:art;width:90px;height:90px;object-fit:cover;border-radius:11px;background:#080808}.weekly-guide-time{grid-area:time;color:#f3c76a;font-weight:900}.weekly-guide-title{grid-area:title;font:700 1.05rem/1.12 Georgia,serif}.weekly-guide-kind{grid-area:kind;color:#bcb2c8;font-size:.78rem}
      .weekly-guide-detail{display:grid;gap:9px;padding:4px 13px 14px}.weekly-guide-detail p{margin:0;line-height:1.5;color:#eee}.weekly-guide-source{color:#bcb2c8}.weekly-guide-reminder{justify-self:start}
      @media(max-width:760px){.weekly-guide-preview,.weekly-guide-grid{grid-template-columns:1fr}.weekly-guide-card>summary{grid-template-columns:112px 1fr}.weekly-guide-card img{width:112px;height:88px}.weekly-guide-nav{grid-template-columns:44px minmax(0,1fr) 44px}.weekly-guide-arrow{padding:0}}
    `;
    document.head.appendChild(style);
  }

  function start() {
    if (window.InfinityWeeklyGuide && window.InfinityWeeklyGuide.version === VERSION) return;
    const guide = document.querySelector(".guide");
    const source = adapter();
    if (!guide || !source) return;
    installStyle();

    const days = Array.from({length:7}, (_, index) => {
      const blocks = source.build(localNoon(index));
      return {key:blocks[0] ? String(blocks[0].id).slice(0,10) : String(index), startsAtMs:blocks[0] ? blocks[0].startsAtMs : localNoon(index), blocks};
    });
    let selected = 0;
    const now = Date.now();
    guide.innerHTML = `<div class="weekly-guide-shell">
      <div class="weekly-guide-intro"><div><p>SEVEN-DAY CHANNEL SCHEDULE</p><h2>What’s on next</h2></div><button class="weekly-guide-open" type="button" aria-expanded="false">See more</button></div>
      <div class="weekly-guide-preview" aria-label="Next three programs"></div>
      <div class="weekly-guide-panel" hidden>
        <div class="weekly-guide-nav"><button class="weekly-guide-arrow weekly-guide-prev" type="button" aria-label="Previous day">‹</button><div class="weekly-guide-days"></div><button class="weekly-guide-arrow weekly-guide-next" type="button" aria-label="Next day">›</button></div>
        <h3 class="weekly-guide-date"></h3><div class="weekly-guide-grid"></div>
      </div>
    </div>`;
    const open = guide.querySelector(".weekly-guide-open");
    const panel = guide.querySelector(".weekly-guide-panel");
    const preview = guide.querySelector(".weekly-guide-preview");
    const dayBar = guide.querySelector(".weekly-guide-days");
    const grid = guide.querySelector(".weekly-guide-grid");
    const heading = guide.querySelector(".weekly-guide-date");

    function bindCards(root, blocks) {
      root.querySelectorAll(".weekly-guide-card").forEach(card => {
        card.addEventListener("toggle", () => {
          if (!card.open) return;
          const block = blocks.find(item => Number(item.startsAtMs) === Number(card.dataset.start));
          if (block) addWikipedia(card, programOf(block));
        });
        const button = card.querySelector(".weekly-guide-reminder");
        button.addEventListener("click", event => {
          event.preventDefault();
          const block = blocks.find(item => Number(item.startsAtMs) === Number(card.dataset.start));
          if (block) armReminder(block, programOf(block), button);
        });
      });
    }

    const upcoming = days.flatMap(day => day.blocks).filter(block => block.endsAtMs > now).slice(0, 3);
    preview.innerHTML = upcoming.length ? upcoming.map(cardHTML).join("") : "<p>No more programs are scheduled yet.</p>";
    bindCards(preview, upcoming);

    function render() {
      const day = days[selected];
      dayBar.innerHTML = days.map((item, index) => `<button type="button" data-day="${index}"${index === selected ? ' aria-current="date"' : ""}>${safeText(formatDay(item.startsAtMs))}</button>`).join("");
      heading.textContent = formatLongDay(day.startsAtMs);
      const blocks = day.blocks.filter(block => selected > 0 || block.endsAtMs > now);
      grid.innerHTML = blocks.length ? blocks.map(cardHTML).join("") : "<p>Today’s remaining programs have finished. Choose tomorrow to continue.</p>";
      bindCards(grid, blocks);
    }

    open.addEventListener("click", () => {
      const expanded = open.getAttribute("aria-expanded") !== "true";
      open.setAttribute("aria-expanded", String(expanded));
      open.textContent = expanded ? "Show less" : "See more";
      preview.hidden = expanded;
      panel.hidden = !expanded;
      if (expanded) render();
    });
    dayBar.addEventListener("click", event => {
      const button = event.target.closest("button[data-day]");
      if (!button) return;
      selected = Number(button.dataset.day) || 0;
      render();
    });
    guide.querySelector(".weekly-guide-prev").addEventListener("click", () => { selected = Math.max(0, selected - 1); render(); });
    guide.querySelector(".weekly-guide-next").addEventListener("click", () => { selected = Math.min(days.length - 1, selected + 1); render(); });
    startReminderClock();
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 2, 0);
    setTimeout(() => location.reload(), Math.max(1000, nextMidnight.getTime() - Date.now()));
    window.InfinityWeeklyGuide = {version:VERSION, days, refresh:render};
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
