import {scenes,duration,locate,renderSvg} from './scenes.mjs?v=2514a839105a';
const $=id=>document.getElementById(id),motion=matchMedia('(prefers-reduced-motion: reduce)');
let t=0,playing=false,last=0,active=-1,raf=0;const starts=[];let sum=0;for(const s of scenes){starts.push(sum);sum+=s.duration;}
const chapterButtons=scenes.map((s,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`${i+1} ${s.short}`;b.setAttribute('aria-label',`Scene ${i+1}: ${s.title}`);b.addEventListener('click',()=>jump(i));$('chapters').append(b);return b;});
scenes.forEach((s,i)=>{const li=document.createElement('li'),strong=document.createElement('strong');strong.textContent=`${i+1}. ${s.title}`;li.append(strong,document.createTextNode(`${s.caption} ${s.note}`));$('transcript').append(li);});
function timeLabel(x){return `0:${String(Math.min(50,Math.floor(x))).padStart(2,'0')}`;}
function draw(){const {scene,index}=locate(Math.min(t,duration-.001));$('stage').innerHTML=renderSvg(t);$('seek').value=t;$('seek').setAttribute('aria-valuetext',`${Math.floor(t)} seconds of 50 seconds`);$('clock').textContent=`${timeLabel(t)} / 0:50`;$('previous').disabled=index===0;$('next').disabled=index===scenes.length-1;if(active!==index){active=index;$('step').textContent=`${index+1} / 9 · ${scene.short}`;$('scene-title').textContent=scene.title;$('scene-caption').textContent=scene.caption;$('scene-note').textContent=scene.note;$('announcer').textContent=`Scene ${index+1}. ${scene.title} ${scene.caption}`;chapterButtons.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));}buttonLabel();}
function buttonLabel(){$('play').textContent=motion.matches?(active===8?'Replay steps':'Next scene'):(playing?'Pause':t>=duration?'Replay':'Play guide');$('play').setAttribute('aria-label',motion.matches?'Advance one still scene':playing?'Pause animation':t>=duration?'Replay animation':'Play animation');}
function stop(){playing=false;cancelAnimationFrame(raf);last=0;buttonLabel();}
function jump(i){stop();t=starts[Math.max(0,Math.min(scenes.length-1,i))];draw();if(document.querySelector('.stage').getBoundingClientRect().top<0)document.querySelector('.player').scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});}
function tick(now){if(!playing)return;if(last)t=Math.min(duration,t+(now-last)/1000);last=now;draw();if(t>=duration){stop();return;}raf=requestAnimationFrame(tick);}
$('play').addEventListener('click',()=>{if(motion.matches){jump(active===8?0:active+1);return;}if(playing){stop();return;}if(t>=duration)t=0;playing=true;last=0;buttonLabel();raf=requestAnimationFrame(tick);});
$('restart').addEventListener('click',()=>jump(0));$('previous').addEventListener('click',()=>jump(active-1));$('next').addEventListener('click',()=>jump(active+1));$('seek').addEventListener('input',e=>{stop();t=Number(e.target.value);draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
function motionChanged(){stop();$('motion-note').textContent=motion.matches?'Reduced motion is on. Use the controls to advance through still scenes.':'';draw();}
motion.addEventListener('change',motionChanged);motionChanged();
