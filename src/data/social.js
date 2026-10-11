export const SKILL_TAGS = ["Beginner","Intermediate","Advanced","Powerlifter","Bodybuilder","Olympic Lifter","CrossFitter","Endurance","Calisthenics","Yoga / Mobility"];

// Short-form clips shown in Feed → Clips. Starts empty (no fake reels). Each clip looks like:
//   {id, user, avatar, content, likes, color, emoji, muscle, skill, equipment, isCoach,
//    videoUrl, cues:[...on-video coaching text], music:{title, source}}
// The coaching cues + licensed-music credit are the "creative effort" layer that keeps stock
// clips compliant with the Mixkit/Pixabay/Pexels no-standalone rule.
export const CLIP_POSTS = [];

export const INITIAL_GYMS = [
  {id:1,name:"Iron Valley Gym",location:"Athens, GA",members:234,channels:["general","powerlifting","cardio","nutrition","events"],invite:"ironvalley-abc123",leaderboard:[{user:"powerking_j",score:48250},{user:"alex_lifts",score:41200},{user:"deadliftdave",score:38900},{user:"squatrookie",score:22100}],liveNow:[{user:"alex_lifts",muscle:"Back"},{user:"squatrookie",muscle:"Legs"},{user:"deadliftdave",muscle:"Back"},{user:"powerking_j",muscle:"Chest"},{user:"benchbeast",muscle:"Chest"},{user:"cardioqueen",muscle:"Cardio"},{user:"liftlife_22",muscle:"Shoulders"}]},
  {id:2,name:"Gold's Gym Athens",location:"Athens, GA",members:891,channels:["general","classes","personal-training","gains"],invite:"golds-ath-xyz789",leaderboard:[{user:"goldsguru",score:91300},{user:"sarahfitness",score:78400},{user:"musclemike",score:65200}],liveNow:[{user:"sarahfitness",muscle:"Cardio"},{user:"musclemike",muscle:"Chest"}]},
  {id:3,name:"CrossFit Athens",location:"Athens, GA",members:156,channels:["general","wods","competitions","nutrition"],invite:"cfathens-def456",leaderboard:[{user:"wod_warrior",score:55100},{user:"kettlebellqueen",score:49800},{user:"cfnewbie",score:12300}],liveNow:[{user:"kettlebellqueen",muscle:"Full Body"},{user:"cfnewbie",muscle:"Cardio"}]},
];

