const fsrsTarget=.90;
const fsrsScheduler=window.FSRS.fsrs({request_retention:fsrsTarget,enable_fuzz:false});
const fsrsGrades=[['Again',window.FSRS.Rating.Again],['Hard',window.FSRS.Rating.Hard],['Good',window.FSRS.Rating.Good],['Easy',window.FSRS.Rating.Easy]];
const fsrsKey=card=>JSON.stringify(card);
const fsrsDate=value=>new Date(value);
const fsrsCard=state=>({...state,due:fsrsDate(state.due),last_review:state.last_review?fsrsDate(state.last_review):undefined});
const fsrsSaved=()=>read('fsrs-v6',{});
function migratedState(card,now){
  const key=fsrsKey(card),legacy=read('card-schedule',{})[key],rating=read('flash-ratings',{})[key];
  const empty=window.FSRS.createEmptyCard(now);
  if(!legacy&&!rating)return {card:empty,reviews:0,recalls:0};
  const known=rating==='known'||legacy?.days>0;
  const interval=Math.max(1,Number(legacy?.days)||1),hasDue=Number.isFinite(legacy?.due),due=hasDue?legacy.due:now.getTime();
  const last=new Date(Math.min(now.getTime(),due-(known?interval*86400000:600000)));
  const first=fsrsScheduler.next(window.FSRS.createEmptyCard(last),last,known?window.FSRS.Rating.Good:window.FSRS.Rating.Again).card;
  first.due=new Date(due);
  if(known&&interval>1){
    first.state=window.FSRS.State.Review;
    first.stability=interval;
    first.scheduled_days=interval;
  }
  return {card:first,reviews:0,recalls:0,migrated:true};
}
function syncFsrsCards(cards){
  const now=new Date(),book=fsrsSaved();
  let changed=false;
  for(const card of cards){
    const key=fsrsKey(card);
    if(!Object.hasOwn(book,key)){book[key]=migratedState(card,now);changed=true;}
  }
  if(changed)save('fsrs-v6',book);
  return book;
}
function reviewDeadline(record){return fsrsDate(record.card.due).getTime();}
const namedFsrsDecks=()=>read('fsrs-decks-v6',[]);
function fsrsDeckCatalog(){
  return [{id:'current',name:'Current deck',cards:read('deck',[])},...namedFsrsDecks()];
}
function allReviewCards(){
  return [...new Map(fsrsDeckCatalog().flatMap(item=>item.cards).map(card=>[fsrsKey(card),card])).values()];
}
function dueFsrs(cards=allReviewCards()){
  const book=syncFsrsCards(cards),now=Date.now();
  return cards.filter(card=>reviewDeadline(book[fsrsKey(card)])<=now).sort((a,b)=>reviewDeadline(book[fsrsKey(a)])-reviewDeadline(book[fsrsKey(b)]));
}
reviewCards=()=>dueFsrs();
function fsrsGradeCard(card,rating,log=true){
  const key=fsrsKey(card),book=syncFsrsCards([card]),entry=book[key];
  const result=fsrsScheduler.next(fsrsCard(entry.card),new Date(),rating);
  book[key]={...entry,card:result.card,reviews:entry.reviews+(log?1:0),recalls:entry.recalls+(log&&rating!==window.FSRS.Rating.Again?1:0),lastRating:rating};
  save('fsrs-v6',book);
  if(log)earn('FSRS review',2,classes()[0]?.name,rating===window.FSRS.Rating.Again?0:1,'learn');
  return result.card;
}
scheduleRating=(card,known)=>fsrsGradeCard(card,known?window.FSRS.Rating.Good:window.FSRS.Rating.Again,false);
const priorMistakeSix=recordMistake;
recordMistake=function(topic,prompt,correct,why){
  priorMistakeSix(topic,prompt,correct,why);
  const card=[String(prompt),String(correct)],key=fsrsKey(card),book=syncFsrsCards([card]);
  book[key]={...book[key],card:{...book[key].card,due:new Date()}};
  save('fsrs-v6',book);
};
function retentionSummary(cards){
  const book=syncFsrsCards(cards),now=new Date();
  let prediction=0,seen=0,attempts=0,recalls=0,due=0;
  for(const card of cards){
    const row=book[fsrsKey(card)],state=fsrsCard(row.card);
    if(state.last_review){
      const estimate=fsrsScheduler.get_retrievability(state,now,false);
      if(Number.isFinite(estimate)){prediction+=estimate;seen++;}
    }
    attempts+=row.reviews;recalls+=row.recalls;
    if(reviewDeadline(row)<=now.getTime())due++;
  }
  return {cards:cards.length,due,predicted:seen?Math.round(100*prediction/seen):null,observed:attempts?Math.round(100*recalls/attempts):null,attempts};
}
function retentionTable(){
  return '<div class="table-wrap"><table class="compare"><caption>Retention by deck</caption><thead><tr><th>Deck</th><th>Cards</th><th>Due now</th><th>Estimated recall now</th><th>Observed recall</th></tr></thead><tbody>'+fsrsDeckCatalog().map(deck=>{
    const x=retentionSummary(deck.cards);
    return '<tr><th scope="row">'+esc(deck.name)+'</th><td>'+x.cards+'</td><td>'+x.due+'</td><td>'+(x.predicted===null?'No reviews yet':x.predicted+'%')+'</td><td>'+(x.observed===null?'No FSRS ratings yet':x.observed+'% · '+x.attempts+' reviews')+'</td></tr>';
  }).join('')+'</tbody></table></div>';
}
function gradeButtons(disabled){
  return '<div class="actions fsrs-grades">'+fsrsGrades.map(([label,grade])=>'<button class="ghost" data-fsrs-grade="'+grade+'" '+(disabled?'disabled':'')+'>'+label+'</button>').join('')+'</div>';
}
function scheduleNotice(card){
  const next=new Date(card.due);
  return 'Next review: '+next.toLocaleString();
}
const fsrsLearn=views.learn,fsrsLearnBind=bindings.learn;
views.learn=()=>fsrsLearn()+wavePanel('Decks and FSRS retention','<p>Save a named copy of your current deck. Ratings target '+Math.round(fsrsTarget*100)+'% recall. The same card shares its review history across decks.</p><form id="name-fsrs-deck" class="stack">'+field('name','Deck name','text','required maxlength="75"')+'<button class="primary">Save named deck</button></form><div id="fsrs-library-list"></div><div id="fsrs-stats"></div><p id="fsrs-deck-status" role="status"></p>');
bindings.learn=()=>{
  fsrsLearnBind();
  el('#know')?.remove();el('#still')?.remove();
  el('#flash-progress').insertAdjacentHTML('afterend','<div id="fsrs-deck-controls">'+gradeButtons(true)+'<p id="current-fsrs-schedule" role="status"></p></div>');
  const buttons=[...document.querySelectorAll('#fsrs-deck-controls [data-fsrs-grade]')],feedback=el('#current-fsrs-schedule');
  let revealed=false;
  function state(value){revealed=value;for(const button of buttons)button.disabled=!revealed;}
  const flash=el('#flash'),flip=flash.onclick;
  flash.onclick=event=>{flip.call(flash,event);state(!revealed);};
  for(const button of [el('#next'),el('#previous')]){
    const previous=button.onclick;button.onclick=event=>{previous.call(button,event);state(false);};
  }
  function redrawDecks(){
    el('#fsrs-stats').innerHTML=retentionTable();
    const list=el('#fsrs-library-list');
    list.innerHTML='<div class="actions">'+namedFsrsDecks().map(deck=>'<button class="ghost" data-load-deck="'+deck.id+'">Load '+esc(deck.name)+'</button>').join('')+'</div>';
    list.querySelectorAll('[data-load-deck]').forEach(button=>button.onclick=()=>{
      const deck=namedFsrsDecks().find(row=>row.id===button.dataset.loadDeck);
      if(deck){save('deck',deck.cards);show();}
    });
  }
  const edit=el('#deck-form'),saveEdit=edit.onsubmit;
  edit.onsubmit=event=>{saveEdit.call(edit,event);state(false);redrawDecks();};
  for(const button of buttons)button.onclick=()=>{
    const index=Number(el('#card-count').textContent.match(/Card (\d+)/)?.[1])-1,card=read('deck',[])[index];
    if(!revealed||!card)return;
    try{
      feedback.textContent=scheduleNotice(fsrsGradeCard(card,+button.dataset.fsrsGrade));
      el('#next').click();redrawDecks();flash.focus();
    }catch{feedback.textContent='This review could not be scheduled.';}
  };
  wired(el('#name-fsrs-deck'),data=>{
    const name=data.name.trim(),cards=read('deck',[]);
    if(!cards.length||!name){el('#fsrs-deck-status').textContent='Add cards and a name first.';return;}
    const stored=namedFsrsDecks(),existing=stored.find(row=>row.name.toLowerCase()===name.toLowerCase());
    save('fsrs-decks-v6',[...stored.filter(item=>item.id!==existing?.id),{id:existing?.id??crypto.randomUUID(),name,cards}]);
    el('#fsrs-deck-status').textContent='Named deck saved.';redrawDecks();
  });
  redrawDecks();
};
views.review=()=>wavePanel('Due Today · FSRS','<p>Due cards come first. Flip a card, then rate how well you remembered it.</p>'+selectField('reviewDeck','Review deck',['All decks',...fsrsDeckCatalog().map(deck=>deck.name)]).replace('name="reviewDeck"','id="fsrs-deck-choice"')+'<div id="review-queue" class="stack"></div><p id="fsrs-review-message" role="status"></p><div id="review-retention"></div>'+links([['Edit flashcards','learn']]));
bindings.review=()=>{
  const output=el('#review-queue'),picker=el('#fsrs-deck-choice'),message=el('#fsrs-review-message');
  function render(){
    const cards=picker.selectedIndex===0?allReviewCards():fsrsDeckCatalog()[picker.selectedIndex-1]?.cards??[];
    const due=dueFsrs(cards),card=due[0];
    el('#review-retention').innerHTML=retentionTable();
    if(!card){output.innerHTML='<p>You’re caught up. Cards reappear when their next review is due.</p>';return;}
    output.innerHTML='<p>'+due.length+' due now</p><button class="flash" id="fsrs-flip">'+esc(card[0])+'</button>'+gradeButtons(true);
    el('#fsrs-flip').onclick=()=>{
      el('#fsrs-flip').textContent=card[1];
      for(const button of output.querySelectorAll('[data-fsrs-grade]'))button.disabled=false;
      el('[data-fsrs-grade]',output).focus();
    };
    for(const button of output.querySelectorAll('[data-fsrs-grade]'))button.onclick=()=>{
      try{message.textContent=scheduleNotice(fsrsGradeCard(card,+button.dataset.fsrsGrade));render();el('#fsrs-flip')?.focus();}
      catch{message.textContent='This review could not be scheduled.';}
    };
  }
  picker.onchange=render;render();
};
syncFsrsCards(allReviewCards());

function verifyWave6Equation(input,solution){
  const proof=checkEquation(input,solution);
  if(!proof)return null;
  const roots=[...solution[0].matchAll(/x = (-?(?:\d+(?:\.\d+)?)(?:e[+-]?\d+)?)/gi)].map(match=>+match[1]);
  try{
    const [left,right]=input.toLowerCase().replace(/\s/g,'').replace(/−/g,'-').replace(/²/g,'^2').replace(/([\d.])(?=x)/g,'$1*').split('=').map(compileGraph);
    const diff=x=>left(x)-right(x);
    const c=diff(0),plus=diff(1),minus=diff(-1),b=(plus-minus)/2,a=(plus+minus)/2-c;
    if(![a,b,c].every(Number.isFinite))return null;
    const center=a?-b/(2*a):-c/b;
    const radiusSquared=a?center*center-c/a:0;
    if(!Number.isFinite(center)||!Number.isFinite(radiusSquared)||radiusSquared<0)return null;
    const offset=Math.sqrt(radiusSquared);
    const independent=offset?[center-offset,center+offset]:[center];
    const expected=roots.slice().sort((x,y)=>x-y);
    const agrees=expected.length===independent.length&&expected.every((root,i)=>Math.abs(root-independent[i])<=1e-6*Math.max(1,Math.abs(root)));
    return agrees?'Second solution agrees. Substitution: '+proof:null;
  }catch{return null;}
}
const incomingReferral=new URLSearchParams(location.search).get('ref')?.trim().toUpperCase();
if(incomingReferral&&/^[A-Z0-9-]{1,30}$/.test(incomingReferral))save('entered-referral',incomingReferral);
const retrievalBeforeSix=retrieveAccount;
let themeWrite=Promise.resolve();
let themeRevision=0;
retrieveAccount=async()=>{
  const revision=themeRevision;
  await themeWrite;
  await retrievalBeforeSix();
  if(revision!==themeRevision)return;
  const theme=activeAccount?.theme;
  if(activeAccount?.status==='Active'&&theme&&themes.includes(theme)){
    profile={...profile,theme};save('profile',profile);applyTheme();
    const select=el('#prefs select[name="theme"]');
    if(select)select.value=theme;
  }
};
const settingsSix=bindings.settings;
bindings.settings=()=>{
  settingsSix();
  const form=el('#prefs'),submit=form.onsubmit,status=el('#pref-status');
  form.onsubmit=event=>{
    submit.call(form,event);
    const theme=profile.theme;
    const revision=++themeRevision;
    themeWrite=themeWrite.then(async()=>{
      if(!identity)await retrievalBeforeSix();
      if(activeAccount?.status!=='Active'){if(revision===themeRevision)status.textContent='Preferences saved on this device.';return;}
      try{
        await manageRequest('account-theme',{theme});
        activeAccount={...activeAccount,theme};
        if(revision===themeRevision)status.textContent='Theme synced to your Donezo account.';
      }catch{if(revision===themeRevision)status.textContent='Theme saved on this device. Account sync was unavailable.';}
    });
  };
};
const accountBeforeSix=showAccount;
showAccount=()=>{
  accountBeforeSix();
  const share=el('#share-referral'),copy=el('#copy-referral'),status=el('#referral-status');
  if(!activeAccount||!share||!copy||!status)return;
  const code=activeAccount.referral;
  if(copy.closest('section')?.querySelector('.gold'))copy.closest('section').querySelector('.gold').textContent=code;
  copy.onclick=async()=>{
    try{await navigator.clipboard.writeText(code);status.textContent='Code copied.';}catch{status.textContent=code;}
  };
  share.onclick=async()=>{
    const url=new URL(location.pathname,location.origin);
    url.searchParams.set('ref',code);url.hash='dashboard';
    try{if(navigator.share)await navigator.share({title:'Join me on Donezo',url:url.href});else await navigator.clipboard.writeText(url.href);status.textContent='Share link ready.';}
    catch{status.textContent=url.href;}
  };
};
const guidedToolsSix={
  school:['Math Step Solver','Identify the variable and the operations on each side. Predict what cancels, then compare with the worked steps.'],
  snap:['Snap It','After confirming the extracted question, try the first calculation on paper. Compare it with the worked solution and use the practice problems to try again.'],
  learn:['Flashcard Maker','Write one idea per card. Try to recall the answer before flipping, then pick the rating that reflects how you did.'],
  projects:['Project Builder','Start with a question you can investigate. Identify the materials and explain what evidence would answer your question.'],
  assignments:['Assignment Tracker','Break each task into a concrete next action. Schedule the earliest deadline first and leave time to check your work.'],
  notelab:['Note Lab','Identify the main claim, then find supporting details in the source. Try answering the questions before checking the explanations.'],
  graph:['Graphing','Predict where the curve crosses each axis. Compare with the plotted result and check an intersection in both expressions.'],
  workcheck:['Check My Work','Read each of your steps aloud. Find the first place where a rule changes, correct that line, and carry the correction through.'],
  minisolvers:['Subject Solvers','Write the values and units or the atom counts first. Then check that the result satisfies the original problem.'],
  slides:['Presentation Builder','Give each slide one claim. Use a piece of evidence for that claim and a short explanation in your own words.'],
  capture:['Capture','Check the transcript first. Mark the main idea, evidence, and any actual due dates before making study materials.'],
};
for(const [route,[name,tip]] of Object.entries(guidedToolsSix)){
  const view=views[route],binding=bindings[route];
  views[route]=()=>wavePanel(name+' · Learn Mode','<label class="remove-avatar"><input type="checkbox" id="learn-mode-six" '+(read('learn-mode-'+route,false)||withinStudyHours()?'checked':'')+'> Show guided practice</label><p id="guided-practice-six" hidden>'+esc(tip)+'</p>')+view();
  bindings[route]=()=>{
    binding?.();
    const control=el('#learn-mode-six'),practice=el('#guided-practice-six');
    practice.hidden=!control.checked;
    control.onchange=()=>{save('learn-mode-'+route,control.checked);practice.hidden=!control.checked;};
  };
}
void retrieveAccount().then(voiceControls);
show();localize();
