(function (root) {
  "use strict";

  const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  const BLOCK_SECONDS = 3600;
  const MIN_PROGRAM_SECONDS = 1200;

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

  function mondayIndex(nowMs) {
    const weekday = new Intl.DateTimeFormat("en-US",{timeZone:TIME_ZONE,weekday:"short"}).format(new Date(nowMs));
    return ({Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6})[weekday] ?? 0;
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    return value >>> 0;
  }

  function seededShuffle(items, seedText) {
    if (root.InfinityChannelPolicy) return root.InfinityChannelPolicy.seededShuffle(items,seedText);
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

  function eligiblePrograms(catalog) {
    if (root.InfinityChannelPolicy) return root.InfinityChannelPolicy.eligiblePrograms(catalog,{slotSeconds:BLOCK_SECONDS,minRuntimeSeconds:MIN_PROGRAM_SECONDS});
    const seen=new Set();
    return (Array.isArray(catalog)?catalog:[]).filter(program=>{
      const runtime=Number(program&&program.runtimeSeconds);
      if(!program||!program.cleared||!program.videoId||!Number.isFinite(runtime)||runtime<MIN_PROGRAM_SECONDS||seen.has(program.videoId))return false;
      seen.add(program.videoId);return true;
    });
  }

  function createDaySchedule(nowMs, catalog) {
    const part = stationParts(new Date(nowMs));
    const midnightMs = zonedToUtc(part.year, part.month, part.day);
    const programs = eligiblePrograms(catalog);
    const todayKey = dateKey(nowMs);
    const dayOfDeck=mondayIndex(nowMs);
    const epochDay=Math.floor(midnightMs/86400000);
    const weekNumber=Math.floor((epochDay-dayOfDeck)/7);
    const cycle=seededShuffle(programs,`discovery-seven-day-${weekNumber}:${programs.map(p=>p.videoId).sort().join("|")}`);
    return Array.from({length:24},(_,index)=>{
      const deckIndex=dayOfDeck*24+index;
      const movie=cycle[deckIndex]||{
        id:`DISCOVERY-FRESH-${todayKey}-${index}`,
        title:"Fresh Discovery program source needed",
        year:null,
        collection:"Repeat blocked by seven-day scheduler",
        runtimeSeconds:BLOCK_SECONDS,
        videoId:"",
        source:"Discovery catalog",
        cleared:false,
        refill:true,
        posterUrl:""
      };
      const startsAtMs=midnightMs+index*BLOCK_SECONDS*1000;
      return{id:`${todayKey}-${String(index).padStart(2,"0")}`,movie,startsAtMs,endsAtMs:startsAtMs+BLOCK_SECONDS*1000,blockSeconds:BLOCK_SECONDS,fullStationSeconds:BLOCK_SECONDS};
    });
  }

  function playableCommercials(commercials){return(Array.isArray(commercials)?commercials:[]).filter(ad=>ad&&ad.cleared&&ad.videoId&&Number(ad.durationSeconds||0)>0);}

  function createSegments(block, commercials) {
    const runtime=Math.min(BLOCK_SECONDS,Math.max(1,Math.floor(Number(block.movie.runtimeSeconds)||BLOCK_SECONDS)));
    const ads=playableCommercials(commercials);
    const policy=root.InfinityChannelPolicy;
    const breaks=ads.length&&runtime>=1800?(policy?policy.staggeredBreaks({channelId:"Discovery",blockId:block.id,dateKey:block.id.slice(0,10),runtimeSeconds:runtime,blockSeconds:BLOCK_SECONDS,count:runtime>=3000?2:1,edgeSeconds:420}):[]):[];
    const boundaries=[0,...breaks.filter(n=>n>0&&n<runtime),runtime];
    const segments=[];let stationStart=0,adIndex=0;
    function push(segment,requested){const remaining=BLOCK_SECONDS-stationStart;if(remaining<=0)return false;const duration=Math.min(Math.max(1,Math.floor(requested)),remaining);segments.push({...segment,stationStart,duration});stationStart+=duration;return duration===requested;}
    for(let index=0;index<boundaries.length-1;index+=1){const sourceStart=boundaries[index];if(!push({kind:"movie",title:block.movie.title,videoId:block.movie.videoId,cleared:!!block.movie.cleared,sourceStart},boundaries[index+1]-sourceStart))break;if(index<boundaries.length-2&&ads.length){const ad=ads[adIndex++%ads.length];push({kind:"commercial",title:ad.title||"Discovery intermission",videoId:ad.videoId,cleared:true,sourceStart:0},Math.min(90,Number(ad.durationSeconds)||30));}}
    if(stationStart<BLOCK_SECONDS)push({kind:"station",title:block.movie.refill?"Fresh source required":"Next program starts at the top of the hour",videoId:"",cleared:true,sourceStart:0},BLOCK_SECONDS-stationStart);
    return segments;
  }

  function resolve(nowMs, schedule, commercials) {
    const block=schedule.find(item=>nowMs>=item.startsAtMs&&nowMs<item.endsAtMs)||schedule[schedule.length-1]||schedule[0];
    const blockElapsed=Math.max(0,Math.min(BLOCK_SECONDS-1,Math.floor((nowMs-block.startsAtMs)/1000)));
    const segments=createSegments(block,commercials);
    const segment=segments.find(item=>blockElapsed>=item.stationStart&&blockElapsed<item.stationStart+item.duration)||segments[segments.length-1];
    const segmentElapsed=Math.max(0,blockElapsed-segment.stationStart);
    return{block,segment,segmentElapsed,blockElapsed,mediaSeconds:segment.sourceStart+segmentElapsed,segmentRemaining:Math.max(0,segment.duration-segmentElapsed),movieReturnsIn:Math.max(0,segment.duration-segmentElapsed),blockRemaining:Math.max(0,BLOCK_SECONDS-blockElapsed)};
  }

  root.HermitEngine={TIME_ZONE,BLOCK_SECONDS,stationParts,zonedToUtc,dateKey,mondayIndex,stationDurationSeconds:()=>BLOCK_SECONDS,createDaySchedule,createSegments,resolve};
})(window);
