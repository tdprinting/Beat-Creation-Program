export const TRACKS=['Kick','Snare','Closed hat','Open hat','Percussion','808 bass','Keys','Atmosphere'];
export const COLORS=['#f09b70','#e8bc74','#b6cb87','#78c4b3','#77abc8','#a997dc','#dba2bf','#8299b4'];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rng(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=Math.imul(x^x>>>15,1|x);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function generate({idea='',style='nocturnal',energy=55,density=45,seed=Date.now(),key=0}={}){
 const r=rng(seed),text=idea.toLowerCase();if(/travis|psychedelic|space|dark/.test(text))style='orbit';if(/drake|rnb|r&b|smooth|late night/.test(text))style='nocturnal';if(/boom bap|jazzy|old school/.test(text))style='dust';
 const cfg={nocturnal:[92,[0,5,3,6]],orbit:[140,[0,0,5,3]],dust:[86,[0,3,5,4]]}[style]||[96,[0,5,3,6]], scale=[0,2,3,5,7,8,10],bpm=clamp(Number(text.match(/\b(\d{2,3})\s*bpm/)?.[1]||cfg[0]),55,180);
 const patterns=Array.from({length:4},()=>TRACKS.map(()=>Array(64).fill(null))),amount=density/100,e=energy/100;
 const motif=Array.from({length:8},()=>Math.floor(r()*5));
 for(let p=0;p<4;p++)for(let bar=0;bar<4;bar++){
  const a=patterns[p],root=36+key+scale[cfg[1][bar]],base=bar*16,put=(tr,s,vel=0.8,note=60,len=1)=>a[tr][base+s]={vel,note,len};
  const kicks=style==='dust'?[0,6,10]:style==='orbit'?[0,7,11]:[0,6,14];
  kicks.forEach((s,i)=>{if(i===0||r()<.72+e*.2)put(0,s,.82+r()*.16);});
  if(r()<amount)put(0,[3,10,15][Math.floor(r()*3)],.65);
  (style==='orbit'?[8]:[4,12]).forEach(s=>put(1,s,.76+r()*.15));if(p===2&&bar===3)put(1,15,.45);
  for(let s=0;s<16;s++){if(s%2===0||r()<amount*.4)put(2,s,(s%4===0?.55:.32)+r()*.18);}
  if(style==='orbit'&&r()<amount+.2){const s=[6,14][Math.floor(r()*2)];put(2,s,.48);a[2][base+s].roll=3;}
  if(r()<.75)put(3,[6,14][bar%2],.35);if(r()<amount)put(4,[3,7,10,15][Math.floor(r()*4)],.4);
  const bassSteps=a[0].slice(base,base+16).map((v,i)=>v?i:-1).filter(i=>i>=0);bassSteps.forEach((s,i)=>put(5,s,.7,root-12+(bar===3&&i===bassSteps.length-1?7:0),Math.min(7,(bassSteps[i+1]??16)-s)));
  const chord=[root+12,root+15,root+19,root+22];put(7,0,.30,root,16);a[7][base].chord=chord;
  for(let n=0;n<8;n++){const s=n*2;if(r()<.34+amount*.48){const degree=motif[n];put(6,s,.35+r()*.2,root+24+scale[degree],style==='dust'?1.5:2.7);}}
  if(p===0){a[5].fill(null,base,base+16);a[0].fill(null,base,base+16);a[2].fill(null,base+8,base+16);}
  if(p===3){for(const tr of [0,1,2,3,4,5])a[tr].fill(null,base,base+16);}
 }
 return{version:1,name:idea.trim().slice(0,45)||'After hours',idea,style,seed,key,bpm,swing:style==='dust'?18:7,patterns,volumes:[.85,.7,.52,.4,.5,.7,.55,.55],mutes:Array(8).fill(false),arrangement:[{pattern:0,bars:4},{pattern:1,bars:16},{pattern:2,bars:8},{pattern:1,bars:16},{pattern:2,bars:8},{pattern:3,bars:4}]};
}
export function detectHits(samples,sr,bpm,mode='taps',sensitivity=.5){
 const frame=Math.round(sr*.008),env=[];for(let i=0;i<samples.length;i+=frame){let sum=0,z=0;for(let j=i;j<Math.min(samples.length,i+frame);j++){sum+=samples[j]**2;if(j>i&&samples[j]*samples[j-1]<0)z++;}env.push({r:Math.sqrt(sum/frame),z:z/frame,i});}
 const peak=Math.max(.001,...env.map(e=>e.r)),threshold=peak*(.42-sensitivity*.32),hits=[];let last=-99;
 for(let k=1;k<env.length-1;k++){const f=env[k],baseline=env.slice(Math.max(0,k-6),k).reduce((s,e)=>s+e.r,0)/Math.min(k,6);if(f.r>threshold&&f.r>baseline*1.65&&f.i/sr-last>.085){last=f.i/sr;hits.push({time:last,vel:clamp(f.r/peak,.25,1),track:mode==='taps'?0:f.z>.23?2:f.z>.065?1:0});}}
 if(!hits.length)return[];const first=hits[0].time,step=60/bpm/4;return hits.map(h=>({...h,step:Math.round((h.time-first)/step)})).filter(h=>h.step<64);
}
export function validateProject(p){return p?.version===1&&typeof p.name==='string'&&Number.isFinite(p.bpm)&&p.bpm>=55&&p.bpm<=180&&Number.isFinite(p.swing)&&p.swing>=0&&p.swing<=60&&Array.isArray(p.volumes)&&p.volumes.length===8&&p.volumes.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Array.isArray(p.mutes)&&p.mutes.length===8&&Array.isArray(p.patterns)&&p.patterns.length===4&&p.patterns.every(a=>Array.isArray(a)&&a.length===8&&a.every(row=>Array.isArray(row)&&row.length===64&&row.every(n=>n===null||(Number.isFinite(n.vel)&&n.vel>=0&&n.vel<=1&&Number.isFinite(n.note)&&n.note>=12&&n.note<=108&&Number.isFinite(n.len)&&n.len>0&&n.len<=32&&(!n.chord||(Array.isArray(n.chord)&&n.chord.length<=8&&n.chord.every(x=>Number.isFinite(x)&&x>=12&&x<=108)))))))&&Array.isArray(p.arrangement)&&p.arrangement.length>0&&p.arrangement.length<=24&&p.arrangement.every(s=>Number.isInteger(s.pattern)&&s.pattern>=0&&s.pattern<4&&Number.isInteger(s.bars)&&s.bars>=1&&s.bars<=32);}
export class AudioEngine{
 constructor(ctx,project){this.ctx=ctx;this.project=project;this.master=ctx.createGain();this.master.gain.value=.72;this.comp=ctx.createDynamicsCompressor();this.comp.threshold.value=-12;this.comp.knee.value=12;this.comp.ratio.value=4;this.comp.attack.value=.003;this.comp.release.value=.16;this.master.connect(this.comp).connect(ctx.destination);this.bus=TRACKS.map((_,i)=>{const g=ctx.createGain();g.gain.value=project.mutes[i]?0:project.volumes[i];g.connect(this.master);return g;});this.delay=ctx.createDelay(2);this.delay.delayTime.value=60/project.bpm*.75;const feedback=ctx.createGain();feedback.gain.value=.26;const wet=ctx.createGain();wet.gain.value=.19;this.delay.connect(feedback).connect(this.delay);this.delay.connect(wet).connect(this.master);this.noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const random=rng(421);this.noise.getChannelData(0).forEach((_,i,a)=>a[i]=random()*2-1);}
 hit(track,n,time,step){const c=this.ctx,t=Math.max(time,c.currentTime),v=n.vel,bus=this.bus[track];const tone=(freq,end,dur,type='sine',vol=1)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+dur*.7);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v*vol),t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(bus);o.start(t);o.stop(t+dur+.03);return g;};const noise=(dur,freq,type,vol)=>{const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=this.noise;f.type=type;f.frequency.value=freq;g.gain.setValueAtTime(v*vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(f).connect(g).connect(bus);src.start(t);src.stop(t+dur);};
  if(track===0){tone(145,43,.34,'sine',.9);noise(.014,1700,'lowpass',.12);}if(track===1){noise(.17,1700,'highpass',.45);tone(180,110,.11,'triangle',.18);}
  if(track===2)noise(.045,7600,'highpass',.25);if(track===3)noise(.25,6700,'highpass',.24);if(track===4){tone(780,360,.09,'triangle',.3);noise(.025,2400,'bandpass',.2);}
  if(track===5){const freq=440*2**((n.note-69)/12);tone(freq*1.06,freq,Math.max(.08,n.len*step*.93),'sine',.7);tone(freq*2,0,n.len*step*.65,'triangle',.07);}
  if(track===6){const freq=440*2**((n.note-69)/12);const g=tone(freq,0,n.len*step,'triangle',.22);tone(freq*2.002,0,n.len*step*.4,'sine',.075);g.connect(this.delay);}
  if(track===7){for(const note of n.chord||[n.note,n.note+7]){const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type='triangle';o.frequency.value=440*2**((note-69)/12);f.frequency.value=1100;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*.12,t+.14);g.gain.setTargetAtTime(.0001,t+Math.max(.2,n.len*step-.3),.18);o.connect(f).connect(g).connect(bus);o.start(t);o.stop(t+n.len*step+.9);}}
 }
 schedule(pattern,s,time,step,mult=1){for(let tr=0;tr<8;tr++){const n=this.project.patterns[pattern][tr][s];if(n&&!this.project.mutes[tr]){const count=clamp(n.roll||1,1,4);for(let j=0;j<count;j++)this.hit(tr,{...n,vel:n.vel*mult*(1-j*.12)},time+j*step/count,step);}}}
 stop(){this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.015);}
}
export function wav(buffer){const channels=buffer.numberOfChannels,len=buffer.length*channels*2,arr=new ArrayBuffer(44+len),v=new DataView(arr),str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));str(0,'RIFF');v.setUint32(4,36+len,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,len,true);let off=44;for(let i=0;i<buffer.length;i++)for(let ch=0;ch<channels;ch++){const x=clamp(buffer.getChannelData(ch)[i],-1,1);v.setInt16(off,x*(x<0?32768:32767),true);off+=2;}return new Blob([arr],{type:'audio/wav'});}
