// Each badge's `test` gets the user's lifetime stats (see ProfileTab) and returns whether it's earned.
export const BADGES = [
  {id:"b1",icon:"🏆",name:"First PR",desc:"Logged your first personal record",test:s=>s.prCount>=1},
  {id:"b2",icon:"💯",name:"100kg Squat",desc:"Squatted 100kg (220 lbs) or more",test:s=>s.bestSquat>=220},
  {id:"b3",icon:"🔥",name:"7-Day Streak",desc:"Worked out every day this week",test:s=>s.weekDays>=7},
  {id:"b4",icon:"📅",name:"1 Year Strong",desc:"Training on Lift'd for a full year",test:s=>s.accountAgeDays>=365&&s.daysTrained>0},
  {id:"b5",icon:"⚡",name:"Iron Mile",desc:"Logged 1,000 total sets",test:s=>s.totalSets>=1000},
  {id:"b6",icon:"🦁",name:"Beast Mode",desc:"Total volume over 100,000 lbs",test:s=>s.totalVolume>=100000},
  {id:"b7",icon:"🎯",name:"5 PRs",desc:"Set records on 5 different lifts",test:s=>s.prCount>=5},
  {id:"b8",icon:"🌙",name:"Night Owl",desc:"Logged a workout after 10pm",test:s=>s.nightOwl},
];
