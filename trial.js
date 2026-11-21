// DONEZO FREE TRIAL (Nov 21) — 3-day free trial per paid plan, card up front.
// The trial itself lives in Stripe: each plan's checkout link starts a 3-day
// free trial, then bills monthly ($19.99 Gold / $49.99 Diamond) until the
// student cancels. This file is the front-end half:
//  - Pricing, dashboard, Vault and Settings surfaces offer/status the trial.
//  - Clicking a trial button records the start on this device, then sends the
//    student to that plan's Stripe checkout to add their card.
//  - While the 3 days run, this device unlocks the picked plan's features
//    (a Gold trial unlocks Gold features; Voice Match still needs Diamond).
//  - At expiry the device locks again and the normal upgrade prompts return.
// TRIAL MESSAGING (Nov 21, wired from the trial comms pack): the dashboard
// carries the lifecycle in-app — day-0 confirmation, the day-1 endowment
// sprint (goal -> one real finish -> streak -> first Vault words), the day-2
// asset summary and the last-day expiry message, both built from the
// student's REAL local data (planner steps, streak days, XP, mastered words —
// nothing is invented, and a line with no data behind it is omitted). The
// expiry message shows the exact charge date (start + 3 days, the date Stripe
// charges). After expiry, choosing a plan again records a conversion click and
// the dashboard shows the welcome state. Fence honored: live copy promises
// IN-APP reminders only ("we'll remind you here in the app") — lifecycle
// emails exist only in the hosted build, so no email promise appears here.
// Preview limit, stated plainly: this static build cannot ask Stripe whether
// a checkout was finished, so the device unlock runs on the recorded start
// (and the welcome state on a recorded post-expiry plan click). The hosted
// build resolves trial state from the account instead (the Stripe webhook
// keeps it in sync) and this file never overrides a server account.
// One free trial per device profile; the account rule is enforced server-side.
const TRIAL_MS = 3 * 86400000;
const TRIAL_LINKS = { Gold: 'https://buy.stripe.com/cNi4gB2RW8yA2mH5tcbjW1e', Diamond: 'https://buy.stripe.com/14AbJ3csw024d1l3l4bjW1f' };
const TRIAL_PRICES = { Gold: '$19.99', Diamond: '$49.99' };
const TRIAL_LOCK = 'Paid access requires a connected subscription.';

function trialRecord() { return read('trial-v1', null); }
function trialState() {
  const rec = trialRecord();
  if (!rec || !rec.started) return { status: 'none' };
  const endsAt = rec.started + TRIAL_MS, msLeft = endsAt - Date.now();
  return msLeft > 0
    ? { status: 'active', tier: rec.tier, started: rec.started, endsAt, msLeft }
    : { status: 'expired', tier: rec.tier, started: rec.started, endsAt };
}
function trialRemainingText(ms) {
  const mins = Math.max(1, Math.round(ms / 60000)), days = Math.floor(mins / 1440), hours = Math.floor((mins % 1440) / 60), rest = mins % 60;
  if (days) return days + (days === 1 ? ' day ' : ' days ') + hours + (hours === 1 ? ' hour' : ' hours');
  if (hours) return hours + (hours === 1 ? ' hour ' : ' hours ') + rest + ' minutes';
  return rest + (rest === 1 ? ' minute' : ' minutes');
}
function trialFmtDate(ms) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(ms));
}
function trialAddMonth(ms) {
  const d = new Date(ms); d.setMonth(d.getMonth() + 1); return d.getTime();
}
// The student's real local assets — the only numbers trial messages may use.
function trialAssets() {
  const data = progressState(), tasks = read('project-planner-v1', []);
  const open = tasks.filter(t => !t.done), latest = tasks[tasks.length - 1];
  return {
    goal: (profile.goal || '').trim(),
    project: open.length ? open[open.length - 1].title : (latest ? latest.title : ''),
    projectState: open.length ? 'in progress' : (latest ? 'complete' : ''),
    streak: streak(data.days),
    xp: data.xp || 0,
    words: read('word-mastery', []).length,
    finished: (data.events || []).length > 0 || (data.xp || 0) > 0
  };
}
function trialAssetLines(a) {
  const lines = [];
  if (a.project) lines.push(esc(a.project) + ' (' + a.projectState + ')');
  if (a.streak > 0) lines.push(a.streak + '-day streak');
  if (a.xp > 0) lines.push(a.xp + ' XP earned');
  if (a.words > 0) lines.push(a.words + (a.words === 1 ? ' word' : ' words') + ' in your Word Vault');
  return lines;
}
function trialAssetPhrase(a) {
  const lines = trialAssetLines(a);
  if (!lines.length) return 'everything you save';
  if (lines.length === 1) return 'your ' + lines[0].replace(' (in progress)', '').replace(' (complete)', '');
  return 'your ' + lines.slice(0, -1).join(', your ') + ' and your ' + lines[lines.length - 1].replace(' (in progress)', '').replace(' (complete)', '');
}
function trialPhase(st) {
  const elapsed = Date.now() - st.started;
  return elapsed < 86400000 ? 'start' : elapsed < 2 * 86400000 ? 'sprint' : 'final';
}
// Pack section 2 — day-0 confirmation (in-app wording: the reminder promised
// here is the in-app last-day message, which this file renders).
function trialStartPanel(st) {
  return wavePanel('Your 3 free days of ' + esc(st.tier) + ' are on',
    '<p><strong class="gold">' + esc(st.tier) + ' is unlocked until ' + trialFmtDate(st.endsAt) + '</strong> — no charge today. ' + trialRemainingText(st.msLeft) + ' left of your 3 free days.</p>' +
    '<p>Make it yours fast: set your goal, finish one real piece of homework, and get your first words into your Word Vault. What you build in these 3 days is what the plan protects.</p>' +
    '<p>We\'ll remind you right here in the app the day before your trial ends. If you do nothing, ' + TRIAL_PRICES[st.tier] + '/month starts on ' + trialFmtDate(st.endsAt) + '. Cancel anytime in Stripe before then and you pay nothing.</p>');
}
// Pack section 3 — the endowment sprint, in order, checked against real data.
function trialSprintPanel(st) {
  const a = trialAssets();
  const items = [
    { done: !!a.goal, label: 'Set your goal — in your own words', detail: a.goal ? '“' + esc(a.goal) + '”' : '' },
    { done: a.finished, label: 'Finish one real piece of homework', detail: '', href: '#snap', cta: 'Snap It' },
    { done: a.streak > 0, label: 'Start your streak — today counts', detail: a.streak > 0 ? a.streak + '-day streak going' : '', href: '#learn', cta: 'Study mode' },
    { done: a.words > 0, label: 'Get your first words into your Word Vault', detail: a.words > 0 ? a.words + (a.words === 1 ? ' word' : ' words') + ' saved' : '', href: '#test', cta: 'Word Vault' }
  ];
  const doneCount = items.filter(i => i.done).length;
  const goalForm = a.goal ? '' : '<form id="trial-goal" class="stack"><label>Your goal — in your own words<input name="goal" required maxlength="120" placeholder="Raise my SAT score"></label><div><button class="primary">Save goal</button></div></form>';
  return wavePanel('Make it yours — your first-session sprint',
    '<p>' + doneCount + ' of 4 done. What you build in these 3 days is what the plan protects — these four, in this order.</p>' +
    '<ol class="steps">' + items.map(i => '<li>' + (i.done ? '✓ ' : '') + '<strong>' + i.label + '</strong>' + (i.detail ? ' — ' + i.detail : '') + (!i.done && i.href ? ' <a class="ghost" href="' + i.href + '">' + i.cta + '</a>' : '') + '</li>').join('') + '</ol>' + goalForm +
    '<p>' + esc(st.tier) + ' trial — ' + trialRemainingText(st.msLeft) + ' left. Then ' + TRIAL_PRICES[st.tier] + '/month on ' + trialFmtDate(st.endsAt) + ' unless you cancel in Stripe.</p>');
}
// Pack section 4 — day-2 asset summary, real numbers only.
function trialSummaryPanel(st) {
  const a = trialAssets(), lines = trialAssetLines(a);
  const body = lines.length
    ? '<p>Two days in, here\'s what\'s yours on DONEZO:</p><ul>' + lines.map(l => '<li>' + l + '</li>').join('') + '</ul>'
    : '<p>Two days in — and nothing saved yet. One finished piece of homework, one streak day, one word in the Vault: that\'s what the plan protects. There\'s still time today.</p>';
  return wavePanel('What you\'ve built so far', body +
    '<p>Your trial ends on ' + trialFmtDate(st.endsAt) + '. Keep ' + esc(st.tier) + ' and all of it stays live for ' + TRIAL_PRICES[st.tier] + '/month. Let it lapse and the account drops back to Free — your work stays saved, the ' + esc(st.tier) + ' tools lock.</p>');
}
// Pack section 5 — last-day expiry, framed on their assets, exact dates.
function trialExpiryPanel(st) {
  const a = trialAssets();
  return wavePanel('Your trial ends on ' + trialFmtDate(st.endsAt),
    '<p>Your trial is in its last day — ' + trialAssetPhrase(a) + ' stay live on ' + esc(st.tier) + '.</p>' +
    '<p>Do nothing and ' + esc(st.tier) + ' continues at ' + TRIAL_PRICES[st.tier] + '/month, first charge on ' + trialFmtDate(st.endsAt) + '. Cancel in Stripe before then and you pay nothing — your projects, streak and words stay saved on Free, and you can pick ' + esc(st.tier) + ' back up anytime.</p>');
}
function trialEndedPanel() {
  return wavePanel('Your free trial ended',
    '<p>The 3-day free trial on this device is over, so paid features are locked again. Pick a plan below to keep them. One free trial per device.</p>');
}
// Pack section 6 — post-conversion welcome state (recorded plan click after
// expiry; the hosted build's version is the webhook-driven email, which
// carries the exact next billing date from Stripe).
function trialWelcomePanel(rec) {
  const tier = rec.converted.tier, a = trialAssets();
  return wavePanel('You\'re on ' + esc(tier) + ' now',
    '<p><strong class="gold">Welcome to ' + esc(tier) + '.</strong> Everything you built in the trial is still here — ' + trialAssetPhrase(a) + '.</p>' +
    '<p>Your plan is ' + TRIAL_PRICES[tier] + '/month, billed through Stripe. Manage or cancel anytime in Stripe; your work stays saved either way.</p>');
}
function trialDashboardPanels() {
  const st = trialState(), rec = trialRecord();
  if (st.status === 'active') {
    const phase = trialPhase(st);
    if (phase === 'start') return trialStartPanel(st) + trialSprintPanel(st);
    if (phase === 'sprint') return trialSprintPanel(st);
    return trialSummaryPanel(st) + trialExpiryPanel(st);
  }
  if (st.status === 'expired') return rec && rec.converted ? trialWelcomePanel(rec) : trialEndedPanel() +
    '<section class="panel stack"><p><a class="primary" href="#pricing">See plans</a></p></section>';
  return wavePanel('Free trial', '<p>Try Gold or Diamond free for 3 days. No charge today — then the monthly price unless you cancel.</p><a class="primary" href="#pricing">Start a 3-day free trial</a>');
}
// The tier a trial currently unlocks: this device's trial first, then a
// server-reported trial on a signed-in account (hosted build).
function trialTier() {
  const st = trialState();
  if (st.status === 'active') return st.tier;
  if (activeAccount && activeAccount.trial && activeAccount.trial.active) return activeAccount.tier;
  return null;
}
function applyTrialAccount() {
  const st = trialState();
  if (st.status === 'active') {
    if (!activeAccount) {
      activeAccount = { id: 'device-trial', name: profile.name || 'Donezo student', grade: profile.grade || '', classes: [], xp: 0,
        tier: st.tier, billingTier: 'Free', comped: false, compUntil: null, credits: 0, referral: '—', status: 'Active', joined: st.started, theme: null,
        trial: { tier: st.tier, startedAt: st.started, endsAt: st.endsAt, active: true, daysRemaining: Math.ceil((st.endsAt - Date.now()) / 86400000) }, trialUsed: true };
    }
  } else if (activeAccount && activeAccount.id === 'device-trial') activeAccount = null;
}
function trialOfferPanel() {
  const st = trialState(), rec = trialRecord();
  if (st.status === 'active') return wavePanel('Your free trial is on',
    '<p><strong class="gold">' + esc(st.tier) + ' is unlocked on this device.</strong> ' + trialRemainingText(st.msLeft) + ' left of your 3 free days. Then ' + TRIAL_PRICES[st.tier] + '/month starting ' + trialFmtDate(st.endsAt) + ' unless you cancel. We\'ll remind you right here in the app the day before anything charges. Cancel anytime in Stripe.</p>');
  if (st.status === 'expired') return rec && rec.converted ? trialWelcomePanel(rec) : trialEndedPanel();
  // Pack section 1 — the reminder line under each trial button. On this live
  // build the promised reminder is the in-app last-day message (rendered by
  // this file); no email reminder is promised until the hosted build is live.
  return wavePanel('Try a plan free for 3 days',
    '<p>Start at secure Stripe checkout — no charge today. Your card is only charged when the 3 free days end, and you can cancel anytime before then and pay nothing.</p>' +
    ['Gold', 'Diamond'].map(tier => '<p><strong>' + tier + '</strong> — 3 days free, then ' + TRIAL_PRICES[tier] + '/month. Cancel anytime.</p><a class="primary" href="' + TRIAL_LINKS[tier] + '" data-trial-start="' + tier + '">Start 3-day free trial</a>' +
      '<p><small>3 days free, then ' + TRIAL_PRICES[tier] + '/month starting ' + trialFmtDate(Date.now() + TRIAL_MS) + '. We\'ll remind you here in the app the day before anything charges. Cancel anytime in Stripe — your projects, streak and saved words stay on your account either way.</small></p>').join(''));
}
function wireTrialButtons() {
  document.querySelectorAll('[data-trial-start]').forEach(link => link.addEventListener('click', () => {
    save('trial-v1', { tier: link.dataset.trialStart, started: Date.now(), used: true });
  }));
}
// Choosing a plan after the trial ended records the conversion on this device
// (the hosted build records it from the Stripe webhook instead).
document.addEventListener('click', event => {
  const link = event.target.closest && event.target.closest('a[href]');
  if (!link || link.hasAttribute('data-trial-start')) return;
  const tier = Object.keys(TRIAL_LINKS).find(t => TRIAL_LINKS[t] === link.href);
  if (!tier) return;
  const rec = trialRecord();
  if (rec && rec.started && !rec.converted && trialState().status === 'expired')
    save('trial-v1', { ...rec, converted: { tier, at: Date.now() } });
});

const pricingBeforeTrial = views.pricing, pricingBindBeforeTrial = bindings.pricing;
views.pricing = () => pricingBeforeTrial() + trialOfferPanel();
bindings.pricing = () => { pricingBindBeforeTrial && pricingBindBeforeTrial(); wireTrialButtons(); };

const dashBeforeTrial = views.dashboard, dashBindBeforeTrial = bindings.dashboard;
views.dashboard = () => dashBeforeTrial() + trialDashboardPanels();
bindings.dashboard = () => {
  dashBindBeforeTrial && dashBindBeforeTrial();
  const form = document.querySelector('#trial-goal');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault();
    const goal = new FormData(form).get('goal');
    if (typeof goal === 'string' && goal.trim()) { profile = { ...profile, goal: goal.trim() }; save('profile', profile); show(); }
  });
};

const vaultBeforeTrial = views.vault;
views.vault = () => {
  let html = vaultBeforeTrial();
  const tier = trialTier();
  if (tier) {
    const covered = tier === 'Diamond' ? Object.keys(vault) : ['Money', 'Career'];
    const swaps = [];
    for (const [track, lessons] of Object.entries(vault))
      for (let i = 1; i < lessons.length; i++) swaps.push(covered.includes(track) ? esc(lessons[i][1]) : TRIAL_LOCK);
    const parts = html.split(TRIAL_LOCK);
    if (parts.length - 1 === swaps.length) html = parts.reduce((out, part, i) => out + (i ? swaps[i - 1] : '') + part, '');
  } else if (!activeAccount || activeAccount.tier === 'Free') html += trialOfferPanel();
  return html;
};

const settingsBeforeTrial = views.settings;
views.settings = () => settingsBeforeTrial() + (() => {
  const st = trialState();
  if (st.status === 'active' && trialPhase(st) === 'final') return trialExpiryPanel(st);
  return trialTier() ? '' : wavePanel('Voice Match is a Diamond perk', '<p>Try Diamond free for 3 days, then $49.99/month. Cancel anytime.</p><a class="primary" href="#pricing">See the free trial</a>');
})();

applyTrialAccount();
addEventListener('hashchange', applyTrialAccount);
// Same end-of-file pattern as library.js: re-render once at load so a direct
// landing renders with trial state already applied.
show();
