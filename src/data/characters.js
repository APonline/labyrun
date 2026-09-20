// LABYRUN CHARACTER ROSTER
// Everything character-specific lives here: portrait, favourite-food 1UP,
// passive trait, stats, and the optional active special.
//
// `sprite` stays blank so gameplay uses the editable puppet rig until proper
// gameplay sprites are created. Chili Willy currently reuses Curry Barry's
// older portrait because the supplied asset pack did not include chili-willy.png.
window.LABYRUN_CHARACTERS = [
  {
    id:'taco-tony', name:'Taco Tony', shortName:'Tony', emoji:'🌮', color:'#ffcb58',
    bio:'Ordered “extra everything” and immediately regretted his confidence.',
    trait:'Map Rush', traitDetail:'Gets a short burst of speed after risking a map peek.',
    portrait:'assets/characters/portraits/taco-tony.png', sprite:'', belch:'tony',
    spriteSheet:{
      asset:'assets/characters/sprites/taco-tony.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Taco',asset:'assets/items/foods/taco.png'},
    stallAsset:'assets/world/food-stalls/taco-hut.webp',
    puppet:{skin:'#efb383',pants:'#d54735',hair:'#6a3822'},
    stats:{speed:1.00,bowelRate:1.00,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00},
    passive:'mapRush',
    special:{id:'blink',name:'TACO TELEPORT',description:'Blink forward through danger. Two uses, then a 20-second recharge.',charges:2,cooldownMs:20000}
  },
  {
    id:'chili-willy', name:'Chili Willy', shortName:'Willy', emoji:'🌶️', color:'#f47a37',
    bio:'Ordered the chili marked “lawsuit hot” and signed the waiver without reading it.',
    trait:'Iron-ish Gut', traitDetail:'Bowel pressure climbs a little slower than everyone else.',
    portrait:'assets/characters/portraits/curry-barry.png', sprite:'', belch:'barry',
    spriteSheet:{
      asset:'assets/characters/sprites/chili-willy.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Chili',asset:'assets/items/foods/chili.png'},
    stallAsset:'assets/world/food-stalls/chili-hut.webp',
    puppet:{skin:'#efad82',pants:'#31436d',hair:'#4e2e1f'},
    stats:{speed:.99,bowelRate:.91,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00},
    passive:'',
    special:{id:'wallBreak',name:'CHILI CHARGE',description:'Smash the wall directly ahead. Two uses, then a 20-second recharge.',charges:2,cooldownMs:20000}
  },
  {
    id:'milkshake-mallory', name:'Milkshake Mallory', shortName:'Mallory', emoji:'🥤', color:'#d774bf',
    bio:'Lactose intolerance has never once influenced her milkshake ordering decisions.',
    trait:'Second Wind', traitDetail:'Carries more sprint stamina when things get desperate.',
    portrait:'assets/characters/portraits/milkshake-mallory.png', sprite:'', belch:'cassie',
    spriteSheet:{
      asset:'assets/characters/sprites/milkshake-mallory.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Milkshake',asset:'assets/items/foods/milkshake.png'},
    stallAsset:'assets/world/food-stalls/milkshake-hut.webp',
    puppet:{skin:'#efac86',pants:'#bb4d8f',hair:'#b45328'},
    stats:{speed:1.01,bowelRate:1.00,sprint:1.02,stamina:1.12,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00},
    passive:'',
    special:{id:'milkTrap',name:'SHAKE SPILL',description:'Drop a sticky milkshake trap that badly slows the next racer who hits it.',charges:2,cooldownMs:20000}
  },
  {
    id:'yogurt-yoel', name:'Yogurt Yoel', shortName:'Yoel', emoji:'🥣', color:'#7ddd7e',
    bio:'Calls yogurt “gut armor” and has built his entire athletic career around that theory.',
    trait:'Fear Speed', traitDetail:'Keeps more of his movement speed when the meter gets ugly.',
    portrait:'assets/characters/portraits/yogurt-yoel.png', sprite:'', belch:'dale',
    spriteSheet:{
      asset:'assets/characters/sprites/yogurt-yoel.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Yogurt',asset:'assets/items/foods/yogurt.png'},
    stallAsset:'assets/world/food-stalls/yogurt-hut.webp',
    puppet:{skin:'#efb38c',pants:'#3472ad',hair:'#704123'},
    stats:{speed:.98,bowelRate:1.00,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.18},
    passive:'',
    special:{id:'cleanBoost',name:'PROBIOTIC POWER',description:'A short speed burst that drains no stamina and adds no sprint poop risk.',charges:1,cooldownMs:16000,durationMs:4200}
  },
  {
    id:'brenda-beans', name:'Brenda Beans', shortName:'Brenda', emoji:'🫘', color:'#de7fc6',
    bio:'A legend of poor timing, worse lunch choices and weaponized baked beans.',
    trait:'Overprepared', traitDetail:'Starts with one extra full-map check.',
    portrait:'assets/characters/portraits/brenda-beans.png', sprite:'', belch:'brenda',
    spriteSheet:{
      asset:'assets/characters/sprites/brenda-beans.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Beans',asset:'assets/items/foods/beans.png'},
    stallAsset:'assets/world/food-stalls/beans-hut.webp',
    puppet:{skin:'#efb18d',pants:'#dd72ad',hair:'#a64f2d'},
    stats:{speed:1.00,bowelRate:1.03,sprint:1.00,stamina:1.00,mapChecks:1,mapPenalty:1.00,highBowelSpeed:1.00},
    passive:'',
    special:{id:'beanTrap',name:'BEAN BOMB',description:'Drop a trap that spikes gut pressure and briefly slows whoever runs into it.',charges:2,cooldownMs:20000}
  },
  {
    id:'prunejuice-paul', name:'Prunejuice Paul', shortName:'Paul', emoji:'🧃', color:'#69a8e5',
    bio:'Drinks prune juice recreationally. Every decision after that is between him and fate.',
    trait:'Panic Legs', traitDetail:'Stronger sprint, but his nerves raise bowel pressure faster.',
    portrait:'assets/characters/portraits/prunejuice-paul.png', sprite:'', belch:'niko',
    spriteSheet:{
      asset:'assets/characters/sprites/prunejuice-paul.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Prune Juice',asset:'assets/items/foods/prunejuice.png'},
    stallAsset:'assets/world/food-stalls/prunejuice-hut.webp',
    puppet:{skin:'#efb28e',pants:'#4380bf',hair:'#a25b2e'},
    stats:{speed:1.00,bowelRate:1.05,sprint:1.10,stamina:.96,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00},
    passive:'',
    special:{id:'prunePurge',name:'PRUNE PURGE',description:'Vent the pressure: drop your own gut panic and make nearby rivals suddenly regret standing close.',charges:1,cooldownMs:18000,relief:18,rivalPressure:8,radius:6}
  },
  {
    id:'corndog-chris', name:'Corndog Chris', shortName:'Chris', emoji:'🌭', color:'#8ab05e',
    bio:'Has a corndog in one hand and emergency toilet paper in the other. Prepared-ish.',
    trait:'Map Scholar', traitDetail:'Map peeks cause only half the usual bowel penalty.',
    portrait:'assets/characters/portraits/corndog-chris.png', sprite:'', belch:'colin',
    spriteSheet:{
      asset:'assets/characters/sprites/corndog-chris.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Corn Dog',asset:'assets/items/foods/corndog.png'},
    stallAsset:'assets/world/food-stalls/corndog-hut.webp',
    puppet:{skin:'#efb286',pants:'#727b4b',hair:'#a34f2c'},
    stats:{speed:.98,bowelRate:.98,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:.50,highBowelSpeed:1.00},
    passive:'',
    special:{id:'tpShield',name:'TP FORTRESS',description:'Wrap yourself in emergency two-ply: 5 seconds of bowel-gain and trap immunity.',charges:1,cooldownMs:18000,durationMs:5000}
  },
  {
    id:'spicy-yaspreet', name:'Spicy Yaspreet', shortName:'Yaspreet', emoji:'🔥', color:'#ef403f',
    bio:'Treats biryani spice levels like a competitive sport and her digestive tract like a rumor.',
    trait:'Hot Feet', traitDetail:'Fastest base movement, but bowel pressure climbs faster.',
    portrait:'assets/characters/portraits/spicy-yaspreet.png', sprite:'', belch:'priya',
    spriteSheet:{
      asset:'assets/characters/sprites/spicy-yaspreet.png', cellSize:256, columns:4, renderSize:78, footAnchorY:244,
      animations:{
        idle:{frames:[0],fps:2},
        walk:{frames:[2,3,6,7],fps:8},
        bowel:{frames:[1,2,3,7],fps:6},
        special:{frames:[4,5,8,9],fps:11},
        safe:{frames:[10],fps:1},
        pooped:{frames:[11],fps:1},
        stunned:{frames:[12,13],fps:4},
        oneUp:{frames:[14,15],fps:5}
      }
    },
    favouriteFood:{name:'Biryani',asset:'assets/items/foods/piryani.png'},
    stallAsset:'assets/world/food-stalls/curry-hut.webp',
    puppet:{skin:'#d99b73',pants:'#df3d42',hair:'#281d25'},
    stats:{speed:1.10,bowelRate:1.16,sprint:1.02,stamina:.96,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00},
    passive:'',
    special:{id:'fireTrail',name:'BIRYANI BURN',description:'Leave a five-second trail of digestive fire. Rivals crossing it get a gut spike and brief slowdown.',charges:1,cooldownMs:18000,durationMs:5000}
  }
];
