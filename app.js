const sections = {
  home: ['Home', '⌂'],
  snap: ['Snap It', '⌗', 'Frame a problem. Get the answer first and the steps underneath.', 'snap'],
  capture: ['Capture', '◉', 'Turn a voice memo or a rough thought into a next step.'],
  school: ['School Wing', '≡', 'Work through algebra, build citations, and find writing support.'],
  projects: ['Projects Wing', '◇', 'Break down research papers, labs, and group presentations.', 'projects'],
  learn: ['Learn', '◈', 'Make a deck from your notes and practice active recall.'],
  test: ['Test Prep', '↯', 'Practice college entrance exam skills and review every answer.', 'test'],
  vault: ['The Vault', '◎', 'Get a handle on money, work, and independent life.', 'vault'],
  codes: ['Cheat Codes', '✧', 'Study shortcuts you can actually use.', 'codes'],
  pricing: ['Plans', '$', 'Compare the original Donezo plans.']
};
const main = document.querySelector('#workspace');
const nav = document.querySelector('#navigation');
const dialog = document.querySelector('#profile');
let memory = {};
let photoUrl;

function read(key, fallback) {
  if (Object.hasOwn(memory, key)) return memory[key];
  try {
    return JSON.parse(localStorage.getItem('donezo-' + key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem('donezo-' + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
nav.innerHTML = Object.entries(sections).map(([key, [title, icon]]) =>
  '<a href="#' + key + '"><span aria-hidden="true">' + icon + '</span>' + title + '</a>').join('');

function art(name, options = '') {
  return name ? '<img src="art/' + name + '.webp" alt="" ' + options + '>' : '';
}
function banner(key) {
  const [title, , description, artwork] = sections[key];
  return '<section class="tool-banner"><div><p class="eyebrow">Donezo workspace</p><h1>' + title + '</h1><p>' + description + '</p></div>' + art(artwork) + '</section>';
}
function empty(message) {
  return '<div class="empty">' + art('empty', 'loading="lazy"') + '<p>' + message + '</p></div>';
}
function home() {
  const order = ['snap', 'test', 'projects', 'learn', 'vault', 'codes', 'school', 'capture'];
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow">Your study workspace</p>
    <h1>Homework.<br>Projects.<br><em>Donezo.</em></h1><p>From the next assignment to finals week. Solve the problem, build the deck, and stay ahead of the deadline.</p>
    <div class="actions"><a class="primary" href="#snap">⌗ Snap It</a><a class="ghost" href="#learn">Study mode</a></div></div>
    <div class="hero-media">${art('hero', 'fetchpriority="high"')}</div></section>
    <section class="section"><div class="split"><h2>Pick your next move</h2><label class="search">Find a tool<input type="search" id="filter" placeholder="Try algebra or exam prep"></label></div>
    <div class="cards section">${order.map(key => {
      const [title, icon, description, artwork] = sections[key];
      return `<a class="tile" href="#${key}">${art(artwork, 'loading="lazy"')}<div><h3><span aria-hidden="true">${icon}</span> ${title}</h3><p>${description}</p></div></a>`;
    }).join('')}</div><div id="no-tools" hidden>${empty('No tools match your search.')}</div></section>`;
}
function solverMarkup(photo) {
  return `<div class="columns"><section class="panel stack"><h2>${photo ? 'Capture a problem' : 'Algebra solver'}</h2>
  ${photo ? '<label>Take or choose a photo<input id="photo" type="file" accept="image/*" capture="environment"></label><img id="photo-preview" alt="Your selected homework photo" hidden><p>Review the photo, then type its equation below.</p>' : ''}
  <form id="solve-form" class="stack"><label>Equation<input name="equation" required placeholder="2x² + 5x − 12 = 0" maxlength="100" autocomplete="off"></label>
  <p>Supports linear and quadratic equations in standard form, such as 3x + 2 = 11.</p><div class="actions"><button class="primary">Show answer</button><button class="ghost" id="sample" type="button">Try an example</button></div></form>
  </section>
  <section class="panel" id="solution" aria-live="polite"><h2>Solution</h2><p>Your answer and steps will appear here.</p></section></div>`;
}
function solve(input) {
  const value = input.toLowerCase().replace(/[\s*]/g, '').replace(/−/g, '-').replace(/²/g, '^2');
  const parts = value.split('=');
  if (parts.length !== 2 || parts.some(part => !part)) return null;
  const coefficients = [0, 0, 0];
  for (const [index, part] of parts.entries()) {
    const terms = (part.startsWith('-') || part.startsWith('+') ? part : '+' + part).match(/[+-][^+-]+/g);
    if (!terms || terms.join('') !== (part.startsWith('-') || part.startsWith('+') ? part : '+' + part)) return null;
    for (const term of terms) {
      const parsed = term.match(/^([+-])(\d+(?:\.\d+)?|\.\d+)?(x(?:\^2)?)?$/);
      if (!parsed || (!parsed[2] && !parsed[3])) return null;
      const power = parsed[3] === 'x^2' ? 2 : parsed[3] ? 1 : 0;
      coefficients[power] += (index ? -1 : 1) * (parsed[1] === '-' ? -1 : 1) * Number(parsed[2] ?? '1');
    }
  }
  const [c, b, a] = coefficients;
  const num = n => String(Number(n.toPrecision(9)));
  if (![a,b,c].every(Number.isFinite)) return null;
  if (!a && !b) return [c ? 'No solution' : 'All real numbers', ['Combine like terms on each side.', c ? 'The variables cancel and leave a false equality.' : 'Both sides simplify to the same expression.']];
  if (!a) return ['x = ' + num(-c / b), ['Move the constant to the other side: ' + num(b) + 'x = ' + num(-c), 'Divide both sides by ' + num(b) + '.']];
  const d = b*b - 4*a*c;
  if (!Number.isFinite(d)) return null;
  const standard = 'Move all terms to the left. The coefficients are a = ' + num(a) + ', b = ' + num(b) + ', and c = ' + num(c) + '.';
  const discriminant = 'Compute the discriminant b² − 4ac = ' + num(d) + '.';
  if (d < 0) return ['No real solutions', [standard, discriminant, 'A negative discriminant gives two complex roots.']];
  const roots = [(-b + Math.sqrt(d))/(2*a), (-b - Math.sqrt(d))/(2*a)];
  return ['x = ' + [...new Set(roots.map(num))].join(' or x = '), [standard, discriminant, 'Substitute into x = (−b ± √(b² − 4ac)) / (2a) and simplify.']];
}
function bindSolver() {
  const form = document.querySelector('#solve-form');
  const result = document.querySelector('#solution');
  document.querySelector('#sample').onclick = () => {
    form.elements.equation.value = '2x² + 5x − 12 = 0';
    form.requestSubmit();
  };
  form.onsubmit = event => {
    event.preventDefault();
    const answer = solve(form.elements.equation.value);
    result.innerHTML = answer ? '<h2>Answer</h2><div class="answer">' + answer[0] + '</div><p class="status">Equation solved</p><h3>Steps</h3><ol class="steps">' + answer[1].map(step => '<li>' + step + '</li>').join('') + '</ol>' : '<h2>Solution</h2><p class="problem">Enter a linear or quadratic equation in x with one equals sign.</p>';
  };
  const photo = document.querySelector('#photo');
  if (photo) photo.onchange = () => {
    const preview = document.querySelector('#photo-preview');
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const file = photo.files[0];
    preview.hidden = !file;
    if (file) {
      photoUrl = URL.createObjectURL(file);
      preview.src = photoUrl;
    }
  };
}
function projects() {
  return `<div class="columns"><section class="panel stack"><h2>Project planner</h2>
  <form id="task-form" class="stack"><label>Next step<input name="task" required maxlength="160" placeholder="Draft the research question"></label><div><button class="primary">Add step</button></div></form>
  <p id="progress" role="status"></p><ul class="task-list" id="tasks"></ul><p id="project-note" role="status"></p><div id="achievement" hidden></div></section>
  <section class="panel stack"><h2>Start from a template</h2><div class="actions"><button class="ghost" data-template="research">Research paper</button><button class="ghost" data-template="lab">Lab report</button><button class="ghost" data-template="deck">Presentation</button></div></section></div>`;
}
function bindProjects() {
  const tasks = read('project-planner-v1', []);
  const list = document.querySelector('#tasks');
  const progress = document.querySelector('#progress');
  const reward = document.querySelector('#achievement');
  function showProgress() {
    const done = tasks.filter(t => t.done).length;
    progress.textContent = tasks.length ? done + ' of ' + tasks.length + ' steps complete' : 'Add a step to get started.';
    reward.hidden = !tasks.length || done !== tasks.length;
    reward.innerHTML = reward.hidden ? '' : '<div class="empty">' + art('celebration') + '<p>Every step complete.</p></div>';
  }
  function persist() {
    document.querySelector('#project-note').textContent = save('project-planner-v1', tasks) ? '' : 'Browser storage is unavailable. Changes last for this visit.';
    showProgress();
  }
  function row(task) {
    const li = document.createElement('li');
    li.innerHTML = '<label><input type="checkbox"><span></span></label><button class="ghost" type="button">Remove</button>';
    li.querySelector('span').textContent = task.title;
    const checkbox = li.querySelector('input');
    checkbox.checked = task.done;
    checkbox.onchange = () => { task.done = checkbox.checked; persist(); };
    const remove = li.querySelector('button');
    remove.setAttribute('aria-label', 'Remove ' + task.title);
    remove.onclick = () => {
      const next = li.nextElementSibling?.querySelector('button') ?? li.previousElementSibling?.querySelector('button') ?? document.querySelector('[name=task]');
      tasks.splice(tasks.indexOf(task), 1);
      li.remove();
      persist();
      next.focus();
    };
    list.append(li);
  }
  const templates = {
    research: ['Choose a research question', 'Find and evaluate three sources', 'Outline the argument', 'Draft, cite, and revise'],
    lab: ['State the hypothesis and method', 'Organize the measurements', 'Analyze the results', 'Write the discussion and limitations'],
    deck: ['Identify the audience and main point', 'Outline the slides', 'Add visuals and cite sources', 'Rehearse and time the presentation']
  };
  function add(title) {
    const task = {title, done:false};
    tasks.push(task);
    row(task);
  }
  tasks.forEach(row);
  showProgress();
  const form = document.querySelector('#task-form');
  form.onsubmit = event => {
    event.preventDefault();
    const title = form.elements.task.value.trim();
    if (!title) return;
    add(title);
    persist();
    form.reset();
    form.elements.task.focus();
  };
  document.querySelectorAll('[data-template]').forEach(button => button.onclick = () => {
    templates[button.dataset.template].forEach(title => {
      if (!tasks.some(task => task.title === title)) add(title);
    });
    persist();
  });
}
function learn() {
  return `<div class="columns"><form class="panel stack" id="deck-form"><h2>Build a flashcard deck</h2>
  <label>One term and definition per line<textarea name="notes" required maxlength="16000" placeholder="Photosynthesis | How plants turn light into chemical energy"></textarea></label><p>Separate each term and definition with a vertical bar (|).</p><div><button class="primary">Create deck</button></div><p id="deck-status" role="status"></p></form>
  <section class="panel stack"><h2>Study mode</h2><p id="card-count" aria-live="polite"></p><div id="deck-empty">${empty('Create a deck to start studying.')}</div>
  <button class="flash" id="flash" hidden></button><div class="actions" id="deck-controls" hidden><button class="ghost" id="previous">Previous</button><button class="ghost" id="next">Next card</button></div></section></div>`;
}
function bindLearn() {
  let cards = read('deck', []);
  let index = 0;
  let flipped = false;
  const form = document.querySelector('#deck-form');
  const flash = document.querySelector('#flash');
  const count = document.querySelector('#card-count');
  form.elements.notes.value = cards.map(card => card.join(' | ')).join('\n');
  function show() {
    flash.hidden = document.querySelector('#deck-controls').hidden = !cards.length;
    document.querySelector('#deck-empty').hidden = !!cards.length;
    count.textContent = cards.length ? 'Card ' + (index + 1) + ' of ' + cards.length + (flipped ? ' · Definition' : ' · Tap to flip') : '';
    if (cards.length) flash.textContent = cards[index][flipped ? 1 : 0];
  }
  flash.onclick = () => { flipped = !flipped; show(); };
  const navigate = delta => { index = (index + delta + cards.length) % cards.length; flipped = false; show(); };
  document.querySelector('#previous').onclick = () => navigate(-1);
  document.querySelector('#next').onclick = () => navigate(1);
  form.onsubmit = event => {
    event.preventDefault();
    const status = document.querySelector('#deck-status');
    const lines = form.elements.notes.value.split('\n').filter(line => line.trim());
    const parsed = lines.map(line => {
      const split = line.indexOf('|');
      return split === -1 ? [] : [line.slice(0, split).trim(), line.slice(split + 1).trim()];
    });
    if (!parsed.length || parsed.some(card => card.length !== 2 || card.some(text => !text))) {
      status.textContent = 'Each line needs a term, a vertical bar, and its definition.';
      return;
    }
    cards = parsed;
    index = 0;
    flipped = false;
    status.textContent = save('deck', cards) ? 'Deck saved in this browser.' : 'Deck created for this visit.';
    show();
  };
  show();
}
const quizzes = {
  Math: [
    ['If 3x + 5 = 20, what is x?', ['3', '5', '8', '15'], 1, 'Subtract 5, then divide 15 by 3.'],
    ['A price of $80 increases by 25%. What is the new price?', ['$85', '$95', '$100', '$105'], 2, 'Multiply $80 by 1.25.'],
    ['What is the slope between (1, 2) and (4, 8)?', ['1/2', '2', '3', '6'], 1, 'Divide the rise, 6, by the run, 3.'],
    ['Which number is the median of 2, 5, 7, 9, 20?', ['5', '7', '8', '9'], 1, 'The median is the middle value in order.'],
    ['What is the positive solution of x² = 49?', ['6', '7', '14', '24.5'], 1, '7 × 7 = 49.']
  ],
  English: [
    ['Choose the sentence with correct subject–verb agreement.', ['The list of sources are long.', 'The list of sources is long.', 'The lists is long.', 'The sources seems long.'], 1, '“List” is the singular subject.'],
    ['Which transition best introduces a contrast?', ['Likewise', 'Therefore', 'However', 'Furthermore'], 2, '“However” introduces a contrasting idea.'],
    ['Which is a complete sentence?', ['Because the bus was late.', 'While the students waited.', 'After the school day ended.', 'The class started on time.'], 3, 'It contains a subject, a verb, and a complete thought.'],
    ['Choose the clearest revision of “Due to the fact that it rained, we stayed in.”', ['We stayed in because it rained.', 'Raining being a fact, we stayed in.', 'It stayed in because we rained.', 'Due to rain as a reason, we stayed in.'], 0, '“Because” communicates the same cause directly.'],
    ['Which sentence uses an apostrophe correctly?', ['The student finished it’s essay.', 'The student’s essay won a prize.', 'The students essay’s won a prize.', 'The students’ won a prize.'], 1, '“Student’s” shows that the essay belongs to one student.']
  ]
};
function testPrep() {
  return `<div class="columns"><div class="panel stack"><h2>College entrance exam practice</h2><p>Five original practice questions per subject.</p><div class="actions"><button class="primary" data-quiz="Math">Math drill</button><button class="ghost" data-quiz="English">English drill</button></div></div><section class="panel stack" id="quiz"><h2>Pick a subject</h2></section></div>`;
}
function bindTest() {
  const panel = document.querySelector('#quiz');
  function drill(subject) {
    const quiz = quizzes[subject];
    let score = 0;
    let index = 0;
    function question() {
      if (index === quiz.length) {
        panel.innerHTML = '<h2>Drill complete</h2><div class="answer">' + score + ' / ' + quiz.length + '</div>' + (score === quiz.length ? art('celebration', 'style="width:100%;border-radius:12px"') : '') + '<button class="ghost" id="retry">Restart drill</button>';
        panel.querySelector('#retry').onclick = () => drill(subject);
      } else {
        const [prompt, choices, correct, explanation] = quiz[index];
        panel.innerHTML = '<p class="eyebrow">Question ' + (index + 1) + ' of ' + quiz.length + '</p><h2>' + prompt + '</h2>' +
          choices.map((choice, i) => '<button class="ghost" data-choice="' + i + '">' + choice + '</button>').join('') +
          '<p id="feedback" role="status"></p><button id="advance" class="primary" hidden>' + (index + 1 === quiz.length ? 'See score' : 'Next question') + '</button>';
        const buttons = panel.querySelectorAll('[data-choice]');
        const next = panel.querySelector('#advance');
        buttons.forEach(button => button.onclick = () => {
          const match = Number(button.dataset.choice) === correct;
          if (match) score++;
          buttons.forEach(item => item.disabled = true);
          panel.querySelector('#feedback').textContent = (match ? 'Correct. ' : 'Answer: ' + choices[correct] + '. ') + explanation;
          next.hidden = false;
          next.focus();
        });
        next.onclick = () => { index++; question(); };
      }
      const heading = panel.querySelector('h2');
      heading.tabIndex = -1;
      heading.focus();
    }
    question();
  }
  document.querySelectorAll('[data-quiz]').forEach(button => button.onclick = () => drill(button.dataset.quiz));
}
function capture() {
  return `<div class="columns"><section class="panel stack"><h2>Capture a thought</h2>
  <form id="capture-form" class="stack"><label>Quick note<textarea name="note" required maxlength="2000" placeholder="What do you need to finish or follow up on?"></textarea></label><div class="actions"><button class="primary">Add to planner</button><button class="ghost" type="button" id="dictate">Dictate</button></div></form><p id="capture-status" role="status"></p></section><section class="panel stack"><h2>Turn notes into next steps</h2><p>Drop an assignment, idea, or deadline into your checklist while it’s fresh.</p></section></div>`;
}
function bindCapture() {
  const form = document.querySelector('#capture-form');
  const status = document.querySelector('#capture-status');
  const Engine = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  document.querySelector('#dictate').onclick = () => {
    if (!Engine) {
      status.textContent = 'Dictation is unavailable here. You can type your note or use your device keyboard’s microphone.';
      return;
    }
    const speech = new Engine();
    speech.lang = 'en-US';
    speech.onresult = event => { form.elements.note.value = (form.elements.note.value + ' ' + event.results[0][0].transcript).trim().slice(0, 2000); status.textContent = 'Dictation added.'; };
    speech.onerror = () => { status.textContent = 'Dictation could not start or finish. You can still type your note.'; };
    try { speech.start(); } catch { status.textContent = 'Dictation could not start.'; }
  };
  form.onsubmit = event => {
    event.preventDefault();
    const title = form.elements.note.value.trim();
    if (!title) return;
    const tasks = read('project-planner-v1', []);
    tasks.push({title, done:false});
    status.textContent = save('project-planner-v1', tasks) ? 'Note added to Projects Wing.' : 'Note added for this visit. Browser storage is unavailable.';
    form.reset();
  };
}
function school() {
  return solverMarkup(false) + `<form id="citation" class="panel stack"><h2>Author-page website citation</h2><div class="columns"><label>Author (Last, First)<input name="author"></label><label>Page title<input name="page" required></label><label>Website name<input name="site" required></label><label>Publication date, if listed<input name="date" placeholder="12 Sept. 2025"></label><label>Page URL<input name="url" type="url" required></label></div><div class="actions"><button class="primary">Format citation</button></div><p id="citation-result" role="status"></p></form>`;
}
function bindSchool() {
  bindSolver();
  const form = document.querySelector('#citation');
  form.onsubmit = event => {
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(form)].map(([k,v]) => [k,v.trim()]));
    const result = document.querySelector('#citation-result');
    if (!values.page || !values.site || !/^https?:\/\//i.test(values.url)) {
      result.textContent = 'Enter a page title, a website name, and an HTTP or HTTPS URL.';
      return;
    }
    const site = document.createElement('i');
    site.textContent = values.site;
    result.replaceChildren((values.author ? values.author.replace(/\.$/, '') + '. ' : '') + '“' + values.page.replace(/\.$/, '') + '.” ', site, ', ' + (values.date ? values.date + ', ' : '') + values.url + '.');
  };
}
function details(title, items, original) {
  return '<section class="panel"><h2>' + title + '</h2>' + items.map(([label, description]) => '<details><summary>' + label + '</summary><p>' + description + '</p></details>').join('') + '<div class="actions">' + original + '</div></section>';
}
const views = {
  home, snap: () => solverMarkup(true), school, projects, learn, test:testPrep, capture,
  vault: () => details('Life after the syllabus', [
    ['Build a budget', 'List what comes in, your recurring expenses, and upcoming costs. Give each expense an amount and track what you actually spend for one month.'],
    ['Read a paycheck', 'Compare gross and net pay. Check your hours, tax withholding, and any benefit deductions against your pay agreement.'],
    ['Write a résumé bullet', 'Start with an action verb, name what you did, and describe the result. Include a number where it adds real context.'],
    ['Compare apartments', 'Add up rent, utilities, commuting, deposits, and move-in fees. Read the lease for renewal terms and the notice required to move out.']
  ], ''),
  codes: () => details('Study shortcuts', [
    ['Homework Booster', 'Work one example with notes open, then try a similar problem from memory. Check exactly where the steps diverged.'],
    ['Quiz Mode', 'Start with five questions and review the ones you missed. Retest those topics the next day.'],
    ['Active Recall', 'Turn each heading from your notes into a question. Answer it without looking and write the part you forgot.'],
    ['Deadline Sprint', 'Write down the next action you can finish in 20 minutes. Set a timer, mute distractions, and start there.']
  ], '<a class="ghost" href="#test">Start a drill</a><a class="ghost" href="#learn">Build a deck</a>'),
  pricing: () => `<div class="cards">${[['Free','$0'],['Gold','$20'],['Diamond','$50']].map(([name, price]) => '<section class="panel"><h2 class="gold">' + name + '</h2><p class="plan">' + price + '<small> / month</small></p></section>').join('')}</div><section class="panel stack"><h2>Compare original plans</h2><p>For plan details and checkout, open the Pricing tab in the original Donezo. This workspace has no billing.</p></section>`
};
const bindings = {
  snap: bindSolver, school: bindSchool, projects: bindProjects, learn: bindLearn, test: bindTest, capture:bindCapture,
  home() {
    const filter = document.querySelector('#filter');
    const tiles = [...main.querySelectorAll('.tile')];
    filter.oninput = () => {
      const query = filter.value.trim().toLowerCase();
      tiles.forEach(tile => tile.hidden = !tile.textContent.toLowerCase().includes(query));
      document.querySelector('#no-tools').hidden = tiles.some(tile => !tile.hidden);
    };
  }
};
function show(focus = false) {
  if (photoUrl) {
    URL.revokeObjectURL(photoUrl);
    photoUrl = undefined;
  }
  const route = location.hash.slice(1);
  const page = route === 'planner' ? 'projects' : route || 'home';
  const valid = Object.hasOwn(views, page);
  document.querySelector('#location').textContent = valid ? sections[page][0] : 'Page unavailable';
  nav.querySelectorAll('a').forEach(a => a.hash === '#' + page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  main.innerHTML = valid ? (page === 'home' ? '' : banner(page)) + views[page]() :
    '<section class="panel empty"><h1>Page not found</h1>' + art('empty') + '<a class="primary" href="#home">Back to home</a></section>';
  if (valid) bindings[page]?.();
  if (focus) {
    main.focus({preventScroll:true});
    window.scrollTo(0, 0);
  }
}
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
});
window.addEventListener('hashchange', () => show(true));
const profileButton = document.querySelector('#profile-button');
const profileForm = document.querySelector('#profile-form');
let profile = read('profile', {});
function profileLabel() {
  profileButton.replaceChildren();
  if (/^data:image\/(?:png|jpeg|webp);base64,/.test(profile.avatar ?? '')) {
    const image = new Image();
    image.src = profile.avatar;
    image.alt = '';
    image.className = 'avatar';
    profileButton.append(image);
  }
  profileButton.append(document.createTextNode(profile.name || 'My profile'));
}
profileButton.onclick = () => {
  profileForm.elements.name.value = profile.name ?? '';
  profileForm.elements.grade.value = profile.grade ?? '';
  profileForm.elements.avatar.value = '';
  profileForm.elements.remove.checked = false;
  document.querySelector('#profile-status').textContent = '';
  dialog.showModal();
};
document.querySelector('#close-profile').onclick = () => dialog.close();
profileForm.onsubmit = event => {
  event.preventDefault();
  const file = profileForm.elements.avatar.files[0];
  const status = document.querySelector('#profile-status');
  if (file && (!/^image\/(?:png|jpeg|webp)$/.test(file.type) || file.size > 350000)) {
    status.textContent = 'Choose a PNG, JPEG, or WebP under 350 KB.';
    return;
  }
  const name = profileForm.elements.name.value.trim();
  const grade = profileForm.elements.grade.value;
  const finish = avatar => {
    profile = {...profile, name, grade, avatar};
    if (save('profile', profile)) dialog.close();
    else status.textContent = 'Profile updated for this visit. Browser storage is unavailable.';
    profileLabel();
  };
  if (file) {
    const reader = new FileReader();
    reader.onload = () => finish(reader.result);
    reader.onerror = () => status.textContent = 'The photo could not be read.';
    reader.readAsDataURL(file);
  } else finish(profileForm.elements.remove.checked ? '' : profile.avatar);
};
profileLabel();
show();
