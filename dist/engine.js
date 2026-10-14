export * from './composer.js';
export { AudioEngine } from './audio.js';
export { midi } from './midi.js';
import { clamp } from './composer.js';
export function detectHits(samples,sr,bpm,mode='taps',sensitivity=.5){
 const frame=Math.round(sr*.008),env=[];for(let i=0;i<samples.length;i+=frame){let sum=0,z=0;for(let j=i;j<Math.min(samples.length,i+frame);j++){sum+=samples[j]**2;if(j>i&&samples[j]*samples[j-1]<0)z++;}env.push({r:Math.sqrt(sum/frame),z:z/frame,i});}
 const peak=Math.max(.001,...env.map(e=>e.r)),threshold=peak*(.42-sensitivity*.32),hits=[];let last=-99;
 for(let k=1;k<env.length-1;k++){const f=env[k],baseline=env.slice(Math.max(0,k-6),k).reduce((s,e)=>s+e.r,0)/Math.min(k,6);if(f.r>threshold&&f.r>baseline*1.65&&f.i/sr-last>.085){last=f.i/sr;hits.push({time:last,vel:clamp(f.r/peak,.25,1),track:mode==='taps'?0:f.z>.23?2:f.z>.065?1:0});}}
 if(!hits.length)return[];const first=hits[0].time,step=60/bpm/4;return hits.map(h=>({...h,step:Math.round((h.time-first)/step)})).filter(h=>h.step<64);
}

export function wav(buffer){const channels=buffer.numberOfChannels,len=buffer.length*channels*2,arr=new ArrayBuffer(44+len),v=new DataView(arr),str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));str(0,'RIFF');v.setUint32(4,36+len,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,len,true);let off=44;for(let i=0;i<buffer.length;i++)for(let ch=0;ch<channels;ch++){const x=clamp(buffer.getChannelData(ch)[i],-1,1);v.setInt16(off,x*(x<0?32768:32767),true);off+=2;}return new Blob([arr],{type:'audio/wav'});}
