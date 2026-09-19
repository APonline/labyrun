// LABYRUN CHARACTER ROSTER
// Portraits are selection/profile art. `sprite` stays blank so gameplay uses
// the editable puppet rig until proper gameplay sprites are created.
window.LABYRUN_CHARACTERS = [
  {
    id:'taco-tony', name:'Taco Tony', shortName:'Tony', emoji:'🌮', color:'#ffcb58',
    bio:'Ordered “extra everything” and immediately regretted his confidence.',
    trait:'Map Rush', traitDetail:'Gets a short burst of speed after risking a map peek.',
    portrait:'assets/characters/portraits/taco-tony.png', sprite:'', belch:'tony',
    puppet:{skin:'#efb383',pants:'#d54735',hair:'#6a3822'},
    stats:{speed:1.00,bowelRate:1.00,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00}, special:'mapRush'
  },
  {
    id:'curry-barry', name:'Curry Barry', shortName:'Barry', emoji:'🍛', color:'#f47a37',
    bio:'Treated the curry heat scale as a personal challenge. The curry won.',
    trait:'Iron-ish Gut', traitDetail:'Bowel pressure climbs a little slower than everyone else.',
    portrait:'assets/characters/portraits/curry-barry.png', sprite:'', belch:'barry',
    puppet:{skin:'#efad82',pants:'#31436d',hair:'#4e2e1f'},
    stats:{speed:.99,bowelRate:.91,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00}, special:''
  },
  {
    id:'gassy-cassie', name:'Gassy Cassie', shortName:'Cassie', emoji:'💨', color:'#d774bf',
    bio:'Travels with emergency wipes, spare tissues and absolutely no shame.',
    trait:'Second Wind', traitDetail:'Carries more sprint stamina when things get desperate.',
    portrait:'assets/characters/portraits/gassy-cassie.png', sprite:'', belch:'cassie',
    puppet:{skin:'#efac86',pants:'#bb4d8f',hair:'#b45328'},
    stats:{speed:1.01,bowelRate:1.00,sprint:1.02,stamina:1.12,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00}, special:''
  },
  {
    id:'digestive-dale', name:'Digestive Dale', shortName:'Dale', emoji:'🥴', color:'#7ddd7e',
    bio:'Owns four probiotics, a gut-health hat and misplaced confidence in both.',
    trait:'Fear Speed', traitDetail:'Keeps more of his movement speed when the meter gets ugly.',
    portrait:'assets/characters/portraits/digestive-dale.png', sprite:'', belch:'dale',
    puppet:{skin:'#efb38c',pants:'#3472ad',hair:'#704123'},
    stats:{speed:.98,bowelRate:1.00,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.18}, special:''
  },
  {
    id:'brenda-beans', name:'Brenda Beans', shortName:'Brenda', emoji:'🫘', color:'#de7fc6',
    bio:'A legend of poor timing, worse lunch choices and weaponized baked beans.',
    trait:'Overprepared', traitDetail:'Starts with one extra full-map check.',
    portrait:'assets/characters/portraits/brenda-beans.png', sprite:'', belch:'brenda',
    puppet:{skin:'#efb18d',pants:'#dd72ad',hair:'#a64f2d'},
    stats:{speed:1.00,bowelRate:1.03,sprint:1.00,stamina:1.00,mapChecks:1,mapPenalty:1.00,highBowelSpeed:1.00}, special:''
  },
  {
    id:'nervous-niko', name:'Nervous Niko', shortName:'Niko', emoji:'😬', color:'#69a8e5',
    bio:'Asked where the bathroom was before entering the maze. Correct instinct.',
    trait:'Panic Legs', traitDetail:'Stronger sprint, but his nerves raise bowel pressure faster.',
    portrait:'assets/characters/portraits/nervous-niko.png', sprite:'', belch:'niko',
    puppet:{skin:'#efb28e',pants:'#4380bf',hair:'#a25b2e'},
    stats:{speed:1.00,bowelRate:1.05,sprint:1.10,stamina:.96,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00}, special:''
  },
  {
    id:'colon-colin', name:'Colon Colin', shortName:'Colin', emoji:'🧻', color:'#8ab05e',
    bio:'Brought a toilet map, a plunger and exactly one square of toilet paper.',
    trait:'Map Scholar', traitDetail:'Map peeks cause only half the usual bowel penalty.',
    portrait:'assets/characters/portraits/colon-colin.png', sprite:'', belch:'colin',
    puppet:{skin:'#efb286',pants:'#727b4b',hair:'#a34f2c'},
    stats:{speed:.98,bowelRate:.98,sprint:1.00,stamina:1.00,mapChecks:0,mapPenalty:.50,highBowelSpeed:1.00}, special:''
  },
  {
    id:'spicy-priya', name:'Spicy Priya', shortName:'Priya', emoji:'🌶️', color:'#ef403f',
    bio:'Fastest eater in the food court. Also the person most visibly on fire.',
    trait:'Hot Feet', traitDetail:'Fastest base movement, but bowel pressure climbs faster.',
    portrait:'assets/characters/portraits/spicy-priya.png', sprite:'', belch:'priya',
    puppet:{skin:'#d99b73',pants:'#df3d42',hair:'#281d25'},
    stats:{speed:1.10,bowelRate:1.16,sprint:1.02,stamina:.96,mapChecks:0,mapPenalty:1.00,highBowelSpeed:1.00}, special:''
  }
];
