const pageArtwork={home:'hero',snap:'snap',capture:'snap',school:'snap',projects:'projects',learn:'codes',test:'test',vault:'vault',codes:'codes',pricing:'vault',dashboard:'celebration',studio:'hero',assignments:'projects',settings:'empty',classroom:'projects',reports:'celebration',battles:'codes',senior:'test',rooms:'codes',rescue:'test',print:'projects',voice:'empty',notelab:'hero',review:'codes',workcheck:'snap',graph:'snap',library:'vault',ap:'test',minisolvers:'snap',slides:'projects'};
for(const [route,info] of Object.entries(sections))info[3]=pageArtwork[route]??'empty';
const finalSidebar=el('aside'), menu=document.createElement('button');
finalSidebar.id='workspace-sidebar';
menu.className='ghost mobile-menu';menu.type='button';menu.textContent='☰ Menu';
menu.setAttribute('aria-controls',finalSidebar.id);menu.setAttribute('aria-expanded','false');
el('header').prepend(menu);
function mobile(open){finalSidebar.classList.toggle('menu-open',open);menu.setAttribute('aria-expanded',String(open));}
menu.onclick=()=>mobile(menu.getAttribute('aria-expanded')!=='true');
nav.onclick=event=>{if(event.target.closest('a'))mobile(false);};
window.addEventListener('hashchange',()=>mobile(false));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){mobile(false);menu.focus();}});
let ocrLoad;
async function recognizeHomework(file,progress,keepLines=false){
  if(file.size>20_000_000)throw Error('Photo too large.');
  progress(null);
  if(!ocrLoad)ocrLoad=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/ocr/tesseract.min.js';
    script.onload=resolve;script.onerror=()=>{ocrLoad=undefined;script.remove();reject(Error('Could not load automatic extraction.'));};
    document.head.append(script);
  });
  await ocrLoad;
  const worker=await Tesseract.createWorker('eng',1,{workerPath:location.origin+'/ocr/worker.min.js',corePath:location.origin+'/ocr/tesseract-core-lstm.wasm.js',langPath:location.origin+'/ocr',workerBlobURL:false,logger:message=>{if(message.status==='recognizing text')progress(Math.round(100*message.progress));}});
  try{
    const {data}=await worker.recognize(file);
    if(!keepLines&&data.confidence<35)return "";
    return keepLines?data.text.trim():data.text.replace(/\s+/g,' ').trim();
  }finally{await worker.terminate();}
}
const finalTutorBind=bindings.dashboard;
bindings.dashboard=()=>{
  finalTutorBind();const form=el('#tutor-form');if(!form)return;
  form.onsubmit=event=>{
    event.preventDefault();
    const input=form.elements.question.value.trim().replace(/^(?:please )?(?:solve|calculate|what(?:'s| is))\s*[: ]+/i,'').replace(/[?]$/,'');
    const output=el('#tutor-result'), result=finalTutorAnswer(input);
    if(!result){output.textContent='Try an equation in x, arithmetic such as 7 × (12 + 3), or a percentage such as 18% of 250.';return;}
    output.innerHTML='<p class="answer">'+esc(result.answer)+'</p>'+(result.check?'<p class="status">Double-Checked ✓ · '+esc(result.check)+'</p>':'<p>No independent check for this result.</p>')+'<details open><summary>How you get there</summary><ol class="steps">'+result.steps.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol></details><details><summary>Try it yourself</summary><p>Change a number, write the operations separately, and check the result.</p></details>';
  };
};
function finalTutorAnswer(input){
  if(input.includes('=')){const result=solve(input);return result&&{answer:result[0],steps:result[1],check:verifyWave6Equation(input,result)};}
  const pct=input.match(/^([+-]?\d+(?:\.\d+)?)\s*%\s*of\s*([+-]?\d+(?:\.\d+)?)$/i);
  const fmt=n=>String(Number(n.toPrecision(12)));
  if(pct){
    const rate=+pct[1],whole=+pct[2],value=rate/100*whole,recheck=whole/100*rate;
    if(!Number.isFinite(value))return null;
    return {answer:fmt(value),steps:['Divide '+rate+' by 100 to get '+fmt(rate/100)+'.','Multiply by '+whole+'.'],check:Math.abs(recheck-value)<1e-10*Math.max(1,Math.abs(value))?'One percent of '+whole+' is '+fmt(whole/100)+'. Take '+rate+' of those to get '+fmt(recheck)+'.':''};
  }
  const clean=input.replace(/³/g,'^3').replace(/²/g,'^2').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  if(!/^[\d\s.+*/^()-]+$/.test(clean)||!/[+*/^-]/.test(clean))return null;
  try{
    const value=compileGraph(clean)(0);
    const operations=[];
    const verified=stackCheck(clean,operations);
    if(!Number.isFinite(value))return null;
    return {answer:fmt(value),steps:['Start inside parentheses.',...operations,input+' = '+fmt(value)+'.'],check:Number.isFinite(verified)&&Math.abs(verified-value)<1e-10*Math.max(1,Math.abs(value))?'Independent stack evaluation gives '+fmt(verified)+'.':''};
  }catch{return null;}
}
function stackCheck(text,operations=[]){
  const values=[],ops=[],priority={'+':1,'-':1,'*':2,'/':2,'~':3,'!':3,'^':4};
  const apply=()=>{
    const op=ops.pop(),b=values.pop();
    if(op==='~'||op==='!'){values.push(op==='~'?-b:b);return;}
    const a=values.pop(),result=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?a/b:a**b;
    values.push(result);
    if([a,b,result].every(Number.isFinite))operations.push([a,({'*':'×','/':'÷','-':'−'})[op]??op,b,'=',result].map(v=>typeof v==='number'?Number(v.toPrecision(12)):v).join(' ')+'.');
  };
  let expecting=true;
  for(const token of text.replace(/\s/g,'').match(/(?:\d+\.?\d*|\.\d+)|[()+*/^-]/g)??[]){
    if(/^[\d.]/.test(token)){values.push(+token);expecting=false;continue;}
    if(token==='('){ops.push(token);expecting=true;continue;}
    if(token===')'){while(ops.length&&ops.at(-1)!=='(')apply();if(ops.pop()!=='(')return NaN;expecting=false;continue;}
    if(expecting&&['+','-'].includes(token)){ops.push(token==='-'?'~':'!');continue;}
    while(ops.length&&ops.at(-1)!=='('&&(priority[ops.at(-1)]>priority[token]||(token!=='^'&&priority[ops.at(-1)]===priority[token])))apply();
    ops.push(token);expecting=true;
  }
  while(ops.length)apply();
  return values.length===1?values[0]:NaN;
}
let vocab=wordVault.slice(), wordRequest;
const finalTest=views.test,finalTestBind=bindings.test;
views.test=()=>finalTest().replace(/<section class="panel"><h2>Word Vault[\s\S]*$/,'')+wavePanel('Word Vault','<label>Search vocabulary<input type="search" id="vocab-query"></label><label class="remove-avatar"><input type="checkbox" id="vocab-unmastered"> Unmastered only</label><p id="vocab-status" role="status"></p><div id="vocab-list"></div><div class="actions"><button class="ghost" id="vocab-prev">Previous</button><button class="ghost" id="vocab-next">Next</button></div>');
bindings.test=()=>{
  finalTestBind();const list=el('#vocab-list'),search=el('#vocab-query'),unmastered=el('#vocab-unmastered'),state=el('#vocab-status'),previous=el('#vocab-prev'),next=el('#vocab-next');
  let page=0,failed=false;const size=20,mastered=new Set(read('word-mastery',[]));
  function render(){
    const query=search.value.trim().toLowerCase(),found=vocab.filter(([word,meaning])=>(!unmastered.checked||!mastered.has(word))&&(!query||word.includes(query)||meaning.toLowerCase().includes(query)));
    page=Math.max(0,Math.min(page,Math.ceil(found.length/size)-1));
    state.textContent=(failed?'Expanded list unavailable. ':'')+vocab.length+' words · '+mastered.size+' mastered · '+found.length+' matches';
    list.innerHTML=found.slice(page*size,(page+1)*size).map(([word,def,example,hook])=>'<details><summary>'+esc(word)+(mastered.has(word)?' ✓':'')+'</summary><p>'+esc(def)+'</p><p>Example: '+esc(example)+'</p><p>Memory hook: '+esc(hook)+'</p><button type="button" class="ghost" data-pronounce="'+esc(word)+'">Pronounce</button><p class="pronunciation-status" role="status"></p><label class="remove-avatar"><input type="checkbox" data-word="'+esc(word)+'" '+(mastered.has(word)?'checked':'')+'> Mark '+esc(word)+' mastered</label></details>').join('');
    for(const button of list.querySelectorAll('[data-pronounce]'))button.onclick=()=>{
      const feedback=button.nextElementSibling;
      if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){feedback.textContent='Pronunciation audio is unavailable on this device.';return;}
      const utterance=new SpeechSynthesisUtterance(button.dataset.pronounce);
      utterance.lang='en-US';
      utterance.onerror=event=>{if(!['interrupted','canceled'].includes(event.error))feedback.textContent='Pronunciation audio is unavailable on this device.';};
      feedback.textContent='';speechSynthesis.cancel();speechSynthesis.speak(utterance);
    };
    for(const input of list.querySelectorAll('[data-word]'))input.onchange=()=>{
      if(input.checked)mastered.add(input.dataset.word);else mastered.delete(input.dataset.word);save('word-mastery',[...mastered]);render();
    };
    previous.disabled=page===0;next.disabled=(page+1)*size>=found.length;
  }
  search.oninput=unmastered.onchange=()=>{page=0;render();};previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};render();
  wordRequest??=fetch('/words.json').then(response=>{if(!response.ok)throw Error('Vocabulary unavailable.');return response.json();}).then(rows=>{vocab=[...new Map([...rows,...wordVault].map(row=>[row[0],row])).values()].sort((a,b)=>a[0].localeCompare(b[0]));});
  wordRequest.catch(()=>{failed=true;wordRequest=undefined;}).finally(()=>{if(list.isConnected)render();});
};
const finalStop=new Set('a an and are as at be been but by did do does for from had has have i in is it its of on or our so that the their them there these they this to was we were when where which who why will with would you your'.split(' '));
studio.Summarizer[1]='Identify the core idea and shorten supporting details while preserving their meaning.';
studio.Summarizer[2]=data=>{
  const parts=sentences(data.text).filter(Boolean), tokenize=s=>s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
  if(!parts.length)return 'Add text to summarize.';
  const counts=new Map();
  for(const part of parts)for(const word of new Set(tokenize(part)))if(word.length>2&&!finalStop.has(word))counts.set(word,(counts.get(word)??0)+1);
  const ranked=parts.map((part,index)=>({part,index,weight:tokenize(part).reduce((sum,w)=>sum+(counts.get(w)??0),0)/Math.sqrt(Math.max(1,tokenize(part).length))+(index===0?.4:0)})).sort((a,b)=>b.weight-a.weight||a.index-b.index);
  const shorten=(str,max)=>{const words=str.replace(/\s+/g,' ').replace(/[.!?]+$/,'').trim().split(' ');return words.length>max?words.slice(0,max).join(' ')+'…':words.join(' ');};
  const lead=ranked[0].part.replace(/^(?:it is worth noting that|the fact is that)\s+/i,'').split(/;|,\s+and\s+/)[0];
  const brief=shorten(lead,Math.max(3,Math.min(14,Math.floor(tokenize(lead).length*.68))));
  const key=ranked.slice(1,Math.min(4,Math.ceil(parts.length/2)+1)).sort((a,b)=>a.index-b.index).map(row=>'• '+shorten(row.part,16));
  const topics=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,5).map(row=>row[0]);
  return 'TL;DR\n'+brief+'\n\nKey points\n'+(key.length?key.join('\n'):topics.length?'• Main terms: '+topics.join(', '):'• One short point.');
};
guidance.settings[1]='Choose and save any of the six themes.';
guidance.snap[1]='Upload a photo for automatic English text extraction, review it, and solve supported algebra.';
guidance.pricing[1]='Free is $0, Gold is $20/month, and Diamond is $50/month. Use secure checkout to upgrade.';
show();localize();
async function manageRequest(path,data){
  const response=await fetch('/api/'+path,data?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),cache:'no-store'}:{cache:'no-store'});
  const payload=await response.json();
  if(!response.ok)throw Error(payload.error??'Request failed.');
  return payload;
}
const ownerPanel=document.createElement('dialog'), ownerLink=document.createElement('button');
ownerPanel.id='owner-panel';ownerPanel.innerHTML='<div class="split"><h2>Owner Command Center</h2><button class="ghost" id="owner-close">Close</button></div><div id="owner-body" class="stack"></div>';
ownerLink.type='button';ownerLink.className='ghost quick';ownerLink.textContent='Owner';
document.body.append(ownerPanel);el('footer').append(ownerLink);
el('#owner-close').onclick=()=>ownerPanel.close();
function ownerGate(){
  if(!ownerPanel.open)ownerPanel.showModal();
  const area=el('#owner-body');
  area.innerHTML='<form id="unlock-owner" class="stack"><p>Sign in with your owner account to use the passcode.</p>'+field('code','Owner passcode','password','required maxlength="120"')+'<button class="primary">Unlock</button></form><a class="ghost" target="_top" href="/signin-with-chatgpt?return_to=%2F%3Fowner%3D1">Sign in as owner</a><p id="owner-status" role="status"></p>';
  el('#unlock-owner').onsubmit=async event=>{
    event.preventDefault();
    try{await manageRequest('owner/gate',{code:event.currentTarget.elements.code.value});await drawOwner();}
    catch(error){el('#owner-status').textContent=error.message;}
  };
}
ownerLink.onclick=ownerGate;
let taps=0,tapTimeout;
for(const brand of document.querySelectorAll('.brand'))brand.addEventListener('click',event=>{
  clearTimeout(tapTimeout);tapTimeout=setTimeout(()=>taps=0,4000);
  if(++taps===5){taps=0;event.preventDefault();ownerGate();}
});
if(new URLSearchParams(location.search).get('owner')==='1')ownerGate();
const dateLabel=ms=>new Date(ms).toLocaleDateString();
async function drawOwner(){
  const data=await manageRequest('owner'),area=el('#owner-body'),s=data.summary;
  area.innerHTML='<p>Total '+s.accounts+' · Gold '+s.gold+' · Diamond '+s.diamond+' · Estimated monthly plan value $'+s.value+'</p><div class="table-wrap"><table class="compare"><caption>Registered Donezo accounts</caption><thead><tr>'+['Name','Level','Tier','XP','Classes','Referral','Credit','Status','Joined','Manage'].map(label=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+data.accounts.map(item=>'<tr><td>'+esc(item.name)+(item.comped?'<br><strong class="gold">COMPED BY OWNER</strong> · '+esc(item.compUntil?dateLabel(item.compUntil):'Lifetime'):'')+'</td><td>'+esc(ranks[rank(item.xp)])+'</td><td>'+esc(item.tier)+'</td><td>'+item.xp+'</td><td>'+esc(item.classes.join(', '))+'</td><td>'+esc(item.referral)+'</td><td>$'+item.credits+'</td><td>'+esc(item.status)+'</td><td>'+esc(dateLabel(item.joined))+'</td><td><button class="ghost" data-manage="'+esc(item.id)+'">Manage</button></td></tr>').join('')+'</tbody></table></div><div id="account-controls"></div>'+wavePanel('Flash sale builder','<p>Publish a site-wide countdown and preview price. The preview does not change billing.</p><form id="sale-form" class="stack">'+selectField('tier','Sale tier',['Gold','Diamond'])+field('discount','Percent off','number','required min="1" max="95"')+field('starts','Start (local time)','datetime-local','')+field('expires','End (local time)','datetime-local','required')+'<button class="primary">Publish sale preview</button></form>')+wavePanel('Owner activity','<ol>'+data.activity.map(item=>'<li>'+esc(item.action)+' · '+esc(item.detail)+' · '+esc(dateLabel(item.time))+'</li>').join('')+'</ol>')+'<p id="owner-status" role="status"></p>';
  area.querySelectorAll('[data-manage]').forEach(button=>button.onclick=()=>drawAccountControls(data.accounts.find(item=>item.id===button.dataset.manage)));
  el('#sale-form').onsubmit=async event=>{
    event.preventDefault();
    const args=Object.fromEntries(new FormData(event.currentTarget));
    try{await manageRequest('owner/sale',{tier:args.tier,discount:+args.discount,starts:args.starts?new Date(args.starts).getTime():Date.now(),expires:new Date(args.expires).getTime()});await loadSales();await drawOwner();el('#owner-status').textContent='Flash sale preview published.';}
    catch(error){el('#owner-status').textContent=error.message;}
  };
}
function drawAccountControls(item){
  const area=el('#account-controls');
  const choices={'Change tier':['tier'],'Grant free tier':['tier','days'],'Suspend or reactivate':['status'],'Edit referral credits':['credits'],'Delete account':['confirm']};
  area.innerHTML=wavePanel('Manage '+esc(item.name),'<form id="change-account" class="stack">'+selectField('action','Action',Object.keys(choices))+selectField('tier','Tier',['Free','Gold','Diamond'])+selectField('days','Grant length',['7 days','30 days','Lifetime'])+selectField('status','Account status',['Active','Suspended'])+field('credits','Monthly credits ($)','number','min="0" max="10000" value="'+item.credits+'"')+field('confirm','Type DELETE to permanently remove account','text','maxlength="6"')+'<button class="primary">Apply</button></form>');
  const form=el('#change-account');form.elements.tier.value=item.tier;form.elements.status.value=item.status;
  function update(){const action=form.elements.action.value;for(const name of ['tier','days','status','credits','confirm'])form.elements[name].closest('label').hidden=!choices[action].includes(name);form.elements.tier.options[0].disabled=action==='Grant free tier';if(action==='Grant free tier'&&form.elements.tier.value==='Free')form.elements.tier.value='Gold';}
  form.elements.action.onchange=update;update();
  form.onsubmit=async event=>{
    event.preventDefault();
    const args=Object.fromEntries(new FormData(form));
    const names={'Change tier':'tier','Grant free tier':'comp','Suspend or reactivate':'status','Edit referral credits':'credits','Delete account':'delete'};
    try{await manageRequest('owner/action',{...args,id:item.id,action:names[args.action],days:parseInt(args.days,10)||0,credits:+args.credits});await drawOwner();await retrieveAccount();el('#owner-status').textContent='Account updated.';}
    catch(error){el('#owner-status').textContent=error.message;}
  };
}
let salesData=[];
const saleBannerFinal=document.createElement('div'),amounts={Gold:20,Diamond:50};
saleBannerFinal.className='sale-banner';saleBannerFinal.hidden=true;el('header').after(saleBannerFinal);
function tickSales(){
  const live=salesData.filter(item=>item.expires>Date.now()&&(item.starts??0)<=Date.now());
  saleBannerFinal.hidden=!live.length;
  saleBannerFinal.innerHTML=live.map(item=>{
    const sec=Math.max(0,Math.ceil((item.expires-Date.now())/1000));
    const timer=[Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60].map(n=>String(n).padStart(2,'0')).join(':');
    return '<p><strong>'+esc(item.tier)+' flash sale preview</strong> · '+item.discount+'% off · '+timer+' remaining <a href="#pricing">View plans</a></p>';
  }).join('');
  for(const row of document.querySelectorAll('[data-price-preview]')){
    const offer=live.find(item=>item.tier===row.dataset.pricePreview);
    row.hidden=!offer;
    if(offer){const regular=amounts[offer.tier];row.innerHTML='<del>$'+regular+'</del> <strong>$'+(regular*(100-offer.discount)/100).toFixed(2)+'</strong> preview · Checkout shows the actual price.';}
  }
}
async function loadSales(){try{salesData=(await manageRequest('sales')).sales;tickSales();}catch{}}
setInterval(tickSales,1000);setInterval(loadSales,30000);void loadSales();
const plansBefore=views.pricing,planBindBefore=bindings.pricing;
views.pricing=()=>plansBefore().replace(/(<h2 class="gold">(Gold|Diamond)<\/h2>)/g,'$1<p class="gold" data-price-preview="$2" hidden></p>');
bindings.pricing=()=>{planBindBefore?.();tickSales();};
const homeBefore=views.home;
views.home=()=>homeBefore().replace(/(Donezo library · \d+ practice questions · )\d+ words/,'$1'+'1,200+ words').replace('Flash sales are currently inactive. Checkout shows the amount you’ll actually pay.','Owner-scheduled sale previews show a countdown and expire automatically. The preview does not change billing.');
let activeAccount=null,identity=null;
async function retrieveAccount(){try{identity=await manageRequest('account');activeAccount=identity.account;}catch{}}
const dashBeforeFinal=views.dashboard,dashBindingFinal=bindings.dashboard;
views.dashboard=()=>dashBeforeFinal()+wavePanel('Donezo account','<div class="stack" id="linked-donezo"><p>Loading account…</p></div>');
function showAccount(){
  const target=el('#linked-donezo');
  if(!target)return;
  if(activeAccount){
    const item=activeAccount,base=amounts[item.billingTier]??0;
    target.innerHTML='<p>'+esc(item.name)+' · '+esc(item.tier)+' · '+esc(item.status)+'</p>'+(item.comped?'<strong class="gold">COMPED BY OWNER · '+esc(item.compUntil?dateLabel(item.compUntil):'Lifetime')+'</strong>':'')+'<p>Referral code: <strong>'+esc(item.referral)+'</strong></p><p>Recorded credit: $'+item.credits+' per month. Estimated plan amount after recorded credit: $'+Math.max(0,base-item.credits)+'.</p><p id="confirmed-referrals" role="status"></p><p>Referral signups are tracked. Paid referral rewards and first-month checkout discounts are inactive.</p><button id="link-profile" class="ghost">Update from this device</button><p id="account-note" role="status"></p>';
  }else if(identity?.signedIn&&classes().length)target.innerHTML='<p>Save your display name, school level, classes and XP to your account.</p><button class="primary" id="link-profile">Register this profile</button><p id="account-note" role="status"></p>';
  else target.innerHTML='<p>'+(!identity?'Account service unavailable.':identity.signedIn?'Finish your profile setup to register.':'Sign in to register your Donezo account.')+'</p>'+(!identity?.signedIn?'<a class="ghost" target="_top" href="/signin-with-chatgpt?return_to=%2F%23dashboard">Sign in</a>':'');
  const referralInfo=el('#confirmed-referrals');
  if(referralInfo)void manageRequest('referrals').then(({joined})=>referralInfo.textContent=joined+' referred Donezo accounts joined.').catch(()=>{referralInfo.textContent='Referral signup count unavailable.';});
  if(el('#link-profile'))el('#link-profile').onclick=async()=>{
    try{activeAccount=(await manageRequest('account',{name:profile.name,grade:profile.grade,classes:classes().map(c=>c.name),xp:progressState().xp,theme:profile.theme,referral:read('entered-referral','')})).account;showAccount();}
    catch(error){el('#account-note').textContent=error.message;}
  };
}
bindings.dashboard=()=>{dashBindingFinal();void retrieveAccount().then(showAccount);};
const voiceAllowed=()=>activeAccount?.tier==='Diamond'&&activeAccount.status==='Active';
const settingsViewBefore=views.settings,settingsBindBefore=bindings.settings;
views.settings=()=>settingsViewBefore().replace('<p>Voice Match requires a connected Diamond account.</p><a class="ghost" href="#pricing">View Diamond</a>','<div class="stack" id="voice-setup"></div>');
bindings.settings=()=>{
  settingsBindBefore();
  void retrieveAccount().then(()=>{
    const target=el('#voice-setup');if(!target)return;
    if(!voiceAllowed()){target.innerHTML='<p>Voice Match is locked for Free and Gold.</p><a class="ghost" href="#pricing">View Diamond</a>';return;}
    target.innerHTML='<form id="voice-config" class="stack">'+selectField('tone','Tone',['Direct','Conversational','Formal'])+field('sample','Optional writing sample','textarea','maxlength="3000"')+'<button class="primary">Save Voice Match</button></form><p id="voice-saved" role="status"></p>';
    const form=el('#voice-config'),data=read('voice-settings',{});
    form.elements.tone.value=data.tone??'Direct';form.elements.sample.value=data.sample??'';
    form.onsubmit=event=>{event.preventDefault();save('voice-settings',Object.fromEntries(new FormData(form)));el('#voice-saved').textContent='Voice Match saved.';};
  });
};
function voiceText(text){
  const data=read('voice-settings',{}),grade=profile.grade??activeAccount?.grade;
  let output=text.replace(/\b(utilize|subsequently|in order to)\b/gi,word=>({utilize:'use',subsequently:'then','in order to':'to'})[word.toLowerCase()]);
  if(grade==='Elementary'||grade==='Middle school')output=output.replace(/\bapproximately\b/gi,'about').replace(/\btherefore\b/gi,'so');
  if(data.tone==='Conversational'||/\b(?:i'm|don't|can't)\b/i.test(data.sample??''))output=output.replace(/\byou are\b/gi,'you’re').replace(/\bdo not\b/gi,'don’t').replace(/\bcannot\b/gi,'can’t');
  if(data.tone==='Formal')output=output.replace(/\bdon’t\b/gi,'do not').replace(/\bcan’t\b/gi,'cannot');
  return output;
}
function voiceControls(){
  for(const result of main.querySelectorAll('#studio-result .result-copy,#media-output,#report-text,#idea-result,#cram-result,#citation-result')){
    if(!result.textContent.trim()||result.nextElementSibling?.dataset.voiceControl)continue;
    const wrapper=document.createElement('div');wrapper.dataset.voiceControl='true';
    if(voiceAllowed()){
      const control=document.createElement('label'),toggle=document.createElement('input'),rewrite=document.createElement('pre');
      toggle.type='checkbox';control.className='remove-avatar';control.append(toggle,' Voice Match');rewrite.className='result-copy';rewrite.hidden=true;
      toggle.onchange=()=>{rewrite.textContent=voiceText(result.textContent);rewrite.hidden=!toggle.checked;};wrapper.append(control,rewrite);
    }else wrapper.innerHTML='<a class="ghost quick" href="#pricing">Voice Match · Diamond</a>';
    result.after(wrapper);
  }
}
new MutationObserver(voiceControls).observe(main,{subtree:true,childList:true,characterData:true});
void retrieveAccount().then(voiceControls);
show();localize();
