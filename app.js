(function () {
  "use strict";

  const engine = window.HermitEngine;
  const catalog = window.HERMIT_CATALOG || [];
  const commercials = window.HERMIT_COMMERCIALS || [];
  const vault = window.DISCOVERY_VAULT || [];
  const $ = id => document.getElementById(id);
  const els = {
    clock: $("stationClock"), mode: $("modeLabel"), title: $("nowTitle"), programTime: $("programTime"),
    enter: $("enterButton"), stationCard: $("stationCard"), cardLabel: $("stationCardLabel"),
    cardTitle: $("stationCardTitle"), cardCountdown: $("stationCardCountdown"), startOver: $("startOverButton"),
    rewind: $("rewindButton"), live: $("liveButton"), share: $("shareButton"), shareStatus: $("shareStatus"),
    position: $("positionLabel"), remaining: $("remainingLabel"), progress: $("progressBar"),
    next: $("nextCards"), guide: $("guideRows"), guideDate: $("guideDate"), vault: $("vaultGrid")
  };

  let player = null;
  let playerReady = false;
  let apiRequested = false;
  let entered = false;
  let loadedKey = "";
  let loadedMovieVideoId = "";
  const failedMovieVideoIds = new Set();
  let scheduleKey = "";
  let schedule = [];
  let mode = "live";
  let timeShiftBaseMs = 0;
  let timeShiftStartedMs = 0;

  function activeClockMs() {
    return mode === "live" ? Date.now() : timeShiftBaseMs + (Date.now() - timeShiftStartedMs);
  }

  function ensureSchedule(nowMs) {
    const key = engine.dateKey(nowMs);
    if (key === scheduleKey && schedule.length) return;
    scheduleKey = key;
    try {
      // The daily schedule never changes because one viewer hit a YouTube error.
      // That keeps every viewer on the same movie and the same source timestamp.
      schedule = engine.createDaySchedule(nowMs, catalog, commercials);
      renderGuide();
    } catch (_) {
      schedule = [];
      showMessage("DISCOVERY", "The program sources are being refreshed.", "Please try the channel again shortly.");
    }
  }

  function formatStationTime(ms) {
    return new Intl.DateTimeFormat("en-US", { timeZone:engine.TIME_ZONE, hour:"numeric", minute:"2-digit" }).format(new Date(ms));
  }

  function formatDuration(seconds) {
    const mins = Math.max(0, Math.ceil(seconds / 60));
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  }

  function movieHue(movie) {
    let hash = 0;
    for (const char of movie.title) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    return 145 + (Math.abs(hash) % 55);
  }

  function artForMovie(movie) {
    if (movie.posterUrl) return movie.posterUrl;
    if (movie.videoId) return `https://i.ytimg.com/vi/${movie.videoId}/maxresdefault.jpg`;
    return "assets/discovery-social.png";
  }

  function setProgramArt(movie) {
    document.body.style.setProperty("--program-hue", movieHue(movie));
    document.body.style.setProperty("--program-art", `url("${artForMovie(movie)}")`);
  }

  function renderGuide() {
    if (!schedule.length) return;
    els.guideDate.textContent = new Intl.DateTimeFormat("en-US", { timeZone:engine.TIME_ZONE, weekday:"long", month:"long", day:"numeric" }).format(new Date(schedule[0].startsAtMs));
    els.guide.innerHTML = schedule.map(item => `<article class="guide-row" data-id="${item.id}"><time>${formatStationTime(item.startsAtMs)}</time><strong>${item.movie.title}</strong><span>${item.movie.year} · ${item.movie.collection}</span></article>`).join("");
  }

  function renderVault() {
    if (!els.vault) return;
    els.vault.innerHTML = vault.map((title, index) => `<article class="vault-card"><span>${String(index + 1).padStart(2,"0")}</span><strong>${title}</strong></article>`).join("");
  }

  function nextItems(currentBlock) {
    if (!schedule.length || !currentBlock) return [];
    const currentIndex = schedule.findIndex(item => item.id === currentBlock.id);
    const items = currentIndex >= 0 ? schedule.slice(currentIndex + 1) : [];
    if (items.length < 3) {
      try {
        const nextDay = engine.createDaySchedule(currentBlock.endsAtMs + 1000, catalog, commercials);
        items.push(...nextDay);
      } catch (_) {}
    }
    return items.slice(0, 3);
  }

  let renderedNextBlockKey = "";

  function renderNext(currentBlock) {

    const nextBlockKey = currentBlock ? String(currentBlock.id || currentBlock.startsAtMs || "") + ":" + String((currentBlock.movie && currentBlock.movie.videoId) || (currentBlock.program && currentBlock.program.videoId) || "") : "";

    if (nextBlockKey && nextBlockKey === renderedNextBlockKey) return;

    renderedNextBlockKey = nextBlockKey;
    const items = nextItems(currentBlock);
    els.next.innerHTML = items.map(item => {
      const art = artForMovie(item.movie).replace(/"/g, "%22");
      return `<article class="next-card" style="--card-hue:${movieHue(item.movie)};--card-art:url('${art}')"><time>${formatStationTime(item.startsAtMs)}</time><div><h3>${item.movie.title}</h3><p>${item.movie.year} · ${item.movie.collection}</p></div></article>`;
    }).join("");
  }

  function showMessage(label, title, detail) {
    els.stationCard.hidden = false;
    els.cardLabel.textContent = label;
    els.cardTitle.textContent = title;
    els.cardCountdown.textContent = detail;
  }

  function showStationCard(state) {
    if (!state) return;
    if (state.segment.kind === "commercial") {
      showMessage("COMMERCIAL BREAK", state.segment.title, `${formatDuration(state.movieReturnsIn)} until the documentary returns`);
    } else if (state.segment.kind === "station") {
      showMessage("DISCOVERY", state.segment.title, `${formatDuration(state.segmentRemaining)} until the next program`);
    } else if (failedMovieVideoIds.has(state.segment.videoId)) {
      showMessage("SOURCE UNAVAILABLE", state.block.movie.title, `The schedule stays synchronized. Next movie starts at ${formatStationTime(state.block.endsAtMs)}.`);
    } else {
      showMessage("SCHEDULED NOW", state.block.movie.title, "This source is being refreshed.");
    }
  }

  function loadMedia(state) {
    if (!entered || !state) return;
    const locallyFailed = state.segment.videoId && failedMovieVideoIds.has(state.segment.videoId);
    const playable = state.segment.videoId && state.segment.cleared && !locallyFailed;
    const mediaKey = `${state.block.id}:${state.segment.stationStart}:${state.segment.videoId}:${locallyFailed?"failed":"ok"}`;
    if (!playable) {
      showStationCard(state);
      if (playerReady && loadedKey !== mediaKey) player.stopVideo();
      loadedKey = mediaKey;
      return;
    }
    els.stationCard.hidden = true;
    if (!playerReady) return;
    if (loadedKey !== mediaKey) {
      loadedKey = mediaKey;
      loadedMovieVideoId = state.segment.kind === "movie" ? state.segment.videoId : "";
      player.loadVideoById({ videoId:state.segment.videoId, startSeconds:state.mediaSeconds });
      return;
    }
    if (mode === "live" && player.getPlayerState() === YT.PlayerState.PLAYING) {
      const drift = state.mediaSeconds - player.getCurrentTime();
      if (Math.abs(drift) > 2.5) player.seekTo(state.mediaSeconds, true);
    }
  }

  function tick() {
    const now = activeClockMs();
    ensureSchedule(now);
    if (!schedule.length) return;
    const state = engine.resolve(now, schedule, commercials);
    els.clock.textContent = `${formatStationTime(Date.now())} local`;
    els.mode.textContent = mode === "live" ? (state.segment.kind === "commercial" ? "LIVE · COMMERCIAL BREAK" : "LIVE DISCOVERY") : "TIME SHIFTED";
    els.title.textContent = state.block.movie.title;
    setProgramArt(state.block.movie);
    els.programTime.textContent = `${formatStationTime(state.block.startsAtMs)}–${formatStationTime(state.block.endsAtMs)}`;
    els.position.textContent = mode === "live" ? "Synced with the Discovery schedule" : `${formatDuration(state.blockElapsed)} from start`;
    els.remaining.textContent = `${formatDuration(state.blockRemaining)} until next scheduled program`;
    els.progress.style.width = `${Math.min(100, (state.blockElapsed / state.block.blockSeconds) * 100)}%`;
    document.querySelectorAll(".guide-row").forEach(row => row.classList.toggle("current", row.dataset.id === state.block.id));
    renderNext(state.block);
    loadMedia(state);
  }

  function loadYouTubeApi() {
    if (apiRequested || playerReady) return;
    apiRequested = true;
    if (window.YT && window.YT.Player) return window.onYouTubeIframeAPIReady();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.referrerPolicy = "strict-origin-when-cross-origin";
    document.head.appendChild(tag);
  }

  function enterStation() {
    entered = true;
    els.enter.hidden = true;
    loadYouTubeApi();
    tick();
  }

  function startOver() {
    ensureSchedule(Date.now());
    if (!schedule.length) return;
    const live = engine.resolve(Date.now(), schedule, commercials);
    mode = "timeshift";
    timeShiftBaseMs = live.block.startsAtMs;
    timeShiftStartedMs = Date.now();
    loadedKey = "";
    tick();
  }

  function rewind() {
    mode = "timeshift";
    timeShiftBaseMs = activeClockMs() - 30000;
    timeShiftStartedMs = Date.now();
    loadedKey = "";
    tick();
  }

  function joinLive() {
    mode = "live";
    loadedKey = "";
    scheduleKey = "";
    tick();
  }

  function creditShare() {
    const key = "infinity_channel_share_progress_v1";
    let progress = 0;
    try { progress = Number(localStorage.getItem(key)) || 0; } catch (_) {}
    progress += 1;
    const awarded = progress >= 10;
    if (awarded) progress = 0;
    try { localStorage.setItem(key, String(progress)); } catch (_) {}
    return { progress, awarded };
  }

  async function shareChannel() {
    const title = els.title.textContent && !els.title.textContent.includes("Loading") ? els.title.textContent : "DISCOVERY";
    const share = { title:`${title} · Discovery`, text:`Watch ${title} on the live Discovery channel.`, url:location.href };
    try {
      if (navigator.share) {
        await navigator.share(share);
        const reward = creditShare();
        els.shareStatus.textContent = reward.awarded ? "Shared · 1 StarCoin completed!" : `Shared · StarCoin progress ${reward.progress}/10`;
      } else {
        await navigator.clipboard.writeText(share.url);
        els.shareStatus.textContent = "Discovery link copied.";
      }
    } catch (error) {
      if (!error || error.name !== "AbortError") els.shareStatus.textContent = "Share did not complete.";
    }
  }

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("player", {
      width:"100%", height:"100%",
      playerVars:{ playsinline:1, controls:1, enablejsapi:1, origin:location.origin, widget_referrer:location.href },
      events:{
        onReady:() => { playerReady = true; player.unMute(); player.setVolume(100); tick(); },
        onError:() => {
          if (loadedMovieVideoId) failedMovieVideoIds.add(loadedMovieVideoId);
          loadedMovieVideoId = "";
          loadedKey = "";
          // Do not rebuild or reshuffle the schedule from a client-side error.
          // Hold the slot and move everyone to the next documentary at the same time.
          setTimeout(tick, 150);
        }
      }
    });
  };

  els.enter.addEventListener("click", enterStation);
  els.startOver.addEventListener("click", startOver);
  els.rewind.addEventListener("click", rewind);
  els.live.addEventListener("click", joinLive);
  els.share.addEventListener("click", shareChannel);

  renderVault();
  ensureSchedule(Date.now());
  tick();
  setInterval(tick, 1000);
})();
