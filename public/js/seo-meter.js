(function () {
  const $ = (sel) => document.querySelector(sel);
  const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();
  const lower = (s) => stripHtml(s).toLowerCase();

  const titleEl = $('#page_title') || $('#google_title');
  const descEl = $('#page_description') || $('#meta_description');
  const aliasEl = $('#page_alias') || $('#alias');
  const kwEl = $('#focus_keyword');
  const computedTitleEl = document.getElementById('seo_title_computed');

  if (!titleEl || !descEl) return;

  const ui = {
    titleLen: $('#title-length'),
    descLen: $('#desc-length'),
    titleProg: $('#title-progress'),
    descProg: $('#desc-progress'),
    titleTips: $('#title-tips'),
    descTips: $('#desc-tips'),
    aliasCheck: $('#alias-check'),
    titleBeginCheck: $('#title-begin-check'),
    readScore: $('#readability-score'),
    readProg: $('#readability-progress'),
    readTips: $('#readability-tips'),
    scoreBadge: $('#seo-score-badge'),
  };
  if (!ui.titleLen || !ui.descLen || !ui.titleProg || !ui.descProg || !ui.titleTips || !ui.descTips || !ui.aliasCheck || !ui.titleBeginCheck || !ui.readScore || !ui.readProg || !ui.readTips || !ui.scoreBadge) return;

  function setProgress(bar, pct, variant) {
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    bar.className = 'progress-bar';
    if (variant) bar.classList.add('bg-' + variant);
  }

  function setBadge(el, ok) {
    el.className = 'badge';
    el.classList.add(ok ? 'text-bg-success' : 'text-bg-secondary');
    el.textContent = ok ? 'OK' : '-';
  }

  function scoreLength(len, sweetMin, sweetMax, hardMax) {
    if (len === 0) return { score: 0, variant: 'danger' };
    if (len < sweetMin) {
      const pct = Math.min(100, Math.round((len / sweetMin) * 70));
      return { score: pct, variant: 'warning' };
    }
    if (len <= sweetMax) {
      const pct = 100 - Math.abs(((len - (sweetMin + sweetMax) / 2) / ((sweetMax - sweetMin) / 2)) * 10);
      return { score: Math.max(80, Math.min(100, Math.round(pct))), variant: 'success' };
    }
    const over = Math.min(hardMax, len);
    const pct = Math.max(30, Math.round(100 - ((over - sweetMax) / (hardMax - sweetMax)) * 70));
    return { score: pct, variant: 'warning' };
  }

  function readability(s) {
    const text = stripHtml(s);
    const sentences = text.split(/[.!?]+/).map((t) => t.trim()).filter(Boolean);
    const words = text.split(/\s+/).filter(Boolean);
    const avgLen = sentences.length ? (words.length / sentences.length) : words.length;

    let score;
    if (avgLen === 0) score = 0;
    else if (avgLen < 8) score = 60;
    else if (avgLen <= 20) score = 95;
    else if (avgLen <= 30) score = 70;
    else score = 45;

    const tips = [];
    if (avgLen < 12) tips.push('Zinnen zijn erg kort; overweeg meer context toe te voegen.');
    if (avgLen > 20) tips.push('Zinnen zijn vrij lang; overweeg lange zinnen op te splitsen.');
    if (words.length < 40) tips.push('Overweeg meer context toe te voegen (minimaal 40+ woorden).');

    return { score, variant: score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger', tips, avgLen, words: words.length };
  }

  function analyze() {
    const rawTitle = stripHtml(titleEl.value);
    const company = titleEl.dataset.company || '';
    const fullTitle = company ? `${rawTitle} | ${company}` : rawTitle;

    if (computedTitleEl) {
      computedTitleEl.value = fullTitle;
      computedTitleEl.setAttribute('value', fullTitle);
    }

    const desc = stripHtml(descEl.value);
    const alias = ((aliasEl?.value || aliasEl?.dataset?.seoAlias || '') + '').toLowerCase().replace(/\s+/g, '-');
    const kw = lower(kwEl?.value || '');

    const tLen = fullTitle.length;
    const dLen = desc.length;

    const tScore = scoreLength(tLen, 35, 65, 70);
    const dScore = scoreLength(dLen, 120, 170, 200);

    ui.titleLen.textContent = `${tLen} tekens (incl. bedrijfsnaam)`;
    ui.descLen.textContent = `${dLen} tekens`;

    setProgress(ui.titleProg, tScore.score, tScore.variant);
    setProgress(ui.descProg, dScore.score, dScore.variant);

    ui.titleTips.innerHTML = '';
    ui.descTips.innerHTML = '';

    if (tLen === 0) ui.titleTips.innerHTML += '<li>Vul een paginatitel in.</li>';
    if (tLen < 50) ui.titleTips.innerHTML += '<li>Titel is vrij kort; mik op ongeveer 50-60 tekens.</li>';
    if (tLen > 60) ui.titleTips.innerHTML += '<li>Titel kan te lang zijn (inclusief bedrijfsnaam); deze kan worden afgekapt in zoekresultaten.</li>';

    if (dLen === 0) ui.descTips.innerHTML += '<li>Vul een metabeschrijving in.</li>';
    if (dLen < 140) ui.descTips.innerHTML += '<li>Beschrijving is te kort; mik op 140-160 tekens.</li>';
    if (dLen > 160) ui.descTips.innerHTML += '<li>Beschrijving kan te lang zijn; zet de kernboodschap vooraan.</li>';

    const aliasHasKw = kw && alias.includes(kw);
    const titleBeginsKw = kw && lower(fullTitle).startsWith(kw);
    setBadge(ui.aliasCheck, !!aliasHasKw);
    setBadge(ui.titleBeginCheck, !!titleBeginsKw);

    if (kw) {
      if (!lower(fullTitle).includes(kw)) ui.titleTips.innerHTML += '<li>Neem het focuszoekwoord op in de titel.</li>';
      if (!lower(desc).includes(kw)) ui.descTips.innerHTML += '<li>Neem het focuszoekwoord op in de beschrijving.</li>';
    }

    const r = readability(desc);
    setProgress(ui.readProg, r.score, r.variant);
    ui.readScore.textContent = `${r.score}/100`;
    ui.readTips.innerHTML = r.tips.map((t) => `<li>${t}</li>`).join('');

    const weights = { title: 0.4, desc: 0.4, read: 0.2 };
    let overall = tScore.score * weights.title + dScore.score * weights.desc + r.score * weights.read;
    if (aliasHasKw) overall += 4;
    if (titleBeginsKw) overall += 6;
    overall = Math.max(0, Math.min(100, Math.round(overall)));

    ui.scoreBadge.className = 'badge px-3 py-2';
    let variant = 'secondary';
    if (overall >= 80) variant = 'success';
    else if (overall >= 60) variant = 'warning';
    else variant = 'danger';
    ui.scoreBadge.classList.add('text-bg-' + variant);
    ui.scoreBadge.innerHTML = `<i class="fa-solid fa-gauge-high me-1"></i> SEO-score: ${overall}/100`;
  }

  ['input', 'change', 'keyup'].forEach((evt) => {
    titleEl.addEventListener(evt, analyze);
    descEl.addEventListener(evt, analyze);
    if (kwEl) kwEl.addEventListener(evt, analyze);
  });

  window.addEventListener('load', () => setTimeout(analyze, 400));
})();
