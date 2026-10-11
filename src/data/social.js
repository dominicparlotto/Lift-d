export const PR_ANNOUNCEMENTS = [
  {id:"pr1",exercise:"Barbell Back Squat",weight:225,unit:"lbs",date:"Today",prev:215,emoji:"🏋️"},
  {id:"pr2",exercise:"Barbell Bench Press",weight:185,unit:"lbs",date:"3 days ago",prev:175,emoji:"💪"},
  {id:"pr3",exercise:"Conventional Deadlift",weight:315,unit:"lbs",date:"1 week ago",prev:305,emoji:"🔥"},
];

export const SKILL_TAGS = ["Beginner","Intermediate","Advanced","Powerlifter","Bodybuilder","Olympic Lifter","CrossFitter","Endurance","Calisthenics","Yoga / Mobility"];

export const MOCK_POSTS = [
  {id:1,user:"alex_lifts",avatar:"AL",content:"5x5 PRs today 💪 hit 315 on deadlift!",likes:142,comments:23,time:"2m ago",color:"#4F8EF7",hasVideo:true,muscle:"Back",skill:"Advanced",equipment:"Barbell",isCoach:false},
  {id:2,user:"sarahfitness",avatar:"SF",content:"Morning HIIT done ✅ 30 mins, 400 cals. Who else does morning workouts?",likes:89,comments:15,time:"8m ago",color:"#6C63FF",hasVideo:false,muscle:"Cardio",skill:"Intermediate",equipment:"None",isCoach:false},
  {id:3,user:"musclemike",avatar:"MM",content:"Meal prep Sunday 🥗 6 meals done. Chicken, rice, broccoli x6 let's go!",likes:211,comments:41,time:"15m ago",color:"#3ECFCF",hasVideo:true,muscle:"All",skill:"Beginner",equipment:"None",isCoach:false},
  {id:4,user:"fitnesscoach_j",avatar:"JC",content:"Progressive overload > more volume. Add weight before adding sets. 📈",likes:567,comments:88,time:"1h ago",color:"#5B8DEF",hasVideo:false,muscle:"All",skill:"All",equipment:"All",isCoach:true},
  {id:5,user:"kettlebellqueen",avatar:"KQ",content:"Kettlebell flow session — 45 mins of pure bliss. 10/10 recommend 🔥",likes:304,comments:52,time:"2h ago",color:"#9B8EFF",hasVideo:true,muscle:"Cardio",skill:"Intermediate",equipment:"Kettlebell",isCoach:true},
];

// Clip feed. `videoUrl` + `music.file` below are PLACEHOLDERS (reliably-hosted free
// sample videos) so the feed mechanics work in the prototype. Swap each for your own
// licensed clip + royalty-free track. `cues` (on-video coaching text) and the music
// credit are the "creative effort" layer that keeps stock clips license-compliant —
// see the no-standalone note in the Mixkit/Pixabay/Pexels licenses.
const SAMPLE = id => `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${id}.mp4`;

export const CLIP_POSTS = [
  {id:"c1",user:"alex_lifts",avatar:"AL",content:"315lb deadlift PR! 4 years of work 🎯",likes:1420,color:"#4F8EF7",emoji:"🏋️",muscle:"Back",skill:"Advanced",equipment:"Barbell",isCoach:false,videoUrl:SAMPLE("ForBiggerBlazes"),cues:["Brace your core before the pull","Keep the bar close to your shins","Drive through your heels","Lock out with glutes, not lower back"],music:{title:"Heavy Iron",source:"Mixkit Free Music"}},
  {id:"c2",user:"kettlebellqueen",avatar:"KQ",content:"Full kettlebell flow — follow along! 🔔",likes:3040,color:"#9B8EFF",emoji:"🔔",muscle:"Cardio",skill:"Intermediate",equipment:"Kettlebell",isCoach:true,videoUrl:SAMPLE("ForBiggerJoyrides"),cues:["Hinge at the hips, not the knees","Snap the hips to power the swing","Keep your shoulders packed down","Exhale hard at the top"],music:{title:"Flow State",source:"Pixabay Music"}},
  {id:"c3",user:"musclemike",avatar:"MM",content:"Watch me meal prep 6 days of food in 45 min 🥗",likes:2110,color:"#3ECFCF",emoji:"🥗",muscle:"All",skill:"Beginner",equipment:"None",isCoach:false,videoUrl:SAMPLE("ForBiggerMeltdowns"),cues:["Cook proteins in bulk first","Portion by hand: palm = protein","Cool food before you seal it","Label each container with the date"],music:{title:"Kitchen Groove",source:"Mixkit Free Music"}},
  {id:"c4",user:"fitnesscoach_j",avatar:"JC",content:"5 form mistakes killing your bench press gains",likes:5670,color:"#5B8DEF",emoji:"💡",muscle:"Chest",skill:"All",equipment:"Barbell",isCoach:true,videoUrl:SAMPLE("ForBiggerEscapes"),cues:["Retract your shoulder blades","Feet flat — drive the floor away","Lower the bar to mid-chest","Elbows ~45°, don't flare them"],music:{title:"Press Day",source:"Pixabay Music"}},
  {id:"c5",user:"sarahfitness",avatar:"SF",content:"30 min HIIT follow-along — no equipment needed",likes:8900,color:"#6C63FF",emoji:"⚡",muscle:"Cardio",skill:"Beginner",equipment:"None",isCoach:false,videoUrl:SAMPLE("ForBiggerFun"),cues:["Full range of motion every rep","Land soft through the knees","Push the pace on work intervals","Recover fully between rounds"],music:{title:"Sprint Pulse",source:"Mixkit Free Music"}},
];

export const INITIAL_GYMS = [
  {id:1,name:"Iron Valley Gym",location:"Athens, GA",members:234,channels:["general","powerlifting","cardio","nutrition","events"],invite:"ironvalley-abc123",leaderboard:[{user:"powerking_j",score:48250},{user:"alex_lifts",score:41200},{user:"deadliftdave",score:38900},{user:"squatrookie",score:22100}],liveNow:[{user:"alex_lifts",muscle:"Back"},{user:"squatrookie",muscle:"Legs"},{user:"deadliftdave",muscle:"Back"},{user:"powerking_j",muscle:"Chest"},{user:"benchbeast",muscle:"Chest"},{user:"cardioqueen",muscle:"Cardio"},{user:"liftlife_22",muscle:"Shoulders"}]},
  {id:2,name:"Gold's Gym Athens",location:"Athens, GA",members:891,channels:["general","classes","personal-training","gains"],invite:"golds-ath-xyz789",leaderboard:[{user:"goldsguru",score:91300},{user:"sarahfitness",score:78400},{user:"musclemike",score:65200}],liveNow:[{user:"sarahfitness",muscle:"Cardio"},{user:"musclemike",muscle:"Chest"}]},
  {id:3,name:"CrossFit Athens",location:"Athens, GA",members:156,channels:["general","wods","competitions","nutrition"],invite:"cfathens-def456",leaderboard:[{user:"wod_warrior",score:55100},{user:"kettlebellqueen",score:49800},{user:"cfnewbie",score:12300}],liveNow:[{user:"kettlebellqueen",muscle:"Full Body"},{user:"cfnewbie",muscle:"Cardio"}]},
];

export const MY_POSTS=[{id:101,content:"New PR on squat — 225lbs for 5 reps 🎉",likes:34,comments:7,time:"1d ago",emoji:"🏋️"},{id:102,content:"Meal prepped for the whole week 📈",likes:21,comments:3,time:"3d ago",emoji:"🥗"},{id:103,content:"Rest day but got a 5k walk in 🚶",likes:18,comments:5,time:"5d ago",emoji:"🚶"},{id:104,content:"First time trying cable flys — my chest is DONE 😂",likes:45,comments:12,time:"1w ago",emoji:"💪"}];
