/* «Скажи» – застосунок альтернативної комунікації (АДК). Без сервера, усе зберігається локально. */
(() => {
  'use strict';

  const LS_KEY = 'skazhy.v2';
  const LOG_KEY = 'skazhy.log.v1';
  const DEFAULT_PIN = '1234';

  // Базовий набір. parent: null = верхній рівень; 'eat'|'drink'|'toys' = усередині категорії.
  // say – форма після «Я хочу». kind 'cat' – категорія (у речення не входить, відкриває свої картки).
  const BASE = [
    { id: 'eat',        label: 'Їсти',     say: 'їсти',          kind: 'cat', parent: null, img: 'photos/eat.jpg' },
    { id: 'drink',      label: 'Пити',     say: 'пити',          kind: 'cat', parent: null, img: 'photos/drink.jpg' },
    { id: 'toys',       label: 'Іграшки',  say: 'гратися',       kind: 'cat', parent: null, img: 'photos/toys.jpg' },
    { id: 'toilet',     label: 'Туалет',   say: 'в туалет',      parent: null, img: 'photos/toilet.jpg' },
    { id: 'walk',       label: 'Гуляти',   say: 'гуляти',        parent: null, img: 'photos/walk.jpg' },
    { id: 'swing',      label: 'Гойдалка', say: 'на гойдалку',   parent: null, img: 'photos/swing.jpg' },
    { id: 'draw',       label: 'Малювати', say: 'малювати',      parent: null, img: 'photos/draw.jpg' },
    { id: 'plasticine', label: 'Ліпити',   say: 'ліпити',        parent: null, img: 'photos/plasticine.jpg' },
    { id: 'bubbles',    label: 'Дути',     say: 'дути бульбашки',parent: null, img: 'photos/bubbles.jpg' },
    { id: 'cartoon',    label: 'Мультик',  say: 'мультик',       parent: null, img: 'photos/cartoon.jpg' },
    { id: 'break',      label: 'Перерва',  say: 'перерву',       parent: null, img: 'photos/break.jpg' },
    { id: 'sleep',      label: 'Спати',    say: 'спати',         parent: null, img: 'photos/sleep.jpg' },
    { id: 'bath',       label: 'Купатися', say: 'купатися',      parent: null, img: 'photos/bath.jpg' },
    // їсти
    { id: 'kasha',      label: 'Каша',     say: 'кашу',      parent: 'eat', img: 'photos/kasha.jpg' },
    { id: 'grechka',    label: 'Гречка',   say: 'гречку',    parent: 'eat', img: 'photos/grechka.jpg' },
    { id: 'makarony',   label: 'Макарони', say: 'макарони',  parent: 'eat', img: 'photos/makarony.jpg' },
    { id: 'plov',       label: 'Плов',     say: 'плов',      parent: 'eat', img: 'photos/plov.jpg' },
    { id: 'syr',        label: 'Сир',      say: 'сир',       parent: 'eat', img: 'photos/syr.jpg' },
    { id: 'solomka',    label: 'Соломка',  say: 'соломку',   parent: 'eat', img: 'photos/solomka.jpg' },
    { id: 'pizza',      label: 'Піца',     say: 'піцу',      parent: 'eat', img: 'photos/pizza.jpg' },
    { id: 'apple',      label: 'Яблуко',   say: 'яблуко',    parent: 'eat', img: 'photos/apple.jpg' },
    { id: 'candy',      label: 'Цукерка',  say: 'цукерку',   parent: 'eat', img: 'photos/candy.jpg' },
    // пити
    { id: 'water',      label: 'Вода',     say: 'води',      parent: 'drink', img: 'photos/water.jpg' },
    { id: 'juice',      label: 'Сік',      say: 'соку',      parent: 'drink', img: 'photos/juice.jpg' },
    { id: 'tea',        label: 'Чай',      say: 'чаю',       parent: 'drink', img: 'photos/tea.jpg' },
    // іграшки
    { id: 'ball',       label: "М'яч",     say: "м'яч",      parent: 'toys', img: 'photos/ball.jpg' },
    { id: 'car',        label: 'Машина',   say: 'машину',    parent: 'toys', img: 'photos/car.jpg' },
    { id: 'sorter',     label: 'Сортер',   say: 'сортер',    parent: 'toys', img: 'photos/sorter.jpg' },
  ];
  const FIXED = [
    { id: 'yes',  label: 'Так',  say: 'Так',  cls: 'yes',  img: 'icons/yes.svg' },
    { id: 'no',   label: 'Ні',   say: 'Ні',   cls: 'no',   img: 'icons/no.svg' },
    { id: 'stop', label: 'Стоп', say: 'Стоп', cls: 'stop', img: 'photos/stop.jpg' },
  ];
  const IWANT = { id: 'iwant', label: 'Я хочу', say: 'Я хочу', img: 'icons/iwant.svg' };
  const PARENTS = { '': 'Верхній рівень', eat: 'Їсти', drink: 'Пити', toys: 'Іграшки' };

  const defaultState = () => ({
    level: 1, speakOnTap: true, fixedOnL2: true, size: 'm', rate: 0.95, pin: DEFAULT_PIN,
    order: BASE.map(c => c.id), hidden: [], custom: [], photos: {},
  });

  let S = load();
  let strip = [];            // вибрані картки (рівні 2–3)
  let iwant = false;         // чи натиснуто «Я хочу» (рівні 2–3)
  let openCat = null;        // відкрита категорія (рівень 3)
  const $ = sel => document.querySelector(sel);

  // ---------- збереження ----------
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      const s = Object.assign(defaultState(), JSON.parse(raw));
      for (const c of BASE) if (!s.order.includes(c.id)) s.order.push(c.id);
      return s;
    } catch { return defaultState(); }
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { console.warn(e); } }

  function allCards() {
    const map = new Map();
    for (const c of BASE) map.set(c.id, { ...c });
    for (const c of S.custom) map.set(c.id, { ...c, kind: 'item' });
    for (const [id, c] of map) if (S.photos[id]) { c.img = S.photos[id]; c.photo = true; }
    const ordered = S.order.filter(id => map.has(id)).map(id => map.get(id));
    for (const [id, c] of map) if (!S.order.includes(id)) { ordered.push(c); S.order.push(id); }
    return ordered;
  }
  const visible = () => allCards().filter(c => !S.hidden.includes(c.id));
  const topLevel = () => visible().filter(c => !c.parent);
  const children = id => visible().filter(c => c.parent === id);

  // ---------- журнал ----------
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
    if (info) info.textContent = 'Основні картки озвучує записаний голос (Артем). Для власних карток: ' + (native() ? 'системний синтезатор Android (uk-UA).'
      : voice ? `${voice.name} (${voice.lang}).` : 'голос браузера за замовчуванням.');
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  // --- записані кліпи (голос Артема, ElevenLabs): audio/<id>_l | _w | _a, iwant, yes, no, stop ---
  const CLIP_IDS = new Set(BASE.map(c => c.id));
  const clipFor = (c, kind) => (c && CLIP_IDS.has(c.id)) ? `${c.id}_${kind}` : null;
  let actx = null; const clipCache = new Map(); let playing = [];
  function audioCtx() {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx = new AC(); }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }
  // розблокувати аудіо на iOS першим дотиком
  document.addEventListener('touchend', () => audioCtx(), { once: true, passive: true });
  document.addEventListener('pointerdown', () => audioCtx(), { once: true, passive: true });
  async function loadClip(id) {
    if (clipCache.has(id)) return clipCache.get(id);
    const p = (async () => {
      const ctx = audioCtx(); if (!ctx) throw new Error('no AudioContext');
      const r = await fetch(`audio/${id}.mp3`); if (!r.ok) throw new Error('no clip ' + id);
      return await ctx.decodeAudioData(await r.arrayBuffer());
    })();
    clipCache.set(id, p); p.catch(() => clipCache.delete(id));
    return p;
  }
  function stopClips() { for (const s of playing) { try { s.stop(); } catch {} } playing = []; }
  async function playClips(ids, fallbackText) {
    if (!ids.length || ids.some(x => !x)) return speak(fallbackText);
    try {
      const ctx = audioCtx(); if (!ctx) throw new Error('no AudioContext');
      const bufs = await Promise.all(ids.map(loadClip));
      stopClips(); try { speechSynthesis.cancel(); } catch {}
      let t = ctx.currentTime + 0.02; const rate = Math.min(1.3, Math.max(0.7, S.rate || 1));
      bufs.forEach((b, i) => {
        const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; s.connect(ctx.destination);
        s.start(t); playing.push(s); t += b.duration / rate + (i < bufs.length - 1 ? 0.12 : 0);
      });
    } catch (e) { console.warn('clips', e); speak(fallbackText); }
  }
  // озвучити одну картку (напис)
  const sayCard = c => playClips([clipFor(c, 'l')], c.label);
  // озвучити речення «Я хочу …» зі смужки
  function saySentence() {
    if (!strip.length) return playClips(['iwant'], 'Я хочу');
    return playClips(strip.map((c, i) => clipFor(c, i ? 'a' : 'w')), sentence());
  }
  // попередньо прогріти найчастіші кліпи
  setTimeout(() => { ['iwant', 'yes', 'no', 'stop'].forEach(id => loadClip(id).catch(() => {})); }, 1500);

  async function speak(text) {
    if (!text) return;
    stopClips();
    try {
      const tts = native();
      if (tts) { try { await tts.stop(); } catch {} await tts.speak({ text, lang: 'uk-UA', rate: S.rate, pitch: 1.0, volume: 1.0, category: 'playback' }); return; }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text); u.lang = 'uk-UA'; u.rate = S.rate; if (voice) u.voice = voice;
        speechSynthesis.speak(u);
      }
    } catch (e) { console.warn('TTS', e); }
  }
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(25); } catch {} };
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const MAX = () => (S.level === 2 ? 1 : 4);

  function sentence() {
    if (S.level === 1) return strip.length ? strip[0].label : '';
    if (!strip.length) return 'Я хочу';
    const w = strip.map(c => c.say);
    const tail = w.length > 1 ? w.slice(0, -1).join(', ') + ' і ' + w[w.length - 1] : w[0];
    return cap('Я хочу ' + tail);
  }
  function resetTurn() { strip = []; iwant = false; openCat = null; }

  // ---------- рендер ----------
  function cardEl(c, cls = '') {
    const el = document.createElement('button');
    el.className = 'card ' + cls + (c.kind === 'cat' ? ' cat' : '');
    el.dataset.id = c.id;
    el.innerHTML = `<span${c.label.length > 8 ? ' class="long"' : ''}>${esc(c.label)}</span><img src="${c.img}" alt="" draggable="false">${c.kind === 'cat' ? '<i class="more">▸</i>' : ''}`;
    return el;
  }
  function chip(c, social) {
    const d = document.createElement('div');
    d.className = 'chip' + (social ? ' social' : '');
    d.innerHTML = `<img src="${c.img}" alt=""><span>${esc(c.label)}</span>`;
    return d;
  }

  function render() {
    document.body.dataset.level = S.level;
    document.body.dataset.size = S.size;
    $('#levelBadge').textContent = `Рівень ${S.level}`;
    const grid = $('#grid'); grid.innerHTML = ''; grid.className = 'grid';
    const stripEl = $('#strip'); stripEl.hidden = false;

    if (S.level === 1) {
      const wrap = $('#stripCards'); wrap.innerHTML = '';
      strip.forEach(c => wrap.appendChild(chip(c)));
      $('#stripHint').textContent = strip.length ? 'Натисни «Сказати», щоб повторити' : 'Натисни картку';
    } else {
      const wrap = $('#stripCards'); wrap.innerHTML = '';
      if (iwant) wrap.appendChild(chip(IWANT, true));
      strip.forEach((c, i) => { const ch = chip(c); ch.title = 'Прибрати'; ch.onclick = () => { strip.splice(i, 1); render(); }; wrap.appendChild(ch); });
      wrap.scrollLeft = wrap.scrollWidth;
      $('#stripHint').textContent = !iwant ? 'Натисни «Я хочу»' : strip.length ? `${strip.length} з ${MAX()} · торкнися картки в смужці, щоб прибрати` : (openCat ? 'Обери, що саме' : 'Обери картку');
    }

    // Рівень 1: усі картки верхнього рівня, тап = озвучити
    if (S.level === 1) {
      const list = topLevel();
      if (!list.length) grid.innerHTML = '<div class="empty">Немає увімкнених карток. Утримуйте шестірню, щоб увімкнути.</div>';
      for (const c of list) { const el = cardEl(c); el.classList.remove('cat'); el.querySelector('.more')?.remove(); el.onclick = () => { buzz(); flash(el); strip = [c]; sayCard(c); log('card', c.id, c.label); render(); }; grid.appendChild(el); }
    }
    // Рівні 2–3: спочатку одна велика картка «Я хочу»
    else if (!iwant) {
      grid.classList.add('single');
      const el = cardEl(IWANT, 'iwant'); el.classList.remove('cat');
      el.onclick = () => { buzz(); iwant = true; playClips(['iwant'], 'Я хочу'); log('card', 'iwant', 'Я хочу'); render(); };
      grid.appendChild(el);
    }
    // Рівень 2: плоский список
    else if (S.level === 2) {
      for (const c of topLevel()) { const el = cardEl(c); el.classList.remove('cat'); el.querySelector('.more')?.remove(); el.onclick = () => pick(c, el); grid.appendChild(el); }
    }
    // Рівень 3: категорії → картки категорії
    else if (openCat) {
      const back = document.createElement('button'); back.className = 'back'; back.innerHTML = `‹ Назад`;
      back.onclick = () => { openCat = null; render(); };
      const title = document.createElement('div'); title.className = 'cat-title'; title.textContent = openCat.label;
      const head = document.createElement('div'); head.className = 'cat-head'; head.append(back, title); grid.appendChild(head);
      const items = children(openCat.id);
      if (!items.length) grid.insertAdjacentHTML('beforeend', '<div class="empty">У цій категорії немає увімкнених карток.</div>');
      for (const c of items) { const el = cardEl(c); el.onclick = () => pick(c, el); grid.appendChild(el); }
    } else {
      for (const c of topLevel()) {
        const el = cardEl(c);
        if (c.kind === 'cat') el.onclick = () => { buzz(); flash(el); if (S.speakOnTap) sayCard(c); openCat = c; render(); };
        else el.onclick = () => pick(c, el);
        grid.appendChild(el);
      }
    }

    // постійні кнопки
    const fixed = $('#fixed'), row = $('#fixedRow');
    const showFixed = S.level === 3 || (S.level === 2 && S.fixedOnL2);
    fixed.hidden = !showFixed;
    if (showFixed && !row.childElementCount) for (const f of FIXED) {
      const b = document.createElement('button'); b.className = 'fixed-btn ' + f.cls;
      b.innerHTML = `<img src="${f.img}" alt=""><span>${f.label}</span>`;
      b.onclick = () => { buzz(); playClips([f.id], f.say); log('fixed', f.id, f.say); };
      row.appendChild(b);
    }
  }
  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  function pick(c, el) {
    buzz(); flash(el);
    if (strip.length >= MAX()) strip = S.level === 2 ? [] : strip.slice(1);
    strip.push(c); openCat = null;
    log('card', c.id, c.label);
    if (S.speakOnTap) sayCard(c);
    render();
  }
  $('#stripSay').onclick = () => {
    if (S.level === 1) { const t = sentence(); if (t) { buzz(); sayCard(strip[0]); log('say', strip[0].id, t); } return; }
    if (!iwant) { playClips(['iwant'], 'Я хочу'); return; }
    const text = sentence(); buzz(); saySentence(); log('say', strip.map(c => c.id).join('+'), text);
    $('#stripSay').classList.add('flash');
    setTimeout(() => { $('#stripSay').classList.remove('flash'); resetTurn(); render(); }, 1500);
  };
  $('#stripDel').onclick = () => { if (strip.length) strip.pop(); else if (openCat) openCat = null; else iwant = false; render(); };

  // ---------- режим дорослого ----------
  const gear = $('#gearBtn'); let holdTimer = null;
  const startHold = e => { e.preventDefault(); gear.classList.add('holding'); holdTimer = setTimeout(() => { gear.classList.remove('holding'); openPin(); }, 2000); };
  const endHold = () => { gear.classList.remove('holding'); clearTimeout(holdTimer); holdTimer = null; };
  gear.addEventListener('pointerdown', startHold); gear.addEventListener('pointerup', endHold);
  gear.addEventListener('pointerleave', endHold); gear.addEventListener('pointercancel', endHold);
  gear.addEventListener('contextmenu', e => e.preventDefault());

  const pinDlg = $('#pinDlg');
  function openPin() { $('#pinInput').value = ''; $('#pinErr').hidden = true; pinDlg.showModal(); setTimeout(() => $('#pinInput').focus(), 50); }
  $('#pinCancel').onclick = () => pinDlg.close();
  $('#pinForm').onsubmit = e => { e.preventDefault(); if ($('#pinInput').value === S.pin) { pinDlg.close(); openSettings(); } else { $('#pinErr').hidden = false; $('#pinInput').value = ''; } };

  const dlg = $('#settingsDlg');
  function openSettings() {
    document.querySelectorAll('#levelPick input').forEach(r => r.checked = Number(r.value) === S.level);
    $('#optSpeakOnTap').checked = S.speakOnTap; $('#optFixedL2').checked = S.fixedOnL2;
    $('#optSize').value = S.size; $('#optRate').value = S.rate; $('#optPin').value = '';
    renderCardList(); renderStats(); pickVoice(); dlg.showModal();
  }
  $('#settingsClose').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { resetTurn(); render(); });
  document.querySelectorAll('.settings-tabs button').forEach(b => b.onclick = () => {
    document.querySelectorAll('.settings-tabs button').forEach(x => x.classList.toggle('active', x === b));
    document.querySelectorAll('.settings-pane').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
  });
  $('#levelPick').addEventListener('change', e => { S.level = Number(e.target.value); resetTurn(); save(); render(); });
  $('#optSpeakOnTap').onchange = e => { S.speakOnTap = e.target.checked; save(); };
  $('#optFixedL2').onchange = e => { S.fixedOnL2 = e.target.checked; save(); render(); };
  $('#optSize').onchange = e => { S.size = e.target.value; save(); render(); };
  $('#optRate').onchange = e => { S.rate = Number(e.target.value); save(); };
  $('#optPin').onchange = e => { const v = e.target.value.trim(); if (/^\d{4,6}$/.test(v)) { S.pin = v; save(); e.target.placeholder = 'збережено'; } e.target.value = ''; };
  $('#testVoice').onclick = () => playClips(['toys_w'], 'Я хочу гратися.');
  $('#resetAll').onclick = () => { if (confirm('Видалити всі налаштування, власні картки, фото і статистику?')) { localStorage.removeItem(LS_KEY); localStorage.removeItem(LOG_KEY); S = defaultState(); resetTurn(); dlg.close(); render(); } };

  // список карток (за групами)
  let photoTarget = null;
  function renderCardList() {
    const list = $('#cardList'); list.innerHTML = '';
    const cards = allCards();
    const groups = [['', cards.filter(c => !c.parent)], ...['eat', 'drink', 'toys'].map(p => [p, cards.filter(c => c.parent === p)])];
    for (const [p, arr] of groups) {
      const h = document.createElement('h4'); h.textContent = p ? `Усередині «${PARENTS[p]}» (рівень 3)` : 'Верхній рівень'; list.appendChild(h);
      arr.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'card-row' + (S.hidden.includes(c.id) ? ' off' : '');
        row.innerHTML = `<img src="${c.img}" alt=""><div><div class="name">${esc(c.label)}${c.kind === 'cat' ? ' <small>· категорія</small>' : ''}</div><div class="cat">«Я хочу ${esc(c.say)}»</div></div>
          <div class="ctl">
            <input type="checkbox" ${S.hidden.includes(c.id) ? '' : 'checked'} title="Показувати">
            <button data-act="photo" title="Своє фото">📷</button>
            <button data-act="up" title="Вище" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button data-act="down" title="Нижче" ${i === arr.length - 1 ? 'disabled' : ''}>↓</button>
            ${c.custom ? '<button data-act="del" title="Видалити">🗑</button>' : ''}
          </div>`;
        row.querySelector('input').onchange = e => { S.hidden = e.target.checked ? S.hidden.filter(x => x !== c.id) : [...S.hidden, c.id]; save(); row.classList.toggle('off', !e.target.checked); render(); };
        row.querySelectorAll('button').forEach(b => b.onclick = () => {
          const act = b.dataset.act;
          if (act === 'photo') { photoTarget = c.id; $('#rowPhoto').click(); return; }
          const ids = S.order.filter(id => arr.some(x => x.id === id)); const k = ids.indexOf(c.id);
          if (act === 'up' && k > 0) swap(c.id, ids[k - 1]);
          if (act === 'down' && k < ids.length - 1) swap(c.id, ids[k + 1]);
          if (act === 'del' && confirm(`Видалити картку «${c.label}»?`)) { S.custom = S.custom.filter(x => x.id !== c.id); S.order = S.order.filter(x => x !== c.id); S.hidden = S.hidden.filter(x => x !== c.id); delete S.photos[c.id]; }
          save(); renderCardList(); render();
        });
        list.appendChild(row);
      });
    }
  }
  function swap(a, b) { const i = S.order.indexOf(a), j = S.order.indexOf(b); [S.order[i], S.order[j]] = [S.order[j], S.order[i]]; }
  $('#rowPhoto').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || !photoTarget) return;
    try { S.photos[photoTarget] = await shrink(f, 400); save(); renderCardList(); render(); } catch (err) { alert('Не вдалося обробити фото: ' + err.message); }
  };

  // додавання власної картки
  let pendingPhoto = null;
  const onPick = e => { pendingPhoto = e.target.files[0] || null; $('#photoName').textContent = pendingPhoto ? 'фото обрано ✓' : 'фото не обрано'; };
  $('#newPhoto').onchange = onPick; $('#newPhotoCam').onchange = onPick;
  $('#btnCamera').onclick = () => $('#newPhotoCam').click();
  $('#btnGallery').onclick = () => $('#newPhoto').click();
  $('#addCardForm').onsubmit = async e => {
    e.preventDefault();
    const label = $('#newLabel').value.trim(); if (!label) return;
    const say = $('#newSay').value.trim() || label.toLowerCase();
    const parent = $('#newParent').value || null;
    let photo = null;
    if (pendingPhoto) { try { photo = await shrink(pendingPhoto, 400); } catch (err) { alert('Не вдалося обробити фото: ' + err.message); return; } }
    const id = 'c_' + Date.now().toString(36);
    S.custom.push({ id, label, say, parent, custom: true, img: photo || placeholder(label) });
    S.order.push(id); save();
    e.target.reset(); pendingPhoto = null; $('#photoName').textContent = 'фото не обрано'; renderCardList(); render();
  };
  function shrink(file, max) {
    return new Promise((res, rej) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * k), h = Math.round(img.height * k);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => rej(new Error('формат не підтримується')); img.src = url;
    });
  }
  function placeholder(label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#efe3ff"/><text x="50" y="66" text-anchor="middle" font-family="Arial" font-size="52" font-weight="700" fill="#5f3dc4">${esc(label.trim().charAt(0).toUpperCase())}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ---------- статистика ----------
  function renderStats() {
    const range = $('#statsRange').value;
    const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from = 0; if (range === 'today') from = start.getTime(); else if (range !== 'all') from = start.getTime() - (Number(range) - 1) * 86400000;
    const rows = readLog().filter(r => r.t >= from);
    const names = new Map([...BASE, ...S.custom, ...FIXED, IWANT].map(c => [c.id, c.label]));
    const byCard = new Map(), byDay = new Map();
    for (const r of rows) { if (r.type === 'say') continue; byCard.set(r.id, (byCard.get(r.id) || 0) + 1); const d = new Date(r.t).toLocaleDateString('uk-UA'); byDay.set(d, (byDay.get(d) || 0) + 1); }
    const says = rows.filter(r => r.type === 'say').length; const max = Math.max(1, ...byCard.values());
    const body = $('#statsBody');
    if (!rows.length) { body.innerHTML = '<p class="muted">Записів за цей період немає.</p>'; return; }
    const cardRows = [...byCard.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => `<tr><td>${esc(names.get(id) || id)}</td><td class="n">${n}</td><td style="width:40%"><div class="bar" style="width:${Math.round(n / max * 100)}%"></div></td></tr>`).join('');
    const dayRows = [...byDay.entries()].map(([d, n]) => `<tr><td>${d}</td><td class="n">${n}</td><td></td></tr>`).join('');
    body.innerHTML = `<p class="muted">Натискань карток: <b>${rows.length - says}</b>, речень озвучено («Сказати»): <b>${says}</b>.</p>
      <table class="stats"><thead><tr><th>Картка</th><th class="n">Разів</th><th></th></tr></thead><tbody>${cardRows}</tbody></table>
      <h3>За днями</h3><table class="stats"><tbody>${dayRows}</tbody></table>`;
  }
  $('#statsRange').onchange = renderStats;
  $('#statsExport').onclick = async () => {
    const rows = readLog();
    const csv = ['дата;час;тип;картка;текст;рівень', ...rows.map(r => { const d = new Date(r.t); return [d.toLocaleDateString('uk-UA'), d.toLocaleTimeString('uk-UA'), r.type, r.id, '"' + String(r.text || '').replace(/"/g, '""') + '"', r.l].join(';'); })].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }); const file = new File([blob], 'skazhy-log.csv', { type: 'text/csv' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Журнал «Скажи»' }); return; } } catch {}
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'skazhy-log.csv'; a.click();
  };

  if ('serviceWorker' in navigator && !window.Capacitor && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
  window.__skazhy = { get state() { return S; }, get strip() { return strip; }, speak, readLog };
})();
