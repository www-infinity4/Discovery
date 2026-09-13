(function (root) {
  "use strict";

  const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  const BLOCK_SECONDS = 3600;
  const BREAK_AFTER_CONTENT_SECONDS = [1200, 2400];
  const DEFAULT_SPOT_SECONDS = 60;

  function stationParts(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone:TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23"
    }).formatToParts(date);
    return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
  }

  function zonedToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    let guess = target;
    for (let index = 0; index < 4; index += 1) {
      const part = stationParts(new Date(guess));
      const represented = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second);
      guess += target - represented;
    }
    return guess;
  }

  function dateKey(nowMs) {
    const part = stationParts(new Date(nowMs));
    return `${part.year}-${String(part.month).padStart(2,"0")}-${String(part.day).padStart(2,"0")}`;
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    return value >>> 0;
  }

  function seededShuffle(items, seedText) {
    const copy = items.slice();
    let seed = hash(seedText);
    const random = () => {
      seed += 0x6D2B79F5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function eligibleProgram(program) {
    const runtime = Number(program && program.runtimeSeconds);
    return Boolean(program && program.cleared && program.videoId && Number.isFinite(runtime) && runtime >= 1200);
  }

  function createDaySchedule(nowMs, catalog) {
    const part = stationParts(new Date(nowMs));
    const midnightMs = zonedToUtc(part.year, part.month, part.day);
    const programs = (Array.isArray(catalog) ? catalog : []).filter(eligibleProgram);
    if (!programs.length) throw new Error("No verified English-language Discovery programs are ready.");
    const todayKey = dateKey(nowMs);
    const dayNumber = Math.floor(midnightMs / 86400000);
    const cycle = seededShuffle(programs, `discovery-week-${Math.floor(dayNumber / 7)}`);
    const start = ((dayNumber * 7) % cycle.length + cycle.length) % cycle.length;
    return Array.from({length:24}, (_, index) => {
      const movie = cycle[(start + index) % cycle.length];
      const startsAtMs = midnightMs + index * BLOCK_SECONDS * 1000;
      return {
        id:`${todayKey}-${String(index).padStart(2,"0")}`,
        movie, startsAtMs, endsAtMs:startsAtMs + BLOCK_SECONDS * 1000,
        blockSeconds:BLOCK_SECONDS, fullStationSeconds:BLOCK_SECONDS
      };
    });
  }

  function createSegments(block, commercials) {
    const runtime = Math.min(BLOCK_SECONDS, Math.max(1200, Math.floor(Number(block.movie.runtimeSeconds) || 3540)));
    const breaks = BREAK_AFTER_CONTENT_SECONDS.filter(boundary => boundary < runtime - DEFAULT_SPOT_SECONDS);
    const boundaries = [0, ...breaks, runtime];
    const segments = [];
    let stationStart = 0;
    let adIndex = 0;
    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const sourceStart = boundaries[index];
      const duration = boundaries[index + 1] - sourceStart;
      segments.push({kind:"movie", title:block.movie.title, videoId:block.movie.videoId, cleared:true, sourceStart, stationStart, duration});
      stationStart += duration;
      if (index < breaks.length && stationStart + DEFAULT_SPOT_SECONDS < BLOCK_SECONDS) {
        const ad = commercials[adIndex++ % commercials.length] || {};
        segments.push({kind:"commercial", title:ad.title || "Discovery intermission", videoId:ad.videoId || "", cleared:Boolean(ad.videoId && ad.cleared), sourceStart:0, stationStart, duration:DEFAULT_SPOT_SECONDS});
        stationStart += DEFAULT_SPOT_SECONDS;
      }
    }
    if (stationStart < BLOCK_SECONDS) {
      segments.push({kind:"station", title:"Next program starts at the top of the hour", videoId:"", cleared:true, sourceStart:0, stationStart, duration:BLOCK_SECONDS - stationStart});
    }
    return segments;
  }

  function resolve(nowMs, schedule, commercials) {
    const block = schedule.find(item => nowMs >= item.startsAtMs && nowMs < item.endsAtMs) || schedule[schedule.length - 1] || schedule[0];
    const blockElapsed = Math.max(0, Math.min(BLOCK_SECONDS - 1, Math.floor((nowMs - block.startsAtMs) / 1000)));
    const segments = createSegments(block, commercials);
    const segment = segments.find(item => blockElapsed >= item.stationStart && blockElapsed < item.stationStart + item.duration) || segments[segments.length - 1];
    const segmentElapsed = Math.max(0, blockElapsed - segment.stationStart);
    return {
      block, segment, segmentElapsed, blockElapsed,
      mediaSeconds:segment.sourceStart + segmentElapsed,
      segmentRemaining:Math.max(0, segment.duration - segmentElapsed),
      movieReturnsIn:Math.max(0, segment.duration - segmentElapsed),
      blockRemaining:Math.max(0, BLOCK_SECONDS - blockElapsed)
    };
  }

  root.HermitEngine = {
    TIME_ZONE, BLOCK_SECONDS, stationParts, zonedToUtc, dateKey,
    stationDurationSeconds:() => BLOCK_SECONDS,
    createDaySchedule, createSegments, resolve
  };
})(window);
