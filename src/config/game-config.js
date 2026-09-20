// ============================================================
// LABYRUN GAME TUNING
// ============================================================
// Edit this file to rebalance the game without touching game.js.
// Character-specific numbers live in characters.js.
// ============================================================

// 50 progression steps: 71x71 at Food Court 1, climbing roughly twice as
// fast as v3.2. The old 225x225 monster now arrives around the middle of the
// ladder, while Food Court 50 reaches 379x379. Dimensions stay odd so the
// maze carver keeps clean one-cell walls/corridors.
const LABYRUN_LEVEL_COUNT = 50;
const LABYRUN_MIN_COURT = 71;
const LABYRUN_MAX_COURT = 379;
const LABYRUN_RELIEF_START_COURT = 225;

const LABYRUN_COURT_PREFIXES = [
  'GREASE','BURRITO','CURRY','TACO','BEAN',
  'SALSA','NACHO','CHILI','QUESO','GUT'
];
const LABYRUN_COURT_VENUES = [
  'GALLERY','BAZAAR','CONCOURSE','TERRACE','ARCADE',
  'ATRIUM','PLAZA','PAVILION','PROMENADE','TERMINAL'
];

function labyrunCourtSize(index){
  const i=Math.max(0,Math.min(LABYRUN_LEVEL_COUNT-1,Number(index)||0));
  // Food Court 25 deliberately lands on the old 225x225 giant maze.
  // The second half keeps growing at roughly the same per-level rate.
  const midpointIndex=24;
  const midpointSize=LABYRUN_RELIEF_START_COURT;
  const raw=i<=midpointIndex
    ? LABYRUN_MIN_COURT + (midpointSize-LABYRUN_MIN_COURT)*(i/midpointIndex)
    : midpointSize + (LABYRUN_MAX_COURT-midpointSize)*((i-midpointIndex)/(LABYRUN_LEVEL_COUNT-1-midpointIndex));
  let size=Math.round(raw);
  if(size%2===0) size+=1;
  return size;
}

function labyrunCourtName(index){
  if(index===0) return 'THE STARTER COURT';
  if(index===LABYRUN_LEVEL_COUNT-1) return 'THE MEGA FOOD COURT';
  const i=index-1;
  // Deterministic but scrambled-looking pairings: every player sees the same
  // silly court name without the server having to ship a name table.
  const p=i%LABYRUN_COURT_PREFIXES.length;
  const band=Math.floor(i/LABYRUN_COURT_PREFIXES.length);
  const v=(p*7 + band*3) % LABYRUN_COURT_VENUES.length;
  return `${LABYRUN_COURT_PREFIXES[p]} ${LABYRUN_COURT_VENUES[v]}`;
}

const LABYRUN_LEVELS = Array.from({length:LABYRUN_LEVEL_COUNT},(_,index)=>{
  const size=labyrunCourtSize(index);
  const progress=index/(LABYRUN_LEVEL_COUNT-1);
  const reliefProgress=Math.max(0,(size-LABYRUN_RELIEF_START_COURT)/(LABYRUN_MAX_COURT-LABYRUN_RELIEF_START_COURT));
  return {
    id:`food-court-${index+1}`,
    name:labyrunCourtName(index),
    subtitle:index===0
      ? 'A polite little warning from your digestive system.'
      : size>=LABYRUN_RELIEF_START_COURT
        ? 'The courts are enormous now. Pharmaceutical intervention authorized.'
        : 'One more bad decision deeper into the food court.',
    width:size,
    height:size,

    // Difficulty grows alongside maze size. The later courts are meant to feel
    // increasingly hostile even before the geometry becomes ridiculous.
    bowelMultiplier: 1 + 1.20*Math.pow(progress,0.82),
    crisisTimeMultiplier: 1 - 0.35*Math.pow(progress,0.86),
    crisisStartBonus: Math.round(18*Math.pow(progress,0.90)),

    // The old 225x225 "mega" size now arrives around the middle of the ladder.
    // From that point onward, Tums and Pepto begin appearing and become more
    // common as the courts continue growing toward 379x379.
    relief:size>=LABYRUN_RELIEF_START_COURT
      ? {
          tumsCount: 5 + Math.round(7*reliefProgress),
          peptoCount: 2 + Math.round(4*reliefProgress),
          tumsRelief: 12,
          peptoRelief: 22
        }
      : null
  };
});

window.LABYRUN_CONFIG = {
  // Each rematch advances one court. The old 225x225 giant arrives around mid-ladder.
  levels: LABYRUN_LEVELS,
  maze: {
    // Fallback size if levels are removed.
    width: 71,
    height: 71,
    loopDensity: 0.10,
    startRoomRadius: 5,
    startSpokeLength: 10
  },
  camera: {
    tileSize: 46,
    playScale: 1.30,
    fogRadius: 11.5,
    // Pre-race route reveal stays in the same isometric/playable angle:
    // show the exit, pull back to showcase the full court's depth, then dive
    // into the shared center start before controls unlock.
    introExitHoldMs: 1200,
    introExitZoomOutMs: 1850,
    introDepthHoldMs: 1450,
    introStartZoomInMs: 2250,
    toiletRevealFlyMs: 1050,
    toiletRevealHoldMs: 1150,
    toiletRevealReturnMs: 1050,
    crisisWorldRumblePixels: 3.8,
    crisisWallRumblePixels: 1.7
  },
  race: {
    crisisMinMs: 30000,
    crisisMaxMs: 43000,
    baseBowelRiseNormal: 0.025,
    baseBowelRiseCrisis: 0.82,
    startingBowelMin: 2,
    startingBowelMax: 7,
    crisisBowelMin: 36,
    crisisBowelMax: 50,
    mapChecks: 5,
    mapBowelPenalty: 5.0,
    rematchCountdownSeconds: 20,
    toiletCount: 2,
    // Invisible 'gut instinct' routing: sticking close to the shortest path to
    // your assigned open toilet steadily calms your gut. Wandering off it
    // makes bowel pressure rise faster.
    gutRouteSafeMultiplier: 0.68,
    gutRouteOffMultiplier: 1.34,
    gutRouteBuildPerSecond: 0.72,
    gutRouteLosePerSecond: 1.05,
    favoriteFoodInvincibleMs: 10000
  },
  score: {
    exitWinner: 900,
    firstToilet: 1000,
    secondToilet: 700,
    favoriteFood: 250
  },
  movement: {
    baseSpeed: 6.0,
    minSpeed: 1.35,
    collisionRadius: 0.19,
    movementSubstep: 0.10,
    cornerAssist: 0.055,
    // Touch tuning: radial dead-zone kills tiny thumb jitter/drift while the
    // axis snap makes nearly-horizontal/vertical gestures feel intentional.
    touchDeadZone: 0.18,
    touchAxisSnap: 0.12,
    // The world coordinate is the racer's FOOT CONTACT point, not their torso.
    // Keeping this explicit makes future sprite anchoring straightforward.
    playerFootAnchorY: 27,
    slowdownStartsAt: 66,
    sprintMultiplier: 1.85,
    staminaDrainPerSecond: 30,
    staminaRegenPerSecond: 25,
    staminaRegenDelayMs: 650,
    crisisSprintBowelRiskPerSecond: 4.4,
    crisisMovementMultiplier: 0.76
  },
  ai: {
    personalities: [
      {
        id: 'navigator', name: 'Navigator', speed: 0.56,
        routeNoise: 0.10, repathMin: 3.2, repathMax: 5.4,
        detourChance: 0.16, detourBudget: 1.24,
        sprintNormal: 0.035, sprintCrisis: 0.28, riskTolerance: 0.72,
        launchAngle: -2.2, crisisReactionMin: 0.10, crisisReactionMax: 0.45
      },
      {
        id: 'gambler', name: 'Gambler', speed: 0.61,
        routeNoise: 0.38, repathMin: 2.5, repathMax: 4.2,
        detourChance: 0.31, detourBudget: 1.43,
        sprintNormal: 0.08, sprintCrisis: 0.46, riskTolerance: 0.91,
        launchAngle: 0.15, crisisReactionMin: 0.00, crisisReactionMax: 0.20
      },
      {
        id: 'wanderer', name: 'Wanderer', speed: 0.52,
        routeNoise: 0.72, repathMin: 4.1, repathMax: 6.8,
        detourChance: 0.56, detourBudget: 1.78,
        sprintNormal: 0.025, sprintCrisis: 0.34, riskTolerance: 0.66,
        launchAngle: 2.0, crisisReactionMin: 0.35, crisisReactionMax: 0.95
      }
    ]
  }
};
