// English-language Discovery lineup assembled from official Discovery and Science Channel uploads.
(function () {
  "use strict";

  const rows = [
    ["Dig, Sweat and Repeat",3540,"wA39IlKxu_Y","Gold Rush · Episode Recap","Discovery"],
    ["Rick on the Edge",3540,"-Er6X3e3_hk","Gold Rush · Episode Recap","Discovery"],
    ["Gear Up or Shut Down",3540,"DqTkWOi_zs8","Gold Rush · Episode Recap","Discovery"],
    ["Suspension Snapped, Stakes Raised",3540,"n9UvGwegMww","Gold Rush · Episode Recap","Discovery"],
    ["The Ultimate Mining Challenges",3540,"Zl8l62dpTP4","Gold Rush · Extended Recap","Discovery Channel"],
    ["Parker and Tony Risk Millions",3540,"5MuCrIR3MsY","Gold Rush · Extended Recap","Discovery"],
    ["Parker Hits 10,000 Ounces",2400,"hxggQ6YzAkc","Gold Rush","Discovery"],
    ["All About the Beets",3540,"MM5YdOtwuHI","Gold Rush · Compilation","Discovery"],
    ["Moonshine Season Starts",3540,"tlolU-NKic0","Moonshiners · Full Episode","Discovery"],
    ["The Best of Mark and Digger",3540,"T_a_MQpqbrc","Moonshiners · Special","Discovery"],
    ["Crime and Shine",3540,"WDFZfNbmb_g","Moonshiners · Special","Discovery"],
    ["Most Delicious Brews",3540,"9RdO6QE0jG0","Moonshiners · Season Collection","Discovery"],
    ["Expedition X: Season 2 Collection",3540,"amQdip9y2zs","Expedition X · Episode Collection","Discovery Channel"],
    ["Eight Hours of How It’s Made",3540,"5VGsMlLTJM4","How It’s Made · Marathon","Science Channel"],
    ["The Most Popular Segments",3540,"NMitdpVNh_U","How It’s Made · Marathon","Science Channel"],
    ["Things You’ve Maybe Never Heard Of",3540,"qY45EKqgRUc","How It’s Made · Marathon","Science Channel"],
    ["Mouthwatering Mega Food Mix",3540,"xNl46qUrYJQ","How It’s Made · Marathon","Science Channel"],
    ["Things You’ll Find Around the Office",3540,"1uWA6iEz37Q","How It’s Made · Collection","Science Channel"],
    ["How Everything in the Gym Is Made",3540,"XlL06VXREI0","How It’s Made · Collection","Science Channel"]
  ];

  const forbidden = /\b(español|spanish|latino|subtitulado|doblado)\b/i;
  if (rows.some(row => forbidden.test(row.join(" ")))) {
    throw new Error("Discovery rejected non-English programming.");
  }

  window.HERMIT_CATALOG = rows.map(function (row, index) {
    return {
      id:"DISCOVERY-" + String(index + 1).padStart(3,"0"),
      title:row[0],
      year:null,
      collection:row[3] + " · Full Documentary",
      runtimeSeconds:row[1],
      videoId:row[2],
      source:row[4],
      networkChannel:"DISCOVERY",
      contentClass:"Discovery Program",
      rating:"TV-PG",
      cleared:true,
      posterUrl:""
    };
  });

  window.DISCOVERY_VAULT = [
    "Gold Rush","Moonshiners","Expedition Unknown","Expedition X",
    "Deadliest Catch","How It’s Made","Dirty Jobs","MythBusters",
    "Survival","Engineering","Nature","Science"
  ];

  window.INFINITY_CHANNEL = {
    id:"DISCOVERY",
    sourcePolicy:"English-language official Discovery and Science Channel uploads only. Short promotional clips and non-embeddable sources are excluded.",
    schedulePolicy:"Twenty-four hourly slots fill each viewer-local day. The lineup changes at midnight and stays synchronized for everyone in the same local day."
  };

  window.HERMIT_COMMERCIALS = [
    {id:"DISCOVERY-BREAK-1",title:"Discovery intermission",durationSeconds:60,videoId:"",cleared:true},
    {id:"DISCOVERY-BREAK-2",title:"Next on Discovery",durationSeconds:60,videoId:"",cleared:true},
    {id:"DISCOVERY-BREAK-3",title:"The adventure continues shortly",durationSeconds:60,videoId:"",cleared:true}
  ];
})();
