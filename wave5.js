const wave5Tabs=[
 ['wrapped','Donezo Wrapped','✦','Your study season, in shareable cards.','celebration'],
 ['grove','Focus Grove','♧','Grow a tree while you focus.','projects'],
 ['doubling','Body Doubling','◈','Schedule silent co-work with people in your class.','codes'],
 ['explore','Immersive Explorations','◎','Peel back layers and explore visual lessons.','snap'],
 ['papers','Past-Paper Bank','▤','Find student-shared practice material for your class.','vault'],
 ['mock','Full Mock Exams','↯','Take full-length timed practice and get a pacing report.','test'],
 ['offline','Offline Packs','↓','Save the material you need before you lose your connection.','hero'],
 ['access','Accessibility','Aa','Set reading, spacing and contrast preferences.','empty'],
 ['honor','Honor Mode','✓','View and apply teacher rules for class assignments.','projects'],
 ['certs','Vault Certificates','🏅','Track lessons and verify completion certificates.','vault']
];
for(const [key,title,icon,description,image] of wave5Tabs){section(key,title,icon,description);sections[key][3]=image;guidance[key]=[title,description];}
const w5=(path,data)=>manageRequest('w5/'+path,data);
const w5Link=(name,route)=>links([[name,route]]);
const metricRows=()=>read('w5-metrics',[]);
function countWave5(type,value=1){
  const rows=metricRows(),day=waveDate(0),row=rows.find(item=>item.day===day&&item.type===type);
  if(row)row.value+=value;else rows.push({day,type,value});
  save('w5-metrics',rows.slice(-2400));
}
const earnBeforeFive=earn;
earn=function(label,xp,subject,score,tool){
  earnBeforeFive(label,xp,subject,score,tool);
  countWave5('xp',xp);
  if(tool==='snap')countWave5('snaps');
  if(tool==='battles'&&label==='Quiz Battle victory')countWave5('wins');
  if(subject&&typeof score==='number'){
    const records=read('w5-class-history',[]);
    records.push({subject,score,day:waveDate(0)});
    save('w5-class-history',records.slice(-500));
  }
};
function bestStreak(days){
  let best=0,run=0,last=-Infinity;
  for(const day of [...new Set(days)].sort()){
    const time=Date.parse(day);
    run=time-last===86400000?run+1:1;
    if(Number.isFinite(time)){best=Math.max(best,run);last=time;}
  }
  return best;
}
function wrappedStats(period){
  const current=waveDate(0),cutoff=period==='month'?current.slice(0,7)+'-01':period==='term'?waveDate(-180):'0000';
  const rows=metricRows().filter(row=>row.day>=cutoff&&row.day<=current),total=type=>rows.filter(row=>row.type===type).reduce((sum,row)=>sum+row.value,0);
  const grouped=new Map();
  for(const record of read('w5-class-history',[]).filter(row=>row.day>=cutoff)){
    if(!grouped.has(record.subject))grouped.set(record.subject,[]);
    grouped.get(record.subject).push(record.score);
  }
  const growth=[...grouped].map(([name,scores])=>[name,scores.at(-1)-scores[0]]).filter(([,gain])=>gain>0).sort((a,b)=>b[1]-a[1])[0];
  return {snaps:total('snaps'),minutes:total('minutes'),xp:period==='all'?progressState().xp:total('xp'),wins:total('wins'),streak:bestStreak(progressState().days.filter(day=>day>=cutoff)),growth:growth?growth[0]+' · +'+Math.round(growth[1]*100)+' points':'More class scores needed'};
}
views.wrapped=()=>wavePanel('Your Donezo Wrapped · Free','<p>Recaps reflect the activity recorded in Donezo. You can view them anytime.</p><label>Recap window<select id="wrapped-period"><option value="month">This season</option><option value="term">Last 180 days</option><option value="all">All time</option></select></label><article class="wrapped-card" id="wrapped-card"></article><div class="actions"><button class="ghost" id="wrap-prev">Back</button><button class="primary" id="wrap-next">Next card</button><button class="ghost" id="wrap-share">Share this card’s stats</button></div><p id="wrapped-status" role="status"></p>');
bindings.wrapped=()=>{
  let card=0,ranking=null;
  const period=el('#wrapped-period'),target=el('#wrapped-card');
  function render(){
    const x=wrappedStats(period.value);
    const items=[['Problems snapped',x.snaps],['Focus hours',(x.minutes/60).toFixed(1)],['XP earned',x.xp],['Best streak',x.streak+' days'],['Battles won',x.wins],['Most improved class',x.growth],['Season rank',period.value==='month'&&ranking?'Top '+ranking+'% of ranked challenge students':'Rank unavailable'],['Season badge',x.xp>0?'I Survived Finals':'Ready for a fresh start']];
    const [label,value]=items[card];
    target.innerHTML='<span class="eyebrow">DONEZO WRAPPED · '+(card+1)+' / '+items.length+'</span>'+art('celebration')+'<h2>'+esc(label)+'</h2><p class="answer">'+esc(value)+'</p>';
    el('#wrap-prev').disabled=card===0;el('#wrap-next').disabled=card===items.length-1;
    el('#wrap-share').onclick=()=>shareText('Donezo Wrapped','Donezo Wrapped · '+label+': '+value,el('#wrapped-status'));
  }
  period.onchange=()=>{card=0;render();};
  el('#wrap-prev').onclick=()=>{card--;render();};el('#wrap-next').onclick=()=>{card++;render();};
  render();
  w5('recap').then(data=>{ranking=data.percentile;if(target.isConnected)render();}).catch(()=>{});
};
const groveTrees=()=>read('w5-grove',[]);
function forestTree(id,minutes,group=false){
  if(groveTrees().some(tree=>tree.id===id))return;
  save('w5-grove',[...groveTrees(),{id,minutes,group,at:Date.now()}]);
  countWave5('minutes',minutes);
}
function treePicture(growth=1,dead=false){
  const ratio=Math.max(.13,Math.min(1,growth));
  return '<div class="grove-tree '+(dead?'withered':'')+'" style="--grow:'+ratio+'" aria-hidden="true"><div class="grove-crown"></div><div class="grove-trunk"></div></div>';
}
function forestMarkup(){
  const trees=groveTrees();
  return '<p>'+trees.length+' trees · '+trees.length+' grove coins</p><p>Coins track completed focus sessions. No real trees have been funded through Donezo yet.</p><div class="forest-grid">'+trees.slice(-50).map(tree=>'<div title="'+tree.minutes+' minutes">'+treePicture()+'</div>').join('')+'</div>';
}
views.grove=()=>wavePanel('Your permanent grove · Free',forestMarkup()+links([['Start a focus session','studio'],['Group focus preview','rooms']]));
let soloTree=null,soloOutcome='';
function updateSoloGrove(){
  const now=Date.now();
  if(soloTree&&now>=soloTree.end&&focusEnd<=now){
    forestTree(soloTree.id,Math.round((soloTree.end-soloTree.start)/60000));
    soloTree=null;soloOutcome='grown';
  }
  const box=el('#solo-grove');
  if(box)box.innerHTML=soloTree?treePicture((now-soloTree.start)/(soloTree.end-soloTree.start))+'<p>Growing while you focus.</p>':soloOutcome==='withered'?treePicture(.55,true)+'<p>The fox watches the tree wither.</p>':soloOutcome==='grown'?treePicture()+'<p>A tree joined your grove.</p>':treePicture(.15)+'<p>Start the timer to grow a tree.</p>';
}
setInterval(updateSoloGrove,1000);
const groveStudio=views.studio,groveStudioBind=bindings.studio;
views.studio=()=>groveStudio()+wavePanel('Focus Grove','<div id="solo-grove"></div>'+w5Link('View grove','grove'));
bindings.studio=()=>{
  groveStudioBind();updateSoloGrove();
  const start=el('#focus-start'),previous=start.onclick;
  start.onclick=event=>{
    previous.call(start,event);
    if(focusEnd>Date.now()&&!soloTree){soloTree={id:crypto.randomUUID(),start:Date.now(),end:focusEnd};soloOutcome='';updateSoloGrove();}
  };
  for(const button of [el('#focus-pause'),el('#focus-reset')]){
    const action=button.onclick;
    button.onclick=event=>{if(soloTree){soloTree=null;soloOutcome='withered';}action.call(button,event);updateSoloGrove();};
  }
};
function markGroupGrove(room){
  if(!room.grove)return;
  const end=room.grove.end,box=el('#group-grove');
  if(room.grove.withered){
    if(box)box.innerHTML=treePicture(.6,true)+'<p>The fox watches the group tree wither.</p>';
    return;
  }
  if(Date.now()>=end){
    forestTree(room.grove.id,Math.round((end-room.grove.start)/60000),true);
    if(box)box.innerHTML=treePicture()+'<p>The group tree joined your grove.</p>';
  }else if(box)box.innerHTML=treePicture((Date.now()-room.grove.start)/(end-room.grove.start))+'<p>Group tree growing.</p>';
}
const groveRoom=views.rooms;
views.rooms=()=>groveRoom()+wavePanel('Group Grove · Gold preview','<div id="group-grove">'+treePicture(.15)+'<p>All members must stay until the group timer ends.</p></div>');
const witherSolo=()=>{
  if(soloTree&&Date.now()<soloTree.end){soloTree=null;soloOutcome='withered';focusEnd=0;}
};
window.addEventListener('hashchange',()=>{if(location.hash!=='#studio')witherSolo();});
window.addEventListener('pagehide',witherSolo);
async function classOptions(form){
  const {own,joined}=await exp('classes');
  if(!form.isConnected)return;
  form.elements.code.replaceChildren();
  for(const row of [...new Map([...own,...joined].map(row=>[row.code,row])).values()]){
    const option=document.createElement('option');option.value=row.code;option.textContent=row.title;
    form.elements.code.append(option);
  }
  if(!form.elements.code.options.length){const option=document.createElement('option');option.textContent='Join a class first';option.value='';form.elements.code.append(option);}
}
views.doubling=()=>wavePanel('Class-only focus sessions · Gold and Diamond','<p>Sessions are available to enrolled class members only. Share your goal with students in the session before quiet co-work, then check in when the time ends. Calls and cameras are not hosted here.</p><form id="slot-create" class="stack">'+selectField('code','Class',['Loading…'])+field('title','Session title','text','required maxlength="80"')+field('start','Start time','datetime-local','required')+selectField('duration','Minutes',['15','25','45','60'])+'<button class="primary">Book a slot</button></form><div id="slot-list"></div><p id="slot-status" role="status"></p>'+w5Link('Join a class','classmode'));
bindings.doubling=()=>{
  const form=el('#slot-create'),status=el('#slot-status'),gallery=el('#slot-list');
  let timer;
  classOptions(form).catch(error=>status.textContent=error.message);
  async function refreshSlots(){
    clearInterval(timer);
    try{
      const {slots,eligible}=await w5('slots');
      form.querySelector('button').disabled=!eligible;
      gallery.innerHTML=slots.map(slot=>{
        const end=slot.starts+slot.duration*60000, joined=slot.goal!==null;
        return '<article class="panel"><h3>'+esc(slot.title)+'</h3><p>'+esc(slot.class_name)+' · '+esc(new Date(slot.starts).toLocaleString())+' · '+slot.people+' joined</p><p data-session-end="'+end+'" data-session-start="'+slot.starts+'"></p>'+
          (joined?'<p>Your goal: '+esc(slot.goal)+'</p><details data-slot-goals="'+slot.id+'"><summary>Session goals</summary><div></div></details>':'<form class="stack" data-slot-join="'+slot.id+'">'+field('goal','Your goal','text','required maxlength="200"')+'<button class="ghost">Join session</button></form>')+
          (joined?'<form class="stack" data-slot-check="'+slot.id+'">'+selectField('answer','Did you hit your goal?',['Yes','Partly','Not yet'])+'<button class="ghost" '+(slot.checkin?'disabled':'')+'>Save check-in</button></form>':'')+(slot.checkin?'<p>Check-in: '+esc(slot.checkin)+'</p>':'')+'</article>';
      }).join('')||'<p>No sessions are scheduled in your classes.</p>';
      for(const panel of gallery.querySelectorAll('[data-slot-goals]'))panel.ontoggle=async()=>{
        if(!panel.open)return;
        const goalList=el('div',panel);
        try{const {goals}=await w5('slot-room/'+panel.dataset.slotGoals);goalList.innerHTML='<ul>'+goals.map(item=>'<li>'+esc(item.name)+': '+esc(item.goal)+'</li>').join('')+'</ul>';}
        catch(error){goalList.textContent=error.message;}
      };
      for(const f of gallery.querySelectorAll('[data-slot-join]'))wired(f,args=>operation('slot',{...args,id:f.dataset.slotJoin,action:'join'},'Session joined.'));
      for(const f of gallery.querySelectorAll('[data-slot-check]'))wired(f,args=>operation('slot',{...args,id:f.dataset.slotCheck,action:'checkin'},'Check-in saved.'));
      function tick(){
        if(!gallery.isConnected){clearInterval(timer);return;}
        gallery.querySelectorAll('[data-session-end]').forEach(node=>{
          const now=Date.now(),remaining=Math.max(0,Math.ceil((+node.dataset.sessionEnd-now)/1000));
          node.textContent=now<+node.dataset.sessionStart?'Scheduled':remaining?Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0')+' remaining':'Session ended';
        });
      }
      tick();timer=setInterval(tick,1000);
    }catch(error){status.textContent=error.message;}
  }
  async function operation(path,args,message){try{await w5(path,args);await refreshSlots();status.textContent=message;}catch(error){status.textContent=error.message;}}
  wired(form,args=>operation('slots',{...args,starts:new Date(args.start).getTime(),duration:+args.duration},'Focus slot booked.'));
  void refreshSlots();
};
const exploreTopics={
 'Human anatomy':[['Skin','The outer barrier protects underlying tissues.','outer'],['Muscle','Muscles contract and pull on bones to move joints.','muscle'],['Skeleton','Bones give the body structure and protect organs.','core']],
 'Solar system':[['Outer planets','The four giant planets orbit farther from the Sun.','outer'],['Inner planets','The four planets nearer the Sun have rocky surfaces.','middle'],['Sun','The Sun’s gravity holds the planetary system together.','core']],
 'Water molecule':[['Molecule','Water consists of two hydrogen atoms bonded to oxygen.','outer'],['Bonds','The two bonds share electrons with oxygen.','middle'],['Oxygen','The oxygen atom pulls the shared electrons more strongly than hydrogen.','core']],
 'Stone arch':[['Deck','The deck carries the load above the arch.','outer'],['Arch ring','Wedge-shaped stones transfer force along the curve.','middle'],['Abutments','Supports at the ends resist outward thrust.','core']]
};
views.explore=()=>wavePanel('Peel back the layers · Diamond showcase','<p>Open a topic, then tap the diagram or choose a labeled layer. The diagrams are simplified and use different color layers.</p><label>Topic<select id="explore-topic">'+Object.keys(exploreTopics).map(topic=>'<option>'+esc(topic)+'</option>').join('')+'</select></label><div id="explore-contents"></div>');
bindings.explore=()=>{
  const select=el('#explore-topic'),target=el('#explore-contents');
  const icons=['🧍','☀️','💧','🌉'];
  function render(index=0){
    const layers=exploreTopics[select.value],[label,description,color]=layers[index];
    target.innerHTML='<button class="explore-figure '+color+'" id="explore-next" aria-label="Explore next layer"><span aria-hidden="true">'+icons[select.selectedIndex]+'</span><strong>'+esc(label)+'</strong></button><div class="actions">'+layers.map(([name],i)=>'<button class="ghost" data-layer="'+i+'" aria-pressed="'+(i===index)+'">'+esc(name)+'</button>').join('')+'</div><p class="notice">'+esc(description)+'</p><button class="ghost" id="explore-talk">Fox narration</button>';
    el('#explore-next').onclick=()=>render((index+1)%layers.length);
    target.querySelectorAll('[data-layer]').forEach(button=>button.onclick=()=>render(+button.dataset.layer));
    el('#explore-talk').onclick=()=>{if(window.speechSynthesis&&window.SpeechSynthesisUtterance){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(description));}};
  }
  select.onchange=()=>render();render();
};
function downloadWave5(name,body,type='text/plain'){
  const url=URL.createObjectURL(new Blob([body],{type})),link=document.createElement('a');
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
views.papers=()=>wavePanel('Class past-paper bank','<p>Browse materials from classes you’ve joined. Only upload material you’re allowed to share. Current or unadministered exams are prohibited.</p><label>Search your classes’ papers<input id="paper-search" type="search"></label><div id="paper-results"></div><form id="paper-add" class="stack">'+selectField('code','Class',['Loading…'])+field('title','Title','text','required maxlength="100"')+selectField('kind','Material',['Past test','Quiz','Worksheet'])+'<label>Optional text file<input id="paper-file" type="file" accept=".txt,.md,text/plain"></label>'+field('body','Study material','textarea','required maxlength="8500"')+'<label class="remove-avatar"><input type="checkbox" name="safe" required> I have permission to share this material. It is not a current or unadministered exam.</label><button class="primary">Upload study material</button></form><p id="paper-status" role="status"></p>');
bindings.papers=()=>{
  const form=el('#paper-add'),status=el('#paper-status'),results=el('#paper-results');
  let rows=[];
  el('#paper-file').onchange=async event=>{const file=event.currentTarget.files[0];if(file){try{form.elements.body.value=(await file.text()).slice(0,8500);}catch{status.textContent='That file could not be read.';}}};
  classOptions(form).catch(()=>{});
  function render(){
    const search=el('#paper-search').value.trim().toLowerCase();
    results.innerHTML=rows.filter(row=>(row.title+' '+row.kind+' '+row.class_name).toLowerCase().includes(search)).map(row=>'<details data-paper="'+row.id+'"><summary>'+esc(row.title)+' · '+esc(row.class_name)+'</summary><div class="paper-preview"></div><div class="actions"><button class="ghost paper-open">Read material</button><button class="ghost paper-report">Report</button>'+(row.moderator?'<button class="ghost paper-remove">Take down ('+row.reports+' reports)</button>':'')+'</div><form class="stack paper-report-form" hidden>'+field('reason','Reason for reporting','text','required maxlength="250"')+'<button class="primary">Send report to teacher</button></form></details>').join('')||'<p>No matching class materials.</p>';
    for(const item of results.querySelectorAll('[data-paper]')){
      const id=item.dataset.paper,f=el('.paper-report-form',item);
      el('.paper-report',item).onclick=()=>{f.hidden=!f.hidden;};
      el('.paper-open',item).onclick=async()=>{
        try{const data=await w5('paper',{id,action:'read'}),area=el('.paper-preview',item);
          area.innerHTML='<p class="result-copy">'+esc(data.body)+'</p>'+(data.download?'<button class="ghost paper-download">Download pack</button>':'');
          const download=el('.paper-download',area);if(download)download.onclick=()=>downloadWave5('donezo-past-paper.txt',data.title+'\n\n'+data.body);
        }catch(error){status.textContent=error.message;}
      };
      wired(f,async args=>{try{await w5('paper',{...args,id,action:'report'});f.hidden=true;status.textContent='Report recorded for the teacher.';}catch(error){status.textContent=error.message;}});
      const remove=el('.paper-remove',item);
      if(remove)remove.onclick=async()=>{if(!confirm('Take this material down for this class?'))return;try{await w5('paper',{id,action:'remove'});await refresh();}catch(error){status.textContent=error.message;}};
    }
  }
  async function refresh(){
    try{const data=await w5('papers');rows=data.papers;form.querySelector('button').disabled=!data.eligible;render();}
    catch(error){status.textContent=error.message;}
  }
  el('#paper-search').oninput=render;
  wired(form,async args=>{try{await w5('papers',{...args,safe:form.elements.safe.checked});form.reset();await refresh();status.textContent='Material uploaded.';}catch(error){status.textContent=error.message;}});
  void refresh();
};
const honorRules=['Answers OK','Hints Only','Learn Mode Locked'];
let honorActive=read('w5-honor',null);
views.honor=()=>wavePanel('The AI that follows YOUR rules.','<p>Teachers set a rule per Donezo class assignment. Open the assignment workspace to apply the rule to answer tools until you leave it.</p><div id="honor-items"></div><p id="honor-status" role="status"></p><button class="ghost" id="honor-leave">Leave assignment workspace</button>'+w5Link('Class Mode','classmode'));
bindings.honor=()=>{
  const target=el('#honor-items'),status=el('#honor-status');
  el('#honor-leave').onclick=()=>{honorActive=null;save('w5-honor',null);show();};
  (async()=>{
    try{
      const {work}=await w5('honor');
      target.innerHTML=work.map(item=>'<article class="panel"><h3>'+esc(item.title)+'</h3><p>'+esc(item.class_name)+' · Rule: '+esc(item.honor)+'</p>'+(item.editable?'<form class="stack" data-honor-set="'+item.id+'">'+selectField('rule','AI rule',honorRules)+'<button class="primary">Save rule</button></form>':'<button class="primary" data-honor-open="'+item.id+'">Open assignment workspace</button>')+'</article>').join('')||'<p>No assignments from your classes yet.</p>';
      target.querySelectorAll('[data-honor-set]').forEach(form=>{
        form.elements.rule.value=work.find(item=>item.id===form.dataset.honorSet).honor;
        wired(form,async args=>{try{await w5('honor',{id:form.dataset.honorSet,...args});show();}catch(error){status.textContent=error.message;}});
      });
      target.querySelectorAll('[data-honor-open]').forEach(button=>button.onclick=()=>{
        const item=work.find(row=>row.id===button.dataset.honorOpen);
        honorActive=item;save('w5-honor',item);location.hash='snap';
      });
    }catch(error){status.textContent=error.message;}
  })();
};
const classHonorView=views.classmode;
views.classmode=()=>classHonorView()+wavePanel('Honor Mode',w5Link('Manage or open an assignment workspace','honor'));
const planBeforeFive=nightlyPlan;
nightlyPlan=function(){
  if(read('w5-mood',{}).day!==waveDate(0)||read('w5-mood',{}).level!=='Fried')return planBeforeFive();
  const next=getTasks().filter(task=>!task.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'))[0];
  return next?'<p>One thing for today: <strong>'+esc(next.title)+'</strong> · 10 minutes. Take a break after that.</p>':'<p>No urgent work in your tracker. Take a break.</p>';
};
const baseGuideFive=answerGuide;
answerGuide=function(message){
  if(honorActive&&honorActive.honor!=='Answers OK')return ['Your teacher set '+honorActive.title+' to '+honorActive.honor+'. Start with what you know, identify what you’re solving for, and write one step you can justify.','honor'];
  return baseGuideFive(message);
};
const blockedFive=new Set(['snap','school','studio','notelab','workcheck','minisolvers','slides','capture','projects','test','mock','voice','ap','graph','learn','review','arena','battles','path']);
const baseShowFive=show;
show=function(focus){
  const hash=location.hash.slice(1),route=hash==='planner'?'projects':hash;
  if(honorActive&&honorActive.honor!=='Answers OK'&&blockedFive.has(route)){
    main.innerHTML=wavePanel('Honor Mode · '+esc(honorActive.honor),'<p>Your teacher set this rule for '+esc(honorActive.title)+'.</p><ol class="steps"><li>Write the given information and the question in your own words.</li><li>Choose a method and explain why it fits.</li><li>Try one step. Check that it preserves the original meaning or quantities.</li></ol>'+w5Link('Return to the assignment workspace','honor'));
    if(focus)main.focus({preventScroll:true});
    return;
  }
  baseShowFive(focus);
  if(honorActive)main.insertAdjacentHTML('afterbegin','<p class="notice">Assignment workspace · '+esc(honorActive.title)+' · '+esc(honorActive.honor)+' <a class="ghost quick" href="#honor">View rule</a></p>');
  if(honorActive&&honorActive.honor!=='Answers OK'&&route==='dashboard'){
    const form=el('#tutor-form');
    if(form){form.querySelector('button').disabled=true;form.insertAdjacentHTML('afterend','<p>Direct tutor answers are paused in this assignment workspace.</p>');}
  }
};
const examProfiles={
  'Two-subject entrance exam':[['Reading & Writing',27,32],['Reading & Writing',27,32],['Entrance Math',22,35],['Entrance Math',22,35]],
  'Three-subject entrance exam':[['English Skills',50,35],['Applied Math',45,50],['Reading & Writing',36,40]],
  'Three-subject exam + Science':[['English Skills',50,35],['Applied Math',45,50],['Reading & Writing',36,40],['Science Reasoning',40,40]]
};
function mockBank(topic,count,offset){
  const originals=practice[topic];
  return Array.from({length:count},(_,i)=>{
    const j=i+offset;
    if(j<originals.length)return originals[j];
    const n=j+11,a=n+5,b=n*3+7,right=(j+7)%4;
    let prompt,choices,why;
    if(topic.includes('Math')){
      prompt='Solve '+a+'x + '+b+' = '+(a*n+b)+'.';
      choices=[String(n-1),String(n+2),String(n+3),String(n+1)];choices[right]=String(n);
      why='Subtract '+b+' and divide by '+a+'.';
    }else if(topic.includes('Science')){
      prompt='A sample changed from '+a+' to '+b+' grams in '+n+' minutes. Which expression gives the average change in grams per minute?';
      choices=[a+' / '+n,b+' / '+n,'('+a+' + '+b+') / '+n,'('+a+' − '+b+') / '+n];choices[right]='('+b+' − '+a+') / '+n;why='Subtract the initial measurement and divide by elapsed time.';
    }else{
      const subjects=['research notes','practice sheets','draft reports','survey responses','student journals','study plans','lesson outlines'];
      const nouns=subjects[j%subjects.length];
      prompt=topic==='English Skills'?'Choose the correct verb: The '+nouns+' from group '+n+' ___ ready for review.':'A class collected '+a+' '+nouns+' before a workshop and '+b+' afterward. Which statement is directly supported by these observations?';
      choices=topic==='English Skills'?['is','was','has been','be']:['Fewer were collected afterward','The workshop caused the change','The totals were the same','Every student submitted work'];choices[right]=topic==='English Skills'?'are':'More were collected afterward';
      why=topic==='English Skills'?'Use a plural verb with the plural subject.':'Compare the two counts. The figures alone do not establish a cause.';
    }
    return [prompt,choices,right,why];
  });
}
views.mock=()=>wavePanel('Full mock exam','<p>Original Donezo questions use published section counts and time limits. Scaled estimates are practice estimates without official equating or adaptive scoring. One full mock is available free per browser.</p><form id="mock-start" class="stack">'+selectField('format','Format',Object.keys(examProfiles))+selectField('className','Weak-Spot Radar class',['General study',...allClasses().map(item=>item.name)])+field('goal','Score goal (optional)','number','min="1" max="1600"')+'<button class="primary">Start full mock</button></form><div id="mock-session"></div><p id="mock-status" role="status"></p>');
bindings.mock=()=>{
  const form=el('#mock-start'),area=el('#mock-session'),status=el('#mock-status');
  let run=read('w5-mock-state',null),timer;
  const saveRun=()=>save('w5-mock-state',run);
  const formatCount=format=>examProfiles[format].reduce((n,row)=>n+row[1],0);
  function summary(report){
    area.innerHTML='<h3>Mock exam report</h3><p class="answer">'+report.correct+' / '+report.total+' correct</p><p>Estimated scaled score: '+report.estimate+' · '+(report.goal?'Gap to goal: '+Math.max(0,report.goal-report.estimate)+' points.':'Set a goal on the next practice run.')+'</p><ol class="steps">'+report.sections.map(row=>'<li>'+esc(row.topic)+' · '+row.correct+'/'+row.count+' correct · '+row.answered+' answered · '+row.minutes.toFixed(1)+' minutes used</li>').join('')+'</ol><h3>Three-week plan</h3><ol class="steps"><li>Week 1: Review '+esc(report.weak)+' and redo missed questions without a timer.</li><li>Week 2: Use three short timed sets. Set a checkpoint halfway through each set.</li><li>Week 3: Retake a timed section and compare accuracy and pace.</li></ol>';
  }
  function finish(){
    clearInterval(timer);
    const total=formatCount(run.format),correct=run.sections.reduce((sum,row)=>sum+row.correct,0),two=run.format.startsWith('Two');
    const core=two?run.sections:run.sections.slice(0,3),coreCorrect=core.reduce((sum,row)=>sum+row.correct,0),coreTotal=core.reduce((sum,row)=>sum+row.count,0),rate=coreCorrect/coreTotal;
    const report={correct,total,className:run.className==='General study'?undefined:run.className,estimate:two?Math.round((400+1200*rate)/10)*10:Math.round(1+35*rate),goal:run.goal,sections:run.sections,weak:run.sections.slice().sort((a,b)=>a.correct/a.count-b.correct/b.count)[0].topic};
    save('w5-mock-report',report);save('w5-mock-used',true);run=null;saveRun();
    earn('Full Mock Exam',20,report.className,rate,'mock');
    form.hidden=false;summary(report);
  }
  function nextSection(){
    const [topic,count,minutes]=examProfiles[run.format][run.index],bank=currentBank();
    const scored=bank.filter((item,i)=>run.answers[i]===item[2]).length;
    run.sections.push({topic,count,correct:scored,answered:Object.keys(run.answers).length,minutes:Math.max(0,Math.min(minutes,(Date.now()-run.start)/60000))});
    run.index++;run.cursor=0;run.answers={};run.start=null;run.end=null;
    if(run.format.startsWith('Two')&&run.index===2)run.breakEnd=Date.now()+600000;
    saveRun();
    if(run.index>=examProfiles[run.format].length)finish();else render();
  }
  function currentBank(){
    const format=examProfiles[run.format],topic=format[run.index][0],previous=format.slice(0,run.index).filter(row=>row[0]===topic).reduce((sum,row)=>sum+row[1],0);
    return mockBank(topic,format[run.index][1],previous);
  }
  function render(){
    if(!run)return;
    clearInterval(timer);form.hidden=true;
    const [topic,count,minutes]=examProfiles[run.format][run.index];
    if(run.breakEnd>Date.now()){
      area.innerHTML='<h3>Scheduled break</h3><p id="mock-break"></p><button class="ghost" id="skip-mock-break">Skip break for practice</button>';
      el('#skip-mock-break').onclick=()=>{run.breakEnd=null;saveRun();render();};
      function breakTick(){
        if(!area.isConnected){clearInterval(timer);return;}
        const left=Math.max(0,Math.ceil((run.breakEnd-Date.now())/1000));
        if(!left){run.breakEnd=null;saveRun();render();return;}
        el('#mock-break').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0')+' remaining';
      }
      breakTick();timer=setInterval(breakTick,500);return;
    }
    if(!run.end){
      area.innerHTML='<h3>Ready for module '+(run.index+1)+'</h3><p>'+esc(topic)+' · '+count+' questions · '+minutes+' minutes</p><button class="primary" id="begin-mock-module">Start module timer</button>';
      el('#begin-mock-module').onclick=()=>{run.start=Date.now();run.end=run.start+minutes*60000;saveRun();render();};
      return;
    }
    if(Date.now()>=run.end){nextSection();return;}
    const item=currentBank()[run.cursor];
    area.innerHTML='<div class="notice" id="mock-clock"></div><h3>'+esc(topic)+' · '+(run.cursor+1)+' / '+count+'</h3><p>'+esc(item[0])+'</p><fieldset><legend>Choose an answer</legend>'+item[1].map((choice,i)=>'<label class="remove-avatar"><input type="radio" name="mock-choice" value="'+i+'" '+(run.answers[run.cursor]===i?'checked':'')+'> '+esc(choice)+'</label>').join('')+'</fieldset><div class="actions"><button class="ghost" id="mock-back" '+(run.cursor===0?'disabled':'')+'>Previous</button><button class="primary" id="mock-next" '+(run.cursor===count-1?'disabled':'')+'>Next</button><button class="ghost" id="mock-end">Submit module</button></div>';
    area.querySelectorAll('[name=mock-choice]').forEach(input=>input.onchange=()=>{run.answers[run.cursor]=+input.value;saveRun();});
    el('#mock-back').onclick=()=>{run.cursor--;saveRun();render();};
    el('#mock-next').onclick=()=>{run.cursor++;saveRun();render();};
    el('#mock-end').onclick=()=>{if(confirm('Submit this module? You cannot return to it.'))nextSection();};
    function tick(){
      if(!area.isConnected){clearInterval(timer);return;}
      const seconds=Math.max(0,Math.ceil((run.end-Date.now())/1000));
      if(!seconds){nextSection();return;}
      el('#mock-clock').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' remaining';
    }
    tick();timer=setInterval(tick,500);
  }
  wired(form,async args=>{
    await retrieveAccount();
    if(read('w5-mock-used',false)&&!['Gold','Diamond'].includes(activeAccount?.tier)){status.textContent='Your free full mock is complete. Gold and Diamond can start another.';return;}
    const goal=+args.goal||0,two=args.format.startsWith('Two');
    if(goal&&(two?(goal<400||goal>1600):goal>36)){status.textContent='Choose a goal on the selected score scale.';return;}
    run={format:args.format,className:args.className,goal,index:0,cursor:0,answers:{},start:null,end:null,sections:[]};saveRun();render();
  });
  if(run)render();else{const last=read('w5-mock-report',null);if(last)summary(last);}
};
const offlineClassNames=()=>[...new Set([...allClasses().map(item=>item.name),'General study'])];
function packText(name,notes){
  const deck=read('deck',[]),due=reviewCards(),source=notes.trim()||read('note-lab-source','');
  const recap=source.split(/\n|(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean).slice(0,8);
  const items=(title,rows)=>'<h2>'+title+'</h2>'+(rows.length?'<ul>'+rows.map(([a,b])=>'<li><strong>'+esc(a)+'</strong> — '+esc(b)+'</li>').join('')+'</ul>':'<p>No cards saved.</p>');
  const tasks=getTasks().filter(task=>task.className===name&&!task.done);
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Donezo offline pack</title><style>body{margin:2rem auto;max-width:42rem;padding:0 1rem;font:1.05rem/1.55 system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Donezo offline pack · '+esc(name)+'</h1><p>Saved '+waveDate(0)+'. Cards include the current local deck and due queue.</p><h2>Class notes</h2><pre>'+esc(source)+'</pre><h2>Study podcast transcript</h2><button id="play-recap">Play with an offline voice</button> <button id="stop-recap">Stop</button><p id="recap-play-status" role="status"></p><ol id="pack-recap">'+recap.map((s,i)=>'<li><strong>Host '+(i%2?'B':'A')+'</strong>: '+esc(s)+'</li>').join('')+'</ol>'+items('Due today',due)+items('Saved deck',deck)+'<h2>Class assignments</h2><ul>'+tasks.map(task=>'<li>'+esc(task.title)+' · '+esc(task.due)+'</li>').join('')+'</ul><script>const state=document.querySelector("#recap-play-status");document.querySelector("#play-recap").onclick=()=>{if(!window.speechSynthesis){state.textContent="No offline voice is available.";return;}const local=speechSynthesis.getVoices().filter(v=>v.localService);const lines=[...document.querySelectorAll("#pack-recap li")];if(!local.length||!lines.length){state.textContent="Add notes and use a device with a local voice.";return;}speechSynthesis.cancel();for(const [i,line] of lines.entries()){const speech=new SpeechSynthesisUtterance(line.textContent);speech.voice=local[i%local.length];speechSynthesis.speak(speech);}state.textContent="Playing with a local voice."};document.querySelector("#stop-recap").onclick=()=>{window.speechSynthesis?.cancel();state.textContent="Stopped."};</script></html>';
}
views.offline=()=>wavePanel('Download my pack · Free','<p>Save a standalone file with your selected class’s notes and assignments, the current local deck, review queue and podcast transcript. You can open it offline. The transcript can play if your device has a local speech voice.</p><form id="offline-pack" class="stack">'+selectField('name','Class',offlineClassNames())+field('notes','Class notes (optional)','textarea','maxlength="20000"')+'<button class="primary">Preview download size</button></form><p id="pack-size" role="status"></p><button class="ghost" id="pack-download" disabled>Download my pack</button>');
bindings.offline=()=>{
  let html='';
  const form=el('#offline-pack'),button=el('#pack-download');
  form.oninput=()=>{button.disabled=true;el('#pack-size').textContent='Preview the updated size.';};
  wired(form,data=>{html=packText(data.name,data.notes);el('#pack-size').textContent=(new Blob([html]).size/1024).toFixed(1)+' KB download';button.disabled=false;});
  button.onclick=()=>downloadWave5('donezo-offline-pack.html',html,'text/html');
};
const accessState=()=>read('w5-access',{font:false,ruler:false,spacing:'Standard',contrast:false});
const ruler=document.createElement('div');ruler.className='reading-ruler';ruler.hidden=true;ruler.setAttribute('aria-hidden','true');document.body.append(ruler);
let rulerY=160;
function positionRuler(y){rulerY=Math.max(0,Math.min(window.innerHeight-50,y));ruler.style.top=rulerY+'px';}
function applyAccess(){
  const prefs=accessState(),root=document.documentElement;
  root.classList.toggle('reading-font',prefs.font);root.classList.toggle('high-contrast',prefs.contrast);root.dataset.spacing=prefs.spacing.toLowerCase();
  ruler.hidden=!prefs.ruler;positionRuler(rulerY);
}
document.addEventListener('pointermove',event=>{if(!ruler.hidden&&!event.buttons)positionRuler(event.clientY);});
document.addEventListener('keydown',event=>{if(!ruler.hidden&&event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();positionRuler(rulerY+(event.key==='ArrowUp'?-24:24));}});
views.access=()=>wavePanel('Accessibility · Free forever','<p>Donezo uses WCAG and Section 508 as design targets. A complete accessibility audit and formal conformance determination have not been completed.</p><form id="access-form" class="stack"><label class="remove-avatar"><input type="checkbox" name="font"> Easier-to-read font</label><label class="remove-avatar"><input type="checkbox" name="ruler"> Reading ruler</label>'+selectField('spacing','Text spacing',['Standard','Relaxed','Wide'])+'<label class="remove-avatar"><input type="checkbox" name="contrast"> High contrast</label><button class="primary">Save reading preferences</button></form><p id="access-state" role="status"></p><h3>Keyboard and audio</h3><p>Use Tab and Shift+Tab to move, Enter to activate controls, and Alt+Up or Alt+Down to position the reading ruler. Study podcast scripts and voice answers are visible as text. For imported media, captions depend on the supplied transcript.</p>');
bindings.access=()=>{
  const form=el('#access-form'),prefs=accessState();
  for(const key of ['font','ruler','contrast'])form.elements[key].checked=prefs[key];
  form.elements.spacing.value=prefs.spacing;
  wired(form,data=>{save('w5-access',{font:form.elements.font.checked,ruler:form.elements.ruler.checked,spacing:data.spacing,contrast:form.elements.contrast.checked});applyAccess();el('#access-state').textContent='Reading preferences saved.';});
};
const scheduledStudy=()=>read('w5-study-hours',{enabled:false,start:'17:00',end:'19:00'});
function withinStudyHours(){
  const pref=scheduledStudy(),now=new Date().toTimeString().slice(0,5);
  return pref.enabled&&(pref.start<=pref.end?now>=pref.start&&now<pref.end:now>=pref.start||now<pref.end);
}
const studyHourView=views.settings,studyHourBind=bindings.settings;
views.settings=()=>studyHourView()+wavePanel('Study Hours','<p>During your scheduled window, the Tool Studio defaults to Learn Mode.</p><form id="study-hours" class="stack"><label class="remove-avatar"><input type="checkbox" name="enabled"> Enable Study Hours</label>'+field('start','Start','time','required')+field('end','End','time','required')+'<button class="primary">Save Study Hours</button></form><p id="study-hours-status" role="status"></p>');
bindings.settings=()=>{
  studyHourBind();
  const form=el('#study-hours'),pref=scheduledStudy();
  form.elements.enabled.checked=pref.enabled;form.elements.start.value=pref.start;form.elements.end.value=pref.end;
  wired(form,data=>{save('w5-study-hours',{enabled:form.elements.enabled.checked,start:data.start,end:data.end});el('#study-hours-status').textContent='Study Hours saved.';});
};
const trackLabel={Money:'Money Basics',Career:'Career Essentials','Life Admin':'Life Admin','The Game':'Life Skills and Strategy'};
function certUrl(code){return location.origin+location.pathname+'?certificate='+encodeURIComponent(code)+'#certs';}
function certPreview(cert){
  return '<article class="panel certificate"><p class="eyebrow">DONEZO CERTIFICATE</p><h3>Completed Donezo '+esc(trackLabel[cert.track]??cert.track)+'</h3><p>'+esc(cert.name)+' · '+esc(new Date(cert.date).toLocaleDateString())+'</p><p>Course completion only.</p></article>';
}
views.certs=()=>{
  const token=new URLSearchParams(location.search).get('certificate');
  return token?wavePanel('Verify a Donezo certificate','<div id="cert-verify"><p>Checking certificate…</p></div>'):wavePanel('Vault Certificates · Diamond','<p>Complete all eight lessons in a track to earn a verifiable course-completion certificate. Sharing its link reveals the name on your certificate.</p><div id="cert-list"></div><p id="cert-message" role="status"></p>');
};
bindings.certs=()=>{
  const token=new URLSearchParams(location.search).get('certificate');
  if(token){
    w5('verify/'+encodeURIComponent(token)).then(({cert})=>{const area=el('#cert-verify');if(area)area.innerHTML=certPreview(cert)+'<p>Verified Donezo completion record.</p>';}).catch(error=>emptyExp('#cert-verify',error.message));
    return;
  }
  const list=el('#cert-list'),status=el('#cert-message');
  async function render(){
    try{
      const {progress,certificates,eligible}=await w5('certificates');
      if(!list.isConnected)return;
      list.innerHTML=Object.entries(vault).map(([track,lessons])=>'<section class="panel"><h3>'+esc(trackLabel[track])+'</h3><p>'+progress.filter(item=>item.track===track).length+' / '+lessons.length+' completed</p>'+lessons.map(([label,copy],i)=>{
        const done=progress.some(row=>row.track===track&&row.lesson===i);
        return '<details><summary>'+esc(label)+(done?' ✓':'')+'</summary><p>'+esc(eligible?copy:'Diamond access unlocks this lesson.')+'</p>'+(eligible&&!done?'<button class="ghost" data-cert-track="'+esc(track)+'" data-cert-lesson="'+i+'">Mark lesson complete</button>':'')+'</details>';
      }).join('')+'</section>').join('')+certificates.map(cert=>certPreview(cert)+'<p><a class="ghost" href="'+esc(certUrl(cert.code))+'">Open verification link</a> <button class="ghost" data-share-cert="'+cert.code+'">Share certificate</button></p>').join('');
      list.querySelectorAll('[data-cert-track]').forEach(button=>button.onclick=async()=>{
        try{await w5('certificates',{track:button.dataset.certTrack,lesson:+button.dataset.certLesson});await render();status.textContent='Lesson saved.';}catch(error){status.textContent=error.message;}
      });
      list.querySelectorAll('[data-share-cert]').forEach(button=>button.onclick=()=>shareText('Donezo Certificate',certUrl(button.dataset.shareCert),status));
    }catch(error){status.textContent=error.message;}
  }
  void render();
};
const certVault=views.vault;
views.vault=()=>certVault()+wavePanel('Earn your course-completion certificate',w5Link('Open certificate tracks','certs'));
const certificatesReport=views.reports,certsReportBind=bindings.reports;
views.reports=()=>certificatesReport()+wavePanel('Vault completion certificates','<div id="report-certificates"></div>'+w5Link('View Vault certificates','certs'));
bindings.reports=()=>{
  certsReportBind();
  w5('certificates').then(({certificates})=>{
    const target=el('#report-certificates');if(target)target.innerHTML=certificates.map(cert=>certPreview(cert)+'<a class="ghost" href="'+esc(certUrl(cert.code))+'">Verify certificate</a>').join('')||'<p>No certificates yet.</p>';
  }).catch(()=>emptyExp('#report-certificates','Sign in to see certificates.'));
};
const dashWaveFive=views.dashboard,dashBindFive=bindings.dashboard;
views.dashboard=()=>dashWaveFive()+wavePanel('How fried are you today?','<div class="actions">'+['Ready','A little tired','Fried'].map(level=>'<button class="ghost" data-mood="'+level+'">'+level+'</button>').join('')+'</div><div id="light-plan">'+nightlyPlan()+'</div>')+wavePanel('Focus Grove',forestMarkup()+w5Link('Open your grove','grove'))+wavePanel((new Date().getMonth()===11||[4,5].includes(new Date().getMonth()))?'Your season recap is ready':'Study recap',w5Link('View Donezo Wrapped','wrapped'));
bindings.dashboard=()=>{
  dashBindFive();
  document.querySelectorAll('[data-mood]').forEach(button=>button.onclick=()=>{
    save('w5-mood',{day:waveDate(0),level:button.dataset.mood});
    el('#light-plan').innerHTML=nightlyPlan();
  });
};
const wrappedProfile=document.createElement('a');
wrappedProfile.href='#wrapped';wrappedProfile.className='ghost';wrappedProfile.textContent='View Donezo Wrapped';
wrappedProfile.onclick=()=>wrappedProfile.closest('dialog')?.close?.();
const profileFormW5=el('#profile-form');
profileFormW5.append(wrappedProfile);
const mediaViewFive=views.capture,mediaBindFive=bindings.capture;
views.capture=()=>mediaViewFive()+wavePanel('Media captions','<label>Add a caption file for this media (optional)<input type="file" id="caption-file" accept=".vtt,text/vtt"></label><p id="caption-note" role="status"></p>');
bindings.capture=()=>{
  mediaBindFive();
  let captionUrl;
  const control=el('#caption-file');
  control.onchange=async()=>{
    const file=control.files[0],video=el('#media-preview');
    if(!file||!video)return;
    const text=await file.slice(0,200000).text().catch(()=>'');
    if(!/^WEBVTT(?:[ \t\r\n]|$)/.test(text)){emptyExp('#caption-note','Choose a valid caption file.');return;}
    el('track[data-caption]',video)?.remove();
    if(captionUrl)URL.revokeObjectURL(captionUrl);
    captionUrl=URL.createObjectURL(new Blob([text],{type:'text/vtt'}));
    const track=document.createElement('track');
    track.kind='captions';track.label='Uploaded captions';track.srclang='en';track.src=captionUrl;track.default=true;track.dataset.caption='true';
    video.append(track);emptyExp('#caption-note','Captions attached to the media preview.');
  };
  window.addEventListener('hashchange',()=>{if(captionUrl)URL.revokeObjectURL(captionUrl);},{once:true});
};
const accessibleFooter=document.createElement('a');accessibleFooter.href='#access';accessibleFooter.textContent='Accessibility';el('footer').append(accessibleFooter);
const visualMockPrep=views.test;
views.test=()=>visualMockPrep()+wavePanel('Practice a full sitting',w5Link('Open full mock exams','mock'));
const w5CompareRows=[
 ['Shareable study recaps',-1],['Focus grove and class co-work',-1],['Layered visual explorations',-1],['Class past-paper bank',-1],['Full mock exams',-1],['Free offline packs',-1],['Reading accessibility controls',-1],['Teacher-set Honor Mode',-1],['Verifiable Vault completion',-1],['Mood check-in and Study Hours',-1]
];
oldWayRows.push(...w5CompareRows);
const schoolsFive=views.pricing;
views.pricing=()=>schoolsFive()+wavePanel('The AI that follows YOUR rules.','<p>For Schools: set assignment rules using Answers OK, Hints Only, or Learn Mode Locked. The selected rule applies inside that assignment workspace.</p><p>Free: Wrapped, basic Grove, offline packs, accessibility, past-paper browsing, and one full mock. Gold and Diamond: class-only Body Doubling, past-paper uploads and packs, and unlimited mocks. Group Grove is a Gold preview. Diamond: Immersive Explorations and Vault certificates.</p>'+links([['Honor Mode','honor'],['Accessibility','access'],['Class Mode','classmode']]));
const homeWaveFive=views.home;
views.home=()=>homeWaveFive()+wavePanel('Wave 5 FAQ','<details><summary>What goes into my recap?</summary><p>Donezo uses your recorded activity and publishes a challenge percentile only with enough ranked students. You can open Wrapped from your profile.</p></details><details><summary>Can I work offline or adjust the reading display?</summary><p>Downloadable packs and all reading controls are free. Packs include text, cards and podcast transcripts. The Accessibility page explains current support.</p></details><details><summary>Who can join co-work or share past papers?</summary><p>Scheduled co-work and paper submissions are restricted to verified class memberships and eligible plans. Do not upload current or unadministered exams.</p></details><details><summary>How do Honor Mode and certificates work?</summary><p>The selected assignment rule guides the current assignment workspace. Vault certificates verify course completion only.</p></details>'+links(wave5Tabs.map(([key,title])=>[title,key])));
intents.unshift([/wrapped|recap cards/i,'wrapped'],[/grove|grow a tree/i,'grove'],[/body doubling|co-work/i,'doubling'],[/exploration|anatomy|solar system/i,'explore'],[/past paper|old exam/i,'papers'],[/mock exam|full mock/i,'mock'],[/offline|download .*pack/i,'offline'],[/accessib|dyslex|reading ruler|contrast|captions/i,'access'],[/honor mode|hints only|teacher rule/i,'honor'],[/certificate/i,'certs']);
applyAccess();
show();localize();
