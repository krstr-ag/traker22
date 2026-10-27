/* ===== ЯДРО: хранилище, темы, навигация, аккаунт, редакторы ===== */
const HT = (() => {

  /* ---------- хранилище ---------- */
  const get = (k, fb) => {
    try { const v = localStorage.getItem('ht_' + k); return v == null ? fb : JSON.parse(v); }
    catch { return fb; }
  };
  const set = (k, v) => {
    try { localStorage.setItem('ht_' + k, JSON.stringify(v)); }
    catch { toast('⚠️ Нехватка места в хранилище'); }
  };

  /* ---------- даты ---------- */
  const dkey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const RU_DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const RU_MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const fmtRu = d => `${RU_DAYS[d.getDay()]}, ${d.getDate()} ${RU_MONTHS[d.getMonth()]}`;
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  const timeAgo = ts => {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return 'только что';
    if (s < 3600) return Math.floor(s / 60) + ' мин назад';
    if (s < 86400) return Math.floor(s / 3600) + ' ч назад';
    const d = new Date(ts);
    return `${d.getDate()} ${RU_MONTHS[d.getMonth()].slice(0, 6)}`;
  };
  const nowHM = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  /* ---------- тост ---------- */
  let toastT;
  function toast(msg, ms = 2600) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ---------- модалка ---------- */
  function openModal(html) {
    const m = document.getElementById('modal');
    document.getElementById('modal-box').innerHTML = html;
    m.classList.remove('hidden');
  }
  function closeModal() { document.getElementById('modal').classList.add('hidden'); }

  /* ---------- настройки ---------- */
  const DEF_SETTINGS = {
    theme: 'coffee', bg: 'meadow', aiName: 'Ари',
    notif: true, notif2: true, privacy: 'all', isPublic: true,
    blocked: [], gender: '', bgPhoto: ''
  };
  let settings = Object.assign({}, DEF_SETTINGS, get('settings', {}));

  function saveSettings() { set('settings', settings); }
  function applyTheme() {
    document.body.dataset.theme = settings.theme;
    document.querySelectorAll('.theme-dot').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === settings.theme));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const cs = getComputedStyle(document.body).getPropertyValue('--acc').trim();
      meta.setAttribute('content', cs);
    }
  }
  function applyBG() {
    const layer = document.getElementById('bg-layer');
    const photoBtn = document.getElementById('btn-bg-photo-clear');
    if (settings.bgPhoto) {
      layer.classList.add('photo');
      layer.style.backgroundImage = `url('${settings.bgPhoto}')`;
      if (photoBtn) photoBtn.classList.remove('hidden');
    } else {
      layer.classList.remove('photo');
      layer.style.backgroundImage = settings.bg && settings.bg !== 'none'
        ? `url('bg/${settings.bg}.svg')` : '';
      if (photoBtn) photoBtn.classList.add('hidden');
    }
    document.querySelectorAll('.bg-chip').forEach(b =>
      b.classList.toggle('active', !settings.bgPhoto && b.dataset.bg === settings.bg));
  }

  /* ---------- пользователь ---------- */
  let user = get('user', null);
  function saveUser() { set('user', user); renderAccount(); }

  /* ---------- анимация-празднование (оценки, успехи) ---------- */
  const CEL_STICKERS = {
    hi: ['🎉', '⭐', '🏆', '🥳', '✨', '🎊', '💖', '🥇'],
    mid: ['💪', '👍', '✨', '🌟', '🌱'],
    low: ['💪', '🤝', '☀️', '🌱', '🤗']
  };
  function celebrate(msg, level = 'hi') {
    const old = document.getElementById('celebrate');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'celebrate';
    box.innerHTML = `<div class="cel-card ${level === 'hi' ? '' : level}">
        <span class="cel-mark">✦</span>
        <div class="cel-msg">${msg}</div>
        <div class="cel-line"></div>
      </div>`;
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'cel-spark';
      s.style.left = (18 + Math.random() * 64) + '%';
      s.style.top = (30 + Math.random() * 34) + '%';
      s.style.animationDelay = (Math.random() * .45) + 's';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.classList.add('out'), 1750);
    setTimeout(() => box.remove(), 2350);
  }

  /* ---------- премиальная анимация открытия: лист растёт в экран ---------- */
  function flipOpen(fromEl, done) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fromEl || reduce) { if (done) done(); return; }
    const r = fromEl.getBoundingClientRect();
    if (!r.width || !r.height) { if (done) done(); return; }
    const veil = document.createElement('div');
    veil.className = 'flip-veil';
    const sheet = document.createElement('div');
    sheet.className = 'flip-sheet';
    sheet.style.cssText =
      `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:22px;`;
    document.body.appendChild(veil);
    document.body.appendChild(sheet);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      veil.classList.add('on');
      sheet.classList.add('on');
      sheet.style.cssText = 'left:0;top:0;width:100%;height:100%;border-radius:0;';
    }));
    setTimeout(() => {
      if (done) done();
      sheet.classList.add('out');
      veil.classList.add('out');
    }, 580);
    setTimeout(() => { sheet.remove(); veil.remove(); }, 940);
  }

  /* ---------- навигация ---------- */
  const TITLES = {
    'tab-tracker': ['Трекер привычек', ''],
    'tab-schedule': ['Календарь', 'месяц · расписание · цикл'],
    'tab-plans': ['Планы и заметки', 'день · неделя · заметки'],
    'tab-notes': ['Заметки', 'планы · заметки'],
    'tab-feed': ['Лента', 'для вас и подписки'],
    'tab-more': ['Ещё', 'игры, настройки…'],
    'tab-chats': ['Чаты', ''],
    'tab-chat': ['Сообщения', ''],
    'tab-friends': ['Друзья', ''],
    'tab-profile': ['Профиль', ''],
    'tab-challenges': ['Челленджи', 'соревнуйся вместе'],
    'tab-motivation': ['Мотивация', '~100 цитат великих людей'],
    'tab-games': ['Игры', 'развиваем навыки'],
    'tab-settings': ['Настройки', ''],
    'tab-account': ['Аккаунт', '']
  };
  const onShow = {};

  function showTab(id) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === id));
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === id || (id === 'tab-notes' && b.dataset.tab === 'tab-plans')));
    document.body.classList.toggle('mot-clean', id === 'tab-motivation');
    const t = TITLES[id] || ['—', ''];
    document.getElementById('hdr-title').textContent = t[0];
    const sub = t[1];
    const subEl = document.getElementById('hdr-sub');
    if (id === 'tab-plans') subEl.textContent = '';
    else subEl.textContent = sub;
    if (id === 'tab-account') renderAccount();
    window.scrollTo(0, 0);
    if (onShow[id]) onShow[id]();
    if (window.__rewardsDot) window.__rewardsDot();
    showTip(id);
  }

  /* ---------- аккаунт ---------- */
  const escAva = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
  function renderAccount() {
    const g = document.getElementById('acc-guest'), u = document.getElementById('acc-user');
    if (!g) return;
    if (user) {
      g.classList.add('hidden'); u.classList.remove('hidden');
      document.getElementById('acc-name').textContent = user.name;
      const ava = user.avatar || '🙂';
      const isPhoto = String(ava).startsWith('data:');
      const accAv = document.getElementById('acc-avatar');
      accAv.innerHTML = isPhoto ? `<img src="${ava}" alt="" style="width:100%;height:100%;object-fit:cover">` : escAva(ava);
      const btn = document.getElementById('btn-account');
      btn.innerHTML = isPhoto ? `<img src="${ava}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : escAva(user.avatar || '👤');
      document.getElementById('acc-contact').textContent = user.contact || user.provider || '';
    } else {
      g.classList.remove('hidden'); u.classList.add('hidden');
      document.getElementById('btn-account').textContent = '👤';
    }
  }

  function initAccount() {
    const accTabs = document.querySelectorAll('#acc-tabs button');
    accTabs.forEach(b => b.onclick = () => {
      accTabs.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('acc-login').classList.toggle('hidden', b.dataset.acc !== 'login');
      document.getElementById('acc-reg').classList.toggle('hidden', b.dataset.acc !== 'reg');
    });

    /* пол при регистрации */
    let regGender = settings.gender || 'male';
    const gBtns = document.querySelectorAll('#reg-gender button');
    const syncGender = () => gBtns.forEach(b => b.classList.toggle('active', b.dataset.gender === regGender));
    gBtns.forEach(b => b.onclick = () => { regGender = b.dataset.gender; syncGender(); });
    syncGender();

    let pendingCode = null;
    const genCode = () => String(Math.floor(1000 + Math.random() * 9000));

    document.getElementById('btn-send-code').onclick = () => {
      const c = document.getElementById('reg-contact').value.trim();
      const n = document.getElementById('reg-name').value.trim();
      if (!n) return toast('Сначала введите имя пользователя');
      if (!c) return toast('Введите телефон или e-mail');
      pendingCode = genCode();
      const info = document.getElementById('code-info');
      info.classList.remove('hidden');
      info.innerHTML = `Код отправлен на <b>${c}</b><br>Демо-код: <b>${pendingCode}</b>`;
      document.getElementById('reg-code').classList.remove('hidden');
      toast('📩 Код отправлен (демо)');
    };

    document.getElementById('btn-do-reg').onclick = () => {
      const n = document.getElementById('reg-name').value.trim();
      const c = document.getElementById('reg-contact').value.trim();
      const code = document.getElementById('reg-code').value.trim();
      if (!n || !c) return toast('Заполните имя и контакт');
      if (!pendingCode) return toast('Сначала получите SMS-код');
      if (code !== pendingCode) return toast('❌ Неверный код');
      if (!document.getElementById('reg-accept').checked) return toast('Примите правила');
      settings.gender = regGender; saveSettings();
      user = { name: n, contact: c, avatar: '🙂', bio: '', links: [], provider: 'SMS', gender: regGender };
      saveUser();
      toast(`🎉 Аккаунт «${n}» создан!`);
      document.getElementById('reg-code').value = '';
      showTab('tab-profile');
    };

    document.getElementById('btn-do-login').onclick = () => {
      const c = document.getElementById('log-contact').value.trim();
      if (!c) return toast('Введите телефон или e-mail');
      user = user || { avatar: '🙂', bio: '', links: [] };
      user.name = user.name || c.split('@')[0].replace(/\D/g, '') || 'Пользователь';
      user.contact = c; user.provider = 'вход';
      saveUser();
      toast('👋 С возвращением!');
      showTab('tab-profile');
    };

    document.querySelectorAll('.prov').forEach(b => b.onclick = () => {
      const p = b.dataset.prov;
      user = user || { avatar: '🙂', bio: '', links: [] };
      user.name = user.name || 'Пользователь';
      user.provider = p;
      saveUser();
      toast(`✅ Вход через ${p} (демо)`);
      showTab('tab-profile');
    });

    document.getElementById('btn-logout').onclick = () => {
      user = null; saveUser(); toast('Вы вышли из аккаунта');
    };
    renderAccount();
  }

  /* ---------- активный редактор ---------- */
  let activeEditable = null;
  document.addEventListener('focusin', e => {
    if (e.target && e.target.isContentEditable) activeEditable = e.target;
  });

  function insertHTML(html) {
    const el = activeEditable;
    if (!el) return toast('Сначала поставьте курсор в текст');
    el.focus();
    document.execCommand('insertHTML', false, html);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ---------- медиа-помощники ---------- */
  function pickFile(accept, cb) {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept;
    i.onchange = () => { if (i.files[0]) cb(i.files[0]); };
    i.click();
  }
  function resizeImage(file, cb, max = 900) {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }
  function insertPhoto() {
    pickFile('image/*', f => {
      if (f.size > 6e6) return toast('Фото слишком большое (до 6 МБ)');
      resizeImage(f, url => insertHTML(`<img src="${url}" alt="">`));
    });
  }
  function insertVideo() {
    pickFile('video/*', f => {
      if (f.size > 2.5e6) return toast('Видео слишком большое (демо-лимит 2.5 МБ)');
      const r = new FileReader();
      r.onload = () => insertHTML(`<video src="${r.result}" controls></video>`);
      r.readAsDataURL(f);
    });
  }
  const STICKERS = ['😀','😎','🥰','🤩','😭','😤','🤯','🥳','😴','🤗','🤔','🙃','😇','🤠','😈','👻','❤️','🔥','⭐','🌈','🎉','🎁','🏆','💪','☕','🍵','📚','✏️','🌈','🌸','🍀','🌙','☀️','🍉','🍓','🍪','🎈','🪄','🐱','🐶','🦊','🐻','🐼','🦄','🦋','🌻','🌊','❄️','⛄','🍷','🍕','🍭'];
  function openStickers() {
    openModal(`<div class="m-title">Стикеры <button class="m-close">✕</button></div>
      <div class="emoji-pick">${STICKERS.map(s => `<button data-st="${s}">${s}</button>`).join('')}</div>`);
    document.getElementById('modal-box').querySelectorAll('[data-st]').forEach(b => {
      b.onclick = () => { insertHTML(`<span class="sticker">${b.dataset.st}</span>&nbsp;`); closeModal(); };
    });
    document.querySelector('#modal .m-close').onclick = closeModal;
  }

  /* ---------- рисование ---------- */
  let drawCb = null, drawing = false, lastX = 0, lastY = 0;
  function openDraw(cb) {
    drawCb = cb;
    const m = document.getElementById('draw-modal');
    m.classList.remove('hidden');
    const c = document.getElementById('draw-canvas');
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineCap = ctx.lineJoin = 'round';
  }
  function initDraw() {
    const c = document.getElementById('draw-canvas');
    const ctx = c.getContext('2d');
    const pos = e => {
      const r = c.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return [(p.clientX - r.left) * c.width / r.width, (p.clientY - r.top) * c.height / r.height];
    };
    const start = e => {
      drawing = true;
      [lastX, lastY] = pos(e);
      e.preventDefault();
    };
    const move = e => {
      if (!drawing) return;
      const [x, y] = pos(e);
      ctx.strokeStyle = document.getElementById('draw-color').value;
      ctx.lineWidth = document.getElementById('draw-size').value;
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
      [lastX, lastY] = [x, y];
      e.preventDefault();
    };
    const end = () => drawing = false;
    c.addEventListener('mousedown', start);
    c.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', end);

    document.getElementById('draw-clear').onclick = () => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    };
    document.getElementById('draw-cancel').onclick = () =>
      document.getElementById('draw-modal').classList.add('hidden');
    document.getElementById('draw-save').onclick = () => {
      document.getElementById('draw-modal').classList.add('hidden');
      const url = c.toDataURL('image/png');
      if (drawCb) { drawCb(url); drawCb = null; }
      else insertHTML(`<img src="${url}" alt="рисунок">`);
    };
  }

  /* ---------- тулбары редакторов (делегирование) ---------- */
  function initToolbars() {
    document.addEventListener('mousedown', e => {
      if (e.target.closest('.rt-toolbar')) e.preventDefault(); // не терять выделение
    });
    document.addEventListener('click', e => {
      const btn = e.target.closest('.rt-toolbar button');
      if (!btn) return;
      const toolbar = btn.closest('.rt-toolbar');
      const wrap = toolbar.closest('.editor-wrap');
      const target = wrap ? wrap.querySelector('.rt-area') : document.getElementById('chat-text');
      if (target) { activeEditable = target; target.focus(); }
      const cmd = btn.dataset.cmd;
      const inline = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];
      if (cmd === 'hl') {
        const color = btn.dataset.c || '#FDE68A';
        let ok = false;
        try { ok = document.execCommand('hiliteColor', false, color); } catch (e) { ok = false; }
        if (!ok) {
          try { ok = document.execCommand('backColor', false, color); } catch (e) { ok = false; }
        }
        if (!ok && target) {
          const sel = window.getSelection();
          if (sel.rangeCount && !sel.isCollapsed) {
            const span = document.createElement('span');
            span.className = 'hl';
            span.style.background = color;
            try { sel.getRangeAt(0).surroundContents(span); ok = true; } catch (e) {}
          }
        }
        if (ok && target) target.dispatchEvent(new Event('input', { bubbles: true }));
        else toast('Выделите текст и попробуйте снова');
        return;
      }
      if (inline.includes(cmd)) document.execCommand(cmd, false, null);
      else if (cmd === 'insertPhoto') insertPhoto();
      else if (cmd === 'insertVideo') insertVideo();
      else if (cmd === 'insertSticker') openStickers();
      else if (cmd === 'insertDraw' || cmd === 'draw') openDraw();
      else if (cmd === 'photo') insertPhoto();
      else if (cmd === 'sticker') openStickers();
    });
  }

  /* ---------- глобальные обработчики ---------- */
  function initGlobal() {
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.onclick = () => showTab(b.dataset.tab));

    document.addEventListener('click', e => {
      const go = e.target.closest('[data-go]');
      if (go) { showTab(go.dataset.go); return; }
      const back = e.target.closest('[data-back]');
      if (back) { showTab(back.dataset.back); return; }
    });

    document.getElementById('modal').onclick = e => {
      if (e.target.id === 'modal') closeModal();
    };

    document.getElementById('btn-account').onclick = () => showTab('tab-account');
    const chatsBtn = document.getElementById('btn-chats');
    if (chatsBtn) chatsBtn.onclick = () => showTab('tab-chats');
    document.getElementById('btn-rewards').onclick = () => Rewards.open();
    Rewards.updateDot();

    /* секрет: 3 клика по кофе — маленькая шутка */
    let taps = 0, tapT;
    document.getElementById('hdr-logo').onclick = () => {
      taps++;
      clearTimeout(tapT);
      tapT = setTimeout(() => taps = 0, 900);
      if (taps >= 3) {
        taps = 0;
        showTab('tab-games');
        toast('🎮 Вы нашли секретную комнату игр!');
      }
    };
  }

  /* ---------- настройки: вкладка ---------- */
  /* превью темы из фото: показываем и сохраняем кнопкой «Сохранить» */
  function previewBG(url) {
    openModal(`<div class="m-title">Тема из фото <button class="m-close">✕</button></div>
      <img class="bg-preview" src="${url}" alt="">
      <p class="tiny">Фоном станет вот это фото. Понравилось — жми «Сохранить».</p>
      <div class="m-row">
        <button class="btn-ghost" id="bg-cancel" style="margin:0">Отмена</button>
        <button class="btn-primary" id="bg-save" style="margin:0;flex:1">Сохранить фон</button>
      </div>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = closeModal;
    box.querySelector('#bg-cancel').onclick = closeModal;
    box.querySelector('#bg-save').onclick = () => {
      settings.bgPhoto = url; saveSettings(); applyBG();
      closeModal();
      toast('🖼 Тема сохранена из фото');
    };
  }

  function initSettingsUI() {
    document.querySelectorAll('.theme-dot').forEach(b => b.onclick = () => {
      settings.theme = b.dataset.theme; saveSettings(); applyTheme();
      toast('🎨 Тема: ' + b.title);
    });
    document.querySelectorAll('.bg-chip').forEach(b => b.onclick = () => {
      settings.bg = b.dataset.bg; saveSettings(); applyBG();
      toast('🏔 Фон изменён');
    });
    document.querySelectorAll('#ai-name-picker button').forEach(b => b.onclick = () => {
      settings.aiName = b.dataset.ainame; saveSettings();
      updateAIName();
      toast('🤖 ИИ теперь — ' + settings.aiName);
    });
    const bind = (id, key) => {
      const el = document.getElementById(id);
      el.checked = settings[key];
      el.onchange = () => { settings[key] = el.checked; saveSettings(); };
    };
    bind('set-notif', 'notif');
    bind('set-notif2', 'notif2');
    bind('set-public', 'isPublic');
    /* своё фото фона — сначала превью, сохраняем кнопкой */
    const bgPhotoBtn = document.getElementById('btn-bg-photo');
    if (bgPhotoBtn) bgPhotoBtn.onclick = () =>
      pickFile('image/*', f => {
        if (f.size > 6e6) return toast('Фото слишком большое (до 6 МБ)');
        resizeImage(f, url => previewBG(url), 1600);
      });
    const bgClear = document.getElementById('btn-bg-photo-clear');
    if (bgClear) bgClear.onclick = () => {
      settings.bgPhoto = ''; saveSettings(); applyBG();
      toast('Фон-фото убрано');
    };
    /* чаты и приватность — чипы, без выпадающего списка */
    const privChips = document.querySelectorAll('#set-privacy-chips .grp-chip');
    const syncPriv = () => privChips.forEach(b => b.classList.toggle('sel', b.dataset.priv === settings.privacy));
    privChips.forEach(b => b.onclick = () => {
      settings.privacy = b.dataset.priv; saveSettings(); syncPriv();
      toast(b.dataset.priv === 'all' ? '💬 Писать может любой'
        : b.dataset.priv === 'friends' ? '👥 Писать могут только друзья'
        : '🔒 Никто не может написать');
    });
    syncPriv();
    document.getElementById('set-blocked').textContent = settings.blocked.length;
    document.getElementById('btn-block-list').onclick = () => {
      const list = settings.blocked.length
        ? settings.blocked.map(b => `<div class="person"><div class="info"><div class="nm">${b}</div></div><button class="p-btn alt" data-unblock="${b}">Разблокировать</button></div>`).join('')
        : '<p class="empty-hint">Чёрный список пуст</p>';
      openModal(`<div class="m-title">Чёрный список <button class="m-close">✕</button></div>${list}`);
      document.getElementById('modal-box').querySelectorAll('[data-unblock]').forEach(x =>
        x.onclick = () => {
          settings.blocked = settings.blocked.filter(v => v !== x.dataset.unblock);
          saveSettings();
          document.getElementById('set-blocked').textContent = settings.blocked.length;
          closeModal(); toast('✅ Разблокирован');
        });
      document.querySelector('#modal .m-close').onclick = closeModal;
    };

    document.getElementById('btn-export').onclick = () => {
      const data = {};
      Object.keys(localStorage).filter(k => k.startsWith('ht_')).forEach(k => data[k] = localStorage.getItem(k));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'treker-dannye.json';
      a.click();
      toast('💾 Файл выгружен');
    };
    document.getElementById('btn-reset').onclick = () => {
      if (!confirm('Удалить ВСЕ данные приложения? Это необратимо.')) return;
      Object.keys(localStorage).filter(k => k.startsWith('ht_')).forEach(k => localStorage.removeItem(k));
      location.reload();
    };
  }

  function updateAIName() {
    const n = document.getElementById('ai-name');
    if (n) {
      n.textContent = settings.aiName;
      document.getElementById('ai-input').placeholder = `Спросите ${settings.aiName}…`;
    }
  }

  function notify(title, body) {
    if (!settings.notif) return;
    try {
      if (Notification.permission === 'granted') new Notification(title, { body });
      else if (Notification.permission !== 'denied') Notification.requestPermission();
    } catch {}
    toast('🔔 ' + title + ' — ' + body);
  }

  /* ---------- музыка (офлайн, WebAudio) ---------- */
  const Music = (() => {
    const TRACKS = [
      { id: 'utro', name: '☀️ Утро', bpm: 96, root: 261.63, scale: [0, 2, 4, 7, 9], kind: 'arp' },
      { id: 'volny', name: '🌊 Волны', bpm: 62, root: 220.00, scale: [0, 3, 5, 7, 10], kind: 'pad' },
      { id: 'nokturn', name: '🌙 Ноктюрн', bpm: 72, root: 196.00, scale: [0, 3, 5, 8, 10], kind: 'arp' },
      { id: 'ritm', name: '🥁 Ритм', bpm: 124, root: 293.66, scale: [0, 2, 4, 5, 7, 9, 11], kind: 'beat' },
      { id: 'kapu', name: '☕ Кофе', bpm: 88, root: 246.94, scale: [0, 2, 3, 7, 9], kind: 'jazz' }
    ];
    let ctx = null, timer = null, curId = null, step = 0;
    const ensure = () => {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const freq = (root, semi) => root * Math.pow(2, semi / 12);
    function note(f, t, dur, type, vol) {
      const c = ensure();
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.06);
    }
    function kick(t) {
      const c = ensure();
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.2);
    }
    function play(id) {
      stop();
      const tr = TRACKS.find(x => x.id === id) || TRACKS[0];
      curId = tr.id; step = 0;
      const c = ensure();
      const beat = 60 / tr.bpm;
      const seq = () => {
        const t = c.currentTime + 0.03;
        const s = step % 16;
        const sc = tr.scale;
        if (tr.kind === 'arp') {
          note(freq(tr.root, sc[s % sc.length] + (s % 8 >= 4 ? 12 : 0)), t, beat * 0.9, 'triangle', 0.10);
          if (s % 4 === 0) note(freq(tr.root, sc[0]) / 2, t, beat * 2, 'sine', 0.12);
        } else if (tr.kind === 'pad') {
          if (s % 8 === 0) {
            note(freq(tr.root, sc[0]), t, beat * 7, 'sine', 0.09);
            note(freq(tr.root, sc[2]), t, beat * 7, 'sine', 0.07);
            note(freq(tr.root, sc[4] || sc[1]), t, beat * 7, 'sine', 0.05);
          }
        } else if (tr.kind === 'beat') {
          if (s % 2 === 0) kick(t);
          if (s % 4 === 2) note(freq(tr.root, sc[(s * 3) % sc.length] + 12), t, beat * 0.5, 'square', 0.05);
          if (s % 8 === 0) note(freq(tr.root, sc[0]) / 2, t, beat, 'sawtooth', 0.07);
        } else { /* jazz */
          if (s % 4 === 0) note(freq(tr.root, sc[(s / 4) % sc.length]) / 2, t, beat * 0.8, 'sine', 0.11);
          if (s % 2 === 1) note(freq(tr.root, sc[(s * 5) % sc.length] + 12), t + beat * 0.12, beat * 0.5, 'triangle', 0.07);
        }
        step++;
      };
      seq();
      timer = setInterval(seq, beat * 500);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      curId = null;
    }
    return {
      tracks: () => TRACKS.map(t => ({ id: t.id, name: t.name })),
      play, stop,
      get current() { return curId; }
    };
  })();

  /* ---------- ежедневные награды ---------- */
  const Rewards = (() => {
    let data = get('rewards', null) || { streak: 0, lastClaim: '', shelf: [], custom: [], questsDone: {} };
    if (!data.shelf) data.shelf = [];
    if (!data.custom) data.custom = [];
    if (!data.questsDone) data.questsDone = {};
    if (!data.seeded) {
      data.shelf.push({ id: 's0', name: 'Первый шаг', emoji: '🌱', img: '', ts: Date.now() - 864e5 });
      data.seeded = true;
    }
    const save = () => set('rewards', data);
    const today = () => dkey();

    function canClaimDaily() { return data.lastClaim !== today(); }
    function quests() {
      const habits = get('habits', []);
      const t = today();
      const doneToday = habits.filter(h => h.type !== 'bad' && h.days[t]).length;
      const p = get('plans', {})[t];
      const hasTask = !!(p && p.tasks && p.tasks.length);
      const played = !!(data.questsDone[t] && data.questsDone[t].played);
      return [
        { id: 'habits', text: 'Отметь 2 привычки', cur: Math.min(doneToday, 2), goal: 2, icon: '🎯' },
        { id: 'task', text: 'Добавь задачу в планы', cur: hasTask ? 1 : 0, goal: 1, icon: '🗒' },
        { id: 'game', text: 'Сыграй в любую игру', cur: played ? 1 : 0, goal: 1, icon: '🎮' }
      ];
    }
    const questsAllDone = () => quests().every(q => q.cur >= q.goal);
    const questsClaimed = () => !!(data.questsDone[today()] && data.questsDone[today()].claimed);

    function updateDot() {
      const dot = document.getElementById('rewards-dot');
      if (!dot) return;
      const show = canClaimDaily() || (questsAllDone() && !questsClaimed());
      dot.classList.toggle('hidden', !show);
    }
    function gameHit() {
      const t = today();
      data.questsDone[t] = Object.assign({}, data.questsDone[t], { played: true });
      save(); updateDot();
    }
    function give() {
      const custom = data.custom.length ? data.custom[Math.floor(Math.random() * data.custom.length)] : null;
      const def = [
        { emoji: '⭐', name: 'Звезда' }, { emoji: '🏅', name: 'Медаль' },
        { emoji: '🌸', name: 'Цветок' }, { emoji: '💎', name: 'Кристалл' },
        { emoji: '🧸', name: 'Мишка' }, { emoji: '🧁', name: 'Печенька' }
      ];
      const base = custom || def[Math.floor(Math.random() * def.length)];
      const item = { id: uid(), name: base.name, emoji: base.emoji || '🎁', img: base.img || '', ts: Date.now() };
      data.shelf.push(item);
      save(); updateDot();
      return item;
    }
    function claimDaily() {
      if (!canClaimDaily()) return;
      data.lastClaim = today();
      data.streak = (data.streak || 0) + 1;
      const item = give();
      save(); updateDot();
      celebrate(`🎁 Награда дня: ${item.emoji} ${item.name}! Серия ${data.streak} дн.`, 'hi');
      open();
    }
    function claimQuests() {
      if (!questsAllDone() || questsClaimed()) return;
      data.questsDone[today()] = Object.assign({}, data.questsDone[today()], { claimed: true });
      const item = give();
      save(); updateDot();
      celebrate(`🏆 Все задания дня выполнены! ${item.emoji} ${item.name}`, 'hi');
      open();
    }
    const EMOJI_SET = ['🎁', '⭐', '🏅', '🌸', '💎', '🧸', '🧁', '🍭', '🍀', '🌙', '☀️', '🌈', '🦋', '☕', '🍓'];
    function open() {
      const strip = [];
      const can = canClaimDaily();
      for (let i = 1; i <= 7; i++) {
        const active = i === ((data.streak || 0) % 7) + (can ? 0 : 1);
        strip.push(`<div class="rw-day ${i <= ((data.streak || 0) % 7 || (can ? 0 : 7)) ? 'passed' : ''} ${active ? 'now' : ''}">
          <span class="rw-day-n">${i}</span><span class="rw-day-e">${['🌱', '🍀', '🌸', '⭐', '🏅', '💎', '🎁'][i - 1]}</span></div>`);
      }
      const qs = quests().map(q => `
        <div class="rw-quest ${q.cur >= q.goal ? 'done' : ''}">
          <span class="rw-q-icon">${q.icon}</span>
          <span class="rw-q-text">${q.text}</span>
          <span class="rw-q-prog">${q.cur}/${q.goal}</span>
        </div>`).join('');
      const shelf = data.shelf.slice().reverse().map(r => `
        <div class="rw-item">${r.img ? `<img src="${r.img}" alt="">` : `<span>${r.emoji}</span>`}<div class="rw-item-name">${r.name}</div></div>`).join('');
      const custom = data.custom.map((r, i) => `
        <div class="rw-item small">${r.img ? `<img src="${r.img}" alt="">` : `<span>${r.emoji}</span>`}
        <div class="rw-item-name">${r.name}</div><button class="rw-del" data-rwdel="${i}">✕</button></div>`).join('');
      openModal(`
        <div class="m-title">Ежедневные награды <button class="m-close">✕</button></div>
        <div class="rw-strip">${strip.join('')}</div>
        <button class="btn-primary wide" id="rw-claim" ${can ? '' : 'disabled'}>${can ? '🎁 Забрать награду дня' : 'Уже забрано сегодня ✓'}</button>
        <div class="set-title" style="margin-top:16px">Задачи дня</div>
        ${qs}
        <button class="btn-primary wide" id="rw-quests" ${questsAllDone() && !questsClaimed() ? '' : 'disabled'} style="margin-top:8px">
          ${questsClaimed() ? 'Награда за задания забрана ✓' : '🏆 Забрать награду за задания'}</button>
        <div class="set-title" style="margin-top:16px">Мои награды (${data.shelf.length})</div>
        <div class="rw-shelf">${shelf || '<p class="tiny">Пока пусто — забирайте ежедневные награды!</p>'}</div>
        <div class="set-title" style="margin-top:16px">Свои награды (их можно получить)</div>
        <div class="rw-shelf">${custom}</div>
        <div class="task-add-box card" style="margin-top:10px">
          <div class="task-add-title">Добавить свою награду (с фото)</div>
          <input class="field" id="rw-name" placeholder="Например: поход в пиццерию" maxlength="30">
          <div class="emoji-pick" id="rw-emoji">${EMOJI_SET.map((e, i) => `<button class="${i === 0 ? 'sel' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
          <div class="set-actions" style="margin-top:8px">
            <button class="btn-ghost" id="rw-photo">📷 Своё фото</button>
            <button class="btn-primary" id="rw-add">Добавить</button>
          </div>
        </div>`);
      const box = document.getElementById('modal-box');
      box.querySelector('.m-close').onclick = closeModal;
      box.querySelector('#rw-claim').onclick = claimDaily;
      box.querySelector('#rw-quests').onclick = claimQuests;
      box.querySelectorAll('[data-rwdel]').forEach(b => b.onclick = () => {
        data.custom.splice(Number(b.dataset.rwdel), 1); save(); open();
      });
      let photo = null, emoji = EMOJI_SET[0];
      box.querySelectorAll('#rw-emoji button').forEach(b => b.onclick = () => {
        box.querySelectorAll('#rw-emoji button').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel'); emoji = b.dataset.e; photo = null;
      });
      box.querySelector('#rw-photo').onclick = () => pickFile('image/*', f => {
        if (f.size > 5e6) return toast('Фото слишком большое (до 5 МБ)');
        resizeImage(f, url => { photo = url; toast('📷 Фото готово — нажмите «Добавить»'); }, 400);
      });
      box.querySelector('#rw-add').onclick = () => {
        const n = box.querySelector('#rw-name').value.trim();
        if (!n) return toast('Введите название награды');
        data.custom.push({ id: uid(), name: n, emoji: photo ? '' : emoji, img: photo || '' });
        save(); toast('🎁 Своя награда добавлена в розыгрыш!'); open();
      };
    }
    return { open, updateDot, gameHit, get data() { return data; } };
  })();
  window.__rewardsDot = Rewards.updateDot;

  /* ---------- ориентация: гид по вкладкам и управлению ---------- */
  const GUIDE = {
    'tab-tracker': {
      ico: '🎯', n: 'Трекер',
      lead: 'Главный экран: твои привычки, серии и отметки за сегодня.',
      steps: [
        'Тапни кружок у привычки — день засчитан, серия растёт.',
        '«+ добавить» — новая привычка: название, тип, цвет и своё фото.',
        'Внизу — календарь месяца: тап по клетке ставит или снимает отметку.'
      ]
    },
    'tab-schedule': {
      ico: '🗓', n: 'Календарь',
      lead: 'Три режима в одном разделе — переключатель-пилюля сверху.',
      steps: [
        'Расписание — уроки как в дневнике: номер, предмет, домашка, оценка.',
        'Календарь — месяц с делами и отметками привычек, тап по дню открывает карточку.',
        'Месячные — при первом заходе приложение спросит дату начала, длину цикла и длительность, дальше само строит прогноз на 3 цикла вперёд (⚙ — перенастроить).'
      ]
    },
    'tab-plans': {
      ico: '🗒', n: 'Планы',
      lead: 'Планы дня с нумерацией — и заметка к дню отдельным блоком.',
      steps: [
        '«Что нужно сделать?» → «+ Добавить» — задача появится в нумерованном списке.',
        'Вид «Неделя» — семь дней сразу, по 2 карточки в ряд; тап по дню открывает его план.',
        'Внизу «Заметка к дню» — нажми, и лист развернётся во весь экран: открывается редактор заметок, она хранится отдельно от планов.'
      ]
    },
    'tab-notes': {
      ico: '📖', n: 'Заметки',
      lead: 'Живые листки дневника: поиск, дата, линейки и перо.',
      steps: [
        'Сверху — поиск и фильтры: «Все · Дни · Книжки · Избранные»; на карточке «⋯» — открыть, переименовать, в избранное, удалить.',
        'Тулбар-перо: Ж/К/Ч/зачёркнутый, списки, маркеры-выделения, фото, рисунок, видео.',
        'Всё сохраняется автоматически — можно закрыть и вернуться.'
      ]
    },
    'tab-feed': {
      ico: '📸', n: 'Лента',
      lead: 'Посты и клипы — как в TikTok: снизу переключатель «Посты · Клипы · Подписки».',
      steps: [
        'Поле «Опубликовать пост…» + кнопки: фото, звук, видео — «🎥 Снять видео» прямо с камеры (до 3 минут) или взять с телефона.',
        'Фильтры как в TikTok: полоса пресетов рядом с «Aa» — применяется к фото и видео.',
        'Под постом: лайк, реакции, комментарии с лайком и ответом; «Клипы» — вертикальная лента на весь экран.'
      ]
    },
    'tab-more': {
      ico: '☰', n: 'Ещё',
      lead: 'Всё остальное: чаты, друзья, челленджи, игры, мотивация, настройки.',
      steps: [
        'Плитки ведут в разделы — тап по любой.',
        'Карточка «ИИ-помощник» открывает чат с ботом (или кнопка ИИ справа снизу).',
        'Здесь же — настройки темы, фона и уведомлений.'
      ]
    },
    'tab-chats': {
      ico: '💬', n: 'Чаты',
      lead: 'Как в Telegram: сверху все контакты, ниже — переписки.',
      steps: [
        'Сверху лента контактов — общая для всех разделов: тап по аватару сразу открывает переписку.',
        'Поиск фильтрует и контакты, и чаты; «+» — новая группа, «Люди» — весь список.',
        'На сообщении: ответ-цитата и реакция; стикеры, звук и голосовое — кнопки под полем ввода.'
      ]
    },
    'tab-chat': {
      ico: '💬', n: 'Сообщения',
      lead: 'Переписка: пузыри, стикеры, ответы и реакции.',
      steps: [
        'Поле ввода внизу, «➤» — отправить, 🎤 — голосовое.',
        'Кнопки над пузырём: ответ (цитата) и реакция.',
        '«← Чаты» — вернуться к списку.'
      ]
    },
    'tab-friends': {
      ico: '👥', n: 'Друзья',
      lead: 'Находи друзей и добавляй их в чаты.',
      steps: [
        'Поиск по имени или ссылке — отправь её другу.',
        'Тап по человеку — профиль и кнопка «Написать».',
        'Добавленные друзья появляются в «Чатах».'
      ]
    },
    'tab-profile': {
      ico: '👤', n: 'Профиль',
      lead: 'Твоё имя, аватар, био и публичные посты.',
      steps: [
        '«Редактировать» — имя, фото, bio и ссылки.',
        'Ниже — твои посты и достижения.',
        'Приватность настраивается в «Настройках».'
      ]
    },
    'tab-challenges': {
      emoji: '🏆', ico: '🏆', n: 'Челленджи',
      lead: 'Дневные испытания с наградами.',
      steps: [
        'Список активных челленджей и прогресс по каждому.',
        'Отметка дня — прогресс растёт, награда капает в «Награды».',
        'Свой челлендж — создай правила сама.'
      ]
    },
    'tab-motivation': {
      ico: '🕯', n: 'Мотивация',
      lead: 'Белый экран и цитата посередине — без лишнего.',
      steps: [
        '«Другая цитата» — смена, «☆» — в избранное.',
        '«Избранные (n)» — раскрывает сохранённые.',
        '«← Назад» возвращает в предыдущий раздел.'
      ]
    },
    'tab-games': {
      ico: '🎮', n: 'Игры',
      lead: 'Восемь игр: память, реакция, морской бой, флеш-карточки и другие.',
      steps: [
        'Тап по карточке игры открывает её на весь экран.',
        'Флеш-карточки: готовые наборы + свои колоды, «Знаю / Повторить».',
        'Рекорды попадают в очки — их видно на карточках.'
      ]
    },
    'tab-settings': {
      ico: '⚙️', n: 'Настройки',
      lead: 'Тема — это цвета интерфейса. Фон — картинка позади. Это разные вещи.',
      steps: [
        '«Тема оформления» — палитра всего приложения (акценты, кнопки, навигация).',
        '«Фон-пейзаж» — картинка позади; можно убрать или поставить своё фото.',
        'Чаты и приватность — кто может писать; уведомления; экспорт данных.'
      ]
    },
    'tab-account': {
      ico: '🔐', n: 'Аккаунт',
      lead: 'Вход через Яндекс ID — чтобы данные не потерять.',
      steps: [
        'Вход/регистрация — одна кнопка через Яндекс.',
        'После входа — имя, фото и синхронизация профиля.',
        'Выход всегда можно сделать здесь же.'
      ]
    }
  };
  const GUIDE_MAIN = ['tab-tracker', 'tab-schedule', 'tab-plans', 'tab-notes', 'tab-feed',
    'tab-chats', 'tab-games', 'tab-motivation', 'tab-more'];
  const GUIDE_KEYS = [
    ['🧭', 'Внизу пять главных вкладок: Трекер · Календарь · Планы · Лента · Ещё.'],
    ['💬', 'В шапке: чаты, награды, «?» — эта справка, и аккаунт.'],
    ['🔒', 'Приложение ничего не спрашивает само: камера, микрофон и контакты — только когда нажмёшь ты.'],
    ['👆', 'Пилюли-сегменты переключают вид внутри вкладки, «←» возвращает назад.'],
    ['💾', 'Всё сохраняется само — интернет не нужен, приложение работает офлайн.']
  ];
  const TIP_SKIP = ['tab-motivation', 'tab-chat'];

  function currentTabId() {
    const a = document.querySelector('section.tab.active');
    return a ? a.id : 'tab-tracker';
  }

  function guideHTML(focus) {
    const g = GUIDE[focus] || GUIDE['tab-tracker'];
    const row = id => {
      const x = GUIDE[id];
      if (!x) return '';
      return `<button class="guide-row${id === focus ? ' cur' : ''}" data-guide-go="${id}">
        <span class="guide-ico">${x.ico}</span>
        <span class="guide-txt"><b>${x.n}</b><i>${x.lead}</i></span>
      </button>`;
    };
    return `<div class="m-title">Как пользоваться <button class="m-close">✕</button></div>
      <div class="guide">
        <div class="guide-block">
          <div class="guide-kicker">Сейчас открыто</div>
          <div class="guide-cur">
            <span class="guide-ico big">${g.ico}</span>
            <div><b>${g.n}</b><p>${g.lead}</p></div>
          </div>
          <ul class="guide-steps">${g.steps.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="guide-block">
          <div class="guide-kicker">Все разделы</div>
          <div class="guide-list">${GUIDE_MAIN.map(row).join('')}</div>
        </div>
        <div class="guide-block">
          <div class="guide-kicker">Управление</div>
          <ul class="guide-keys">${GUIDE_KEYS.map(([i, t]) => `<li><span>${i}</span>${t}</li>`).join('')}</ul>
        </div>
      </div>
      <button class="btn-primary wide" id="guide-ok">Понятно</button>`;
  }

  function openGuide() {
    openModal(guideHTML(currentTabId()));
    const box = document.getElementById('modal-box');
    if (box.querySelector('.m-close')) box.querySelector('.m-close').onclick = closeModal;
    const ok = box.querySelector('#guide-ok');
    if (ok) ok.onclick = closeModal;
    box.querySelectorAll('[data-guide-go]').forEach(b => b.onclick = () => {
      closeModal();
      showTab(b.dataset.guideGo);
    });
  }

  /* одноразовая подсказка при первом входе во вкладку */
  let tipEl = null, tipT = 0;
  function hideTip(mark, keep) {
    clearTimeout(tipT);
    const el = tipEl;
    tipEl = null;
    if (el) {
      if (keep) { el.remove(); }
      else {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 260);
      }
    }
    if (mark) {
      const seen = get('tipsSeen', []);
      if (seen.indexOf(mark) < 0) { seen.push(mark); set('tipsSeen', seen); }
    }
  }
  function showTip(id) {
    const g = GUIDE[id];
    if (!g || TIP_SKIP.indexOf(id) >= 0) return hideTip(null, true);
    const seen = get('tipsSeen', []);
    if (seen.indexOf(id) >= 0) return hideTip(null, true);
    hideTip(null, true);
    const el = document.createElement('div');
    el.id = 'tab-tip';
    el.innerHTML = `<span class="tip-ico">${g.ico}</span>
      <span class="tip-body"><b>${g.n}</b><i>${g.steps[0]}</i></span>
      <button class="tip-more" title="Вся справка">?</button>
      <button class="tip-ok" title="Скрыть">Ок</button>`;
    document.body.appendChild(el);
    tipEl = el;
    requestAnimationFrame(() => el.classList.add('show'));
    el.querySelector('.tip-ok').onclick = () => hideTip(id);
    el.querySelector('.tip-more').onclick = () => { hideTip(id); openGuide(); };
    tipT = setTimeout(() => hideTip(id), 9000);
  }

  /* ---------- старт ---------- */
  function init() {
    applyTheme();
    applyBG();
    initGlobal();
    initToolbars();
    initDraw();
    initAccount();
    initSettingsUI();
    updateAIName();
    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) helpBtn.onclick = openGuide;
    if (!get('onboarded', 0)) {
      setTimeout(() => { set('onboarded', 1); openGuide(); }, 900);
    }
    document.getElementById('hdr-sub').textContent = fmtRu(new Date());
    const swOk = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && swOk) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  document.addEventListener('DOMContentLoaded', init);

  return {
    get, set, dkey, addDays, fmtRu, uid, timeAgo, nowHM,
    toast, openModal, closeModal, showTab, onShow, celebrate, flipOpen,
    get settings() { return settings; },
    get user() { return user; }, saveUser, renderAccount,
    insertHTML, pickFile, resizeImage, openStickers, openDraw,
    previewBG, notify, RU_DAYS, RU_MONTHS, openGuide,
    music: Music, rewards: Rewards, applyBG
  };
})();
