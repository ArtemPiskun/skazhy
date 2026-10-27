/* «Скажи» – застосунок альтернативної комунікації (АДК). Без сервера, усе зберігається локально. */
(() => {
  'use strict';

  const LS_KEY = 'skazhy.v1';
  const LOG_KEY = 'skazhy.log.v1';
  const DEFAULT_PIN = '1234';
  const CATS = { needs: 'Потреби', rewards: 'Заохочення', actions: 'Дії', mine: 'Мої картки' };

  // Базовий набір (затверджено логопедом). say – форма після «Я хочу».
  const BASE_CARDS = [
    { id: 'eat',     label: 'Їсти',     say: 'їсти',        cat: 'needs',   icon: 'icons/eat.svg' },
    { id: 'drink',   label: 'Пити',     say: 'пити',        cat: 'needs',   icon: 'icons/drink.svg' },
    { id: 'toilet',  label: 'Туалет',   say: 'в туалет',    cat: 'needs',   icon: 'icons/toilet.svg' },
    { id: 'sleep',   label: 'Спати',    say: 'спати',       cat: 'needs',   icon: 'icons/sleep.svg' },
    { id: 'ball',    label: "М'ячик",   say: "м'ячик",      cat: 'rewards', icon: 'icons/ball.svg' },
    { id: 'car',     label: 'Машинка',  say: 'машинку',     cat: 'rewards', icon: 'icons/car.svg' },
    { id: 'bubbles', label: 'Бульбашки',say: 'бульбашки',   cat: 'rewards', icon: 'icons/bubbles.svg' },
    { id: 'candy',   label: 'Цукерка',  say: 'цукерку',     cat: 'rewards', icon: 'icons/candy.svg' },
    { id: 'play',    label: 'Гратися',  say: 'гратися',     cat: 'actions', icon: 'icons/play.svg' },
    { id: 'walk',    label: 'Гуляти',   say: 'гуляти',      cat: 'actions', icon: 'icons/walk.svg' },
  ];
  const FIXED = [
    { id: 'yes',  label: 'Так',  say: 'Так',  cls: 'yes',  icon: 'icons/yes.svg' },
    { id: 'no',   label: 'Ні',   say: 'Ні',   cls: 'no',   icon: 'icons/no.svg' },
    { id: 'stop', label: 'Стоп', say: 'Стоп', cls: 'stop', icon: 'icons/stop.svg' },
  ];
  const IWANT = { id: 'iwant', label: 'Я хочу', say: 'Я хочу', cat: 'social', icon: 'icons/iwant.svg' };

  const defaultState = () => ({
    level: 1,
    speakOnTap: true,
    fixedOnL2: true,
    size: 'm',
    rate: 0.95,
    pin: DEFAULT_PIN,
    order: BASE_CARDS.map(c => c.id),
    hidden: [],
    custom: [],          // { id, label, say, cat, photo }
    activeTab: 'all',
  });

  let S = load();
  let strip = [];        // картки у смужці (рівні 2–3)
  const $ = sel => document.querySelector(sel);

  // ---------- збереження ----------
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const s = Object.assign(defaultState(), JSON.parse(raw));
      // додати нові базові картки, яких ще немає в порядку
      for (const c of BASE_CARDS) if (!s.order.includes(c.id)) s.order.push(c.id);
      return s;
    } catch { return defaultState(); }
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { console.warn(e); } }

  function allCards() {
    const map = new Map();
    for (const c of BASE_CARDS) map.set(c.id, c);
    for (const c of S.custom) map.set(c.id, { ...c, icon: c.photo, photo: true });
    const ordered = S.order.filter(id => map.has(id)).map(id => map.get(id));
    for (const [id, c] of map) if (!S.order.includes(id)) { ordered.push(c); S.order.push(id); }
    return ordered;
  }
  const visibleCards = () => allCards().filter(c => !S.hidden.includes(c.id));

  // ---------- журнал (для моніторингу) ----------
  function log(type, id, text) {
    try {
      const arr = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      arr.push({ t: Date.now(), type, id, text, l: S.level });
      if (arr.length > 5000) arr.splice(0, arr.length - 5000);
      localStorage.setItem(LOG_KEY, JSON.stringify(arr));
    } catch (e) { console.warn(e); }
  }
  const readLog = () => { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } };

  // ---------- озвучення ----------
  const native = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) || null;
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^uk/i.test(v.lang) && /google|natural|online/i.test(v.name)) || vs.find(v => /^uk/i.test(v.lang)) || null;
    const info = $('#voiceInfo');
    if (info) info.textContent = native() ? 'Озвучення: системний синтезатор Android (uk-UA).'
      : voice ? `Голос: ${voice.name} (${voice.lang})` : 'Українського голосу в браузері не знайдено – буде використано голос за замовчуванням.';
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  async function speak(text) {
    if (!text) return;
    try {
      const tts = native();
      if (tts) {
        try { await tts.stop(); } catch {}
        await tts.speak({ text, lang: 'uk-UA', rate: S.rate, pitch: 1.0, volume: 1.0, category: 'playback' });
        return;
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'uk-UA'; u.rate = S.rate; if (voice) u.voice = voice;
        speechSynthesis.speak(u);
      }
    } catch (e) { console.warn('TTS', e); }
  }
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(25); } catch {} };

  // ---------- рендер ----------
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function sentence() {
    if (!strip.length) return '';
    const words = strip.map(c => c.say);
    return S.level >= 2 ? cap(['Я хочу', ...words].join(' ')) : words.join(' ');
  }

  function render() {
    document.body.dataset.level = S.level;
    document.body.dataset.size = S.size;
    $('#levelBadge').textContent = `Рівень ${S.level}`;

    // смужка
    const stripEl = $('#strip');
    stripEl.hidden = S.level === 1;
    if (S.level >= 2) {
      const wrap = $('#stripCards');
      wrap.innerHTML = '';
      wrap.appendChild(chip(IWANT, 'social'));
      strip.forEach(c => wrap.appendChild(chip(c, c.cat)));
      wrap.scrollLeft = wrap.scrollWidth;
    }

    // категорії
    const tabs = $('#tabs');
    tabs.hidden = S.level !== 3;
    if (S.level === 3) {
      const cats = ['all', ...Object.keys(CATS).filter(k => visibleCards().some(c => c.cat === k))];
      if (!cats.includes(S.activeTab)) S.activeTab = 'all';
      tabs.innerHTML = '';
      for (const k of cats) {
        const b = document.createElement('button');
        b.textContent = k === 'all' ? 'Усі' : CATS[k];
        b.classList.toggle('active', S.activeTab === k);
        b.onclick = () => { S.activeTab = k; save(); render(); };
        tabs.appendChild(b);
      }
    }

    // сітка
    const grid = $('#grid');
    grid.innerHTML = '';
    let cards = visibleCards();
    if (S.level === 3 && S.activeTab !== 'all') cards = cards.filter(c => c.cat === S.activeTab);
    if (!cards.length) {
      const e = document.createElement('div'); e.className = 'empty';
      e.textContent = 'Немає увімкнених карток. Утримуйте шестірню, щоб увімкнути.';
      grid.appendChild(e);
    }
    for (const c of cards) {
      const el = document.createElement('button');
      el.className = 'card' + (c.photo ? ' photo' : '');
      el.dataset.cat = c.cat; el.dataset.id = c.id;
      el.innerHTML = `<img src="${c.icon}" alt="" draggable="false"><span${c.label.length > 8 ? ' class="long"' : ''}>${esc(c.label)}</span>`;
      el.onclick = () => onCard(c, el);
      grid.appendChild(el);
    }

    // постійні кнопки
    const fixed = $('#fixed');
    const showFixed = S.level === 3 || (S.level === 2 && S.fixedOnL2);
    fixed.hidden = !showFixed;
    if (showFixed && !fixed.childElementCount) {
      for (const f of FIXED) {
        const b = document.createElement('button');
        b.className = 'fixed-btn ' + f.cls;
        b.innerHTML = `<img src="${f.icon}" alt=""><span>${f.label}</span>`;
        b.onclick = () => { buzz(); speak(f.say); log('fixed', f.id, f.say); };
        fixed.appendChild(b);
      }
    }
  }
  function chip(c, cat) {
    const d = document.createElement('div');
    d.className = 'chip' + (c.photo ? ' photo' : '');
    d.style.setProperty('--chip', `var(--${cat})`); d.style.setProperty('--chip-b', `var(--${cat}-b)`);
    d.innerHTML = `<img src="${c.icon}" alt=""><span>${esc(c.label)}</span>`;
    return d;
  }
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  function onCard(c, el) {
    buzz();
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    if (S.level === 1) { speak(c.label); log('card', c.id, c.label); return; }
    const max = S.level === 2 ? 1 : 4;
    if (strip.length >= max) strip = S.level === 2 ? [] : strip.slice(1);
    strip.push(c);
    log('card', c.id, c.label);
    if (S.speakOnTap) speak(c.label);
    render();
  }
  $('#stripSay').onclick = () => {
    const text = sentence();
    if (!text) { speak('Я хочу'); return; }
    buzz(); speak(text); log('say', strip.map(c => c.id).join('+'), text);
    $('#stripSay').classList.add('flash');
    setTimeout(() => { $('#stripSay').classList.remove('flash'); if (S.level === 2) { strip = []; render(); } }, 1200);
  };
  $('#stripDel').onclick = () => { strip.pop(); render(); };

  // ---------- режим дорослого (утримання 2 с) ----------
  const gear = $('#gearBtn');
  let holdTimer = null;
  const startHold = e => { e.preventDefault(); gear.classList.add('holding'); holdTimer = setTimeout(() => { gear.classList.remove('holding'); openPin(); }, 2000); };
  const endHold = () => { gear.classList.remove('holding'); clearTimeout(holdTimer); holdTimer = null; };
  gear.addEventListener('pointerdown', startHold);
  gear.addEventListener('pointerup', endHold);
  gear.addEventListener('pointerleave', endHold);
  gear.addEventListener('pointercancel', endHold);
  gear.addEventListener('contextmenu', e => e.preventDefault());

  const pinDlg = $('#pinDlg');
  function openPin() { $('#pinInput').value = ''; $('#pinErr').hidden = true; pinDlg.showModal(); setTimeout(() => $('#pinInput').focus(), 50); }
  $('#pinCancel').onclick = () => pinDlg.close();
  $('#pinForm').onsubmit = e => {
    e.preventDefault();
    if ($('#pinInput').value === S.pin) { pinDlg.close(); openSettings(); }
    else { $('#pinErr').hidden = false; $('#pinInput').value = ''; }
  };

  // ---------- налаштування ----------
  const dlg = $('#settingsDlg');
  function openSettings() {
    document.querySelectorAll('#levelPick input').forEach(r => r.checked = Number(r.value) === S.level);
    $('#optSpeakOnTap').checked = S.speakOnTap;
    $('#optFixedL2').checked = S.fixedOnL2;
    $('#optSize').value = S.size;
    $('#optRate').value = S.rate;
    $('#optPin').value = '';
    renderCardList(); renderStats(); pickVoice();
    dlg.showModal();
  }
  $('#settingsClose').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { strip = []; render(); });
  document.querySelectorAll('.settings-tabs button').forEach(b => b.onclick = () => {
    document.querySelectorAll('.settings-tabs button').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('.settings-pane').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
  });
  $('#levelPick').addEventListener('change', e => { S.level = Number(e.target.value); strip = []; save(); render(); });
  $('#optSpeakOnTap').onchange = e => { S.speakOnTap = e.target.checked; save(); };
  $('#optFixedL2').onchange = e => { S.fixedOnL2 = e.target.checked; save(); render(); };
  $('#optSize').onchange = e => { S.size = e.target.value; save(); render(); };
  $('#optRate').onchange = e => { S.rate = Number(e.target.value); save(); };
  $('#optPin').onchange = e => { const v = e.target.value.trim(); if (/^\d{4,6}$/.test(v)) { S.pin = v; save(); e.target.placeholder = 'збережено'; } e.target.value = ''; };
  $('#testVoice').onclick = () => speak('Привіт! Я хочу гратися.');
  $('#resetAll').onclick = () => {
    if (confirm('Видалити всі налаштування, власні картки і статистику?')) {
      localStorage.removeItem(LS_KEY); localStorage.removeItem(LOG_KEY); S = defaultState(); strip = []; dlg.close(); render();
    }
  };

  function renderCardList() {
    const list = $('#cardList'); list.innerHTML = '';
    const cards = allCards();
    cards.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'card-row' + (S.hidden.includes(c.id) ? ' off' : '');
      row.innerHTML = `<img src="${c.icon}" alt=""><div><div class="name">${esc(c.label)}</div><div class="cat">${CATS[c.cat] || c.cat} · «Я хочу ${esc(c.say)}»</div></div>
        <div class="ctl">
          <input type="checkbox" ${S.hidden.includes(c.id) ? '' : 'checked'} aria-label="Показувати" title="Показувати">
          <button data-act="up" title="Вище" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button data-act="down" title="Нижче" ${i === cards.length - 1 ? 'disabled' : ''}>↓</button>
          ${c.photo ? '<button data-act="del" title="Видалити">🗑</button>' : ''}
        </div>`;
      row.querySelector('input').onchange = e => {
        S.hidden = e.target.checked ? S.hidden.filter(x => x !== c.id) : [...S.hidden, c.id];
        save(); row.classList.toggle('off', !e.target.checked); render();
      };
      row.querySelectorAll('button').forEach(b => b.onclick = () => {
        const idx = S.order.indexOf(c.id);
        if (b.dataset.act === 'up' && idx > 0) [S.order[idx - 1], S.order[idx]] = [S.order[idx], S.order[idx - 1]];
        if (b.dataset.act === 'down' && idx < S.order.length - 1) [S.order[idx + 1], S.order[idx]] = [S.order[idx], S.order[idx + 1]];
        if (b.dataset.act === 'del' && confirm(`Видалити картку «${c.label}»?`)) {
          S.custom = S.custom.filter(x => x.id !== c.id); S.order = S.order.filter(x => x !== c.id); S.hidden = S.hidden.filter(x => x !== c.id);
        }
        save(); renderCardList(); render();
      });
      list.appendChild(row);
    });
  }

  let pendingPhoto = null;
  const onPick = e => { pendingPhoto = e.target.files[0] || null; $('#photoName').textContent = pendingPhoto ? 'фото обрано ✓' : 'фото не обрано'; };
  $('#newPhoto').onchange = onPick; $('#newPhotoCam').onchange = onPick;
  $('#btnCamera').onclick = () => $('#newPhotoCam').click();
  $('#btnGallery').onclick = () => $('#newPhoto').click();
  $('#addCardForm').onsubmit = async e => {
    e.preventDefault();
    const label = $('#newLabel').value.trim();
    const say = $('#newSay').value.trim() || label.toLowerCase();
    const cat = $('#newCat').value;
    const file = pendingPhoto;
    if (!label) return;
    let photo = null;
    if (file) { try { photo = await shrink(file, 360); } catch (err) { alert('Не вдалося обробити фото: ' + err.message); return; } }
    if (!photo) photo = placeholder(label);
    const id = 'c_' + Date.now().toString(36);
    S.custom.push({ id, label, say, cat, photo });
    S.order.push(id); save();
    e.target.reset(); pendingPhoto = null; $('#photoName').textContent = 'фото не обрано'; renderCardList(); render();
  };
  function shrink(file, max) {
    return new Promise((res, rej) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * k), h = Math.round(img.height * k);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => rej(new Error('формат не підтримується')); img.src = url;
    });
  }
  function placeholder(label) {
    const letter = label.trim().charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#efe3ff"/><text x="50" y="66" text-anchor="middle" font-family="Arial" font-size="52" font-weight="700" fill="#5f3dc4">${esc(letter)}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ---------- статистика ----------
  function renderStats() {
    const range = $('#statsRange').value;
    const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from = 0;
    if (range === 'today') from = start.getTime();
    else if (range !== 'all') from = start.getTime() - (Number(range) - 1) * 86400000;
    const rows = readLog().filter(r => r.t >= from);
    const names = new Map([...BASE_CARDS, ...S.custom, ...FIXED].map(c => [c.id, c.label]));
    const byCard = new Map(), byDay = new Map();
    for (const r of rows) {
      if (r.type === 'say') continue;
      byCard.set(r.id, (byCard.get(r.id) || 0) + 1);
      const d = new Date(r.t).toLocaleDateString('uk-UA'); byDay.set(d, (byDay.get(d) || 0) + 1);
    }
    const says = rows.filter(r => r.type === 'say').length;
    const max = Math.max(1, ...byCard.values());
    const body = $('#statsBody');
    if (!rows.length) { body.innerHTML = '<p class="muted">Записів за цей період немає.</p>'; return; }
    const cardRows = [...byCard.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) =>
      `<tr><td>${esc(names.get(id) || id)}</td><td class="n">${n}</td><td style="width:40%"><div class="bar" style="width:${Math.round(n / max * 100)}%"></div></td></tr>`).join('');
    const dayRows = [...byDay.entries()].map(([d, n]) => `<tr><td>${d}</td><td class="n">${n}</td><td></td></tr>`).join('');
    body.innerHTML = `<p class="muted">Натискань карток: <b>${rows.length - says}</b>, речень озвучено («Сказати»): <b>${says}</b>.</p>
      <table class="stats"><thead><tr><th>Картка</th><th class="n">Разів</th><th></th></tr></thead><tbody>${cardRows}</tbody></table>
      <h3>За днями</h3><table class="stats"><tbody>${dayRows}</tbody></table>`;
  }
  $('#statsRange').onchange = renderStats;
  $('#statsExport').onclick = async () => {
    const rows = readLog();
    const csv = ['дата;час;тип;картка;текст;рівень', ...rows.map(r => {
      const d = new Date(r.t);
      return [d.toLocaleDateString('uk-UA'), d.toLocaleTimeString('uk-UA'), r.type, r.id, '"' + String(r.text || '').replace(/"/g, '""') + '"', r.l].join(';');
    })].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const file = new File([blob], 'skazhy-log.csv', { type: 'text/csv' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Журнал «Скажи»' }); return; }
    } catch {}
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'skazhy-log.csv'; a.click();
  };

  // ---------- старт ----------
  if ('serviceWorker' in navigator && !window.Capacitor && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  render();
  // Для тестів
  window.__skazhy = { get state() { return S; }, get strip() { return strip; }, speak, readLog };
})();
