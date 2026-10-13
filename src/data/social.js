export const SKILL_TAGS = ["Beginner","Intermediate","Advanced","Powerlifter","Bodybuilder","Olympic Lifter","CrossFitter","Endurance","Calisthenics","Yoga / Mobility"];

// Short-form clips shown in Feed → Clips. Starts empty (no fake reels). Each clip looks like:
//   {id, user, avatar, content, likes, color, emoji, muscle, skill, equipment, isCoach,
//    videoUrl, cues:[...on-video coaching text], music:{title, source}}
// The coaching cues + licensed-music credit are the "creative effort" layer that keeps stock
// clips compliant with the Mixkit/Pixabay/Pexels no-standalone rule.
export const CLIP_POSTS = [];
