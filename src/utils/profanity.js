// Client-side copy of the database's profanity filter (private.has_profanity in Supabase), so people get a
// friendly message before sending. The database check is the real one — keep these lists in sync with it.
const BAD_WORDS=[
  "nigger","niggers","nigga","niggas","faggot","faggots","fag","fags","retard","retards","retarded","chink","chinks",
  "spic","spics","kike","kikes","wetback","wetbacks","tranny","trannies","dyke","dykes","coon","coons","gook","gooks",
  "beaner","beaners","raghead","towelhead",
  "porn","porno","cock","cocks","dickhead","pussy","pussies","cunt","cunts","blowjob","cumshot","nudes",
  "rape","raped","rapist","raping","molest","molester","pedo","pedophile","whore","whores","slut","sluts",
  "fuck","fucks","fucked","fucking","fuckin","fucker","fuckers","motherfucker","motherfucking","fck","fk","stfu","gtfo",
  "shit","shits","shitty","bullshit","bitch","bitches","bastard","bastards","asshole","assholes","kys",
];
// Usernames/names/gym names have no spaces to separate words, so these are also checked as substrings there.
const BAD_FRAGMENTS=["nigger","nigga","faggot","fuck","shit","bitch","porn","whore","asshole","pussy","dickhead",
  "blowjob","cumshot","pedophile","motherf","onlyfans"]; // not "rapist": it's inside "therapist"

const LEET={"0":"o","1":"i","3":"e","4":"a","5":"s","7":"t","@":"a","$":"s","!":"i"};
const norm=t=>(t||"").toLowerCase().replace(/[013457@$!]/g,c=>LEET[c]);
const squeeze=t=>t.replace(/(.)\1+/g,"$1"); // "fuuuck" → "fuck"
const wordsRe=list=>new RegExp(`(?<![a-z0-9_])(${list.join("|")})(?![a-z0-9_])`);
const WORDS=wordsRe(BAD_WORDS), SQUEEZED=wordsRe([...new Set(BAD_WORDS.map(squeeze))]);
const KYS=/(?<![a-z0-9_])kill\s+(yo)?u?r\s*self(?![a-z0-9_])|(?<![a-z0-9_])kill\s+urself(?![a-z0-9_])/;

export function hasProfanity(text,isName=false){
  const n=norm(text);
  if(!n)return false;
  const s=squeeze(n);
  if(WORDS.test(n)||SQUEEZED.test(s)||KYS.test(n))return true;
  if(isName){
    const letters=n.replace(/[^a-z]/g,"");
    return BAD_FRAGMENTS.some(f=>letters.includes(f)||squeeze(letters).includes(squeeze(f)));
  }
  return false;
}

export const PROFANITY_MESSAGE="Please keep it respectful — that wording isn't allowed on Lift'd.";
// True for the error the database raises when it rejects objectionable wording.
export const isProfanityError=e=>e?.code==="23514"&&/objectionable_language/.test(e?.message||"");
