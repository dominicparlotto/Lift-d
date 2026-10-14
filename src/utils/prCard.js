// Draws a story-sized (1080×1920) PR card image to share on Instagram/TikTok/group chats.
const W=1080, H=1920;

function wrapLines(ctx,text,maxWidth){
  const words=text.split(" "); const lines=[]; let line="";
  for(const w of words){const test=line?`${line} ${w}`:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w;}else line=test;}
  if(line)lines.push(line);
  return lines;
}
function loadImage(src){return new Promise(res=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>res(null);img.src=src;});}
const prettyDate=key=>{const [y,m,d]=key.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});};

// pr: {exercise, weight, reps, dateKey}; returns a PNG Blob.
export async function makePRCard(pr,username){
  const font='"DM Sans", system-ui, -apple-system, sans-serif';
  try{await Promise.all([document.fonts.load(`800 100px "DM Sans"`),document.fonts.load(`600 40px "DM Sans"`)]);}catch{/* falls back to system font */}
  const c=document.createElement("canvas"); c.width=W; c.height=H;
  const g=c.getContext("2d");

  // Background: deep navy with blue/purple glows (the app's dark look).
  const bg=g.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#0A0F22"); bg.addColorStop(1,"#141a3d"); g.fillStyle=bg; g.fillRect(0,0,W,H);
  const glow=(x,y,r,color)=>{const rg=g.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,color);rg.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=rg;g.fillRect(0,0,W,H);};
  glow(180,420,620,"rgba(79,142,247,0.30)"); glow(950,1500,700,"rgba(108,99,255,0.28)");

  // Brand
  const logo=await loadImage(new URL("../favicon.svg",document.baseURI).href);
  if(logo)g.drawImage(logo,90,130,110,110);
  g.fillStyle="#EEF2FF"; g.font=`800 72px ${font}`; g.textBaseline="middle"; g.fillText("Lift'd",logo?226:90,186);

  // Trophy + label
  g.textAlign="center"; g.textBaseline="alphabetic";
  g.font=`160px ${font}`; g.fillText("🏆",W/2,720);
  g.fillStyle="#3ECFCF"; g.font=`800 44px ${font}`;
  if("letterSpacing" in g)g.letterSpacing="8px";
  g.fillText("NEW PERSONAL RECORD",W/2,830);
  if("letterSpacing" in g)g.letterSpacing="0px";

  // Exercise name (wraps onto two lines if long)
  g.fillStyle="#EEF2FF"; g.font=`800 88px ${font}`;
  const lines=wrapLines(g,pr.exercise,900).slice(0,2);
  lines.forEach((l,i)=>g.fillText(l,W/2,960+i*100));
  let y=960+(lines.length-1)*100;

  // Weight × reps
  const grad=g.createLinearGradient(W/2-360,0,W/2+360,0); grad.addColorStop(0,"#4F8EF7"); grad.addColorStop(1,"#8B7BFF");
  g.fillStyle=grad; g.font=`800 230px ${font}`; g.fillText(`${pr.weight}`,W/2,y+290);
  g.fillStyle="rgba(238,242,255,0.75)"; g.font=`700 76px ${font}`; g.fillText(`lbs × ${pr.reps} ${pr.reps===1?"rep":"reps"}`,W/2,y+400);
  g.fillStyle="rgba(238,242,255,0.5)"; g.font=`600 44px ${font}`; g.fillText(prettyDate(pr.dateKey),W/2,y+480);

  // Footer
  g.fillStyle="#EEF2FF"; g.font=`800 54px ${font}`; g.fillText(`@${username}`,W/2,1690);
  g.fillStyle="rgba(238,242,255,0.55)"; g.font=`600 40px ${font}`; g.fillText("Learn, lift & log at joinliftd.com",W/2,1760);

  return new Promise(res=>c.toBlob(res,"image/png"));
}
