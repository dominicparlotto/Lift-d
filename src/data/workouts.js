export const WORKOUTS = {
  "Chest":["Barbell Bench Press","Dumbbell Bench Press","Incline Barbell Press","Incline Dumbbell Press","Decline Bench Press","Close-Grip Bench Press","Chest Fly Dumbbell","Chest Fly Cable","Cable Crossover","Pec Deck Machine","Push-Up","Wide Push-Up","Diamond Push-Up","Archer Push-Up","Chest Dip","Landmine Press","Svend Press"],
  "Back":["Conventional Deadlift","Sumo Deadlift","Romanian Deadlift","Barbell Row","Dumbbell Row","T-Bar Row","Seated Cable Row","Wide-Grip Pull-Up","Chin-Up","Neutral-Grip Pull-Up","Lat Pulldown Wide","Lat Pulldown Neutral","Single-Arm Pulldown","Face Pull","Straight-Arm Pulldown","Inverted Row","Meadows Row","Rack Pull","Good Morning","Back Extension","Pendlay Row"],
  "Legs":["Barbell Back Squat","Front Squat","Goblet Squat","Hack Squat","Leg Press","Bulgarian Split Squat","Walking Lunge","Reverse Lunge","Lateral Lunge","Step-Up","Leg Extension","Leg Curl Lying","Leg Curl Seated","Nordic Curl","Glute Bridge","Barbell Hip Thrust","Calf Raise Standing","Calf Raise Seated","Box Jump","Sumo Squat","Sissy Squat","Wall Sit","Pistol Squat"],
  "Shoulders":["Barbell Overhead Press","Dumbbell Shoulder Press","Arnold Press","Seated OHP Machine","Lateral Raise Dumbbell","Lateral Raise Cable","Front Raise Dumbbell","Face Pull","Rear Delt Fly","Rear Delt Machine","Upright Row","Barbell Shrug","Dumbbell Shrug","Push Press","Bradford Press","Y-Raise","W-Raise"],
  "Arms":["Barbell Curl","Dumbbell Curl","Hammer Curl","Incline Dumbbell Curl","Preacher Curl","Concentration Curl","Cable Curl","EZ-Bar Curl","Reverse Curl","Zottman Curl","Spider Curl","Tricep Dip","Close-Grip Bench","Skull Crusher EZ Bar","Skull Crusher Dumbbell","Overhead Tricep Extension","Rope Pushdown","Straight-Bar Pushdown","Kickback","Diamond Push-Up","Tate Press","JM Press"],
  "Core":["Plank","Side Plank","Hollow Body Hold","Dead Bug","Crunch","Bicycle Crunch","V-Up","Sit-Up","Decline Sit-Up","Hanging Leg Raise","Lying Leg Raise","Dragon Flag","Ab Rollout","Russian Twist","Pallof Press","Cable Crunch","Woodchop","Toes to Bar","Windshield Wiper","Copenhagen Plank"],
  "Glutes":["Barbell Hip Thrust","Single-Leg Hip Thrust","Glute Bridge","Cable Kickback","Donkey Kick","Fire Hydrant","Abduction Machine","Clamshell","Monster Walk","Banded Squat Walk","Reverse Hyper","Frog Pump","Cable Pull-Through"],
  "Cardio":["Running Treadmill","Running Outdoor","Cycling Stationary","Cycling Outdoor","Rowing Machine","Elliptical","Jump Rope","Stair Climber","Battle Ropes","Box Jump","Burpee","Mountain Climber","Sprint Intervals","Swimming","HIIT Circuit","Assault Bike","Sled Push","Sled Pull","Farmer Carry","Ski Erg"],
  "Olympic":["Power Clean","Hang Power Clean","Power Snatch","Hang Power Snatch","Clean and Jerk","Full Snatch","Push Jerk","Split Jerk","Overhead Squat","Thruster","Push Press"],
  "Stretch":["Hip Flexor Stretch","Pigeon Pose","Hamstring Stretch","Quad Stretch","Calf Stretch","Chest Opener","Thoracic Rotation","Childs Pose","Downward Dog","Cat-Cow","Worlds Greatest Stretch","90/90 Hip Stretch","Couch Stretch","Foam Roll Quads","Foam Roll IT Band"],
};

// A day's workout = list of exercises, each with the sets completed that day.
// Keyed by weekday index (0=Mon … 6=Sun). Mon–Thu seeded as history; Fri = today (starts empty).
export const SAMPLE_WEEK_LOG = {
  0:[
    {exercise:"Barbell Bench Press",group:"Chest",sets:[{weight:135,reps:8},{weight:155,reps:6},{weight:175,reps:4}]},
    {exercise:"Incline Dumbbell Press",group:"Chest",sets:[{weight:50,reps:10},{weight:55,reps:8}]},
    {exercise:"Cable Crossover",group:"Chest",sets:[{weight:30,reps:12},{weight:35,reps:10}]},
  ],
  1:[
    {exercise:"Conventional Deadlift",group:"Back",sets:[{weight:225,reps:5},{weight:275,reps:3},{weight:315,reps:1}]},
    {exercise:"Barbell Row",group:"Back",sets:[{weight:135,reps:8},{weight:155,reps:6}]},
    {exercise:"Lat Pulldown Wide",group:"Back",sets:[{weight:120,reps:10},{weight:135,reps:8}]},
  ],
  2:[
    {exercise:"Barbell Back Squat",group:"Legs",sets:[{weight:185,reps:5},{weight:205,reps:5},{weight:225,reps:5}]},
    {exercise:"Leg Press",group:"Legs",sets:[{weight:360,reps:10},{weight:405,reps:8}]},
    {exercise:"Leg Curl Lying",group:"Legs",sets:[{weight:90,reps:12},{weight:100,reps:10}]},
  ],
  3:[
    {exercise:"Barbell Overhead Press",group:"Shoulders",sets:[{weight:95,reps:6},{weight:105,reps:5},{weight:115,reps:3}]},
    {exercise:"Lateral Raise Dumbbell",group:"Shoulders",sets:[{weight:20,reps:15},{weight:25,reps:12}]},
    {exercise:"Barbell Curl",group:"Arms",sets:[{weight:65,reps:10},{weight:75,reps:8}]},
  ],
};

export const WEEK_DAYS = [
  {short:"M",label:"Monday",date:20},
  {short:"T",label:"Tuesday",date:21},
  {short:"W",label:"Wednesday",date:22},
  {short:"T",label:"Thursday",date:23},
  {short:"F",label:"Friday",date:24},
  {short:"S",label:"Saturday",date:25},
  {short:"S",label:"Sunday",date:26},
];
export const TODAY_IDX = 4; // Friday

export const PERSONAL_RECORDS = {
  "Barbell Back Squat":{weight:225,reps:5,date:"2 weeks ago"},
  "Barbell Bench Press":{weight:185,reps:5,date:"1 week ago"},
  "Conventional Deadlift":{weight:315,reps:1,date:"3 days ago"},
  "Barbell Overhead Press":{weight:115,reps:6,date:"1 month ago"},
  "Wide-Grip Pull-Up":{weight:45,reps:8,date:"2 months ago"},
  "Barbell Row":{weight:155,reps:8,date:"3 weeks ago"},
  "Romanian Deadlift":{weight:205,reps:6,date:"5 days ago"},
  "Front Squat":{weight:165,reps:5,date:"2 weeks ago"},
  "Incline Barbell Press":{weight:135,reps:6,date:"1 week ago"},
  "Barbell Hip Thrust":{weight:275,reps:8,date:"4 days ago"},
  "Leg Press":{weight:405,reps:10,date:"1 week ago"},
  "Barbell Curl":{weight:75,reps:8,date:"2 weeks ago"},
};
