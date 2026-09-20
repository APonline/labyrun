(() => {
  'use strict';
  const PRODUCT=window.LABYRUN_PRODUCT;
  const KEY='labyrun.profile.v4';
  const DEFAULT={
    version:1,xp:0,careerScore:0,races:0,wins:0,escapes:0,toiletSurvivals:0,poops:0,
    favoriteFoods:0,specialUses:0,mapPeeks:0,worldsPlayed:{},modeWins:{},characterPicks:{},
    achievements:[],lastCharacterId:null,lastModeId:'classic',lastWorldId:'mall',difficultyId:'standard'
  };
  let state=load();
  let recent=[];

  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
      return {
        ...DEFAULT,
        ...saved,
        worldsPlayed:{...DEFAULT.worldsPlayed,...(saved.worldsPlayed||{})},
        modeWins:{...DEFAULT.modeWins,...(saved.modeWins||{})},
        characterPicks:{...DEFAULT.characterPicks,...(saved.characterPicks||{})},
        achievements:Array.isArray(saved.achievements)?saved.achievements.slice():[]
      };
    }catch(_){return {...DEFAULT,worldsPlayed:{},modeWins:{},characterPicks:{},achievements:[]};}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
  function xpForLevel(level){ const l=Math.max(1,Number(level)||1); return Math.round(450*(l-1)+85*Math.pow(l-1,1.55)); }
  function level(){ let l=1; while(l<100&&state.xp>=xpForLevel(l+1))l++; return l; }
  function progress(){
    const l=level(),low=xpForLevel(l),high=xpForLevel(l+1);
    return {level:l,current:state.xp-low,needed:Math.max(1,high-low),total:state.xp};
  }
  function unlock(id){
    if(state.achievements.includes(id))return false;
    state.achievements.push(id);recent.push(id);return true;
  }
  function evaluate(context={}){
    if(state.races>=1)unlock('first-race');
    if(state.escapes>=1)unlock('first-escape');
    if(state.toiletSurvivals>=1)unlock('first-throne');
    if(state.favoriteFoods>=1)unlock('favorite-food');
    if(context.allPooped)unlock('biohazard');
    if(context.won&&context.modeId==='no-map')unlock('no-map-win');
    if(context.won&&context.modeId==='one-throne')unlock('one-throne-win');
    if(Object.keys(state.modeWins).filter(k=>state.modeWins[k]>0).length>=3)unlock('three-modes');
    if(state.races>=25)unlock('25-races');
    if(state.races>=100)unlock('100-races');
    if(state.careerScore>=25000)unlock('25000-score');
    if(PRODUCT?.worlds?.every(w=>state.worldsPlayed[w.id]))unlock('world-tour');
  }
  function recordPick(characterId){
    if(!characterId)return;
    state.lastCharacterId=characterId;
    state.characterPicks[characterId]=(state.characterPicks[characterId]||0)+1;
    save();
  }
  function recordSpecialUse(){state.specialUses++;save();}
  function recordMapPeek(){state.mapPeeks++;save();}
  function recordRace(ctx={}){
    recent=[];
    const mode=PRODUCT?.mode?.(ctx.modeId)||{xpMultiplier:1};
    const diff=PRODUCT?.difficulty?.(ctx.difficultyId)||{xpMultiplier:1};
    state.races++;
    if(ctx.won)state.wins++;
    if(ctx.escaped)state.escapes++;
    if(ctx.toiletSurvived)state.toiletSurvivals++;
    if(ctx.pooped)state.poops++;
    if(ctx.foodCollected)state.favoriteFoods++;
    if(ctx.worldId)state.worldsPlayed[ctx.worldId]=(state.worldsPlayed[ctx.worldId]||0)+1;
    if(ctx.won&&ctx.modeId)state.modeWins[ctx.modeId]=(state.modeWins[ctx.modeId]||0)+1;
    const score=Math.max(0,Math.round(Number(ctx.score)||0));
    state.careerScore+=score;
    const base=100+(ctx.won?190:0)+(ctx.escaped?90:0)+(ctx.toiletSurvived?70:0)+(ctx.foodCollected?45:0)+Math.min(125,Math.round(score/10));
    const xp=Math.max(50,Math.round(base*Number(mode.xpMultiplier||1)*Number(diff.xpMultiplier||1)));
    state.xp+=xp;
    evaluate(ctx);save();
    return {xp,unlocks:recent.slice(),progress:progress()};
  }
  function setPreference(key,value){state[key]=value;save();}
  function get(){return JSON.parse(JSON.stringify(state));}
  function reset(){state={...DEFAULT,worldsPlayed:{},modeWins:{},characterPicks:{},achievements:[]};recent=[];save();}
  function achievementRows(){
    return (PRODUCT?.achievements||[]).map(a=>({...a,unlocked:state.achievements.includes(a.id)}));
  }
  function characterUsageRows(){
    const roster=Array.isArray(window.LABYRUN_CHARACTERS)?window.LABYRUN_CHARACTERS:[];
    const rows=roster.map((c,index)=>({
      id:c.id,name:c.name,shortName:c.shortName||c.name,portrait:c.portrait||'',color:c.color||'',
      picks:Number(state.characterPicks?.[c.id]||0),rosterIndex:index
    }));
    const total=rows.reduce((sum,row)=>sum+row.picks,0);
    rows.sort((a,b)=>(b.picks-a.picks)||(a.rosterIndex-b.rosterIndex));
    return rows.map((row,index)=>({...row,rank:index+1,total,share:total?Math.round((row.picks/total)*100):0}));
  }

  window.LabyrunProfile={get,progress,level,recordPick,recordRace,recordSpecialUse,recordMapPeek,setPreference,achievementRows,characterUsageRows,reset};
})();
