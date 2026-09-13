(function(){
  "use strict";
  const STYLE_ID="infinity-channel-pip-style";
  const CHANNELS_SRC="https://www-infinity4.github.io/TNT/channels.js?v=20260913-freeze2";
  let shell=null,placeholder=null,phiLayer=null,drag=null;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .infinity-channel-pip{position:fixed!important;right:14px;bottom:14px;left:auto;top:auto;width:min(44vw,390px)!important;height:auto!important;aspect-ratio:16/9!important;z-index:2147483646!important;margin:0!important;border-radius:12px!important;overflow:hidden!important;box-shadow:0 18px 60px rgba(0,0,0,.72)!important;background:#000!important;touch-action:none}
      .infinity-channel-pip iframe,.infinity-channel-pip video,.infinity-channel-pip .player,.infinity-channel-pip #player{width:100%!important;height:100%!important;min-height:0!important;border:0!important}
      .infinity-pip-tools{position:absolute;z-index:2147483647;top:6px;right:6px;display:flex;gap:5px;opacity:.92}
      .infinity-pip-tools button{min-width:36px;min-height:36px;padding:0 9px;border:1px solid rgba(255,255,255,.55);border-radius:999px;color:#fff;background:rgba(0,0,0,.76);font:800 13px/1 system-ui;box-shadow:0 2px 10px rgba(0,0,0,.45)}
      .infinity-pip-drag{cursor:grab;touch-action:none}
      .infinity-phi-layer{position:fixed;inset:0;z-index:2147483600;background:#061127}
      .infinity-phi-layer iframe{width:100%;height:100%;border:0;background:#061127}
      .infinity-phi-close{position:fixed;top:10px;left:10px;z-index:2147483645;min-height:42px;padding:0 15px;border:1px solid rgba(255,255,255,.55);border-radius:999px;color:#fff;background:rgba(0,0,0,.82);font:800 14px system-ui}

      /* Every channel gets one identical, dependable hamburger behavior. */
      .channel-menu.infinity-normalized-menu{position:relative!important;display:block!important;z-index:2147483000!important;margin:0!important;font-family:system-ui,-apple-system,Segoe UI,sans-serif!important}
      .channel-menu.infinity-normalized-menu>summary{list-style:none!important;cursor:pointer!important;min-width:48px!important;min-height:42px!important;padding:0 12px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:999px!important;color:#fff!important;background:rgba(8,12,22,.92)!important;box-shadow:0 8px 26px rgba(0,0,0,.32)!important;font:800 13px/1 system-ui!important;user-select:none!important}
      .channel-menu.infinity-normalized-menu>summary::-webkit-details-marker{display:none!important}
      .channel-menu.infinity-normalized-menu>nav{position:absolute!important;right:0!important;left:auto!important;top:calc(100% + 8px)!important;width:min(88vw,340px)!important;max-height:72vh!important;overflow:auto!important;padding:9px!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:16px!important;background:rgba(5,8,16,.985)!important;box-shadow:0 18px 55px rgba(0,0,0,.58)!important;grid-template-columns:1fr!important;gap:5px!important;z-index:2147483001!important}
      .channel-menu.infinity-normalized-menu:not([open])>nav{display:none!important}
      .channel-menu.infinity-normalized-menu[open]>nav{display:grid!important}
      .channel-menu.infinity-normalized-menu>nav a{display:block!important;padding:10px 11px!important;border-radius:10px!important;color:#fff!important;text-decoration:none!important;background:rgba(255,255,255,.055)!important;font:700 14px/1.25 system-ui!important;white-space:normal!important}
      .channel-menu.infinity-normalized-menu>nav a[aria-current="page"]{outline:2px solid #f5c451!important;background:rgba(245,196,81,.14)!important}
      @media(max-width:640px){.infinity-channel-pip{width:min(58vw,270px)!important;right:9px;bottom:9px}.infinity-pip-tools button{min-width:34px;min-height:34px;padding:0 8px}.infinity-phi-layer iframe{padding-top:0}.channel-menu.infinity-normalized-menu>summary .menu-label{display:none!important}.channel-menu.infinity-normalized-menu>nav{width:min(92vw,330px)!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureRemote(){
    if(window.InfinityChannelRemote||document.querySelector('script[data-infinity-channels],script[src*="/TNT/channels.js"]'))return;
    const script=document.createElement("script");
    script.src=CHANNELS_SRC;
    script.dataset.infinityChannels="1";
    document.head.appendChild(script);
  }

  function escapeHTML(value){
    return String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function currentSlug(){
    return location.pathname.split("/").filter(Boolean)[0]||"";
  }

  function normalizeRemote(){
    let menu=document.querySelector(".channel-menu");
    if(!menu){
      if(window.InfinityChannelRemote&&typeof window.InfinityChannelRemote.refresh==="function"){
        try{window.InfinityChannelRemote.refresh();}catch(_){}
        menu=document.querySelector(".channel-menu");
      }
      if(!menu)return false;
    }

    const nav=menu.querySelector(":scope > nav");
    if(menu.dataset.infinityCloseBound!=="1"){
      menu.dataset.infinityCloseBound="1";
      if(nav)nav.addEventListener("click",event=>{if(event.target.closest("a"))menu.removeAttribute("open");});
      document.addEventListener("pointerdown",event=>{
        if(menu.open&&!menu.contains(event.target))menu.removeAttribute("open");
      });
    }
    return true;
  }

  function enhanceMediaPermissions(root=document){
    root.querySelectorAll("iframe").forEach(frame=>{
      const src=frame.getAttribute("src")||"";
      if(!/youtube(?:-nocookie)?\.com|youtu\.be/i.test(src))return;
      const existing=(frame.getAttribute("allow")||"").split(";").map(v=>v.trim()).filter(Boolean);
      ["autoplay","encrypted-media","picture-in-picture","fullscreen"].forEach(token=>{
        if(!existing.some(item=>item===token||item.startsWith(token+" ")))existing.push(token);
      });
      frame.setAttribute("allow",existing.join("; "));
      frame.setAttribute("allowfullscreen","");
    });
  }

  function watchPlayers(){
    enhanceMediaPermissions();
    let remoteQueued=false;
    const queueRemote=()=>{
      if(remoteQueued)return;
      remoteQueued=true;
      requestAnimationFrame(()=>{remoteQueued=false;normalizeRemote();});
    };
    const observer=new MutationObserver(records=>{
      let remoteMissing=!document.querySelector(".channel-menu.infinity-normalized-menu");
      for(const record of records){
        record.addedNodes.forEach(node=>{
          if(node.nodeType!==1)return;
          if(node.matches&&node.matches("iframe"))enhanceMediaPermissions(node.parentNode||document);
          else if(node.querySelector&&node.querySelector("iframe"))enhanceMediaPermissions(node);
          if(node.matches&&node.matches(".channel-menu")||node.querySelector&&node.querySelector(".channel-menu"))remoteMissing=true;
        });
      }
      if(remoteMissing)queueRemote();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  function findShell(){
    const candidates=[".screen-shell",".player-stage",".video-shell",".player-shell",".screen",".cinema-screen"];
    for(const selector of candidates){const node=document.querySelector(selector);if(node&&(node.querySelector("iframe,video,#player,.player")||selector===".screen-shell"))return node;}
    const media=document.querySelector("iframe[src*='youtube'],video,#player,.player");
    return media?(media.closest("section,article,div")||media):null;
  }

  function addTools(){
    if(!shell||shell.querySelector(".infinity-pip-tools"))return;
    const tools=document.createElement("div");tools.className="infinity-pip-tools";
    const move=document.createElement("button");move.type="button";move.className="infinity-pip-drag";move.textContent="Move";move.setAttribute("aria-label","Move floating player");
    const restore=document.createElement("button");restore.type="button";restore.textContent="↙";restore.setAttribute("aria-label","Restore large player");
    tools.append(move,restore);shell.appendChild(tools);
    restore.addEventListener("click",restorePlayer);
    move.addEventListener("pointerdown",startDrag);
  }

  function requestSystemPiP(){
    try{
      if(window.InfinityAndroid&&typeof window.InfinityAndroid.enterPictureInPicture==="function"){
        const result=window.InfinityAndroid.enterPictureInPicture();
        document.dispatchEvent(new CustomEvent("infinity:system-pip",{detail:{requested:true,mode:"android-bridge"}}));
        return result===undefined?true:result;
      }
      const video=[...document.querySelectorAll("video")].find(v=>!v.paused&&!v.ended)||document.querySelector("video");
      if(video&&document.pictureInPictureEnabled&&!document.pictureInPictureElement&&typeof video.requestPictureInPicture==="function"){
        video.requestPictureInPicture().catch(()=>{});
        document.dispatchEvent(new CustomEvent("infinity:system-pip",{detail:{requested:true,mode:"html-video"}}));
        return true;
      }
    }catch(_){}
    return false;
  }

  function prepareSharePiP(){enhanceMediaPermissions();floatPlayer();requestSystemPiP();}

  function floatPlayer(){
    shell=findShell();if(!shell||shell.classList.contains("infinity-channel-pip"))return;
    installStyle();
    const rect=shell.getBoundingClientRect();
    placeholder=document.createElement("div");
    placeholder.setAttribute("aria-hidden","true");
    placeholder.style.height=rect.height+"px";
    placeholder.style.width="100%";
    shell.parentNode.insertBefore(placeholder,shell);
    shell.classList.add("infinity-channel-pip");
    shell.style.right="14px";shell.style.bottom="14px";shell.style.left="auto";shell.style.top="auto";
    addTools();
    document.dispatchEvent(new CustomEvent("infinity:pip",{detail:{active:true}}));
  }

  function restorePlayer(){
    if(!shell)return;
    shell.classList.remove("infinity-channel-pip");
    shell.style.removeProperty("right");shell.style.removeProperty("bottom");shell.style.removeProperty("left");shell.style.removeProperty("top");
    const tools=shell.querySelector(".infinity-pip-tools");if(tools)tools.remove();
    if(placeholder){placeholder.remove();placeholder=null;}
    document.dispatchEvent(new CustomEvent("infinity:pip",{detail:{active:false}}));
  }

  function startDrag(event){
    if(!shell)return;event.preventDefault();
    const rect=shell.getBoundingClientRect();
    drag={id:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.addEventListener("pointermove",moveDrag);
    event.currentTarget.addEventListener("pointerup",endDrag,{once:true});
    event.currentTarget.addEventListener("pointercancel",endDrag,{once:true});
  }
  function moveDrag(event){
    if(!drag||event.pointerId!==drag.id)return;
    const maxX=Math.max(0,innerWidth-shell.offsetWidth),maxY=Math.max(0,innerHeight-shell.offsetHeight);
    shell.style.left=Math.min(maxX,Math.max(0,event.clientX-drag.dx))+"px";
    shell.style.top=Math.min(maxY,Math.max(0,event.clientY-drag.dy))+"px";
    shell.style.right="auto";shell.style.bottom="auto";
  }
  function endDrag(event){event.currentTarget.removeEventListener("pointermove",moveDrag);drag=null;}

  function openPhi(form){
    const action=form.action||"https://www-infinity4.github.io/C13b0/phi";
    const url=new URL(action,location.href),data=new FormData(form);
    data.forEach((value,key)=>url.searchParams.set(key,String(value)));
    if(!url.searchParams.has("run"))url.searchParams.set("run","1");
    floatPlayer();
    if(phiLayer)phiLayer.remove();
    phiLayer=document.createElement("div");phiLayer.className="infinity-phi-layer";
    const frame=document.createElement("iframe");frame.src=url.href;frame.title="Infinity Phi search results";frame.referrerPolicy="strict-origin-when-cross-origin";
    const close=document.createElement("button");close.type="button";close.className="infinity-phi-close";close.textContent="← Channel";close.addEventListener("click",()=>{phiLayer.remove();phiLayer=null;restorePlayer();});
    phiLayer.append(frame,close);document.body.appendChild(phiLayer);
    history.pushState({infinityPhi:true},"",location.href);
  }

  function isShareTarget(target){return!!target.closest("#shareButton,.share-button,[data-share],button[aria-label*='Share'],button[title*='Share'],a[aria-label*='Share'],a[title*='Share']");}

  function bind(){
    installStyle();
    ensureRemote();
    watchPlayers();
    normalizeRemote();
    setTimeout(normalizeRemote,250);
    setTimeout(normalizeRemote,1000);
    document.addEventListener("pointerdown",event=>{if(isShareTarget(event.target))prepareSharePiP();},true);
    document.addEventListener("click",event=>{if(isShareTarget(event.target))prepareSharePiP();},true);
    document.addEventListener("focusin",event=>{if(event.target.matches(".phi-web-search input[type='search'],form[action*='/phi'] input[type='search']"))floatPlayer();});
    document.addEventListener("input",event=>{if(event.target.matches(".phi-web-search input[type='search'],form[action*='/phi'] input[type='search']"))floatPlayer();});
    document.addEventListener("submit",event=>{const form=event.target;if(form.matches(".phi-web-search form,form[action*='/phi']")){event.preventDefault();openPhi(form);}},true);
    addEventListener("popstate",()=>{if(phiLayer){phiLayer.remove();phiLayer=null;restorePlayer();}});
    window.InfinityChannelPiP={open:floatPlayer,restore:restorePlayer,system:requestSystemPiP,prepareShare:prepareSharePiP,enhanceMedia:enhanceMediaPermissions,normalizeRemote};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
