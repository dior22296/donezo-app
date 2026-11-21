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
// Preview limit, stated plainly: this static build cannot ask Stripe whether
// a checkout was finished, so the device unlock runs on the recorded start.
// The hosted build resolves trial state from the account instead (the Stripe
// webhook keeps it in sync) and this file never overrides a server account.
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
  const st = trialState();
  if (st.status === 'active') return wavePanel('Your free trial is on',
    '<p><strong class="gold">' + esc(st.tier) + ' is unlocked on this device.</strong> ' + trialRemainingText(st.msLeft) + ' left of your 3 free days. Then ' + TRIAL_PRICES[st.tier] + '/month unless you cancel. Cancel anytime.</p>');
  if (st.status === 'expired') return wavePanel('Your free trial ended',
    '<p>The 3-day free trial on this device is over, so paid features are locked again. Pick a plan below to keep them. One free trial per device.</p>');
  return wavePanel('Try a plan free for 3 days',
    '<p>Start at secure Stripe checkout — no charge today. Your card is only charged when the 3 free days end, and you can cancel anytime before then and pay nothing.</p>' +
    ['Gold', 'Diamond'].map(tier => '<p><strong>' + tier + '</strong> — 3 days free, then ' + TRIAL_PRICES[tier] + '/month. Cancel anytime.</p><a class="primary" href="' + TRIAL_LINKS[tier] + '" data-trial-start="' + tier + '">Start 3-day free trial</a>').join(''));
}
function wireTrialButtons() {
  document.querySelectorAll('[data-trial-start]').forEach(link => link.addEventListener('click', () => {
    save('trial-v1', { tier: link.dataset.trialStart, started: Date.now(), used: true });
  }));
}

const pricingBeforeTrial = views.pricing, pricingBindBeforeTrial = bindings.pricing;
views.pricing = () => pricingBeforeTrial() + trialOfferPanel();
bindings.pricing = () => { pricingBindBeforeTrial && pricingBindBeforeTrial(); wireTrialButtons(); };

const dashBeforeTrial = views.dashboard;
views.dashboard = () => dashBeforeTrial() + wavePanel('Free trial', (() => {
  const st = trialState();
  if (st.status === 'active') return '<p><strong class="gold">' + esc(st.tier) + ' trial active.</strong> ' + trialRemainingText(st.msLeft) + ' left. Then ' + TRIAL_PRICES[st.tier] + '/month unless you cancel. Cancel anytime.</p>';
  if (st.status === 'expired') return '<p>Your 3-day free trial on this device has ended.</p><a class="ghost" href="#pricing">See plans</a>';
  return '<p>Try Gold or Diamond free for 3 days. No charge today — then the monthly price unless you cancel.</p><a class="primary" href="#pricing">Start a 3-day free trial</a>';
})());

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
views.settings = () => settingsBeforeTrial() + (trialTier()
  ? ''
  : wavePanel('Voice Match is a Diamond perk', '<p>Try Diamond free for 3 days, then $49.99/month. Cancel anytime.</p><a class="primary" href="#pricing">See the free trial</a>'));

applyTrialAccount();
addEventListener('hashchange', applyTrialAccount);
// Same end-of-file pattern as library.js: re-render once at load so a direct
// landing renders with trial state already applied.
show();
