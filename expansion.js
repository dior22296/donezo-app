const expansionTabs=[
 ['classmode','Class Mode','▥','Join a teacher’s class or assign student work.','projects'],
 ['semester','Semester Autopilot','▤','Turn dated syllabus lines into a semester plan.','projects'],
 ['portfolio','Process Portfolio','▧','Keep and share your writing history.','hero'],
 ['market','Notes Marketplace','◈','Prepare study material listings and seller profiles.','vault'],
 ['path','The Path','➜','Review weak topics in bite-size sessions.','test'],
 ['arena','Challenge Arena','⚡','Daily challenges, Rampage, and XP standings.','codes'],
 ['quests','Friend Quests','◇','Pair with a friend and track a shared goal.','celebration'],
 ['streaks','Streak Calendar','✦','Manage streak freezes and fox reminders.','empty']
];
for(const [key,title,icon,description,image] of expansionTabs){section(key,title,icon,description);sections[key][3]=image;guidance[key]=[title,description];}
intents.unshift([/teacher|class mode|assign decks/i,'classmode'],[/syllabus|semester/i,'semester'],[/portfolio|draft history/i,'portfolio'],[/marketplace|seller/i,'market'],[/mistakes|the path/i,'path'],[/rampage|daily challenge|league/i,'arena'],[/friend quest/i,'quests'],[/streak freeze|fox reminder/i,'streaks']);
const exp=(path,data)=>manageRequest('exp/'+path,data);
const soon=()=>waveDate(7);
const emptyExp=(id,message)=>{const node=el(id);if(node)node.textContent=message;};
function wired(form,onSubmit){
  form.onsubmit=async event=>{
    event.preventDefault();
    const button=el('button[type=submit],button:not([type])',form);
    if(button)button.disabled=true;
    try{await onSubmit(Object.fromEntries(new FormData(form)));}finally{if(button)button.disabled=false;}
  };
}
function mergePlanner(items){
  const current=getTasks(), byId=new Map(current.map(item=>[item.id,item]));
  for(const item of items)byId.set(item.id,{...byId.get(item.id),...item,done:item.done??byId.get(item.id)?.done??false});
  save('assignments',[...byId.values()]);
}
views.classmode=()=>wavePanel('Teacher & Class Mode · Diamond highlight','<p>Use a registered Donezo account to start a class. Students can join with a code on the Free plan.</p><div class="columns"><form id="class-create" class="stack">'+field('title','Class name','text','required maxlength="80"')+'<button class="primary">Create class</button></form><form id="class-join" class="stack">'+field('code','Join code','text','required maxlength="8"')+'<button class="primary">Join class</button></form></div><p id="class-message" role="status"></p><div id="class-content" class="stack"></div>'+links([['Register my profile','dashboard'],['Open assignments','assignments']]));
bindings.classmode=()=>{
  const status=el('#class-message'), content=el('#class-content');
  async function render(){
    try{
      const {own,joined,work,reports,improvers=[]}=await exp('classes');
      if(!content.isConnected)return;
      mergePlanner(work.map(item=>({id:'class-'+item.id,title:item.title,due:item.due,kind:item.kind==='Test'?'test':'assignment',className:joined.find(c=>c.code===item.code)?.title,done:item.updated!=null})));
      content.innerHTML='<h3>Your classes</h3>'+(own.length?'<ul>'+own.map(item=>'<li>'+esc(item.title)+' · Join code <strong>'+esc(item.code)+'</strong></li>').join('')+'</ul>':'<p>No classes created.</p>')+(own.length?'<form id="class-assign" class="stack">'+selectField('code','Class code',own.map(item=>item.code))+field('title','Assignment title','text','required maxlength="100"')+selectField('kind','Assignment type',['Deck','Test','Project'])+field('topic','Topic','text','required maxlength="70"')+field('due','Due date','date','required')+field('content','Instructions, deck text, or practice questions','textarea','required maxlength="6000"')+'<button class="primary">Assign work</button></form>':'')+'<h3>Class dashboard</h3>'+(reports.length?'<ul>'+reports.map(r=>'<li>'+esc(r.title)+' · '+esc(r.topic)+' · '+r.completed+'/'+r.members+' completed · '+(r.average===null?'No reported scores':'Average '+Math.round(r.average)+'% · best gain '+r.best_gain+' pts')+'</li>').join('')+'</ul>':'<p>No class results yet.</p>')+'<h3>Joined classes</h3><p>'+esc(joined.map(c=>c.title).join(', ')||'None yet.')+'</p>'+work.map(item=>'<details><summary>'+esc(item.title)+' · '+esc(dueIn(item.due))+'</summary><p class="result-copy">'+esc(item.content)+'</p><form class="stack" data-finish="'+esc(item.id)+'">'+field('score','Optional self-reported score (%)','number','min="0" max="100"')+'<button class="primary">'+(item.updated?'Update result':'Mark complete')+'</button></form></details>').join('');
      for(const item of work){
        const form=content.querySelector('[data-finish="'+item.id+'"]');
        if(item.kind==='Deck'||item.kind==='Test'){
          const action=document.createElement('button');
          action.type='button';action.className='ghost';action.textContent=item.kind==='Deck'?'Open deck text in Note Lab':'Practice using this assignment';
          action.onclick=()=>openNotes(item.content,item.kind==='Test'?'#notes-test':undefined);
          form.before(action);
        }
      }
      if(own.length){
        const weakTopics=new Map();
        for(const report of reports)if(report.average!==null){
          const key=report.code+' · '+report.topic;
          const before=weakTopics.get(key)??{rating:0,count:0};
          weakTopics.set(key,{rating:before.rating+report.average*report.completed,count:before.count+report.completed});
        }
        const weak=[...weakTopics].map(([topic,item])=>({topic,score:Math.round(item.rating/item.count)})).sort((a,b)=>a.score-b.score).slice(0,8);
        content.insertAdjacentHTML('beforeend','<h3>Weakest topics</h3>'+(weak.length?'<ol>'+weak.map(item=>'<li>'+esc(item.topic)+' · '+item.score+'%</li>').join('')+'</ol>':'<p>No scores reported yet.</p>')+'<h3>Top improvers</h3>'+(improvers.length?'<ol>'+improvers.slice(0,10).map(item=>'<li>'+esc(item.name)+' · '+esc(item.code)+' · +'+item.gain+' points</li>').join('')+'</ol>':'<p>Improvement appears after a student updates a score.</p>'));
      }
      const assign=el('#class-assign',content);
      if(assign)wired(assign,args=>act('assign',args,'Assignment posted.'));
      for(const form of content.querySelectorAll('[data-finish]'))wired(form,args=>act('complete',{id:form.dataset.finish,score:args.score===''?null:+args.score},'Result saved.'));
    }catch(error){status.textContent=error.message;}
  }
  async function act(path,args,message){try{await exp(path,args);await render();status.textContent=message;}catch(error){status.textContent=error.message;}}
  wired(el('#class-create'),args=>act('classes',args,'Class created.'));
  wired(el('#class-join'),args=>act('join',args,'Class joined and assignments synced.'));
  void render();
};
const baseAssignmentExp=views.assignments,bindAssignmentExp=bindings.assignments;
views.assignments=()=>baseAssignmentExp()+wavePanel('Bring your schoolwork',links([['Class Mode','classmode'],['Semester Autopilot','semester'],['LMS sample import','classroom']]));
bindings.assignments=()=>{
  bindAssignmentExp();
  void exp('classes').then(({work,joined})=>{
    if(location.hash!=='#assignments'||!work.length)return;
    const before=JSON.stringify(getTasks());
    mergePlanner(work.map(item=>({id:'class-'+item.id,title:item.title,due:item.due,kind:item.kind==='Test'?'test':'assignment',className:joined.find(c=>c.code===item.code)?.title,done:item.updated!=null})));
    if(before!==JSON.stringify(getTasks()))show();
  }).catch(()=>{});
};
const months='january february march april may june july august september october november december'.split(' ');
function syllabusEntries(raw,year){
  const output=[];
  for(const line of lines(raw)){
    const patterns=/\b(\d{4}-\d{2}-\d{2})\b|\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b|\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/gi;
    for(const match of line.matchAll(patterns)){
      const pad=n=>String(n).padStart(2,'0');
      const due=match[1]??((match[4]??match[7]??year)+'-'+pad(match[2]??(months.findIndex(m=>m.startsWith(match[5].toLowerCase().slice(0,3)))+1))+'-'+pad(match[3]??match[6]));
      if(Number.isNaN(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due)continue;
      const title=line.replace(match[0],'').replace(/^[\s:,–-]+|[\s:,–-]+$/g,'').slice(0,130);
      if(title)output.push({id:'syllabus-'+due+'-'+title.toLowerCase(),title,due,kind:/exam|quiz|test|midterm|final/i.test(title)?'test':'assignment'});
    }
  }
  return [...new Map(output.map(item=>[item.id,item])).values()].slice(0,100);
}
views.semester=()=>wavePanel('Build your semester calendar · Diamond highlight','<p>Upload TXT, Markdown or a clear photo of your syllabus. Review the dates before they go into Assignments. For PDFs, paste the text.</p><label>Syllabus file<input id="syllabus-file" type="file" accept=".txt,.md,.csv,image/*"></label><form id="syllabus-form" class="stack">'+field('year','Year for dates without a year','number','required min="2000" max="2100" value="'+new Date().getFullYear()+'"')+field('text','Syllabus text','textarea','required maxlength="40000"')+'<button class="primary">Extract dates</button></form><p id="semester-status" role="status"></p><div id="semester-preview"></div>'+links([['Assignment Tracker','assignments']]));
bindings.semester=()=>{
  const form=el('#syllabus-form'),preview=el('#semester-preview'),status=el('#semester-status');
  el('#syllabus-file').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      status.textContent='Reading syllabus…';
      form.elements.text.value=(file.type.startsWith('image/')?await recognizeHomework(file,()=>{},true):await file.slice(0,160000).text()).slice(0,40000);
      status.textContent='Review the text and extract dates.';
    }catch{status.textContent='Could not read the file. You can paste the text.';}
  };
  wired(form,args=>{
    const items=syllabusEntries(args.text,args.year);
    preview.innerHTML=items.length?'<h3>Review extracted dates</h3><ul>'+items.map((item,i)=>'<li><label><input type="checkbox" data-deadline="'+i+'" checked> '+esc(item.title)+' · '+item.due+'</label></li>').join('')+'</ul><div class="actions"><button class="primary" id="semester-save">Add selected deadlines</button><button class="ghost" id="semester-calendar">Download calendar reminders</button></div>':'<p>No explicit deadline dates found.</p>';
    const selectedItems=()=>items.filter((_,i)=>el('[data-deadline="'+i+'"]').checked);
    if(items.length)el('#semester-calendar').onclick=()=>{
      const stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
      const text=value=>value.replace(/[\\;,]/g,'\\$&').replace(/[\r\n]/g,' ');
      const calendar=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Donezo//Semester Planner//EN'];
      for(const item of selectedItems())calendar.push('BEGIN:VEVENT','UID:'+crypto.randomUUID()+'@donezo','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+item.due.replace(/-/g,''),'SUMMARY:'+text(item.title),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Upcoming school deadline','TRIGGER:-P1D','END:VALARM','END:VEVENT');
      calendar.push('END:VCALENDAR');
      const url=URL.createObjectURL(new Blob([calendar.join('\r\n')+'\r\n'],{type:'text/calendar'}));
      const link=document.createElement('a');link.href=url;link.download='donezo-semester.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
    };
    if(items.length)el('#semester-save').onclick=()=>{
      const selected=selectedItems();
      const plan=selected.flatMap(item=>{
        const prep=new Date(Date.parse(item.due)-172800000).toISOString().slice(0,10);
        return prep<waveDate(0)?[item]:[item,{id:item.id+'-prep',title:'Study or prep: '+item.title,due:prep,kind:'assignment'}];
      });
      mergePlanner(plan);status.textContent=selected.length+' deadlines added with preparation tasks where there is time.';
    };
  });
};
const portfolioData=()=>read('exp-portfolios',[]);
views.portfolio=()=>wavePanel('Process Portfolio · Diamond highlight','<p>Keep dated versions of your writing. Download or share the full record when you’re ready.</p><form id="portfolio-form" class="stack">'+field('title','Project title','text','required maxlength="100"')+selectField('stage','Version stage',['Outline','Draft','Final'])+field('text','Writing','textarea','required maxlength="20000"')+'<button class="primary">Save a version</button></form><div id="portfolio-list"></div><p id="portfolio-status" role="status"></p>');
bindings.portfolio=()=>{
  const gallery=el('#portfolio-list');
  function render(){
    const projects=portfolioData();
    gallery.innerHTML=projects.map((project,i)=>'<details><summary>'+esc(project.title)+' · '+project.versions.length+' versions</summary>'+project.versions.map(version=>'<article><h3>'+esc(version.stage)+' · '+esc(new Date(version.time).toLocaleString())+'</h3><p class="result-copy">'+esc(version.text)+'</p></article>').join('')+'<button class="ghost" data-share-portfolio="'+i+'">Share writing history</button></details>').join('')||'<p>No writing versions saved yet.</p>';
    for(const button of gallery.querySelectorAll('[data-share-portfolio]'))button.onclick=()=>{
      const project=projects[+button.dataset.sharePortfolio];
      shareText(project.title,[project.title,...project.versions.map(version=>version.stage+' · '+new Date(version.time).toLocaleString()+'\n'+version.text)].join('\n\n'),el('#portfolio-status'));
    };
  }
  wired(el('#portfolio-form'),args=>{
    const projects=portfolioData(),title=args.title.trim(),value=args.text.trim();
    if(!title||!value)return;
    let project=projects.find(item=>item.title.toLowerCase()===title.toLowerCase());
    if(!project){project={title,versions:[]};projects.push(project);}
    project.versions.push({stage:args.stage,text:value,time:Date.now()});
    const persisted=save('exp-portfolios',projects);
    render();emptyExp('#portfolio-status',persisted?'Version saved.':'Version saved for this session. Browser storage is full.');
  });
  render();
};
views.market=()=>wavePanel('Notes Marketplace · Diamond selling preview','<p>Prepare a listing for your original study material. Drafts stay in this browser. Payments, credit transfers, public seller profiles, and ratings require marketplace services.</p><form id="market-draft" class="stack">'+field('seller','Seller display name','text','required maxlength="60"')+field('title','Listing title','text','required maxlength="90"')+selectField('kind','Material',['Deck','Study guide'])+field('price','Proposed price','number','required min="0" max="1000" step="0.01"')+selectField('unit','Currency',['Credits','USD'])+field('description','Description','textarea','required maxlength="2000"')+'<button class="primary">Save listing draft</button></form><div id="market-drafts"></div><p id="market-message" role="status"></p>');
bindings.market=()=>{
  const gallery=el('#market-drafts');
  function render(){
    const items=read('exp-market',[]);
    gallery.innerHTML=items.map((item,i)=>'<article class="panel"><h3>'+esc(item.title)+'</h3><p>'+esc(item.seller)+' · '+esc(item.kind)+' · '+esc(item.price)+' '+esc(item.unit)+'</p><p>'+esc(item.description)+'</p><button class="ghost" data-hide-listing="'+i+'">Remove local draft</button></article>').join('');
    gallery.querySelectorAll('[data-hide-listing]').forEach(button=>button.onclick=()=>{save('exp-market',items.filter((_,i)=>i!==+button.dataset.hideListing));render();});
  }
  wired(el('#market-draft'),data=>{if(!data.title.trim()||!data.seller.trim())return;save('exp-market',[...read('exp-market',[]),data]);render();emptyExp('#market-message','Listing draft saved.');});
  render();
};
// Rename built-in samples already stored in a browser without editing student content.
const importedSampleIds=new Map([['Canvas','Portal A'],['Schoology','Portal B']]);
const renameSample=name=>typeof name==='string'?name.replace(/^(Canvas|Schoology)(?= (?:Algebra \(sample\)|sample · ))/,key=>importedSampleIds.get(key)):name;
const previousSampleTasks=getTasks();
const neutralSampleTasks=previousSampleTasks.map(item=>{
  const match=item.id?.match(/^(Canvas|Schoology)-(essay-demo|test-demo)$/);
  return match?{...item,id:importedSampleIds.get(match[1])+'-'+match[2],title:renameSample(item.title),className:renameSample(item.className)}:item;
});
if(neutralSampleTasks.some((item,i)=>item!==previousSampleTasks[i]))save('assignments',[...new Map(neutralSampleTasks.map(item=>[item.id,item])).values()]);
const previousSampleClasses=read('classroom-classes',[]);
const neutralSampleClasses=previousSampleClasses.map(item=>({...item,name:renameSample(item.name)}));
if(neutralSampleClasses.some((item,i)=>item.name!==previousSampleClasses[i].name))save('classroom-classes',[...new Map(neutralSampleClasses.map(item=>[item.name,item])).values()]);
const baseLms=views.classroom,bindLms=bindings.classroom;
views.classroom=()=>baseLms()+wavePanel('Import from your school portal · Gold highlight','<p>Use a one-click sample import. A school authorization is needed to sync real classes.</p><div class="actions"><button class="ghost" data-lms="Portal A">Import portal sample A</button><button class="ghost" data-lms="Portal B">Import portal sample B</button></div><p id="lms-message" role="status"></p>');
bindings.classroom=()=>{
  bindLms();document.querySelectorAll('[data-lms]').forEach(button=>button.onclick=()=>{
    const source=button.dataset.lms, name=source+' Algebra (sample)';
    const classes=read('classroom-classes',[]);
    if(!classes.some(item=>item.name===name))save('classroom-classes',[...classes,{name,subject:'Math'}]);
    mergePlanner([{id:source+'-essay-demo',title:source+' sample · Algebra practice',due:waveDate(4),className:name,kind:'assignment'},{id:source+'-test-demo',title:source+' sample · Unit quiz',due:soon(),className:name,kind:'test'}]);
    emptyExp('#lms-message',source+' sample imported. Open Assignments to review it.');
  });
};
const beatPlayer=document.createElement('div');
beatPlayer.className='beats-mini panel';beatPlayer.hidden=true;
beatPlayer.innerHTML='<span id="beat-name"></span><button class="ghost quick" id="beat-stop">Stop beats</button>';
document.body.append(beatPlayer);
let beatContext,beatSources=[],beatLoop;
function stopBeat(){
  clearInterval(beatLoop);
  for(const source of beatSources){try{source.stop();}catch{}}
  beatSources=[];beatPlayer.hidden=true;
  try{if(beatContext?.state==='running')void beatContext.suspend();}catch{}
}
async function playBeat(kind){
  stopBeat();
  const Context=window.AudioContext??window.webkitAudioContext;
  if(!Context)throw Error('Audio is unavailable on this device.');
  beatContext??=new Context();
  await beatContext.resume();
  const ctx=beatContext,gain=ctx.createGain();
  gain.gain.value=.055;gain.connect(ctx.destination);
  if(kind==='Rain'){
    const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate), samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    const loop=ctx.createBufferSource(),f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1500;
    loop.buffer=buffer;loop.loop=true;loop.connect(f).connect(gain);loop.start();beatSources.push(loop);
  }else if(kind==='Deep focus'){
    for(const pitch of [98,146.83,196]){
      const source=ctx.createOscillator();source.frequency.value=pitch;source.connect(gain);source.start();beatSources.push(source);
    }
  }else{
    let step=0;
    const notes=[130.81,164.81,196,246.94,146.83,174.61,220,261.63];
    const next=()=>{
      const osc=ctx.createOscillator(),env=ctx.createGain(),t=ctx.currentTime;
      osc.type='triangle';osc.frequency.value=notes[step++%notes.length];env.gain.setValueAtTime(.005,t);env.gain.exponentialRampToValueAtTime(.8,t+.03);env.gain.exponentialRampToValueAtTime(.005,t+.55);osc.connect(env).connect(gain);osc.start(t);osc.stop(t+.6);
    };
    next();beatLoop=setInterval(next,550);
  }
  el('#beat-name').textContent='Study Beats · '+kind;beatPlayer.hidden=false;
}
el('#beat-stop').onclick=stopBeat;
for(const page of ['studio','rooms']){
  const before=views[page],bind=bindings[page];
  views[page]=()=>before()+wavePanel('Study Beats · Gold highlight','<div class="actions">'+['Lofi','Rain','Deep focus'].map(beat=>'<button class="ghost" data-study-beat="'+beat+'">'+beat+'</button>').join('')+'</div><p id="beats-status" role="status"></p>');
  bindings[page]=()=>{bind();document.querySelectorAll('[data-study-beat]').forEach(button=>button.onclick=()=>void playBeat(button.dataset.studyBeat).catch(error=>emptyExp('#beats-status',error.message)));};
}
function recordMistake(topic,prompt,correct,why){
  const key=String(topic)+'|'+String(prompt);
  const queue=read('exp-mistakes',[]);
  const prior=queue.find(item=>item.id===key),entry={id:key,topic,prompt,correct,why,count:(prior?.count??0)+1,mastered:false};
  save('exp-mistakes',[entry,...queue.filter(item=>item.id!==key)].slice(0,150));
  const card=[String(prompt),String(correct)];
  const deck=read('deck',[]);
  if(!deck.some(row=>JSON.stringify(row)===JSON.stringify(card)))save('deck',[...deck,card]);
  const schedule=read('card-schedule',{});
  schedule[JSON.stringify(card)]={days:0,due:Date.now()};
  save('card-schedule',schedule);
}
const pathProgress=()=>read('exp-path',[]);
views.path=()=>wavePanel('Your class path','<p>Start with your weakest class. Finish one step to unlock the next.</p><label>Choose a class<select id="path-class">'+[...allClasses().map(item=>item.name),'General study'].map(name=>'<option>'+esc(name)+'</option>').join('')+'</select></label><div id="path-map"></div>')+wavePanel('Mistakes Review · Free','<div id="mistake-list"></div>');
bindings.path=()=>{
  const selector=el('#path-class'),map=el('#path-map'),queueArea=el('#mistake-list');
  const weak=classRows()[0];
  if(weak)selector.value=weak.name;
  function mapNodes(){
    const name=selector.value,progress=pathProgress(),queue=read('exp-mistakes',[]).filter(item=>!item.mastered);
    const nodes=[['5-minute lesson','Name two shaky topics. Write one definition and a worked example for each.'],['Quick quiz',queue.length?'Review three questions from Mistakes Review below.':'Answer three flashcards without opening your notes.'],['Boss fight','Take a timed mini-test in Test Prep and record what to review next.']];
    const completed=progress.filter(item=>item.className===name).length;
    map.innerHTML='<div class="path-nodes">'+nodes.map(([label,text],i)=>'<article class="panel '+(i<completed?'earned':i===completed?'next-node':'')+'"><h3>'+esc(label)+(i<completed?' ✓':'')+'</h3><p>'+esc(text)+'</p>'+(i===completed?art('empty')+'<button class="primary" data-path-step="'+i+'">Mark step done</button>':'')+'</article>').join('')+'</div>'+links([['Flashcards','learn'],['Test Prep','test']]);
    const button=el('[data-path-step]',map);
    if(button)button.onclick=()=>{save('exp-path',[...progress,{className:name,index:+button.dataset.pathStep,time:Date.now()}]);earn('Path lesson',5);mapNodes();};
  }
  function mistakes(){
    const queue=read('exp-mistakes',[]);
    queueArea.innerHTML=queue.filter(item=>!item.mastered).map((item,i)=>'<details><summary>'+esc(item.prompt)+'</summary><p>'+esc(item.topic)+' · '+item.count+' missed</p><p>Answer: '+esc(item.correct)+'</p><p>'+esc(item.why)+'</p><button class="ghost" data-master-mistake="'+esc(item.id)+'">Mark mastered</button></details>').join('')||'<p>No mistakes waiting for review.</p>';
    queueArea.querySelectorAll('[data-master-mistake]').forEach(button=>button.onclick=()=>{
      const item=queue.find(row=>row.id===button.dataset.masterMistake);item.mastered=true;save('exp-mistakes',queue);
      scheduleRating([String(item.prompt),String(item.correct)],true);mistakes();
    });
  }
  selector.onchange=mapNodes;mapNodes();mistakes();
};
function drawArenaTable(rows,key,suffix){
  return rows.length?'<ol>'+rows.map(item=>'<li>'+esc(item.alias)+' · '+item[key]+suffix+'</li>').join('')+'</ol>':'<p>No public scores yet.</p>';
}
const leagueNames=['Bronze League','Silver League','Gold League','Obsidian League'];
const utcDay=()=>new Date().toISOString().slice(0,10);
views.arena=()=>wavePanel('Daily Challenge · Free','<p>Five mental-math questions each day. Sign in with a registered profile to post an optional study alias.</p><button class="primary" id="daily-start">Start daily challenge</button><div id="daily-content"></div>')+wavePanel('Rampage · Free','<p>Answer as many questions as you can in 60 seconds.</p><form class="stack" id="rampage-start">'+selectField('category','Round topic',['Mental math','Vocabulary','Facts'])+'<button class="primary">Start Rampage</button></form><div id="rampage-content"></div><p id="rampage-message" role="status"></p>')+wavePanel('Leaderboards and seasons','<p>Opt in by posting a Daily Challenge score. Leagues group up to 30 students. The top 10 in groups with at least 11 students promote, and the bottom 5 in groups with at least 16 drop. The monthly winner earns a badge and theme.</p><div id="arena-boards"></div><div id="league-board"></div>');
bindings.arena=()=>{
  async function standings(){
    try{
      const data=await exp('standings'),target=el('#arena-boards');
      if(target)target.innerHTML='<h3>Global daily scores</h3>'+drawArenaTable(data.daily,'score',' / 5')+'<h3>Weekly XP · '+esc(data.week)+'</h3>'+drawArenaTable(data.weekly,'xp',' XP')+'<h3>Season · '+esc(data.season)+'</h3>'+drawArenaTable(data.monthly,'xp',' XP');
    }catch(error){emptyExp('#arena-boards',error.message);}
    try{
      const result=await exp('league'),target=el('#league-board');
      if(!target)return;
      if(result.winner)save('exp-season-award',result.winner);
      const award=read('exp-season-award',''),league=result.league;
      target.innerHTML=(league?'<h3>'+leagueNames[league.tier]+' · Group '+league.cohort+'</h3><ol>'+league.standings.map(row=>'<li>'+esc(row.alias)+(row.you?' (you)':'')+' · '+row.xp+' XP</li>').join('')+'</ol>':'<p>Post a daily score to join this week’s league.</p>')+(award?'<p class="gold">Season champion · '+esc(award)+'</p><a class="ghost" href="#settings">Choose Obsidian Champion theme</a>':'');
    }catch{emptyExp('#league-board','Sign in and register to see your league.');}

  }
  void standings();
  const day=utcDay(),daily=el('#daily-content');
  function dailyResult(result){
    daily.innerHTML='<h3>Daily score: '+result.score+' / 5</h3><form id="daily-post" class="stack">'+field('alias','Public study alias (avoid real names)','text','required minlength="3" maxlength="24"')+'<button class="ghost">Post to leaderboard</button></form><p id="daily-message" role="status"></p>';
    wired(el('#daily-post'),async data=>{
      try{await exp('challenge',{...data,day,answers:result.answers});emptyExp('#daily-message','Daily score submitted.');void standings();}
      catch(error){emptyExp('#daily-message',error.message);}
    });
  }
  el('#daily-start').onclick=()=>{
    const saved=read('exp-daily',{});if(saved.day===day){dailyResult(saved);return;}
    const questions=expansionChallenge(day),answers=[];
    let i=0;
    function showTurn(){
      const [prompt,correct]=questions[i];
      daily.innerHTML='<p>Question '+(i+1)+' / 5</p><p class="answer">'+esc(prompt)+'</p><form id="daily-answer" class="stack">'+field('value','Answer','number','required step="any"')+'<button class="primary">Next</button></form>';
      wired(el('#daily-answer'),args=>{
        answers.push(+args.value);
        if(+args.value!==correct)recordMistake('Daily Challenge',prompt,correct,'Rework the calculation and check it.');
        if(++i<questions.length){showTurn();return;}
        const score=questions.filter((row,index)=>row[1]===answers[index]).length,result={day,answers,score};
        save('exp-daily',result);earn('Daily Challenge',score*10);dailyResult(result);
      });
    }
    showTurn();
  };
  const ramp=el('#rampage-content'),start=el('#rampage-start');
  let timer;
  wired(start,args=>{
    clearInterval(timer);
    const until=Date.now()+60000;
    let score=0,total=0;
    function question(){
      const pick=[...wordVault],facts=[['Which planet is closest to the Sun?','Mercury'],['How many sides does a hexagon have?','6'],['What gas do plants take in for photosynthesis?','carbon dioxide'],['What is the largest ocean?','Pacific']];
      if(args.category==='Vocabulary'){const row=pick[total%pick.length];return ['Which word means “'+row[1]+'”?',row[0]];}
      if(args.category==='Facts')return facts[total%facts.length];
      const a=3+Math.floor(Math.random()*12),b=2+Math.floor(Math.random()*10);
      return [a+' × '+b,String(a*b)];
    }
    function finish(){
      clearInterval(timer);earn('Rampage',Math.min(score*3,45));
      ramp.innerHTML='<h3>Rampage score · '+score+' / '+total+'</h3><button class="ghost" id="rampage-share">Share score card</button>';
      el('#rampage-share').onclick=()=>shareText('Donezo Rampage','I scored '+score+'/'+total+' in Donezo '+args.category+' Rampage.',el('#rampage-message'));
    }
    function round(){
      const [prompt,answer]=question();
      ramp.innerHTML='<p id="rampage-clock"></p><h3>'+esc(prompt)+'</h3><form id="rampage-answer" class="stack">'+field('answer','Answer','text','required maxlength="100"')+'<button class="primary">Submit</button></form>';
      wired(el('#rampage-answer'),data=>{
        if(Date.now()>=until){finish();return;}
        total++;
        if(data.answer.trim().toLowerCase()===String(answer).toLowerCase())score++;else recordMistake('Rampage',prompt,answer,'Recall this answer in your next review.');
        round();tick();
      });
      el('#rampage-answer input').focus();
    }
    function tick(){
      if(!ramp.isConnected){clearInterval(timer);return;}
      const seconds=Math.ceil((until-Date.now())/1000);
      if(seconds<=0)finish();else emptyExp('#rampage-clock',seconds+' seconds · '+score+' correct');
    }
    round();tick();timer=setInterval(tick,250);
  });
};
views.quests=()=>wavePanel('Friend Quests · Gold highlight','<p>Share a quest code with one friend. Each student logs their own steps. Finish both goals for bonus XP on this device.</p><form id="quest-new" class="stack">'+field('title','Shared goal','text','required maxlength="85"')+field('target','Steps per student','number','required min="1" max="50" value="5"')+field('due','Complete by','date','required value="'+soon()+'"')+'<button class="primary">Create quest</button></form><form id="quest-join" class="stack">'+field('code','Friend quest code','text','required maxlength="8"')+'<button class="ghost">Join quest</button></form><div id="quest-list"></div><p id="quest-message" role="status"></p>');
bindings.quests=()=>{
  async function render(){
    const box=el('#quest-list');
    if(!box)return;
    try{
      const {quests}=await exp('quests');
      if(!box.isConnected)return;
      box.innerHTML=quests.map(row=>'<article class="panel"><h3>'+esc(row.title)+'</h3><p>Code '+esc(row.code)+' · '+esc(dueIn(row.due))+' · '+(row.paired?'Paired':'Waiting for a friend')+'</p><p>'+row.owner_count+'/'+row.target+' · '+row.partner_count+'/'+row.target+'</p><button class="ghost" data-quest-step="'+esc(row.code)+'" '+((row.is_owner?row.owner_count:row.partner_count)>=row.target||row.due<utcDay()?'disabled':'')+'>Log one step</button></article>').join('')||'<p>No quests yet.</p>';
      for(const quest of quests)if(quest.paired&&quest.owner_count===quest.target&&quest.partner_count===quest.target&&!read('quest-awarded-'+quest.code,false)){save('quest-awarded-'+quest.code,true);earn('Friend quest completed',20);}
      box.querySelectorAll('[data-quest-step]').forEach(button=>button.onclick=()=>void act({action:'step',code:button.dataset.questStep},'Step saved.'));
    }catch(error){emptyExp('#quest-message',error.message);}
  }
  async function act(args,message){try{await exp('quests',args);await render();emptyExp('#quest-message',message);}catch(error){emptyExp('#quest-message',error.message);}}
  wired(el('#quest-new'),args=>act({...args,action:'new',target:+args.target},'Quest created.'));
  wired(el('#quest-join'),args=>act({...args,action:'join'},'Quest joined.'));
  void render();
};
const freezeRows=()=>read('exp-freezes',[]);
function streakWithFreeze(){
  const data=progressState();
  return streak([...new Set([...data.days,...freezeRows().map(item=>item.day)])]);
}
const settingsNudges=()=>read('exp-nudges','Off');
views.streaks=()=>wavePanel('Streak calendar','<p>One streak across all your subjects. A freeze covers yesterday if it would otherwise interrupt your streak.</p><p id="streak-tally"></p><div id="streak-grid" class="streak-grid"></div><button class="primary" id="streak-freeze">Use freeze for yesterday</button><p id="streak-note" role="status"></p>')+wavePanel('Fox notifications','<p>The 8 PM reminder appears inside Donezo. Choose how often you want to see it.</p><form id="fox-prefs" class="stack">'+selectField('frequency','Reminder frequency',['Off','Daily','Weekdays'])+selectField('personality','Fox reminder voice',['Chill nudge','Drill Sergeant','Funny Friend'])+'<button class="ghost">Save reminders</button></form><p id="fox-status" role="status"></p>');
bindings.streaks=()=>{
  const status=el('#streak-note');
  function render(){
    const rows=freezeRows(),days=progressState().days,month=waveDate(0).slice(0,7),used=rows.filter(item=>item.month===month).length;
    const available=Math.max(0,1+Math.floor(progressState().xp/500)-used);
    emptyExp('#streak-tally','🔥 '+streakWithFreeze()+' day streak · '+available+' freezes available this month');
    el('#streak-grid').innerHTML=Array.from({length:14},(_,i)=>{
      const day=waveDate(i-13),style=days.includes(day)?'earned':rows.some(item=>item.day===day)?'frozen':'';
      return '<span class="'+style+'" title="'+day+'">'+day.slice(8)+'</span>';
    }).join('');
    el('#streak-freeze').disabled=!available||days.includes(waveDate(-1))||rows.some(item=>item.day===waveDate(-1))||!days.includes(waveDate(-2));
    el('#streak-freeze').onclick=()=>{save('exp-freezes',[...rows,{day:waveDate(-1),month}]);render();status.textContent='Yesterday is covered.';};
  }
  const form=el('#fox-prefs');form.elements.frequency.value=settingsNudges();form.elements.personality.value=read('exp-fox-voice','Chill nudge');
  wired(form,data=>{save('exp-nudges',data.frequency);save('exp-fox-voice',data.personality);emptyExp('#fox-status','Reminder preferences saved.');});
  render();
};
const streakLink=document.createElement('a');
streakLink.href='#streaks';streakLink.id='streak-everywhere';streakLink.className='ghost quick';el('header').append(streakLink);
const nudge=document.createElement('div');nudge.className='fox-nudge panel';nudge.hidden=true;nudge.role='status';document.body.append(nudge);
function checkNudges(){
  const date=new Date(),day=waveDate(0),frequency=settingsNudges();
  streakLink.textContent='🔥 '+streakWithFreeze();
  streakLink.setAttribute('aria-label','Streak calendar · '+streakWithFreeze()+' days');
  if(frequency==='Off'||date.getHours()<20||progressState().days.includes(day)||read('exp-nudged','')===day||(frequency==='Weekdays'&&[0,6].includes(date.getDay())))return;
  const messages={'Chill nudge':'Your streak could use a quick review. One small lesson counts.','Drill Sergeant':'Eight o’clock. Pick one lesson and finish it. Your streak is still in play.','Funny Friend':'Your streak is looking at the clock like it’s waiting for a text back. One quick review saves it.'};
  save('exp-nudged',day);
  nudge.innerHTML=art('empty')+'<p>'+esc(messages[read('exp-fox-voice','Chill nudge')])+'</p><a class="ghost" href="#review">Quick review</a> <button class="ghost" id="nudge-close">Dismiss</button>';
  nudge.hidden=false;el('#nudge-close').onclick=()=>nudge.hidden=true;
}
setInterval(checkNudges,30000);
const languageNames={en:'English',es:'Español',fr:'Français',ht:'Kreyòl ayisyen'};
const navKeys=['home','snap','capture','school','projects','learn','test','vault','codes','pricing','dashboard','studio','assignments','settings','classroom','reports','battles','senior','rooms','rescue','print','voice','notelab','review','workcheck','graph','library','ap','minisolvers','slides','classmode','semester','portfolio','market','path','arena','quests','streaks'];
const translatedTabs={
 fr:['Accueil','Scanner','Capture','Espace scolaire','Projets','Apprendre','Préparation aux examens','Coffre','Astuces','Abonnements','Tableau de bord','Atelier','Devoirs','Paramètres','Imports scolaires','Rapports aux parents','Duels','Dernière année','Salles d’étude','Remonter ses notes','Fiches imprimables','Tuteur vocal','Atelier de notes','À réviser aujourd’hui','Vérifier mon travail','Graphiques et dessin','Bibliothèque','Examens avancés','Mini-calculateurs','Diapositives','Mode classe','Planifier le semestre','Portfolio de rédaction','Marché des notes','Parcours','Arène','Quêtes entre amis','Calendrier de série'],
 ht:['Akèy','Eskane','Kaptire','Zòn lekòl','Pwojè','Aprann','Preparasyon egzamen','Kòf','Ti konsèy','Abònman','Tablodbò','Atelye','Devwa','Paramèt','Enpòte klas','Rapò pou paran','Diyèl','Dènye ane','Sal etid','Remonte nòt','Fich pou enprime','Titè vokal','Atelye nòt','Revize jodi a','Verifye travay mwen','Grafik ak desen','Bibliyotèk','Egzamen avanse','Ti kalkilatris','Dyapozitiv','Mòd klas','Plan semès','Pòtfolyo redaksyon','Mache nòt','Chemen','Arèn','Misyon ak zanmi','Kalandriye seri']
};
const langControl=document.createElement('label');
langControl.className='exp-language';langControl.innerHTML='<span class="visually-hidden">Language</span><select aria-label="Language" id="exp-language">'+Object.entries(languageNames).map(([key,name])=>'<option value="'+key+'">'+name+'</option>').join('')+'</select>';
el('#language-switch').replaceWith(langControl);
const originalLocale=localize;
localize=function(){
  const lang=read('interface-language','en');
  originalLocale();
  el('#exp-language').value=lang;
  if(!translatedTabs[lang])return;
  document.documentElement.lang=lang;
  const titles=Object.fromEntries(navKeys.map((key,i)=>[key,translatedTabs[lang][i]]));
  for(const link of nav.querySelectorAll('a')){const title=titles[link.hash.slice(1)];if(title)link.lastChild.textContent=title;}
  const current=location.hash.slice(1);
  if(titles[current]&&current!=='home'){const h1=el('h1',main);if(h1)h1.textContent=titles[current];}
  menu.textContent=lang==='fr'?'☰ Menu':'☰ Meni';
  el('#guide-title').textContent=lang==='fr'?'Demander à Donezo':'Mande Donezo';
  el('#guide-close').textContent=lang==='fr'?'Fermer':'Fèmen';
};
el('#exp-language').onchange=event=>{
  const language=event.currentTarget.value;
  if(location.hash==='#rooms')roomCleanup();
  save('interface-language',language);
  menu.textContent=language==='es'?'☰ Menú':'☰ Menu';
  show();localize();
};
window.addEventListener('hashchange',()=>{localize();checkNudges();});
const expHome=views.home;
views.home=()=>expHome()+wavePanel('Language apps gamified one subject. Donezo gamified your whole school life.','<details><summary>Does Donezo use hearts?</summary><p>No. You can keep practicing. Supported missed questions go into Mistakes Review and your review deck.</p></details><details><summary>Which school integrations are available?</summary><p>Teacher and Class Mode uses Donezo accounts and class codes. School portal imports currently use sample data.</p></details><details><summary>Can I earn XP with friends?</summary><p>Pair a Friend Quest with a code, track both goals, and claim device-local XP when both finish. Billing credits are separate.</p></details><details><summary>What is available in French and Haitian Creole?</summary><p>Navigation and selected interface labels are translated. Most tool instructions remain in English.</p></details>'+links([['The Path','path'],['Challenge Arena','arena'],['Class Mode','classmode']]));
const expPlans=views.pricing;
views.pricing=()=>expPlans()+wavePanel('For Schools','<p>Class and school plans are quoted per seat.</p><ul><li>Free hooks: The Path, Mistakes Review, Daily Challenge, Rampage, and joining a teacher’s class.</li><li>Gold highlights: Leagues, Friend Quests, Study Beats, and school portal imports.</li><li>Diamond highlights: Teacher dashboards, Semester Autopilot, Marketplace selling, and Process Portfolio.</li></ul><p>Available expansion tools are open for preview. Billing does not enforce these tiers yet.</p>');
const expDashboard=views.dashboard,expDashBind=bindings.dashboard;
views.dashboard=()=>expDashboard()+wavePanel('Keep the streak going','<p>🔥 '+streakWithFreeze()+' day streak · '+read('exp-mistakes',[]).filter(item=>!item.mastered).length+' mistakes to review</p>'+links([['The Path','path'],['Daily Challenge and standings','arena'],['Friend Quests','quests'],['Streak calendar','streaks']])+'<div id="weekly-dashboard"></div>');
bindings.dashboard=()=>{
  expDashBind();
  void exp('standings').then(data=>{const target=el('#weekly-dashboard');if(target)target.innerHTML='<h3>Weekly XP standings</h3>'+drawArenaTable(data.weekly.slice(0,5),'xp',' XP');}).catch(()=>{});
};
const seasonBaseSettings=bindings.settings;
bindings.settings=()=>{
  seasonBaseSettings();
  const offer=el('#prefs select[name="theme"]');
  if(offer&&read('exp-season-award','')){
    const option=document.createElement('option');
    option.value='Obsidian Champion';option.textContent='Obsidian Champion';offer.append(option);
    if(profile.theme===option.value)offer.value=option.value;
  }
};
show();localize();checkNudges();
