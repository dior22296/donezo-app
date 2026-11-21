const waveFeatures=[
['classroom','School Portal','▦','Connect your school portal to bring classes and due dates into Donezo.','Free sample import · Gold sync planned'],
['reports','Parent Reports','▥','You do the learning. We keep your parents impressed.','Diamond report preview'],
['battles','Quiz Battles','ϟ','Ten questions. Two players. One winner.','Free local duels'],
['senior','Senior Wing','✦','Senior year is a boss fight. Here’s the walkthrough.','Diamond feature preview'],
['rooms','Study Rooms','◈','Focus on the same timer and check in together.','Gold room preview'],
['rescue','Report Card Rescue','➜','Build a two-week recovery plan for your classes.','Free'],
['print','Study Packs','▤','Print your cards, study guide, or cheat codes.','Free']
];
for(const [key,title,icon,description] of waveFeatures)section(key,title,icon,description);
const links = buttons=>'<div class="actions">'+buttons.map(([text,key])=>'<a class="ghost" href="#'+key+'">'+esc(text)+'</a>').join('')+'</div>';
const wavePanel=(title,body)=>'<section class="panel stack"><h2>'+title+'</h2>'+body+'</section>';
const waveDate=offset=>{
  const date=new Date();date.setDate(date.getDate()+offset);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
};
const scheduledTests=()=>getTasks().filter(item=>item.kind==='test'&&!item.done&&item.due>=waveDate(0)).sort((a,b)=>a.due.localeCompare(b.due));
const sampleClasses=[{name:'Algebra II (sample)',subject:'Math'},{name:'Biology (sample)',subject:'Science'},{name:'English (sample)',subject:'English'}];
const sampleWork=[
 ['classroom-algebra','Quadratic functions worksheet',1,0,'assignment'],
 ['classroom-bio','Cell structure quiz',2,1,'test'],
 ['classroom-english','Evidence paragraph',3,2,'assignment'],
 ['classroom-algebra-test','Quadratics unit test',5,0,'test']
];
function allClasses(){
  return [...classes(),...read('classroom-classes',[])].filter((item,i,items)=>items.findIndex(x=>x.name===item.name)===i);
}
function nightlyPlan(){
  const pending=getTasks().filter(item=>!item.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,3);
  return pending.length?'<ol class="steps">'+pending.map((item,i)=>'<li><strong>'+esc(item.title)+'</strong> · '+esc(dueIn(item.due))+' · '+(i===0?'25 min':i===1?'20 min':'15 min')+'</li>').join('')+'</ol>':'<p>Add work to Assignments to build tonight’s plan.</p>';
}
views.classroom=()=>wavePanel('Import from your school portal','<p>This demo loads sample data. It does not request a portal login or access a real classroom.</p><button class="primary" id="classroom-connect">Import from your school portal</button><div id="classroom-status" role="status"></div>'+links([['Assignments','assignments'],['My dashboard','dashboard']]));
bindings.classroom=()=>{
  const status=el('#classroom-status');
  const present=()=>{if(read('classroom-classes',[]).length)status.innerHTML='<p>Three sample classes imported.</p><h3>Tonight’s plan</h3>'+nightlyPlan();};
  present();
  el('#classroom-connect').onclick=()=>{
    const old=getTasks(), seen=read('classroom-imported',false);
    if(!seen){
      const imports=sampleWork.filter(([id])=>!old.some(item=>item.id===id)).map(([id,title,offset,index,kind])=>({
        id,title,due:waveDate(offset),done:false,kind,className:sampleClasses[index].name
      }));
      save('assignments',[...old,...imports]);save('classroom-classes',sampleClasses);save('classroom-imported',true);
    }
    present();
  };
};
for(const key of ['school','assignments']){
  const original=views[key];
  views[key]=()=>original()+wavePanel('School Portal','<p>Connect your school portal to bring classes and due dates into Donezo.</p>'+links([['Import from your school portal','classroom']])+(key==='assignments'?'<h3>Tonight’s plan</h3>'+nightlyPlan():''));
}
const dashBefore=views.dashboard;
views.dashboard=()=>dashBefore()+(classes().length ? wavePanel('Tonight’s plan',nightlyPlan()+links([['Assignments','assignments'],['Report Card Rescue','rescue']]))+
  (read('classroom-classes',[]).length?wavePanel('Imported classes',read('classroom-classes',[]).map(c=>{
    const items=getTasks().filter(t=>t.className===c.name);
    const score=progressState().subjects[c.name];
    return '<details><summary>'+esc(c.name)+'</summary><p>'+esc(c.subject)+(score?' · '+Math.round(100*score.total/score.count)+'% strength':' · No readiness score yet')+'</p><ul>'+items.map(t=>'<li>'+esc(t.title)+' · '+esc(dueIn(t.due))+'</li>').join('')+'</ul></details>';
  }).join('')):'')+(read('rescue-plan',[]).length?wavePanel('Pinned recovery plan','<ul>'+read('rescue-plan',[]).map(item=>'<li>'+esc(item.name)+' · '+item.grade+'% · '+esc(item.first)+'</li>').join('')+'</ul>'+links([['Open two-week plan','rescue']])):''):'');
function rescueReport(items){
  return items.slice().sort((a,b)=>a.grade-b.grade).map(item=>({...item,first:item.grade<70?'Review missing assignments and ask about make-up work.':item.grade<85?'Find the highest-weight weak topic and practice it first.':'Protect your grade with spaced review and deadline checks.'}));
}
views.rescue=()=>wavePanel('Build my recovery plan','<p>Enter one class and percentage per line. Example: Algebra II | 72</p><form class="stack" id="recovery-form">'+field('grades','Class grades','textarea','required maxlength="2000"')+'<button class="primary">Build and pin plan</button></form><div id="recovery-result" role="status"></div>'+links([['Dashboard','dashboard'],['Assignments','assignments'],['Test Prep','test']]));
bindings.rescue=()=>{
  const render=items=>{el('#recovery-result').innerHTML=items.map(item=>'<article><h3>'+esc(item.name)+' · '+item.grade+'%</h3><p>'+esc(item.first)+'</p><ol class="steps"><li>Week 1: Check missing work in Assignment Tracker. Ask your teacher which tasks can still earn credit. Do two short practice sessions.</li><li>Week 2: Finish the highest-impact task, take one timed practice set, review mistakes, and enter your updated grade.</li></ol></article>').join('');};
  const form=el('#recovery-form'), saved=read('rescue-plan',[]);
  form.elements.grades.value=saved.map(item=>item.name+' | '+item.grade).join('\n');
  render(saved);
  form.onsubmit=event=>{
    event.preventDefault();
    try{
      const raw=lines(form.elements.grades.value).map(line=>{const pair=line.split('|');if(pair.length!==2||!pair[0].trim())throw Error('Use Class | percentage on each line.');return {name:pair[0].trim(),grade:numeric(pair[1],'Grade',0,100)};});
      if(!raw.length)throw Error('Add a class grade first.');
      const items=rescueReport(raw);save('rescue-plan',items);render(items);
    }catch(error){el('#recovery-result').textContent=error.message;}
  };
};
function shareText(title,text,status){
  return (async()=>{
    if(navigator.share){try{await navigator.share({title,text});return;}catch(error){if(error.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(text);status.textContent='Copied. Paste it into a message.';}catch{status.textContent=text;}
  })();
}
function parentReport(){
  const data=progressState(), now=waveDate(0), from=waveDate(-6);
  const rows=allClasses().map(item=>{
    const record=data.subjects[item.name];
    const history=record?.history??[];
    const thisWeek=history.filter(result=>result.date>=from&&result.date<=now);
    const lastWeek=history.filter(result=>result.date>=waveDate(-13)&&result.date<from);
    const average=rows=>rows.reduce((sum,row)=>sum+row.score,0)/rows.length;
    const change=thisWeek.length&&lastWeek.length?Math.round(100*(average(thisWeek)-average(lastWeek))):null;
    return item.name+' · '+(record?Math.round(100*record.total/record.count)+'% readiness':'No recorded readiness yet')+' · '+(change===null?'weekly trend not measured':change===0?'steady':(change>0?'improving +':'declining ')+change+' pt');
  });
  const tests=scheduledTests().map(test=>{
    const className=test.className??'';
    const record=data.subjects[className];
    return test.title+' · '+dueIn(test.due)+' · '+(record?Math.round(100*record.total/record.count)+'% readiness':'readiness not measured');
  });
  const weak=allClasses().map(item=>[item.name,data.subjects[item.name]]).filter(([,record])=>record).sort((a,b)=>a[1].total/a[1].count-b[1].total/b[1].count)[0];
  return ['DONEZO weekly report · '+(profile.name||'Student'),from+' to '+now,'XP this week: '+data.events.filter(item=>item.date>=from&&item.date<=now).reduce((total,item)=>total+item.xp,0),'Streak: '+streak(data.days)+' days','','Classes',...(rows.length?rows:['No classes set up.']),'','Upcoming tests',...(tests.length?tests:['No tests scheduled.']),'','Tutor note: '+(weak?weak[0]+' is the one to watch this week.':'Complete some review to establish a baseline.')].join('\n');
}
views.reports=()=>wavePanel('Weekly parent report · Diamond preview','<p>This preview uses progress from this browser. Review it before sharing.</p><pre class="result-copy report-copy" id="report-text">'+esc(parentReport())+'</pre><div class="actions"><button id="send-parent" class="primary">Send to parent</button><a class="ghost" href="#pricing">See Diamond pricing</a></div><p id="report-status" role="status"></p><p>Gift checkout and flash sales aren’t available on this workspace.</p>');
bindings.reports=()=>{el('#send-parent').onclick=()=>shareText('Donezo weekly report',el('#report-text').textContent,el('#report-status'));};
const guidance={
  snap:['Snap It','Upload or type a problem, confirm the extracted question, and see the answer and steps. The current solver covers algebra and browser text detection varies.'],
  studio:['Tool Studio','Use Tool Studio for summaries, outlines, citations, writing revision, GPA, final-grade calculators, and more. Learn Mode walks you through the method before revealing your result.'],
  assignments:['Assignments','Track due dates and countdowns in Assignments. Test Tomorrow turns your topic list into a short cram plan.'],
  test:['Test Prep','Try a college entrance practice section, a timed mini-test, strategy cards, the Word Vault, or the score-goal tracker.'],
  learn:['Learn','Build flashcards with one term and definition per line. Flip each card, then mark it Know or Still learning.'],
  projects:['Projects Wing','Use Projects Wing for science fairs, display boards, presentation scripts, research projects, and project checklists.'],
  school:['School Wing','Open School Wing for algebra steps, website citations, or the sample School Portal import.'],
  capture:['Capture','Record or upload media. Live transcription depends on your browser. For uploaded recordings, paste a transcript and turn it into Cornell notes, flashcards, or assignments.'],
  pricing:['Compare plans','Free is $0, Gold is $19.99/month, and Diamond is $49.99/month. Each paid plan starts with a 3-day free trial at checkout, then bills monthly. Cancel anytime.'],
  dashboard:['Dashboard','Set up a local profile to track your class, XP, streak, Weak-Spot Radar, and tonight’s plan. The profile and activity stay in this browser.'],
  vault:['The Vault','Browse 32 lesson titles across Money, Career, Life Admin, and The Game. The current workspace offers previews. The first two tracks are intended for Gold and all four for Diamond.'],
  codes:['Cheat Codes','Earn XP and unlock study shortcuts for memory, writing, focus, and more.'],
  settings:['Settings','Choose a Free theme or preview more color options in Settings. Voice Match is planned for Diamond.'],
  faq:['FAQ','If you’re unsure about site policies, check the FAQ.'],
  voice:['Voice Tutor','Use your microphone on supported browsers or type a question. The fox can read its answer aloud using browser speech. One free voice session per day on this device.'],
  install:['Install Donezo','On mobile, use Add to Home Screen from your browser menu. On desktop, look for the browser’s install option.']
};
for(const [key,label,,description,availability] of waveFeatures)guidance[key]=[label,description+' '+availability+'.'];
const intents=[
  [/passcode|owner|command center|admin password/i,'faq','Owner access is private. I can explain public features and help you find the FAQ.'],
  [/referr|promo code|invite code|discount code/i,'referral','You can save a referral code here. Subscription discounts and credit tracking still need a billing connection.'],
  [/flash sale|coupon|discount/i,'faq','Flash sales aren’t active in this workspace. Check the FAQ for the current policy.'],
  [/test tomorrow|test (in|on)|cram|exam tomorrow/i,'cram','Start with Test Tomorrow. Enter the test topics and I’ll send you to the cram planner.'],
  [/science fair|volcano|display board|group project/i,'projects'],
  [/parent|report to|gift/i,'reports'],
  [/classroom|school portal|sync classes/i,'classroom'],
  [/quiz battle|duel|rematch|leaderboard/i,'battles'],
  [/study room|shared timer|locked in|focus room/i,'rooms'],
  [/rescue|raise my grade|failing|report card/i,'rescue'],
  [/print|binder|study pack/i,'print'],
  [/scholarship|fafsa|financial aid|application deadline|college essay|senior wing/i,'senior'],
  [/voice tutor|talk to|microphone/i,'voice'],
  [/install|home screen|pwa/i,'install'],
  [/pricing|price|subscription|tier|gold|diamond|cost|how much/i,'pricing'],
  [/snap|photo|camera|picture/i,'snap'],
  [/entrance exam|college test|test prep|word vault|practice test/i,'test'],
  [/flashcard|study deck|memorize/i,'learn'],
  [/project|presentation/i,'projects'],
  [/capture|transcript|lecture recording|upload audio/i,'capture'],
  [/assignment|due date|deadline|homework planner/i,'assignments'],
  [/algebra|quadratic|equation/i,'school'],
  [/citation|gpa|calculator|writing|summary|summari|translate|paraphrase|language helper|outline/i,'studio'],
  [/signup|sign up|profile|streak|xp|weak.spot|tutor/i,'dashboard'],
  [/life skill|vault|resume|budget/i,'vault'],
  [/cheat code|shortcut/i,'codes'],
  [/theme|voice match|language|spanish/i,'settings'],
  [/policy|cheating|faq/i,'faq']
];
const routeMap={faq:['home','site-faq'],cram:['assignments','cram'],referral:['classroom','referral-entry'],install:['home','install-donezo']};
function navigateGuide(key){
  const [page,target]=routeMap[key]??[key,null];
  const move=()=>{
    const element=target&&document.getElementById(target);
    if(element){element.scrollIntoView({block:'start'});element.querySelector('input,textarea,button')?.focus();}
  };
  if(location.hash==='#'+page||(page==='home'&&!location.hash))move();
  else{window.addEventListener('hashchange',move,{once:true});location.hash=page;}
}
const assistantBox=document.createElement('div');
assistantBox.className='donezo-guide';
assistantBox.innerHTML=`<section class="panel guide-window" id="guide-window" aria-labelledby="guide-title" hidden><div class="split"><h2 id="guide-title">Ask Donezo</h2><button class="ghost quick" id="guide-close">Close</button></div><div class="guide-stream" role="log" aria-live="polite" id="guide-stream"><p>Hey, I’m the Donezo fox. What are you working on?</p></div><div class="guide-shortcuts" id="guide-shortcuts"></div><form id="guide-form" class="stack"><label>Ask Donezo<input name="message" required maxlength="500" placeholder="I have a science fair Friday"></label><button class="primary">Send</button></form></section><button class="primary guide-launch" id="guide-launch" aria-controls="guide-window" aria-expanded="false"><img src="art/fox-192.png" alt="">Ask Donezo</button>`;
document.body.append(assistantBox);
function guideToggle(open){
  el('#guide-window').hidden=!open;
  el('#guide-launch').setAttribute('aria-expanded',open);
  if(open)el('#guide-form input').focus();
}
el('#guide-launch').onclick=()=>guideToggle(el('#guide-window').hidden);
el('#guide-close').onclick=()=>{guideToggle(false);el('#guide-launch').focus();};
assistantBox.onkeydown=event=>{if(event.key==='Escape'){guideToggle(false);el('#guide-launch').focus();}};
function shortcut(label,key,container=el('#guide-shortcuts')){
  const btn=document.createElement('button');btn.type='button';btn.className='ghost quick';btn.textContent=label;
  btn.onclick=()=>{guideToggle(false);navigateGuide(key);};
  container.append(btn);
}
for(const [label,key] of [['Show me Snap It','snap'],['Compare plans','pricing'],['I have a test tomorrow','cram'],['Enter a referral code','referral']])shortcut(label,key);
const schoolSamples=[
  [/photosynthesis/i,'Photosynthesis is how plants use light energy to make sugars from water and carbon dioxide. Oxygen is released.'],
  [/mitosis/i,'Mitosis divides a cell’s nucleus into two nuclei with matching sets of chromosomes. It helps organisms grow and repair tissue.'],
  [/thesis statement/i,'A thesis states the main claim your essay will support. Make it specific enough that each body paragraph can help prove it.'],
  [/newton.s first law|inertia/i,'An object stays at rest or keeps moving at a constant velocity unless a net force acts on it. That resistance to a change in motion is inertia.'],
  [/mean median|what is (the )?median/i,'The median is the middle value when numbers are sorted. If there are two middle values, average them.']
];
function answerGuide(raw){
  const isMember=classes().length>0;
  const input=raw.trim();
  const equation=solve(input.replace(/^(please )?solve[: ]+/i,'').replace(/[?]$/,''));
  const school=equation?.[0]??schoolSamples.find(([match])=>match.test(input))?.[1];
  if(school){
    if(!isMember && read('guide-sample',false))return ['You’ve used the free sample answer on this browser. Set up your workspace to keep asking supported study questions.','dashboard'];
    if(!isMember)save('guide-sample',true);
    return [school+(equation?' '+equation[1].join(' '):'')+(isMember?'':' Want more practice? Set up your Donezo profile.'),isMember?(equation?'school':'learn'):'dashboard'];
  }
  const intent=intents.find(([pattern])=>pattern.test(input));
  if(intent){
    const [,key,message]=intent;
    return [message??guidance[key][1],key];
  }
  if(isMember&&/what should i|my class|my next|weakest|study plan/i.test(input)){
    const weakest=classRows()[0],task=getTasks().filter(t=>!t.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'))[0];
    return ['Start with '+(task?task.title+' ('+dueIn(task.due)+')':weakest.name)+'. Then give '+weakest.name+' a short closed-notes quiz. Want to see the rest of tonight’s plan?','dashboard'];
  }
  return ['I’m not sure about that. I can guide you around Donezo and answer some school questions. Try asking about pricing, a tool, or a deadline.','faq'];
}
el('#guide-form').onsubmit=event=>{
  event.preventDefault();
  const form=event.currentTarget,input=form.elements.message.value.trim();
  if(!input)return;
  const stream=el('#guide-stream');
  const user=document.createElement('p');user.className='guide-user';user.textContent=input;stream.append(user);
  const [message,route]=answerGuide(input);
  const bot=document.createElement('div');const reply=document.createElement('p');reply.textContent=message;bot.append(reply);
  shortcut(guidance[route]?.[0]??({faq:'Read the FAQ',referral:'Enter referral code',cram:'Open Test Tomorrow'}[route]??'Open tool'),route,bot);
  stream.append(bot);stream.scrollTop=stream.scrollHeight;form.reset();
};
const classroomView=views.classroom,classroomBind=bindings.classroom;
views.classroom=()=>classroomView()+`<section class="panel stack" id="referral-entry"><h2>Enter a referral code</h2><p>Save a code with this workspace. Checkout discounts are inactive.</p><form id="referral-entry-form" class="stack">${field('code','Referral code','text','required maxlength="30" pattern="[A-Za-z0-9-]+"')}<button class="primary">Save code</button></form><p id="entered-referral" role="status"></p></section>`;
bindings.classroom=()=>{
  classroomBind();
  const form=el('#referral-entry-form'),code=new URLSearchParams(location.search).get('ref');
  form.elements.code.value=read('entered-referral',code??'');
  form.onsubmit=event=>{
    event.preventDefault();save('entered-referral',form.elements.code.value.trim().toUpperCase());
    el('#entered-referral').textContent='Referral code saved for account registration.';
  };
};
const fafsaSteps=[
  'Check the federal student aid application filing window for your award year and the deadlines for your state and schools.',
  'Create your own the official federal aid site account. Each required contributor needs a separate account.',
  'Gather your identification details, and determine which contributors must join your form.',
  'Gather the tax, income, and asset information the form asks for. Keep those records private.',
  'List the colleges that should receive your federal student aid application information.',
  'Complete the form on the official federal aid site, invite any contributors, and review signatures before submitting.',
  'Review your federal aid application summary and follow up with your schools about next steps.'
];
const programs=()=>read('scholarship-list',[]);
views.senior=()=>`<div class="columns">${wavePanel('Scholarship finder · Diamond preview','<p>Search your saved opportunities. Use the official lookup to find programs and confirm current requirements.</p><a class="ghost" href="https://www.careeronestop.org/Toolkit/Training/find-scholarships.aspx" target="_blank" rel="noopener">Open the official scholarship finder ↗</a><form id="scholarship-filter" class="stack">'+field('state','State')+field('major','Major')+field('gpa','My GPA','number','min="0" max="4" step="any"')+field('by','Deadline before or on','date')+'<button class="primary">Search saved scholarships</button></form><ul id="scholarship-results"></ul><details><summary>Save a scholarship</summary><form id="scholarship-add" class="stack">'+field('title','Scholarship name','text','required maxlength="120"')+field('state','Eligible state (blank for any)')+field('major','Eligible major (blank for any)')+field('gpa','Minimum GPA','number','min="0" max="4" step="any"')+field('due','Confirmed deadline','date','required')+'<button class="ghost">Save scholarship</button></form></details>')}
${wavePanel('Federal aid application walkthrough','<p>A planning checklist. Submit your federal student aid application and check requirements directly with the official federal aid site.</p><ul class="task-list">'+fafsaSteps.map((item,i)=>'<li><label><input type="checkbox" data-fafsa="'+i+'"><span>'+item+'</span></label></li>').join('')+'</ul><a class="ghost" href="https://studentaid.gov/articles/things-you-need-for-fafsa/" target="_blank" rel="noopener">Open the official federal aid checklist ↗</a>')}</div>
${wavePanel('Application deadline tracker','<form id="application-form" class="stack">'+field('college','College name','text','required maxlength="100"')+field('due','Application deadline','date','required')+selectField('status','Essay status',['Not started','Drafting','In review','Complete'])+'<button class="primary">Add to Assignments</button></form><ul id="application-results"></ul><p id="application-status" role="status"></p><div class="actions"><button class="ghost" id="senior-essay">Open College Essay Helper</button><a class="ghost" href="#assignments">Assignment Tracker</a></div>')}`;
bindings.senior=()=>{
  const filter=el('#scholarship-filter'),add=el('#scholarship-add');
  function renderScholarships(){
    const data=Object.fromEntries(new FormData(filter));
    const has=(a,b)=>!a||!b||a.toLowerCase().includes(b.trim().toLowerCase());
    const found=programs().filter(item=>has(item.state,data.state)&&has(item.major,data.major)&&(!data.gpa||+item.gpa<=+data.gpa)&&(!data.by||item.due<=data.by)).sort((a,b)=>a.due.localeCompare(b.due));
    el('#scholarship-results').innerHTML=found.length?found.map(item=>'<li>'+esc(item.title)+' · '+esc(dueIn(item.due))+'</li>').join(''):'<li>No matching saved scholarships.</li>';
  }
  filter.onsubmit=event=>{event.preventDefault();renderScholarships();};
  add.onsubmit=event=>{
    event.preventDefault();
    const item=Object.fromEntries(new FormData(add));
    if(!item.title.trim())return;
    save('scholarship-list',[...programs(),item]);add.reset();renderScholarships();
  };
  renderScholarships();
  const checked=read('fafsa',[]);
  document.querySelectorAll('[data-fafsa]').forEach(input=>{
    const index=+input.dataset.fafsa;
    input.checked=checked.includes(index);
    input.onchange=()=>{if(input.checked)checked.push(index);else checked.splice(checked.indexOf(index),1);save('fafsa',checked);};
  });
  const form=el('#application-form');
  function renderApplications(){
    el('#application-results').innerHTML=getTasks().filter(item=>item.kind==='application').map(item=>'<li>'+esc(item.college)+' · '+esc(item.essay)+' · '+esc(dueIn(item.due))+'</li>').join('')||'<li>No applications saved.</li>';
  }
  form.onsubmit=event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(form)),college=data.college.trim();
    if(!college)return;
    const items=getTasks(),existing=items.find(item=>item.kind==='application'&&item.college.toLowerCase()===college.toLowerCase());
    const item={id:existing?.id??crypto.randomUUID(),kind:'application',college,title:college+' application',essay:data.status,due:data.due,done:existing?.done??false};
    save('assignments',[...items.filter(row=>row.id!==item.id),item]);
    el('#application-status').textContent='Application saved in Assignments.';form.reset();renderApplications();
  };
  el('#senior-essay').onclick=()=>{save('studio-tool','College Essay Helper');location.hash='studio';};
  renderApplications();
};
views.print=()=>wavePanel('Build a printable pack','<p>Choose a saved flashcard deck, a study guide, or your unlocked cheat codes.</p><form class="stack" id="pack-form">'+selectField('kind','Pack type',['Saved flashcards','Study guide','Unlocked cheat codes'])+field('guide','Study guide text (for Study guide packs)','textarea','maxlength="16000"')+'<div class="actions"><button class="primary">Build print preview</button><button class="ghost" type="button" id="print-now" disabled>Print study pack</button></div></form><article id="pack-preview" class="stack" aria-live="polite"></article>');
bindings.print=()=>{
  const form=el('#pack-form'),preview=el('#pack-preview'),printButton=el('#print-now');
  form.onsubmit=event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(form));
    let html= '';
    if(data.kind==='Saved flashcards')html=read('deck',[]).map(([term,definition])=>'<section><h3>'+esc(term)+'</h3><p>'+esc(definition)+'</p></section>').join('');
    if(data.kind==='Study guide'&&data.guide.trim())html='<p class="result-copy">'+esc(data.guide.trim())+'</p>';
    if(data.kind==='Unlocked cheat codes')html=cheatCodes.filter((_,i)=>rank(progressState().xp)>=Math.min(4,Math.floor(i/7))).map(([,name,text])=>'<section><h3>'+esc(name)+'</h3><p>'+esc(text)+'</p></section>').join('');
    preview.innerHTML=html?'<h2>Donezo · '+esc(data.kind)+'</h2>'+html:'<p>Add content for this pack first.</p>';
    printButton.disabled=!html;
  };
  printButton.onclick=()=>{
    document.body.classList.add('printing-pack');
    try{window.print();}finally{document.body.classList.remove('printing-pack');}
  };
};
views.battles=()=>wavePanel('Two-player quiz duel','<p>Pass this device between players. Both get the same 10 questions. This local preview does not connect remote players or validate referral accounts.</p><form id="duel-form" class="stack">'+selectField('subject','Practice bank',Object.keys(practice))+field('player','Your name','text','required maxlength="30"')+field('friend','Friend’s name or referral code','text','required maxlength="30"')+'<div class="actions"><button class="primary">Start battle</button><button class="ghost" type="button" id="duel-invite">Share battle page</button></div></form><div class="stack" id="duel-stage" aria-live="polite"></div><p id="duel-shared" role="status"></p><h3>Local leaderboard</h3><ol id="duel-leaders"></ol>');
bindings.battles=()=>{
  const form=el('#duel-form'), stage=el('#duel-stage');
  if(profile.name)form.elements.player.value=profile.name;
  const renderLeaders=()=>el('#duel-leaders').innerHTML=read('duel-leaders',[]).slice().sort((a,b)=>b.wins-a.wins).slice(0,10).map(item=>'<li>'+esc(item.name)+' · '+item.wins+' wins · '+item.streak+' streak</li>').join('')||'<li>No battles finished yet.</li>';
  renderLeaders();
  el('#duel-invite').onclick=()=>shareText('Donezo Quiz Battles','Try the local Quiz Battles mode: '+location.origin+location.pathname+'#battles',el('#duel-shared'));
  form.onsubmit=event=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form));
    const names=[values.player.trim(),values.friend.trim()];
    if(names.some(n=>!n)||names[0].toLowerCase()===names[1].toLowerCase()){stage.textContent='Enter two different player names.';return;}
    const bank=practice[values.subject], offset=crypto.getRandomValues(new Uint32Array(1))[0]%bank.length;
    const questions=Array.from({length:10},(_,i)=>bank[(offset+i)%bank.length]);
    const scores=[0,0];let turn=0,index=0;
    function showTurn(){
      const [prompt,choices,correct,why]=questions[index];
      stage.innerHTML='<p class="gold">'+esc(names[0])+' '+scores[0]+' – '+scores[1]+' '+esc(names[1])+'</p><h3>'+esc(names[turn])+', question '+(index+1)+' / 10</h3><p>'+esc(prompt)+'</p>'+choices.map((choice,i)=>'<button class="ghost" data-duel-answer="'+i+'">'+esc(choice)+'</button>').join('')+'<p id="duel-feedback"></p><button class="primary" id="duel-next" hidden>Continue</button>';
      const buttons=[...stage.querySelectorAll('[data-duel-answer]')];
      buttons.forEach(button=>button.onclick=()=>{
        buttons.forEach(b=>b.disabled=true);
        const right=+button.dataset.duelAnswer===correct;
        if(right)scores[turn]++;else if(turn===0&&typeof recordMistake==='function')recordMistake(values.subject,prompt,choices[correct],why);
        el('#duel-feedback').textContent=right?'Point scored.':'No point this round.';
        if(turn===1)el('#duel-feedback').textContent+=' '+why;
        el('#duel-next').hidden=false;el('#duel-next').focus();
      });
      el('#duel-next').onclick=()=>{
        index++;
        if(index===10){if(turn===0){turn=1;index=0;handoff();}else finish();}else showTurn();
      };
    }
    function handoff(){
      stage.innerHTML='<h3>Pass the device to '+esc(names[1])+'</h3><button class="primary" id="duel-pass">Ready</button>';
      el('#duel-pass').onclick=showTurn;
    }
    function finish(){
      const winner=scores[0]===scores[1]?-1:Number(scores[1]>scores[0]);
      if(winner>=0){
        const leaders=read('duel-leaders',[]);
        for(let i=0;i<2;i++){
          const person=leaders.find(item=>item.name===names[i])??{name:names[i],wins:0,streak:0};
          if(!leaders.includes(person))leaders.push(person);
          if(i===winner){person.wins++;person.streak++;}else person.streak=0;
        }
        save('duel-leaders',leaders);
        if(profile.name&&names[winner]===profile.name)earn('Quiz Battle victory',15,null,null,'battles');
      }
      stage.innerHTML='<h3>'+esc(winner<0?'Tie game':names[winner]+' wins')+'</h3><p>'+scores[0]+' – '+scores[1]+'</p><div class="actions"><button class="primary" id="duel-rematch">Rematch</button>'+(winner>=0?'<button class="ghost" id="duel-card">Share victory card</button>':'')+'</div>';
      el('#duel-rematch').onclick=()=>form.requestSubmit();
      if(winner>=0)el('#duel-card').onclick=()=>shareText('Donezo victory','I just cooked '+names[1-winner]+' in '+values.subject+' on Donezo. '+scores[winner]+'–'+scores[1-winner]+'.',el('#duel-shared'));
      renderLeaders();
    }
    showTurn();
  };
};
let roomCleanup=()=>{};
views.rooms=()=>wavePanel('Create or join a focus room','<p>Gold preview. Open a second tab on this same browser and enter the room code to share its timer. Remote rooms require a server connection.</p><form class="stack" id="room-form">'+field('name','Display name','text','required maxlength="35"')+field('code','Room code (leave blank to create)','text','maxlength="8" pattern="[A-Za-z0-9]{6,8}"')+'<button class="primary">Enter room</button></form><p id="room-feedback" role="status"></p><section class="stack" id="room-state" hidden><h3 id="room-code"></h3><p class="answer" id="room-clock"></p><p id="room-people"></p><label>Minutes<input type="number" min="1" max="90" id="room-minutes" value="25"></label><div class="actions"><button class="primary" id="room-start">Start shared focus</button><button class="ghost" id="room-end">End focus</button><button class="ghost" id="room-leave">Leave room</button></div><div id="room-tutor" role="status"></div></section>');
bindings.rooms=()=>{
  const form=el('#room-form'),state=el('#room-state');
  form.elements.name.value=profile.name??'';
  form.elements.code.value=new URLSearchParams(location.search).get('room')??'';
  const id=crypto.randomUUID();
  let key,clock,heartbeat;
  const fetchRoom=()=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
  const storeRoom=room=>localStorage.setItem(key,JSON.stringify(room));
  function update(){
    const room=fetchRoom();if(!room)return;
    if(typeof markGroupGrove==='function')markGroupGrove(room);
    const seconds=Math.max(0,Math.ceil((room.end-Date.now())/1000));
    el('#room-clock').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
    el('#room-people').textContent='Locked in: '+Object.values(room.people).filter(p=>Date.now()-p.at<18000).map(p=>p.name).join(', ');
    const phase=seconds?'focus':room.end?'recap':'waiting';
    const tutor=el('#room-tutor');
    if(tutor.dataset.phase!==phase){
      tutor.dataset.phase=phase;
      tutor.innerHTML=phase==='focus'?'<p>Warm-up from the fox: What single thing will you finish before time is up?</p>':phase==='recap'?'<details><summary>Recap quiz</summary><p>Can you recall three things you studied, explain one without notes, and identify one to review next?</p></details>':'<p>Ready when you are.</p>';
    }
  }
  function leave(){
    clearInterval(clock);clearInterval(heartbeat);
    const room=key&&fetchRoom();
    if(room){if(room.grove&&room.grove.end>Date.now())room.grove.withered=true;delete room.people[id];try{storeRoom(room);}catch{}}
    key=undefined;
    window.removeEventListener('storage',sync);
    window.removeEventListener('pagehide',leave);
    roomCleanup=()=>{};
  }
  function sync(event){if(event.key===key)update();}
  function touch(){
    const room=fetchRoom();
    if(room?.people[id]){room.people[id].at=Date.now();try{storeRoom(room);}catch{}}
  }
  form.onsubmit=event=>{
    event.preventDefault();const data=Object.fromEntries(new FormData(form)),name=data.name.trim();
    if(!name)return;
    const code=data.code.trim().toUpperCase()||crypto.randomUUID().slice(0,8).toUpperCase();
    key='donezo-room-'+code;
    const current=fetchRoom();
    if(data.code&&!current){el('#room-feedback').textContent='Room not found in this browser.';key=undefined;return;}
    const room=current??{end:0,people:{}};
    room.people[id]={name,at:Date.now()};
    try{storeRoom(room);}catch{el('#room-feedback').textContent='Browser storage is unavailable.';key=undefined;return;}
    form.hidden=true;state.hidden=false;
    el('#room-feedback').textContent='';
    el('#room-code').textContent='Room code: '+code;
    clock=setInterval(update,500);heartbeat=setInterval(touch,5000);
    window.addEventListener('storage',sync);
    window.addEventListener('pagehide',leave);
    roomCleanup=leave;update();
  };
  el('#room-start').onclick=()=>{
    const input=el('#room-minutes');
    if(!input.reportValidity()||!input.value)return;
    const room=fetchRoom();
    if(room.end>Date.now())return;
    room.end=Date.now()+Number(input.value)*60000;
    room.grove={id:crypto.randomUUID(),start:Date.now(),end:room.end,withered:false};
    storeRoom(room);update();
  };
  el('#room-end').onclick=()=>{const room=fetchRoom();if(room.grove&&room.grove.end>Date.now())room.grove.withered=true;room.end=Date.now();storeRoom(room);update();};
  el('#room-leave').onclick=()=>{leave();form.hidden=false;state.hidden=true;};
};
window.addEventListener('hashchange',()=>{if(location.hash!=='#rooms')roomCleanup();});
section('voice','Voice Tutor','◉','Talk to your fox tutor or type a follow-up.');
views.voice=()=>wavePanel('Talk to your tutor','<p>One Free session per day in this browser, with follow-ups while the page stays open. Paid access is not connected.</p><button id="voice-open" class="primary">Start voice tutor session</button><div id="voice-session" class="stack" hidden><form class="stack" id="voice-form">'+field('question','Your question','text','required maxlength="500"')+'<div class="actions"><button class="primary">Ask the fox</button><button type="button" id="voice-listen" class="ghost">🎙 Use microphone</button><button type="button" id="voice-silence" class="ghost">Stop speech</button></div></form><p id="voice-answer" role="status"></p></div><p id="voice-status" role="status"></p>');
bindings.voice=()=>{
  const open=el('#voice-open'),session=el('#voice-session'), status=el('#voice-status'),form=el('#voice-form');
  let recognition;
  const clean=()=>{
    try{recognition?.abort();}catch{}
    window.speechSynthesis?.cancel();
  };
  window.addEventListener('hashchange',clean,{once:true});
  open.onclick=()=>{
    if(read('voice-day','')===today()){status.textContent='Today’s voice session was already started. You can still use Ask Donezo.';return;}
    save('voice-day',today());session.hidden=false;open.hidden=true;form.elements.question.focus();
  };
  el('#voice-listen').onclick=()=>{
    const Engine=window.SpeechRecognition??window.webkitSpeechRecognition;
    if(!Engine){status.textContent='Microphone transcription is unavailable. Type your question instead.';return;}
    window.speechSynthesis?.cancel();
    try{
      recognition=new Engine();recognition.lang=document.documentElement.lang==='es'?'es-US':'en-US';
      recognition.onresult=event=>{
        form.elements.question.value=event.results[0][0].transcript.slice(0,500);
        status.textContent='Review your question, then ask the fox.';
      };
      recognition.onerror=()=>status.textContent='Microphone transcription failed. You can still type.';
      recognition.start();status.textContent='Listening…';
    }catch{status.textContent='Could not start the microphone.';}
  };
  form.onsubmit=event=>{
    event.preventDefault();
    const [reply]=answerGuide(form.elements.question.value);
    const message=(profile.tutor==='Hype Coach'?'Let’s get it. ':profile.tutor==='Strict Professor'?'Focus on the method. ':profile.tutor==='Funny Friend'?'Fox fact incoming. ':'I got you. ')+reply;
    el('#voice-answer').textContent=message;form.reset();
    if('speechSynthesis' in window){
      speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(message);utterance.rate=.98;
      speechSynthesis.speak(utterance);
    }else status.textContent='Your browser does not support speech playback.';
  };
  el('#voice-silence').onclick=()=>window.speechSynthesis?.cancel();
};
let installPrompt;
const appInstalled=()=>matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true||read('pwa-installed',false);
function installPanel(){
  return wavePanel('Add Donezo to your home screen','<div id="install-donezo" class="stack"><p>Keep Donezo one tap away.</p><button class="primary" id="install-button">Install Donezo</button><p id="install-status" role="status"></p></div>');
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{save('pwa-installed',true);installPrompt=undefined;if(el('#install-status'))el('#install-status').textContent='Donezo installed.';});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
const baseHomeWave=views.home;
views.home=()=>baseHomeWave().replace('<h2>FAQ</h2>','<h2 id="site-faq">FAQ</h2><details><summary>How does School Portal import work?</summary><p>Free sample import uses demo classes and assignments. Gold live sync is planned.</p></details><details><summary>Can I play or focus with friends?</summary><p>Quiz Battles currently use one device. The Study Room preview shares a timer across tabs in one browser.</p></details><details><summary>What are the Diamond previews?</summary><p>Parent Reports, Senior Wing, and unlimited Voice Tutor are intended for Diamond. The report and college tools can be previewed, and Voice Tutor offers one free local session per day.</p></details><details><summary>Can I install Donezo, print, or use Spanish?</summary><p>Use the install button or your browser’s Home Screen option. Study Packs has a print layout. Español currently translates navigation and selected guide replies.</p></details>')+wavePanel('What’s new in Donezo','<div class="table-wrap"><table class="compare"><thead><tr><th>Feature</th><th>Planned access</th><th>Available now</th></tr></thead><tbody>'+waveFeatures.map(([key,title,,,status])=>'<tr><th scope="row"><a href="#'+key+'">'+title+'</a></th><td>'+esc(status.split(' · ')[0])+'</td><td>'+esc(({classroom:'Sample import',reports:'Local report',battles:'Same-device duel',senior:'Checklist and trackers',rooms:'Same-browser timer',rescue:'Pinned recovery plan',print:'Print layout'})[key])+'</td></tr>').join('')+'<tr><th scope="row">Voice Tutor</th><td>One Free session/day. Unlimited planned for paid tiers.</td><td>Browser speech and supported questions</td></tr><tr><th scope="row">Ask Donezo</th><td>Free</td><td>Site guide and sample school answers</td></tr><tr><th scope="row">App install</th><td>Free</td><td>Home-screen app on supported browsers</td></tr><tr><th scope="row">Español</th><td>Free</td><td>Navigation and selected guide replies</td></tr></tbody></table></div>')+(appInstalled()?'':installPanel());
const oldHomeBindWave=bindings.home;
bindings.home=()=>{
  oldHomeBindWave();
  const button=el('#install-button');
  if(!button)return;
  button.onclick=async()=>{
    const status=el('#install-status');
    if(installPrompt){
      const prompt=installPrompt;installPrompt=undefined;
      try{await prompt.prompt();const choice=await prompt.userChoice;status.textContent=choice.outcome==='accepted'?'Install accepted.':'Install dismissed.';}catch{status.textContent='Open your browser menu to install Donezo.';}
    }else status.textContent='On mobile, use Add to Home Screen from your browser menu. On desktop, look for the install option.';
  };
  if(read('visited-wave',false)&&!read('install-dismissed',false)){
    main.insertAdjacentHTML('afterbegin','<div class="panel split" id="install-reminder"><span>Add Donezo to your home screen.</span><div class="actions"><button class="ghost quick" id="install-jump">Install</button><button class="ghost quick" id="install-dismiss">Dismiss</button></div></div>');
    el('#install-jump').onclick=()=>{el('#install-donezo').scrollIntoView();button.focus();};
    el('#install-dismiss').onclick=()=>{save('install-dismissed',true);el('#install-reminder').remove();};
  }
  save('visited-wave',true);
};
const spanish={
  Home:'Inicio',Dashboard:'Panel',Assignments:'Tareas',Settings:'Configuración','Tool Studio':'Herramientas','Snap It':'Escanear tarea',Capture:'Capturar','School Wing':'Zona escolar','Projects Wing':'Proyectos',Learn:'Aprender','Test Prep':'Preparación de exámenes','The Vault':'La bóveda','Cheat Codes':'Trucos de estudio',Plans:'Planes','School Portal':'Portal escolar','Parent Reports':'Informes familiares','Quiz Battles':'Duelos de preguntas','Senior Wing':'Último año','Study Rooms':'Salas de estudio','Report Card Rescue':'Recuperar tus notas','Study Packs':'Paquetes de estudio','Voice Tutor':'Tutor por voz','My profile':'Mi perfil','Donezo workspace':'Espacio de Donezo','Your classes, progress and tutor.':'Tus clases, progreso y tutor.','Send':'Enviar','Close':'Cerrar','Ask Donezo':'Pregunta a Donezo','Show me Snap It':'Abrir escáner de tareas','Compare plans':'Comparar planes','I have a test tomorrow':'Tengo un examen mañana','Enter a referral code':'Ingresar un código de invitación','Read the FAQ':'Leer preguntas frecuentes'
};
function isSpanish(){return read('interface-language','en')==='es';}
function localize(){
  document.documentElement.lang=isSpanish()?'es':'en';
  const language=el('#language-switch');
  if(language){language.textContent=isSpanish()?'English':'Español';language.setAttribute('aria-pressed',String(isSpanish()));}
  for(const item of nav.querySelectorAll('a')){
    const key=item.hash.slice(1),original=sections[key]?.[0];
    if(original)item.lastChild.textContent=isSpanish()?(spanish[original]??original):original;
  }
  if(isSpanish())for(const item of main.querySelectorAll('h1,.eyebrow')){
    const word=item.textContent.trim();
    if(spanish[word])item.textContent=spanish[word];
  }
  const profileButton=el('#profile-button');
  if(!profile.name)profileButton.textContent=isSpanish()?spanish['My profile']:'My profile';
  for(const [selector,word] of [['#guide-title','Ask Donezo'],['#guide-close','Close'],['#guide-form button','Send']])el(selector).textContent=isSpanish()?spanish[word]:word;
  el('#guide-launch').lastChild.textContent=isSpanish()?spanish['Ask Donezo']:'Ask Donezo';
  el('#guide-form label').firstChild.textContent=isSpanish()?spanish['Ask Donezo']:'Ask Donezo';
  [...el('#guide-shortcuts').children].forEach((btn,index)=>{
    const word=['Show me Snap It','Compare plans','I have a test tomorrow','Enter a referral code'][index];
    btn.textContent=isSpanish()?spanish[word]:word;
  });
}
const languageButton=document.createElement('button');
languageButton.type='button';languageButton.className='ghost quick';languageButton.id='language-switch';
const headerControls=document.createElement('div');headerControls.className='actions';
el('header').append(headerControls);headerControls.append(languageButton,el('#profile-button'));
languageButton.onclick=()=>{if(location.hash==='#rooms')roomCleanup();save('interface-language',isSpanish()?'en':'es');show();localize();};
const oldGuideSubmit=el('#guide-form').onsubmit;
const guideSpanish=[
  [/propietario|contraseñ|centro de mando/i,'La información privada del propietario no se muestra. Consulta las preguntas frecuentes.','faq'],
  [/precio|plan|cuesta|suscripci|gold|diamond/i,'Gratis cuesta $0, Gold $19.99 al mes y Diamond $49.99 al mes. Cada plan pago empieza con 3 días gratis y luego se cobra al mes. Cancela cuando quieras.','pricing'],
  [/examen mañana|prueba mañana|repasar/i,'Abre el modo de repaso y escribe los temas del examen.','cram'],
  [/ciencia|feria|proyecto/i,'En Proyectos encontrarás ideas, materiales y una plantilla para la feria de ciencias.','projects'],
  [/foto|escanear/i,'Abre el escáner, confirma la pregunta y revisa cada paso. El solucionador actual admite álgebra.','snap'],
  [/invitaci|referid/i,'Puedes guardar un código de invitación. Los descuentos todavía no están conectados.','referral'],
  [/padres|familia/i,'El informe familiar resume el progreso que guardaste en este navegador.','reports'],
  [/beca|universidad|fafsa/i,'En Último año puedes organizar becas guardadas, solicitudes y los pasos de federal student aid application.','senior'],
  [/classroom|importar/i,'La importación de muestra añade clases, tareas y exámenes sin iniciar sesión en el portal.','classroom'],
  [/imprim|fichas/i,'Abre Paquetes de estudio para imprimir fichas, una guía o trucos desbloqueados.','print'],
  [/batalla|duelo/i,'Puedes jugar un duelo de diez preguntas por persona en un solo dispositivo.','battles'],
  [/sala|temporizador/i,'La sala de estudio comparte el temporizador entre pestañas del mismo navegador.','rooms']
];
el('#guide-form').onsubmit=event=>{
  if(!isSpanish()){oldGuideSubmit(event);return;}
  event.preventDefault();
  const form=event.currentTarget,input=form.elements.message.value.trim();
  if(!input)return;
  const row=guideSpanish.find(([pattern])=>pattern.test(input));
  const response=row?.[1]??'No estoy seguro. Puedo mostrarte las preguntas frecuentes o ayudarte a encontrar una herramienta.';
  const route=row?.[2]??'faq';
  const stream=el('#guide-stream'),user=document.createElement('p'),bot=document.createElement('p');
  user.className='guide-user';user.textContent=input;bot.textContent=response;stream.append(user,bot);
  const word=guidance[route]?.[0];
  shortcut(spanish[word]??(route==='cram'?'Abrir modo de repaso':route==='referral'?'Ingresar código':'Más información'),route,stream);
  stream.scrollTop=stream.scrollHeight;form.reset();
};
Object.assign(languagePhrases,{'see you tomorrow':['Hasta mañana','À demain'],'can you help me?':['¿Puedes ayudarme?','Peux-tu m’aider ?'],'i have a question':['Tengo una pregunta','J’ai une question'],'when is it due?':['¿Para cuándo es?','C’est pour quand ?'],'i do not understand':['No entiendo','Je ne comprends pas'],'how do you say this?':['¿Cómo se dice esto?','Comment dit-on cela ?'],'i am studying for a test':['Estoy estudiando para un examen','Je révise pour un examen']});
studio['Language Helper'][0]=selectField('language','Language',['Spanish','French'])+selectField('text','Common phrase',Object.keys(languagePhrases));
window.addEventListener('hashchange',localize);
show();localize();
