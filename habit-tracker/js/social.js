/* ===== ЛЕНТА: посты, звук/видео с телефона, реакции, вложенные комментарии, клипы, истории ===== */
(() => {

  window.PEOPLE = [
    { id: 'u1', name: 'Алина Светлова', ava: '🌸', bio: 'Фотограф природы 📸 Люблю закаты и кофе', links: ['instagram.com/alina_photo', 't.me/alina'], followers: 1284 },
    { id: 'u2', name: 'Максим Спорт', ava: '⚡', bio: 'Спорт = образ жизни. Присоединяйся к челленджам!', links: ['youtube.com/maxsport'], followers: 843 },
    { id: 'u3', name: 'София Ч.', ava: '📚', bio: 'Книги • мысли • кофе ☕', links: ['vk.com/sofia', 't.me/sofia_reads'], followers: 2101 },
    { id: 'u4', name: 'Данил', ava: '🎮', bio: 'Делаю игры и учусь коду', links: ['github.com/danil'], followers: 567 },
    { id: 'u5', name: 'Ева', ava: '🦋', bio: 'Йога, медитация, позитив 🧘', links: ['t.me/eva_yoga'], followers: 990 }
  ];
  const P = id => PEOPLE.find(p => p.id === id);
  const copyText = s => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s)
        .then(() => HT.toast('📋 Скопировано'))
        .catch(() => HT.toast('📋 Скопируйте вручную'));
    } else {
      HT.toast('📋 Скопируйте вручную');
    }
  };

  const IMAGES = ['bg/sunset.svg', 'bg/forest.svg', 'bg/sea.svg', 'bg/night.svg', 'bg/meadow.svg', 'bg/aurora.svg'];
  const D = 864e5, H = 36e5;

  /* ---------- константы v4 ---------- */
  const REACTIONS = ['❤️', '🔥', '😂', '😍', '👍', '🙏'];
  const AUDIO_LIMIT = 3.5 * 1024 * 1024;   /* >3.5 МБ — только сессия */
  const VIDEO_LIMIT = 4 * 1024 * 1024;     /* лимит видео с телефона */
  const SESSION_NOTE = '🎵 музыка только в этой сессии';

  /* ---------- посты ---------- */
  const seedPosts = () => ([
    { id: HT.uid(), author: 'u1', type: 'photo', img: 'bg/sunset.svg', text: 'Закат сегодня просто космос 🌅 Кто тоже любит встречать вечер на природе?', tags: ['закат', 'природа', 'фото'], likes: ['u2', 'u3', 'u5'], favs: [], reposts: 7, views: 341, comments: [{ who: 'София Ч.', text: 'Невероятно красиво!' }], ts: Date.now() - 3 * H, music: { id: 'volny', name: '🌊 Волны' } },
    { id: HT.uid(), author: 'u3', type: 'text', plate: 'v1', text: '«Книга — это магическое зеркало: в неё заглядываешь и видишь то, чего прежде в себе не замечал».', tags: ['книги', 'цитаты'], likes: ['u1', 'u5'], favs: [], reposts: 4, views: 289, comments: [], ts: Date.now() - 5 * H },
    { id: HT.uid(), author: 'u2', type: 'photo', img: 'bg/meadow.svg', text: 'День 5 челленджа «30 дней воды» 💧 Чувствую прилив сил! Кто со мной?', tags: ['спорт', 'здоровье', 'челлендж'], likes: ['u1', 'u4'], favs: [], reposts: 3, views: 210, comments: [], ts: Date.now() - 7 * H },
    { id: HT.uid(), author: 'u3', type: 'photo', img: 'bg/forest.svg', text: 'Утренний лес и книга — лучшая терапия 📖🌱', tags: ['книги', 'лес', 'утро'], likes: ['u1', 'u2', 'u4', 'u5'], favs: [], reposts: 12, views: 522, comments: [{ who: 'Ева', text: 'Согласна на все сто 🦋' }], ts: Date.now() - 20 * H, music: { id: 'kapu', name: '☕ Кофе' } },
    { id: HT.uid(), author: 'u5', type: 'photo', img: 'bg/aurora.svg', text: 'Мечтаю увидеть северное сияние вживую ✨ А вы где мечтаете побывать?', tags: ['мечта', 'северноесияние', 'путешествия'], likes: ['u3'], favs: [], reposts: 5, views: 178, comments: [], ts: Date.now() - 30 * H },
    { id: HT.uid(), author: 'u4', type: 'photo', img: 'bg/night.svg', text: 'Ночь лучшее время писать код 🌙 Вышла новая мини-игра в разделе «Игры»!', tags: ['код', 'игры', 'ночь'], likes: ['u2'], favs: [], reposts: 2, views: 145, comments: [], ts: Date.now() - 44 * H }
  ]);

  let posts = HT.get('posts', null) || seedPosts();
  /* миграция старых постов (без потери данных) */
  posts.forEach(p => {
    if (!p.type) p.type = p.video ? 'clip' : 'photo';
    if (!Array.isArray(p.likes)) p.likes = [];
    if (!Array.isArray(p.favs)) p.favs = [];
    if (!Array.isArray(p.comments)) p.comments = [];
    if (typeof p.reposts !== 'number') p.reposts = 0;
    if (!p.reactions || typeof p.reactions !== 'object') p.reactions = {};
    if (p.myReaction === undefined) p.myReaction = null;
    /* сессионные blob:-ссылки живут только до перезагрузки — убираем битые источники */
    if (typeof p.audio === 'string' && p.audio.indexOf('blob:') === 0) p.audio = null;
    if (typeof p.video === 'string' && p.video.indexOf('blob:') === 0) {
      p.video = null;
      if (p.type === 'video') p.type = p.img ? 'photo' : 'text';
    }
    p.comments.forEach(c => {
      if (!c.id) c.id = HT.uid();
      if (!Array.isArray(c.likes)) c.likes = [];
      if (c.reply === undefined) c.reply = null;
    });
  });
  let stories = HT.get('stories', null) || [
    { id: HT.uid(), author: 'u1', img: 'bg/sea.svg', sticker: '🌊', text: 'Море зовёт…', ts: Date.now() - 2 * H },
    { id: HT.uid(), author: 'u3', text: 'Читаю и вдохновляюсь 📚☕', sticker: '📖', ts: Date.now() - 5 * H },
    { id: HT.uid(), author: 'u2', sticker: '🏃', text: 'Утренняя пробежка!', ts: Date.now() - 9 * H }
  ];
  const saveStories = () => HT.set('stories', stories);

  let following = HT.get('following', []);
  const saveFollowing = () => HT.set('following', following);

  let mode = 'foryou';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const who = id => id === 'me'
    ? { name: (HT.user && HT.user.name) || 'Я', ava: (HT.user && HT.user.avatar) || '🙂' }
    : (P(id) || { name: 'Удалённый', ava: '👤' });
  const myName = () => (HT.user && HT.user.name) || 'Гость';

  /* ---------- фильтры (как в TikTok): 10 CSS-пресетов ---------- */
  const FILTERS = [
    { name: 'Без фильтра', css: '' },
    { name: 'Яркий', css: 'brightness(1.14) saturate(1.22) contrast(1.03)' },
    { name: 'Тёплый', css: 'sepia(.3) saturate(1.3) hue-rotate(-8deg) brightness(1.04)' },
    { name: 'Холодный', css: 'saturate(.96) hue-rotate(14deg) brightness(1.03) contrast(1.04)' },
    { name: 'Плёночный', css: 'contrast(1.14) saturate(.88) sepia(.16) brightness(1.03)' },
    { name: 'Винтаж', css: 'sepia(.45) contrast(.92) brightness(1.06) hue-rotate(-14deg)' },
    { name: 'Ч/Б', css: 'grayscale(1) contrast(1.14)' },
    { name: 'Мягкий', css: 'brightness(1.07) contrast(.93) saturate(1.06)' },
    { name: 'Контраст', css: 'contrast(1.3) saturate(1.08) brightness(.99)' },
    { name: 'Неон', css: 'saturate(1.85) contrast(1.2) hue-rotate(-16deg) brightness(1.05)' }
  ];
  const FILTER_SET = new Set(FILTERS.map(f => f.css));
  /* валидация: в данные попадает только известный пресет (безопасно для style=) */
  const filterOf = s => (typeof s === 'string' && s && FILTER_SET.has(s) ? s : '');
  const filterName = s => { const f = FILTERS.find(x => x.css === filterOf(s)); return f ? f.name : 'Без фильтра'; };
  const filterAttr = s => { const f = filterOf(s); return f ? ` style="filter:${esc(f)}"` : ''; };

  function filterStripHTML(cur) {
    return `<div class="fl-row">` + FILTERS.map(f => `
      <button type="button" class="fl-item ${filterOf(cur) === f.css ? 'sel' : ''}" data-fl="${f.css ? esc(f.css) : ''}">
        <i><b style="filter:${f.css || 'none'}"></b></i><span>${f.name}</span>
      </button>`).join('') + `</div>`;
  }

  function bindFilterStrip(root, set) {
    if (!root) return;
    root.querySelectorAll('[data-fl]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-fl]').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      set(b.dataset.fl || '');
    });
  }

  /* выставить активный пресет в уже отрисованной полосе */
  function syncStrip(root, cur) {
    if (!root) return;
    const cur2 = filterOf(cur);
    root.querySelectorAll('[data-fl]').forEach(b =>
      b.classList.toggle('sel', (b.dataset.fl || '') === cur2));
  }

  /* состояние ответов на комментарии: pid -> { id, who, text } */
  const replyState = {};

  /* ---------- истории ---------- */
  function liveStories() {
    const now = Date.now();
    stories = stories.filter(s => now - s.ts < D);
    return stories;
  }

  function renderStories() {
    liveStories();
    const row = document.getElementById('stories-row');
    row.innerHTML = '';
    const mine = stories.filter(s => s.author === 'me');
    const add = document.createElement('div');
    add.className = 'story-item';
    const m0 = mine[0];
    const mThumb = m0
      ? (m0.video ? '▶' : (m0.img ? `<img src="${m0.img}"${filterAttr(m0.filter)}>` : (m0.sticker || '➕')))
      : '➕';
    add.innerHTML = `<div class="story-ring ${mine.length ? '' : 'empty'}"><div>${mThumb}</div></div>Моя история`;
    add.onclick = () => openStoryCreator();
    row.appendChild(add);

    PEOPLE.forEach(p => {
      const s = stories.find(x => x.author === p.id);
      if (!s) return;
      const el = document.createElement('div');
      el.className = 'story-item';
      el.innerHTML = `<div class="story-ring"><div>${s.img ? `<img src="${s.img}"${filterAttr(s.filter)}>` : (s.ava || p.ava)}</div></div>${p.name.split(' ')[0]}`;
      el.onclick = () => viewStories(p.id);
      row.appendChild(el);
    });
    saveStories();
  }

  function openStoryCreator() {
    let img = null, sticker = '', video = null, filter = '';
    HT.openModal(`
      <div class="m-title">Новая история (24 часа) <button class="m-close">✕</button></div>
      <div class="m-label">Текст</div>
      <input class="field" id="st-text" placeholder="Что нового?" maxlength="80">
      <div class="m-label">Стикер</div>
      <div class="emoji-pick" id="st-stickers">${['✨','🔥','😍','🎉','☕','🌈','💪','📸','🌊','🌙','🏃','📚'].map((s, i) => `<button class="${i === 0 ? 'sel' : ''}" data-s="${s}">${s}</button>`).join('')}</div>
      <div class="m-row" style="margin-top:12px">
        <button class="btn-ghost" id="st-photo" style="margin:0">Фото</button>
        <button class="btn-ghost" id="st-video" style="margin:0">Видео (до 2,5 МБ)</button>
      </div>
      <div class="fl-wrap hidden" id="st-fl">${filterStripHTML('')}</div>
      <div class="m-row" style="margin-top:8px">
        <button class="btn-primary" id="st-go">Опубликовать</button>
      </div>
      <p class="tiny" id="st-photoinfo">Медиа не выбрано</p>`);
    const box = document.getElementById('modal-box');
    const flWrap = box.querySelector('#st-fl');
    const showFilters = () => flWrap.classList.remove('hidden');
    bindFilterStrip(flWrap, f => filter = f);
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelectorAll('#st-stickers button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#st-stickers button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); sticker = b.dataset.s;
    });
    if (!sticker) sticker = '✨';
    box.querySelector('#st-photo').onclick = () => HT.pickFile('image/*', f => {
      HT.resizeImage(f, url => {
        img = url; video = null;
        showFilters();
        document.getElementById('st-photoinfo').textContent = 'Фото выбрано';
      });
    });
    box.querySelector('#st-video').onclick = () => HT.pickFile('video/*', f => {
      if (f.size > 2.5e6) return HT.toast('Видео слишком большое (до 2,5 МБ)');
      const r = new FileReader();
      r.onload = () => {
        video = r.result; img = null;
        showFilters();
        document.getElementById('st-photoinfo').textContent = 'Видео выбрано';
      };
      r.readAsDataURL(f);
    });
    box.querySelector('#st-go').onclick = () => {
      const text = document.getElementById('st-text').value.trim();
      const sel = box.querySelector('#st-stickers .sel');
      stories = stories.filter(s => !(s.author === 'me' && Date.now() - s.ts < D));
      const st = { id: HT.uid(), author: 'me', text, img, video, sticker: sel ? sel.dataset.s : '', ts: Date.now() };
      if (filter) st.filter = filter;
      stories.push(st);
      saveStories(); renderStories(); HT.closeModal(); HT.toast('История опубликована');
    };
  }
  HT.openStoryCreator = openStoryCreator;

  function viewStories(authorId) {
    const queue = stories.filter(s => s.author === authorId);
    if (!queue.length) return;
    let idx = 0;
    const view = document.getElementById('story-view');
    const bar = document.getElementById('story-progress');
    let timer, tick;

    const show = () => {
      const s = queue[idx];
      const w = who(s.author);
      document.getElementById('story-author').textContent = `${w.ava} ${w.name}`;
      const c = document.getElementById('story-content');
      c.innerHTML = (s.video ? `<video src="${s.video}" autoplay muted loop playsinline${filterAttr(s.filter)}></video>` : '') +
        (s.img && !s.video ? `<img src="${s.img}"${filterAttr(s.filter)}>` : '') +
        `<div class="st-sticker">${s.sticker || ''}</div>` +
        `<div class="st-text" style="${s.img || s.video ? 'color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6)' : ''}">${esc(s.text || '')}</div>`;
      bar.style.width = '0%';
      clearInterval(tick); clearTimeout(timer);
      let p = 0;
      tick = setInterval(() => { p += 4; bar.style.width = Math.min(100, p) + '%'; }, 200);
      timer = setTimeout(() => {
        clearInterval(tick);
        idx++;
        if (idx < queue.length) show();
        else view.classList.add('hidden');
      }, 5000);
    };
    view.classList.remove('hidden');
    document.getElementById('story-close').onclick = () => {
      clearInterval(tick); clearTimeout(timer); view.classList.add('hidden');
    };
    show();
  }

  /* ---------- иконки: тонкие линейные SVG (stroke 1.6) ---------- */
  const ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M20.6 5a5.2 5.2 0 0 0-7.4 0L12 6.2l-1.2-1.2a5.2 5.2 0 0 0-7.4 7.4l8.6 8.6 8.6-8.6a5.2 5.2 0 0 0 0-7.4z"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M20.8 11.5a8.2 8.2 0 0 1-8.8 8.2 9 9 0 0 1-3.4-.7L3.6 20.4l1.5-4.6A8.2 8.2 0 0 1 12 3.3a8.2 8.2 0 0 1 8.8 8.2z"/></svg>',
    repost: '<svg viewBox="0 0 24 24"><path d="M17 3.5L20.5 7 17 10.5"/><path d="M3.5 11.5v-1a4 4 0 0 1 4-4h13"/><path d="M7 20.5L3.5 17 7 13.5"/><path d="M20.5 12.5v1a4 4 0 0 1-4 4h-13"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M18.3 20.3l-6.3-4.5-6.3 4.5V5.2A1.7 1.7 0 0 1 7.4 3.5h9.2a1.7 1.7 0 0 1 1.7 1.7z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15.2V4"/><path d="M8.3 7.7L12 4l3.7 3.7"/><path d="M5.2 13.2v5a1.8 1.8 0 0 0 1.8 1.8h10a1.8 1.8 0 0 0 1.8-1.8v-5"/></svg>',
    smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><path d="M8.6 14a4.2 4.2 0 0 0 6.8 0"/><path d="M9.3 9.7h.01M14.7 9.7h.01"/></svg>',
    reply: '<svg viewBox="0 0 24 24"><path d="M9.5 7.5L5 12l4.5 4.5"/><path d="M5 12h9a5 5 0 0 1 5 5v1.5"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M4.5 12l15.5-7-7 15.5-2-6.5-6.5-2z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8.6 5.6l9.2 6.4-9.2 6.4z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M9.5 5.6v12.8M14.5 5.6v12.8"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M9 17.5V6.5l10-2v11"/><ellipse cx="6.5" cy="17.5" rx="2.5" ry="2"/><ellipse cx="16.5" cy="15.5" rx="2.5" ry="2"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3.5" y="6" width="12" height="12" rx="2.5"/><path d="M15.5 10.5l5-2.7v8.4l-5-2.7"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M5 9.5h3l4-3.5v12l-4-3.5H5z"/><path d="M15.4 9.4a3.7 3.7 0 0 1 0 5.2"/><path d="M17.8 7a7 7 0 0 1 0 10"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M5 9.5h3l4-3.5v12l-4-3.5H5z"/><path d="M16 10l4 4M20 10l-4 4"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M6.5 14.2L12 8.7l5.5 5.5"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6.5 9.8L12 15.3l5.5-5.5"/></svg>'
  };
  window.FEED_ICONS = ICON;

  /* ---------- хранилище: квота → сессионная ссылка ---------- */
  function dataUrlToBlob(u) {
    try {
      const i = u.indexOf(',');
      const mime = (u.slice(0, i).match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
      const bin = atob(u.slice(i + 1));
      const arr = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
      return new Blob([arr], { type: mime });
    } catch (e) { return null; }
  }

  function toSession(p, key) {
    const v = p[key];
    if (typeof v !== 'string' || v.indexOf('data:') !== 0) return false;
    try {
      const b = dataUrlToBlob(v);
      if (!b) return false;
      p[key] = URL.createObjectURL(b);
      p[key + 'Session'] = true;
      return true;
    } catch (e) { return false; }
  }

  /* сохранение с graceful-фолбэком: нехватка места → музыка/видео в сессию */
  function savePosts() {
    const movedKeys = new Set();
    const attempt = () => {
      try { localStorage.setItem('ht_posts', JSON.stringify(posts)); return true; }
      catch (e) { return false; }
    };
    for (let guard = 0; guard < 8 && !attempt(); guard++) {
      const cand = [];
      posts.forEach(p => { if (p.audio && p.audio.indexOf('data:') === 0) cand.push([p, 'audio']); });
      posts.forEach(p => { if (p.video && p.video.indexOf('data:') === 0) cand.push([p, 'video']); });
      if (!cand.length) break;
      cand.sort((a, b) => b[0][b[1]].length - a[0][a[1]].length);
      let any = false;
      for (let i = 0; i < cand.length; i++) {
        if (toSession(cand[i][0], cand[i][1])) { movedKeys.add(cand[i][1]); any = true; break; }
      }
      if (!any) break;
    }
    if (attempt()) {
      if (movedKeys.has('audio')) HT.toast(SESSION_NOTE);
      else if (movedKeys.size) HT.toast('🎬 видео только в этой сессии');
      return true;
    }
    HT.toast('⚠️ Нехватка места в хранилище');
    return false;
  }

  /* ---------- аудио-плеер (только один в документе, без autoplay) ---------- */
  const audioPlayers = new Map();   /* pid -> HTMLAudioElement */
  let curAudioPid = null;

  const fmtTime = s => {
    if (!isFinite(s) || s < 0) s = 0;
    return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  };

  function audioBtnState(pid, playing) {
    document.querySelectorAll(`[data-au-btn="${pid}"]`).forEach(b => {
      b.classList.toggle('playing', playing);
      b.innerHTML = playing ? ICON.pause : ICON.play;
    });
  }

  function stopAudio(reset) {
    audioPlayers.forEach(a => {
      try { a.pause(); if (reset) a.currentTime = 0; } catch (e) {}
    });
    audioPlayers.forEach((a, pid) => audioBtnState(pid, false));
    audioPlayers.forEach((a, pid) => {
      const bar = document.querySelector(`[data-au-bar="${pid}"] i`);
      if (bar && reset) bar.style.width = '0%';
    });
    curAudioPid = null;
  }

  function toggleAudio(pid) {
    const a = audioPlayers.get(pid);
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    if (curAudioPid && curAudioPid !== pid) {
      const prev = audioPlayers.get(curAudioPid);
      if (prev) { try { prev.pause(); } catch (e) {} }
      audioBtnState(curAudioPid, false);
    }
    HT.music && HT.music.stop();
    const pr = a.play();
    if (pr && pr.catch) pr.catch(() => HT.toast('Не удалось воспроизвести звук'));
  }

  function audioPlayerHTML(p) {
    return `<div class="au-player" data-au="${p.id}">
      <button class="au-btn" data-au-btn="${p.id}" title="Слушать">${ICON.play}</button>
      <div class="au-meta">
        <div class="au-name">${esc(p.audioName || 'Мой трек')}${p.audioSession ? '<span class="au-sess">сессия</span>' : ''}</div>
        <div class="au-bar" data-au-bar="${p.id}" title="Перемотать"><i></i></div>
      </div>
      <div class="au-time" data-au-time="${p.id}">0:00</div>
    </div>`;
  }

  function bindAudio(root) {
    root.querySelectorAll('.au-player').forEach(el => {
      const pid = el.dataset.au;
      const p = posts.find(x => x.id === pid);
      if (!p || !p.audio) return;
      let a = audioPlayers.get(pid);
      if (!a) {
        a = new Audio();
        a.preload = 'metadata';
        a.src = p.audio;
        audioPlayers.set(pid, a);
        a.addEventListener('play', () => { curAudioPid = pid; audioBtnState(pid, true); });
        a.addEventListener('pause', () => audioBtnState(pid, false));
        a.addEventListener('loadedmetadata', () => {
          const t = document.querySelector(`[data-au-time="${pid}"]`);
          if (t && !a.duration) t.textContent = '—';
        });
        a.addEventListener('timeupdate', () => {
          const bar = document.querySelector(`[data-au-bar="${pid}"] i`);
          if (bar && a.duration) bar.style.width = (a.currentTime / a.duration * 100) + '%';
          const t = document.querySelector(`[data-au-time="${pid}"]`);
          if (t) t.textContent = fmtTime(a.currentTime);
        });
        a.addEventListener('ended', () => {
          audioBtnState(pid, false);
          const bar = document.querySelector(`[data-au-bar="${pid}"] i`);
          if (bar) bar.style.width = '0%';
          if (curAudioPid === pid) curAudioPid = null;
        });
        a.addEventListener('error', () => {
          const t = document.querySelector(`[data-au-time="${pid}"]`);
          if (t) t.textContent = '—';
        });
      }
      const btn = el.querySelector('[data-au-btn]');
      if (btn) btn.onclick = () => toggleAudio(pid);
      const bar = el.querySelector('.au-bar');
      if (bar) bar.onclick = e => {
        if (!a.duration) return;
        const r = bar.getBoundingClientRect();
        const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        a.currentTime = k * a.duration;
      };
      audioBtnState(pid, !a.paused && curAudioPid === pid);
    });
  }

  /* ---------- реакции ---------- */
  function pillsHTML(p) {
    const r = p.reactions || {};
    return Object.keys(r).filter(k => r[k] > 0)
      .map(k => `<span class="rx-pill ${p.myReaction === k ? 'mine' : ''}">${k}<i>${r[k]}</i></span>`).join('');
  }

  function applyReaction(pid, emoji) {
    const p = posts.find(x => x.id === pid);
    if (!p) return;
    p.reactions = p.reactions || {};
    const cur = p.myReaction;
    if (cur === emoji) {
      p.reactions[emoji] = (p.reactions[emoji] || 1) - 1;
      if (p.reactions[emoji] <= 0) delete p.reactions[emoji];
      p.myReaction = null;
    } else {
      if (cur) {
        p.reactions[cur] = (p.reactions[cur] || 1) - 1;
        if (p.reactions[cur] <= 0) delete p.reactions[cur];
      }
      p.reactions[emoji] = (p.reactions[emoji] || 0) + 1;
      p.myReaction = emoji;
    }
    savePosts();

    const post = document.querySelector(`.post[data-p="${pid}"]`);
    if (!post) return;
    const pop = post.querySelector('.react-pop');
    const rb = post.querySelector('[data-react]');
    if (rb) rb.classList.toggle('on', !!p.myReaction);
    const pills = post.querySelector('.rx-pills');
    if (pills) {
      const html = pillsHTML(p);
      pills.innerHTML = html;
      pills.classList.toggle('hidden', !html);
      if (p.myReaction === emoji) pills.lastElementChild && pills.lastElementChild.classList.add('pop');
    }
    if (pop) {
      const chosen = pop.querySelector(`[data-e="${emoji}"]`);
      pop.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.e === p.myReaction));
      if (chosen && p.myReaction === emoji) {
        chosen.classList.add('pop');
        setTimeout(() => chosen.classList.remove('pop'), 380);
      }
      setTimeout(() => pop.classList.add('hidden'), 280);
    }
  }

  function toggleReactPanel(btn) {
    const pop = btn.parentElement.querySelector('.react-pop');
    if (!pop) return;
    const wasHidden = pop.classList.contains('hidden');
    document.querySelectorAll('.react-pop').forEach(x => x.classList.add('hidden'));
    if (wasHidden) pop.classList.remove('hidden');
  }

  /* ---------- комментарии: вложенные, лайки, ответы ---------- */
  function commentHTML(p, c) {
    const mine = c.likes.includes('me');
    const quote = c.reply
      ? `<div class="cmt-quote">${esc(c.reply.who)}: ${esc(String(c.reply.text).slice(0, 70))}${String(c.reply.text).length > 70 ? '…' : ''}</div>`
      : '';
    return `<div class="cmt" data-cmt="${c.id}">
      ${quote}
      <div class="cmt-body"><b>${esc(c.who)}</b> <span>${esc(c.text)}</span></div>
      <div class="cmt-acts">
        <button class="cmt-like ${mine ? 'on' : ''}" data-clike="${p.id}:${c.id}" title="Нравится">${ICON.heart}<i>${c.likes.length}</i></button>
        <button class="cmt-reply" data-creply="${p.id}:${c.id}">${ICON.reply}Ответить</button>
      </div>
    </div>`;
  }

  function threadHTML(p) {
    const byId = {};
    p.comments.forEach(c => byId[c.id] = c);
    const kids = id => p.comments.filter(c => c.reply && c.reply.to === id);
    const one = (c, depth) => {
      const ch = kids(c.id);
      const inner = commentHTML(p, c) +
        (ch.length ? `<div class="cmt-nest">${ch.map(k => one(k, depth + 1)).join('')}</div>` : '');
      return depth === 0 ? `<div class="cmt-root">${inner}</div>` : inner;
    };
    const roots = p.comments.filter(c => !c.reply || !byId[c.reply.to]);
    if (!roots.length) return `<div class="cmt-empty">Пока нет комментариев — напишите первый</div>`;
    return roots.map(c => one(c, 0)).join('');
  }

  const replyBoxInner = (pid, st) => `<div class="rb-in">
      <b>${esc(st.who)}</b>
      <span>${esc(String(st.text).slice(0, 70))}${String(st.text).length > 70 ? '…' : ''}</span>
      <button data-rbx="${pid}" title="Отменить ответ">${ICON.close}</button>
    </div>`;

  function refreshComments(root, pid) {
    const p = posts.find(x => x.id === pid);
    const wrap = root.querySelector(`[data-cmts="${pid}"]`);
    if (!p || !wrap) return;
    const th = wrap.querySelector('.cmt-threads');
    if (th) th.innerHTML = threadHTML(p);
    const rb = wrap.querySelector('.reply-box');
    if (rb) { rb.classList.add('hidden'); rb.innerHTML = ''; }
  }

  function bumpCommentCount(pid) {
    const p = posts.find(x => x.id === pid);
    if (!p) return;
    document.querySelectorAll(`[data-comment="${pid}"] span`).forEach(s => s.textContent = p.comments.length);
    document.querySelectorAll(`[data-clip-com="${pid}"] small`).forEach(s => s.textContent = p.comments.length);
  }

  function sendComment(pid, root) {
    root = root || document;
    const inp = root.querySelector(`[data-cin="${pid}"]`);
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    const p = posts.find(x => x.id === pid);
    if (!p) return;
    const st = replyState[pid] || null;
    p.comments.push({
      id: HT.uid(), who: myName(), text, ts: Date.now(), likes: [],
      reply: st ? { to: st.id, who: st.who, text: st.text } : null
    });
    replyState[pid] = null;
    inp.value = '';
    savePosts();
    refreshComments(root, pid);
    bumpCommentCount(pid);
    const inp2 = root.querySelector(`[data-cin="${pid}"]`);
    if (inp2) inp2.focus();
  }

  function commentLike(spec) {
    const i = spec.indexOf(':');
    const pid = spec.slice(0, i), cid = spec.slice(i + 1);
    const p = posts.find(x => x.id === pid);
    if (!p) return;
    const c = p.comments.find(x => x.id === cid);
    if (!c) return;
    const k = c.likes.indexOf('me');
    if (k >= 0) c.likes.splice(k, 1); else c.likes.push('me');
    savePosts();
    document.querySelectorAll(`[data-clike="${spec}"]`).forEach(b => {
      b.classList.toggle('on', c.likes.includes('me'));
      const n = b.querySelector('i');
      if (n) n.textContent = c.likes.length;
    });
  }

  function startReply(spec) {
    const i = spec.indexOf(':');
    const pid = spec.slice(0, i), cid = spec.slice(i + 1);
    const p = posts.find(x => x.id === pid);
    if (!p) return;
    const c = p.comments.find(x => x.id === cid);
    if (!c) return;
    replyState[pid] = { id: c.id, who: c.who, text: c.text };
    document.querySelectorAll(`[data-replybox="${pid}"]`).forEach(rb => {
      rb.classList.remove('hidden');
      rb.innerHTML = replyBoxInner(pid, replyState[pid]);
      const host = rb.closest('[data-cmts]');
      const inp = host && host.querySelector(`[data-cin="${pid}"]`);
      if (inp) { inp.focus(); inp.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    });
  }

  function cancelReply(pid) {
    replyState[pid] = null;
    document.querySelectorAll(`[data-replybox="${pid}"]`).forEach(rb => {
      rb.classList.add('hidden');
      rb.innerHTML = '';
    });
  }

  /* делегирование новых действий (лайк комментария, ответ, реакции) */
  document.addEventListener('click', e => {
    const re = e.target.closest('[data-re]');
    if (re) { applyReaction(re.dataset.re, re.dataset.e); return; }
    const rt = e.target.closest('[data-react]');
    if (rt) { toggleReactPanel(rt); return; }
    const cl = e.target.closest('[data-clike]');
    if (cl) { commentLike(cl.dataset.clike); return; }
    const cr = e.target.closest('[data-creply]');
    if (cr) { startReply(cr.dataset.creply); return; }
    const rb = e.target.closest('[data-rbx]');
    if (rb) { cancelReply(rb.dataset.rbx); return; }
    if (!e.target.closest('.act-wrap')) {
      document.querySelectorAll('.react-pop').forEach(x => x.classList.add('hidden'));
    }
  });

  /* ---------- пост ---------- */
  const musicChip = (p, idAttr) => p.music
    ? `<button class="music-chip" ${idAttr ? `data-mplay="${p.id}"` : ''}>♪ ${esc(p.music.name)} ▶</button>` : '';

  function postHTML(p) {
    const w = who(p.author);
    const liked = p.likes.includes('me');
    const faved = p.favs.includes('me');
    const followed = p.author !== 'me' && following.includes(p.author);
    const reposted = !!p.repostedByMe;
    const fStyle = `font-family:${fontOf(p.font)};`;
    const st = replyState[p.id];
    const pills = pillsHTML(p);

    let media = '';
    if (p.video) {
      const fa = filterAttr(p.filter);
      media = `<div class="post-video-wrap">
        <video class="post-video" src="${p.video}" controls playsinline preload="metadata"${fa}></video>
        ${p.dur ? `<span class="post-dur">${fmtTime(p.dur)}</span>` : ''}
      </div>`;
    } else if (p.type === 'text') {
      media = p.text
        ? (p.plate
            ? `<div class="post-text"><div class="pt-plate ${p.plate}" style="${fStyle}">${esc(p.text)}</div></div>`
            : `<div class="post-text" style="${fStyle}">${esc(p.text)}</div>`)
        : '';
    } else {
      media = `<div class="post-media-wrap"><img class="post-media" src="${p.img || 'bg/meadow.svg'}" alt=""${filterAttr(p.filter)}></div>`;
    }

    return `
    <div class="post" data-p="${p.id}">
      <div class="post-head">
        <div class="post-ava">${w.ava}</div>
        <div class="post-who">
          <div class="post-author">${esc(w.name)}</div>
          <div class="post-time">${HT.timeAgo(p.ts)}</div>
        </div>
        ${p.author !== 'me' ? `<button class="post-follow ${followed ? 'on' : ''}" data-follow="${p.author}">${followed ? 'Вы подписаны' : 'Подписаться'}</button>` : ''}
      </div>
      ${media}
      <div class="post-act">
        <button class="act act-like ${liked ? 'on' : ''}" data-like="${p.id}" title="Нравится">${ICON.heart}<span>${p.likes.length}</span></button>
        <div class="act-wrap">
          <button class="act act-react ${p.myReaction ? 'on' : ''}" data-react="${p.id}" title="Реакция">${ICON.smile}</button>
          <div class="react-pop hidden">${REACTIONS.map(e => `<button data-re="${p.id}" data-e="${e}" class="${p.myReaction === e ? 'sel' : ''}">${e}</button>`).join('')}</div>
        </div>
        <button class="act" data-comment="${p.id}" title="Комментарии">${ICON.comment}<span>${p.comments.length}</span></button>
        <button class="act ${reposted ? 'on' : ''}" data-rs="${p.id}" title="Репост">${ICON.repost}<span>${p.reposts}</span></button>
        <span class="act-gap"></span>
        <button class="act act-save ${faved ? 'on' : ''}" data-fav="${p.id}" title="Сохранить">${ICON.bookmark}</button>
        <button class="act" data-share="${p.id}" title="Поделиться">${ICON.share}</button>
      </div>
      <div class="rx-pills ${pills ? '' : 'hidden'}">${pills}</div>
      ${p.audio ? audioPlayerHTML(p) : ''}
      ${musicChip(p, true)}
      ${p.tags && p.tags.length ? `<div class="post-tags">${p.tags.map(t => '#' + esc(t)).join(' ')}</div>` : ''}
      <div class="post-stats"><span>Просмотры: ${p.views}</span></div>
      <div class="post-comments" data-cmts="${p.id}">
        <div class="cmt-threads">${threadHTML(p)}</div>
        <div class="reply-box ${st ? '' : 'hidden'}" data-replybox="${p.id}">${st ? replyBoxInner(p.id, st) : ''}</div>
        <div class="comment-input">
          <input placeholder="Комментировать…" data-cin="${p.id}" maxlength="300">
          <button class="c-send" data-csend="${p.id}" title="Отправить">${ICON.send}</button>
        </div>
      </div>
    </div>`;
  }

  function renderFeed() {
    const isClips = mode === 'clips';
    document.getElementById('feed-list').classList.toggle('hidden', isClips);
    document.getElementById('composer-row').classList.toggle('hidden', isClips);
    document.getElementById('clips-view').classList.toggle('hidden', !isClips);
    renderPreview();
    if (isClips) {
      stopAudio(true);
      renderClips();
      document.getElementById('feed-empty').classList.add('hidden');
      return;
    }

    HT.music && HT.music.stop();
    document.querySelectorAll('#clips-view video').forEach(v => { try { v.pause(); } catch (e) {} });
    const list = document.getElementById('feed-list');
    let items = posts.filter(p => p.type !== 'clip').slice().sort((a, b) => b.ts - a.ts);
    if (mode === 'following') {
      items = items.filter(p => p.author === 'me' || following.includes(p.author));
    }
    list.innerHTML = items.map(postHTML).join('');
    document.getElementById('feed-empty').classList.toggle('hidden', items.length > 0);

    const alive = new Set(items.map(p => p.id));
    audioPlayers.forEach((a, pid) => {
      if (!alive.has(pid)) { try { a.pause(); } catch (e) {} audioPlayers.delete(pid); }
    });
    bindPostEvents(list);
    bindAudio(list);
  }

  function toggleLike(p) {
    const i = p.likes.indexOf('me');
    if (i >= 0) p.likes.splice(i, 1); else p.likes.push('me');
    savePosts();
  }

  function bindPostEvents(root) {
    root.querySelectorAll('[data-like]').forEach(b => b.onclick = () => {
      const p = posts.find(x => x.id === b.dataset.like);
      toggleLike(p);
      const on = p.likes.includes('me');
      b.classList.toggle('on', on);
      const n = b.querySelector('span');
      if (n) n.textContent = p.likes.length;
      refreshProfileGrid();
    });
    root.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => {
      const p = posts.find(x => x.id === b.dataset.fav);
      const i = p.favs.indexOf('me');
      if (i >= 0) p.favs.splice(i, 1); else { p.favs.push('me'); HT.toast('⭐ Сохранено в избранное'); }
      savePosts();
      b.classList.toggle('on', p.favs.includes('me'));
      refreshProfileGrid();
    });
    root.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => {
      const p = posts.find(x => x.id === b.dataset.rs);
      if (p.repostedByMe) { HT.toast('Вы уже репостнули это'); return; }
      p.repostedByMe = true;
      p.reposts++;
      savePosts();
      b.classList.add('on');
      const n = b.querySelector('span');
      if (n) n.textContent = p.reposts;
      refreshProfileGrid();
      HT.toast('🔁 Репост опубликован!');
    });
    root.querySelectorAll('[data-share]').forEach(b => b.onclick = () => copyText(location.href));
    root.querySelectorAll('[data-comment]').forEach(b => b.onclick = () => {
      const inp = root.querySelector(`[data-cin="${b.dataset.comment}"]`);
      if (inp) { inp.focus(); inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    });
    root.querySelectorAll('[data-follow]').forEach(b => b.onclick = () => {
      const id = b.dataset.follow;
      const i = following.indexOf(id);
      if (i >= 0) { following.splice(i, 1); HT.toast('Вы отписались'); }
      else { following.push(id); HT.toast(`✅ Вы подписаны на ${P(id).name.split(' ')[0]}`); }
      saveFollowing(); renderFeed(); refreshProfileGrid();
    });
    root.querySelectorAll('[data-mplay]').forEach(b => b.onclick = () => {
      const p = posts.find(x => x.id === b.dataset.mplay);
      if (!p || !p.music) return;
      if (HT.music.current === p.music.id) {
        HT.music.stop();
        b.classList.remove('playing');
      } else {
        stopAudio(true);
        HT.music.play(p.music.id);
        root.querySelectorAll('[data-mplay]').forEach(x => x.classList.remove('playing'));
        b.classList.add('playing');
        HT.toast(`♪ ${p.music.name}`);
      }
    });
    root.querySelectorAll('[data-csend]').forEach(b => b.onclick = () => sendComment(b.dataset.csend, root));
    root.querySelectorAll('[data-cin]').forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(inp.dataset.cin, root); }
    }));
  }

  /* ================= КЛИПЫ (TikTok-вьюер, 100dvh, scroll-snap) ================= */
  let clipObserver = null;

  const CLIP_GRADS = [
    { g: 'linear-gradient(160deg,#C4693F,#8C4526)', light: false },
    { g: 'linear-gradient(160deg,#7A8B6F,#4C5A45)', light: false },
    { g: 'linear-gradient(160deg,#3A2E24,#6A5140)', light: false },
    { g: 'linear-gradient(165deg,#F7F1E7,#E2D1B9)', light: true },
    { g: 'linear-gradient(165deg,#EED9C2,#C4693F)', light: false },
    { g: 'linear-gradient(165deg,#DCE4D3,#93A684)', light: true }
  ];
  const gradOf = p => {
    const k = String(p.id);
    let s = 0;
    for (let i = 0; i < k.length; i++) s += k.charCodeAt(i);
    return CLIP_GRADS[s % CLIP_GRADS.length];
  };

  function clipHTML(p) {
    const w = who(p.author);
    const liked = p.likes.includes('me');
    const hasVid = !!p.video;
    const fa = filterAttr(p.filter);
    const media = hasVid
      ? `<video src="${p.video}" playsinline loop muted preload="metadata"${fa}></video>`
      : (p.img ? `<img class="clip-img" src="${p.img}" alt=""${fa}>` : '');
    let card = '';
    if (!hasVid) {
      const gr = gradOf(p);
      card = `<div class="clip-card ${p.img ? 'photo' : (gr.light ? 'light' : '')}" style="${p.img ? '' : `background:${gr.g}`}">
        <div class="clip-card-mark">${w.ava}</div>
        <div class="clip-card-text">${esc(p.text || 'Момент дня')}</div>
        <div class="clip-card-sub">${HT.timeAgo(p.ts)}</div>
      </div>`;
    }
    return `
    <div class="clip" data-clip="${p.id}">
      ${media}
      ${hasVid ? '<div class="clip-tint"></div>' : ''}
      ${card}
      ${hasVid || p.dur ? `<span class="clip-dur${p.dur ? '' : ' hidden'}">${p.dur ? fmtTime(p.dur) : ''}</span>` : ''}
      <div class="clip-bottom">
        <div class="clip-author"><span class="clip-ava">${w.ava}</span><b>${esc(w.name)}</b></div>
        ${p.text && hasVid ? `<div class="clip-text">${esc(p.text)}</div>` : ''}
        ${p.music ? `<div class="clip-music">${ICON.note}<span>${esc(p.music.name)}</span></div>` : ''}
      </div>
      <div class="clip-rail">
        <button data-clip-like="${p.id}" class="${liked ? 'liked' : ''}" title="Нравится">${ICON.heart}<small>${p.likes.length}</small></button>
        <button data-clip-com="${p.id}" title="Комментарии">${ICON.comment}<small>${p.comments.length}</small></button>
        <button data-clip-rs="${p.id}" title="Поделиться">${ICON.repost}<small>${p.reposts}</small></button>
        <button data-clip-sound="${p.id}" class="muted" title="Звук">${ICON.mute}<small>звук</small></button>
      </div>
      <div class="clip-progress"><i class="${hasVid ? '' : 'auto'}"></i></div>
    </div>`;
  }

  function renderClips() {
    stopAudio(true);
    HT.music && HT.music.stop();
    const wrap = document.getElementById('clips-view');
    const clips = posts.filter(p => p.type === 'clip')
      .filter(p => mode !== 'following' || p.author === 'me' || following.includes(p.author))
      .sort((a, b) => b.ts - a.ts);

    wrap.innerHTML = `
      <div class="cv-bar">
        <div class="cv-tabs">
          <button data-cv="foryou">Посты</button>
          <button class="active" data-cv="clips">Клипы</button>
          <button data-cv="following">Подписки</button>
        </div>
        <button class="cv-add" id="clip-upload" title="Новый клип">${ICON.plus}</button>
      </div>
      <div class="clips-feed" id="clips-feed">
        ${clips.length ? clips.map(clipHTML).join('') : `<div class="clips-empty">Клипов пока нет.<br>Нажмите «+», чтобы опубликовать своё видео.</div>`}
      </div>
      <div class="cv-nav">
        <button id="clip-prev" title="Предыдущий">${ICON.up}</button>
        <button id="clip-next" title="Следующий">${ICON.down}</button>
      </div>`;

    wrap.querySelectorAll('[data-cv]').forEach(b => b.onclick = () => setMode(b.dataset.cv));
    document.getElementById('clip-upload').onclick = uploadClipFlow;

    const feed = document.getElementById('clips-feed');
    const go = dir => feed.scrollBy({ top: feed.clientHeight * dir, behavior: 'smooth' });
    document.getElementById('clip-prev').onclick = () => go(-1);
    document.getElementById('clip-next').onclick = () => go(1);

    if (clipObserver) clipObserver.disconnect();
    clipObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const v = en.target.querySelector('video');
        if (en.isIntersecting && en.intersectionRatio >= 0.55) {
          feed.querySelectorAll('video').forEach(o => { if (o !== v) { try { o.pause(); } catch (e) {} } });
          if (v) { stopAudio(true); const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
        } else if (v) {
          try { v.pause(); } catch (e) {}
        }
      });
    }, { threshold: [0, 0.55] });
    feed.querySelectorAll('.clip').forEach(c => clipObserver.observe(c));

    feed.querySelectorAll('[data-clip-like]').forEach(b => b.onclick = () => {
      const p = posts.find(x => x.id === b.dataset.clipLike);
      if (!p) return;
      toggleLike(p);
      const on = p.likes.includes('me');
      b.classList.toggle('liked', on);
      const n = b.querySelector('small');
      if (n) n.textContent = p.likes.length;
    });
    feed.querySelectorAll('[data-clip-rs]').forEach(b => b.onclick = () => {
      const p = posts.find(x => x.id === b.dataset.clipRs);
      if (!p) return;
      if (p.repostedByMe) return HT.toast('Вы уже репостнули это');
      p.repostedByMe = true; p.reposts++;
      savePosts();
      const n = b.querySelector('small');
      if (n) n.textContent = p.reposts;
      HT.toast('🔁 Репост опубликован!');
    });
    feed.querySelectorAll('[data-clip-com]').forEach(b => b.onclick = () => openClipComments(b.dataset.clipCom));
    feed.querySelectorAll('[data-clip-sound]').forEach(b => b.onclick = () => {
      const v = b.closest('.clip').querySelector('video');
      if (!v) return;
      v.muted = !v.muted;
      b.classList.toggle('muted', v.muted);
      b.innerHTML = (v.muted ? ICON.mute : ICON.sound) + '<small>звук</small>';
      if (!v.muted) {
        stopAudio(true);
        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => {});
      }
    });
    feed.querySelectorAll('video').forEach(v => {
      v.onclick = () => { v.paused ? v.play().catch(() => {}) : v.pause(); };
      v.addEventListener('timeupdate', () => {
        const pr = v.parentElement.querySelector('.clip-progress i');
        if (pr && v.duration) pr.style.width = (v.currentTime / v.duration * 100) + '%';
      });
      v.addEventListener('loadedmetadata', () => {
        if (!isFinite(v.duration) || v.duration <= 0) return;
        const card = v.closest('.clip');
        const p = card && posts.find(x => x.id === card.dataset.clip);
        if (!p) return;
        if (!p.dur) {           /* длительность не была сохранена — берём из файла */
          p.dur = Math.round(v.duration);
          savePosts();
        }
        const badge = card.querySelector('.clip-dur');
        if (badge) { badge.textContent = fmtTime(p.dur); badge.classList.remove('hidden'); }
      });
    });
    document.getElementById('feed-empty').classList.add('hidden');
  }

  function openClipComments(pid) {
    const p = posts.find(x => x.id === pid);
    if (!p) return;
    stopAudio(true);
    HT.music && HT.music.stop();
    const st = replyState[p.id];
    HT.openModal(`
      <div class="m-title">Комментарии <button class="m-close">✕</button></div>
      <div class="cmts" data-cmts="${p.id}">
        <div class="cmt-threads">${threadHTML(p)}</div>
        <div class="reply-box ${st ? '' : 'hidden'}" data-replybox="${p.id}">${st ? replyBoxInner(p.id, st) : ''}</div>
        <div class="comment-input">
          <input placeholder="Комментировать…" data-cin="${p.id}" maxlength="300">
          <button class="c-send" data-csend="${p.id}" title="Отправить">${ICON.send}</button>
        </div>
      </div>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = () => { HT.closeModal(); renderClips(); };
    box.querySelectorAll('[data-csend]').forEach(b => b.onclick = () => { sendComment(b.dataset.csend, box); });
    box.querySelectorAll('[data-cin]').forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(inp.dataset.cin, box); }
    }));
  }

  /* ================= ВИДЕО: меню, выбор файла, запись с камеры ================= */
  const VIDEO_MAX = 180;                 /* 3:00 — жёсткий лимит записи */
  const REC_LIMIT = 3.5 * 1024 * 1024;   /* >3.5 МБ — только сессионная ссылка */

  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      try {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(r.error || new Error('read'));
        r.readAsDataURL(blob);
      } catch (e) { rej(e); }
    });
  }

  /* длительность файла (сек) — по metadata, с таймаутом */
  function probeDuration(url, cb) {
    const v = document.createElement('video');
    let done = false;
    const finish = n => { if (done) return; done = true; try { v.removeAttribute('src'); v.load(); } catch (e) {} cb(n); };
    v.preload = 'metadata';
    v.onloadedmetadata = () => finish(isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration) : 0);
    v.onerror = () => finish(0);
    setTimeout(() => finish(0), 4000);
    try { v.src = url; } catch (e) { finish(0); }
  }

  function pickMime() {
    const list = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=h264,aac', 'video/mp4'];
    for (let i = 0; i < list.length; i++) {
      try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) {}
    }
    return '';
  }

  /* файл с телефона → { url, session, dur, filter } */
  function pickVideoFile(onResult) {
    HT.pickFile('video/*', f => {
      if (f.size > VIDEO_LIMIT) return HT.toast('Видео слишком большое (до 4 МБ)');
      const r = new FileReader();
      r.onerror = () => HT.toast('Не удалось прочитать видео');
      r.onload = () => {
        const url = r.result;
        probeDuration(url, d => onResult({ url, session: false, dur: d, filter: '' }));
      };
      try { r.readAsDataURL(f); } catch (e) { HT.toast('Не удалось прочитать видео'); }
    });
  }

  /* маленькое меню: «Снять видео» / «Выбрать с телефона» */
  function openVideoMenu(onResult) {
    HT.openModal(`
      <div class="m-title">Видео <button class="m-close">✕</button></div>
      <button type="button" class="vm-item" id="vm-rec">
        <span class="vm-ic">🎥</span>
        <b>Снять видео</b>
        <small>камера прямо здесь · до 3 минут · фильтры</small>
      </button>
      <button type="button" class="vm-item" id="vm-pick">
        <span class="vm-ic">📁</span>
        <b>Выбрать с телефона</b>
        <small>файл из галереи · до 4 МБ</small>
      </button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelector('#vm-rec').onclick = () => openRecorder(onResult);
    box.querySelector('#vm-pick').onclick = () => pickVideoFile(res => {
      HT.closeModal();
      onResult(res);
    });
  }

  /* ---- глобальная «аварийка» рекордера: закрытие модалки / смена вкладки ---- */
  let recAbort = null;

  /* ================= ПОЛНОЭКРАННЫЙ РЕКОРДЕР (TikTok) ================= */
  function openRecorder(onDone) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      HT.toast('Нет доступа к камере');
      return;
    }
    const modal = document.getElementById('modal');
    const boxEl = document.getElementById('modal-box');

    let facing = 'user';
    let filter = '';
    let state = 'idle';           /* idle → cam → rec → preview */
    let stream = null, recorder = null, chunks = [];
    let t0 = 0, timer = null, dur = 0, prevUrl = '', prevBlob = null, used = false, closed = false;

    const $ = id => document.getElementById(id);
    const led = on => { const l = $('vrec-led'); if (l) l.classList.toggle('on', !!on); };

    HT.openModal(`
      <div class="vrec">
        <div class="vrec-top">
          <button type="button" class="vrec-x" id="vrec-cancel" title="Отмена — остановить и закрыть">✕ Отмена</button>
          <div class="vrec-clock" id="vrec-time"><b>0:00</b><span>/ 3:00</span></div>
          <span class="vrec-led" id="vrec-led" aria-hidden="true"></span>
        </div>
        <div class="vrec-stage">
          <video id="vrec-live" autoplay muted playsinline></video>
          <video id="vrec-preview" class="hidden" playsinline muted loop controls></video>
          <div class="vrec-guide" aria-hidden="true"></div>
          <div class="vrec-hint" id="vrec-hint">Просим доступ к камере…</div>
        </div>
        <div class="vrec-progress"><i id="vrec-bar"></i></div>
        <div class="vrec-filters hidden" id="vrec-fl">${filterStripHTML('')}</div>
        <div class="vrec-bottom">
          <button type="button" class="vrec-side" id="vrec-flip" title="Сменить камеру">
            <svg viewBox="0 0 24 24"><path d="M4 9.5a8 8 0 0 1 13.6-3.4L20 8.4"/><path d="M20 4.6V9h-4.4"/><path d="M20 14.5a8 8 0 0 1-13.6 3.4L4 15.6"/><path d="M4 19.4V15h4.4"/></svg>
            <span>Камера</span>
          </button>
          <button type="button" class="vrec-shutter" id="vrec-shutter" title="Запись"><i></i></button>
          <button type="button" class="vrec-side" id="vrec-fbtn" title="Фильтры">
            <svg viewBox="0 0 24 24"><path d="M4 7.5h7M17.5 7.5H20M4 16.5h3.5M14 16.5h6"/><circle cx="13.8" cy="7.5" r="2.6"/><circle cx="10.4" cy="16.5" r="2.6"/></svg>
            <span>Фильтры</span>
          </button>
        </div>
        <div class="vrec-actions hidden" id="vrec-actions">
          <button type="button" class="btn-ghost" id="vrec-again">↻ Записать заново</button>
          <button type="button" class="btn-primary" id="vrec-use">Использовать</button>
        </div>
      </div>`);
    modal.classList.add('vrec-mode');
    boxEl.classList.add('vrec-mode');

    const hint = t => { const h = $('vrec-hint'); if (h) h.textContent = t; };
    const setFilter = f => {
      filter = f || '';
      ['vrec-live', 'vrec-preview'].forEach(id => { const v = $(id); if (v) v.style.filter = filter || 'none'; });
    };

    function stopTracks() {
      if (stream) {
        stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
        stream = null;
      }
      const v = $('vrec-live');
      if (v) { try { v.srcObject = null; } catch (e) {} }
    }

    function shutdown() {
      closed = true;
      state = 'closed';
      clearInterval(timer); timer = null;
      if (recorder) { try { recorder.onstop = null; recorder.ondataavailable = null; recorder.stop(); } catch (e) {} recorder = null; }
      stopTracks();
      if (prevUrl && !used) { try { URL.revokeObjectURL(prevUrl); } catch (e) {} }
      prevUrl = ''; prevBlob = null; chunks = [];
      recAbort = null;
      modal.classList.remove('vrec-mode');
      boxEl.classList.remove('vrec-mode');
      HT.closeModal();
    }

    async function openCam() {
      stopTracks();
      hint('Запрашиваем камеру…');
      const vc = { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } };
      let s = null;
      try {
        try { s = await navigator.mediaDevices.getUserMedia({ video: vc, audio: true }); }
        catch (e) { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } }); }
      } catch (e) {
        HT.toast('Нет доступа к камере');
        if (!closed) shutdown();
        return;
      }
      if (closed) {   /* пользователь уже закрыл рекордер, пока ждали разрешение */
        try { s.getTracks().forEach(t => t.stop()); } catch (e) {}
        return;
      }
      stream = s;
      const v = $('vrec-live');
      if (v) {
        v.srcObject = stream;
        v.classList.toggle('mirror', facing === 'user');   /* селфи как в TikTok */
        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => {});
      }
      state = 'cam';
      led(false);
      hint('Нажмите ● и снимайте до 3 минут');
      const sh = $('vrec-shutter');
      if (sh) sh.classList.remove('recording', 'busy');
      const fl = $('vrec-flip');
      if (fl) fl.classList.remove('busy');
      const fb = $('vrec-fbtn');
      if (fb) fb.classList.remove('busy');
      if (filter) setFilter(filter);
    }

    function tick() {
      const e = (Date.now() - t0) / 1000;
      const box = $('vrec-time');
      if (box) {
        box.querySelector('b').textContent = fmtTime(Math.min(e, VIDEO_MAX));
        box.classList.toggle('warn', e >= VIDEO_MAX - 10);
      }
      const bar = $('vrec-bar');
      if (bar) bar.style.width = Math.min(100, e / VIDEO_MAX * 100) + '%';
      if (e >= VIDEO_MAX) finishRec();
    }

    function startRec() {
      if (state === 'recording') return;
      if (!stream) { openCam(); return; }
      chunks = [];
      const mime = pickMime();
      try {
        recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch (e) {
        try { recorder = new MediaRecorder(stream); } catch (e2) { HT.toast('Не удалось записать видео'); return; }
      }
      recorder.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
      recorder.onstop = onRecStop;
      try { recorder.start(); } catch (e) { recorder = null; HT.toast('Не удалось записать видео'); return; }
      state = 'recording';
      t0 = Date.now();
      led(true);
      const sh = $('vrec-shutter');
      if (sh) sh.classList.add('recording');
      const fl = $('vrec-flip');
      if (fl) fl.classList.add('busy');
      const flt = $('vrec-fbtn');
      if (flt) flt.classList.add('busy');
      const flw = $('vrec-fl');
      if (flw) flw.classList.add('hidden');
      hint('Идёт запись… нажмите ● чтобы остановить');
      clearInterval(timer);
      timer = setInterval(tick, 150);
      tick();
    }

    function finishRec() {
      if (state !== 'recording') return;
      state = 'stopping';
      clearInterval(timer); timer = null;
      const r = recorder;
      if (r && r.state !== 'inactive') {
        try { r.stop(); } catch (e) { onRecStop(); return; }
        /* страховка: если onstop не пришёл */
        setTimeout(() => { if (state === 'stopping') onRecStop(); }, 900);
      } else onRecStop();
    }

    function onRecStop() {
      if (state !== 'stopping') return;   /* повторный вызов — игнорируем */
      dur = Math.max(1, Math.min(VIDEO_MAX, Math.round((Date.now() - t0) / 1000)));
      const type = (recorder && recorder.mimeType) || 'video/webm';
      try { prevBlob = new Blob(chunks, { type }); } catch (e) { prevBlob = null; }
      chunks = []; recorder = null;
      try { prevUrl = prevBlob ? URL.createObjectURL(prevBlob) : ''; } catch (e) { prevUrl = ''; }
      stopTracks();
      showPreview();
    }

    function showPreview() {
      state = 'preview';
      led(false);
      const live = $('vrec-live'), pv = $('vrec-preview');
      if (!prevUrl || !pv) {
        HT.toast('Не удалось записать видео');
        shutdown();
        return;
      }
      if (live) live.classList.add('hidden');
      pv.src = prevUrl;
      pv.style.filter = filter || 'none';
      pv.classList.remove('hidden');
      const sh = $('vrec-shutter');
      if (sh) sh.classList.add('hidden');
      const flw = $('vrec-fl');
      if (flw) flw.classList.remove('hidden');   /* фильтр можно поменять после записи */
      const fl = $('vrec-flip');
      if (fl) fl.classList.add('busy');
      const acts = $('vrec-actions');
      if (acts) acts.classList.remove('hidden');
      const bar = $('vrec-bar');
      if (bar) bar.style.width = '100%';
      const box = $('vrec-time');
      if (box) { box.querySelector('b').textContent = fmtTime(dur); box.classList.remove('warn'); }
      hint(`Готово: ${fmtTime(dur)} из 3:00`);
      const useBtn = $('vrec-use');
      if (useBtn && !useBtn.dataset.bound) {
        useBtn.dataset.bound = '1';
        useBtn.onclick = useRecording;
      }
      const again = $('vrec-again');
      if (again && !again.dataset.bound) {
        again.dataset.bound = '1';
        again.onclick = () => {
          if (prevUrl) { try { URL.revokeObjectURL(prevUrl); } catch (e) {} }
          prevUrl = ''; prevBlob = null; dur = 0;
          if (pv) { pv.pause(); pv.removeAttribute('src'); pv.load(); pv.classList.add('hidden'); }
          const live2 = $('vrec-live');
          if (live2) live2.classList.remove('hidden');
          const acts2 = $('vrec-actions');
          if (acts2) acts2.classList.add('hidden');
          const sh2 = $('vrec-shutter');
          if (sh2) sh2.classList.remove('hidden', 'recording');
          const flw2 = $('vrec-fl');
          if (flw2) flw2.classList.remove('hidden');
          const time = $('vrec-time');
          if (time) { time.querySelector('b').textContent = '0:00'; time.classList.remove('warn'); }
          const bar2 = $('vrec-bar');
          if (bar2) bar2.style.width = '0%';
          state = 'idle';
          openCam();
        };
      }
    }

    async function useRecording() {
      if (!prevBlob || !prevUrl) return;
      let url = prevUrl, session = false, ok = false;
      try {
        if (prevBlob.size <= REC_LIMIT) { url = await blobToDataURL(prevBlob); ok = true; }
      } catch (e) { ok = false; }
      if (ok) { used = false; session = false; }   /* data URL — blob URL уже не нужен */
      else { used = true; session = true; HT.toast('🎬 видео будет только в этой сессии'); }
      const res = { url, session, dur, filter };
      shutdown();
      onDone(res);
    }

    /* ---- биндинги ---- */
    $('vrec-cancel').onclick = shutdown;
    $('vrec-shutter').onclick = () => { if (state === 'recording') finishRec(); else if (state === 'cam') startRec(); };
    $('vrec-fbtn').onclick = () => {
      const fl = $('vrec-fl');
      if (fl) fl.classList.toggle('hidden');
    };
    $('vrec-flip').onclick = () => {
      if (state === 'recording' || state === 'stopping') return;
      facing = facing === 'user' ? 'environment' : 'user';
      if (state === 'preview') return;
      openCam();
    };
    bindFilterStrip($('vrec-fl'), f => setFilter(f));
    recAbort = () => {
      if (state === 'recording') finishRec();          /* сохраняем записанное */
      else if (state === 'preview') stopTracks(); /* превью уже без камеры */
      else shutdown();
    };
    openCam();
  }

  function uploadClipFlow() {
    openVideoMenu(res => openClipPublish(res));
  }

  /* публикация клипа: превью + фильтр + подпись + dur */
  function openClipPublish(res) {
    let filter = res.filter || '';
    let dur = res.dur || 0;
    HT.openModal(`
      <div class="m-title">Новый клип <button class="m-close">✕</button></div>
      <video class="uc-prev" src="${res.url}" controls playsinline${filterAttr(filter)}></video>
      <div class="m-label">Фильтр</div>
      <div class="fl-wrap">${filterStripHTML(filter)}</div>
      <div class="m-label">Подпись</div>
      <input class="field" id="uc-text" placeholder="О чём клип?" maxlength="140">
      <button class="btn-primary wide" id="uc-go">Опубликовать клип</button>`);
    const box = document.getElementById('modal-box');
    const prev = box.querySelector('.uc-prev');
    box.querySelector('.m-close').onclick = () => { try { prev.pause(); } catch (e) {} HT.closeModal(); };
    bindFilterStrip(box, f => { filter = f; prev.style.filter = f || 'none'; });
    prev.addEventListener('loadedmetadata', () => {
      if (!dur && isFinite(prev.duration) && prev.duration > 0) dur = Math.round(prev.duration);
    });
    box.querySelector('#uc-go').onclick = () => {
      const text = box.querySelector('#uc-text').value.trim();
      const data = { type: 'clip', video: res.url, img: null, text, tags: ['клип'], music: null, dur: dur || 0 };
      if (filter) data.filter = filter;
      if (res.session) data.videoSession = true;
      try { prev.pause(); } catch (e) {}
      publishPost(data);
    };
  }

  /* ================= КОМПОЗЕР ================= */
  const PLATES = [
    { id: 'v1', label: 'Крем' }, { id: 'v2', label: 'Шалфей' }, { id: 'v3', label: 'Ночь' },
    { id: 'v4', label: 'Терракота' }, { id: 'v5', label: 'Лес' }
  ];
  function musicPickerHTML(sel) {
    return `<div class="m-label">Музыка (офлайн)</div>
      <div class="music-pick" id="mpick">
        <button class="${!sel ? 'sel' : ''}" data-m="">Без музыки</button>
        ${HT.music.tracks().map(t => `<button class="${sel === t.id ? 'sel' : ''}" data-m="${t.id}">${t.name}</button>`).join('')}
      </div>`;
  }
  function bindMusicPicker(box, get, set) {
    box.querySelectorAll('#mpick button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#mpick button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      const id = b.dataset.m;
      set(id ? HT.music.tracks().find(t => t.id === id) : null);
      if (id) { stopAudio(true); HT.music.play(id); HT.toast('♪ Прослушивание — нажмите «Без музыки», чтобы остановить'); }
      else HT.music.stop();
    });
  }

  function openComposer(kind) {
    if (kind === 'text') return openTextComposer();
    if (kind === 'clip') return openClipComposer();
    return openPhotoComposer();
  }
  HT.openComposer = openComposer;

  function publishPost(data) {
    posts.push(Object.assign({
      id: HT.uid(), author: 'me', tags: [], likes: [], favs: [], reposts: 0,
      views: 10 + Math.floor(Math.random() * 50), comments: [],
      reactions: {}, myReaction: null, ts: Date.now()
    }, data));
    savePosts();
    const followers = HT.get('followers', []);
    if (!followers.length && HT.get('totalPosts', 0) === 0) {
      HT.set('followers', ['u1', 'u3']);
      setTimeout(() => HT.toast('🌸 Алина и София подписались на вас!'), 1400);
    }
    HT.set('totalPosts', (HT.get('totalPosts', 0)) + 1);
    HT.closeModal();
    HT.music && HT.music.stop();
    setMode(data.type === 'clip' ? 'clips' : 'foryou');
    refreshProfileGrid();
    HT.toast('🎉 Опубликовано!');
  }

  function openTextComposer() {
    let plate = 'v1', music = null;
    HT.openModal(`
      <div class="m-title">Текстовый пост <button class="m-close">✕</button></div>
      <div class="m-label">Оформление</div>
      <div class="music-pick" id="plate-pick">
        ${PLATES.map((p, i) => `<button class="${i === 0 ? 'sel' : ''}" data-v="${p.id}"><span class="pt-plate ${p.id}" style="display:inline-block;width:22px;height:22px;border-radius:7px;padding:0;vertical-align:-6px"></span> ${p.label}</button>`).join('')}
      </div>
      <div class="m-label">Текст</div>
      <textarea class="field" id="tp-text" rows="4" placeholder="Мысль, цитата, план на день…" maxlength="600"></textarea>
      <div class="m-label">Хештеги (через пробел)</div>
      <input class="field" id="tp-tags" placeholder="вдохновение мысли">
      ${musicPickerHTML(null)}
      <button class="btn-primary wide" id="tp-go">Опубликовать</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = () => { HT.music && HT.music.stop(); HT.closeModal(); };
    box.querySelectorAll('#plate-pick button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#plate-pick button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); plate = b.dataset.v;
    });
    bindMusicPicker(box, () => music, m => music = m);
    box.querySelector('#tp-go').onclick = () => {
      const text = box.querySelector('#tp-text').value.trim();
      if (!text) return HT.toast('Напишите текст поста');
      const tags = box.querySelector('#tp-tags').value.trim().split(/[\s,]+/).filter(Boolean).slice(0, 8);
      publishPost({ type: 'text', plate, text, tags, music });
    };
  }

  function openPhotoComposer() {
    let img = null, music = null, filter = '';
    HT.openModal(`
      <div class="m-title">Новая запись <button class="m-close">✕</button></div>
      <div class="m-row">
        <button class="btn-ghost" id="np-photo" style="margin:0">Фото</button>
        <span class="tiny" id="np-info" style="align-self:center">или выберите пейзаж ниже</span>
      </div>
      <div class="bg-picker" id="np-land">${IMAGES.map(i => `<button class="bg-chip" data-img="${i}">${i.split('/')[1].replace('.svg', '')}</button>`).join('')}</div>
      <div class="fl-wrap hidden" id="np-fl">${filterStripHTML('')}</div>
      <div class="m-label">Подпись</div>
      <textarea class="field" id="np-text" rows="3" placeholder="Расскажите что-нибудь…" maxlength="400"></textarea>
      <div class="m-label">Хештеги (через пробел)</div>
      <input class="field" id="np-tags" placeholder="природа настроение кофе">
      ${musicPickerHTML(null)}
      <button class="btn-primary wide" id="np-go">Опубликовать</button>`);
    const box = document.getElementById('modal-box');
    const flWrap = box.querySelector('#np-fl');
    const showFilters = () => flWrap.classList.remove('hidden');
    bindFilterStrip(flWrap, f => filter = f);
    box.querySelector('.m-close').onclick = () => { HT.music && HT.music.stop(); HT.closeModal(); };
    box.querySelector('#np-photo').onclick = () => HT.pickFile('image/*', f => {
      if (f.size > 6e6) return HT.toast('Фото слишком большое');
      HT.resizeImage(f, u => { img = u; showFilters(); document.getElementById('np-info').textContent = '✅ Фото готово'; });
    });
    box.querySelectorAll('[data-img]').forEach(b => b.onclick = () => {
      box.querySelectorAll('[data-img]').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); img = b.dataset.img;
      showFilters();
      document.getElementById('np-info').textContent = '✅ Пейзаж выбран';
    });
    bindMusicPicker(box, () => music, m => music = m);
    box.querySelector('#np-go').onclick = () => {
      const text = document.getElementById('np-text').value.trim();
      const tags = document.getElementById('np-tags').value.trim().split(/[\s,]+/).filter(Boolean).slice(0, 8);
      if (!text && !img) return HT.toast('Добавьте фото или подпись');
      const data = { type: 'photo', img: img || 'bg/meadow.svg', text, tags, music };
      if (filter) data.filter = filter;
      publishPost(data);
    };
  }

  function openClipComposer(pre) {
    pre = pre || {};
    let video = pre.video || null, img = pre.img || null, music = null;
    let filter = pre.filter || '', dur = pre.dur || 0;
    HT.openModal(`
      <div class="m-title">Новый клип <button class="m-close">✕</button></div>
      <div class="m-row">
        <button class="btn-ghost" id="cp-video" style="margin:0">🎥 Видео / снять</button>
        <button class="btn-ghost" id="cp-photo" style="margin:0">Фото-клип</button>
      </div>
      <p class="tiny" id="cp-info">Снимите видео камерой (до 3 минут) или выберите файл; фото-клип — красивая заставка с музыкой.</p>
      <div class="fl-wrap ${video || img ? '' : 'hidden'}" id="cp-fl">${filterStripHTML(filter)}</div>
      <div class="m-label">Подпись</div>
      <input class="field" id="cp-text" placeholder="О чём клип?" maxlength="120">
      ${musicPickerHTML(null)}
      <button class="btn-primary wide" id="cp-go">Опубликовать клип</button>`);
    const box = document.getElementById('modal-box');
    const flWrap = box.querySelector('#cp-fl');
    const showFilters = () => flWrap.classList.remove('hidden');
    const info = box.querySelector('#cp-info');
    bindFilterStrip(flWrap, f => { filter = f; });
    if (video) info.textContent = `✅ Видео готово (${fmtTime(dur)})${pre.session ? ' · только в этой сессии' : ''}`;
    else if (img) info.textContent = '✅ Фото для клипа готово';
    box.querySelector('.m-close').onclick = () => { HT.music && HT.music.stop(); HT.closeModal(); };
    box.querySelector('#cp-video').onclick = () => openVideoMenu(res =>
      openClipComposer({ video: res.url, dur: res.dur, filter: res.filter, session: res.session }));
    box.querySelector('#cp-photo').onclick = () => HT.pickFile('image/*', f => {
      if (f.size > 6e6) return HT.toast('Фото слишком большое');
      HT.resizeImage(f, u => { img = u; video = null; dur = 0; showFilters(); info.textContent = '✅ Фото для клипа готово'; }, 800);
    });
    bindMusicPicker(box, () => music, m => music = m);
    box.querySelector('#cp-go').onclick = () => {
      const text = box.querySelector('#cp-text').value.trim();
      if (!video && !img) return HT.toast('Выберите видео или фото');
      const data = { type: 'clip', video, img: img || null, text, tags: ['клип'], music, dur: video ? (dur || 0) : 0 };
      if (filter) data.filter = filter;
      publishPost(data);
    };
  }

  /* ================= БЫСТРЫЙ КОМПОЗЕР ================= */
  const quick = document.getElementById('quick-post');
  let qPhoto = null;
  let qAudio = null;   /* { name, url, session } */
  let qVideo = null;   /* { url, session, dur } */
  let qStyle = { plate: '', font: 'serif', tags: [], music: null };
  let qFilter = '';    /* CSS-пресет медиа, '' — без фильтра */
  let qpBarOpen = false;

  /* кнопка «Фильтры» рядом с #qp-style + полоса пресетов под композером */
  const qpFiltersBtn = document.createElement('button');
  qpFiltersBtn.type = 'button';
  qpFiltersBtn.className = 'btn-round qp-fl';
  qpFiltersBtn.id = 'qp-filters';
  qpFiltersBtn.title = 'Фильтры';
  qpFiltersBtn.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><path d="M4 7.5h6.5M17 7.5h3M4 16.5h3.5M14 16.5h6"/><circle cx="13.6" cy="7.5" r="2.6"/><circle cx="10.6" cy="16.5" r="2.6"/></svg>';

  const qpFilterBar = document.createElement('div');
  qpFilterBar.id = 'qp-filterbar';
  qpFilterBar.className = 'hidden';
  qpFilterBar.innerHTML = filterStripHTML('');

  const qpRow = document.getElementById('composer-row');
  const qpStyleBtn = document.getElementById('qp-style');
  if (qpRow && qpStyleBtn) qpRow.insertBefore(qpFiltersBtn, qpStyleBtn);
  if (qpRow && qpRow.parentNode) qpRow.parentNode.insertBefore(qpFilterBar, qpRow.nextSibling);
  bindFilterStrip(qpFilterBar, f => { qFilter = f; renderPreview(); });

  qpFiltersBtn.onclick = () => {
    if (!qPhoto && !qVideo) return HT.toast('Сначала добавьте фото или видео');
    qpBarOpen = !qpBarOpen;
    qpFilterBar.classList.toggle('hidden', !qpBarOpen);
    if (qpBarOpen) syncStrip(qpFilterBar, qFilter);
  };

  const fontOf = f => f === 'mono'
    ? "'Courier New', ui-monospace, monospace"
    : f === 'sans' ? 'system-ui, -apple-system, sans-serif'
    : "Georgia, 'Iowan Old Style', serif";

  function renderPreview() {
    const box = document.getElementById('qp-preview');
    if (!box) return;
    const hasMedia = !!(qPhoto || qVideo);
    if (!hasMedia) {
      qpBarOpen = false;
      if (qFilter) { qFilter = ''; syncStrip(qpFilterBar, ''); }
    }
    if (qpFiltersBtn) qpFiltersBtn.classList.toggle('hidden', !hasMedia);
    if (qpFilterBar) qpFilterBar.classList.toggle('hidden', !hasMedia || !qpBarOpen);
    const empty = !qPhoto && !qVideo && !qAudio && !qStyle.plate && !qStyle.music &&
      !qStyle.tags.length && qStyle.font === 'serif';
    if (empty) {
      box.classList.add('hidden'); box.innerHTML = '';
      return;
    }
    box.classList.remove('hidden');
    box.innerHTML =
      (qPhoto ? `<span class="qp-chip chip-photo"><img src="${qPhoto}"${qFilter ? ` style="filter:${esc(qFilter)}"` : ''}><button data-clear="photo" title="Убрать фото">${ICON.close}</button></span>` : '') +
      (qVideo ? `<span class="qp-chip chip-video">${ICON.video} Видео${qVideo.dur ? ' · ' + fmtTime(qVideo.dur) : ''}${qVideo.session ? ' · сессия' : ''}<button data-clear="video" title="Убрать видео">${ICON.close}</button></span>` : '') +
      (qAudio ? `<span class="qp-chip chip-audio">${ICON.note}<em>${esc(qAudio.name)}</em>${qAudio.session ? '<b>сессия</b>' : ''}<button data-clear="audio" title="Убрать звук">${ICON.close}</button></span>` : '') +
      (qFilter ? `<span class="qp-chip chip-fl">◐ ${esc(filterName(qFilter))}<button data-clear="filter" title="Убрать фильтр">${ICON.close}</button></span>` : '') +
      `<span class="qp-chip" data-edit="style">Aa ${qStyle.font === 'mono' ? 'Машинка' : qStyle.font === 'sans' ? 'Без засечек' : 'Serif'}${qStyle.plate ? ' · фон' : ''}${qStyle.tags.length ? ' · ' + qStyle.tags.length + ' хештег' : ''}</span>` +
      (qStyle.music ? `<span class="qp-chip">${ICON.note} ${esc(qStyle.music.name)}<button data-clear="music" title="Убрать музыку">${ICON.close}</button></span>` : '');
    box.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => {
      const k = b.dataset.clear;
      if (k === 'photo') qPhoto = null;
      if (k === 'video') qVideo = null;
      if (k === 'audio') qAudio = null;
      if (k === 'filter') { qFilter = ''; syncStrip(qpFilterBar, ''); }
      if (k === 'music') { qStyle.music = null; HT.music.stop(); }
      renderPreview();
    });
    const edit = box.querySelector('[data-edit="style"]');
    if (edit) edit.onclick = openStyleModal;
  }

  function openStyleModal() {
    HT.openModal(`
      <div class="m-title">Оформление поста <button class="m-close">✕</button></div>
      <div class="m-label">Фон текста</div>
      <div class="music-pick" id="cs-plate">
        <button class="${!qStyle.plate ? 'sel' : ''}" data-v="">Без фона</button>
        ${PLATES.map(p => `<button class="${qStyle.plate === p.id ? 'sel' : ''}" data-v="${p.id}"><span class="pt-plate ${p.id}" style="display:inline-block;width:20px;height:20px;border-radius:6px;padding:0;vertical-align:-5px"></span> ${p.label}</button>`).join('')}
      </div>
      <div class="m-label">Шрифт</div>
      <div class="music-pick" id="cs-font">
        <button class="${qStyle.font === 'serif' ? 'sel' : ''}" data-f="serif" style="font-family:Georgia,serif">Serif</button>
        <button class="${qStyle.font === 'sans' ? 'sel' : ''}" data-f="sans" style="font-family:system-ui">Sans</button>
        <button class="${qStyle.font === 'mono' ? 'sel' : ''}" data-f="mono" style="font-family:'Courier New',monospace">Машинка</button>
      </div>
      <div class="m-label">Хештеги (через пробел)</div>
      <input class="field" id="cs-tags" value="${qStyle.tags.join(' ')}" placeholder="настроение вдохновение">
      ${musicPickerHTML(qStyle.music ? qStyle.music.id : null)}
      <button class="btn-primary wide" id="cs-save">Готово</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = () => { HT.music.stop(); HT.closeModal(); };
    let plate = qStyle.plate, font = qStyle.font, music = qStyle.music;
    box.querySelectorAll('#cs-plate button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#cs-plate button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); plate = b.dataset.v;
    });
    box.querySelectorAll('#cs-font button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#cs-font button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); font = b.dataset.f;
    });
    bindMusicPicker(box, () => music, m => music = m);
    box.querySelector('#cs-save').onclick = () => {
      qStyle.plate = plate;
      qStyle.font = font;
      qStyle.music = music;
      qStyle.tags = box.querySelector('#cs-tags').value.trim().split(/[\s,]+/).filter(Boolean).slice(0, 8);
      HT.music.stop();
      HT.closeModal();
      renderPreview();
    };
  }

  document.getElementById('qp-photo').onclick = () => HT.pickFile('image/*', f => {
    if (f.size > 6e6) return HT.toast('Фото слишком большое');
    HT.resizeImage(f, u => { qPhoto = u; qpBarOpen = true; renderPreview(); HT.toast('Фото добавлено'); });
  });

  /* звук с телефона: data URL, >3.5 МБ или квота → сессионная ссылка */
  document.getElementById('qp-music').onclick = () => HT.pickFile('audio/*', f => {
    const name = (f.name || 'Трек').replace(/\.[^.]+$/, '');
    const session = () => {
      qAudio = { name, url: URL.createObjectURL(f), session: true };
      renderPreview();
      HT.toast(SESSION_NOTE);
    };
    if (f.size > AUDIO_LIMIT) return session();
    try {
      const r = new FileReader();
      r.onerror = session;
      r.onload = () => {
        /* проверка квоты localStorage заранее */
        try {
          localStorage.setItem('ht_quota_probe', '1');
          localStorage.removeItem('ht_quota_probe');
        } catch (e) { return session(); }
        qAudio = { name, url: r.result, session: false };
        renderPreview();
        HT.toast(`🎵 «${name}» добавлен`);
      };
      r.readAsDataURL(f);
    } catch (e) { session(); }
  });

  /* видео: меню «Снять видео» (камера, до 3:00) / «Выбрать с телефона» */
  document.getElementById('qp-video').onclick = () => openVideoMenu(res => {
    qVideo = { url: res.url, session: !!res.session, dur: res.dur || 0 };
    qFilter = res.filter || '';
    qpBarOpen = true;
    renderPreview();
    syncStrip(qpFilterBar, qFilter);
    HT.toast(res.session ? '🎬 видео будет только в этой сессии' : `🎞 Видео добавлено${qVideo.dur ? ' · ' + fmtTime(qVideo.dur) : ''}`);
  });

  document.getElementById('qp-style').onclick = openStyleModal;

  document.getElementById('qp-go').onclick = () => {
    const text = quick.value.trim();
    if (!text && !qPhoto && !qAudio && !qVideo) return HT.toast('Напишите текст или добавьте фото, звук или видео');
    const tags = qStyle.tags;
    const type = qVideo ? 'video' : (qPhoto ? 'photo' : 'text');
    const p = {
      id: HT.uid(), author: 'me',
      type,
      img: qPhoto || null, plate: qStyle.plate, font: qStyle.font, music: qStyle.music,
      video: qVideo ? qVideo.url : null,
      videoSession: qVideo ? !!qVideo.session : false,
      audio: qAudio ? qAudio.url : null,
      audioName: qAudio ? qAudio.name : '',
      audioSession: qAudio ? !!qAudio.session : false,
      text, tags, likes: [], favs: [], reposts: 0,
      views: 10 + Math.floor(Math.random() * 50), comments: [],
      reactions: {}, myReaction: null, ts: Date.now()
    };
    if (qVideo && qVideo.dur) p.dur = qVideo.dur;
    if (qFilter) p.filter = qFilter;   /* пустой фильтр — поле не пишем */
    posts.push(p);
    savePosts();
    const followers = HT.get('followers', []);
    if (!followers.length && HT.get('totalPosts', 0) === 0) {
      HT.set('followers', ['u1', 'u3']);
      setTimeout(() => HT.toast('Алина и София подписались на вас!'), 1400);
    }
    HT.set('totalPosts', (HT.get('totalPosts', 0)) + 1);
    quick.value = '';
    qPhoto = null;
    qAudio = null;
    qVideo = null;
    qFilter = '';
    qStyle = { plate: '', font: 'serif', tags: [], music: null };
    renderPreview();
    setMode('foryou');
    refreshProfileGrid();
    HT.toast('Пост опубликован');
  };
  quick.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('qp-go').click(); }
  });

  function refreshProfileGrid() { if (HT.refreshProfile) HT.refreshProfile(); }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('#tab-feed .feed-tab').forEach(x =>
      x.classList.toggle('active', x.dataset.feed === m));
    renderFeed();
  }

  document.querySelectorAll('#tab-feed .feed-tab').forEach(b => b.onclick = () => setMode(b.dataset.feed));

  /* при уходе из вкладки — гасим видео клипов */
  document.addEventListener('click', e => {
    if (e.target.closest('.nav-btn, [data-go], [data-back]')) {
      document.querySelectorAll('#clips-view video').forEach(v => { try { v.pause(); } catch (err) {} });
      if (recAbort) recAbort();
    }
  }, true);

  /* рекордер: камера обязана освободиться при закрытии модалки,
     смене вкладки и уходе со страницы */
  const recModal = document.getElementById('modal');
  if (window.MutationObserver && recModal) {
    new MutationObserver(() => {
      if (recModal.classList.contains('hidden') && typeof recAbort === 'function') {
        const fn = recAbort;
        recAbort = null;
        fn();
      }
    }).observe(recModal, { attributes: true, attributeFilter: ['class'] });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && recAbort) recAbort();
  });
  window.addEventListener('pagehide', () => { if (recAbort) recAbort(); });

  HT.onShow['tab-feed'] = () => { renderStories(); renderFeed(); };
  window.__feedStopMusic = () => { stopAudio(true); HT.music && HT.music.stop(); };

  /* экспорт для других модулей */
  HT.posts = () => posts;
  HT.renderFeed = renderFeed;

  renderStories();
  renderFeed();
})();
