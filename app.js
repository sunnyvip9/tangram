(() => {
  'use strict';
  const E=window.TangramEngine, puzzles=window.TANGRAM_PUZZLES;
  const byId=new Map(puzzles.map(p=>[p.id,p]));
  const displayDetails={
    'school-02':{name:'公鸡',group:'动物'},
    'school-03':{name:'小狗',group:'动物'},
    'school-04':{name:'卧猫',group:'动物'},
    'school-05':{name:'空心多边形',group:'基础图形'},
    'school-06':{name:'飞鸟',group:'动物'},
    'school-07':{name:'游鱼',group:'动物'},
  };
  const $=id=>document.getElementById(id), svgNS='http://www.w3.org/2000/svg';
  const modal=$('modal'), board=$('board-svg'), storageKey='tangram-school-web-v1-session';
  let session=null, items=[], drag=null, screen='home', lastFocus=null, storageOK=true;
  let linePuzzle=null, showLines=false;
  try { session=E.restore(localStorage.getItem(storageKey),puzzles); } catch { storageOK=false; }
  const formatTime=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const currentPuzzle=()=>byId.get(session.ids[session.index]);
  const puzzleLabel=puzzle=>`${String(puzzles.indexOf(puzzle)+1).padStart(2,'0')} ${displayDetails[puzzle.id]?.name??puzzle.name}`;
  const placed=()=>session.placed[session.index];
  const readonly=()=>session.mode==='exam'&&session.finished!==null;
  function save() {
    try {localStorage.setItem(storageKey,JSON.stringify(session));}
    catch {storageOK=false;}
    $('storage-note').hidden=storageOK;
  }
  function show(name) {
    screen=name;
    for(const id of ['home','game','result'])$(id).hidden=id!==name;
    if(name==='home') {
      $('resume').hidden=!session;
      if(session)$('resume').textContent=session.mode==='practice'?'继续上次练习':session.finished!==null?'查看上次比赛结果':'继续模拟比赛（计时中）';
      $('storage-note').hidden=storageOK;
    }
  }
  function svgElement(tag,attrs) {
    const el=document.createElementNS(svgNS,tag);
    for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);
    return el;
  }
  function transform(group,position){group.setAttribute('transform',`translate(${position.join(' ')})`);}
  function preview(puzzle,element,colored=false) {
    if(!colored){element.append(svgElement('path',{d:puzzle.outlinePath,fill:'#ffdeaa','fill-rule':'evenodd'}));return;}
    const layout=E.layout(puzzle);
    for(const item of layout) {
      const p=svgElement('polygon',{points:item.local.map(([x,y])=>[x+item.target[0],y+item.target[1]].join(',')).join(' '),fill:colored?item.color:'#ffdeaa'});
      element.append(p);
    }
  }
  preview(puzzles[17],$('hero-art'),true);
  function setFeedback(message,success=false) {
    $('feedback').textContent=message;
    $('feedback').classList.toggle('success',success);
  }
  function cancelDrag() {
    if(!drag)return;
    const active=drag;drag=null;
    transform(active.group,active.item.home);
    active.group.classList.remove('dragging');
    if(board.hasPointerCapture(active.pointerId))board.releasePointerCapture(active.pointerId);
  }
  function renderGame() {
    cancelDrag();
    show('game');
    const puzzle=currentPuzzle(), locked=placed();
    items=E.layout(puzzle);
    $('targets').replaceChildren();$('pieces').replaceChildren();
    if(linePuzzle!==puzzle){linePuzzle=puzzle;showLines=false;}
    const lines=session.mode==='practice'&&showLines;
    board.classList.toggle('show-lines',Boolean(lines));
    $('targets').append(svgElement('path',{d:puzzle.outlinePath,fill:'#ffdeaa','fill-rule':'evenodd'}));
    for(const item of items) {
      const target=svgElement('polygon',{points:item.local.map(([x,y])=>[x+item.target[0],y+item.target[1]].join(',')).join(' '),class:'target','data-slot':item.key});
      $('targets').append(target);
    }
    // Locked pieces stay behind all draggable pieces.
    for(const item of [...items.filter(p=>locked[p.key]),...items.filter(p=>!locked[p.key])]) {
      const slot=items.find(p=>p.key===locked[item.key]);
      const group=svgElement('g',{class:`piece${slot?' locked':''}`,'data-piece':item.key,'aria-label':`${item.label}${slot?'，已放好':'，拖动放置'}`,role:'img'});
      group.append(svgElement('polygon',{points:item.local.map(p=>p.join(',')).join(' '),fill:item.color}));
      transform(group,slot?slot.target:item.home);
      $('pieces').append(group);
    }
    $('mode-label').textContent=readonly()?'赛后检查':session.mode==='exam'?'模拟比赛':'自由练习';
    $('answer-card').textContent=session.mode==='exam'?'答题卡':'选题';
    $('question-count').textContent=`${session.index+1}／${session.ids.length}`;
    $('progress').textContent=`${Object.keys(locked).length}／７块`;
    $('puzzle-name').textContent=puzzleLabel(puzzle);
    $('lines-toggle').hidden=session.mode==='exam';
    $('lines-toggle').textContent=lines?'隐藏分块线':'显示分块线';
    $('lines-toggle').setAttribute('aria-pressed',String(Boolean(lines)));
    $('previous').disabled=session.index===0;
    $('next').disabled=session.index===session.ids.length-1;
    $('submit').textContent=readonly()?'成绩单':'提交';
    setFeedback(readonly()?'已交卷，可切题检查，本次结果不再改变':E.complete(locked)?'本题已完成，可以切题或提交':'把彩色板拖进浅橙色图案',E.complete(locked));
    updateClock();
  }
  function openModal(title,content) {
    cancelDrag();
    if(!modal.open)lastFocus=document.activeElement;
    $('modal-title').textContent=title;
    $('modal-body').replaceChildren();
    if(typeof content==='string')$('modal-body').innerHTML=content;
    else $('modal-body').append(content);
    if(!modal.open)modal.showModal();
  }
  function closeModal(){if(modal.open)modal.close();}
  modal.addEventListener('close',()=>{if(lastFocus?.isConnected&&!lastFocus.closest('[hidden]'))lastFocus.focus();});
  $('modal-close').onclick=closeModal;
  function confirmAction(title,message,label,action) {
    openModal(title,`<p>${message}</p><div class="modal-actions"><button class="outline" id="confirm-cancel">继续当前练习</button><button class="primary" id="confirm-action">${label}</button></div>`);
    $('confirm-cancel').onclick=closeModal;
    $('confirm-action').onclick=()=>{closeModal();action();};
  }
  function begin(mode) {
    const run=()=>{session=E.create(mode,puzzles);linePuzzle=null;save();renderGame();if(mode==='practice')openPicker();};
    if(session&&session.mode==='exam'&&session.finished===null) {
      confirmAction('开始新的练习？','当前模拟比赛尚未交卷。开始新的练习会替换本次进度。','开始新练习',run);
    } else if(session?.mode==='practice'&&session.placed.some(p=>Object.keys(p).length)) {
      confirmAction('开始新的练习？','开始新的练习会替换已保存的练习进度。','开始新练习',run);
    } else run();
  }
  function openPicker() {
    if(checkTimeout())return;
    const content=document.createElement('div');
    if(session.mode==='exam') {
      const grid=document.createElement('div');grid.className='answer-grid';
      session.ids.forEach((id,i)=>{
        const count=Object.keys(session.placed[i]).length,b=document.createElement('button');
        b.className=`answer-item${count===7?' done':''}${i===session.index?' selected':''}`;
        b.innerHTML=`<strong>${i+1}</strong><small>${count===7?'已完成':count?`${count}／７块`:'未开始'}</small>`;
        b.onclick=()=>{if(checkTimeout())return;session.index=i;save();closeModal();renderGame();};grid.append(b);
      });
      content.append(grid);
      const note=document.createElement('p');note.className='answer-note';note.textContent=readonly()?'点击题号可检查已提交的拼图。':'绿色表示已完成。查看答题卡时，倒计时继续。';content.append(note);
      openModal(readonly()?'已提交答题卡':'答题卡',content);
    } else {
      const groups=[['基础图形',p=>displayDetails[p.id]?.group==='基础图形'||p.id.startsWith('basic-')||p.group.endsWith('基础图形')],['动物',p=>displayDetails[p.id]?.group==='动物'||p.group.endsWith('动物')],['人物',p=>p.group.endsWith('人物')],['生活物品',p=>p.group.endsWith('物品')]];
      const grouped=groups.map(([title,test])=>({title,entries:puzzles.map((p,i)=>({p,i})).filter(({p})=>test(p))}));
      const pageSize=12;
      let category=grouped.findIndex(g=>g.entries.some(({i})=>i===session.index));
      let page=Math.floor(grouped[category].entries.findIndex(({i})=>i===session.index)/pageSize);
      const renderPicker=()=>{
        content.replaceChildren();
        const tabs=document.createElement('div');tabs.className='picker-tabs';
        grouped.forEach((g,index)=>{
          const b=document.createElement('button');b.className=index===category?'primary':'outline';
          b.dataset.category=String(index);b.textContent=`${g.title}（${g.entries.length}）`;
          b.setAttribute('aria-pressed',String(index===category));
          b.onclick=()=>{category=index;page=0;renderPicker();};tabs.append(b);
        });content.append(tabs);
        const group=grouped[category],pages=Math.ceil(group.entries.length/pageSize);
        const h=document.createElement('div');h.className='group-title';h.textContent=`${group.title} · 每页１２题`;content.append(h);
        const grid=document.createElement('div');grid.className='question-grid';
        for(const {p,i}of group.entries.slice(page*pageSize,(page+1)*pageSize)) {
          const b=document.createElement('button');b.className=`answer-item${E.complete(session.placed[i])?' done':''}${i===session.index?' selected':''}`;
          b.dataset.question=String(i);
          const svg=svgElement('svg',{viewBox:'0 0 1080 800','aria-hidden':'true'});preview(p,svg);
          const label=document.createElement('strong');label.textContent=puzzleLabel(p);b.append(svg,label);
          b.onclick=()=>{session.index=i;save();closeModal();renderGame();};grid.append(b);
        }content.append(grid);
        const nav=document.createElement('div');nav.className='picker-pages';
        const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
        previous.textContent='上一页';next.textContent='下一页';previous.dataset.pickerPage='previous';next.dataset.pickerPage='next';
        previous.disabled=page===0;next.disabled=page===pages-1;label.textContent=`${page+1}／${pages}页`;
        previous.onclick=()=>{page--;renderPicker();};next.onclick=()=>{page++;renderPicker();};
        nav.append(previous,label,next);content.append(nav);modal.scrollTop=0;
      };
      renderPicker();
      openModal('选一个图案',content);
    }
  }
  function result() {
    cancelDrag();closeModal();show('result');
    const count=session.placed.filter(E.complete).length;
    $('result-title').textContent=session.reason==='timeout'?'时间到，已自动交卷':'已交卷';
    $('result-count').textContent=count;
    $('result-time').textContent=`用时 ${formatTime(Math.max(0,Math.ceil((session.finished-session.started)/1000)))}`;
    $('result-items').replaceChildren();
    session.ids.forEach((id,i)=>{
      const done=E.complete(session.placed[i]), b=document.createElement('button');
      b.className=done?'done':'';b.innerHTML=`<strong>${i+1}</strong><small>${done?'已完成':'未完成'}</small>`;
      b.onclick=()=>{session.index=i;save();renderGame();};$('result-items').append(b);
    });
  }
  function checkTimeout() {
    if(session?.mode==='exam'&&session.finished===null&&E.remaining(session)===0) {
      cancelDrag();E.finish(session,'timeout');save();result();return true;
    }
    return false;
  }
  function updateClock() {
    if(!session)return;
    if(checkTimeout())return;
    if(screen==='game') {
      const seconds=E.remaining(session);
      $('clock').textContent=readonly()?'已交卷':seconds===null?'不限时':formatTime(seconds);
      $('clock').classList.toggle('urgent',!readonly()&&seconds!==null&&seconds<=30);
    }
    if(screen==='home'&&session.mode==='exam'&&session.finished===null)$('resume').textContent=`继续模拟比赛（剩余 ${formatTime(E.remaining(session))}）`;
  }
  function submit() {
    if(checkTimeout())return;
    if(readonly()){result();return;}
    if(session.mode==='practice') {
      const count=Object.keys(placed()).length;
      openModal(count===7?'拼好了！':'再试一试',count===7?'<p>七块板全部放对了。可以换一个图案继续练习。</p><button id="practice-choose" class="primary wide">选择下一题</button>':`<p>已经放好${count}块，还有${7-count}块。把剩下的彩色板拖到对应的位置。</p><button id="practice-return" class="primary wide">继续拼图</button>`);
      if(count===7)$('practice-choose').onclick=openPicker;else $('practice-return').onclick=closeModal;
    } else {
      const count=session.placed.filter(E.complete).length;
      confirmAction('提交本次比赛？',`已完成${count}／７题。提交后可以查看结果，不能再修改本次答案。`,'确认交卷',()=>{
        if(checkTimeout())return;E.finish(session,'manual');save();result();
      });
    }
  }
  function pointerPosition(event) {
    const matrix=board.getScreenCTM();
    if(!matrix)return null;
    const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    return [point.x,point.y];
  }
  board.addEventListener('pointerdown',event=>{
    if(event.button!==0||!event.isPrimary||drag||checkTimeout()||readonly())return;
    const group=event.target.closest('[data-piece]');
    if(!group||placed()[group.dataset.piece])return;
    const item=items.find(p=>p.key===group.dataset.piece),point=pointerPosition(event);
    if(!point)return;
    event.preventDefault();
    drag={group,item,pointerId:event.pointerId,start:point,position:[...item.home]};
    $('pieces').append(group);group.classList.add('dragging');
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener('pointermove',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(checkTimeout())return;
    const point=pointerPosition(event), b=E.bounds(drag.item.local);
    if(!point)return;
    drag.position=[Math.max(-b.x0,Math.min(1080-b.x1,drag.item.home[0]+point[0]-drag.start[0])),Math.max(-b.y0,Math.min(1560-b.y1,drag.item.home[1]+point[1]-drag.start[1]))];
    transform(drag.group,drag.position);event.preventDefault();
  });
  board.addEventListener('pointerup',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(checkTimeout())return;
    const active=drag, ctm=board.getScreenCTM();
    const tolerance=Math.min(active.item.scale*.3,18/Math.hypot(ctm.a,ctm.b));
    const slot=E.snap(items,placed(),active.item.key,active.position,tolerance);
    cancelDrag();
    if(slot){placed()[active.item.key]=slot;save();renderGame();if(!E.complete(placed()))setFeedback('放对了！已吸附锁定',true);}
    else setFeedback('再靠近对应的位置试试');
  });
  board.addEventListener('pointercancel',cancelDrag);
  board.addEventListener('lostpointercapture',cancelDrag);
  window.addEventListener('blur',cancelDrag);
  window.addEventListener('resize',cancelDrag);
  document.addEventListener('visibilitychange',()=>{cancelDrag();updateClock();});
  window.addEventListener('pageshow',updateClock);
  $('practice-start').onclick=()=>begin('practice');$('exam-start').onclick=()=>begin('exam');
  $('resume').onclick=()=>{if(checkTimeout())return;if(session.mode==='exam'&&session.finished!==null)result();else renderGame();};
  $('home-button').onclick=()=>{cancelDrag();linePuzzle=null;closeModal();save();show('home');updateClock();};
  $('answer-card').onclick=openPicker;
  $('previous').onclick=()=>{if(checkTimeout()||session.index===0)return;session.index--;save();renderGame();};
  $('next').onclick=()=>{if(checkTimeout()||session.index===session.ids.length-1)return;session.index++;save();renderGame();};
  $('submit').onclick=submit;
  $('lines-toggle').onclick=()=>{if(session.mode!=='practice')return;showLines=!showLines;renderGame();};
  $('again').onclick=()=>begin('exam');$('result-home').onclick=()=>show('home');
  $('about').onclick=()=>openModal('使用说明与题目来源',`<p>把彩色板拖到浅橙色图案中。朝向已经摆好，无需旋转或翻面；放对后吸附锁定，放错回原位。</p><p>自由练习默认只显示轮廓，右上角可以显示／隐藏分块线，切换题目后恢复隐藏。模拟比赛随机７题，共５分钟，全部只显示轮廓，可以来回切题。点击「提交」交整卷，时间到自动交卷。只有七块全部放对才计为完成。</p><p>本机保存当前进度；刷新与切到后台不会暂停比赛。页面供家庭练习使用。</p><p>新增９００道参考 GLPeces（I. De Marchi）具名七巧板题，按标准七块重建并筛选。<a href="licenses/GLPeces-COPYING.txt" target="_blank" rel="noopener">GLPeces GPL 许可文本</a>。</p><details><summary>查看题目参考来源</summary><p>题库包含基础图形、动物、人物和生活物品。其中６２道参考 Florida Center for Instructional Technology，University of South Florida，ClipArt ETC，按标准七块重建。</p><ul class="source-links"><li><a target="_blank" rel="noopener" href="https://etc.usf.edu/clipart/galleries/681-tangram-cards">完整参考卡片集</a></li><li><a target="_blank" rel="noopener" href="https://etc.usf.edu/clipart/74300/74382/74382_animals2_sa.htm">猫与兔</a></li><li><a target="_blank" rel="noopener" href="https://etc.usf.edu/clipart/74300/74383/74383_birds_sa.htm">鸟类</a>、<a target="_blank" rel="noopener" href="https://etc.usf.edu/clipart/74300/74386/74386_fish_sa.htm">鱼类</a></li><li><a target="_blank" rel="noopener" href="https://etc.usf.edu/clipart/74300/74390/74390_people2_sa.htm">人物</a>、<a target="_blank" rel="noopener" href="https://etc.usf.edu/clipart/74300/74388/74388_h-items_sa.htm">生活物品</a></li></ul><p>本版本供本地非商业教育练习，保留参考署名。来源采用有限制的 <a target="_blank" rel="noopener" href="https://etc.usf.edu/clipart/info/license">Free Classroom License</a>。</p></details>`);
  show('home');updateClock();setInterval(updateClock,200);
})();
