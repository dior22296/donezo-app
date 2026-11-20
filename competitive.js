for(const [key,title,icon,desc] of [
 ['notelab','Note Lab','▧','Turn your notes into a podcast, practice test, or sourced Q&A.'],
 ['review','Due today','◷','Review the flashcards scheduled for today.'],
 ['workcheck','Check My Work','✓','Review your attempted algebra steps or essay draft.'],
 ['graph','Graph & Draw','∿','Plot functions, find intersections, and sketch a problem.'],
 ['library','Study Library','▤','Import cards, save study guides, and organize your collection.'],
 ['ap','Advanced Exam Wing','◇','Original practice for five advanced courses.'],
 ['minisolvers','Mini-solvers','⊕','Balance chemical equations or check a physics calculation.'],
 ['slides','Slide Builder','▣','Build an editable slide deck from a topic and template.']
]) {section(key,title,icon,desc);guidance[key]=[title,desc];}
intents.unshift([/podcast|test me on|chat with my|upload chat/i,'notelab'],[/spaced|due today/i,'review'],[/check my work|essay grad/i,'workcheck'],[/graph|intersection|draw it/i,'graph'],[/flashcard import|community library/i,'library'],[/\bAP\b|free.response/i,'ap'],[/balanc.*equation|physics formula/i,'minisolvers'],[/slide deck|slides/i,'slides']);
let noteAction;
function openNotes(value,action){
  save('note-lab-source',value.slice(0,40000));
  noteAction=action;
  location.hash='notelab';
}
function noteRows(text){
  const paragraphs=text.split(/\r?\n/);
  return paragraphs.flatMap((line,i)=>sentences(line).map(s=>({index:i+1,text:s}))).slice(0,220);
}
const noteChoices=['Multiple choice','Fill-in','Short answer'];
views.notelab=()=>wavePanel('Bring your material','<p>Choose a TXT, Markdown, CSV, or JSON file, or paste text from another format. Notes stay in this browser.</p><label>Upload text notes<input type="file" id="note-file" accept=".txt,.md,.csv,.json,text/plain"></label><label>Study material<textarea id="note-source" maxlength="40000" placeholder="For stronger quizzes, use Term | Definition on each line."></textarea></label><div class="actions"><button class="primary" id="podcast-build">Make it a podcast</button><button class="ghost" id="notes-test">Test me on my notes</button></div><details><summary id="note-chat-toggle">Chat with your upload</summary><form class="stack" id="note-chat">'+field('query','Ask about this material','text','required maxlength="180"')+'<button class="primary">Find in my notes</button></form></details><div class="stack" id="note-output" aria-live="polite"></div>');
function buildPodcast(rows,speed,status){
  speechSynthesis.cancel();
  let index=0,isPlaying=false,version=0;
  const voices=speechSynthesis.getVoices();
  function readTurn(run){
    if(run!==version||!isPlaying)return;
    if(index>=rows.length){isPlaying=false;index=0;status.textContent='Recap finished.';return;}
    const utterance=new SpeechSynthesisUtterance(rows[index][1]);
    const voice=voices[index%Math.min(2,voices.length)];
    if(voice)utterance.voice=voice;
    utterance.pitch=index%2?.88:1.12;
    utterance.rate=Number(speed.value);
    utterance.onend=()=>{if(run===version){index++;readTurn(run);}};
    utterance.onerror=()=>{if(run===version){isPlaying=false;status.textContent='Audio could not play on this device. The script is below.';}};
    speechSynthesis.speak(utterance);
  }
  return {
    play(){if(isPlaying){speechSynthesis.resume();status.textContent='Playing.';return;}speechSynthesis.resume();isPlaying=true;status.textContent='Playing.';readTurn(++version);},
    pause(){if(isPlaying){speechSynthesis.pause();status.textContent='Paused.';}},
    stop(){version++;isPlaying=false;index=0;speechSynthesis.cancel();}
  };
}
function quizItems(text){
  const pairs=text.split('\n').map(line=>line.split('|').map(v=>v.trim())).filter(parts=>parts.length===2&&parts.every(Boolean));
  if(pairs.length)return pairs.slice(0,12).map(([term,definition])=>({term,question:'Which term matches this definition? '+definition,why:term+' — '+definition}));
  return noteRows(text).flatMap(row=>{
    const words=row.text.match(/[\p{L}]{5,}/gu)??[];
    if(!words.length)return [];
    const term=words.reduce((a,b)=>a.length>b.length?a:b);
    return [{term,question:'Complete this line from your notes: '+row.text.replace(term,'_____'),why:'Line '+row.index+': '+row.text}];
  }).filter((item,i,items)=>items.findIndex(x=>x.term.toLowerCase()===item.term.toLowerCase())===i).slice(0,12);
}
function noteExam(output,items,format,className){
  let index=0,score=0;
  const report=[];
  const normalize=s=>s.trim().toLocaleLowerCase().replace(/[.!?]$/,'');
  function turn(){
    if(index===items.length){
      earn('Test from notes',10,className||undefined,score/items.length,'notelab');
      output.innerHTML='<h3>Score: '+score+' / '+items.length+'</h3><ol class="steps">'+report.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ol>';return;
    }
    const item=items[index];
    let opts=[...new Set(items.filter(x=>normalize(x.term)!==normalize(item.term)).map(x=>x.term))].slice(0,3);
    opts.splice(index%(opts.length+1),0,item.term);
    const multiple=format===noteChoices[0]&&opts.length>1;
    output.innerHTML='<h3>Question '+(index+1)+' / '+items.length+'</h3><p>'+esc(item.question)+'</p><form class="stack" id="note-answer">'+(multiple?'<label>Choose an answer<select name="response">'+opts.map(opt=>'<option>'+esc(opt)+'</option>').join('')+'</select></label>':field('response',format===noteChoices[2]?'Short answer (key term or phrase)':'Answer','text','required maxlength="250"'))+'<button class="primary">Check answer</button></form><p id="note-explanation"></p><button class="ghost" id="note-next" hidden>Next</button>';
    el('#note-answer').onsubmit=event=>{
      event.preventDefault();
      const form=event.currentTarget,got=form.elements.response.value;
      const correct=normalize(got)===normalize(item.term);
      if(!correct&&typeof recordMistake==='function')recordMistake(className||'Note Lab',item.question,item.term,item.why);
      score+=Number(correct);report.push((correct?'Correct · ':'Review · ')+item.why);
      el('#note-explanation').textContent=(correct?'Correct. ':'Expected: '+item.term+'. ')+item.why;
      [...form.elements].forEach(control=>control.disabled=true);
      el('#note-next').hidden=false;el('#note-next').focus();
    };
    el('#note-next').onclick=()=>{index++;turn();};
  }
  turn();
}
bindings.notelab=()=>{
  const source=el('#note-source'),output=el('#note-output');
  source.value=read('note-lab-source','');
  source.oninput=()=>save('note-lab-source',source.value);
  el('#note-file').onchange=async event=>{
    const file=event.target.files[0];
    if(!file)return;
    if(file.size>100000){output.textContent='Choose a text file under 100 KB.';return;}
    try{source.value=(await file.text()).slice(0,40000);source.oninput();output.textContent='Notes loaded.';}catch{output.textContent='Could not open this file.';}
  };
  let engine;
  window.addEventListener('hashchange',()=>engine?.stop(),{once:true});
  el('#podcast-build').onclick=()=>{
    engine?.stop();
    const material=noteRows(source.value).slice(0,7);
    if(!material.length){output.textContent='Add notes first.';return;}
    const script=[['Host A','Today we’re reviewing your notes.'],['Host B','Let’s pull out the points to remember.'],...material.flatMap((row,i)=>[['Host A',i?'What else should we remember?':'What’s one point to start with?'],['Host B',row.text]]),['Host A','Pause here and try to explain one point from memory.']];
    output.innerHTML='<h3>Two-host study recap</h3><p>This preview uses your browser’s voices and excerpts from your notes.</p><label>Playback speed<select id="recap-speed"><option value=".75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label><div class="actions"><button class="primary" id="recap-play">Play</button><button class="ghost" id="recap-pause">Pause</button><button class="ghost" id="recap-share">Share script</button></div><p id="recap-status" role="status"></p><details><summary>Read the script</summary><ol class="steps">'+script.map(([name,line])=>'<li><strong>'+name+'</strong> '+esc(line)+'</li>').join('')+'</ol></details>';
    const status=el('#recap-status');
    if('speechSynthesis' in window)engine=buildPodcast(script,el('#recap-speed'),status);
    el('#recap-play').onclick=()=>engine?engine.play():status.textContent='Speech playback is unavailable on this browser.';
    el('#recap-pause').onclick=()=>engine?.pause();
    el('#recap-share').onclick=()=>shareText('Donezo study recap',script.map(([name,line])=>name+': '+line).join('\n'),status);
  };
  el('#notes-test').onclick=()=>{
    engine?.stop();
    const items=quizItems(source.value);
    if(!items.length){output.textContent='Add notes with complete sentences or Term | Definition pairs.';return;}
    const choices=allClasses().map(item=>item.name);
    output.innerHTML='<h3>Choose your test format</h3><form class="stack" id="note-exam">'+selectField('format','Question format',noteChoices)+selectField('className','Class for radar',['No class',...choices])+'<button class="primary">Start practice exam</button></form>';
    el('#note-exam').onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));noteExam(output,items,values.format,values.className==='No class'?'':values.className);};
  };
  el('#note-chat').onsubmit=event=>{
    event.preventDefault();engine?.stop();
    const query=Object.fromEntries(new FormData(event.currentTarget)).query;
    const tokens=[...new Set(query.toLowerCase().match(/[\p{L}\d]{3,}/gu)??[])].filter(word=>!['what','when','where','which','does','the','about','tell','this','notes'].includes(word));
    const hits=noteRows(source.value).map(row=>({...row,score:tokens.filter(word=>row.text.toLowerCase().includes(word)).length})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,3);
    output.innerHTML=hits.length?'<h3>Excerpts from your material</h3>'+hits.map(row=>'<blockquote>'+esc(row.text)+' <cite>Line '+row.index+'</cite></blockquote>').join(''):'<p>I couldn’t find that in the supplied material. Try a key term from your notes.</p>';
  };
  if(noteAction){const next=noteAction;noteAction=undefined;el(next)?.click();}
};
const captureCompetitive=views.capture, bindCaptureCompetitive=bindings.capture;
views.capture=()=>captureCompetitive()+wavePanel('Study from this capture','<div class="actions"><button class="primary" id="capture-to-lab">Make it a podcast</button><button class="ghost" id="capture-to-test">Test me on this capture</button><button class="ghost" id="capture-to-chat">Chat with this capture</button></div><p id="capture-lab-state" role="status"></p>');
bindings.capture=()=>{
  bindCaptureCompetitive();
  for(const [selector,action] of [['#capture-to-lab','#podcast-build'],['#capture-to-test','#notes-test'],['#capture-to-chat','#note-chat-toggle']]){
    el(selector).onclick=()=>{const text=el('#transcript').value.trim();if(text)openNotes(text,action);else el('#capture-lab-state').textContent='Add a transcript first.';};
  }
};
function reviewCards(){
  const schedule=read('card-schedule',{});
  return read('deck',[]).filter(card=>(schedule[JSON.stringify(card)]?.due??0)<=Date.now());
}
function scheduleRating(card,known){
  const data={...read('card-schedule',{})},key=JSON.stringify(card),previous=data[key]?.days??0;
  const days=known?Math.min(120,Math.max(1,Math.round(previous*2.2))):0;
  data[key]={days,due:Date.now()+(days?days*86400000:600000)};
  save('card-schedule',data);
}
const learnCompetitive=views.learn,bindLearnCompetitive=bindings.learn;
views.learn=()=>learnCompetitive()+wavePanel('Spaced repetition','<p>Review cards as they come due. This feature is free.</p>'+links([['Due today','review']])+'<button class="ghost" id="deck-to-lab">Make it a podcast</button>');
bindings.learn=()=>{
  bindLearnCompetitive();
  for(const [button,known] of [['#know',true],['#still',false]]){
    const target=el(button),previous=target.onclick;
    target.onclick=()=>{
      const index=Number(el('#card-count').textContent.match(/Card (\d+)/)?.[1])-1,card=read('deck',[])[index];
      if(card)scheduleRating(card,known);
      previous();
    };
  }
  el('#deck-to-lab').onclick=()=>{const deck=read('deck',[]);if(deck.length)openNotes(deck.map(card=>card.join(' | ')).join('\n'),'#podcast-build');};
};
views.review=()=>wavePanel('Due today','<p>The mode other apps charge for. Free here.</p><div id="review-queue" class="stack" aria-live="polite"></div>'+links([['Edit flashcards','learn']]));
bindings.review=()=>{
  const output=el('#review-queue');
  function render(){
    const due=reviewCards(),card=due[0];
    output.innerHTML=card?'<p>'+due.length+' due</p><button class="flash" id="review-flip">'+esc(card[0])+'</button><div class="actions"><button class="primary" id="review-known" disabled>Know</button><button class="ghost" id="review-still" disabled>Still learning</button></div>':'<p>You’re caught up.</p>';
    if(!card)return;
    el('#review-flip').onclick=()=>{el('#review-flip').textContent=card[1];el('#review-known').disabled=el('#review-still').disabled=false;};
    for(const [id,known] of [['#review-known',true],['#review-still',false]])el(id).onclick=()=>{scheduleRating(card,known);earn('Spaced review',2,classes()[0]?.name,known?1:0,'learn');render();};
  }
  render();
};
const dashCompetitive=views.dashboard;
views.dashboard=()=>dashCompetitive()+wavePanel('Due today','<p>'+reviewCards().length+' flashcards ready to review.</p>'+links([['Open review queue','review']]));
function equationSignature(text){
  const result=solve(text);
  if(!result||result[0]==='No real solutions')return null;
  return [...result[0].split(' or ')].sort().join('|');
}
views.workcheck=()=>wavePanel('Find where your work changed','<label>Upload a text attempt<input type="file" id="attempt-file" accept=".txt,.md,text/plain"></label><form id="algebra-check" class="stack">'+field('original','Original equation','text','required maxlength="100"')+field('attempt','Your attempted steps, one equation per line','textarea','required maxlength="6000"')+'<button class="primary">Check my algebra</button></form><div id="work-result" role="status"></div>')+wavePanel('Essay Grader','<p>Get revision signals for flow, citations, and clarity. This checks visible patterns in your draft.</p><label>Upload a draft<input type="file" id="essay-file" accept=".txt,.md,text/plain"></label><form id="essay-check" class="stack">'+field('draft','Your essay draft','textarea','required maxlength="20000"')+'<button class="primary">Review my draft</button></form><div id="essay-result" role="status"></div>');
bindings.workcheck=()=>{
  const algebra=el('#algebra-check'),essay=el('#essay-check');
  function useFile(selector,input){
    el(selector).onchange=async event=>{
      const file=event.target.files[0];
      if(file)try{input.value=(await file.slice(0,100000).text()).slice(0,input.maxLength);}catch{input.value='';}
    };
  }
  useFile('#attempt-file',algebra.elements.attempt);useFile('#essay-file',essay.elements.draft);
  algebra.onsubmit=event=>{
    event.preventDefault();
    const expected=equationSignature(algebra.elements.original.value);
    const result=el('#work-result'),steps=lines(algebra.elements.attempt.value).slice(0,30);
    if(!expected||!steps.length){result.textContent='Enter a supported equation with real roots and at least one attempted step.';return;}
    let bad=-1;
    const checked=steps.map((line,i)=>{
      const signature=equationSignature(line);
      if(bad!==-1)return 'After the first issue · '+line;
      if(signature===expected)return 'Same solution set · '+line;
      bad=i;
      return (signature===null?'Step format could not be checked · ':'Solution set changes here · ')+line;
    });
    const answer=solve(algebra.elements.original.value);
    result.innerHTML='<ol class="steps">'+checked.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ol>'+(bad<0?'<p>Each checked line preserves the original solution set. Substitute your final values back in to verify.</p>':'<h3>Corrected path from the last checked equation</h3><p>Go back to '+esc(steps[bad-1]??algebra.elements.original.value)+'. Apply the same operation to both sides and try the next line again.</p><details><summary>Show method</summary><ol class="steps">'+answer[1].map(line=>'<li>'+esc(line)+'</li>').join('')+'</ol></details>');
  };
  essay.onsubmit=event=>{
    event.preventDefault();
    const draft=essay.elements.draft.value.trim(),blocks=draft.split(/\n\s*\n/).filter(Boolean),parts=sentences(draft),long=parts.filter(line=>line.split(/\s+/).length>28);
    const citation=/\([^)]*(?:\d{4}|\d+)[^)]*\)|\[\d+\]|https?:\/\//.test(draft);
    el('#essay-result').innerHTML='<h3>Rubric feedback</h3><dl><dt>Flow</dt><dd>'+blocks.length+' paragraph block(s). '+(blocks.length<3?'Check whether your introduction, evidence, and conclusion each need a separate paragraph.':'Check that each paragraph opens with a claim that advances your argument.')+'</dd><dt>Citations</dt><dd>'+(citation?'Some possible citation markers found. Check each one against the source and assigned style.':'No obvious citation markers found. Add sources for quotes, paraphrases, and factual claims that need attribution.')+'</dd><dt>Clarity</dt><dd>'+long.length+' sentences over 28 words. '+(long.length?'Start by splitting: '+esc(long[0]):'Read the key claim aloud and replace vague wording with details.')+'</dd></dl>';
  };
};
function compileGraph(source){
  const text=source.toLowerCase().replace(/^\s*y\s*=/,'').replace(/\s/g,'').replace(/−/g,'-').replace(/²/g,'^2');
  const tokens=text.match(/(?:\d+\.?\d*|\.\d+)|[a-z]+|[()+*/^-]/g)??[];
  if(!text||tokens.join('')!==text||tokens.length>100)throw Error('Use x, numbers, + − × ÷ typed as + - * /, powers, or sin/cos/sqrt.');
  let i=0;
  const functions={sin:Math.sin,cos:Math.cos,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,log:Math.log};
  function atom(){
    const token=tokens[i++];
    if(!token)throw Error('Expression ended early.');
    if(token==='x')return x=>x;
    if(token==='pi')return ()=>Math.PI;
    if(/^\d|^\./.test(token))return ()=>Number(token);
    if(token==='('||Object.hasOwn(functions,token)){
      if(token!=='('&&tokens[i++]!=='(')throw Error('Use parentheses around a function argument.');
      const item=sum();
      if(tokens[i++]!==')')throw Error('Close the parentheses.');
      return token==='('?item:x=>functions[token](item(x));
    }
    throw Error('Unsupported graph term: '+token);
  }
  function power(){
    const a=atom();
    if(tokens[i]!=='^')return a;
    i++;const b=unary();return x=>a(x)**b(x);
  }
  function unary(){
    const sign=tokens[i];
    if(sign==='-'||sign==='+'){i++;const a=unary();return x=>sign==='-'?-a(x):a(x);}
    return power();
  }
  function product(){
    let a=unary();
    while(tokens[i]==='*'||tokens[i]==='/'){
      const op=tokens[i++],started=a,b=unary();
      a=x=>op==='*'?started(x)*b(x):started(x)/b(x);
    }
    return a;
  }
  function sum(){
    let a=product();
    while(tokens[i]==='+'||tokens[i]==='-'){
      const op=tokens[i++],started=a,b=product();
      a=x=>op==='+'?started(x)+b(x):started(x)-b(x);
    }
    return a;
  }
  const get=sum();
  if(i!==tokens.length)throw Error('Use explicit multiplication, like 2*x.');
  return get;
}
function graphCanvas(canvas,curves,limit=10){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const xp=x=>w*(x+limit)/(limit*2),yp=y=>h*(limit-y)/(limit*2);
  ctx.fillStyle='#100c20';ctx.fillRect(0,0,w,h);
  for(let i=-limit;i<=limit;i++){
    ctx.strokeStyle=i?'#35294b':'#a898c3';ctx.beginPath();ctx.moveTo(xp(i),0);ctx.lineTo(xp(i),h);ctx.moveTo(0,yp(i));ctx.lineTo(w,yp(i));ctx.stroke();
  }
  curves.forEach((curve,j)=>{
    ctx.strokeStyle=['#70f6f4','#ff9df8','#ffe381'][j%3];ctx.lineWidth=2;ctx.beginPath();let prev;
    for(let i=0;i<=w;i++){
      const y=curve(i/w*limit*2-limit),pixel=yp(y);
      if(!Number.isFinite(y)||Math.abs(y)>limit*4){prev=undefined;continue;}
      if(prev===undefined||Math.abs(pixel-prev)>h/2)ctx.moveTo(i,pixel);else ctx.lineTo(i,pixel);
      prev=pixel;
    }
    ctx.stroke();
  });
}
function intersections(a,b){
  const delta=x=>a(x)-b(x),out=[];
  if([-9,-4,-1,0,2,6,9].every(x=>Math.abs(delta(x))<1e-10))return 'The curves coincide at the sampled points.';
  function add(x){
    if(Number.isFinite(a(x))&&Math.abs(delta(x))<1e-5&&!out.some(item=>Math.abs(item-x)<.01))out.push(x);
  }
  for(let i=0;i<=800;i++){
    let lo=-10+i/40,hi=lo+1/40;
    const f=delta(lo),g=delta(hi);
    if(!Number.isFinite(f)||!Number.isFinite(g))continue;
    if(Math.abs(f)<1e-8)add(lo);
    if(i<800&&f*g<0){
      for(let step=0;step<25;step++){const mid=(lo+hi)/2;if(delta(lo)*delta(mid)<=0)hi=mid;else lo=mid;}
      add((lo+hi)/2);
    }
  }
  return out.length?'Approximate intersections: '+out.slice(0,14).map(x=>'('+round(x)+', '+round(a(x))+')').join(', '):'No intersections detected in the sampled window. Some tangencies may be missed.';
}
views.graph=()=>wavePanel('Plot a function','<form id="graph-form" class="stack">'+field('first','y = First function','text','required maxlength="120" value="x^2"')+field('second','y = Second function (optional)','text','maxlength="120" value="4"')+'<button class="primary">Plot functions</button></form><canvas id="function-plot" width="640" height="440" aria-label="Graph of entered functions"></canvas><p id="intersections" role="status"></p>')+wavePanel('Draw it','<p>Sketch with your mouse, finger, or stylus.</p><canvas id="sketch" width="640" height="360" aria-label="Drawing pad"></canvas><div class="actions"><button class="ghost" id="clear-sketch">Clear drawing</button><a class="primary" id="download-sketch" download="donezo-sketch.png">Save PNG</a></div>');
bindings.graph=()=>{
  const form=el('#graph-form'),plot=el('#function-plot'),summary=el('#intersections');
  form.onsubmit=event=>{
    event.preventDefault();
    try{
      const a=compileGraph(form.elements.first.value),v=form.elements.second.value.trim(),b=v&&compileGraph(v);
      graphCanvas(plot,b?[a,b]:[a]);summary.textContent=b?intersections(a,b):'Shown for x from −10 to 10.';
    }catch(error){summary.textContent=error.message;}
  };
  form.requestSubmit();
  const pad=el('#sketch'),ctx=pad.getContext('2d');
  let pointer=null;
  function clear(){ctx.fillStyle='#130e24';ctx.fillRect(0,0,pad.width,pad.height);}
  function position(event){const rect=pad.getBoundingClientRect();return [(event.clientX-rect.left)*pad.width/rect.width,(event.clientY-rect.top)*pad.height/rect.height];}
  pad.onpointerdown=event=>{
    if(pointer!==null||event.button>0)return;
    pointer=event.pointerId;pad.setPointerCapture(pointer);
    const [x,y]=position(event);ctx.strokeStyle='#83f6ff';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.01,y);ctx.stroke();
  };
  pad.onpointermove=event=>{if(pointer===event.pointerId){ctx.lineTo(...position(event));ctx.stroke();}};
  pad.onpointerup=pad.onpointercancel=event=>{if(pointer===event.pointerId)pointer=null;};
  el('#clear-sketch').onclick=clear;
  el('#download-sketch').onclick=event=>event.currentTarget.href=pad.toDataURL('image/png');
  clear();
};
function chemCounts(formula){
  const tokens=formula.match(/[A-Z][a-z]?|\d+|[()]/g)??[];
  if(!tokens.length||tokens.join('')!==formula)throw Error('Use standard element symbols and optional parentheses.');
  let i=0;
  function group(nested=false){
    const counts={};
    while(i<tokens.length&&tokens[i]!==')'){
      const token=tokens[i++];
      let unit;
      if(token==='('){unit=group(true);if(tokens[i++]!==')')throw Error('Unclosed formula group.');}
      else{if(!/^[A-Z]/.test(token))throw Error('Place subscripts after an element or group.');unit={[token]:1};}
      const n=/^\d+$/.test(tokens[i]??'')?Number(tokens[i++]):1;
      if(n<1||n>99)throw Error('Use subscripts from 1 to 99.');
      for(const [name,number] of Object.entries(unit))counts[name]=(counts[name]??0)+number*n;
    }
    if(!Object.keys(counts).length||(!nested&&i!==tokens.length))throw Error('Invalid formula group.');
    return counts;
  }
  return group();
}
function balanceFormula(text){
  const sides=text.replace(/\s/g,'').split(/->|→|=/).map(s=>s.split('+'));
  if(sides.length!==2||sides.flat().length>9)throw Error('Enter reactants and products separated by → or ->, with up to nine compounds.');
  const inputs=sides.flat(),split=sides[0].length,counts=inputs.map(chemCounts);
  const elements=[...new Set(counts.flatMap(c=>Object.keys(c)))],width=inputs.length;
  const original=elements.map(name=>counts.map((c,i)=>(c[name]??0)*(i<split?1:-1)));
  const rows=original.map(row=>row.slice()),pivots=[];
  for(let col=0;col<width&&pivots.length<rows.length;col++){
    const r=pivots.length;const at=rows.findIndex((row,i)=>i>=r&&Math.abs(row[col])>1e-9);
    if(at<0)continue;
    [rows[r],rows[at]]=[rows[at],rows[r]];
    const v=rows[r][col];rows[r]=rows[r].map(x=>x/v);
    rows.forEach((row,i)=>{if(i!==r){const factor=row[col];rows[i]=row.map((x,j)=>x-factor*rows[r][j]);}});
    pivots.push(col);
  }
  const free=inputs.map((_,i)=>i).filter(i=>!pivots.includes(i));
  if(free.length!==1)throw Error('A unique positive balance could not be determined.');
  const trial=inputs.map((_,i)=>i===free[0]?1:-rows[pivots.indexOf(i)][free[0]]);
  if(trial.some(v=>v<=0))throw Error('No positive balance was found.');
  let ints;
  for(let scale=1;scale<=1000;scale++){
    const candidate=trial.map(v=>Math.round(v*scale));
    if(candidate.every(n=>n>0&&n<=100000)&&original.every(row=>row.reduce((s,v,i)=>s+v*candidate[i],0)===0)){ints=candidate;break;}
  }
  if(!ints)throw Error('Could not verify an integer balance within supported limits.');
  const pretty=inputs.map((f,i)=>(ints[i]===1?'':ints[i])+f);
  return {answer:pretty.slice(0,split).join(' + ')+' → '+pretty.slice(split).join(' + '),checks:elements.map(name=>name+': '+counts.slice(0,split).reduce((s,c,i)=>s+(c[name]??0)*ints[i],0)+' atoms on each side')};
}
const physicsRules={
  'Force (F = m × a)':['Mass (kg)','Acceleration (m/s²)','Force (N)',(a,b)=>a*b,(r,a)=>r/a],
  'Speed (v = d ÷ t)':['Distance (m)','Time (s)','Speed (m/s)',(a,b)=>a/b,(r,a)=>a/r],
  'Density (ρ = m ÷ V)':['Mass (kg)','Volume (m³)','Density (kg/m³)',(a,b)=>a/b,(r,a)=>a/r],
  'Kinetic energy (KE = ½mv²)':['Mass (kg)','Speed (m/s)','Energy (J)',(a,b)=>.5*a*b*b,(r,a)=>Math.sqrt(2*r/a)]
};
views.minisolvers=()=>wavePanel('Chemistry equation balancer','<p>Enter molecular formulas without coefficients. Neutral equations only.</p><form class="stack" id="balance-form">'+field('formula','Reactants and products','text','required maxlength="120" placeholder="Fe + O2 -> Fe2O3"')+'<button class="primary">Balance and verify</button></form><div id="balance-output" role="status"></div>')+wavePanel('Physics formula solver','<form class="stack" id="physics-form">'+selectField('formula','Formula',Object.keys(physicsRules))+'<label><span id="physics-a"></span><input name="a" type="number" min="0.000001" max="1000000" step="any" required></label><label><span id="physics-b"></span><input name="b" type="number" min="0.000001" max="1000000" step="any" required></label><button class="primary">Calculate and verify</button></form><div id="physics-output" role="status"></div>');
bindings.minisolvers=()=>{
  const balance=el('#balance-form'),physics=el('#physics-form');
  balance.onsubmit=event=>{
    event.preventDefault();
    const output=el('#balance-output');
    try{const data=balanceFormula(balance.elements.formula.value);output.innerHTML='<p class="answer">'+esc(data.answer)+'</p><p class="status">Double-Checked ✓</p><ol class="steps"><li>Count each element in each compound.</li><li>Set equal atom totals on the two sides and solve for the smallest positive whole coefficients found.</li><li>Recount both sides: '+data.checks.map(esc).join('; ')+'</li></ol>';}
    catch(error){output.textContent=error.message;}
  };
  function labels(){const [a,b]=physicsRules[physics.elements.formula.value];el('#physics-a').textContent=a;el('#physics-b').textContent=b;}
  physics.elements.formula.onchange=labels;labels();
  physics.onsubmit=event=>{
    event.preventDefault();
    const [labelA,labelB,label,calc,inverse]=physicsRules[physics.elements.formula.value],a=+physics.elements.a.value,b=+physics.elements.b.value;
    const result=calc(a,b),recovered=inverse(result,a),verified=Number.isFinite(result)&&Math.abs(recovered-b)<=Math.max(1,b)*1e-9;
    const fmt=n=>Number(n.toPrecision(8));
    el('#physics-output').innerHTML='<p class="answer">'+esc(label)+': '+fmt(result)+'</p><p>Substitute '+esc(labelA)+' = '+a+' and '+esc(labelB)+' = '+b+' into the selected formula.</p><p class="status">'+(verified?'Double-Checked ✓ · Inverse calculation returned '+fmt(recovered)+' for the second input.':'Inverse check could not confirm this result.')+'</p>';
  };
};
function mathGraph(input,result){
  const [left,right]=input.toLowerCase().replace(/\s|\*/g,'').replace(/−/g,'-').replace(/²/g,'^2').split('=');
  const explicit=side=>side.replace(/(\d)(?=x)/g,'$1*');
  try{
    const a=compileGraph(explicit(left)),b=compileGraph(explicit(right));
    result.insertAdjacentHTML('beforeend','<details open><summary>Graph and alternate forms</summary><canvas class="answer-plot" width="460" height="280" aria-label="Graph of both sides of the equation"></canvas><p>Equivalent zero form: ('+esc(left)+') − ('+esc(right)+') = 0. Solutions are the x-values where the two curves meet.</p></details>');
    graphCanvas(el('.answer-plot',result),[a,b]);
  }catch{}
}
for(const [page,formSelector,outSelector] of [['snap','#confirm-snap','#snap-result'],['school','#solve-form','#solution']]){
  const previous=bindings[page];
  bindings[page]=()=>{
    previous();
    const form=el(formSelector),submit=form.onsubmit;
    if(!form||!submit)return;
    form.onsubmit=event=>{
      submit.call(form,event);
      const result=el(outSelector);
      if(result&&el('.answer',result))mathGraph(form.elements.equation.value,result);
    };
  };
}
function importedPairs(text){
  const rows=lines(text);
  if(rows.length>500)throw Error('Import up to 500 cards at a time.');
  return rows.map((row,i)=>{
    const sep=row.includes('\t')?'\t':'|',index=row.indexOf(sep);
    if(index<1||!row.slice(index+1).trim())throw Error('Line '+(i+1)+' needs a term and definition separated by a tab or |.');
    return [row.slice(0,index).trim(),row.slice(index+1).trim()];
  });
}
views.library=()=>wavePanel('Import your flashcard sets','<p>Paste tab-separated flashcards or choose a text export to import for free.</p><label>Choose an exported text file<input id="flashcard-file" type="file" accept=".txt,.tsv,text/plain"></label><form class="stack" id="flashcard-import">'+field('cards','Terms and definitions','textarea','required maxlength="40000"')+'<button class="primary">Import to Learn</button></form><p id="import-state" role="status"></p>')+wavePanel('Study library · local preview','<p>Store searchable decks or guides in this browser. You can export or share a copy. Reporting hides a copy locally.</p><form id="library-save" class="stack">'+field('title','Resource title','text','required maxlength="80"')+field('subject','Subject','text','required maxlength="50"')+selectField('kind','Resource type',['Deck','Study guide'])+field('text','Resource text (blank uses active deck for Deck)','textarea','maxlength="40000"')+'<button class="primary">Save to library</button></form><label>Search by title or subject<input type="search" id="library-search"></label><div id="library-list"></div><p id="library-status" role="status"></p>');
bindings.library=()=>{
  const form=el('#flashcard-import'),saveForm=el('#library-save'),status=el('#import-state');
  el('#flashcard-file').onchange=async event=>{const file=event.target.files[0];if(file)try{form.elements.cards.value=(await file.slice(0,90000).text()).slice(0,40000);}catch{status.textContent='Could not read this file.';}};
  form.onsubmit=event=>{
    event.preventDefault();
    try{
      const incoming=importedPairs(form.elements.cards.value);
      if(!incoming.length)throw Error('Add at least one card.');
      const deck=[...new Map([...read('deck',[]),...incoming].map(card=>[JSON.stringify(card),card])).values()];
      save('deck',deck);status.innerHTML=esc(incoming.length)+' cards imported. <a class="ghost" href="#learn">Open Learn</a>';
    }catch(error){status.textContent=error.message;}
  };
  const search=el('#library-search'),list=el('#library-list');
  const resources=()=>read('competitive-library',[]);
  function render(){
    const term=search.value.toLowerCase().trim(),data=resources().filter(item=>!item.reported&&(item.title+' '+item.subject).toLowerCase().includes(term));
    list.innerHTML=data.length?data.map(item=>'<details><summary>'+esc(item.title)+' · '+esc(item.subject)+'</summary><p class="result-copy">'+esc(item.text.slice(0,500))+'</p><div class="actions"><button class="ghost" data-open-resource="'+item.id+'">Open in Note Lab</button><button class="ghost" data-share-resource="'+item.id+'">Share copy</button><button class="ghost" data-report-resource="'+item.id+'">Hide or report locally</button></div></details>').join(''):'<p>No matching local resources.</p>';
    list.querySelectorAll('[data-open-resource]').forEach(btn=>btn.onclick=()=>openNotes(resources().find(item=>item.id===btn.dataset.openResource).text));
    list.querySelectorAll('[data-share-resource]').forEach(btn=>btn.onclick=()=>{const item=resources().find(row=>row.id===btn.dataset.shareResource);shareText(item.title,item.text,el('#library-status'));});
    list.querySelectorAll('[data-report-resource]').forEach(btn=>btn.onclick=()=>{
      save('competitive-library',resources().map(item=>item.id===btn.dataset.reportResource?{...item,reported:true}:item));
      el('#library-status').textContent='Hidden on this browser. No report was sent to a moderator.';render();
    });
  }
  search.oninput=render;
  saveForm.onsubmit=event=>{
    event.preventDefault();const data=Object.fromEntries(new FormData(saveForm));
    const text=data.text.trim()||(data.kind==='Deck'?read('deck',[]).map(card=>card.join(' | ')).join('\n'):'');
    if(!text||!data.title.trim()||!data.subject.trim()){el('#library-status').textContent='Add a title, subject, and content.';return;}
    save('competitive-library',[{...data,id:crypto.randomUUID(),text},...resources()]);saveForm.reset();search.value='';render();
  };
  render();
};
const apCourses={
  'Advanced U.S. History':['Compare causes, contexts, and consequences. Separate what a source says from why its author says it.',['Federalism','Authority is divided across national and state governments.'],['Sourcing','Evaluate audience, purpose, point of view, and historical situation.'],'Explain one reason reformers supported federal regulation during the Progressive Era.',['federal','business','consumer','labor']],
  'Advanced Biology':['Connect structure to function. Interpret controls, variables, and evidence before drawing conclusions.',['Osmosis','Net water movement across a selectively permeable membrane.'],['Independent variable','The factor deliberately changed by an experimenter.'],'Explain why a control group helps test the effect of fertilizer on plant growth.',['control','compare','fertilizer','variable']],
  'Advanced English Language':['Analyze rhetorical choices in context. Link evidence to your claim through commentary.',['Audience','The group a writer or speaker is addressing.'],['Commentary','Reasoning that explains how evidence supports a claim.'],'Explain how a speaker could use a personal anecdote to persuade a school board.',['audience','credib','example','persuad']],
  'Advanced Calculus':['Distinguish rates of change from accumulation. Track units and state the conditions behind each theorem.',['Derivative','An instantaneous rate of change.'],['Definite integral','A signed accumulation over an interval.'],'Explain what the integral of velocity over an interval gives and how it differs from total distance.',['displacement','signed','absolute','velocity']],
  'Advanced Psychology':['Operationalize variables, examine the strength of evidence, and distinguish correlation from causation.',['Operational definition','A specific way to measure or manipulate a variable.'],['Random assignment','Using chance to assign participants to groups.'],'Explain how random assignment strengthens an experiment comparing two study methods.',['random','group','confound','cause']]
};
views.ap=()=>wavePanel('Choose an advanced course','<label>Course<select id="ap-course">'+Object.keys(apCourses).map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><div id="ap-content" class="stack"></div>');
bindings.ap=()=>{
  let clock;
  const picker=el('#ap-course'),target=el('#ap-content');
  function render(){
    clearInterval(clock);
    const [guide,a,b,prompt,terms]=apCourses[picker.value];
    target.innerHTML='<h3>Study guide</h3><p>'+esc(guide)+'</p><h3>Starter flashcards</h3>'+[a,b].map(([term,def])=>'<details><summary>'+esc(term)+'</summary><p>'+esc(def)+'</p></details>').join('')+'<button class="ghost" id="ap-deck">Add course cards to Learn</button><h3>Timed recall practice</h3><button class="primary" id="ap-timed">Start 90-second review</button><div id="ap-review" class="stack"></div><h3>FRQ practice · Gold preview</h3><p>'+esc(prompt)+'</p><form class="stack" id="ap-frq">'+field('response','Your free response','textarea','required maxlength="4000"')+'<button class="primary">Check rubric signals</button></form><p id="ap-grade" role="status"></p>';
    el('#ap-deck').onclick=()=>{const deck=[...new Map([...read('deck',[]),a,b].map(card=>[JSON.stringify(card),card])).values()];save('deck',deck);location.hash='learn';};
    el('#ap-timed').onclick=()=>{
      clearInterval(clock);const end=Date.now()+90000,panel=el('#ap-review');
      panel.innerHTML='<p id="ap-clock"></p><p>Recall these definitions without opening the cards.</p><form class="stack" id="ap-answers">'+[a,b].map(([term],i)=>field('recall'+i,esc(term),'text','required maxlength="200"')).join('')+'<button class="primary">Compare my answers</button></form>';
      function finish(prefix){
        clearInterval(clock);
        const form=el('#ap-answers',panel);if(!form)return;
        const responses=[form.elements.recall0.value,form.elements.recall1.value];
        panel.innerHTML='<h3>'+prefix+'</h3>'+[a,b].map(([term,def],i)=>'<p>'+esc(term)+': '+esc(def)+'<br>Your response: '+esc(responses[i]||'—')+'</p>').join('');
      }
      function tick(){if(!panel.isConnected){clearInterval(clock);return;}const left=Math.ceil((end-Date.now())/1000);if(left<=0)finish('Time is up');else el('#ap-clock').textContent=left+' seconds left';}
      el('#ap-answers').onsubmit=event=>{event.preventDefault();finish('Compare against the key');};tick();clock=setInterval(tick,250);
    };
    el('#ap-frq').onsubmit=event=>{
      event.preventDefault();const text=event.currentTarget.elements.response.value.toLowerCase(),miss=terms.filter(term=>!text.includes(term));
      el('#ap-grade').textContent=(terms.length-miss.length)+' / '+terms.length+' keyword signals. This is a revision aid, not an official exam score. '+(miss.length?'Review whether your reasoning should address: '+miss.join(', ')+'.':'Now connect the concepts to the prompt with a specific example.');
    };
  }
  picker.onchange=render;render();
};
const slideTemplates={
  'Science fair':['Question','Hypothesis','Materials and method','Results','Conclusion','Sources'],
  'Book report':['Book and author','Setting and characters','Key conflict','Theme and evidence','My evaluation','Works cited'],
  'History timeline':['Historical context','First turning point','Second turning point','Consequences','Why it matters','Sources'],
  'Lab results':['Objective','Experimental design','Data','Interpretation','Limitations','References']
};
const slidePrompts={
  'Question':'State the research question in one sentence. Identify what changes and what you measure.',
  'Hypothesis':'Say what you predict and why. Connect the prediction to what you already know.',
  'Materials and method':'List the materials, what you kept constant, and how you repeated the trial.',
  'Results':'Show the most important measurement or comparison. Label axes and units.',
  'Conclusion':'Answer the question using one specific finding. Say what you would test next.',
  'Historical context':'Place the topic in time and identify the people or groups involved.',
  'First turning point':'Name an event, date it, and explain what changed after it.',
  'Second turning point':'Connect the next event to a change already underway.',
  'Consequences':'Distinguish immediate effects from later consequences.',
  'Theme and evidence':'State one theme and support it with two specific moments from the book.',
  'Data':'Present a table or chart and describe what it shows.',
  'Interpretation':'Explain how the data support or challenge your hypothesis.',
  'Limitations':'Name a source of uncertainty and explain how you would reduce it.'
};
views.slides=()=>wavePanel('Start a slide deck','<p>Browse four free templates. Build an editable topic outline with a slide for each required section.</p>'+Object.entries(slideTemplates).map(([name,titles])=>'<details><summary>'+name+'</summary><p>'+titles.join(' · ')+'</p></details>').join('')+'<form id="slide-form" class="stack">'+field('topic','Presentation topic','text','required maxlength="120"')+selectField('template','Template',Object.keys(slideTemplates))+'<button class="primary">Build slide deck</button></form><div id="slide-editor" class="stack"></div><button class="ghost" id="export-slides" hidden>Download slide deck</button>');
bindings.slides=()=>{
  const form=el('#slide-form'),editor=el('#slide-editor'),download=el('#export-slides');
  let topic='';
  form.onsubmit=event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(form));topic=data.topic.trim();
    if(!topic)return;
    const pages=[[topic,'Introduce '+topic+' and tell your audience what they will learn.'],...slideTemplates[data.template].map(title=>[title,slidePrompts[title]??('Explain '+title.toLowerCase()+' for '+topic+'. Add one specific piece of evidence or an example.')])];
    editor.innerHTML=pages.map(([title,body],i)=>'<section class="panel"><h3>Slide '+(i+1)+'</h3><label>Slide title<input class="slide-title" maxlength="140" value="'+esc(title)+'"></label><label>Slide content<textarea class="slide-body" maxlength="4000">'+esc(body)+'</textarea></label></section>').join('');
    download.hidden=false;
  };
  download.onclick=()=>{
    const titles=[...editor.querySelectorAll('.slide-title')],bodies=[...editor.querySelectorAll('.slide-body')];
    const content='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(topic)+'</title><style>body{margin:0;background:#100b20;color:#faf4ff;font:20px system-ui;scroll-snap-type:y proximity}section{min-height:100vh;padding:12vw 10vw;box-sizing:border-box;scroll-snap-align:start}h1{font-size:clamp(2rem,6vw,5rem);color:#75f7ff}p{white-space:pre-wrap}@media print{body{background:white;color:black}section{break-after:page;min-height:0}h1{color:black}}</style>'+titles.map((title,i)=>'<section><h1>'+esc(title.value)+'</h1><p>'+esc(bodies[i].value)+'</p></section>').join('')+'</html>';
    const url=URL.createObjectURL(new Blob([content],{type:'text/html'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='donezo-slides.html';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
};
const shieldInputs=()=>wavePanel('Lock In Mode','<p>Opt in before starting a focus session. The shield can intercept links opened from Donezo. Your browser or operating system controls blocking in other tabs and apps.</p><label class="remove-avatar"><input type="checkbox" id="shield-opt"> Use focus shield for the next session</label><label>Distracting domains (one per line)<textarea id="shield-sites" maxlength="1200" placeholder="example.com"></textarea></label><p id="shield-status" role="status"></p>');
let activeShield;
function shieldSetup(){
  const field=el('#shield-sites');field.value=read('shield-sites','');field.oninput=()=>save('shield-sites',field.value);
}
function beginShield(end,kind){
  if(!el('#shield-opt')?.checked)return;
  const domains=lines(el('#shield-sites').value).map(value=>value.toLowerCase().replace(/^https?:\/\//,'').split('/')[0]).filter(value=>/^[a-z\d-]+(?:\.[a-z\d-]+)+$/.test(value));
  activeShield={end,kind,domains};
  el('#shield-status').textContent='Focus shield is on for this session.';
}
function checkShield(){
  if(activeShield&&Date.now()>=activeShield.end){
    activeShield=undefined;earn('Completed Lock In session',5);
    if(el('#shield-status'))el('#shield-status').textContent='Locked session complete · +5 XP.';
  }
}
setInterval(checkShield,1000);
document.addEventListener('click',event=>{
  const href=event.target.closest('a[href]')?.href;
  if(!activeShield||!href||Date.now()>=activeShield.end)return;
  const domain=new URL(href,location.href).hostname;
  if(activeShield.domains.some(site=>domain===site||domain.endsWith('.'+site))){
    event.preventDefault();
    const status=el('#shield-status')??el('#achievement-toast');
    status.hidden=false;status.textContent='Lock In paused this link until the focus session ends.';
  }
},true);
for(const [page,start,stop] of [['studio','#focus-start',['#focus-pause','#focus-reset']],['rooms','#room-start',['#room-end','#room-leave']]]){
  const view=views[page],bind=bindings[page];
  views[page]=()=>view()+shieldInputs();
  bindings[page]=()=>{
    bind();shieldSetup();
    const button=el(start),original=button.onclick;
    button.onclick=event=>{
      const previous=focusEnd;
      original.call(button,event);
      const end=page==='studio'?(focusEnd!==previous?focusEnd:0):(el('#room-minutes').checkValidity()&&el('#room-minutes').value?Date.now()+Number(el('#room-minutes').value)*60000:0);
      if(end>Date.now())beginShield(end,page);
    };
    for(const selector of stop){
      const control=el(selector),previous=control.onclick;
      control.onclick=event=>{
        if(activeShield?.kind===page){activeShield=undefined;el('#shield-status').textContent='Focus shield off.';}
        previous.call(control,event);
      };
    }
  };
}
window.addEventListener('hashchange',()=>{if(activeShield?.kind==='rooms'&&location.hash!=='#rooms')activeShield=undefined;});
const homeCompetitive=views.home;
views.home=()=>homeCompetitive()+wavePanel('One app. Not four subscriptions.','<p>Donezo double-checks supported calculations and shows the proof.</p>'+links([['Note Lab','notelab'],['Due today','review'],['Check My Work','workcheck'],['Advanced Exam Wing','ap']]));
show();localize();
