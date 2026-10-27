/* ===== ТРЕКЕР ПРИВЫЧЕК: серии дней, сетка месяца, награды ===== */
(() => {
  let habits = HT.get('habits', []);

  const save = () => HT.set('habits', habits);
  const dkey = HT.dkey;

  const totalChecks = () => habits.reduce((s, h) => s + Object.keys(h.days).length, 0);

  function streak(h) {
    if (h.type === 'bad') {
      const dates = Object.keys(h.days).sort();
      const last = dates[dates.length - 1];
      if (!last) return daysSince(h.created);
      const l = new Date(last + 'T00:00:00');
      const t = new Date(); t.setHours(0, 0, 0, 0);
      if (dkey(l) === dkey(t)) return 0;
      return Math.round((t - l) / 864e5);
    }
    let n = 0, d = new Date();
    if (!h.days[dkey(d)]) d = HT.addDays(d, -1);
    while (h.days[dkey(d)]) { n++; d = HT.addDays(d, -1); }
    return n;
  }
  function daysSince(ts) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const c = new Date(ts); c.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((t - c) / 864e5));
  }
  const bestOf = h => Math.max(h.best || 0, streak(h));

  /* ---------- отрисовка списка ---------- */
  function render() {
    const list = document.getElementById('habit-list');
    const today = dkey();
    list.innerHTML = '';

    habits.forEach(h => {
      const st = streak(h);
      const doneToday = !!h.days[today];
      const el = document.createElement('div');
      el.className = 'habit-card';
      el.style.setProperty('--hc', h.color);

      let meta;
      if (h.type === 'bad') {
        meta = `🚫 <b>${st}</b> ${plural(st, 'день', 'дня', 'дней')} без вредной привычки`;
      } else {
        meta = doneToday ? '✅ выполнено сегодня' : 'отметьте сегодняшний день';
      }

      let week = '';
      for (let i = 6; i >= 0; i--) {
        const d = HT.addDays(new Date(), -i);
        const k = dkey(d);
        const cls = h.days[k] ? (h.type === 'bad' ? 'slip' : 'done') : '';
        week += `<div class="wdot ${cls} ${k === today ? 'today' : ''}">${HT.RU_DAYS[d.getDay()][0]}</div>`;
      }

      el.innerHTML = `
        <div class="habit-letter" style="--hc:${h.color}">${h.photo ? `<img src="${h.photo}" alt="">` : (h.name || '?').trim().charAt(0).toUpperCase()}</div>
        <div class="habit-main" data-open="${h.id}">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">${meta}</div>
          <div class="habit-week">${week}</div>
          <span class="streak">Серия ${st} · рекорд ${bestOf(h)}</span>
        </div>
        <button class="habit-check ${doneToday ? 'done' : ''}" data-check="${h.id}"
          title="${h.type === 'bad' ? 'Был срыв' : 'Выполнено'}">✓</button>`;
      list.appendChild(el);
    });

    document.getElementById('habit-hint').classList.toggle('hidden', habits.length > 0);

    list.querySelectorAll('[data-check]').forEach(b => b.onclick = () => toggle(b.dataset.check));
    list.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openHabit(b.dataset.open));

    renderStats();
    renderGrid();
  }
  window.__trackerRefresh = render;

  function plural(n, a, b, c) {
    const m = n % 100, d = n % 10;
    if (m > 10 && m < 20) return c;
    if (d === 1) return a;
    if (d >= 2 && d <= 4) return b;
    return c;
  }

  function renderStats() {
    const today = dkey();
    const good = habits.filter(h => h.type !== 'bad');
    const done = good.filter(h => h.days[today]).length;
    document.getElementById('tr-today').textContent = `${done}/${good.length}`;
    document.getElementById('tr-best').textContent = habits.reduce((m, h) => Math.max(m, bestOf(h)), 0);
    document.getElementById('tr-level').textContent = 1 + Math.floor(totalChecks() / 10);
  }

  /* ---------- сетка месяца (привычки × дни, как в буллет-журнале) ---------- */
  let gridMonth = new Date();
  function renderGrid() {
    const y = gridMonth.getFullYear(), m = gridMonth.getMonth();
    const daysIn = new Date(y, m + 1, 0).getDate();
    const today = dkey();
    document.getElementById('tg-label').textContent = `${HT.RU_MONTHS[m]} ${y}`;

    const grid = document.getElementById('tracker-grid');
    if (!habits.length) {
      grid.innerHTML = '<p class="tiny" style="grid-column:1/-1;text-align:center">Добавьте привычки — и они появятся здесь цветными рядами ✿</p>';
      return;
    }
    let html = '<div class="hgrid-inner">';
    html += '<div class="hg-n"></div>';
    for (let d = 1; d <= daysIn; d++) {
      const dt = new Date(y, m, d);
      const wd = dt.getDay();
      const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      html += `<div class="hg-d ${wd === 0 || wd === 6 ? 'wknd' : ''}" style="${k === today ? 'color:var(--acc)' : ''}">${d}</div>`;
    }
    habits.forEach(h => {
      html += `<div class="hg-n" title="${h.name}">${h.photo ? `<img src="${h.photo}" alt="">` : (h.name || '?').trim().charAt(0).toUpperCase()}</div>`;
      for (let d = 1; d <= daysIn; d++) {
        const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const on = !!(h.days && h.days[k]);
        const future = k > today;
        const cls = [
          'hg-c',
          on ? (h.type === 'bad' ? 'slip' : 'done') : '',
          k === today ? 'today' : '',
          future ? 'future' : ''
        ].join(' ');
        html += `<button class="${cls}" style="--hc:${h.color}" data-h="${h.id}" data-k="${k}" title="${h.name} · ${d}"></button>`;
      }
    });
    html += '</div>';
    grid.innerHTML = html;
    grid.querySelectorAll('[data-h]').forEach(c => c.onclick = () => {
      const h = habits.find(x => x.id === c.dataset.h);
      const k = c.dataset.k;
      if (!h) return;
      if (!h.days) h.days = {};
      if (h.days[k]) delete h.days[k]; else h.days[k] = true;
      h.best = Math.max(h.best || 0, streak(h));
      save();
      render();
      HT.toast(h.days[k] ? `✅ ${h.name}: ${Number(k.slice(-2))} ${HT.RU_MONTHS[Number(k.slice(5, 7)) - 1]} отмечен` : '↩️ Отметка снята');
    });
  }
  document.getElementById('tg-prev').onclick = () => { gridMonth = new Date(gridMonth.getFullYear(), gridMonth.getMonth() - 1, 1); renderGrid(); };
  document.getElementById('tg-next').onclick = () => { gridMonth = new Date(gridMonth.getFullYear(), gridMonth.getMonth() + 1, 1); renderGrid(); };

  /* ---------- отметка сегодня ---------- */
  function toggle(id) {
    const h = habits.find(x => x.id === id);
    if (!h) return;
    const today = dkey();
    if (h.type === 'bad') {
      if (h.days[today]) {
        delete h.days[today];
        HT.toast('↩️ Срыв отменён');
      } else {
        h.best = bestOf(h);
        h.days[today] = true;
        HT.toast('😢 Зафиксирован срыв — завтра новый день!');
      }
    } else {
      if (h.days[today]) {
        delete h.days[today];
        HT.toast('↩️ Отметка снята');
      } else {
        h.days[today] = true;
        const st = streak(h);
        h.best = Math.max(h.best || 0, st);
        if (st >= 3) HT.toast(`🔥 Серия ${st} ${plural(st, 'день', 'дня', 'дней')}! Так держать!`);
        else HT.toast('✅ Отмечено! Молодец!');
        if (st === 7) HT.notify('Неделя!', `У привычки «${h.name}» 7 дней подряд!`);
      }
    }
    h.best = Math.max(h.best || 0, streak(h));
    save();
    render();
    HT.rewards && HT.rewards.updateDot();
  }

  /* ---------- модалка привычки (календарь + статистика) ---------- */
  let calMonth = new Date();
  function openHabit(id) {
    const h = habits.find(x => x.id === id);
    if (!h) return;
    calMonth = new Date();

    const draw = () => {
      const y = calMonth.getFullYear(), m = calMonth.getMonth();
      const first = new Date(y, m, 1);
      const startDow = (first.getDay() + 6) % 7; // пн = 0
      const daysIn = new Date(y, m + 1, 0).getDate();
      const today = dkey();
      let cells = ['пн','вт','ср','чт','пт','сб','вс'].map(d => `<div class="cd head">${d}</div>`).join('');
      for (let i = 0; i < startDow; i++) cells += '<div class="cd"></div>';
      for (let d = 1; d <= daysIn; d++) {
        const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const on = h.days[k];
        const cls = on ? (h.type === 'bad' ? 'slip' : 'on') : '';
        cells += `<div class="cd ${cls} ${k === today ? 'today' : ''}">${d}</div>`;
      }
      const st = streak(h);
      const stLabel = h.type === 'bad' ? 'дней без' : 'серия';
      const total = Object.keys(h.days).length;
      const monthCount = Object.keys(h.days).filter(k => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length;

      HT.openModal(`
        <div class="m-title"><span class="habit-letter" style="--hc:${h.color};width:30px;height:30px;font-size:14px;border-radius:9px">${h.photo ? `<img src="${h.photo}" alt="">` : (h.name || '?').trim().charAt(0).toUpperCase()}</span> ${h.name} <button class="m-close">✕</button></div>
        <div class="m-stats">
          <div><b>${st}</b>${stLabel}</div>
          <div><b>${bestOf(h)}</b>рекорд</div>
          <div><b>${total}</b>всего</div>
          <div><b>${monthCount}</b>за месяц</div>
        </div>
        <div class="m-row" style="align-items:center">
          <button class="btn-ghost" data-cal="-1" style="margin:0">‹</button>
          <div style="text-align:center;font-weight:700">${HT.RU_MONTHS[m]} ${y}</div>
          <button class="btn-ghost" data-cal="1" style="margin:0">›</button>
        </div>
        <div class="cal-grid">${cells}</div>
        <p class="tiny" style="margin-top:10px">${h.type === 'bad'
          ? '🔴 красные дни — срывы. Задача: пустых дней всё больше!'
          : '🟢 зелёные — выполненные дни. Не рвите цепочку!'}</p>
        <div class="m-row" style="margin-top:12px">
          <button class="btn-ghost" data-photo="${h.id}" style="margin:0">📷 ${h.photo ? 'Сменить фото' : 'Своё фото'}</button>
          <button class="btn-ghost danger" data-del="${h.id}" style="margin:0">🗑 Удалить</button>
        </div>`);

      const box = document.getElementById('modal-box');
      box.querySelector('.m-close').onclick = HT.closeModal;
      box.querySelector('[data-photo]').onclick = () => HT.pickFile('image/*', f => {
        if (f.size > 8e6) return HT.toast('Фото слишком большое');
        HT.resizeImage(f, url => {
          h.photo = url;
          save(); render(); draw();
          HT.toast('📷 Фото привычки обновлено');
        }, 300);
      });
      box.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
        calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(b.dataset.cal), 1);
        draw();
      });
      box.querySelector('[data-del]').onclick = () => {
        if (!confirm(`Удалить привычку «${h.name}»?`)) return;
        habits = habits.filter(x => x.id !== h.id);
        save(); render(); HT.closeModal(); HT.toast('🗑 Удалено');
      };
    };
    draw();
  }

  /* ---------- добавление ---------- */
  const COLORS = ['#C4693F', '#7A8B6F', '#B08968', '#9C6B8A', '#6B8CA3', '#C1554E', '#A98B4F', '#5F7D6E'];

  document.getElementById('btn-add-habit').onclick = () => {
    let color = COLORS[0], type = 'good', photo = '';
    HT.openModal(`
      <div class="m-title">Новая привычка <button class="m-close">✕</button></div>
      <div class="m-label">Название</div>
      <input class="field" id="h-name" placeholder="Например: Пить воду" maxlength="40">
      <div class="m-label">Фото привычки</div>
      <button class="btn-ghost wide" id="h-photo" style="margin-top:0">📷 Выбрать своё фото</button>
      <div class="h-photo-prev hidden" id="h-photo-prev"><img alt=""></div>
      <p class="tiny">Без фото аватаркой станет буква названия.</p>
      <div class="m-label">Тип</div>
      <div class="seg" id="h-type">
        <button class="active" data-t="good">Полезная (делаю)</button>
        <button data-t="bad">Вредная (не делаю)</button>
      </div>
      <div class="m-label">Цвет</div>
      <div class="color-pick" id="h-colors">${COLORS.map((c, i) => `<button class="${i === 0 ? 'sel' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div>
      <button class="btn-primary wide" id="h-save">Создать привычку</button>`);

    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelector('#h-photo').onclick = () => HT.pickFile('image/*', f => {
      if (f.size > 8e6) return HT.toast('Фото слишком большое');
      HT.resizeImage(f, url => {
        photo = url;
        const prev = document.getElementById('h-photo-prev');
        prev.classList.remove('hidden');
        prev.querySelector('img').src = url;
      }, 300);
    });
    box.querySelectorAll('#h-type button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#h-type button').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); type = b.dataset.t;
    });
    box.querySelectorAll('#h-colors button').forEach(b => b.onclick = () => {
      box.querySelectorAll('#h-colors button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); color = b.dataset.c;
    });
    box.querySelector('#h-save').onclick = () => {
      const name = document.getElementById('h-name').value.trim();
      if (!name) return HT.toast('Введите название');
      habits.push({
        id: HT.uid(), name, icon: '', photo, color, type,
        days: {}, best: 0, created: Date.now()
      });
      save(); render(); HT.closeModal();
      HT.toast(type === 'bad' ? 'Следим, чтобы не срываться' : 'Привычка добавлена');
    };
  };

  /* ---------- добавление привычки извне (челленджи) ---------- */
  HT.addHabit = function ({ name, icon = '', color = '#C4693F', type = 'good' }) {
    if (habits.some(h => h.name === name)) return null;
    const h = { id: HT.uid(), name, icon, color, type, days: {}, best: 0, created: Date.now() };
    habits.push(h);
    save(); render();
    return h;
  };

  HT.onShow['tab-tracker'] = () => {
    document.getElementById('hdr-sub').textContent = HT.fmtRu(new Date());
    habits = HT.get('habits', []);
    render();
  };
  render();
})();
