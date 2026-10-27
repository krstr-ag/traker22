/* ===== СООБЩЕСТВО: друзья, чаты, профиль, челленджи ===== */
(() => {
  const P = id => (window.PEOPLE || []).find(p => p.id === id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let friends = HT.get('friends', []);
  let requests = HT.get('requests', ['u5']);
  let following = HT.get('following', []);
  let chats = HT.get('chats', {});
  let groups = HT.get('groups', []);
  const saveAll = () => {
    HT.set('friends', friends); HT.set('requests', requests);
    HT.set('following', following); HT.set('chats', chats);
    HT.set('groups', groups);
  };

  /* ---------- общие люди: демо-персонажи, участники групп, боты ---------- */
  const BOT_ID = 'bot', ARTIST_ID = 'artist';
  const BOT_META = { id: BOT_ID, name: 'Бот-помощник', ava: '🤖', bio: 'Отвечает офлайн — всегда на связи' };
  const ARTIST_META = { id: ARTIST_ID, name: 'Художник', ava: '🎨', bio: 'Рисует картинку по описанию' };
  const personOf = id => (id === BOT_ID ? BOT_META : id === ARTIST_ID ? ARTIST_META : P(id));
  const shortName = n => String(n || '').split(' ')[0];

  let pinnedChats = HT.get('pinnedChats', []);
  const savePinned = () => HT.set('pinnedChats', pinnedChats);
  let chQuery = '';

  const ICON_SEARCH = '<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.3"/><path d="M15.7 15.7l4.6 4.6"/></svg>';
  const ICON_USERS = '<svg class="ic" viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.3"/><path d="M3.5 19.4a5.6 5.6 0 0 1 11 0"/><path d="M15.6 5.8a3.3 3.3 0 0 1 0 5.5M17.4 14.4a5.6 5.6 0 0 1 3.1 5"/></svg>';
  const ICON_INFO = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.6"/><path d="M12 11.3v5M12 8v.01" stroke-width="2.2"/></svg>';

  /* ================= ДРУЗЬЯ ================= */
  function renderFriends() {
    const q = (document.getElementById('friends-search').value || '').toLowerCase().trim();

    const reqWrap = document.getElementById('requests-list');
    reqWrap.innerHTML = requests.length ? '' : '<p class="tiny">Заявок нет</p>';
    requests.forEach(id => {
      const p = P(id); if (!p) return;
      const el = document.createElement('div');
      el.className = 'person';
      el.innerHTML = `<div class="ava">${p.ava}</div>
        <div class="info"><div class="nm">${p.name}</div><div class="sub">хочет добавить в друзья</div></div>
        <button class="p-btn" data-acc="${id}">✓</button>
        <button class="p-btn alt" data-rej="${id}">✕</button>`;
      el.querySelector('[data-acc]').onclick = () => {
        friends.push(id);
        requests = requests.filter(x => x !== id);
        if (!chats[id]) chats[id] = [{ who: 'them', html: 'Привет! Рада дружбе! 😊', ts: Date.now() }];
        saveAll(); renderFriends(); renderChatList();
        HT.toast('🤝 Теперь вы друзья!');
      };
      el.querySelector('[data-rej]').onclick = () => {
        requests = requests.filter(x => x !== id);
        saveAll(); renderFriends();
      };
      reqWrap.appendChild(el);
    });

    const people = (window.PEOPLE || [])
      .filter(p => !HT.settings.blocked.includes(p.name))
      .filter(p => !q || p.name.toLowerCase().includes(q));
    const pl = document.getElementById('people-list');
    pl.innerHTML = '';
    people.forEach(p => {
      const isFriend = friends.includes(p.id);
      const isFollow = following.includes(p.id);
      const el = document.createElement('div');
      el.className = 'person';
      el.innerHTML = `<div class="ava">${p.ava}</div>
        <div class="info"><div class="nm">${p.name}</div><div class="sub">${p.bio}</div></div>
        <button class="p-btn ${isFriend ? 'on' : ''}" data-fr="${p.id}">${isFriend ? '✓ дружишь' : '➕ друг'}</button>
        <button class="p-btn alt ${isFollow ? 'on' : ''}" data-fw="${p.id}">${isFollow ? '✓ подписан' : '➕ подписка'}</button>`;
      el.querySelector('[data-fr]').onclick = () => {
        if (isFriend) return;
        HT.toast(`Заявка для ${p.name.split(' ')[0]} отправлена…`);
        setTimeout(() => {
          friends.push(p.id);
          if (!chats[p.id]) chats[p.id] = [{ who: 'them', html: `Привет! Я ${p.name.split(' ')[0]}! Давай дружить 🤝`, ts: Date.now() }];
          saveAll(); renderFriends(); renderChatList();
          HT.toast(`✅ ${p.name.split(' ')[0]} принял заявку!`);
        }, 1100);
      };
      el.querySelector('[data-fw]').onclick = () => {
        const i = following.indexOf(p.id);
        if (i >= 0) following.splice(i, 1); else following.push(p.id);
        saveAll(); renderFriends(); HT.renderFeed && HT.renderFeed();
      };
      pl.appendChild(el);
    });

    const fl = document.getElementById('myfriends-list');
    fl.innerHTML = friends.length ? '' : '<p class="tiny">Пока нет друзей — добавьте выше 👆</p>';
    friends.forEach(id => {
      const p = P(id); if (!p) return;
      const el = document.createElement('div');
      el.className = 'person';
      el.innerHTML = `<div class="ava">${p.ava}</div>
        <div class="info"><div class="nm">${p.name}</div><div class="sub">💬 в друзьях · 👤 ${p.followers} подписчиков</div></div>
        <button class="p-btn" data-msg="${id}">💬</button>
        <button class="p-btn alt" data-blk="${id}">🚫</button>`;
      el.querySelector('[data-msg]').onclick = () => openChat(id);
      el.querySelector('[data-blk]').onclick = () => {
        if (!confirm(`Заблокировать ${p.name}?`)) return;
        HT.settings.blocked.push(p.name);
        HT.set('settings', HT.settings);
        friends = friends.filter(x => x !== id);
        saveAll(); renderFriends();
        document.getElementById('set-blocked').textContent = HT.settings.blocked.length;
        HT.toast('🚫 Заблокирован');
      };
      fl.appendChild(el);
    });
  }
  document.getElementById('friends-search').addEventListener('input', renderFriends);

  /* ================= ЧАТЫ ================= */
  let curChat = null, curKind = 'dm', unread = HT.get('unread', {});

  /* ================= ЭКРАН «ЧАТЫ»: лента контактов + поиск + список ================= */

  function openChatItem(id) {
    if (!id) return;
    if (id === ARTIST_ID) return openArtist();
    if (id === BOT_ID) return openBotChat();
    if (groups.some(g => g.id === id)) return openGroup(id);
    return openChat(id);
  }

  function openBotChat() {
    if (!chats[BOT_ID] || !chats[BOT_ID].length) {
      chats[BOT_ID] = [{ who: 'bot', html: 'Привет! Я 🤖 Бот-помощник. Спрашивай что угодно — отвечу офлайн.', hm: HT.nowHM() }];
      saveAll();
    }
    openChat(BOT_ID);
  }

  /* общий список людей: друзья → участники групп → все демо-персонажи → боты */
  function railPeople() {
    const seen = {};
    const out = [{ kind: 'add' }];
    const push = c => {
      if (!c || !c.id || seen[c.id]) return;
      if (c.name && HT.settings.blocked.includes(c.name)) return;
      seen[c.id] = 1;
      out.push(c);
    };
    friends.forEach(id => push(personOf(id)));
    groups.forEach(g => (g.members || []).forEach(id => push(personOf(id))));
    (window.PEOPLE || []).forEach(p => push(p));
    push(BOT_META);
    push(ARTIST_META);
    return out;
  }

  function renderRail() {
    const rail = document.getElementById('ch-rail');
    if (!rail) return;
    const q = chQuery;
    const items = railPeople().filter(c => c.kind === 'add' || !q || String(c.name).toLowerCase().includes(q));
    rail.innerHTML = items.map(c => {
      if (c.kind === 'add') {
        return `<button class="ch-tile ch-tile-add" id="ch-rail-add" type="button" title="Новая группа">
          <span class="ch-tile-ava">＋</span><span class="ch-tile-nm">группа</span></button>`;
      }
      const dot = unread[c.id] ? '<i class="ch-tile-dot"></i>' : '';
      return `<button class="ch-tile" type="button" data-pid="${esc(c.id)}" title="${esc(c.name)}">
        <span class="ch-tile-ava">${c.ava}${dot}</span>
        <span class="ch-tile-nm">${esc(shortName(c.name))}</span></button>`;
    }).join('');
    const add = rail.querySelector('#ch-rail-add');
    if (add) add.onclick = () => openNewGroup();
    rail.querySelectorAll('[data-pid]').forEach(b => b.onclick = () => openChatItem(b.dataset.pid));
    if (syncRailFade) syncRailFade();
  }

  let syncRailFade = null;

  /* сборка каркаса экрана (один раз, index.html не трогаем) */
  let screenBuilt = false;
  function buildChatsScreen() {
    if (screenBuilt) return;
    const tab = document.getElementById('tab-chats');
    const list = document.getElementById('chat-list');
    if (!tab || !list) return;
    screenBuilt = true;

    /* «Люди» — сразу рядом с «+ группа» в шапке */
    const head = tab.querySelector('.section-head');
    if (head && !document.getElementById('btn-all-people')) {
      const b = document.createElement('button');
      b.className = 'btn-mini v4-ghost';
      b.id = 'btn-all-people';
      b.type = 'button';
      b.innerHTML = ICON_USERS + '<span>Люди</span>';
      b.onclick = openAllPeople;
      head.appendChild(b);
    }

    /* лента «Контакты» + поиск по людям и чатам — над списком чатов */
    if (!document.getElementById('ch-rail')) {
      const top = document.createElement('div');
      top.className = 'ch-top';
      top.innerHTML = `
        <div class="ch-sec">
          <span class="ch-sec-t">Контакты</span>
          <span class="ch-sec-s">все люди приложения — один тап</span>
        </div>
        <div class="ch-rail-outer"><div class="ch-rail" id="ch-rail"></div><span class="ch-rail-fade"></span></div>
        <div class="ch-search">
          ${ICON_SEARCH}
          <input id="ch-search" type="search" autocomplete="off" placeholder="Поиск по людям и чатам">
          <button class="ch-search-x hidden" id="ch-search-x" type="button" title="Очистить">✕</button>
        </div>`;
      tab.insertBefore(top, list);
      const inp = top.querySelector('#ch-search');
      const clearBtn = top.querySelector('#ch-search-x');
      inp.addEventListener('input', () => {
        chQuery = (inp.value || '').trim().toLowerCase();
        clearBtn.classList.toggle('hidden', !chQuery);
        renderChatList();
      });
      clearBtn.onclick = () => {
        inp.value = ''; chQuery = '';
        clearBtn.classList.add('hidden');
        renderChatList();
        inp.focus();
      };

      /* тень-градиент справа — пока в ленте есть что листать */
      const rail = top.querySelector('#ch-rail');
      const fade = top.querySelector('.ch-rail-fade');
      syncRailFade = () => {
        const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
        fade.classList.toggle('off', atEnd);
      };
      rail.addEventListener('scroll', syncRailFade);
      window.addEventListener('resize', syncRailFade);
    }

    /* пустые состояния: подсказка + «Пригласить друзей», «ничего не найдено» */
    if (!document.getElementById('ch-empty-act')) {
      const hint = document.getElementById('chats-hint');
      const act = document.createElement('div');
      act.className = 'ch-empty-act hidden';
      act.id = 'ch-empty-act';
      act.innerHTML = '<button class="btn-primary" id="ch-invite" type="button">👋 Пригласить друзей</button>';
      if (hint && hint.parentNode === tab) tab.insertBefore(act, hint.nextSibling);
      else tab.appendChild(act);
      act.querySelector('#ch-invite').onclick = () => HT.showTab('tab-friends');

      const nores = document.createElement('div');
      nores.className = 'ch-nores hidden';
      nores.id = 'ch-nores';
      nores.innerHTML = '<span class="ch-nores-ico">🔍</span><p>Ничего не найдено — попробуйте другое имя.</p>';
      tab.insertBefore(nores, list.nextSibling);
    }

    bindRowGestures(list);
  }

  /* тап — открыть, долгий тап / свайп влево — контекстное меню */
  let ctxEl = null, ctxId = null, ctxSuppress = false;
  function bindRowGestures(list) {
    let timer = null, x0 = 0, y0 = 0, row = null;
    list.addEventListener('pointerdown', e => {
      row = e.target.closest('.chat-list-item');
      if (!row) return;
      x0 = e.clientX; y0 = e.clientY;
      clearTimeout(timer);
      timer = setTimeout(() => { timer = null; openCtxMenu(row); }, 480);
    });
    list.addEventListener('pointermove', e => {
      if (!timer) return;
      if (Math.abs(e.clientX - x0) > 12 || Math.abs(e.clientY - y0) > 12) {
        clearTimeout(timer); timer = null;
      }
    });
    const end = e => {
      const dx = e.clientX - x0, dy = e.clientY - y0;
      clearTimeout(timer);
      timer = null;
      if (row && e.type === 'pointerup' && dx < -48 && Math.abs(dy) < 70) openCtxMenu(row);
      row = null;
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => list.addEventListener(ev, end));

    list.addEventListener('click', e => {
      const r = e.target.closest('.chat-list-item');
      if (!r) return;
      if (ctxSuppress) { ctxSuppress = false; return; }
      if (ctxEl && !ctxEl.classList.contains('hidden')) closeCtxMenu();
      openChatItem(r.dataset.cid);
    });
  }

  function ensureCtxMenu() {
    if (ctxEl) return ctxEl;
    ctxEl = document.createElement('div');
    ctxEl.id = 'chat-ctx';
    ctxEl.className = 'chat-ctx hidden';
    document.body.appendChild(ctxEl);
    ctxEl.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || !ctxId) return;
      const act = b.dataset.act, id = ctxId;
      closeCtxMenu();
      if (act === 'pin') togglePin(id);
      else if (act === 'clear') clearChat(id);
      else if (act === 'del') deleteChat(id);
    });
    document.addEventListener('pointerdown', e => {
      if (!ctxEl || ctxEl.classList.contains('hidden')) return;
      if (e.target.closest('#chat-ctx')) return;
      closeCtxMenu();
    }, true);
    window.addEventListener('scroll', () => closeCtxMenu(), true);
    return ctxEl;
  }
  function closeCtxMenu() {
    if (ctxEl) ctxEl.classList.add('hidden');
    ctxId = null;
  }
  function openCtxMenu(row) {
    const id = row && row.dataset ? row.dataset.cid : null;
    if (!id) return;
    const m = ensureCtxMenu();
    ctxId = id;
    const isPin = pinnedChats.includes(id);
    m.innerHTML =
      `<button class="ctx-i" data-act="pin" type="button">📌 ${isPin ? 'Открепить' : 'Закрепить'}</button>
       <button class="ctx-i" data-act="clear" type="button">🧽 Очистить чат</button>` +
      (id === ARTIST_ID ? '' : '<button class="ctx-i danger" data-act="del" type="button">🗑 Удалить</button>');
    m.classList.remove('hidden');
    const r = row.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    let left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    ctxSuppress = true;
    setTimeout(() => { ctxSuppress = false; }, 700);
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
  }

  function chatTitle(id) {
    if (id === ARTIST_ID) return 'Художник';
    const g = groups.find(x => x.id === id);
    if (g) return g.name;
    const p = personOf(id);
    return p ? p.name : 'чат';
  }
  function togglePin(id) {
    const i = pinnedChats.indexOf(id);
    if (i >= 0) { pinnedChats.splice(i, 1); HT.toast('📌 Откреплено'); }
    else { pinnedChats.push(id); HT.toast('📌 Закреплено — теперь сверху'); }
    savePinned();
    renderChatList();
  }
  function clearChat(id) {
    if (!confirm(`Очистить переписку «${chatTitle(id)}»? Сообщения не вернуть.`)) return;
    if (id === ARTIST_ID) { artistMsgs = []; saveArtist(); }
    else if (groups.some(g => g.id === id)) {
      const g = groups.find(x => x.id === id);
      g.msgs = [];
      HT.set('groups', groups);
    } else {
      chats[id] = [];
      delete unread[id];
      HT.set('unread', unread);
      saveAll();
    }
    if (curChat === id && chatIsActive()) renderMsgs();
    renderChatList();
    HT.toast('🧹 Чат очищен');
  }
  function deleteChat(id) {
    if (id === ARTIST_ID) return;
    if (!confirm(`Удалить чат «${chatTitle(id)}»?`)) return;
    const isGroup = groups.some(g => g.id === id);
    if (isGroup) groups = groups.filter(x => x.id !== id);
    else delete chats[id];
    delete unread[id];
    pinnedChats = pinnedChats.filter(x => x !== id);
    savePinned();
    HT.set('unread', unread);
    if (isGroup) HT.set('groups', groups); else saveAll();
    if (curChat === id) { curChat = null; HT.showTab('tab-chats'); }
    renderChatList();
    HT.toast('🗑 Чат удалён');
  }

  /* список чатов + фильтр поиска + пустые состояния */
  function renderChatList() {
    buildChatsScreen();
    const q = chQuery;
    const hit = t => !q || String(t || '').toLowerCase().includes(q);
    const rows = [];

    /* личные переписки: друзья, боты и все, кому вы уже писали */
    Object.keys(chats).forEach(id => {
      const msgs = chats[id];
      if (!msgs || !msgs.length) return;
      const p = personOf(id);
      if (!p) return;
      const last = msgs[msgs.length - 1];
      const preview = (last.who === 'me' ? 'Вы: ' : '') + previewOf(last);
      if (!hit(p.name) && !hit(preview)) return;
      rows.push({ id, kind: 'dm', ava: p.ava, name: p.name, preview,
        time: last.hm || (last.ts ? HT.timeAgo(last.ts) : ''), unread: unread[id] || 0 });
    });

    /* групповые чаты */
    groups.forEach(g => {
      const msgs = g.msgs || [];
      const last = msgs[msgs.length - 1];
      const preview = last
        ? (last.who === 'me' ? 'Вы: ' : last.who === 'bot' ? '🤖 ' : '') + previewOf(last)
        : 'группа создана';
      if (!hit(g.name) && !hit(preview)) return;
      rows.push({ id: g.id, kind: 'group',
        ava: `👥<span class="chat-badge">${g.members.length + 1}</span>`,
        name: g.name, preview, time: last ? (last.hm || '') : '', unread: unread[g.id] || 0 });
    });

    /* бот-художник */
    const lastA = artistMsgs[artistMsgs.length - 1];
    const prevA = lastA ? (lastA.img ? '🖼 картинка готова' : previewOf(lastA)) : 'Нарисую картинку по описанию';
    if (hit('Художник') || hit(prevA)) {
      rows.push({ id: ARTIST_ID, kind: 'artist', ava: '🎨', name: 'Художник', sub: 'бот', preview: prevA,
        time: lastA ? (lastA.hm || '') : '', unread: 0 });
    }

    /* закреплённые — сверху */
    rows.sort((a, b) => (pinnedChats.includes(b.id) ? 1 : 0) - (pinnedChats.includes(a.id) ? 1 : 0));

    const list = document.getElementById('chat-list');
    list.innerHTML = rows.map(r => {
      const pin = pinnedChats.includes(r.id);
      return `<div class="chat-list-item${pin ? ' pinned' : ''}" data-cid="${esc(r.id)}">
        <div class="ava">${r.ava}</div>
        <div class="who">
          <div class="nm">${esc(r.name)}${pin ? ' <span class="pin-mark" title="Закреплено">📌</span>' : ''}${r.sub ? ` <span class="ch-sub">${esc(r.sub)}</span>` : ''}</div>
          <div class="last">${esc(r.preview)}</div>
        </div>
        <div class="chat-meta">
          <span class="chat-time">${esc(r.time)}</span>
          ${r.unread ? `<span class="badge-n">${r.unread}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    /* пустые состояния */
    const hasChats = Object.keys(chats).some(id => chats[id] && chats[id].length) || groups.length > 0;
    const showInvite = !q && !hasChats;
    const hint = document.getElementById('chats-hint');
    if (hint) {
      hint.textContent = 'Пока ни одного чата с людьми — выберите человека в ленте «Контакты» выше или создайте группу.';
      hint.classList.toggle('hidden', !showInvite);
    }
    const act = document.getElementById('ch-empty-act');
    if (act) act.classList.toggle('hidden', !showInvite);
    const nores = document.getElementById('ch-nores');
    if (nores) nores.classList.toggle('hidden', !(q && !rows.length));

    renderRail();
    renderContacts();
  }

  const REPLIES = [
    'Привет! 😊 Как дела?',
    'Ооо, интересно! Расскажи подробнее 🤗',
    'Согласна! Давай поддержим друг друга 💪',
    'Я как раз думал(а) об этом же! 🤔',
    'Отличная идея! 🔥',
    'Ха, класс! 😄',
    'Не сдавайся, ты справишься! 💪',
    'Сегодня как раз ставил(ла) эту привычку в трекере 🎯',
    'Скинь потом, любопытно 👀',
    'Записал(а)! 📝',
    'Ух, это круто ☕',
    'Вот это настрой! ✨',
    'Ага, понял(а) 👌',
    'Мне тоже так кажется 🌿',
    'Давай попробуем! 🚀',
    'Слушаю внимательно 🎧',
    'Хм, интересный поворот 🧐',
    'Поддерживаю всем сердцем 💛',
    'Согласен(на), по-человечески 👍',
    'Оо, бывает такое чаще, чем кажется 🌙'
  ];
  const KEY_REPLIES = [
    [/привет|здоров|хай|ку\b|доброе утро|добрый вечер/i, 'Привет-привет! 👋 Рада, что написал(а)!'],
    [/как дела|как ты|как жизнь/i, 'Отлично! Только сделал(а) зарядку и отметил(а) привычку ✅ А ты как?'],
    [/привычк|трекер|серия|стрик/i, '🔥 Держи серию! У меня сейчас 5 дней подряд. Не рви цепочку!'],
    [/план|задач|дела на сегодня/i, 'Совет: разбей день на 3 главные задачи и закрывай их до обеда 🗓'],
    [/домашк|учеб|школ|экзамен|сдач/i, 'Давай вместе! Сначала самое сложное, потом всё остальное 📚'],
    [/спорт|зал|бег|трениров|йог|отжим/i, 'Легкая разминка уже победа! 🏃 Даже 10 минут считаются'],
    [/спасибо|благодар|пасиб/i, 'Всегда пожалуйста! 🤗 Удачи!'],
    [/устал|вымот|тряк|нет сил/i, 'Отдохни 10 минут, попей воды 💧 и вернёшься с новыми силами!'],
    [/музык|песн|плейлист|слуш/i, 'Под залипалку советую спокойный лаунж 🎧 Что сам(а) крутишь?'],
    [/фильм|сериал|кино|байопас/i, 'Я бы выбрал(а) что-то тёплое и на один вечер 🍿 Что смотришь?'],
    [/книг|чита|автор/i, 'Сейчас в топе лёгкая проза и немного нон-фикшна 📖 А что читаешь?'],
    [/еда|готов|рецепт|перекус|завтрак|ужин|обед/i, 'Просто и вкусно: овощи + белок + немного углеводов 🥗 Готовишь сам(а)?'],
    [/погод|дожд|холод|жар|ветер/i, 'Зато как хорошо будет после! ☀️ Гулять пойдём?'],
    [/настро|радост|груст|плохо|тяжело/i, 'Обнимаю 🤗 Держись, вместе точно легче. Расскажи, что случилось?'],
    [/любов|отнош|влюб|свидан/i, 'Главное — говорить о чувствах честно 💛 Тебе сейчас нравится кто-то?'],
    [/работ|проект|началь|коллег/i, 'Рабочий ритм важнее подвигов 🧭 Какой проект сейчас главный?'],
    [/деньг|покуп|бюджет|коплю/i, 'Правило 50/30/20 неплохо работает 💰 Копишь на что-то?'],
    [/праздник|день рождения|подарок|урожд/i, 'Праздник начинается с подготовки 🎁 Что даришь?'],
    [/время|скоро|успею|не успев/i, 'Давай разложим по шагам ⏳ С чего начнём?'],
    [/сон|сплю|бессонниц|ложусь поздно/i, 'Сон — база всего 🌙 Попробуй ложиться на 20 минут раньше.'],
    [/кот|кошк|собак|питомц|щеннок/i, 'Ой, питомцы — это счастье! 🐾 Как зовут?'],
    [/как настро|чем заня|что дела/i, 'В потоке! Работаю, играю и немного отдыхаю 😌 А ты чем занят(а)?'],
    [/\?$/i, 'Хороший вопрос! 🤔 Мой короткий ответ: да, точно стоит попробовать.'],
    [/спокойной ночи|спокойной|до завтра/i, 'Спокойной ночи! 🌙 Хороших снов тебе ✨'],
    [/почему|зачем|как дума/i, 'Иногда ответ приходит, когда просто начинаешь действовать 🌱']
  ];
  const ASK_REPLIES = [
    'А как у тебя?', 'А что скажешь?', 'Расскажи подробнее 🙌',
    'А как настроение?', 'С чего начнём?', 'Ты как думаешь?',
    'Хочешь, подскажу, с чего стартовать?', 'Что планируешь дальше?'
  ];
  const MEMBER_REPLIES = [
    'Ага, +1 🙌', 'У меня так же', 'Вот это я понимаю 🔥',
    'Поддерживаю!', 'Красиво сказано ✨', 'Я за!', 'Ха, точно 😄',
    'Записал в блокнот 📝', 'Давайте попробуем 💪', 'Мне нравится эта мысль 🌿',
    'Согласен(на) на все сто', 'О, об этом я как раз думал(а) 🤔'
  ];
  const lastBy = {};
  const pickFrom = (arr, key) => {
    let r = arr[Math.floor(Math.random() * arr.length)];
    if (arr.length > 1 && lastBy[key] === r) r = arr[(arr.indexOf(r) + 1) % arr.length];
    lastBy[key] = r;
    return r;
  };
  /* ответ бота: по теме, коротко, иногда с вопросом */
  function botReply(text, key) {
    const k = key || 'bot';
    let r = null;
    for (const [re, rr] of KEY_REPLIES) if (re.test(text || '')) { r = rr; break; }
    if (!r) r = pickFrom(REPLIES, k);
    else if (lastBy[k] === r) r = r + ' 😉';
    lastBy[k] = r;
    if (Math.random() < .32) r = r + ' ' + ASK_REPLIES[Math.floor(Math.random() * ASK_REPLIES.length)];
    return r;
  }
  /* ответ случайного участника группы */
  function memberReply(text, key) {
    if (text && /привет|хай|здоров/i.test(text)) return 'Привет! 👋 Рад(а), что ты тут!';
    if (text && /\?/.test(text)) return 'Хм, думаю да 🤔 ' + pickFrom(MEMBER_REPLIES, key || 'm');
    return pickFrom(MEMBER_REPLIES, key || 'm');
  }

  function openChat(id) {
    const p = personOf(id);
    if (!p) return;
    curChat = id;
    curKind = 'dm';
    if (!chats[id]) chats[id] = [];   /* пустая переписка — чтобы собеседник ответил */
    document.getElementById('chat-avatar').textContent = p.ava;
    document.getElementById('chat-name').textContent = p.name;
    document.getElementById('chat-status').textContent = Math.random() > .4 ? 'онлайн 🟢' : 'был(а) недавно';
    document.getElementById('chat-text').innerHTML = '';
    document.getElementById('chat-bot-toggle').classList.add('hidden');
    document.getElementById('chat-del').classList.add('hidden');
    resetComposer();
    delete unread[id];
    HT.set('unread', unread);
    renderMsgs();
    renderChatList();
    HT.showTab('tab-chat');
    document.getElementById('hdr-sub').textContent = p.name;
  }

  function openGroup(gid) {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    curChat = gid;
    curKind = 'group';
    document.getElementById('chat-avatar').textContent = '👥';
    document.getElementById('chat-name').textContent = g.name;
    document.getElementById('chat-status').textContent =
      `${g.members.length + 1} участников${g.hasBot ? ' · 🤖 бот' : ''}`;
    document.getElementById('chat-text').innerHTML = '';
    resetComposer();
    delete unread[gid];
    HT.set('unread', unread);

    const bt = document.getElementById('chat-bot-toggle');
    const del = document.getElementById('chat-del');
    if (g.me) {
      bt.classList.remove('hidden');
      del.classList.remove('hidden');
      del.onclick = () => {
        if (!confirm(`Удалить группу «${g.name}»?`)) return;
        groups = groups.filter(x => x.id !== g.id);
        HT.set('groups', groups);
        renderChatList();
        HT.showTab('tab-chats');
        HT.toast('🗑 Группа удалена');
      };
      const sync = () => {
        bt.classList.toggle('on', g.hasBot);
        bt.textContent = g.hasBot ? '🤖 бот' : '+ бот';
        bt.title = g.hasBot ? 'Убрать бота из группы' : 'Вернуть бота';
      };
      sync();
      bt.onclick = () => {
        g.hasBot = !g.hasBot;
        sync();
        (g.msgs = g.msgs || []).push({
          who: 'bot',
          html: g.hasBot ? '🤖 Я снова здесь! Привет всем 👋' : '🤖 Меня убрали из группы…',
          hm: HT.nowHM()
        });
        HT.set('groups', groups);
        renderMsgs(); renderChatList();
        HT.toast(g.hasBot ? '🤖 Бот добавлен в группу' : '🤖 Бот убран из группы');
      };
    } else {
      bt.classList.add('hidden');
      del.classList.add('hidden');
    }

    renderMsgs();
    renderChatList();
    HT.showTab('tab-chat');
    document.getElementById('hdr-sub').textContent = g.name;
  }

  /* ---------- кнопка «ⓘ» в шапке переписки: мини-карточка человека ---------- */
  function ensureChatInfoBtn() {
    const head = document.querySelector('#tab-chat .chat-head');
    if (!head || document.getElementById('chat-info-btn')) return;
    const b = document.createElement('button');
    b.id = 'chat-info-btn';
    b.className = 'icon-btn ch-info-btn';
    b.type = 'button';
    b.title = 'Контакты и информация';
    b.innerHTML = ICON_INFO;
    head.insertBefore(b, head.querySelector('#chat-bot-toggle'));
    b.onclick = openChatInfo;
  }

  function openChatInfo() {
    if (curKind === 'group') { openGroupCard(); return; }
    if (curKind === 'artist') { openPersonCard(ARTIST_META, true); return; }
    const p = personOf(curChat);
    if (!p) return;
    openPersonCard(p, false);
  }

  function openPersonCard(p, isBot) {
    HT.openModal(`
      <div class="m-title">Контакт <button class="m-close">✕</button></div>
      <div class="pp-head">
        <div class="pp-ava">${p.ava}</div>
        <div class="pp-meta">
          <div class="pp-nm">${esc(p.name)}</div>
          <div class="pp-sub">${esc(p.bio || (isBot ? 'офлайн-бот' : 'собеседник'))}</div>
        </div>
      </div>
      <div class="pp-actions">
        <button class="btn-primary" data-a="write">Написать</button>
        <button class="btn-ghost" data-a="profile">Профиль</button>
        ${isBot ? '' : '<button class="btn-ghost" data-a="group">Добавить в группу</button>'}
      </div>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      HT.closeModal();
      if (a === 'write') {
        if (curChat !== p.id && !isBot) openChatItem(p.id);
        const t = document.getElementById('chat-text');
        if (t) setTimeout(() => t.focus(), 60);
      } else if (a === 'profile') openPersonProfile(p.id);
      else if (a === 'group') openNewGroup(p.id);
    });
  }

  function openPersonProfile(id) {
    const p = personOf(id);
    if (!p) return;
    const isBot = id === BOT_ID || id === ARTIST_ID;
    const links = (p.links || []).filter(Boolean);
    const followers = p.followers ? `<div class="pp-stat"><b>${p.followers}</b><span>подписчиков</span></div>` : '';
    const friendsStat = friends.includes(p.id)
      ? '<div class="pp-stat"><b>✓</b><span>у вас в друзьях</span></div>' : '';
    HT.openModal(`
      <div class="m-title">Профиль <button class="m-close">✕</button></div>
      <div class="pp-head">
        <div class="pp-ava big">${p.ava}</div>
        <div class="pp-meta">
          <div class="pp-nm">${esc(p.name)}</div>
          <div class="pp-sub">${esc(p.bio || '')}</div>
        </div>
      </div>
      <div class="pp-stats">${followers}${friendsStat}</div>
      ${links.length ? `<div class="pp-links">${links.map(l =>
        `<a href="${/^https?:/.test(l) ? l : 'https://' + l}" target="_blank" rel="noopener">🔗 ${esc(l)}</a>`).join('')}</div>` : ''}
      <div class="pp-actions">
        ${isBot ? '' : '<button class="btn-primary" data-a="write">Написать</button>'}
        ${isBot ? '' : '<button class="btn-ghost" data-a="friends">В друзья</button>'}
        <button class="btn-ghost" data-a="close">Закрыть</button>
      </div>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      HT.closeModal();
      if (a === 'write') {
        openChatItem(p.id);
        const t = document.getElementById('chat-text');
        if (t) setTimeout(() => t.focus(), 60);
      } else if (a === 'friends') {
        if (friends.includes(p.id)) return HT.toast('✓ Вы уже друзья');
        HT.toast(`Заявка для ${shortName(p.name)} отправлена…`);
        setTimeout(() => {
          if (!friends.includes(p.id)) friends.push(p.id);
          if (!chats[p.id]) chats[p.id] = [{ who: 'them', html: `Привет! Рада дружбе 😊`, hm: HT.nowHM() }];
          saveAll(); renderFriends(); renderChatList();
          HT.toast(`✅ ${shortName(p.name)} в друзьях — можно писать!`);
        }, 1000);
      }
    });
  }

  function openGroupCard() {
    const g = groups.find(x => x.id === curChat);
    if (!g) return;
    const members = g.members.map(id => personOf(id)).filter(Boolean);
    HT.openModal(`
      <div class="m-title">Группа <button class="m-close">✕</button></div>
      <div class="pp-head">
        <div class="pp-ava">👥</div>
        <div class="pp-meta">
          <div class="pp-nm">${esc(g.name)}</div>
          <div class="pp-sub">${g.members.length + 1} участников${g.hasBot ? ' · 🤖 бот' : ''}</div>
        </div>
      </div>
      <div class="m-label">Участники</div>
      <div class="pp-members">
        ${members.map(m => `<div class="pp-member" data-p="${esc(m.id)}">
          <span class="pp-m-ava">${m.ava}</span><span class="pp-m-nm">${esc(m.name)}</span>
          <button class="btn-mini v4-ghost" data-write="${esc(m.id)}">Написать</button></div>`).join('') ||
          '<p class="tiny">Участников пока нет</p>'}
      </div>
      <div class="pp-actions">
        <button class="btn-primary" data-a="people">Все люди</button>
        <button class="btn-ghost" data-a="add">Новая группа</button>
      </div>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelectorAll('[data-write]').forEach(b => b.onclick = () => {
      HT.closeModal();
      openChatItem(b.dataset.write);
    });
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      HT.closeModal();
      if (a === 'people') openAllPeople();
      else if (a === 'add') openNewGroup(g.members[0]);
    });
  }

  /* ---------- доступ к текущему списку сообщений ---------- */
  function curMsgs() {
    if (curKind === 'group') {
      const g = groups.find(x => x.id === curChat);
      return (g && g.msgs) || [];
    }
    if (curKind === 'artist') return artistMsgs;
    return chats[curChat] || [];
  }
  function saveCur() {
    if (curKind === 'group') HT.set('groups', groups);
    else if (curKind === 'artist') saveArtist();
    else saveAll();
  }
  function chatIsActive() {
    return document.getElementById('tab-chat').classList.contains('active');
  }
  function nameOf(m) {
    if (!m) return '';
    if (m.who === 'me') return 'Вы';
    if (m.who === 'bot') return curKind === 'artist' ? 'Художник' : 'Бот';
    if (m.name) return m.name;
    const p = P(m.who);
    if (p) return curKind === 'group' ? p.name.split(' ')[0] : p.name;
    return 'Участник';
  }
  function textOf(m) {
    if (!m) return '';
    if (m.stickerEmoji) return m.stickerEmoji;
    if (m.sticker) return 'стикер 🖼';
    if (m.audio) return '🎵 ' + (m.audioName || 'аудио');
    if (m.voice) return '🎤 голосовое ' + fmtDur(m.dur || 1);
    const t = String(m.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (t) return t.slice(0, 120);
    return m.img ? '🖼 картинка' : 'сообщение';
  }
  function previewOf(m) {
    if (!m) return '';
    if (m.stickerEmoji) return m.stickerEmoji + ' стикер';
    if (m.sticker) return '🖼 стикер';
    if (m.audio) return '🎵 ' + (m.audioName || 'аудио');
    if (m.voice) return '🎤 голосовое';
    if (m.img && !m.html) return '🖼 картинка';
    return String(m.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 44);
  }

  const ICON_REPLY = '<svg class="ic" viewBox="0 0 24 24"><path d="M10 8L5.5 12l4.5 4"/><path d="M5.5 12H14a5 5 0 0 1 5 5v1.5"/></svg>';
  const ICON_SMILE = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4"/><path d="M8.6 14.2a4.2 4.2 0 0 0 6.8 0"/><path d="M9.3 9.7h.01M14.7 9.7h.01" stroke-width="2.6"/></svg>';
  const ICON_PLAY = '<svg class="ic" viewBox="0 0 24 24"><path d="M8.5 5.8l10 6.2-10 6.2z" fill="currentColor" stroke="none"/></svg>';
  const ICON_PAUSE = '<svg class="ic" viewBox="0 0 24 24"><path d="M9.5 6v12M14.5 6v12" stroke-width="2.4"/></svg>';

  function audioHTML(m) {
    return `<div class="au-player" data-src="${m.audio}">
      <button class="au-play" type="button" title="Слушать">${ICON_PLAY}</button>
      <div class="au-meta">
        <div class="au-name">${esc(m.audioName || 'Аудио')}</div>
        <div class="au-track"><i></i></div>
      </div>
      <span class="au-time">0:00</span>
    </div>`;
  }

  function bodyHTML(m) {
    if (m.sticker) return `<img class="msg-sticker" src="${m.sticker}" alt="стикер">`;
    if (m.stickerEmoji) return `<span class="msg-sticker-emoji">${m.stickerEmoji}</span>`;
    const img = m.img ? `<img class="gen-img" src="${m.img}" alt="картинка">` : '';
    const au = m.audio ? audioHTML(m) : '';
    const voice = m.voice ? `
        <div class="voice-bubble" data-src="${m.voice}" data-dur="${m.dur || 1}">
          <button class="vb-play" title="Слушать">▶</button>
          <div class="vb-bars">${Array.from({ length: 22 }, (_, i) => `<i style="height:${28 + ((i * 37) % 66)}%"></i>`).join('')}</div>
          <span class="vb-time">${fmtDur(m.dur || 1)}</span>
        </div>` : '';
    return img + ((au + voice) || (m.html || ''));
  }

  function rowHTML(m, i) {
    const isMe = m.who === 'me';
    let whoLbl = '';
    if (!isMe && curKind === 'group') {
      const label = m.who === 'bot' ? 'Бот'
        : (m.name || (P(m.who) ? P(m.who).name.split(' ')[0] : 'Участник'));
      whoLbl = `<span class="msg-who">${esc(label)}</span>`;
    }
    const stickerOnly = !!(m.sticker || m.stickerEmoji);
    const reply = m.reply
      ? `<div class="msg-reply" title="Ответ на сообщение">
           <span class="msg-reply-name">${esc(m.reply.name || '')}</span>
           <span class="msg-reply-text">${esc(m.reply.text || '')}</span>
         </div>` : '';
    const react = m.reaction ? `<div class="msg-react">${m.reaction}</div>` : '';
    return `<div class="msg-row ${isMe ? 'me' : 'them'}" data-i="${i}">
      <div class="msg-tools">
        <button class="msg-tool" data-act="reply" type="button" title="Ответить">${ICON_REPLY}</button>
        <button class="msg-tool" data-act="react" type="button" title="Реакция">${ICON_SMILE}</button>
      </div>
      <div class="msg-col">
        <div class="msg ${isMe ? 'me' : 'them'} ${m.who === 'bot' ? 'gen' : ''} ${stickerOnly ? 'stk-only' : ''}">${whoLbl}${reply}<div class="msg-body">${bodyHTML(m)}</div>
          <span class="msg-time">${m.hm || ''}</span></div>
        ${react}
      </div>
    </div>`;
  }

  function renderMsgs() {
    const box = document.getElementById('chat-msgs');
    box.innerHTML = curMsgs().map(rowHTML).join('');
    bindVoices(box);
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- голосовые сообщения (кружки, до 5 минут) ---------- */
  const fmtDur = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let voiceAudios = [];
  function bindVoices(root) {
    voiceAudios.forEach(a => { try { a.pause(); } catch (e) {} });
    voiceAudios = [];
    root.querySelectorAll('.voice-bubble').forEach(bub => {
      const btn = bub.querySelector('.vb-play');
      const bars = [...bub.querySelectorAll('.vb-bars i')];
      let aud = null;
      btn.onclick = () => {
        if (aud && !aud.paused) { aud.pause(); return; }
        voiceAudios.forEach(a => { try { a.pause(); } catch (e) {} });
        aud = aud || new Audio(bub.dataset.src);
        voiceAudios.push(aud);
        btn.textContent = '❚❚';
        bars.forEach(x => x.classList.remove('on'));
        aud.onTimeUpdate = () => {
          const p = aud.duration ? aud.currentTime / aud.duration : 0;
          bars.forEach((x, i) => x.classList.toggle('on', i / bars.length <= p));
        };
        aud.onended = () => { btn.textContent = '▶'; bars.forEach(x => x.classList.remove('on')); };
        aud.play().catch(() => HT.toast('Не удалось воспроизвести'));
      };
    });
  }

  /* =====================================================================
     МЕССЕНДЖЕР: ответы на сообщения, реакции, стикеры, звук
     ===================================================================== */

  /* ---------- ответ на сообщение ---------- */
  let replyTo = null;
  function setReply(i) {
    const m = curMsgs()[i];
    if (!m) return;
    replyTo = { name: nameOf(m), text: textOf(m) };
    const bar = document.getElementById('chat-reply');
    document.getElementById('chat-reply-text').innerHTML =
      `<b>${esc(replyTo.name)}</b><span>${esc(replyTo.text)}</span>`;
    bar.classList.remove('hidden');
    const inp = document.getElementById('chat-text');
    if (inp) inp.focus();
  }
  function clearReply() {
    replyTo = null;
    const bar = document.getElementById('chat-reply');
    if (bar) bar.classList.add('hidden');
  }
  document.getElementById('chat-reply-cancel').onclick = clearReply;

  /* ---------- панель реакций ---------- */
  const REACTIONS = ['❤️', '😂', '😍', '👍', '🔥', '😮'];
  let reactPop = null, reactIdx = -1;

  function ensureReactPop() {
    if (reactPop) return reactPop;
    reactPop = document.createElement('div');
    reactPop.id = 'msg-react-pop';
    reactPop.className = 'hidden';
    reactPop.innerHTML =
      `<div class="rp-row">${REACTIONS.map(r => `<button class="rp-e" data-re="${r}" type="button">${r}</button>`).join('')}</div>
       <div class="rp-sep"></div>
       <button class="rp-reply" type="button">${ICON_REPLY}<span>Ответить</span></button>`;
    document.body.appendChild(reactPop);
    reactPop.addEventListener('click', e => {
      const b = e.target.closest('.rp-e');
      if (b) { const i = reactIdx; closeReactPop(); setReaction(i, b.dataset.re); return; }
      if (e.target.closest('.rp-reply')) { const i = reactIdx; closeReactPop(); setReply(i); }
    });
    return reactPop;
  }
  function openReactPop(i, anchor) {
    const m = curMsgs()[i];
    if (!m || !anchor) return;
    const pop = ensureReactPop();
    reactIdx = i;
    pop.querySelectorAll('.rp-e').forEach(b =>
      b.classList.toggle('on', b.dataset.re === m.reaction));
    pop.classList.remove('hidden');
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.round(r.left + r.width / 2 - w / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = Math.round(r.top - h - 10);
    if (top < 8) top = Math.round(Math.min(r.bottom + 10, window.innerHeight - h - 8));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function closeReactPop() {
    if (reactPop) reactPop.classList.add('hidden');
    reactIdx = -1;
  }
  function setReaction(i, emoji) {
    const m = curMsgs()[i];
    if (!m || !emoji) return;
    if (m.reaction === emoji) delete m.reaction;   /* повторный тап — снять */
    else m.reaction = emoji;
    saveCur();
    renderMsgs();
    const pill = document.querySelector(`.msg-row[data-i="${i}"] .msg-react`);
    if (pill) pill.classList.add('pop');
  }
  document.addEventListener('click', e => {
    if (!reactPop || reactPop.classList.contains('hidden')) return;
    if (e.target.closest('#msg-react-pop')) return;
    if (e.target.closest('.msg-tool[data-act="react"]')) return;
    closeReactPop();
  });

  /* ---------- делегирование кликов по сообщениям + долгое нажатие ---------- */
  const msgsBox = document.getElementById('chat-msgs');
  let lpT = null, longFired = false, longReset = null;
  msgsBox.addEventListener('pointerdown', e => {
    const row = e.target.closest('.msg-row');
    if (!row) return;
    if (e.target.closest('button') || e.target.closest('a')) return;
    clearTimeout(lpT);
    lpT = setTimeout(() => {
      longFired = true;
      clearTimeout(longReset);
      longReset = setTimeout(() => { longFired = false; }, 1200);
      openReactPop(+row.dataset.i, row.querySelector('.msg'));
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
    }, 420);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    msgsBox.addEventListener(ev, () => clearTimeout(lpT)));
  msgsBox.addEventListener('scroll', () => clearTimeout(lpT));

  msgsBox.addEventListener('click', e => {
    const row = e.target.closest('.msg-row');
    if (!row) return;
    const i = +row.dataset.i;
    const tool = e.target.closest('.msg-tool');
    if (tool) {
      if (tool.dataset.act === 'reply') setReply(i);
      else openReactPop(i, tool);
      return;
    }
    if (e.target.closest('.msg-react')) {
      const m = curMsgs()[i];
      if (m && m.reaction) setReaction(i, m.reaction);
      return;
    }
    const au = e.target.closest('.au-play');
    if (au) { toggleAudio(au); return; }
    if (longFired) { longFired = false; clearTimeout(lpT); }
  });

  /* ---------- аудио-плеер в пузыре (один играющий на весь документ) ---------- */
  let auAudio = null, auBtn = null;
  function setPlayIcon(btn, on) {
    btn.classList.toggle('playing', on);
    btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
  }
  function stopAudio() {
    if (auAudio) { try { auAudio.pause(); } catch (e) {} }
    if (auBtn && auBtn.isConnected) setPlayIcon(auBtn, false);
    auAudio = null; auBtn = null;
  }
  function toggleAudio(btn) {
    const player = btn.closest('.au-player');
    if (!player) return;
    if (auAudio && auBtn === btn && !auAudio.paused) { auAudio.pause(); setPlayIcon(btn, false); return; }
    if (auAudio) { try { auAudio.pause(); } catch (e) {} if (auBtn && auBtn.isConnected) setPlayIcon(auBtn, false); }
    const fresh = !auAudio || auBtn !== btn;
    if (fresh) auAudio = new Audio(player.dataset.src);
    auBtn = btn;
    const track = player.querySelector('.au-track i');
    const time = player.querySelector('.au-time');
    setPlayIcon(btn, true);
    auAudio.ontimeupdate = () => {
      const a = auAudio;
      const p = a.duration ? a.currentTime / a.duration : 0;
      if (track) track.style.width = Math.round(p * 100) + '%';
      if (time) time.textContent = fmtDur(a.currentTime || 0) + ' / ' +
        (isFinite(a.duration) ? fmtDur(a.duration) : '…');
    };
    auAudio.onended = () => { setPlayIcon(btn, false); if (track) track.style.width = '0%'; };
    auAudio.play().catch(() => HT.toast('Не удалось воспроизвести'));
  }

  /* ---------- чип прикрепления аудио над полем ввода ---------- */
  let auChip = null, pendingAudio = null;
  function ensureChip() {
    if (auChip) return auChip;
    auChip = document.createElement('div');
    auChip.id = 'au-chip';
    auChip.className = 'au-chip hidden';
    const row = document.querySelector('#tab-chat .chat-input-row');
    row.parentNode.insertBefore(auChip, row);
    return auChip;
  }
  function setAudioChip(au) {
    pendingAudio = au;
    const chip = ensureChip();
    chip.innerHTML = `<button class="au-chip-play" type="button">${ICON_PLAY}</button>
      <span class="au-chip-name">🎵 ${esc(au.name)}</span>
      <button class="au-chip-x" type="button" title="Убрать">✕</button>`;
    chip.classList.remove('hidden');
    chip.querySelector('.au-chip-x').onclick = clearAudioChip;
    chip.querySelector('.au-chip-play').onclick = () => {
      const a = new Audio(pendingAudio.url);
      a.play().catch(() => HT.toast('Не удалось воспроизвести'));
      setTimeout(() => { try { a.pause(); } catch (e) {} }, 4000);
    };
  }
  function clearAudioChip() {
    pendingAudio = null;
    if (auChip) auChip.classList.add('hidden');
  }
  function resetComposer() {
    clearReply();
    clearAudioChip();
    closeStickerPanel();
    stopAudio();
  }

  document.getElementById('chat-music-btn').onclick = () => HT.pickFile('audio/*', f => {
    if (f.type && !/^audio\//.test(f.type)) return HT.toast('Нужен аудиофайл 🎵');
    const name = f.name || 'аудио';
    if (f.size > 3.5e6) {
      setAudioChip({ name, url: URL.createObjectURL(f), file: f, session: true });
      HT.toast('🎵 Файл больше 3.5 МБ — отправим ссылкой (до перезагрузки)');
      return;
    }
    const r = new FileReader();
    r.onload = () => setAudioChip({ name, url: r.result, file: f });
    r.onerror = () => HT.toast('Не удалось прочитать файл');
    r.readAsDataURL(f);
  });

  /* =====================================================================
     СТИКЕРЫ: паки (emoji + SVG + свои фото + «Мои» от ИИ-бота)
     ===================================================================== */
  const svgURL = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`;

  const CLASSIC_EMOJI = ['😀', '🥰', '😎', '🤩', '😂', '🤗', '😴', '🤔',
    '❤️', '🔥', '⭐', '🌈', '🎉', '💪', '☕', '🌸'];

  const CAT_SVG = [
    /* котик-мордочка */
    wrap(`<path d="M34 48 L37 21 L58 35Z" fill="#E8A96B"/><path d="M94 48 L91 21 L70 35Z" fill="#E8A96B"/>
      <path d="M38 45 L40 28 L53 37Z" fill="#F5CBA6"/><path d="M90 45 L88 28 L75 37Z" fill="#F5CBA6"/>
      <ellipse cx="64" cy="68" rx="39" ry="34" fill="#E8A96B"/>
      <circle cx="50" cy="63" r="5.4" fill="#3A2E24"/><circle cx="78" cy="63" r="5.4" fill="#3A2E24"/>
      <circle cx="51.8" cy="61" r="1.9" fill="#FFFDF8"/><circle cx="79.8" cy="61" r="1.9" fill="#FFFDF8"/>
      <path d="M64 73 l-5.5 4.5h11z" fill="#C4693F"/>
      <path d="M64 78 q-5 6 -10 2 M64 78 q5 6 10 2" stroke="#3A2E24" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M25 66h14M25 74h14M89 66h14M89 74h14" stroke="#3A2E24" stroke-width="2" opacity=".45" stroke-linecap="round"/>`),
    /* спящий котик */
    wrap(`<path d="M112 96 q14 -8 10 -26 q-3 -13 -16 -15" stroke="#E8A96B" stroke-width="12" fill="none" stroke-linecap="round"/>
      <ellipse cx="66" cy="88" rx="45" ry="27" fill="#E8A96B"/>
      <path d="M25 62 L22 39 L43 51Z" fill="#D9914F"/><path d="M61 62 L65 40 L44 48Z" fill="#D9914F"/>
      <circle cx="43" cy="76" r="26" fill="#F0BC85"/>
      <path d="M33 74 q5 6 10 0 M50 74 q5 6 10 0" stroke="#3A2E24" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M44 83 l-4 3.5h8z" fill="#C4693F"/>
      <path d="M44 87 q-4 5 -8 2 M44 87 q4 5 8 2" stroke="#3A2E24" stroke-width="2.2" fill="none" stroke-linecap="round"/>`),
    /* лапка */
    wrap(`<ellipse cx="64" cy="86" rx="27" ry="21" fill="#F0BC85"/>
      <circle cx="37" cy="58" r="11.5" fill="#F0BC85"/><circle cx="55" cy="46" r="11.5" fill="#F0BC85"/>
      <circle cx="75" cy="46" r="11.5" fill="#F0BC85"/><circle cx="93" cy="58" r="11.5" fill="#F0BC85"/>
      <ellipse cx="64" cy="86" rx="27" ry="21" fill="none" stroke="#C4693F" stroke-width="3" opacity=".55"/>
      <path d="M55 84 q9 -8 18 0" stroke="#C4693F" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`),
    /* котик с сердечком */
    wrap(`<path d="M34 46 L37 19 L58 33Z" fill="#E8A96B"/><path d="M94 46 L91 19 L70 33Z" fill="#E8A96B"/>
      <ellipse cx="64" cy="66" rx="38" ry="33" fill="#E8A96B"/>
      <path d="M52 60 q4 -6 8 0 M70 60 q4 -6 8 0" stroke="#3A2E24" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path d="M64 72 l-5 4h10z" fill="#C4693F"/>
      <path d="M64 76 q-5 6 -10 2 M64 76 q5 6 10 2" stroke="#3A2E24" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M64 118 c-16 -11 -26 -20 -26 -31 a13 13 0 0 1 26 -6 a13 13 0 0 1 26 6 c0 11 -10 20 -26 31z" fill="#E0625F"/>
      <path d="M56 92 a9 9 0 0 1 8 -5" stroke="#FFFDF8" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`),
    /* котик в коробке */
    wrap(`<rect x="26" y="70" width="76" height="42" rx="6" fill="#D9A566"/>
      <path d="M26 70 h76 l-10 -14 h-56z" fill="#E8BE8B"/>
      <path d="M42 66 L45 42 L64 54Z" fill="#E8A96B"/><path d="M86 66 L83 42 L64 54Z" fill="#E8A96B"/>
      <circle cx="64" cy="60" r="24" fill="#F0BC85"/>
      <circle cx="55" cy="58" r="4" fill="#3A2E24"/><circle cx="73" cy="58" r="4" fill="#3A2E24"/>
      <path d="M64 66 l-4 3.5h8z" fill="#C4693F"/>
      <path d="M30 82 h68" stroke="#C4693F" stroke-width="3" opacity=".4"/>`),
    /* котик машет лапкой */
    wrap(`<path d="M34 50 L37 23 L58 37Z" fill="#E8A96B"/><path d="M94 50 L91 23 L70 37Z" fill="#E8A96B"/>
      <ellipse cx="60" cy="74" rx="36" ry="32" fill="#E8A96B"/>
      <circle cx="48" cy="70" r="5" fill="#3A2E24"/><circle cx="74" cy="70" r="5" fill="#3A2E24"/>
      <path d="M61 80 l-5 4h10z" fill="#C4693F"/>
      <path d="M61 84 q-5 6 -10 2 M61 84 q5 6 10 2" stroke="#3A2E24" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M96 78 q14 -12 12 -30" stroke="#E8A96B" stroke-width="13" fill="none" stroke-linecap="round"/>
      <circle cx="107" cy="44" r="10" fill="#F0BC85"/>`)
  ];

  const BEAST_SVG = [
    /* лиса */
    wrap(`<path d="M30 44 L34 16 L58 36Z" fill="#E07B39"/><path d="M98 44 L94 16 L70 36Z" fill="#E07B39"/>
      <path d="M35 41 L38 24 L52 38Z" fill="#3A2E24" opacity=".25"/><path d="M93 41 L90 24 L76 38Z" fill="#3A2E24" opacity=".25"/>
      <path d="M64 116 C36 108 26 88 30 62 C33 44 47 34 64 34 C81 34 95 44 98 62 C102 88 92 108 64 116Z" fill="#E07B39"/>
      <path d="M64 116 C52 106 46 92 46 78 C52 84 58 88 64 88 C70 88 76 84 82 78 C82 92 76 106 64 116Z" fill="#FFFDF8"/>
      <circle cx="49" cy="64" r="5" fill="#3A2E24"/><circle cx="79" cy="64" r="5" fill="#3A2E24"/>
      <path d="M64 86 l-5 4h10z" fill="#3A2E24"/>`),
    /* медвежонок */
    wrap(`<circle cx="36" cy="38" r="15" fill="#A9764F"/><circle cx="92" cy="38" r="15" fill="#A9764F"/>
      <circle cx="36" cy="38" r="7" fill="#E8C7A6"/><circle cx="92" cy="38" r="7" fill="#E8C7A6"/>
      <circle cx="64" cy="70" r="40" fill="#A9764F"/>
      <ellipse cx="64" cy="84" rx="21" ry="16" fill="#E8C7A6"/>
      <circle cx="50" cy="62" r="5.2" fill="#3A2E24"/><circle cx="78" cy="62" r="5.2" fill="#3A2E24"/>
      <ellipse cx="64" cy="78" rx="7" ry="5" fill="#3A2E24"/>
      <path d="M64 83 q-6 7 -11 2 M64 83 q6 7 11 2" stroke="#3A2E24" stroke-width="2.6" fill="none" stroke-linecap="round"/>`),
    /* зайчик */
    wrap(`<ellipse cx="47" cy="34" rx="11" ry="27" fill="#F2E7DA"/><ellipse cx="81" cy="34" rx="11" ry="27" fill="#F2E7DA"/>
      <ellipse cx="47" cy="36" rx="5.5" ry="19" fill="#F0B7C4"/><ellipse cx="81" cy="36" rx="5.5" ry="19" fill="#F0B7C4"/>
      <circle cx="64" cy="78" r="34" fill="#F2E7DA"/>
      <circle cx="52" cy="74" r="4.6" fill="#3A2E24"/><circle cx="76" cy="74" r="4.6" fill="#3A2E24"/>
      <path d="M64 84 l-4.5 4h9z" fill="#E08A9B"/>
      <path d="M64 88 q-5 6 -9 2 M64 88 q5 6 9 2" stroke="#3A2E24" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M40 86h10M40 92h10M78 86h10M78 92h10" stroke="#3A2E24" stroke-width="1.8" opacity=".4" stroke-linecap="round"/>`),
    /* оленёнок */
    wrap(`<path d="M42 44 L34 22 M42 44 L26 34 M86 44 L94 22 M86 44 L102 34" stroke="#8A6034" stroke-width="6" fill="none" stroke-linecap="round"/>
      <ellipse cx="64" cy="76" rx="30" ry="33" fill="#C99461"/>
      <ellipse cx="64" cy="90" rx="16" ry="14" fill="#F0DCC2"/>
      <circle cx="52" cy="70" r="4.8" fill="#3A2E24"/><circle cx="76" cy="70" r="4.8" fill="#3A2E24"/>
      <ellipse cx="64" cy="86" rx="6" ry="4.5" fill="#3A2E24"/>
      <circle cx="42" cy="60" r="4" fill="#FFFDF8" opacity=".7"/><circle cx="86" cy="60" r="4" fill="#FFFDF8" opacity=".7"/>`),
    /* панда */
    wrap(`<circle cx="36" cy="42" r="14" fill="#3A2E24"/><circle cx="92" cy="42" r="14" fill="#3A2E24"/>
      <circle cx="64" cy="70" r="40" fill="#FFFDF8"/>
      <ellipse cx="47" cy="66" rx="12" ry="14" fill="#3A2E24" transform="rotate(-14 47 66)"/>
      <ellipse cx="81" cy="66" rx="12" ry="14" fill="#3A2E24" transform="rotate(14 81 66)"/>
      <circle cx="48" cy="65" r="4.2" fill="#FFFDF8"/><circle cx="80" cy="65" r="4.2" fill="#FFFDF8"/>
      <ellipse cx="64" cy="84" rx="7" ry="5" fill="#3A2E24"/>
      <path d="M64 89 q-6 7 -11 2 M64 89 q6 7 11 2" stroke="#3A2E24" stroke-width="2.6" fill="none" stroke-linecap="round"/>`),
    /* лягушка */
    wrap(`<circle cx="44" cy="42" r="15" fill="#7A8B6F"/><circle cx="84" cy="42" r="15" fill="#7A8B6F"/>
      <circle cx="44" cy="42" r="10" fill="#FFFDF8"/><circle cx="84" cy="42" r="10" fill="#FFFDF8"/>
      <circle cx="45" cy="43" r="5" fill="#3A2E24"/><circle cx="83" cy="43" r="5" fill="#3A2E24"/>
      <path d="M28 74 C28 56 44 50 64 50 C84 50 100 56 100 74 C100 96 84 108 64 108 C44 108 28 96 28 74Z" fill="#7A8B6F"/>
      <path d="M46 84 q18 14 36 0" stroke="#3A2E24" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <circle cx="44" cy="72" r="4" fill="#E0625F" opacity=".55"/><circle cx="84" cy="72" r="4" fill="#E0625F" opacity=".55"/>`)
  ];

  const NATURE_SVG = [
    /* солнце */
    wrap(`<circle cx="64" cy="64" r="26" fill="#F0B429"/>
      <g stroke="#F0B429" stroke-width="6" stroke-linecap="round">
      <path d="M64 14v12M64 102v12M14 64h12M102 64h12M29 29l9 9M90 90l9 9M99 29l-9 9M38 90l-9 9"/></g>
      <circle cx="55" cy="57" r="4" fill="#C4693F" opacity=".5"/><circle cx="72" cy="70" r="5" fill="#C4693F" opacity=".4"/>`),
    /* луна */
    wrap(`<path d="M84 26 A42 42 0 1 0 84 102 A34 34 0 1 1 84 26Z" fill="#F4EFD2"/>
      <circle cx="62" cy="52" r="6" fill="#E4DDB8"/><circle cx="54" cy="80" r="4.5" fill="#E4DDB8"/>
      <circle cx="104" cy="34" r="3.5" fill="#F0B429"/><circle cx="100" cy="94" r="2.6" fill="#F0B429"/>`),
    /* облако */
    wrap(`<path d="M34 92 a20 20 0 0 1 3 -39 a26 26 0 0 1 49 -6 a21 21 0 0 1 8 45z" fill="#FFFDF8" stroke="#D8CBBA" stroke-width="3"/>
      <path d="M46 100h36" stroke="#C9B9A6" stroke-width="4" stroke-linecap="round" opacity=".7"/>`),
    /* дерево */
    wrap(`<rect x="58" y="70" width="12" height="42" rx="4" fill="#8A6034"/>
      <circle cx="64" cy="52" r="30" fill="#7A8B6F"/><circle cx="40" cy="64" r="19" fill="#8FA07F"/>
      <circle cx="88" cy="64" r="19" fill="#6D7E62"/><circle cx="64" cy="34" r="18" fill="#93A585"/>`),
    /* гора */
    wrap(`<path d="M10 110 L52 30 L82 74 L98 48 L120 110Z" fill="#7E8CA8"/>
      <path d="M52 30 L66 56 L38 56Z" fill="#FFFDF8"/>
      <path d="M98 48 L106 64 L90 64Z" fill="#FFFDF8" opacity=".9"/>
      <path d="M10 110h110" stroke="#5E6A82" stroke-width="5" stroke-linecap="round"/>`),
    /* волна */
    wrap(`<path d="M8 62 q16 -16 32 0 t32 0 t32 0 t16 0" stroke="#4A9FD4" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M8 86 q16 -16 32 0 t32 0 t32 0 t16 0" stroke="#7BC3E8" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M8 38 q16 -16 32 0 t32 0 t32 0 t16 0" stroke="#BFE3F2" stroke-width="8" fill="none" stroke-linecap="round"/>`),
    /* цветок */
    wrap(`<path d="M64 118 V70" stroke="#7A8B6F" stroke-width="6" stroke-linecap="round"/>
      <path d="M64 96 q-18 -6 -22 -22 q18 2 22 22z" fill="#8FA07F"/>
      <g fill="#E0625F"><circle cx="64" cy="40" r="15"/><circle cx="42" cy="52" r="15"/><circle cx="86" cy="52" r="15"/>
      <circle cx="50" cy="26" r="15"/><circle cx="78" cy="26" r="15"/></g>
      <circle cx="64" cy="42" r="12" fill="#F0B429"/>`),
    /* звезда */
    wrap(`<path d="M64 14 L76 48 L112 50 L84 72 L94 108 L64 86 L34 108 L44 72 L16 50 L52 48Z" fill="#F0B429"/>
      <circle cx="64" cy="64" r="10" fill="#FFFDF8" opacity=".65"/>`)
  ];

  let stkPanel = null, stkPackId = 'classic';
  function allPacks() {
    const packs = [
      { id: 'classic', name: 'Классика', emoji: CLASSIC_EMOJI },
      { id: 'cats', name: 'Котики', imgs: CAT_SVG.map(svgURL) },
      { id: 'beasts', name: 'Зверята', imgs: BEAST_SVG.map(svgURL) },
      { id: 'nature', name: 'Природа', imgs: NATURE_SVG.map(svgURL) }
    ];
    const mine = HT.get('aiStickers', []);
    if (mine.length) packs.push({ id: 'mine', name: 'Мои', imgs: mine.slice() });
    HT.get('stickerPacks', []).forEach(p =>
      packs.push({ id: p.id, name: p.name, imgs: (p.stickers || []).slice() }));
    return packs;
  }
  function ensureStickerPanel() {
    if (stkPanel) return stkPanel;
    stkPanel = document.createElement('div');
    stkPanel.id = 'stk-panel';
    stkPanel.className = 'stk-panel hidden';
    stkPanel.innerHTML = `
      <div class="stk-head">
        <div class="stk-tabs" id="stk-tabs"></div>
        <button class="stk-add" id="stk-add" type="button" title="Свой пак">＋ пак</button>
        <button class="stk-close" id="stk-close" type="button" title="Закрыть">✕</button>
      </div>
      <div class="stk-grid" id="stk-grid"></div>`;
    const row = document.querySelector('#tab-chat .chat-input-row');
    row.parentNode.insertBefore(stkPanel, row);
    document.getElementById('stk-close').onclick = closeStickerPanel;
    document.getElementById('stk-add').onclick = addOwnPack;
    document.getElementById('stk-tabs').addEventListener('click', e => {
      const b = e.target.closest('.stk-tab');
      if (!b) return;
      stkPackId = b.dataset.pack;
      renderStickerTabs(); renderStickerGrid();
    });
    document.getElementById('stk-grid').addEventListener('click', e => {
      const b = e.target.closest('.stk-item');
      if (!b) return;
      if (b.dataset.e) sendSticker('emoji', b.dataset.e);
      else if (b.dataset.img) sendSticker('img', b.dataset.img);
    });
    return stkPanel;
  }
  function renderStickerTabs() {
    const tabs = document.getElementById('stk-tabs');
    const packs = allPacks();
    if (!packs.some(p => p.id === stkPackId)) stkPackId = packs[0].id;
    tabs.innerHTML = packs.map(p =>
      `<button class="stk-tab ${p.id === stkPackId ? 'active' : ''}" data-pack="${p.id}" type="button">${esc(p.name)}</button>`).join('');
  }
  function renderStickerGrid() {
    const grid = document.getElementById('stk-grid');
    const pack = allPacks().find(p => p.id === stkPackId) || allPacks()[0];
    if (pack.emoji) {
      grid.innerHTML = pack.emoji.map(e =>
        `<button class="stk-item" data-e="${e}" type="button"><span class="stk-e">${e}</span></button>`).join('');
    } else if (pack.imgs && pack.imgs.length) {
      grid.innerHTML = pack.imgs.map(src =>
        `<button class="stk-item" data-img="${esc(src)}" type="button"><img src="${src}" alt="стикер"></button>`).join('');
    } else {
      grid.innerHTML = '<p class="tiny" style="grid-column:1/-1;text-align:center">Пак пуст — добавьте фото кнопкой «＋ пак»</p>';
    }
  }
  function openStickerPanel() {
    ensureStickerPanel();
    renderStickerTabs(); renderStickerGrid();
    stkPanel.classList.remove('hidden');
    const tb = document.querySelector('#tab-chat .chat-toolbar');
    if (tb) tb.classList.add('hidden');
  }
  function closeStickerPanel() {
    if (!stkPanel) return;
    stkPanel.classList.add('hidden');
    const tb = document.querySelector('#tab-chat .chat-toolbar');
    if (tb) tb.classList.remove('hidden');
  }
  document.getElementById('chat-sticker-btn').onclick = () => {
    if (stkPanel && !stkPanel.classList.contains('hidden')) closeStickerPanel();
    else openStickerPanel();
  };

  /* превращение фото в стикер с белой обводкой (как в ИИ-боте) */
  function makeSticker(dataUrl, cb) {
    const img = new Image();
    img.onload = () => {
      const S = 460, pad = 26;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      const side = S - pad * 2, r = 76;
      const k = Math.max(side / img.width, side / img.height);
      const w = img.width * k, h = img.height * k;
      const path = () => {
        x.moveTo(pad + r, pad);
        x.arcTo(pad + side, pad, pad + side, pad + side, r);
        x.arcTo(pad + side, pad + side, pad, pad + side, r);
        x.arcTo(pad, pad + side, pad, pad, r);
        x.arcTo(pad, pad, pad + side, pad, r);
        x.closePath();
      };
      x.save(); path(); x.clip();
      x.drawImage(img, pad + (side - w) / 2, pad + (side - h) / 2, w, h);
      x.restore();
      x.lineWidth = 14;
      x.strokeStyle = '#FFFDF8';
      path(); x.stroke();
      cb(c.toDataURL('image/png'));
    };
    img.onerror = () => HT.toast('Не удалось обработать фото');
    img.src = dataUrl;
  }
  function addOwnPack() {
    HT.openModal(`
      <div class="m-title">Свой пак стикеров <button class="m-close">✕</button></div>
      <div class="m-label">Название пака</div>
      <input class="field" id="sp-name" placeholder="Например: Мои фото" maxlength="24">
      <p class="tiny">Выберите фото — я вырежу его в наклейку с белой обводкой и добавлю в пак. Всё офлайн.</p>
      <button class="btn-primary wide" id="sp-go">Выбрать фото</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelector('#sp-go').onclick = () => {
      const name = box.querySelector('#sp-name').value.trim() || 'Мой пак';
      HT.pickFile('image/*', f => {
        if (f.size > 8e6) return HT.toast('Фото слишком большое');
        HT.resizeImage(f, url => {
          makeSticker(url, png => {
            const packs = HT.get('stickerPacks', []);
            const id = 'p' + HT.uid();
            packs.push({ id, name, stickers: [png] });
            HT.set('stickerPacks', packs);
            stkPackId = id;
            HT.closeModal();
            openStickerPanel();
            HT.toast(`🎨 Пак «${name}» создан!`);
          });
        }, 700);
      });
    };
  }

  function sendSticker(type, val) {
    const cid = curChat, kind = curKind;
    if (kind === 'dm' && !cid) return;
    const msg = { who: 'me', hm: HT.nowHM() };
    if (replyTo) { msg.reply = replyTo; clearReply(); }
    if (type === 'emoji') msg.stickerEmoji = val;
    else msg.sticker = val;
    pushMine(msg, null);
    renderMsgs(); renderChatList();
    scheduleReply(cid, kind, '');
  }

  let recStream = null, mediaRec = null, recChunks = [], recStart = 0, recTimer = null, recCancelled = false;
  const fmtRecT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  /* доступ к микрофону — только по нажатию на кнопку и только один раз;
     после отказа просто подсказываем, без повторных запросов */
  let micBlocked = false;
  async function micIsDenied() {
    try {
      if (!navigator.permissions || !navigator.permissions.query) return false;
      const st = await navigator.permissions.query({ name: 'microphone' });
      return !!st && st.state === 'denied';
    } catch (e) { return false; }
  }

  async function startRec(e) {
    if (e) e.preventDefault();
    if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return HT.toast('Микрофон не поддерживается — напиши текстом');
    }
    if (micBlocked || await micIsDenied()) {
      micBlocked = true;
      return HT.toast('Микрофон запрещён — напиши текстом');
    }
    try {
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      micBlocked = !!(err && (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.name === 'PermissionDeniedError'));
      return HT.toast(micBlocked ? 'Микрофон запрещён — напиши текстом' : 'Микрофон недоступен — напиши текстом');
    }
    if (!holdOK) {                      /* кнопку отпустили, пока браузер спрашивал */
      recStream.getTracks().forEach(t => t.stop());
      recStream = null;
      HT.toast('✅ Микрофон разрешён — нажмите ещё раз, чтобы записать');
      return;
    }
    recChunks = []; recCancelled = false; recStart = Date.now();
    try { mediaRec = new MediaRecorder(recStream); }
    catch (err) { return HT.toast('Запись не поддерживается'); }
    mediaRec.ondataavailable = ev => recChunks.push(ev.data);
    mediaRec.onstop = () => {
      const dur = Math.round((Date.now() - recStart) / 1000);
      if (recStream) recStream.getTracks().forEach(t => t.stop());
      recStream = null;
      if (recCancelled || dur < 1) return;
      const blob = new Blob(recChunks, { type: mediaRec.mimeType || 'audio/webm' });
      if (blob.size > 3e6) return HT.toast('Запись слишком длинная (лимит ~5 минут)');
      const r = new FileReader();
      r.onload = () => sendVoice(r.result, dur);
      r.readAsDataURL(blob);
    };
    mediaRec.start();
    document.getElementById('rec-overlay').classList.remove('hidden');
    document.getElementById('chat-mic').classList.add('rec');
    document.getElementById('rec-time').textContent = '0:00';
    recTimer = setInterval(() => {
      const s = (Date.now() - recStart) / 1000;
      document.getElementById('rec-time').textContent = fmtRecT(s);
      if (s >= 300) stopRec();
    }, 250);
  }
  function stopRec(send) {
    clearInterval(recTimer);
    document.getElementById('rec-overlay').classList.add('hidden');
    document.getElementById('chat-mic').classList.remove('rec');
    if (mediaRec && mediaRec.state === 'recording') mediaRec.stop();
  }
  function sendVoice(src, dur) {
    const cid = curChat, kind = curKind;
    if (kind === 'artist') {   /* в чате с художником голосовые не поддерживаются */
      HT.toast('🎨 Художник слушает только текст — опишите картинку словами');
      return;
    }
    const msg = { who: 'me', voice: src, dur, hm: HT.nowHM() };
    if (kind === 'group') {
      const g = groups.find(x => x.id === cid);
      if (!g) return;
      (g.msgs = g.msgs || []).push(msg);
      HT.set('groups', groups);
    } else if (kind !== 'artist') {
      if (!chats[cid]) chats[cid] = [];
      chats[cid].push(msg);
      saveAll();
    } else return;
    renderMsgs(); renderChatList();
    HT.toast(`Голосовое ${fmtDur(dur)} отправлено`);
    setTimeout(() => {
      if (kind === 'group') {
        const g = groups.find(x => x.id === cid);
        if (!g) return;
        (g.msgs = g.msgs || []).push({ who: 'bot', html: 'Слушаю! Голосовые — мой любимый формат.', hm: HT.nowHM() });
        HT.set('groups', groups);
      } else {
        if (!chats[cid]) chats[cid] = [];
        chats[cid].push({ who: 'them', html: 'Слушаю внимательно! Присылай ещё 🎧', hm: HT.nowHM() });
        saveAll();
      }
      if (curChat === cid && document.getElementById('tab-chat').classList.contains('active')) renderMsgs();
      renderChatList();
    }, 1100);
  }

  const micBtn = document.getElementById('chat-mic');
  let holdOK = false;
  micBtn.addEventListener('pointerdown', e => { holdOK = true; startRec(e); });
  window.addEventListener('pointerup', () => { if (holdOK) { holdOK = false; stopRec(true); } });
  micBtn.addEventListener('pointercancel', () => { holdOK = false; stopRec(false); });
  document.getElementById('rec-cancel').onclick = () => { recCancelled = true; stopRec(false); };

  /* ---------- сохранение текущего чата (с защитой от нехватки места) ---------- */
  function persistChats() { try { localStorage.setItem('ht_chats', JSON.stringify(chats)); return true; } catch (e) { return false; } }
  function persistGroups() { try { localStorage.setItem('ht_groups', JSON.stringify(groups)); return true; } catch (e) { return false; } }
  function persistArtist() { try { localStorage.setItem('ht_artistMsgs', JSON.stringify(artistMsgs)); return true; } catch (e) { return false; } }

  function pushMine(msg, au) {
    const cid = curChat, kind = curKind;
    if (kind === 'group') {
      const g = groups.find(x => x.id === cid);
      if (!g) return false;
      (g.msgs = g.msgs || []).push(msg);
    } else if (kind === 'artist') {
      artistMsgs.push(msg);
    } else {
      if (!chats[cid]) chats[cid] = [];
      chats[cid].push(msg);
    }
    const write = () => kind === 'group' ? persistGroups()
      : kind === 'artist' ? persistArtist() : persistChats();
    let ok = write();
    if (!ok && au && au.file) {                     /* квота → временная ссылка */
      msg.audio = URL.createObjectURL(au.file);
      msg.audioSession = true;
      HT.toast('🎵 Не хватило места — аудио отправлено ссылкой до перезагрузки');
      ok = write();
    }
    if (!ok) HT.toast('⚠️ Нехватка места — сообщение не сохранено');
    return ok;
  }

  /* ---------- отложенные ответы собеседника ---------- */
  function scheduleReply(cid, kind, text) {
    const hasText = !!(text && text.trim());

    if (kind === 'artist') {
      setTimeout(() => {
        if (hasText) {
          artistMsgs.push({
            who: 'bot',
            html: 'Готово! Вот твоя картинка 🖨 Опиши иначе — нарисую другую.',
            img: genArt(text), hm: HT.nowHM()
          });
        } else {
          artistMsgs.push({ who: 'bot', html: esc(botReply(text, 'artist')), hm: HT.nowHM() });
        }
        saveArtist();
        if (curKind === 'artist' && curChat === 'artist' && chatIsActive()) renderMsgs();
        renderChatList();
      }, 900 + Math.random() * 800);
      return;
    }

    if (kind === 'group') {
      setTimeout(() => {
        const gg = groups.find(x => x.id === cid);
        if (!gg) return;
        if (gg.hasBot) gg.msgs.push({ who: 'bot', html: esc(botReply(text, 'g' + cid)), hm: HT.nowHM() });
        if (curChat !== cid || !chatIsActive()) {
          unread[cid] = (unread[cid] || 0) + 1;
          HT.set('unread', unread);
        }
        HT.set('groups', groups);
        if (curChat === cid && chatIsActive()) renderMsgs();
        renderChatList();

        /* случайный участник тоже может ответить */
        if (Math.random() < .6 && gg.members.length) {
          const m = P(gg.members[Math.floor(Math.random() * gg.members.length)]);
          if (m) setTimeout(() => {
            const g2 = groups.find(x => x.id === cid);
            if (!g2) return;
            g2.msgs.push({ who: m.id, name: m.name.split(' ')[0],
              html: esc(memberReply(text, 'm' + cid + m.id)), hm: HT.nowHM() });
            HT.set('groups', groups);
            if (curChat === cid && chatIsActive()) renderMsgs();
            renderChatList();
          }, 700 + Math.random() * 800);
        }
      }, 900 + Math.random() * 900);
      return;
    }

    if (!chats[cid]) return;
    setTimeout(() => {
      if (!chats[cid]) return;
      chats[cid].push({ who: 'them', html: esc(botReply(text, 'd' + cid)), hm: HT.nowHM() });
      if (curChat !== cid || !chatIsActive()) {
        unread[cid] = (unread[cid] || 0) + 1;
        HT.set('unread', unread);
      }
      saveAll();
      if (curChat === cid && chatIsActive()) renderMsgs();
      renderChatList();
    }, 900 + Math.random() * 900);
  }

  function sendMsg() {
    const inp = document.getElementById('chat-text');
    const text = inp.textContent.trim();
    const html = inp.innerHTML.trim();
    const au = pendingAudio;
    if (!text && !au) return;
    const cid = curChat, kind = curKind;
    inp.innerHTML = '';

    const msg = { who: 'me', html, hm: HT.nowHM() };
    if (replyTo) { msg.reply = replyTo; clearReply(); }
    if (au) { msg.audio = au.url; msg.audioName = au.name; }
    clearAudioChip();

    pushMine(msg, au);
    renderMsgs(); renderChatList();
    scheduleReply(cid, kind, text);
  }
  document.getElementById('chat-send').onclick = sendMsg;
  document.getElementById('chat-text').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });

  /* ---------- новая группа ---------- */
  function openNewGroup(preId) {
    const pool = [...new Set([...friends, ...(window.PEOPLE || []).map(p => p.id)])];
    if (!pool.length) return HT.toast('Сначала добавьте друзей');
    HT.openModal(`
      <div class="m-title">Новая группа <button class="m-close">✕</button></div>
      <div class="m-label">Название</div>
      <input class="field" id="ng-name" placeholder="Например: Наша компания" maxlength="36">
      <div class="m-label">Участники</div>
      ${pool.map(id => {
        const p = P(id);
        const on = !preId || preId === id;
        return p ? `<label class="check-row"><input type="checkbox" value="${id}"${on ? ' checked' : ''}> ${p.name}</label>` : '';
      }).join('')}
      <p class="tiny">🤖 Бот добавляется в группу автоматически — его можно убрать.</p>
      <button class="btn-primary wide" id="ng-go">Создать группу</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelector('#ng-go').onclick = () => {
      const name = document.getElementById('ng-name').value.trim();
      if (!name) return HT.toast('Введите название группы');
      const members = [...box.querySelectorAll('input[type=checkbox]:checked')].map(x => x.value);
      if (!members.length) return HT.toast('Выберите хотя бы одного участника');
      const g = {
        id: 'g' + HT.uid(), name, members, hasBot: true, me: true,
        msgs: [{ who: 'bot', html: `Группа «${esc(name)}» создана! 🤖 Я — бот-помощник, пишите, я отвечу.`, hm: HT.nowHM() }]
      };
      groups.push(g);
      HT.set('groups', groups);
      HT.closeModal();
      renderChatList();
      HT.toast('👥 Группа создана (🤖 бот внутри)');
      openGroup(g.id);
    };
  }
  document.getElementById('btn-new-group').onclick = () => openNewGroup();

  /* ---------- «Все люди»: общий список контактов, поиск, быстрые действия ---------- */
  function openAllPeople() {
    const people = railPeople().filter(c => c.kind !== 'add');
    HT.openModal(`
      <div class="m-title">Все люди <button class="m-close">✕</button></div>
      <input class="field" id="ap-q" type="search" autocomplete="off" placeholder="🔍 Поиск по имени…">
      <div class="ap-list" id="ap-list"></div>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    const q = box.querySelector('#ap-q');
    const render = () => {
      const v = (q.value || '').trim().toLowerCase();
      const rows = people.filter(c => !v || String(c.name).toLowerCase().includes(v));
      const list = box.querySelector('#ap-list');
      list.innerHTML = rows.length ? '' : '<p class="tiny ap-none">Никого не нашлось — попробуйте другое имя.</p>';
      rows.forEach(c => {
        const el = document.createElement('div');
        el.className = 'ap-row';
        const isBot = c.id === BOT_ID || c.id === ARTIST_ID;
        el.innerHTML = `
          <div class="ap-ava">${c.ava}</div>
          <div class="ap-info">
            <div class="ap-nm">${esc(c.name)}</div>
            <div class="ap-sub">${esc(c.bio || '')}</div>
          </div>
          <div class="ap-act">
            <button class="btn-mini" data-go type="button">Написать</button>
            ${isBot ? '' : '<button class="btn-mini v4-ghost" data-gr type="button">В группу</button>'}
          </div>`;
        el.querySelector('[data-go]').onclick = () => { HT.closeModal(); openChatItem(c.id); };
        const gr = el.querySelector('[data-gr]');
        if (gr) gr.onclick = () => openNewGroup(c.id);
        list.appendChild(el);
      });
    };
    q.addEventListener('input', render);
    render();
    setTimeout(() => q.focus(), 80);
  }

  /* ---------- контакты (как в соцсетях) ---------- */
  const DEMO_CONTACTS = [
    { name: 'Алина Светлова', phone: '+7 916 234-56-78', pid: 'u1', ava: '🌸' },
    { name: 'Максим Спорт', phone: '+7 903 111-22-33', pid: 'u2', ava: '⚡' },
    { name: 'София Ч.', phone: '+7 925 555-44-33', pid: 'u3', ava: '📚' },
    { name: 'Ева', phone: '+7 999 876-54-32', pid: 'u5', ava: '🦋' },
    { name: 'Петя Игров', phone: '+7 916 000-11-22', pid: null, ava: '🎮' },
    { name: 'Марина Волкова', phone: '+7 926 444-88-99', pid: null, ava: '🐬' }
  ];
  let contactsList = DEMO_CONTACTS;

  function renderContacts() {
    const wrap = document.getElementById('contacts-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    contactsList.forEach(c => {
      const el = document.createElement('div');
      el.className = 'contact-row';
      const isFriend = c.pid && friends.includes(c.pid);
      el.innerHTML = `
        <div class="contact-ava">${esc(c.ava || (c.name || '?')[0])}</div>
        <div class="contact-info">
          <div class="contact-name">${esc(c.name)}</div>
          <div class="contact-phone">${esc(c.phone || '')}</div>
        </div>
        ${c.pid
          ? `<button class="btn-mini ${isFriend ? '' : 'on'}" data-w>${isFriend ? '💬' : '➕'}</button>`
          : `<button class="btn-mini" data-inv>✉️</button>`}`;
      if (c.pid) el.querySelector('[data-w]').onclick = () => {
        if (isFriend) { openChat(c.pid); return; }
        HT.toast(`Заявка для ${c.name.split(' ')[0]} отправлена…`);
        setTimeout(() => {
          if (!friends.includes(c.pid)) friends.push(c.pid);
          if (!chats[c.pid]) chats[c.pid] = [{ who: 'them', html: `Привет! Мы знакомы по контактам 😊`, ts: Date.now() }];
          saveAll(); renderFriends(); renderChatList();
          HT.toast(`✅ ${c.name.split(' ')[0]} в друзьях — можно писать!`);
        }, 900);
      };
      else el.querySelector('[data-inv]').onclick = () =>
        HT.toast(`✉️ Приглашение отправлено: ${c.name} (демо)`);
      wrap.appendChild(el);
    });
  }

  /* Импорт контактов — только по явной кнопке и после объяснения «что и зачем» */
  document.getElementById('btn-import-contacts').onclick = () => {
    HT.openModal(`
      <div class="m-title">Импорт контактов <button class="m-close">✕</button></div>
      <div class="perm-card">
        <span class="perm-ico">👥</span>
        <div class="perm-body">
          <b>Что и зачем</b>
          <p class="tiny">Приложение запросит доступ к контактам — покажем только имя.
          Номера никуда не отправляются и не сохраняются, всё остаётся на устройстве.</p>
        </div>
      </div>
      <p class="tiny">Дальше браузер покажет системное окно — выберите, кого показать.</p>
      <button class="btn-primary wide" id="perm-go">Продолжить</button>
      <button class="btn-ghost wide" id="perm-no">Отмена</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelector('#perm-no').onclick = HT.closeModal;
    box.querySelector('#perm-go').onclick = () => { HT.closeModal(); importContacts(); };
  };

  async function importContacts() {
    const btn = document.getElementById('btn-import-contacts');
    if (btn) btn.textContent = 'Ищу…';
    try {
      if (navigator.contacts && navigator.contacts.select) {
        const picked = await navigator.contacts.select(['name'], { multiple: true });
        const list = (picked || []).map(c => ({
          name: (c.name && c.name[0]) || 'Контакт',
          phone: '',
          pid: null,
          ava: ((c.name && c.name[0]) || '?').trim().charAt(0) || '?'
        }));
        if (list.length) {
          contactsList = list;
          renderContacts();
          if (btn) btn.textContent = 'Импорт';
          HT.toast(`👥 Найдено контактов: ${list.length}`);
          return;
        }
      }
    } catch (e) { /* доступ запрещён или нет API — показываем демо */ }
    contactsList = DEMO_CONTACTS;
    renderContacts();
    if (btn) btn.textContent = 'Импорт';
    HT.toast('👥 Показаны примеры контактов (демо-режим)');
  }

  /* ================= БОТ-ХУДОЖНИК (картинка по описанию) ================= */
  let artistMsgs = HT.get('artistMsgs', []);
  const saveArtist = () => HT.set('artistMsgs', artistMsgs);

  function strHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 37 + s.charCodeAt(i)) >>> 0; return h; }
  function makeRnd(seed) { let x = seed || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

  function genArt(text) {
    const t = String(text || '').toLowerCase().replace(/ё/g, 'е');
    const R = makeRnd(strHash(t) || 1);
    const has = re => re.test(t);
    const F = {
      night:   has(/ноч|полночь|звезд|луна|космос|галактик|созвезд|темнот/),
      sunset:  has(/закат|сумерк|вечер/),
      dawn:    has(/рассвет|зорь|утр/),
      sea:     has(/море|океан|прибой|пляж|берег|парусник|корабл|лодк|яхт/),
      waves:   has(/волн|штиль/),
      mount:   has(/горы|гора|горе|гору|горах|вершин|скал|хребет|альп|пикн/),
      forest:  has(/лес|роща|тайга|ельник|сосн|берез|деревья|дерево/),
      city:    has(/город|небоскр|улиц|квартал|здани|столиц|мост|дом(?=\s|$)/),
      stars:   has(/звезд|созвезд/),
      sun:     has(/солнц|зной|жар/),
      rain:    has(/дожд|ливень|гроза|пасмурн/),
      snow:    has(/снег|зим|метел|вьюг/),
      cloud:   has(/облак|туч|дым/),
      flowers: has(/цвет|лаванд|ромашк|сад|букет|мак(?=\s|$)/),
      field:   has(/поле|луг|трав|степь|пастбищ/),
      cat:     has(/кот|кошк|мяу|котик|котя/),
      dog:     has(/собак|щен|гав|дворняг|пес(?=\s|$)/),
      desert:  has(/пустын|дюн|саhара|песок/),
      island:  has(/остров|атолл/),
      palm:    has(/пальм|кокос/),
      rainbow: has(/радуг/),
      fog:     has(/туман|мгл|дымк/),
      boat:    has(/парусник|корабл|лодк|яхт|каравелл/)
    };
    const any = Object.keys(F).some(k => F[k]);
    const night = F.night || (F.stars && !F.sunset && !F.dawn);

    const W = 512, H = 512;
    const PI = Math.PI;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const horizon = Math.round(H * (F.sea ? .60 : .63));

    /* мягкие помощники */
    const glow = (cx, cy, r, rgb, a) => {
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, `rgba(${rgb},${a})`);
      rg.addColorStop(.4, `rgba(${rgb},${(a * .55).toFixed(3)})`);
      rg.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = rg;
      g.beginPath(); g.arc(cx, cy, r, 0, PI * 2); g.fill();
    };
    const ridge = (baseY, amp, color, alpha, n) => {   /* полигонные горы */
      g.globalAlpha = alpha; g.fillStyle = color;
      g.beginPath(); g.moveTo(0, baseY);
      let x = 0;
      while (x < W) {
        x += (W / n) * (.5 + R());
        g.lineTo(Math.min(x, W), baseY - (.2 + R()) * amp);
      }
      g.lineTo(W, baseY); g.closePath(); g.fill();
      g.globalAlpha = 1;
    };
    const hill = (baseY, amp, color, alpha) => {      /* мягкие холмы */
      g.globalAlpha = alpha; g.fillStyle = color;
      g.beginPath(); g.moveTo(0, H); g.lineTo(0, baseY);
      g.quadraticCurveTo(W * .25, baseY - amp, W * .5, baseY - amp * .35);
      g.quadraticCurveTo(W * .75, baseY + amp * .3, W, baseY - amp * .6);
      g.lineTo(W, H); g.closePath(); g.fill();
      g.globalAlpha = 1;
    };
    const cloudAt = (cx, cy, s, col, a) => {
      g.globalAlpha = a; g.fillStyle = col;
      g.beginPath();
      g.arc(cx, cy, 26 * s, 0, PI * 2);
      g.arc(cx + 30 * s, cy + 6 * s, 20 * s, 0, PI * 2);
      g.arc(cx - 30 * s, cy + 7 * s, 18 * s, 0, PI * 2);
      g.arc(cx + 10 * s, cy - 15 * s, 19 * s, 0, PI * 2);
      g.fill(); g.globalAlpha = 1;
    };
    const pine = (cx, base, h, w, col) => {
      g.fillStyle = col;
      g.fillRect(cx - w * .07, base - h * .34, w * .14, h * .34);
      g.beginPath();
      g.moveTo(cx, base - h); g.lineTo(cx + w / 2, base - h * .42);
      g.lineTo(cx - w / 2, base - h * .42); g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(cx, base - h * .74); g.lineTo(cx + w * .64, base - h * .06);
      g.lineTo(cx - w * .64, base - h * .06); g.closePath(); g.fill();
    };
    const palmTree = (cx, base, h, col) => {
      g.strokeStyle = col; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, base);
      g.quadraticCurveTo(cx + 14, base - h * .55, cx + 6, base - h);
      g.stroke();
      g.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const a = -PI + i * (PI / 5);
        g.save(); g.translate(cx + 6, base - h); g.rotate(a + .5);
        g.beginPath(); g.ellipse(24, 0, 26, 8, 0, 0, PI * 2); g.fill();
        g.restore();
      }
    };


    /* ---------- абстракция, если слов нет ---------- */
    if (!any) {
      const ag = g.createLinearGradient(0, 0, W, H);
      ag.addColorStop(0, '#C4693F');
      ag.addColorStop(.45, '#F0B429');
      ag.addColorStop(.78, '#F7F1E7');
      ag.addColorStop(1, '#7A8B6F');
      g.fillStyle = ag; g.fillRect(0, 0, W, H);
      const cx = W * (.34 + R() * .3), cy = H * (.36 + R() * .28), rad = H * (.24 + R() * .14);
      g.globalAlpha = .5; g.fillStyle = '#FFFDF8';
      g.beginPath();
      const pts = 7;
      for (let i = 0; i <= pts; i++) {
        const a = i / pts * PI * 2;
        const rr = rad * (.78 + R() * .42);
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py);
        else {
          const a2 = (i - .5) / pts * PI * 2;
          const r2 = rad * (.85 + R() * .5);
          g.quadraticCurveTo(cx + Math.cos(a2) * r2 * 1.2, cy + Math.sin(a2) * r2 * 1.2, px, py);
        }
      }
      g.closePath(); g.fill();
      g.globalAlpha = 1;
      glow(W * .68, H * .3, 160, '255,233,168', .45);
      glow(W * .3, H * .78, 150, '196,105,63', .35);
    } else {

    /* 1. небо — градиент в тёплой палитре проекта */
    const stops = night ? ['#0B1030', '#221A46', '#4A2B55', '#8A4A57']
      : F.sunset ? ['#37284F', '#7C4060', '#C4693F', '#E9A05E', '#F7E6CD']
      : F.dawn ? ['#4A5A96', '#8E7BA6', '#E4A789', '#FBEED8']
      : ['#5FA3CE', '#93C1DA', '#D7E4E2', '#F5EEDF'];
    const skyG = g.createLinearGradient(0, 0, 0, horizon);
    stops.forEach((c, i) => skyG.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = skyG; g.fillRect(0, 0, W, horizon + 2);

    /* 2. звёзды (шум) */
    if (night || F.stars) {
      const n = night ? 180 : 80;
      for (let i = 0; i < n; i++) {
        const sx = R() * W, sy = R() * horizon * .95, s = R();
        g.globalAlpha = .2 + s * .75;
        g.fillStyle = s > .88 ? '#FFE9A8' : '#FFFDF8';
        g.beginPath(); g.arc(sx, sy, s > .87 ? 1.8 : (s > .5 ? 1.1 : .7), 0, PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      g.strokeStyle = '#FFFDF8'; g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const sx = R() * W, sy = R() * horizon * .7;
        g.globalAlpha = .75;
        g.beginPath();
        g.moveTo(sx - 6, sy); g.lineTo(sx + 6, sy);
        g.moveTo(sx, sy - 6); g.lineTo(sx, sy + 6);
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    /* 3. солнце / луна */
    const sunX = W * (.3 + R() * .4);
    if (night) {
      const mx = W * (.6 + R() * .24), my = horizon - H * .3;
      glow(mx, my, 100, '244,239,210', .3);
      g.fillStyle = '#F4EFD2'; g.beginPath(); g.arc(mx, my, 34, 0, PI * 2); g.fill();
      g.fillStyle = 'rgba(214,206,170,.7)';
      g.beginPath();
      g.arc(mx - 11, my - 7, 7, 0, PI * 2);
      g.arc(mx + 9, my + 10, 5, 0, PI * 2);
      g.arc(mx + 5, my - 15, 4, 0, PI * 2);
      g.fill();
    } else if (F.sunset || F.dawn) {
      const sy = horizon - H * .07;
      glow(sunX, sy, 150, '255,196,120', .5);
      g.fillStyle = '#FFE0A0'; g.beginPath(); g.arc(sunX, sy, 33, 0, PI * 2); g.fill();
    } else {
      glow(sunX, H * .16, 130, '255,236,170', .45);
      g.fillStyle = '#FFE9A8'; g.beginPath(); g.arc(sunX, H * .16, 30, 0, PI * 2); g.fill();
    }

    /* 4. облака */
    if (!F.rain) {
      const cc = night ? '#6C6E96' : '#FFFDF8';
      for (let i = 0; i < 3; i++)
        cloudAt(W * (.12 + R() * .76), horizon * (.2 + R() * .42), .7 + R() * .6, cc, night ? .35 : .78);
    }

    /* 5. радуга */
    if (F.rainbow) {
      const rcols = ['#E0625F', '#F0A05A', '#F0D264', '#8FBF7A', '#6FB6DE', '#9B87D8'];
      rcols.forEach((c, i) => {
        g.globalAlpha = .5; g.strokeStyle = c; g.lineWidth = 11;
        g.beginPath(); g.arc(W / 2, horizon + 30, 210 - i * 12, PI, PI * 2); g.stroke();
      });
      g.globalAlpha = 1;
    }

    /* 6. силуэты гор (полигонный шум) */
    if (F.mount) {
      ridge(horizon, H * .30, night ? '#2A2F58' : '#8C93B4', .85, 5);
      ridge(horizon, H * .22, night ? '#232A4E' : '#6E779A', .95, 7);
      ridge(horizon, H * .14, night ? '#1A2040' : '#525C82', 1, 9);
    }

    /* 7. море или земля */
    if (F.sea) {
      const wg = g.createLinearGradient(0, horizon, 0, H);
      if (night) { wg.addColorStop(0, '#1B2A55'); wg.addColorStop(1, '#0A1230'); }
      else if (F.sunset) { wg.addColorStop(0, '#C4693F'); wg.addColorStop(.45, '#7A4A63'); wg.addColorStop(1, '#2E2A50'); }
      else if (F.dawn) { wg.addColorStop(0, '#9E8FB4'); wg.addColorStop(1, '#4A5A96'); }
      else { wg.addColorStop(0, '#5C93AE'); wg.addColorStop(1, '#26536B'); }
      g.fillStyle = wg; g.fillRect(0, horizon, W, H - horizon);

      /* волны (синусоиды с прозрачностью) */
      for (let i = 0; i < 14; i++) {
        const y = horizon + 6 + i * ((H - horizon - 8) / 14);
        g.globalAlpha = .55 - i * .025;
        g.strokeStyle = i % 2 ? 'rgba(255,255,255,.85)' : 'rgba(190,226,245,.9)';
        g.lineWidth = 1 + i * .1;
        const ph = R() * 6;
        g.beginPath();
        for (let px = 0; px <= W; px += 10) {
          const yy = y + Math.sin(px / 34 + ph + i * .8) * (2 + i * .5);
          if (px === 0) g.moveTo(px, yy); else g.lineTo(px, yy);
        }
        g.stroke();
      }
      g.globalAlpha = 1;

      /* отражение светила на воде */
      if (!night) {
        g.fillStyle = '#FFE9A8';
        for (let i = 0; i < 13; i++) {
          g.globalAlpha = .3 - i * .015;
          const w = 44 - i * 2.6;
          g.fillRect(sunX - w / 2 + (R() - .5) * 24, horizon + 8 + i * 14, w, 5);
        }
        g.globalAlpha = 1;
      }

      if (F.boat) {
        const bx = W * (.3 + R() * .4), by = horizon + 46;
        g.fillStyle = night ? '#12162E' : '#7A4B2A';
        g.beginPath();
        g.moveTo(bx - 26, by); g.lineTo(bx + 26, by);
        g.lineTo(bx + 16, by + 13); g.lineTo(bx - 16, by + 13);
        g.closePath(); g.fill();
        g.strokeStyle = night ? '#12162E' : '#5B3A20'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - 46); g.stroke();
        g.fillStyle = night ? '#C8CEE8' : '#FFFDF8';
        g.beginPath(); g.moveTo(bx + 3, by - 44); g.lineTo(bx + 34, by - 6);
        g.lineTo(bx + 3, by - 6); g.closePath(); g.fill();
      }
    } else {
      const gg = g.createLinearGradient(0, horizon, 0, H);
      if (F.snow) { gg.addColorStop(0, '#EAF0F7'); gg.addColorStop(1, '#C6D4E4'); }
      else if (F.desert) { gg.addColorStop(0, '#EBC79A'); gg.addColorStop(1, '#C9995F'); }
      else if (night) { gg.addColorStop(0, '#1B3A2B'); gg.addColorStop(1, '#0D1F17'); }
      else if (F.city) { gg.addColorStop(0, '#8C8A93'); gg.addColorStop(1, '#5D5C68'); }
      else if (F.field || F.flowers) { gg.addColorStop(0, '#9CBA70'); gg.addColorStop(1, '#61834C'); }
      else { gg.addColorStop(0, '#8FA97A'); gg.addColorStop(1, '#5C7452'); }
      g.fillStyle = gg; g.fillRect(0, horizon, W, H - horizon);
    }

    /* 8. деревья / город / пальмы / поле */
    if (!F.sea) {
      if (!F.mount && (F.field || F.forest || F.island))
        hill(horizon, H * .07, night ? '#22402F' : (F.island ? '#E8D3A8' : '#7E9A63'), .85);
      if (F.desert) {
        hill(horizon + 40, H * .1, '#E0B180', .92);
        hill(horizon + 130, H * .12, '#D3A16B', .95);
      }
      if (F.city) {
        let x = -10;
        while (x < W) {
          const bw = 34 + R() * 46, bh = 60 + R() * 130;
          g.fillStyle = night ? '#161C36' : '#6C6B78';
          g.fillRect(x, horizon - bh, bw, bh);
          for (let wy = horizon - bh + 10; wy < horizon - 8; wy += 22)
            for (let wx = x + 7; wx < x + bw - 9; wx += 17)
              if (R() > .45) {
                g.fillStyle = night ? 'rgba(255,214,130,.9)' : 'rgba(220,232,245,.75)';
                g.fillRect(wx, wy, 8, 11);
              }
          x += bw + 7;
        }
      }
      if (F.forest) {
        const col = night ? '#123828' : (F.snow ? '#DCE7F1' : '#3E7A4A');
        for (let i = 0; i < 22; i++)
          pine(R() * W, horizon + R() * 46, 46 + R() * 76, 34 + R() * 34, col);
      }
      if (F.palm || F.island) {
        palmTree(W * .2, horizon + 96, 150, night ? '#16221C' : '#7A5A34');
        palmTree(W * .78, horizon + 66, 120, night ? '#16221C' : '#8A6A40');
      }
      if (F.flowers || F.field) {
        const fcols = ['#E0625F', '#F0B429', '#E87AC0', '#FFFDF8', '#C4693F'];
        for (let i = 0; i < 46; i++) {
          const fx = R() * W, fy = horizon + 30 + R() * (H - horizon - 40);
          const s = 3 + R() * 5 * ((fy - horizon) / (H - horizon) + .4);
          g.fillStyle = fcols[Math.floor(R() * fcols.length)];
          g.globalAlpha = night ? .55 : .95;
          g.beginPath(); g.arc(fx, fy, s, 0, PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      }
    }

    /* 8b. кот / собака на переднем плане */
    if (F.cat || F.dog) {
      const col = night ? '#0E1A14' : 'rgba(58,46,36,.88)';
      const bx = W * .24, by = H - 42;
      g.fillStyle = col;
      g.beginPath(); g.ellipse(bx, by - 30, 46, 42, 0, 0, PI * 2); g.fill();
      g.beginPath(); g.arc(bx, by - 86, 32, 0, PI * 2); g.fill();
      if (F.cat) {
        g.beginPath();
        g.moveTo(bx - 30, by - 104); g.lineTo(bx - 22, by - 136); g.lineTo(bx - 3, by - 108);
        g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(bx + 30, by - 104); g.lineTo(bx + 22, by - 136); g.lineTo(bx + 3, by - 108);
        g.closePath(); g.fill();
      } else {
        g.beginPath(); g.ellipse(bx - 30, by - 84, 12, 25, .3, 0, PI * 2); g.fill();
        g.beginPath(); g.ellipse(bx + 30, by - 84, 12, 25, -.3, 0, PI * 2); g.fill();
      }
      g.strokeStyle = col; g.lineWidth = 14; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bx + 40, by - 24);
      g.quadraticCurveTo(bx + 94, by - 44, bx + 76, by - 98);
      g.stroke();
      g.fillStyle = night ? '#F0E7C8' : '#FFFDF8';
      g.beginPath();
      g.arc(bx - 12, by - 92, 5, 0, PI * 2);
      g.arc(bx + 12, by - 92, 5, 0, PI * 2);
      g.fill();
    }

    /* 9. дождь / снег / туман */
    if (F.rain) {
      if (!F.mount) for (let i = 0; i < 3; i++)
        cloudAt(W * (.15 + R() * .7), horizon * (.1 + R() * .26), 1 + R() * .5, '#5B6472', .9);
      g.strokeStyle = 'rgba(190,220,255,.75)'; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 170; i++) {
        const rx = R() * W, ry = R() * H;
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 7, ry + 18); g.stroke();
      }
    }
    if (F.snow) {
      g.fillStyle = 'rgba(255,255,255,.92)';
      for (let i = 0; i < 140; i++) {
        const sx = R() * W, sy = R() * H;
        g.beginPath(); g.arc(sx, sy, 1 + R() * 2.4, 0, PI * 2); g.fill();
      }
    }
    if (F.fog) {
      for (let i = 0; i < 5; i++) {
        g.globalAlpha = .1 + R() * .1;
        g.fillStyle = '#EFEAE0';
        g.fillRect(0, horizon - 40 + i * 56, W, 34 + R() * 26);
      }
      g.globalAlpha = 1;
    }
    if (F.cloud && !F.rain) {
      g.globalAlpha = .16; g.fillStyle = '#FFFDF8';
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }

    } /* конец сцены */

    /* мягкое зерно */
    for (let i = 0; i < 1300; i++) {
      const a = .03 + R() * .05;
      g.fillStyle = R() > .5 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(58,46,36,${a.toFixed(3)})`;
      g.fillRect(R() * W, R() * H, 1.7, 1.7);
    }
    /* виньетка */
    const vg = g.createRadialGradient(W / 2, H / 2, H * .34, W / 2, H / 2, H * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(40,26,18,.32)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    /* тонкая подпись */
    g.save();
    g.globalAlpha = .62;
    g.font = 'italic 21px Georgia, serif';
    g.textAlign = 'right';
    g.fillStyle = night ? 'rgba(255,253,248,.92)' : 'rgba(58,46,36,.78)';
    g.fillText('Ари', W - 14, H - 14);
    g.restore();

    return cv.toDataURL('image/png');
  }

  function openArtist() {
    curChat = 'artist';
    curKind = 'artist';
    if (!artistMsgs.length) {
      artistMsgs.push({
        who: 'bot',
        html: 'Привет! 🎨 Опиши картинку словами — например: «закат над морем с парусником» или «ночной город со звёздами». Я нарисую офлайн!',
        hm: HT.nowHM()
      });
      saveArtist();
    }
    document.getElementById('chat-avatar').textContent = '🎨';
    document.getElementById('chat-name').textContent = 'Художник';
    document.getElementById('chat-status').textContent = '🖼 рисует по описанию';
    document.getElementById('chat-text').innerHTML = '';
    resetComposer();
    document.getElementById('chat-bot-toggle').classList.add('hidden');
    document.getElementById('chat-del').classList.add('hidden');
    renderMsgs();
    renderChatList();
    HT.showTab('tab-chat');
    document.getElementById('hdr-sub').textContent = 'Художник';
  }

  /* ================= ПРОФИЛЬ ================= */
  function renderProfile() {
    const u = HT.user;
    const ava = (u && u.avatar) || '🙂';
    const avEl = document.getElementById('prof-avatar');
    avEl.innerHTML = String(ava).startsWith('data:') ? `<img src="${ava}" alt="">` : esc(ava);
    document.getElementById('prof-name').textContent = (u && u.name) || 'Гость 👋';
    document.getElementById('prof-bio').textContent = (u && u.bio) || 'Описание не заполнено — нажмите «Редактировать»';
    const links = (u && u.links) || [];
    document.getElementById('prof-links').innerHTML = links.filter(Boolean)
      .map(l => `<a href="${/^https?:/.test(l) ? l : 'https://' + l}" target="_blank" rel="noopener">🔗 ${esc(l)}</a>`).join('');

    const myPosts = (HT.posts ? HT.posts() : []).filter(p => p.author === 'me');
    const likes = myPosts.reduce((s, p) => s + p.likes.length, 0);
    const followers = HT.get('followers', []);
    document.getElementById('prof-posts').textContent = myPosts.length;
    document.getElementById('prof-likes').textContent = likes;
    document.getElementById('prof-following').textContent = following.length;
    document.getElementById('prof-friends').textContent = friends.length;
    document.getElementById('prof-followers').textContent = followers.length;
    renderProfileGrid();
  }
  HT.refreshProfile = renderProfile;

  let ptab = 'posts';
  const cellOf = p => p.img
    ? `<div class="cellg"><img src="${p.img}" alt=""></div>`
    : p.video
      ? `<div class="cellg cellg-text">▶ видео</div>`
      : `<div class="cellg cellg-text">${esc((p.text || '').slice(0, 70) || 'Запись')}</div>`;
  function renderProfileGrid() {
    const grid = document.getElementById('prof-grid');
    const posts = HT.posts ? HT.posts() : [];
    if (ptab === 'posts') {
      const mine = posts.filter(p => p.author === 'me');
      grid.innerHTML = mine.length
        ? mine.map(cellOf).join('')
        : '<p class="empty-hint" style="grid-column:1/-1">Записей пока нет — опубликуйте первую в «Ленте»!</p>';
    } else if (ptab === 'reposts') {
      const rs = posts.filter(p => p.repostedByMe);
      grid.innerHTML = rs.length
        ? rs.map(cellOf).join('')
        : '<p class="empty-hint" style="grid-column:1/-1">Репостов пока нет — нажмите ↻ на записи в «Ленте»</p>';
    } else if (ptab === 'stories') {
      const mine = HT.get('stories', []).filter(s => s.author === 'me' && Date.now() - s.ts < 864e5);
      grid.innerHTML = mine.length
        ? mine.map(s => `<div class="cellg">${s.img ? `<img src="${s.img}">` : (s.video ? '▶ видео' : (s.sticker || '📖'))}</div>`).join('')
        : '<p class="empty-hint" style="grid-column:1/-1">Историй нет. Добавьте в «Ленте»!</p>';
    } else {
      const liked = posts.filter(p => p.likes.includes('me'));
      grid.innerHTML = liked.length
        ? liked.map(cellOf).join('')
        : '<p class="empty-hint" style="grid-column:1/-1">Отметок ❤️ пока нет</p>';
    }
  }
  document.querySelectorAll('[data-ptab]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-ptab]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    ptab = b.dataset.ptab;
    renderProfileGrid();
  });

  document.getElementById('btn-edit-profile').onclick = () => {
    const u = HT.user || { name: 'Гость', avatar: '🙂', bio: '', links: [] };
    const AVATARS = ['🙂','😎','🥰','🐱','🐶','🦊','🦄','🌸','⚡','📚','🎮','🦋','🐻','🐼','🐸','🌙'];
    const g = HT.settings.gender || 'male';
    let photoAv = null;
    HT.openModal(`
      <div class="m-title">Редактировать профиль <button class="m-close">✕</button></div>
      <div class="m-label">Аватар</div>
      <button class="btn-ghost wide" id="pe-photo" style="margin-bottom:8px">📷 Своё фото</button>
      <div class="emoji-pick" id="pe-av">${AVATARS.map(a => `<button class="${a === u.avatar ? 'sel' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
      <div class="m-label">Пол</div>
      <div class="seg" id="pe-gender">
        <button class="${g === 'male' ? 'active' : ''}" data-g="male">👦 Мужской</button>
        <button class="${g === 'female' ? 'active' : ''}" data-g="female">👧 Женский</button>
      </div>
      <div class="m-label">Имя</div>
      <input class="field" id="pe-name" value="${esc(u.name)}" maxlength="24">
      <div class="m-label">Описание (био)</div>
      <textarea class="field" id="pe-bio" rows="2" maxlength="140" placeholder="Кто вы и чем увлекаетесь">${esc(u.bio || '')}</textarea>
      <div class="m-label">Ссылки на соцсети</div>
      <input class="field" id="pe-l1" placeholder="vk.com/ваш_профиль" value="${esc((u.links || [])[0] || '')}">
      <input class="field" id="pe-l2" placeholder="t.me/ваш_канал" value="${esc((u.links || [])[1] || '')}">
      <input class="field" id="pe-l3" placeholder="instagram.com/ваш_ник" value="${esc((u.links || [])[2] || '')}">
      <button class="btn-primary wide" id="pe-save">Сохранить</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelector('#pe-photo').onclick = () => HT.pickFile('image/*', f => {
      if (f.size > 6e6) return HT.toast('Фото слишком большое (до 6 МБ)');
      HT.resizeImage(f, url => {
        photoAv = url;
        box.querySelectorAll('#pe-av button').forEach(x => x.classList.remove('sel'));
        HT.toast('📷 Фото готово — нажмите «Сохранить»');
      }, 400);
    });
    box.querySelectorAll('#pe-av button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#pe-av button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      photoAv = null;
    });
    box.querySelectorAll('#pe-gender button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#pe-gender button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
    box.querySelector('#pe-save').onclick = () => {
      const sel = box.querySelector('#pe-av .sel');
      const gsel = box.querySelector('#pe-gender .active');
      const name = document.getElementById('pe-name').value.trim() || 'Гость';
      const next = Object.assign({}, HT.user || {}, {
        name, avatar: photoAv || (sel ? sel.dataset.a : '🙂'),
        bio: document.getElementById('pe-bio').value.trim(),
        links: ['pe-l1', 'pe-l2', 'pe-l3'].map(i => document.getElementById(i).value.trim()).filter(Boolean)
      });
      HT.settings.gender = gsel ? gsel.dataset.g : 'male';
      HT.set('settings', HT.settings);
      HT.set('user', next);
      location.reload();
    };
  };

  const profPost = document.getElementById('btn-prof-post');
  if (profPost) profPost.onclick = () => HT.openComposer('photo');
  const profStory = document.getElementById('btn-prof-story');
  if (profStory) profStory.onclick = () => HT.openStoryCreator();

  /* ================= ЧЕЛЛЕНДЖИ ================= */
  const ALL = [
    { id: 'c1', ico: '💧', name: '7 дней воды', days: 7, desc: '1,5 литра воды каждый день' },
    { id: 'c2', ico: '🏃', name: '21 день спорта', days: 21, desc: 'Зарядка минимум 15 минут' },
    { id: 'c3', ico: '📵', name: '14 дней без соцсетей', days: 14, desc: 'Отдых от ленты новостей' },
    { id: 'c4', ico: '📖', name: '30 дней чтения', days: 30, desc: '10 страниц в день' },
    { id: 'c5', ico: '🧘', name: '10 дней медитации', days: 10, desc: '5 минут тишины утром' }
  ];
  let mine = HT.get('myChallenges', []);
  const saveMine = () => HT.set('myChallenges', mine);
  const DEMO_PTS = ['u1', 'u2', 'u3', 'u4', 'u5'].map((id, i) => ({ id, pts: 4 + i * 2 }));

  /* при старте челленджа: привычка закрепляется в трекере + группа участников */
  function joinExtras(c) {
    try {
      if (HT.addHabit) HT.addHabit({ name: c.name, icon: c.ico || '🏅', color: '#E88BB5', type: 'good' });
    } catch (e) {}
    const pool = (friends.length ? friends : ['u1', 'u3']).slice(0, 4);
    const g = {
      id: 'g' + HT.uid(),
      name: `Участники «${c.name}»`,
      members: pool,
      hasBot: true,
      me: true,
      msgs: [{ who: 'bot', html: `Группа участников создана! 🤖 Следите за прогрессом «${esc(c.name)}» вместе.`, hm: HT.nowHM() }]
    };
    groups.push(g);
    HT.set('groups', groups);
    renderChatList();
    HT.toast('🎯 Привычка закреплена в трекере + создана группа участников!');
  }

  function renderChallenges() {
    const a = document.getElementById('ch-active');
    a.innerHTML = mine.length ? '' : '<p class="tiny">Вы не участвуете — присоединитесь ниже!</p>';
    mine.forEach(c => {
      const days = Object.keys(c.checked || {}).length;
      const pct = Math.min(100, Math.round(days / c.days * 100));
      const today = HT.dkey();
      const doneToday = !!(c.checked && c.checked[today]);
      const el = document.createElement('div');
      el.className = 'ch-card';
      const leaders = [{ id: 'me', pts: days, name: (HT.user && HT.user.name) || 'Я' },
        ...DEMO_PTS.map(d => ({ id: d.id, pts: Math.min(c.days, d.pts), name: P(d.id).name.split(' ')[0] }))]
        .sort((x, y) => y.pts - x.pts);
      el.innerHTML = `
        <div class="ch-top"><span class="ch-ico">${c.ico}</span>
          <div style="flex:1"><div class="ch-name">${esc(c.name)}</div>
          <div class="ch-sub">${esc(c.desc || '')} · ${days}/${c.days} дней</div></div></div>
        <div class="ch-bar"><div style="width:${pct}%"></div></div>
        <div class="ch-row">
          <span class="tiny">🏅 ${pct}% выполнено</span>
          <button class="p-btn ${doneToday ? 'on' : ''}" ${doneToday ? 'disabled' : ''} data-check="${c.id}">
            ${doneToday ? '✓ сегодня отмечено' : 'Отметить день'}
          </button>
          <button class="p-btn alt" data-exit="${c.id}">✕</button>
        </div>
        <div class="m-label">Таблица лидеров</div>
        ${leaders.map((l, i) => `<div class="leader"><span class="pos">${i + 1}</span><span class="nm">${l.id === 'me' ? '⭐ ' : ''}${esc(l.name)}</span><span class="pts">🏅 ${l.pts}</span></div>`).join('')}`;
      el.querySelector('[data-check]').onclick = () => {
        if (!c.checked) c.checked = {};
        c.checked[HT.dkey()] = true;
        saveMine(); renderChallenges();
        HT.toast('🏆 День засчитан в челлендж!');
        if (Object.keys(c.checked).length >= c.days) HT.notify('Челлендж пройден!', `«${c.name}» — вы победили! 🏆`);
      };
      el.querySelector('[data-exit]').onclick = () => {
        if (!confirm('Выйти из челленджа?')) return;
        mine = mine.filter(x => x.id !== c.id);
        saveMine(); renderChallenges();
      };
      a.appendChild(el);
    });

    const all = document.getElementById('ch-all');
    all.innerHTML = '';
    ALL.concat(mine.filter(c => c.custom)).forEach(c => {
      const joined = mine.some(x => x.id === c.id);
      const el = document.createElement('div');
      el.className = 'ch-card';
      el.innerHTML = `<div class="ch-top"><span class="ch-ico">${c.ico}</span>
        <div style="flex:1"><div class="ch-name">${esc(c.name)}</div>
        <div class="ch-sub">${esc(c.desc || '')} · ${c.days} дней</div></div>
        <button class="p-btn ${joined ? 'on' : ''}" ${joined ? 'disabled' : ''}>${joined ? '✓ участвуете' : 'Участвовать'}</button></div>`;
      if (!joined) el.querySelector('button').onclick = () => {
        mine.push(Object.assign({}, c, { checked: {} }));
        saveMine(); renderChallenges();
        joinExtras(c);
        HT.toast(`🏅 Вы в челлендже «${c.name}»!`);
      };
      all.appendChild(el);
    });
  }

  document.getElementById('btn-new-challenge').onclick = () => {
    HT.openModal(`
      <div class="m-title">Свой челлендж <button class="m-close">✕</button></div>
      <div class="m-label">Название</div>
      <input class="field" id="cn-name" placeholder="Например: 10 дней без сладкого" maxlength="40">
      <div class="m-label">Описание</div>
      <input class="field" id="cn-desc" placeholder="Правило челленджа" maxlength="80">
      <div class="m-label">Длительность (дней)</div>
      <input class="field" id="cn-days" type="number" min="2" max="365" value="14">
      <button class="btn-primary wide" id="cn-go">Создать</button>`);
    document.getElementById('modal-box').querySelector('.m-close').onclick = HT.closeModal;
    document.getElementById('cn-go').onclick = () => {
      const name = document.getElementById('cn-name').value.trim();
      const days = Math.max(2, Math.min(365, Number(document.getElementById('cn-days').value) || 14));
      if (!name) return HT.toast('Введите название');
      const c = { id: HT.uid(), custom: true, ico: '🏅', name, desc: document.getElementById('cn-desc').value.trim(), days, checked: {} };
      mine.push(c); saveMine(); renderChallenges(); HT.closeModal();
      joinExtras(c);
      HT.toast('🏅 Челлендж создан!');
    };
  };

  /* ---------- показ вкладок ---------- */
  HT.onShow['tab-friends'] = renderFriends;
  HT.onShow['tab-chats'] = renderChatList;
  HT.onShow['tab-profile'] = renderProfile;
  HT.onShow['tab-challenges'] = renderChallenges;

  ensureChatInfoBtn();
  renderFriends();
  renderChatList();
  renderProfile();
  renderChallenges();
})();
