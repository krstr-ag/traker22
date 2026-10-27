/* ===== ЗАМЕТКИ-КНИЖКА (LiteWriter): живые листки-страницы, дневниковый редактор ===== */
(() => {
  /* --- стили v4 заметок: css/v4-notes.css --- */
  const l=document.createElement('link'); l.rel='stylesheet'; l.href='css/v4-notes.css'; document.head.appendChild(l);

  /* миграция: старые «книжки» с разделами → простые заметки */
  let notes = HT.get('notes', null);
  if (!notes) {
    const books = HT.get('books', []);
    notes = books.map(b => ({
      id: b.id || HT.uid(),
      title: b.title || 'Заметка',
      emoji: b.emoji || '',
      color: b.color || '#8B6F47',
      theme: 'cream',
      html: (b.sections || []).map(s =>
        (s.title && s.title !== 'Раздел 1' ? `<h3>${s.title}</h3>` : '') + (s.html || '')).join('<br>'),
      ts: Date.now()
    }));
    HT.set('notes', notes);
  }
  notes.forEach(n => { if (!n.theme) n.theme = 'cream'; if (!n.color) n.color = '#8B6F47'; });
  const save = () => HT.set('notes', notes);
  let dayNotes = HT.get('dayNotes', {});
  const saveDay = () => HT.set('dayNotes', dayNotes);

  /* --- v4: мелочи «от руки» (старые данные не трогаем) ---
     dayMeta: { '2026-10-26': { fav:1, title:'', edited:'12:40' } } — только для дней,
     потому что сама заметка дня — это строка html. У книжек поля живут в самой заметке. */
  let dayMeta = HT.get('dayMeta', {});
  const saveMeta = () => HT.set('dayMeta', dayMeta);
  const dmeta = date => dayMeta[date] || (dayMeta[date] = {});

  const COVERS = [
    { c: '#C4693F', n: 'Терракота' }, { c: '#7A8B6F', n: 'Шалфей' },
    { c: '#8C6A4F', n: 'Кофе' }, { c: '#9C6B8A', n: 'Сирень' },
    { c: '#5F7D6E', n: 'Хвоя' }, { c: '#3E4A5C', n: 'Ночь' },
    { c: '#B08968', n: 'Песок' }, { c: '#A44A3F', n: 'Вино' }
  ];
  const THEMES = [
    { id: 'cream', n: 'Крем' }, { id: 'lined', n: 'Линии' }, { id: 'kraft', n: 'Крафт' },
    { id: 'grid', n: 'Сетка' }, { id: 'dark', n: 'Тёмная' }
  ];

  let cur = null;
  const grid = document.getElementById('notes-grid');
  const library = document.getElementById('notes-library');
  const noteView = document.getElementById('notes-book');
  const editor = document.getElementById('note-editor');
  const wrap = document.getElementById('note-editor-wrap');
  const status = document.getElementById('note-status');
  const titleInput = document.getElementById('note-title');
  let saveT;

  /* ---------- мелкие текстовые помощники ---------- */
  const plain = html => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const shortDate = ts => {
    const d = new Date(ts);
    return `${d.getDate()} ${HT.RU_MONTHS[d.getMonth()]}`;
  };
  const WEEK = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const fullDate = d => `${d.getDate()} ${HT.RU_MONTHS[d.getMonth()]}, ${WEEK[d.getDay()]}`;
  const hm = ts => {
    const d = new Date(ts || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const plural = (n, a, b, c) => {
    const m = n % 100, k = n % 10;
    if (m > 10 && m < 20) return c;
    if (k === 1) return a;
    if (k > 1 && k < 5) return b;
    return c;
  };
  const countWords = t => (t || '').trim() ? (t || '').trim().split(/\s+/).length : 0;
  const hash = s => { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const MOODS = ['☀', '☾', '✿', '✦', '☕', '✎', '❀', '❄'];
  const dayTitle = date => {
    const d = new Date(date + 'T00:00:00');
    return `День ${d.getDate()} ${HT.RU_MONTHS[d.getMonth()]}`;
  };
  const isFav = n => !!(n && n.day ? (dayMeta[n.date] || {}).fav : n.fav);

  /* ---------- поиск и фильтры библиотеки ---------- */
  let libQ = '', libF = 'all';
  function initLibTools() {
    if (document.getElementById('nlib-tools')) return;
    const tools = document.createElement('div');
    tools.className = 'nlib-tools';
    tools.id = 'nlib-tools';
    tools.innerHTML = `
      <label class="nlib-search">
        <svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.3"/><path d="M15.7 15.7L20 20"/></svg>
        <input id="nlib-q" type="search" autocomplete="off" placeholder="Поиск по заметкам…">
      </label>
      <div class="nlib-chips">
        <button class="nchip sel" data-f="all">Все</button>
        <button class="nchip" data-f="day">Дни</button>
        <button class="nchip" data-f="book">Книжки</button>
        <button class="nchip" data-f="fav">Избранные</button>
        <span class="nlib-count" id="nlib-count"></span>
      </div>`;
    library.insertBefore(tools, grid);
    const q = tools.querySelector('#nlib-q');
    q.value = libQ;
    q.addEventListener('input', () => { libQ = q.value; renderLibrary(); });
    tools.querySelectorAll('.nchip').forEach(b => b.onclick = () => {
      tools.querySelectorAll('.nchip').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      libF = b.dataset.f;
      renderLibrary();
    });
  }

  /* ---------- меню «⋯» на карточке ---------- */
  const pop = document.createElement('div');
  pop.className = 'note-pop';
  pop.innerHTML = `
    <button data-a="open">Открыть</button>
    <button data-a="rename">Переименовать</button>
    <button data-a="fav">В избранное</button>
    <button data-a="del" class="danger">Удалить</button>`;
  document.body.appendChild(pop);
  let popItem = null;

  function hidePop() { pop.classList.remove('open'); popItem = null; }

  function showPop(n, btn) {
    popItem = n;
    pop.classList.add('open');
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.max(10, Math.min(r.right - w, window.innerWidth - w - 10));
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 6);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.querySelector('[data-a="fav"]').textContent = isFav(n) ? 'Убрать из избранного' : 'В избранное';
  }

  pop.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !popItem) return;
    const n = popItem, a = b.dataset.a;
    hidePop();
    if (a === 'open') openItem(n);
    else if (a === 'rename') renameItem(n);
    else if (a === 'fav') toggleFav(n);
    else if (a === 'del') deleteItem(n);
  });
  document.addEventListener('click', e => {
    if (!pop.classList.contains('open')) return;
    if (e.target.closest('.note-pop') || e.target.closest('.ncard-dots')) return;
    hidePop();
  });
  window.addEventListener('scroll', hidePop, true);
  window.addEventListener('resize', hidePop);

  const openItem = n => n && n.day ? openDayNote(n.date) : openNote(n.id);

  function renameItem(n) {
    if (!n) return;
    HT.openModal(`
      <div class="m-title">Переименовать <button class="m-close">✕</button></div>
      <div class="m-label">Название</div>
      <input class="field" id="rn-title" maxlength="60" placeholder="Как назвать этот лист?">
      <button class="btn-primary wide" id="rn-go">Сохранить</button>`);
    const box = document.getElementById('modal-box');
    const inp = box.querySelector('#rn-title');
    inp.value = n.day ? ((dayMeta[n.date] || {}).title || '') : (n.title || '');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelector('#rn-go').onclick = () => {
      const v = inp.value.trim();
      if (n.day) { dmeta(n.date).title = v; saveMeta(); }
      else { n.title = v; save(); }
      HT.closeModal();
      renderLibrary();
      if (cur && cur.id === n.id) {
        titleInput.value = v;
        document.getElementById('hdr-sub').textContent = v || 'Заметка';
        paintDateHead();
      }
      HT.toast('Название изменено');
    };
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
  }

  function toggleFav(n) {
    if (!n) return;
    if (n.day) {
      const m = dmeta(n.date);
      if (m.fav) delete m.fav; else m.fav = 1;
      saveMeta();
      HT.toast(m.fav ? 'Заметка дня — в избранном ✦' : 'Убрано из избранного');
    } else {
      n.fav = !n.fav;
      save();
      HT.toast(n.fav ? 'Заметка — в избранном ✦' : 'Убрано из избранного');
    }
    renderLibrary();
  }

  function deleteItem(n) {
    if (!n) return;
    if (n.day) {
      const d = new Date(n.date + 'T00:00:00');
      if (!confirm(`Удалить заметку за ${d.getDate()} ${HT.RU_MONTHS[d.getMonth()]}? Это необратимо.`)) return;
      delete dayNotes[n.date]; saveDay();
      delete dayMeta[n.date]; saveMeta();
    } else {
      if (!confirm(`Удалить заметку «${n.title || 'Без названия'}»? Это необратимо.`)) return;
      notes = notes.filter(x => x.id !== n.id);
      save();
    }
    if (cur && cur.id === n.id) { cur = null; document.getElementById('note-back').click(); }
    renderLibrary();
    HT.toast('Заметка удалена');
  }

  /* ---------- список: обычные книжки + заметки к дням ---------- */
  function renderLibrary() {
    const items = [];

    Object.keys(dayNotes).sort().forEach(date => {
      if (!dayNotes[date] || !plain(dayNotes[date])) return;
      const m = dayMeta[date] || {};
      items.push({
        id: 'dn:' + date, day: true, date,
        title: m.title || dayTitle(date), color: '#7A8B6F', theme: 'cream',
        html: dayNotes[date], ts: Date.parse(date + 'T12:00:00'),
        fav: !!m.fav, edited: m.edited || ''
      });
    });
    notes.forEach(n => items.push(n));
    items.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const q = libQ.trim().toLowerCase();
    const shown = items.filter(it => {
      if (libF === 'day' && !it.day) return false;
      if (libF === 'book' && it.day) return false;
      if (libF === 'fav' && !isFav(it)) return false;
      if (q) {
        const hay = ((it.title || '') + ' ' + plain(it.html)).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    grid.innerHTML = '';
    shown.forEach((n, i) => {
      const el = document.createElement('article');
      el.className = 'book-card ncard';
      el.style.setProperty('--bc', n.color || '#C4693F');
      const snip = plain(n.html);
      const d = new Date(n.ts || Date.now());
      el.innerHTML = `
        ${n.day ? '<span class="ncard-tape"></span>' : ''}
        <button class="ncard-dots" title="Действия с заметкой" aria-label="Действия с заметкой"><span></span><span></span><span></span></button>
        <div class="ncard-date"><b></b><i></i>${n.day ? '<span class="ncard-kind">день</span>' : ''}</div>
        <div class="ncard-title"></div>
        <div class="ncard-rule"></div>
        <div class="ncard-text"></div>
        <div class="ncard-foot">
          <span class="ncard-no">№${i + 1}</span>
          <span class="ncard-mood">${MOODS[hash(n.id) % MOODS.length]}</span>
          <span class="ncard-time">${n.day && n.edited ? 'правка ' + n.edited : HT.timeAgo(n.ts)}</span>
        </div>
        ${isFav(n) ? '<span class="ncard-star" title="В избранном">★</span>' : ''}`;
      el.querySelector('.ncard-date b').textContent = d.getDate();
      el.querySelector('.ncard-date i').textContent = HT.RU_MONTHS[d.getMonth()];
      el.querySelector('.ncard-title').textContent = n.title || 'Без названия';
      el.querySelector('.ncard-text').textContent = snip
        ? snip.slice(0, 96) + (snip.length > 96 ? '…' : '')
        : 'страница пока пустая — тут будет ваш текст';
      el.addEventListener('click', ev => {
        const dots = ev.target.closest('.ncard-dots');
        if (dots) { ev.stopPropagation(); showPop(n, dots); return; }
        openItem(n);
      });
      grid.appendChild(el);
    });

    const cnt = document.getElementById('nlib-count');
    if (cnt) cnt.textContent = items.length
      ? `${shown.length} ${plural(shown.length, 'листок', 'листка', 'листков')} из ${items.length}`
      : '';

    const hint = document.getElementById('notes-hint');
    hint.classList.toggle('hidden', shown.length > 0);
    if (!shown.length) {
      if (items.length) {
        hint.innerHTML = '<b>Ничего не нашлось</b><span>Попробуйте другой запрос — или фильтр «Все»</span>';
      } else {
        hint.innerHTML = '<b>Здесь пока чистый лист</b>' +
          '<span>Напишите первую заметку — пары слов о дне вполне хватит</span>' +
          '<button class="btn-mini" id="hint-add">Написать первую</button>';
        const hb = hint.querySelector('#hint-add');
        if (hb) hb.onclick = () => document.getElementById('btn-add-note').click();
      }
    }
  }

  /* ---------- новая заметка: сначала обложка и тема ---------- */
  document.getElementById('btn-add-note').onclick = () => {
    let cover = COVERS[0], theme = THEMES[0];
    HT.openModal(`
      <div class="m-title">Новая книжка <button class="m-close">✕</button></div>
      <div class="m-label">Обложка</div>
      <div class="color-pick" id="nb-cover">
        ${COVERS.map((c, i) => `<button class="${i === 0 ? 'sel' : ''}" data-i="${i}" style="background:${c.c}" title="${c.n}"></button>`).join('')}
      </div>
      <div class="m-label">Тема бумаги</div>
      <div class="theme-picker-row" id="nb-theme">
        ${THEMES.map((t, i) => `<button class="theme-pick ${i === 0 ? 'sel' : ''}" data-i="${i}">${t.n}</button>`).join('')}
      </div>
      <div class="m-label">Название</div>
      <input class="field" id="nb-title" placeholder="Мысли на сегодня…" maxlength="60">
      <button class="btn-primary wide" id="gb-go">Создать заметку</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelectorAll('#nb-cover button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#nb-cover button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); cover = COVERS[Number(b.dataset.i)];
    });
    box.querySelectorAll('#nb-theme button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#nb-theme button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); theme = THEMES[Number(b.dataset.i)];
    });
    box.querySelector('#gb-go').onclick = () => {
      const title = box.querySelector('#nb-title').value.trim();
      const n = {
        id: HT.uid(), title, color: cover.c, theme: theme.id,
        html: '', ts: Date.now()
      };
      notes.unshift(n);
      save();
      HT.closeModal();
      renderLibrary();
      openNote(n.id, true);
      HT.toast('Пишите — книжка уже открыта');
    };
  };

  /* ---------- тулбар: «инструменты пера» ---------- */
  const PEN = {
    bold: '<svg class="ic" viewBox="0 0 24 24"><path d="M8 5h5.2a3.4 3.4 0 0 1 0 6.8H8z"/><path d="M8 11.8h6a3.6 3.6 0 0 1 0 7.2H8z"/></svg>',
    italic: '<svg class="ic" viewBox="0 0 24 24"><path d="M11 5h6"/><path d="M7 19h6"/><path d="M14.6 5l-4.2 14"/></svg>',
    underline: '<svg class="ic" viewBox="0 0 24 24"><path d="M7.5 5v6.6a4.6 4.6 0 0 0 9 0V5"/><path d="M6 20h12"/></svg>',
    strikeThrough: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 12h16"/><path d="M8 8h8"/><path d="M8 16h8"/></svg>',
    insertUnorderedList: '<svg class="ic" viewBox="0 0 24 24"><path d="M9.5 7h11"/><path d="M9.5 12h11"/><path d="M9.5 17h11"/><path d="M5 7h.01"/><path d="M5 12h.01"/><path d="M5 17h.01"/></svg>',
    insertOrderedList: '<svg class="ic" viewBox="0 0 24 24"><path d="M10.5 7h10"/><path d="M10.5 12h10"/><path d="M10.5 17h10"/><path d="M4 5.6h1.3v3.6"/><path d="M3.7 11.6h1.9L3.7 14.1h1.9"/><path d="M3.7 16.6h1.7v1.4H3.8v1.4h1.6"/></svg>'
  };
  const PEN_TIP = {
    bold: 'Жирное', italic: 'Курсив', underline: 'Подчёркнуто',
    strikeThrough: 'Зачёркнуть', insertUnorderedList: 'Список',
    insertOrderedList: 'Нумерованный список'
  };
  function dressToolbar() {
    const tb = wrap.querySelector('.rt-toolbar');
    if (!tb) return;
    tb.querySelectorAll('button').forEach((b, i) => {
      const cmd = b.dataset.cmd;
      if (PEN[cmd]) b.innerHTML = PEN[cmd];
      if (PEN_TIP[cmd] && !b.title) b.title = PEN_TIP[cmd];
      b.style.setProperty('--ti', i);
      b.classList.add('ntb');
    });
  }

  /* ---------- «маркеры» вместо кислотных заливок ---------- */
  const MARK = {
    fde68a: '253,230,138', fbcfe8: '251,207,232',
    bbf7d0: '187,247,208', bfdbfe: '191,219,254'
  };
  function markerize(root) {
    if (!root) return;
    root.querySelectorAll('[style*="background"]').forEach(el => {
      const raw = (el.style.backgroundColor || el.style.background || '').toLowerCase();
      if (!raw) return;
      let rgb = '';
      const hex = raw.match(/#([0-9a-f]{6})\b/);
      if (hex) rgb = MARK[hex[1]];
      else {
        const num = raw.match(/(\d+)[^\d]+(\d+)[^\d]+(\d+)/);
        if (num) {
          const h = v => Number(v).toString(16).padStart(2, '0');
          rgb = MARK[h(+num[1]) + h(+num[2]) + h(+num[3])] || '';
        }
      }
      if (!rgb) return;
      el.style.backgroundColor = `rgba(${rgb}, .42)`;
      el.classList.add('mk');
    });
  }

  /* ---------- счётчик слов и «тихий» статус ---------- */
  function ensureFoot() {
    if (document.getElementById('note-foot')) return;
    const foot = document.createElement('div');
    foot.className = 'note-foot';
    foot.id = 'note-foot';
    foot.innerHTML = '<span id="note-count"></span>';
    wrap.appendChild(foot);
    if (status && status.parentNode !== foot) foot.appendChild(status);
  }
  function updateCount() {
    const el = document.getElementById('note-count');
    if (!el) return;
    const txt = editor.innerText || '';
    const w = countWords(txt), c = txt.replace(/\s/g, '').length;
    el.textContent = `${w} ${plural(w, 'слово', 'слова', 'слов')} · ${c} ${plural(c, 'знак', 'знака', 'знаков')}`;
  }

  /* ---------- шапка-дата над бумагой ---------- */
  function paintDateHead() {
    if (!cur) return;
    let head = document.getElementById('note-datehead');
    if (!head) {
      head = document.createElement('div');
      head.className = 'note-datehead';
      head.id = 'note-datehead';
      head.innerHTML = '<div class="ndh-big"></div>' +
        '<div class="ndh-sub"><span class="ndh-edited"></span><em class="ndh-remark"></em></div>';
      const themeRow = document.getElementById('note-themes');
      wrap.insertBefore(head, themeRow ? themeRow.nextSibling : wrap.firstChild);
    }
    const d = cur.day ? new Date(cur.date + 'T00:00:00') : new Date(cur.ts || Date.now());
    head.querySelector('.ndh-big').textContent = fullDate(d);
    const edited = cur.edited || (cur.day ? (dayMeta[cur.date] || {}).edited : '') || '';
    head.querySelector('.ndh-edited').textContent = edited ? `изменено в ${edited}` : 'только что открыто';
    let idx = -1;
    if (!cur.day) {
      const ids = [];
      Object.keys(dayNotes).sort().forEach(dt => { if (dayNotes[dt] && plain(dayNotes[dt])) ids.push('dn:' + dt); });
      notes.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).forEach(x => ids.push(x.id));
      idx = ids.indexOf(cur.id);
    }
    head.querySelector('.ndh-remark').textContent = cur.day
      ? 'запись дня'
      : (idx >= 0 ? `лист №${idx + 1}` : 'новый лист');
  }

  /* ---------- анимации ---------- */
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function playOpen() {
    if (reduced()) return;
    noteView.classList.remove('note-anim');
    void noteView.offsetWidth;
    noteView.classList.add('note-anim');
  }
  function playLib() {
    if (reduced()) return;
    library.classList.remove('lib-anim');
    void library.offsetWidth;
    library.classList.add('lib-anim');
  }

  /* ---------- открыть заметку ---------- */
  function applyTheme(t) {
    wrap.classList.add('paper-theme');
    THEMES.forEach(x => wrap.classList.remove('paper-' + x.id));
    wrap.classList.add('paper-' + (t || 'cream'));
  }

  function openNote(id, focusTitle) {
    cur = notes.find(n => n.id === id);
    if (!cur) return;
    library.classList.add('hidden');
    noteView.classList.remove('hidden');
    titleInput.readOnly = false;
    titleInput.value = cur.title || '';
    editor.innerHTML = cur.html || '';
    applyTheme(cur.theme);
    renderThemeRow();
    paintDateHead();
    markerize(editor);
    updateCount();
    status.textContent = 'загружено';
    document.getElementById('hdr-sub').textContent = cur.title || 'Заметка';
    playOpen();
    if (focusTitle) setTimeout(() => titleInput.focus(), 60);
  }

  function openDayNote(date) {
    const m = dayMeta[date] || {};
    cur = { id: 'dn:' + date, day: true, date, title: m.title || dayTitle(date), theme: 'cream', edited: m.edited || '' };
    library.classList.add('hidden');
    noteView.classList.remove('hidden');
    titleInput.value = cur.title;
    titleInput.readOnly = true;
    editor.innerHTML = dayNotes[date] || '';
    applyTheme('cream');
    renderThemeRow();
    paintDateHead();
    markerize(editor);
    updateCount();
    status.textContent = 'заметка из «Планов»';
    document.getElementById('hdr-sub').textContent = cur.title;
    playOpen();
  }

  function renderThemeRow() {
    let row = document.getElementById('note-themes');
    if (!row) {
      row = document.createElement('div');
      row.className = 'theme-picker-row';
      row.id = 'note-themes';
      wrap.insertBefore(row, wrap.firstChild);
    }
    row.innerHTML = THEMES.map(t =>
      `<button class="theme-pick ${(cur.theme || 'cream') === t.id ? 'sel' : ''}" data-t="${t.id}">${t.n}</button>`).join('');
    row.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      cur.theme = b.dataset.t;
      applyTheme(cur.theme);
      if (!cur.day) save();
      renderThemeRow();
      paintDateHead();
    });
  }

  function saveCur() {
    if (!cur) return;
    if (cur.day) {
      dayNotes[cur.date] = editor.innerHTML;
      saveDay();
      const m = dmeta(cur.date);
      m.edited = cur.edited = HT.nowHM();
      saveMeta();
    } else {
      cur.html = editor.innerHTML;
      cur.ts = Date.now();
      cur.edited = HT.nowHM();
      save();
    }
    paintDateHead();
  }

  editor.addEventListener('input', () => {
    markerize(editor);
    updateCount();
    status.textContent = 'сохраняется…';
    clearTimeout(saveT);
    saveT = setTimeout(() => { saveCur(); status.textContent = 'сохранено'; }, 500);
  });

  titleInput.addEventListener('input', () => {
    if (!cur || cur.day) return;
    cur.title = titleInput.value;
    document.getElementById('hdr-sub').textContent = cur.title || 'Заметка';
    save();
  });

  document.getElementById('note-back').onclick = () => {
    saveCur();
    cur = null;
    titleInput.readOnly = false;
    noteView.classList.remove('note-anim');
    noteView.classList.add('hidden');
    library.classList.remove('hidden');
    playLib();
    renderLibrary();
    document.getElementById('hdr-sub').textContent = '';
  };

  document.getElementById('btn-del-book').onclick = () => {
    if (!cur) return;
    if (cur.day) {
      if (!confirm('Удалить заметку этого дня?')) return;
      delete dayNotes[cur.date];
      saveDay();
      delete dayMeta[cur.date];
      saveMeta();
      cur = null;
      document.getElementById('note-back').click();
      HT.toast('Заметка дня удалена');
      return;
    }
    if (!confirm(`Удалить заметку «${cur.title || 'Без названия'}»?`)) return;
    notes = notes.filter(n => n.id !== cur.id);
    save();
    cur = null;
    document.getElementById('note-back').click();
    HT.toast('Заметка удалена');
  };

  HT.onShow['tab-notes'] = () => {
    dayNotes = HT.get('dayNotes', dayNotes);
    dayMeta = HT.get('dayMeta', dayMeta);
    renderLibrary();
    if (!library.classList.contains('hidden')) playLib();
  };
  /* открыть заметку конкретного дня (из «Планов») */
  HT.openDayNote = date => {
    dayNotes = HT.get('dayNotes', dayNotes);
    dayMeta = HT.get('dayMeta', dayMeta);
    HT.showTab('tab-notes');
    openDayNote(date);
  };

  initLibTools();
  dressToolbar();
  ensureFoot();
  renderLibrary();
})();
