(function () {
  const $ = (sel) => document.querySelector(sel);
  const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();
  const lower = (s) => stripHtml(s).toLowerCase();

  const titleEl = $('#page_title');
  const descEl  = $('#page_description');
  const aliasEl = $('#page_alias');
  const kwEl    = $('#focus_keyword');
  // IMPORTANT: get by exact id
  const computedTitleEl = document.getElementById('seo_title_computed');

  if (!titleEl || !descEl) return;

  const ui = {
    titleLen: $('#title-length'),
    descLen:  $('#desc-length'),
    titleProg: $('#title-progress'),
    descProg:  $('#desc-progress'),
    titleTips: $('#title-tips'),
    descTips:  $('#desc-tips'),
    aliasCheck: $('#alias-check'),
    titleBeginCheck: $('#title-begin-check'),
    readScore: $('#readability-score'),
    readProg:  $('#readability-progress'),
    readTips:  $('#readability-tips'),
    scoreBadge: $('#seo-score-badge'),
  };

  function setProgress(bar, pct, variant) {
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    bar.className = 'progress-bar';
    if (variant) bar.classList.add('bg-' + variant);
  }
  function setBadge(el, ok) {
    el.className = 'badge';
    el.classList.add(ok ? 'text-bg-success' : 'text-bg-secondary');
    el.textContent = ok ? 'OK' : '—';
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
    const sentences = text.split(/[.!?]+/).map(t => t.trim()).filter(Boolean);
    const words = text.split(/\s+/).filter(Boolean);
    const avgLen = sentences.length ? (words.length / sentences.length) : words.length;
    let score;
    if (avgLen === 0) score = 0;
    else if (avgLen < 8) score = 60;
    else if (avgLen <= 20) score = 95;
    else if (avgLen <= 30) score = 70;
    else score = 45;
    const tips = [];
    if (avgLen < 12) tips.push('Sentences are very short; consider adding more context.');
    if (avgLen > 20) tips.push('Sentences are quite long; consider splitting long sentences.');
    if (words.length < 40) tips.push('Consider adding more context (at least 40+ words).');
    return { score, variant: score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger', tips, avgLen, words: words.length };
  }

  function analyze() {
    // Build computed title
    const rawTitle = stripHtml(titleEl.value);
    const company  = titleEl.dataset.company || '';
    const fullTitle = company ? `${rawTitle} | ${company}` : rawTitle;

    // Write into the readonly field (value + attribute for safety)
    if (computedTitleEl) {
      computedTitleEl.value = fullTitle;
      computedTitleEl.setAttribute('value', fullTitle);
    }

    const desc  = stripHtml(descEl.value);
    const alias = (aliasEl?.dataset?.seoAlias || '').toLowerCase().replace(/\s+/g, '-');
    const kw    = lower(kwEl?.value || '');

    const tLen = fullTitle.length;
    const dLen = desc.length;

    const tScore = scoreLength(tLen, 35, 65, 70);
    const dScore = scoreLength(dLen, 120, 170, 200);

    ui.titleLen.textContent = `${tLen} characters (incl. company name)`;
    ui.descLen.textContent  = `${dLen} characters`;

    setProgress(ui.titleProg, tScore.score, tScore.variant);
    setProgress(ui.descProg,  dScore.score, dScore.variant);

    ui.titleTips.innerHTML = '';
    ui.descTips.innerHTML  = '';

    if (tLen === 0) ui.titleTips.innerHTML += `<li>Enter a page title.</li>`;
    if (tLen < 50) ui.titleTips.innerHTML += `<li>Title is quite short; aim for around 50–60 characters.</li>`;
    if (tLen > 60) ui.titleTips.innerHTML += `<li>Title might be too long (including company name); it could be truncated in SERPs.</li>`;

    if (dLen === 0) ui.descTips.innerHTML += `<li>Enter a meta description.</li>`;
    if (dLen < 140) ui.descTips.innerHTML += `<li>Description is too short; aim for 140–160 characters.</li>`;
    if (dLen > 160) ui.descTips.innerHTML += `<li>Description may be too long; put the key message first.</li>`;

    const aliasHasKw = kw && alias.includes(kw);
    const titleBeginsKw = kw && lower(fullTitle).startsWith(kw);
    setBadge(ui.aliasCheck, !!aliasHasKw);
    setBadge(ui.titleBeginCheck, !!titleBeginsKw);

    if (kw) {
      if (!lower(fullTitle).includes(kw)) ui.titleTips.innerHTML += `<li>Include the focus keyword in the title.</li>`;
      if (!lower(desc).includes(kw))      ui.descTips.innerHTML  += `<li>Include the focus keyword in the description.</li>`;
    }

    const r = readability(desc);
    setProgress(ui.readProg, r.score, r.variant);
    ui.readScore.textContent = `${r.score}/100`;
    ui.readTips.innerHTML = r.tips.map(t => `<li>${t}</li>`).join('');

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
    ui.scoreBadge.innerHTML = `<i class="fa-solid fa-gauge-high me-1"></i> SEO Score: ${overall}/100`;
  }

  // Re-analyze on changes (CKEditor may initialize async; one delayed analyze too)
  ['input', 'change', 'keyup'].forEach(evt => {
    titleEl.addEventListener(evt, analyze);
    descEl.addEventListener(evt, analyze);
    kwEl && kwEl.addEventListener(evt, analyze);
  });
  window.addEventListener('load', () => setTimeout(analyze, 400));
})();
