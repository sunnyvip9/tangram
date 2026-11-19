(function (root) {
  'use strict';
  const keys = ['LT1', 'LT2', 'MT', 'ST1', 'ST2', 'SQ', 'PA'];
  const colors = ['#53d5e5', '#b897f4', '#ffa076', '#ffb64f', '#b9de68', '#ff7d7d', '#f8dd53'];
  const labels = ['大三角一', '大三角二', '中三角', '小三角一', '小三角二', '正方形', '平行四边形'];
  const homes = [[285,890], [795,890], [210,1180], [350,1420], [720,1420], [530,1180], [850,1180]];
  const bounds = points => ({x0:Math.min(...points.map(p=>p[0])), x1:Math.max(...points.map(p=>p[0])), y0:Math.min(...points.map(p=>p[1])), y1:Math.max(...points.map(p=>p[1]))});
  function layout(puzzle) {
    const b = bounds(Object.values(puzzle.pieces).flat());
    const scale = Math.min(115, 850/(b.x1-b.x0), 590/(b.y1-b.y0));
    const offset = [540-scale*(b.x0+b.x1)/2, 400-scale*(b.y0+b.y1)/2];
    return keys.map((key,i) => {
      const box = bounds(puzzle.pieces[key]), center = [(box.x0+box.x1)/2,(box.y0+box.y1)/2];
      return {key, color:colors[i], label:labels[i], scale, home:homes[i], target:center.map((v,j)=>offset[j]+v*scale), local:puzzle.pieces[key].map(p=>p.map((v,j)=>(v-center[j])*scale))};
    });
  }
  function compatible(a,b) {
    return a.local.length===b.local.length && a.local.every(p=>b.local.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5));
  }
  function snap(items, placed, key, position, tolerance) {
    if (placed[key]) return null;
    const item=items.find(p=>p.key===key), occupied=new Set(Object.values(placed));
    const options=items.filter(p=>!occupied.has(p.key)&&compatible(item,p)).map(p=>({key:p.key, distance:Math.hypot(position[0]-p.target[0], position[1]-p.target[1])}));
    options.sort((a,b)=>a.distance-b.distance);
    return options[0]?.distance<=tolerance ? options[0].key : null;
  }
  const complete = placed => Object.keys(placed).length===7;
  const remaining = (session,now=Date.now()) => session.mode==='exam' ? Math.max(0,Math.ceil((session.deadline-now)/1000)) : null;
  function create(mode,puzzles,now=Date.now(),random=Math.random) {
    let ids=puzzles.map(p=>p.id);
    if (mode==='exam') {
      for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
      ids=ids.slice(0,7);
    }
    return {version:1,mode,ids,index:0,started:now,deadline:mode==='exam'?now+300000:null,finished:null,reason:null,placed:ids.map(()=>({})),lines:{}};
  }
  function finish(session,reason,now=Date.now()) {
    if(session.mode!=='exam'||session.finished!==null)return;
    session.finished=Math.min(now,session.deadline);
    session.reason=now>=session.deadline?'timeout':reason;
  }
  function restore(raw,puzzles) {
    try {
      const s=JSON.parse(raw),byId=new Map(puzzles.map(p=>[p.id,p]));
      if(!s||s.version!==1||!['practice','exam'].includes(s.mode)||!Array.isArray(s.ids)||(s.mode==='exam'?s.ids.length!==7:s.ids.length===0||s.ids.length>puzzles.length)||new Set(s.ids).size!==s.ids.length||s.ids.some(id=>!byId.has(id)))return null;
      if(!Number.isInteger(s.index)||s.index<0||s.index>=s.ids.length||!Number.isFinite(s.started)||!Array.isArray(s.placed)||s.placed.length!==s.ids.length)return null;
      if(s.mode==='exam'&&(!Number.isFinite(s.deadline)||s.deadline!==s.started+300000))return null;
      if(s.finished!==null&&(!Number.isFinite(s.finished)||s.mode!=='exam'||s.finished<s.started||s.finished>s.deadline))return null;
      for(let i=0;i<s.ids.length;i++) {
        const placed=s.placed[i],items=layout(byId.get(s.ids[i]));
        if(!placed||typeof placed!=='object'||Array.isArray(placed)||new Set(Object.values(placed)).size!==Object.values(placed).length)return null;
        for(const [key,value] of Object.entries(placed))if(!keys.includes(key)||!keys.includes(value)||!compatible(items.find(p=>p.key===key),items.find(p=>p.key===value)))return null;
      }
      s.lines=s.lines&&typeof s.lines==='object'&&!Array.isArray(s.lines)?s.lines:{};
      if(s.mode==='practice') {
        const currentId=s.ids[s.index],previous=new Map(s.ids.map((id,i)=>[id,s.placed[i]]));
        s.ids=puzzles.map(p=>p.id);
        s.placed=s.ids.map(id=>previous.get(id)||{});
        s.index=s.ids.indexOf(currentId);
      }
      return s;
    } catch { return null; }
  }
  root.TangramEngine={keys,colors,labels,bounds,layout,compatible,snap,complete,remaining,create,finish,restore};
})(globalThis);
