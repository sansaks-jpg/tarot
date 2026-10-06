// Original procedural sound design. No audio files, tracking, or external API.
let ctx,master,music,bus,enabled=false,volume=.32,timer,lastChord=0;
const voices=new Set();
const chords=[[130.81,164.81,196,261.63],[174.61,220,261.63,329.63],[196,246.94,293.66,392],[164.81,220,261.63,329.63]];
function context(){
 if(!ctx){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;
 ctx=new Audio();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
 music=ctx.createGain();music.gain.value=.32;music.connect(master);
 bus=ctx.createGain();bus.gain.value=.62;bus.connect(master);}
 return true;
}
function tone(frequency,start,duration,gain,target=bus,type='sine'){
 const oscillator=ctx.createOscillator(),envelope=ctx.createGain();oscillator.type=type;oscillator.frequency.value=frequency;
 envelope.gain.setValueAtTime(.0001,start);envelope.gain.exponentialRampToValueAtTime(gain,start+(target===music?Math.min(2.1,duration*.35):Math.min(.08,duration*.2)));
 envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);oscillator.connect(envelope);envelope.connect(target);
 voices.add(oscillator);oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();envelope.disconnect();};oscillator.start(start);oscillator.stop(start+duration+.03);
}
function ambient(){
 if(!enabled||document.hidden||ctx.state!=='running')return;
 const notes=chords[lastChord++%chords.length],now=ctx.currentTime;
 notes.forEach((frequency,i)=>tone(frequency,now+i*.14,8.5,.018,music));
 const pattern=[2,1,3,2,0,2,1,3];
 pattern.forEach((note,i)=>tone(notes[note]*2,now+.35+i*.72,.5,.043,music,'triangle'));
}
function stopMusic(){clearInterval(timer);timer=undefined;for(const voice of voices){try{voice.stop(ctx.currentTime+.12);}catch{}}}
export async function toggleAudio(){
 if(!context())throw new Error('Suara belum didukung peramban ini. Bacaan tetap bisa digunakan.');
 if(enabled){enabled=false;master.gain.setTargetAtTime(0,ctx.currentTime,.045);stopMusic();return false;}
 await ctx.resume();if(ctx.state!=='running')throw new Error('Suara belum aktif. Coba ketuk tombol suara sekali lagi.');
 enabled=true;master.gain.setTargetAtTime(volume,ctx.currentTime,.18);ambient();timer=setInterval(ambient,6500);sfx('next');return true;
}
export function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)/100));if(ctx&&enabled)master.gain.setTargetAtTime(volume,ctx.currentTime,.05);}
export function audioEnabled(){return enabled;}
export function sfx(name){
 if(!enabled||!ctx||ctx.state!=='running')return;
 const t=ctx.currentTime;
 if(name==='shuffle'){
 const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.45),ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++){const pulse=Math.max(0,Math.sin(i/ctx.sampleRate*2*Math.PI*15));data[i]=(Math.random()*2-1)*pulse*(1-i/data.length);}
 const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();noise.buffer=buffer;filter.type='bandpass';filter.frequency.value=1700;filter.Q.value=.5;gain.gain.value=.12;noise.connect(filter);filter.connect(gain);gain.connect(bus);noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};noise.start();return;
 }
 if(name==='reveal'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,t+i*.10,.85,.075/(1+i*.28),bus,'triangle'));return;}
 if(name==='complete'){[523.25,659.25,783.99,1046.5,783.99,1046.5].forEach((f,i)=>tone(f,t+i*.14,.65,.07,bus,'triangle'));return;}
 if(name==='save'){[349.23,440,523.25].forEach((f,i)=>tone(f,t+i*.09,.7,.07));return;}
 if(name==='select'){tone(659.25,t,.14,.055,bus,'triangle');tone(783.99,t+.055,.21,.045,bus,'triangle');return;}
 tone(293.66,t,.35,.07);tone(440,t+.055,.42,.03);
}
document.addEventListener('visibilitychange',async()=>{
 if(!ctx||!enabled)return;
 if(document.hidden){master.gain.setTargetAtTime(0,ctx.currentTime,.045);stopMusic();try{await ctx.suspend();}catch{}}
 else{try{await ctx.resume();if(enabled){master.gain.setTargetAtTime(volume,ctx.currentTime,.18);ambient();timer=setInterval(ambient,6500);}}catch{}}
});
