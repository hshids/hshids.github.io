// Quiet procedural feedback: paper/wood clicks, a small bell and water plips.
// Nothing plays until the visitor explicitly turns sound on.
export function createAudio(){
  let ctx=null, master=null, enabled=false;
  function unlock(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.17;master.connect(ctx.destination);}ctx.resume();}
  function play(id){if(!enabled||!ctx)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=id==='step'?'triangle':'sine';const freq=id==='water'?580:id==='bell'?660:id==='cat'?240:id==='step'?90:420;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.55,t+.13);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(id==='step'?.1:.23,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+(id==='bell'?.65:.18));o.connect(g).connect(master);o.start(t);o.stop(t+.7);}
  return {play,toggle(){enabled=!enabled;if(enabled)unlock();if(master)master.gain.value=enabled?.17:0;return enabled;},pause(paused){if(ctx)(paused?ctx.suspend():enabled?ctx.resume():Promise.resolve()).catch(()=>{});},get enabled(){return enabled;},dispose(){ctx?.close();}};
}
