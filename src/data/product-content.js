(() => {
  'use strict';

  const modes = [
    {
      id:'classic', name:'Classic', icon:'🚽', tag:'THE ORIGINAL DISASTER',
      description:'Race for the exit. When the bowel alarm hits, two toilets become the only way out with dignity.',
      rules:{}, xpMultiplier:1
    },
    {
      id:'sudden-shit', name:'Sudden Shit', icon:'⚡', tag:'PANIC IMMEDIATELY',
      description:'The bowel event arrives almost immediately. Navigation becomes a toilet scramble before anyone gets comfortable.',
      rules:{crisisMinMs:4500,crisisMaxMs:7500,crisisStartBonus:12,bowelMultiplier:1.08}, xpMultiplier:1.15
    },
    {
      id:'one-throne', name:'One Throne', icon:'👑', tag:'ONE TOILET. FOUR RACERS.',
      description:'Only one toilet spawns. The first racer to claim it survives. Everyone else becomes part of the cleanup problem.',
      rules:{toiletCount:1}, xpMultiplier:1.25
    },
    {
      id:'no-map', name:'No Map', icon:'🙈', tag:'MEMORY OR MISERY',
      description:'No map peeks. What you remember from the opening flyover is all you get.',
      rules:{mapChecks:0,mapDisabled:true}, xpMultiplier:1.20
    },
    {
      id:'super-specials', name:'Super Specials', icon:'💥', tag:'ABILITY MAYHEM',
      description:'Character specials recharge dramatically faster. Expect wall destruction, traps and general friendship damage.',
      rules:{specialCooldownScale:.34,specialExtraCharges:1}, xpMultiplier:1.05
    },
    {
      id:'constipation', name:'Constipation', icon:'🧱', tag:'LONG RACE. LATE PANIC.',
      description:'The bowel event waits much longer. Navigation and racing dominate before the eventual catastrophic turn.',
      rules:{crisisMinMs:62000,crisisMaxMs:80000,crisisStartBonus:-12,bowelMultiplier:.86}, xpMultiplier:1.15
    },
    {
      id:'diarrhea', name:'Diarrhea', icon:'☠️', tag:'NO MARGIN FOR ERROR',
      description:'Bowel pressure rises brutally fast once the alarm hits. Sprinting and wrong turns become extremely expensive.',
      rules:{crisisMinMs:22000,crisisMaxMs:32000,crisisStartBonus:18,bowelMultiplier:1.55,crisisSprintRiskScale:1.35}, xpMultiplier:1.35
    }
  ];

  const worlds = [
    {
      id:'mall', name:'Mall Food Court', icon:'🛍️', courts:8, hue:326,
      tagline:'Grease, neon, dead storefronts and suspiciously distant washrooms.',
      description:'The home turf. Food kiosks, tiled concourses and atriums built to make every wrong turn feel expensive.',
      props:['🪧','🪴','🥤','🛒'], futureVertical:'Escalators, upper galleries and atrium balconies.'
    },
    {
      id:'taco-festival', name:'Taco Festival', icon:'🌮', courts:8, hue:18,
      tagline:'Outdoor tents, hot sauce and gastrointestinal hubris.',
      description:'Festival lanes and food tents turn the maze into a loud, colorful digestive minefield.',
      props:['🌶️','🎪','🌮','🪅'], futureVertical:'Grandstands, raised stages and service ramps.'
    },
    {
      id:'airport', name:'Airport Terminal', icon:'✈️', courts:8, hue:202,
      tagline:'Your gate changed and so did your stomach.',
      description:'Long concourses, baggage zones and terminal corridors reward route memory and punish hesitation.',
      props:['🧳','🛫','🪑','☕'], futureVertical:'Moving walkways, escalators, mezzanines and gate bridges.'
    },
    {
      id:'carnival', name:'Sketchy Carnival', icon:'🎡', courts:8, hue:278,
      tagline:'Funnel cake was a tactical error.',
      description:'A filthy midway of tents, rides and portable facilities that somehow always seem one turn away.',
      props:['🎠','🎈','🍿','🎟️'], futureVertical:'Ride platforms, funhouse ramps and elevated boardwalks.'
    },
    {
      id:'wedding', name:'Wedding Buffet', icon:'💍', courts:9, hue:344,
      tagline:'Open bar. Buffet. Formalwear. What could go wrong?',
      description:'Banquet halls and reception corridors turn social elegance into a desperate porcelain sprint.',
      props:['💐','🍰','🥂','🎁'], futureVertical:'Ballroom balconies, hotel floors and service elevators.'
    },
    {
      id:'convention', name:'Mega Convention Center', icon:'🏢', courts:9, hue:148,
      tagline:'The final corporate labyrinth from hell.',
      description:'Huge expo halls, endless corridors and food vendors combine everything the campaign taught you.',
      props:['📛','📦','🎤','🖥️'], futureVertical:'Multiple expo floors, escalator banks and skybridges.'
    }
  ];

  let cursor=0;
  worlds.forEach((w,index)=>{
    w.index=index;
    w.startLevelIndex=cursor;
    w.endLevelIndex=cursor+w.courts-1;
    cursor+=w.courts;
  });

  const achievements = [
    {id:'first-race',name:'BAD DECISIONS BEGIN',icon:'🏁',description:'Finish your first LABYRUN race.'},
    {id:'first-escape',name:'CLEAN GETAWAY',icon:'🚪',description:'Reach the exit before the bowel emergency.'},
    {id:'first-throne',name:'PORCELAIN PRIVILEGE',icon:'🚽',description:'Claim a toilet during a bowel emergency.'},
    {id:'favorite-food',name:'COMFORT FOOD',icon:'⭐',description:'Collect your racer’s favourite-food 1UP.'},
    {id:'biohazard',name:'BIOHAZARD',icon:'☣️',description:'Be present for a race where everybody loses control.'},
    {id:'no-map-win',name:'WHO NEEDS DIRECTIONS?',icon:'🧠',description:'Win a No Map race.'},
    {id:'one-throne-win',name:'THRONE ALONE',icon:'👑',description:'Win One Throne mode.'},
    {id:'three-modes',name:'DISASTER TOURIST',icon:'🎟️',description:'Win in three different game modes.'},
    {id:'25-races',name:'FOOD COURT REGULAR',icon:'🥤',description:'Finish 25 races.'},
    {id:'100-races',name:'QUESTIONABLE LIFESTYLE',icon:'💯',description:'Finish 100 races.'},
    {id:'25000-score',name:'HIGH SCORE HEMORRHOID',icon:'🏆',description:'Earn 25,000 career score.'},
    {id:'world-tour',name:'WORLD TOUR',icon:'🌍',description:'Finish a race in every LABYRUN world.'}
  ];

  const difficulties = [
    {id:'casual',name:'Casual',description:'Friendlier AI and bowel pressure.',aiScale:.88,bowelScale:.88,xpMultiplier:.85},
    {id:'standard',name:'Standard',description:'The intended LABYRUN balance.',aiScale:1,bowelScale:1,xpMultiplier:1},
    {id:'spicy',name:'Spicy',description:'Faster rivals and less forgiving guts.',aiScale:1.12,bowelScale:1.16,xpMultiplier:1.20}
  ];

  function mode(id){ return modes.find(m=>m.id===id)||modes[0]; }
  function world(id){ return worlds.find(w=>w.id===id)||worlds[0]; }
  function difficulty(id){ return difficulties.find(d=>d.id===id)||difficulties[1]; }
  function worldForLevel(index){ return worlds.find(w=>index>=w.startLevelIndex&&index<=w.endLevelIndex)||worlds[worlds.length-1]; }

  window.LABYRUN_PRODUCT={modes,worlds,achievements,difficulties,mode,world,difficulty,worldForLevel};
})();
