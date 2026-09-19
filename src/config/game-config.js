// ============================================================
// LABYRUN GAME TUNING
// ============================================================
// Edit this file to rebalance the game without touching game.js.
// Character-specific numbers live in characters.js.
// ============================================================
window.LABYRUN_CONFIG = {
  maze: {
    width: 225,
    height: 225,
    loopDensity: 0.10,
    startRoomRadius: 5,
    startSpokeLength: 10
  },
  camera: {
    tileSize: 46,
    playScale: 1.30,
    fogRadius: 11.5,
    introHoldMs: 4600,
    introZoomMs: 3200,
    toiletRevealFlyMs: 1050,
    toiletRevealHoldMs: 1150,
    toiletRevealReturnMs: 1050,
    crisisWorldRumblePixels: 3.8,
    crisisWallRumblePixels: 1.7
  },
  race: {
    crisisMinMs: 34000,
    crisisMaxMs: 47000,
    baseBowelRiseNormal: 0.025,
    baseBowelRiseCrisis: 0.82,
    startingBowelMin: 2,
    startingBowelMax: 7,
    crisisBowelMin: 36,
    crisisBowelMax: 50,
    mapChecks: 5,
    mapBowelPenalty: 5.0
  },
  movement: {
    baseSpeed: 6.0,
    minSpeed: 1.35,
    slowdownStartsAt: 66,
    sprintMultiplier: 1.85,
    staminaDrainPerSecond: 30,
    staminaRegenPerSecond: 25,
    staminaRegenDelayMs: 650,
    crisisSprintBowelRiskPerSecond: 4.4,
    crisisMovementMultiplier: 0.76
  },
  ai: {
    // Only three are needed for solo mode, but adding more here is safe.
    personalities: [
      {
        id: 'navigator', name: 'Navigator', speed: 0.62,
        routeNoise: 0.05, repathMin: 3.0, repathMax: 5.0,
        detourChance: 0.10, detourBudget: 1.18,
        sprintNormal: 0.06, sprintCrisis: 0.32, riskTolerance: 0.72,
        launchAngle: -2.2, crisisReactionMin: 0.10, crisisReactionMax: 0.45
      },
      {
        id: 'gambler', name: 'Gambler', speed: 0.68,
        routeNoise: 0.30, repathMin: 2.2, repathMax: 3.8,
        detourChance: 0.24, detourBudget: 1.35,
        sprintNormal: 0.12, sprintCrisis: 0.52, riskTolerance: 0.91,
        launchAngle: 0.15, crisisReactionMin: 0.00, crisisReactionMax: 0.20
      },
      {
        id: 'wanderer', name: 'Wanderer', speed: 0.58,
        routeNoise: 0.62, repathMin: 3.8, repathMax: 6.2,
        detourChance: 0.48, detourBudget: 1.65,
        sprintNormal: 0.05, sprintCrisis: 0.38, riskTolerance: 0.66,
        launchAngle: 2.0, crisisReactionMin: 0.35, crisisReactionMax: 0.95
      }
    ]
  }
};
