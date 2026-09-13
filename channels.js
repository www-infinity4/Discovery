(function () {
  "use strict";

  const channels = [
    { name:"Hermit TV", slug:"Hermit-TV", url:"https://www-infinity4.github.io/Hermit-TV/", group:"TV", scheduled:true },
    { name:"Star Launcher", slug:"Star-Launcher", url:"https://www-infinity4.github.io/Star-Launcher/", group:"TV", scheduled:true },
    { name:"HBO", slug:"HBO", url:"https://www-infinity4.github.io/HBO/", group:"TV", scheduled:true },
    { name:"Cinemax", slug:"Cinemax", url:"https://www-infinity4.github.io/Cinemax/", group:"TV", scheduled:true },
    { name:"Showtime", slug:"Showtime", url:"https://www-infinity4.github.io/Showtime/", group:"TV", scheduled:true },
    { name:"Starz", slug:"Starz", url:"https://www-infinity4.github.io/Starz/", group:"TV", scheduled:true },
    { name:"Encore", slug:"Encore", url:"https://www-infinity4.github.io/Encore/", group:"TV", scheduled:true },
    { name:"Cartoon Network", slug:"Cartoon-Network", url:"https://www-infinity4.github.io/Cartoon-Network/", group:"TV", scheduled:true },
    { name:"WGN", slug:"WGN", url:"https://www-infinity4.github.io/WGN/", group:"TV", scheduled:true },
    { name:"NBC", slug:"NBC", url:"https://www-infinity4.github.io/NBC/", group:"TV", scheduled:true },
    { name:"FOX", slug:"FOX", url:"https://www-infinity4.github.io/FOX/", group:"TV", scheduled:true },
    { name:"PBS", slug:"PBS", url:"https://www-infinity4.github.io/PBS/", group:"TV", scheduled:true },
    { name:"TNT", slug:"TNT", url:"https://www-infinity4.github.io/TNT/", group:"TV", scheduled:true },
    { name:"History Channel", slug:"History-Channel", url:"https://www-infinity4.github.io/History-Channel/", group:"TV", scheduled:true },
    { name:"Discovery", slug:"Discovery", url:"https://www-infinity4.github.io/Discovery/", group:"TV", scheduled:true },
    { name:"Disney Vintage", slug:"Disney", url:"https://www-infinity4.github.io/Disney/", group:"TV", scheduled:true },
    { name:"Trump TV", slug:"Trump-TV", url:"https://www-infinity4.github.io/Trump-TV/", group:"TV", scheduled:true },
    { name:"ShopLC", slug:"ShopLC", url:"https://www-infinity4.github.io/ShopLC/", group:"TV", liveLabel:"Deals, gemstones, fashion & home" },
    { name:"StarQuest", slug:"TV-Database", url:"https://www-infinity4.github.io/TV-Database/", group:"TV", liveLabel:"Classic TV & movies" },
    { name:"Astraflix", slug:"Astraflix", url:"https://www-infinity4.github.io/Astraflix/", group:"SYNC" },
    { name:"Syncord", slug:"Syncord", url:"https://www-infinity4.github.io/Syncord/", group:"SYNC" },
    { name:"Vintech", slug:"Vintech", url:"https://www-infinity4.github.io/Vintech/", group:"SYNC" },
    { name:"Abstractia", slug:"Abstractia-", url:"https://www-infinity4.github.io/Abstractia-/", group:"SYNC" },
    { name:"Flix Blender", slug:"Flix-Blender", url:"https://www-infinity4.github.io/Flix-Blender/", group:"SYNC" },
    { name:"Animasync", slug:"Animasync", url:"https://www-infinity4.github.io/Animasync/", group:"SYNC" }
  ];

  const STYLE_ID = "infinity-shared-network-style-v4";
  const SOURCE_CACHE = new Map();
  const BLOCKED_GUIDE_TITLES = /galaxy of terror|chopping mall|fatal combat|hologram man|breakfast of champions|eulogy|blitz|the fanatic|the presence|monsters of man|wanted|zodiac|payback|\\bava\\b|assault on precinct 13|the fog|\\brage\\b|a good marriage|return of the living dead|michael collins|deathtrap/i;
  let guideObserver = null;
  let mutationObserver = null;

  function currentSlug() {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  }

  function safeJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (_) { return fallback; }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* Existing channel menus retain their native buttons and visual identity. */
      .channel-menu>nav{right:0!important;left:auto!important;width:min(270px,calc(100vw - 28px))!important;max-width:calc(100vw - 28px)!important;max-height:calc(100dvh - 92px)!important;overflow-y:auto!important;overscroll-behavior:contain!important;box-sizing:border-box!important}
      .channel-menu>nav a{white-space:normal!important}
      /* IMPORTANT: existing .channel-menu elements keep each site's native CSS. */
      .infinity-auto-menu{position:fixed;right:10px;top:10px;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      .infinity-auto-menu>summary{list-style:none;cursor:pointer;min-width:48px;min-height:44px;padding:0 13px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(255,255,255,.28);border-radius:999px;color:#fff;background:rgba(8,12,22,.92);box-shadow:0 8px 26px rgba(0,0,0,.35);font-weight:800}
      .infinity-auto-menu>summary::-webkit-details-marker{display:none}
      .infinity-auto-menu nav{position:absolute;right:0;top:calc(100% + 8px);width:min(88vw,340px);max-height:72vh;overflow:auto;padding:9px;border:1px solid rgba(255,255,255,.2);border-radius:16px;background:rgba(5,8,16,.98);box-shadow:0 18px 55px rgba(0,0,0,.58);display:grid;gap:5px}
      .infinity-auto-menu nav a{display:block;padding:10px 11px;border-radius:10px;color:#fff!important;text-decoration:none!important;background:rgba(255,255,255,.055);font-weight:700}
      .infinity-auto-menu nav a[aria-current="page"]{outline:2px solid #f5c451;background:rgba(245,196,81,.14)}
      .infinity-auto-menu .infinity-remote-heading{padding:9px 9px 4px;color:#f5c451;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .infinity-shared-actions{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      .infinity-shared-actions.infinity-actions-fixed{position:fixed;right:10px;bottom:10px;z-index:2147482900;padding:8px;border:1px solid rgba(255,255,255,.18);border-radius:16px;background:rgba(5,8,16,.94);box-shadow:0 12px 40px rgba(0,0,0,.5)}
      .infinity-shared-share,.infinity-wallet-button{min-height:42px;padding:0 13px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:#111827;color:#fff;font:800 13px/1 system-ui;cursor:pointer}
      .infinity-wallet-wrap{position:relative;display:inline-flex}.infinity-wallet-button{background:#201837}
      .infinity-wallet-panel{position:absolute;right:0;bottom:calc(100% + 8px);min-width:230px;padding:12px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(5,8,16,.98);box-shadow:0 18px 50px rgba(0,0,0,.55);color:#fff;z-index:2147483000;font:600 13px/1.4 system-ui}
      .infinity-wallet-panel[hidden]{display:none}.infinity-wallet-panel strong{display:block;font-size:24px;color:#f5c451}.infinity-wallet-panel small{display:block;margin-top:5px;opacity:.78}
      .infinity-created-directory{margin:28px auto;padding:18px;width:min(1180px,calc(100% - 24px));border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(6,10,20,.9);color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      .infinity-live-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:16px}.infinity-live-heading strong{font:800 24px/1.1 Georgia,serif}.infinity-live-heading span{font-size:12px;opacity:.72}
      .channel-directory nav.infinity-live-guide{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px!important;align-items:stretch}
      .infinity-live-guide a{position:relative;isolation:isolate;overflow:hidden;display:flex!important;min-width:0;min-height:132px;padding:15px!important;flex-direction:column;justify-content:flex-end;gap:9px;border:1px solid rgba(246,197,107,.28)!important;border-radius:18px!important;background-color:#151515!important;background-image:linear-gradient(180deg,rgba(8,8,8,.1),rgba(8,8,8,.93) 78%),var(--live-art)!important;background-size:cover!important;background-position:center!important;color:#fff!important;text-decoration:none!important;box-shadow:0 14px 34px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      .infinity-live-guide a:hover,.infinity-live-guide a:focus-visible{transform:translateY(-2px);border-color:#f5c451!important;box-shadow:0 18px 42px rgba(0,0,0,.46),0 0 0 1px rgba(245,196,81,.22);outline:none}
      .infinity-live-guide a[aria-current="page"]{outline:2px solid #f5c451;background-color:#24190a!important}
      .infinity-live-guide .infinity-channel-name{align-self:flex-start;padding:5px 8px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(0,0,0,.58);font-size:10px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}
      .infinity-live-guide [data-live-slug]{font:800 clamp(17px,2.2vw,22px)/1.08 Georgia,serif;color:#fff;text-shadow:0 2px 12px #000;white-space:normal}
      .infinity-live-guide [data-live-slug]:empty{display:none}
      .infinity-guide-divider{grid-column:1/-1;margin-top:8px;padding:9px 2px 2px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#f5c451}
      @media(max-width:640px){.infinity-auto-menu>summary .menu-label{display:none}.infinity-auto-menu nav{width:min(92vw,330px)}.channel-directory nav.infinity-live-guide{grid-template-columns:1fr 1fr}.infinity-live-guide a{min-height:118px;padding:11px!important}.infinity-live-guide [data-live-slug]{font-size:17px}.infinity-live-heading{align-items:start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function linkHTML(channel, active) {
    const current = channel.slug.toLowerCase() === active.toLowerCase();
    return `<a${current ? ' aria-current="page"' : ''} href="${channel.url}">${esc(channel.name)}</a>`;
  }

  function renderRemote(nav, fallback) {
    if (!nav) return;
    const active = currentSlug();
    const tv = channels.filter(channel => channel.group === "TV");
    const syncChannels = channels.filter(channel => channel.group === "SYNC");
    if (fallback) {
      nav.innerHTML = `<div class="infinity-remote-heading">Live channels</div>${tv.map(channel => linkHTML(channel, active)).join("")}<div class="infinity-remote-heading">Sync channels</div>${syncChannels.map(channel => linkHTML(channel, active)).join("")}`;
      return;
    }
    /* Native hamburgers get only links. No shared wrapper/classes/headings alter their layout. */
    nav.innerHTML = tv.concat(syncChannels).map(channel => linkHTML(channel, active)).join("");
  }

  function ensureMenu() {
    const existing = document.querySelector(".channel-menu");
    if (existing) {
      existing.classList.remove("infinity-auto-menu");
      renderRemote(existing.querySelector("nav"), false);
      return existing;
    }
    const details = document.createElement("details");
    details.className = "channel-menu infinity-auto-menu";
    details.innerHTML = '<summary aria-label="Open channel remote"><span aria-hidden="true">☰</span><span class="menu-label">Remote</span></summary><nav aria-label="Switch channels"></nav>';
    document.body.appendChild(details);
    renderRemote(details.querySelector("nav"), true);
    return details;
  }

  function walletSnapshot() {
    const session = safeJSON("starquest_session", null);
    const users = safeJSON("starquest_users", {});
    const profile = session && session.key && users[session.key] ? users[session.key] : safeJSON("starquest_guest_profile_v1", {});
    const coins = Math.max(0, Number(profile.tokens) || 0);
    const pending = Math.max(0, Number(profile.pendingShareCredits) || 0);
    const shares = Math.max(0, Number(profile.shareCount) || 0);
    return {coins,pending,shares,total:coins + pending / 10};
  }

  function formatCoins(value) { return Number(value || 0).toFixed(1); }

  function refreshWallet() {
    const snap = walletSnapshot();
    document.querySelectorAll(".infinity-wallet-button").forEach(button => button.textContent = `Wallet ⭐ ${formatCoins(snap.total)}`);
    document.querySelectorAll(".infinity-wallet-panel").forEach(panel => {
      panel.innerHTML = `<strong>⭐ ${formatCoins(snap.total)}</strong><span>Total StarCoins + share progress</span><small>${snap.coins} completed coin${snap.coins === 1 ? "" : "s"} · ${snap.pending}/10 toward the next coin · ${snap.shares} confirmed shares</small>`;
    });
  }

  function makeWallet() {
    const wrap = document.createElement("span");
    wrap.className = "infinity-wallet-wrap";
    wrap.innerHTML = '<button class="infinity-wallet-button" type="button" aria-expanded="false">Wallet ⭐ 0.0</button><span class="infinity-wallet-panel" hidden></span>';
    const button = wrap.querySelector("button"), panel = wrap.querySelector(".infinity-wallet-panel");
    button.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      refreshWallet();
    });
    return wrap;
  }

  function recordShare(reference) {
    const attemptId = `shared-channel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    if (window.StarQuestAuth && typeof window.StarQuestAuth.recordShare === "function") {
      try {
        const result = window.StarQuestAuth.recordShare(reference, {attemptId,confirmed:true,verified:true,method:"web_share_api",url:reference,showTitle:document.title});
        if (result && result.ok) { refreshWallet(); return result; }
      } catch (_) {}
    }
    const session = safeJSON("starquest_session", null);
    const users = safeJSON("starquest_users", {});
    const signedIn = session && session.key && users[session.key];
    const profile = signedIn || safeJSON("starquest_guest_profile_v1", {key:"__guest__",username:"Guest",tokens:0,shareCount:0,pendingShareCredits:0,shareEvents:[],ledger:[]});
    profile.tokens = Math.max(0, Number(profile.tokens) || 0);
    profile.shareCount = Math.max(0, Number(profile.shareCount) || 0) + 1;
    profile.pendingShareCredits = Math.max(0, Number(profile.pendingShareCredits) || 0) + 1;
    profile.shareEvents = Array.isArray(profile.shareEvents) ? profile.shareEvents : [];
    profile.ledger = Array.isArray(profile.ledger) ? profile.ledger : [];
    const event = {id:attemptId,attemptId,contentId:reference,method:"web_share_api",confirmed:true,verified:true,verificationState:"client_confirmed",showTitle:document.title,createdAt:Date.now()};
    profile.shareEvents.push(event);
    let awarded = 0;
    while (profile.pendingShareCredits >= 10) { profile.pendingShareCredits -= 10; profile.tokens += 1; awarded += 1; }
    profile.ledger.push({id:`tx-${attemptId}`,type:awarded?"share_reward":"share_credit",amount:awarded,balance:profile.tokens,pendingShareCredits:profile.pendingShareCredits,reason:awarded?"Share reward: 10 completed shares":`Confirmed share receipt ${profile.pendingShareCredits}/10`,referenceId:attemptId,createdAt:Date.now()});
    profile.shareEvents = profile.shareEvents.slice(-250);
    profile.ledger = profile.ledger.slice(-500);
    if (signedIn) { users[session.key] = profile; localStorage.setItem("starquest_users", JSON.stringify(users)); }
    else localStorage.setItem("starquest_guest_profile_v1", JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent("starquest:share-progress", {detail:{user:profile,lifetimeShareCount:profile.shareCount,progressToNextCoin:profile.pendingShareCredits,sharesPerCoin:10,awarded,balance:profile.tokens,event}}));
    refreshWallet();
    return {ok:true,awarded,progressToNextCoin:profile.pendingShareCredits,balance:profile.tokens};
  }

  function setShareStatus(text) {
    const node = document.querySelector("#shareStatus,.share-status,[data-share-status]");
    if (node) node.textContent = text;
  }

  async function sharedShare(event, button) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const nowTitle = document.querySelector("#nowTitle,[data-now-title]");
    const title = nowTitle && nowTitle.textContent && !/loading/i.test(nowTitle.textContent) ? nowTitle.textContent.trim() : document.title;
    const payload = {title:`${title} · ${document.title}`,text:`Watch ${title} on ${document.title}.`,url:location.href};
    try { if (window.InfinityChannelPiP && typeof window.InfinityChannelPiP.system === "function") window.InfinityChannelPiP.system(); } catch (_) {}
    if (!navigator.share) {
      try { await navigator.clipboard.writeText(payload.url); setShareStatus("Link copied. A confirmed system share earns 1/10 StarCoin."); }
      catch (_) { setShareStatus("Sharing is unavailable in this browser."); }
      return;
    }
    try {
      await navigator.share(payload);
      const result = recordShare(payload.url);
      const snap = walletSnapshot();
      setShareStatus(result && result.awarded ? `Shared · StarCoin completed! Wallet ⭐ ${formatCoins(snap.total)}` : `Shared · +1/10 ⭐ · Wallet ${formatCoins(snap.total)}`);
      button.blur();
    } catch (error) {
      if (!error || error.name !== "AbortError") setShareStatus("Share did not complete, so no StarCoin credit was added.");
    }
  }

  function bindShareButton(button) {
    if (!button || button.dataset.infinityCentralShare === "1") return;
    button.dataset.infinityCentralShare = "1";
    button.textContent = "Share · +1/10 ⭐";
    button.addEventListener("click", event => sharedShare(event, button), true);
  }

  function attachWalletBeside(button) {
    if (!button || button.parentElement && button.parentElement.querySelector(":scope > .infinity-wallet-wrap")) return;
    button.insertAdjacentElement("afterend", makeWallet());
    refreshWallet();
  }

  function ensureActions() {
    const shares = Array.from(document.querySelectorAll("#shareButton,.share-button,.infinity-shared-share"));
    const realShare = shares.find(button => button.dataset.infinityGeneratedShare !== "1");
    const fixed = document.querySelector(".infinity-shared-actions.infinity-actions-fixed");
    if (realShare) {
      bindShareButton(realShare);
      attachWalletBeside(realShare);
      if (fixed) fixed.remove();
      return;
    }
    const generated = shares.find(button => button.dataset.infinityGeneratedShare === "1");
    if (generated) { bindShareButton(generated); attachWalletBeside(generated); return; }
    const bar = document.createElement("div");
    bar.className = "infinity-shared-actions infinity-actions-fixed";
    const share = document.createElement("button");
    share.type = "button";
    share.className = "infinity-shared-share share-button";
    share.dataset.infinityGeneratedShare = "1";
    share.textContent = "Share · +1/10 ⭐";
    bar.append(share, makeWallet());
    document.body.appendChild(bar);
    bindShareButton(share);
    refreshWallet();
  }

  function ensureDirectory() {
    let section = document.querySelector(".channel-directory");
    if (!section) {
      section = document.createElement("section");
      section.className = "channel-directory infinity-created-directory";
      const footer = document.querySelector("footer");
      if (footer) footer.parentNode.insertBefore(section, footer); else document.body.appendChild(section);
    }
    section.innerHTML = '<div class="infinity-live-heading"><strong>Choose a channel</strong><span>Tap a title to watch</span></div><nav class="infinity-live-guide" aria-label="Channel guide"></nav>';
    renderGuideShell(section.querySelector("nav"));
    return section;
  }

  function renderGuideShell(nav) {
    const active = currentSlug();
    const tv = channels.filter(channel => channel.group === "TV");
    const syncChannels = channels.filter(channel => channel.group === "SYNC");
    nav.innerHTML = tv.map(channel => {
      const current = channel.slug.toLowerCase() === active.toLowerCase();
      return `<a${current?' aria-current="page"':''} href="${channel.url}"><span class="infinity-channel-name">${esc(channel.name)}</span><strong data-live-slug="${esc(channel.slug)}"></strong></a>`;
    }).join("") + `<div class="infinity-guide-divider">Sync channels</div>` + syncChannels.map(channel => {
      const current = channel.slug.toLowerCase() === active.toLowerCase();
      return `<a${current?' aria-current="page"':''} href="${channel.url}"><span class="infinity-channel-name">${esc(channel.name)}</span><strong data-live-slug="${esc(channel.slug)}"></strong></a>`;
    }).join("");
  }

  function formatLocalTime(ms) {
    try { return new Intl.DateTimeFormat("en-US", {hour:"numeric",minute:"2-digit"}).format(new Date(ms)); }
    catch (_) { return ""; }
  }

  function storedPresence(slug) {
    const data = safeJSON(`infinity_live_${slug}`, null);
    if (!data || !data.title || !data.updatedAt || Date.now() - data.updatedAt > 5 * 60 * 1000) return null;
    if (BLOCKED_GUIDE_TITLES.test(String(data.title))) return null;
    return data;
  }

  function fakeDocument() {
    return {querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({dataset:{},style:{},setAttribute(){},appendChild(){}}),head:{appendChild(){}},body:{appendChild(){}},addEventListener(){}};
  }

  async function sourceBundle(channel) {
    if (SOURCE_CACHE.has(channel.slug)) return SOURCE_CACHE.get(channel.slug);
    const promise = Promise.all([
      fetch(`${channel.url}engine.js`, {cache:"force-cache"}).then(response => response.ok ? response.text() : Promise.reject(new Error("engine"))),
      fetch(`${channel.url}data/catalog.js`, {cache:"force-cache"}).then(response => response.ok ? response.text() : Promise.reject(new Error("catalog")))
    ]).then(([engineSource,catalogSource]) => {
      const box = {};
      const doc = fakeDocument();
      Function("window","document",engineSource)(box,doc);
      Function("window","document",catalogSource)(box,doc);
      return box;
    });
    SOURCE_CACHE.set(channel.slug, promise);
    return promise;
  }

  async function resolveScheduled(channel) {
    const box = await sourceBundle(channel);
    const engine = box.HermitEngine || box.WGNEngine || box.NBCEngine || box.FOXEngine || box.PBSEngine || box.TrumpTvEngine;
    const catalog = box.HERMIT_CATALOG || box.STAR_LAUNCHER_CATALOG || box.WGN_PROGRAMS || box.NBC_PROGRAMS || box.FOX_PROGRAMS || box.PBS_PROGRAMS || box.TRUMP_TV_CATALOG;
    const template = box.WGN_DAY_TEMPLATE || box.NBC_DAY_TEMPLATE || box.FOX_DAY_TEMPLATE || box.PBS_DAY_TEMPLATE || box.TRUMP_TV_BLOCKS;
    const commercials = box.HERMIT_COMMERCIALS || box.STAR_LAUNCHER_COMMERCIALS || box.WGN_COMMERCIALS || box.NBC_COMMERCIALS || [];
    const hasCatalog = Array.isArray(catalog) ? catalog.length > 0 : catalog && Object.keys(catalog).length > 0;
    if (!engine || !hasCatalog || typeof engine.createDaySchedule !== "function") throw new Error("schedule unavailable");
    const now = Date.now();
    const schedule = template ? engine.createDaySchedule(now, catalog, template) : engine.createDaySchedule(now, catalog);
    if (!Array.isArray(schedule) || !schedule.length) throw new Error("empty schedule");
    let block = null;
    if (typeof engine.resolve === "function") {
      const state = engine.resolve(now, schedule, commercials);
      block = state && (state.block || state.item);
    }
    if (!block) block = schedule.find(item => now >= item.startsAtMs && now < item.endsAtMs) || schedule[0];
    const item = block && (block.movie || block.program || block.show || block);
    const title = item && (item.title || item.name);
    if (!title) throw new Error("title unavailable");
    const art = item.posterUrl || (item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` : `${channel.url}assets/channel-share.svg`);
    return {title,art,startsAtMs:block.startsAtMs,endsAtMs:block.endsAtMs,updatedAt:Date.now()};
  }

  async function nowPlaying(channel) {
    const presence = storedPresence(channel.slug);
    if (presence) return presence;
    if (channel.slug.toLowerCase() === currentSlug().toLowerCase()) {
      const currentTitle = document.querySelector("#nowTitle,[data-now-title]");
      const title = currentTitle && !/loading|please wait/i.test(currentTitle.textContent || "") ? currentTitle.textContent.trim() : "";
      if (title) return {title};
    }
    if (channel.scheduled) {
      try { return await resolveScheduled(channel); } catch (_) {}
    }
    if (channel.liveLabel) return {title:channel.liveLabel.replace(/^live\s*[—·:-]*\s*/i, "")};
    return {title:""};
  }

  async function refreshLiveGuide() {
    const nodes = Array.from(document.querySelectorAll("[data-live-slug]"));
    await Promise.all(nodes.map(async node => {
      const channel = channels.find(item => item.slug === node.dataset.liveSlug);
      if (!channel) return;
      const live = await nowPlaying(channel);
      const cleanTitle = String(live.title || "").replace(/\s*\((?:full (?:episode|movie|broadcast|documentary))\)\s*$/i, "").trim();
      node.textContent = cleanTitle;
      const card = node.closest("a");
      const art = live.art || `${channel.url}assets/channel-share.svg`;
      if (card) card.style.setProperty("--live-art", `url("${String(art).replace(/"/g, "%22")}")`);
      node.dataset.liveState = "ready";
    }));
  }

  function watchGuide(section) {
    if (guideObserver) guideObserver.disconnect();
    if ("IntersectionObserver" in window) {
      guideObserver = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) refreshLiveGuide(); }, {rootMargin:"500px"});
      guideObserver.observe(section);
    } else refreshLiveGuide();
  }

  function publishCurrent() {
    const slug = currentSlug();
    const node = document.querySelector("#nowTitle,[data-now-title]");
    if (!node) return;
    const title = (node.textContent || "").trim();
    if (!title || /loading|please wait/i.test(title)) return;
    try { localStorage.setItem(`infinity_live_${slug}`, JSON.stringify({title,updatedAt:Date.now()})); } catch (_) {}
  }

  function sync() {
    installStyle();
    ensureMenu();
    const section = ensureDirectory();
    ensureActions();
    refreshWallet();
    publishCurrent();
    watchGuide(section);
    if (!mutationObserver) {
      let actionsQueued = false;
      mutationObserver = new MutationObserver(records => {
        const needsActions = records.some(record => Array.from(record.addedNodes).some(node =>
          node.nodeType === 1 && (
            node.matches && node.matches("#shareButton,.share-button,.infinity-shared-share,.channel-menu") ||
            node.querySelector && node.querySelector("#shareButton,.share-button,.infinity-shared-share,.channel-menu")
          )
        ));
        if (!needsActions || actionsQueued) return;
        actionsQueued = true;
        requestAnimationFrame(() => { actionsQueued = false; ensureMenu(); ensureActions(); });
      });
      mutationObserver.observe(document.body, {childList:true,subtree:true});
    }
  }

  window.addEventListener("starquest:share-progress", refreshWallet);
  window.addEventListener("storage", event => { if (["starquest_guest_profile_v1","starquest_users","starquest_session"].includes(event.key)) refreshWallet(); });
  setInterval(() => { publishCurrent(); refreshWallet(); }, 15000);
  setInterval(() => { if (document.querySelector(".channel-directory")) refreshLiveGuide(); }, 60000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync, {once:true}); else sync();

  window.INFINITY_CHANNELS = channels.slice();
  window.InfinityChannelRemote = {refresh:sync,channels:channels.slice(),refreshGuide:refreshLiveGuide};
  window.InfinityShareWallet = {recordShare,refresh:refreshWallet,snapshot:walletSnapshot};
})();
