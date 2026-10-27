/* ===== КАЛЕНДАРЬ: месяц · дела · самочувствие · цикл · расписание ===== */
(() => {
  /* ---------- расписание (дневник) ---------- */
  const KEY = 'schedule';
  let data = HT.get(KEY, {});
  let day = (() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 6 ? d : 1;
  })();
  const DAYS = { 1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота', 7: 'Воскресенье' };
  const CHIPS = { 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб', 7: 'вс' };
  const DOW = { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => HT.set(KEY, data), 300); };

  /* ---------- данные календаря ---------- */
  let mood = HT.get('mood', {});       // {date:{mood,energy,tags,note}}
  let calEv = HT.get('calEv', {});     // {date:[{id,text}]}
  let habits = HT.get('habits', []);
  let cycle = HT.get('cycle', null) || { days: {}, avgLen: 28, perLen: 5 };
  if (!cycle.days) cycle.days = {};
  /* миграция: раньше значения были boolean */
  Object.keys(cycle.days).forEach(k => {
    if (cycle.days[k] === true) cycle.days[k] = { kind: 'per' };
    else if (cycle.days[k] === false) delete cycle.days[k];
    else if (!cycle.days[k].kind) cycle.days[k].kind = 'per';
  });
  if (!cycle.avgLen) cycle.avgLen = 28;
  if (!cycle.perLen) cycle.perLen = 5;
  const saveMood = () => HT.set('mood', mood);
  const saveEv = () => HT.set('calEv', calEv);
  /* запись в ht_cycle: ТОЛЬКО склейка (union) — чужие/старые записи не затираются */
  const cycleDel = new Set();
  const saveCycle = () => {
    const stored = HT.get('cycle', null) || {};
    const out = Object.assign({}, stored, cycle);
    out.days = Object.assign({}, stored.days || {}, cycle.days);
    cycleDel.forEach(kk => { delete out.days[kk]; });
    cycleDel.clear();
    HT.set('cycle', out);
    cycle = out;
  };
  window.__calendarReload = () => {
    mood = HT.get('mood', {}); calEv = HT.get('calEv', {});
    habits = HT.get('habits', []); cycle = HT.get('cycle', { days: {}, avgLen: 28, perLen: 5 });
    if (!cycle.days) cycle.days = {};
    renderMonth();
    if (view === 'cycle') renderCycle();
  };

  /* ---------- переключатель вкладок ---------- */
  let view = 'week';
  const segBtns = document.querySelectorAll('#sched-seg button');
  function setView(v) {
    view = v;
    segBtns.forEach(b => b.classList.toggle('active', b.dataset.sview === v));
    document.getElementById('sched-monthview').classList.toggle('hidden', v !== 'month');
    document.getElementById('sched-weekview').classList.toggle('hidden', v !== 'week');
    document.getElementById('sched-cycleview').classList.toggle('hidden', v !== 'cycle');
    if (v === 'month') renderMonth();
    if (v === 'cycle') { renderCycle(); maybeOnboard(); }
    if (v === 'week') { renderChips(); renderRows(); }
  }
  segBtns.forEach(b => b.onclick = () => setView(b.dataset.sview));
  window.__schedSetView = setView;

  /* ================= МЕСЯЦ ================= */
  let calMonth = new Date();
  const RU_WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
  const MOOD_EMOJI = ['😞', '😕', '😐', '🙂', '😄'];
  const MOOD_TAGS = ['Боли', 'Голова', 'Устала', 'Стресс', 'Плохой сон', 'Кожа', 'Вздутие', 'Хорошо'];
  const CYC_TAGS = ['Боли', 'Спазмы', 'Голова', 'Усталость', 'Настроение', 'Отёки', 'Тянет низ'];

  function lastPerStart() {
    const perDays = Object.keys(cycle.days).filter(d => cycle.days[d].kind === 'per').sort();
    return perDays.length ? perDays[perDays.length - 1] : null;
  }
  function cyclePredict() {
    const last = lastPerStart();
    if (!last) return null;
    const next = HT.addDays(new Date(last + 'T00:00:00'), cycle.avgLen);
    const ovu = HT.addDays(next, -14);
    return { last, next: HT.dkey(next), ovu: HT.dkey(ovu) };
  }
  function cycleDayNum(dateStr) {
    const p = cyclePredict();
    if (!p) return 0;
    const diff = Math.round((new Date(dateStr + 'T00:00:00') - new Date(p.last + 'T00:00:00')) / 864e5);
    if (diff < 0) return 0;
    return (diff % cycle.avgLen) + 1;
  }

  function renderMonth() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysIn = new Date(y, m + 1, 0).getDate();
    const today = HT.dkey();
    const pred = cyclePredict();

    let cells = RU_WD.map(d => `<div class="mgrid-wd">${d}</div>`).join('');
    for (let i = 0; i < startDow; i++) cells += '<div class="mgrid-cell empty"></div>';

    for (let d = 1; d <= daysIn; d++) {
      const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const marks = [];
      /* привычки: сколько выполнено */
      const good = habits.filter(h => h.type !== 'bad');
      const done = good.filter(h => h.days && h.days[k]).length;
      if (good.length && done) marks.push(`<span class="mg-mark" style="color:var(--sage)">●</span>`);
      /* дела */
      const evs = calEv[k] || [];
      if (evs.length) marks.push(`<span class="mg-ev">${evs[0].text}${evs.length > 1 ? ' +' + (evs.length - 1) : ''}</span>`);

      cells += `<button class="mgrid-cell ${k === today ? 'today' : ''}" data-k="${k}">
        <span>${d}</span>${marks.join('')}</button>`;
    }

    document.getElementById('mv-label').textContent = `${HT.RU_MONTHS[m]} ${y}`;
    const grid = document.getElementById('mv-grid');
    grid.innerHTML = cells;
    grid.querySelectorAll('[data-k]').forEach(c => c.onclick = () => openDay(c.dataset.k));
  }
  document.getElementById('mv-prev').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderMonth(); };
  document.getElementById('mv-next').onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderMonth(); };

  /* ================= КАРТОЧКА ДНЯ ================= */
  function openDay(k) {
    const dt = new Date(k + 'T00:00:00');
    const wdIdx = DOW[dt.getDay()];
    const evs = calEv[k] || [];

    HT.openModal(`
      <div class="m-title">Карточка дня <button class="m-close">✕</button></div>
      <div class="day-head">
        <span class="dh-num">${dt.getDate()} ${HT.RU_MONTHS[dt.getMonth()]}</span>
        <span class="tiny">${DAYS[wdIdx]}</span>
      </div>

      <div class="ds-block">
        <div class="set-title">Дела дня</div>
        <div id="ds-evs">
          ${evs.length ? evs.map(e => `<div class="ev-item"><span>${e.text}</span><button data-del="${e.id}">✕</button></div>`).join('')
            : '<p class="tiny">Дел пока нет — добавьте первое ниже.</p>'}
        </div>
        <div class="task-row" style="margin-top:6px">
          <input class="field" id="ds-ev-inp" placeholder="Новое дело на этот день…" maxlength="80">
          <button class="btn-primary" id="ds-ev-add">+</button>
        </div>
      </div>

      <div class="ds-block">
        <div class="set-title">Привычки</div>
        ${habits.length ? habits.map(h => {
          const on = h.days && h.days[k];
          const isBad = h.type === 'bad';
          return `<div class="ds-habit">
            <span class="habit-letter" style="--hc:${h.color || 'var(--acc)'};width:30px;height:30px;font-size:14px;border-radius:9px">${escA(h.name)}</span>
            <span class="hb-name">${h.name}</span>
            <button class="ds-check ${on ? 'on' : ''}" data-h="${h.id}" data-bad="${isBad ? 1 : 0}">${on ? '✓' : ''}</button>
          </div>`;
        }).join('') : '<p class="tiny">Привычек пока нет — добавьте в трекере.</p>'}
      </div>

      <button class="btn-ghost wide" id="ds-open-plans">Открыть планы на этот день</button>`);

    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;

    box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      calEv[k] = (calEv[k] || []).filter(e => e.id !== b.dataset.del);
      saveEv(); renderMonth(); HT.closeModal(); openDay(k);
    });
    const addEv = () => {
      const inp = box.querySelector('#ds-ev-inp');
      const t = inp.value.trim();
      if (!t) return;
      if (!calEv[k]) calEv[k] = [];
      calEv[k].push({ id: HT.uid(), text: t });
      inp.value = '';
      saveEv(); renderMonth(); HT.closeModal(); openDay(k);
      HT.toast('Дело добавлено в календарь');
    };
    box.querySelector('#ds-ev-add').onclick = addEv;
    box.querySelector('#ds-ev-inp').onkeydown = e => { if (e.key === 'Enter') addEv(); };

    box.querySelectorAll('.ds-check').forEach(b => b.onclick = () => {
      const h = habits.find(x => x.id === b.dataset.h);
      if (!h) return;
      if (!h.days) h.days = {};
      if (h.days[k]) delete h.days[k]; else h.days[k] = true;
      HT.set('habits', habits);
      if (window.__trackerRefresh) window.__trackerRefresh();
      b.classList.toggle('on', !!h.days[k]);
      b.textContent = h.days[k] ? '✓' : '';
      renderMonth();
      HT.rewards && HT.rewards.updateDot();
    });

    box.querySelector('#ds-open-plans').onclick = () => {
      HT.closeModal();
      HT.showTab('tab-plans');
      if (window.__plansGoToDate) window.__plansGoToDate(k);
    };
  }
  const escA = s => (s || '?').trim().charAt(0).toUpperCase() || '?';
  const fmtDate = k => {
    const d = new Date(k + 'T00:00:00');
    return `${d.getDate()} ${HT.RU_MONTHS[d.getMonth()]}`;
  };

  /* ================= ЦИКЛ (женский календарь) ================= */
  let cycMonth = new Date();
  let histAll = false;

  /* СВОЙ ключ (ht_cycle не трогаем): переопределения расчётов */
  const CSK = 'cycleSettings';
  let cSet = HT.get(CSK, {}) || {};
  const saveCSet = () => HT.set(CSK, cSet);

  const SHORT_M = ['янв.', 'февр.', 'март', 'апр.', 'май', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
  const NOM_M = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const escX = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cycShort = k => { const d = new Date(k + 'T00:00:00'); return `${d.getDate()} ${SHORT_M[d.getMonth()]}`; };
  const addK = (k, n) => HT.dkey(HT.addDays(new Date(k + 'T00:00:00'), n));
  const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || lo));
  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10;
    return f[(a > 10 && a < 20) ? 2 : (b > 1 && b < 5) ? 1 : b === 1 ? 0 : 2]; };

  const ICO_DROP = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3.6c3.4 4.2 5.8 7.3 5.8 10.2A5.8 5.8 0 0 1 6.2 13.8c0-2.9 2.4-6 5.8-10.2Z"/></svg>';
  const ICO_FLOWER = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="6.7" r="3"/><circle cx="12" cy="17.3" r="3"/><circle cx="6.7" cy="12" r="3"/><circle cx="17.3" cy="12" r="3"/><circle cx="12" cy="12" r="1.7"/></svg>';
  const ICO_RING = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/></svg>';

  /* ---------- расчёты по записям (ht_cycle читаем, ничего не удаляем) ---------- */
  function periodStarts() {
    const per = Object.keys(cycle.days).filter(d => cycle.days[d] && cycle.days[d].kind === 'per').sort();
    const out = [];
    per.forEach(d => {
      const prev = addK(d, -1);
      if (!cycle.days[prev] || cycle.days[prev].kind !== 'per') out.push(d);
    });
    return out;
  }
  function periodLenAt(s) {
    let n = 0, k = s;
    while (n < 15 && cycle.days[k] && cycle.days[k].kind === 'per') { n++; k = addK(k, 1); }
    return n;
  }
  /* средняя длина цикла: настройка → иначе среднее по записям (нет данных → 28) */
  function avgCycleLen() {
    const ov = cSet.cycleLen || cSet.avgLen;
    if (ov) return clampN(ov, 18, 60);
    const s = periodStarts();
    if (s.length > 1) {
      const diffs = [];
      for (let i = 1; i < s.length; i++) diffs.push(daysBetween(s[i - 1], s[i]));
      const good = diffs.slice(-6).filter(d => d >= 15 && d <= 60);
      if (good.length) return clampN(Math.round(good.reduce((a, b) => a + b, 0) / good.length), 18, 60);
    }
    if (cycle.avgLen && !s.length) return clampN(cycle.avgLen, 18, 60);
    return 28;
  }
  /* длительность менструации: настройка → иначе среднее из записей (нет данных → 5) */
  function avgPerLen() {
    const ov = cSet.periodLen || cSet.perLen;
    if (ov) return clampN(ov, 2, 12);
    const s = periodStarts().slice(-6);
    const ds = s.map(periodLenAt).filter(n => n > 0);
    if (ds.length) return clampN(Math.round(ds.reduce((a, b) => a + b, 0) / ds.length), 2, 12);
    if (!s.length && cycle.perLen) return clampN(cycle.perLen, 2, 12);
    return 5;
  }

  function cycleState() {
    const today = HT.dkey();
    const starts = periodStarts();
    const avg = avgCycleLen(), per = avgPerLen();

    /* якорь: факт из ht_cycle → иначе settings.start → иначе сегодня */
    let anchor = starts.length ? starts[starts.length - 1] : null;
    const sSet = cSet.start;
    if (sSet && /^\d{4}-\d{2}-\d{2}$/.test(String(sSet))) {
      if (!anchor || (sSet > anchor && sSet <= today)) anchor = sSet;
    }
    if (!anchor) anchor = today;
    let guard = 0;
    while (daysBetween(anchor, today) >= avg && guard++ < 400) anchor = addK(anchor, avg);
    guard = 0;
    while (daysBetween(anchor, today) < 0 && guard++ < 400) anchor = addK(anchor, -avg);

    const dayNum = daysBetween(anchor, today) + 1;
    const perGoing = !!(cycle.days[today] && cycle.days[today].kind === 'per');
    let perGoDay = 0;
    if (perGoing) {
      let k2 = today;
      while (perGoDay < 20 && cycle.days[k2] && cycle.days[k2].kind === 'per') { perGoDay++; k2 = addK(k2, -1); }
    }

    /* --- СЕРИЯ: ближайшие 3 даты начала цикла --- */
    const s0 = daysBetween(anchor, today) > 0 ? addK(anchor, avg) : anchor;
    const next3 = [s0, addK(s0, avg), addK(s0, 2 * avg)];
    const nextStart = s0;
    const daysLeft = daysBetween(today, nextStart);

    /* овуляция = день цикла (avg − 14), но не раньше конца менструации */
    const ovIdx = Math.max(per, Math.min(avg - 1, avg - 14));
    let ovuKey = addK(anchor, ovIdx);
    if (ovuKey < today) ovuKey = addK(addK(anchor, avg), ovIdx);
    const fertFrom = addK(ovuKey, -5), fertTo = addK(ovuKey, 1);

    /* вероятность зачатия */
    const i = dayNum - 1;
    let prob = 'Низкая';
    if (!perGoing && dayNum > per) {
      if (i >= ovIdx - 3 && i <= ovIdx + 1) prob = 'Высокая';
      else if ((i >= ovIdx - 5 && i < ovIdx - 3) || (i > ovIdx + 1 && i <= ovIdx + 3)) prob = 'Средняя';
    }

    /* подсветка: 3 ближайших менструации (ряды дат) + овуляции ±1 и окно −5…+1 */
    const perForecast = next3.map(s => ({ from: s, to: addK(s, per - 1) }));
    const ovuMark = {}, fertMark = {}, seenS = {};
    [anchor].concat(next3).forEach(s => {
      if (seenS[s]) return;
      seenS[s] = 1;
      const ov = addK(s, ovIdx);
      for (let d = -1; d <= 1; d++) ovuMark[addK(ov, d)] = 1;   /* овуляция: ±1 день */
      for (let d = -5; d <= -2; d++) fertMark[addK(ov, d)] = 1; /* окно зачатия: −5…+1 */
    });

    return { today, starts, avg, per, anchor, dayNum, perGoing, perGoDay, nextStart, daysLeft,
      ovIdx, ovuKey, fertFrom, fertTo, prob, perForecast, next3, ovuMark, fertMark };
  }
  function dayNumAt(k, st) {
    const diff = daysBetween(st.anchor, k);
    return diff - Math.floor(diff / st.avg) * st.avg + 1;
  }
  function phaseOf(n, st) {
    if (n <= st.per) return 'Менструация';
    if (n <= st.ovIdx - 3) return 'Фолликулярная';
    if (n <= st.ovIdx + 1) return 'Овуляция';
    return 'Лютеиновая';
  }
  function untilPer(k, st) {
    let s = st.anchor, g = 0;
    while (s > k && g++ < 900) s = addK(s, -st.avg);
    while (s < k && g++ < 900) s = addK(s, st.avg);
    const d = daysBetween(k, s);
    if (d < 0) return '—';
    if (d === 0) return 'месячные сегодня';
    return `через ${d} ${plural(d, ['день', 'дня', 'дней'])}`;
  }
  /* аккуратно добавляем день в ht_cycle: старое не затираем, ничего не удаляем */
  function markPer(k) {
    const stored = HT.get('cycle', null) || {};
    if (!stored.days) stored.days = {};
    if (stored.days[k] && stored.days[k].kind === 'per') { HT.toast('Этот день уже отмечен 🌸'); return; }
    stored.days[k] = Object.assign({}, stored.days[k] || {}, { kind: 'per' });
    HT.set('cycle', stored);
    cycle = stored;
    renderCycle(); renderMonth();
    HT.toast('Записано, спасибо 🌸 ' + cycShort(k));
  }

  /* ---------- даты: «18…24 окт.» или «28 окт. — 3 нояб.» ---------- */
  const rangeShort = (a, b) => {
    const da = new Date(a + 'T00:00:00'), db = new Date(b + 'T00:00:00');
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()
      ? `${da.getDate()}…${db.getDate()} ${SHORT_M[da.getMonth()]}`
      : `${cycShort(a)} — ${cycShort(b)}`;
  };

  /* ---------- онбординг + «⚙ Настроить»: модалка настройки цикла ---------- */
  const OBK = 'cycleOnboarded';   /* свой ключ: флаг «настройку показывали» */
  let obOpen = false;

  /* «залипание» флага: модалку могут закрыть извне (тап по фону в core.js) */
  function syncObOpen() {
    if (!obOpen) return;
    const m = document.getElementById('modal');
    if (!m || m.classList.contains('hidden')) obOpen = false;
  }

  function openCycleSetup() {
    syncObOpen();
    if (obOpen) return;
    obOpen = true;
    const st0 = cycleState();
    const start = (cSet.start && /^\d{4}-\d{2}-\d{2}$/.test(String(cSet.start))) ? cSet.start : HT.dkey();
    let len = clampN(cSet.cycleLen || cSet.avgLen || st0.avg, 18, 60);
    let per = clampN(cSet.periodLen || cSet.perLen || st0.per, 2, 12);

    const LEN_CHIPS = [];
    for (let v = 21; v <= 35; v++) LEN_CHIPS.push(v);
    const PER_CHIPS = [];
    for (let v = 2; v <= 10; v++) PER_CHIPS.push(v);

    HT.openModal(`
      <div class="m-title">Настрой цикл <button class="m-close">✕</button></div>
      <p class="cy-ob-hint">Это нужно для прогнозов — потом можно изменить</p>

      <div class="cy-ob-lab">Дата начала последних месячных</div>
      <input type="date" id="cy-ob-date" class="field cy-ob-date" value="${start}">

      <div class="cy-ob-lab">Средняя длительность цикла</div>
      <div class="cy-ob-stepper">
        <button id="cy-ob-minus" type="button" aria-label="Уменьшить">−</button>
        <div class="cy-ob-num"><b id="cy-ob-len">${len}</b><span>дней</span></div>
        <button id="cy-ob-plus" type="button" aria-label="Увеличить">+</button>
      </div>
      <div class="cy-ob-chips" id="cy-ob-lenchips">
        ${LEN_CHIPS.map(v => `<button type="button" class="cy-ob-chip${v === len ? ' sel' : ''}" data-v="${v}">${v}</button>`).join('')}
      </div>

      <div class="cy-ob-lab">Сколько дней длятся месячные</div>
      <div class="cy-ob-chips" id="cy-ob-perchips">
        ${PER_CHIPS.map(v => `<button type="button" class="cy-ob-chip${v === per ? ' sel' : ''}" data-v="${v}">${v}</button>`).join('')}
      </div>

      <button class="btn-primary wide" id="cy-ob-save" style="margin-top:18px">Сохранить</button>
      <button class="btn-ghost wide" id="cy-ob-skip" style="margin-top:8px">Пропустить</button>`);

    const box = document.getElementById('modal-box');
    const numEl = box.querySelector('#cy-ob-len');
    const markChips = () => {
      box.querySelectorAll('#cy-ob-lenchips .cy-ob-chip').forEach(c =>
        c.classList.toggle('sel', Number(c.dataset.v) === len));
      box.querySelectorAll('#cy-ob-perchips .cy-ob-chip').forEach(c =>
        c.classList.toggle('sel', Number(c.dataset.v) === per));
    };
    const setLen = v => { len = clampN(v, 18, 60); numEl.textContent = len; markChips(); };

    box.querySelector('#cy-ob-minus').onclick = () => setLen(len - 1);
    box.querySelector('#cy-ob-plus').onclick = () => setLen(len + 1);
    box.querySelectorAll('#cy-ob-lenchips .cy-ob-chip').forEach(c => c.onclick = () => setLen(c.dataset.v));
    box.querySelectorAll('#cy-ob-perchips .cy-ob-chip').forEach(c => c.onclick = () => {
      per = clampN(c.dataset.v, 2, 12); markChips();
    });

    const close = () => { obOpen = false; HT.closeModal(); };
    const done = () => {   /* «✕» и «Пропустить» — больше не спрашиваем, открываем с дефолтами */
      HT.set(OBK, true);
      close();
      if (view === 'cycle') renderCycle();
    };
    box.querySelector('.m-close').onclick = done;
    box.querySelector('#cy-ob-skip').onclick = done;
    box.querySelector('#cy-ob-save').onclick = () => {
      const dv = box.querySelector('#cy-ob-date').value || HT.dkey();
      cSet = { start: dv, cycleLen: len, periodLen: per };
      saveCSet();
      HT.set(OBK, true);
      close();
      if (view === 'cycle') renderCycle();
      HT.toast('Настройки цикла сохранены ✨');
    };
  }

  /* спрашиваем при первом заходе в сегмент «Месячные» */
  function maybeOnboard() {
    syncObOpen();
    if (obOpen) return;
    if (HT.get(OBK, false) === true) return;
    openCycleSetup();
  }

  function historyList(st) {
    const out = [];
    const s = st.starts;
    for (let i = 0; i < s.length - 1; i++) {
      const len = daysBetween(s[i], s[i + 1]);
      if (len < 1) continue;
      out.push({ s: s[i], pLen: Math.max(1, periodLenAt(s[i])), len });
    }
    return out.reverse();
  }
  function renderCycle() {
    const st = cycleState();
    const y = cycMonth.getFullYear(), m = cycMonth.getMonth();
    const today = st.today;
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysIn = new Date(y, m + 1, 0).getDate();

    /* --- 1. шапка: день цикла + прогноз серии + «⚙ Настроить» --- */
    const big = st.perGoing ? `Месячные идут — день ${st.perGoDay}`
      : st.daysLeft === 0 ? 'Менструации сегодня'
      : `Менструации через ${st.daysLeft} ${plural(st.daysLeft, ['день', 'дня', 'дней'])}`;
    const head = `
      <div class="cy-hero card">
        <div class="cy-hero-top">
          <div class="cy-eyebrow">Сегодня</div>
          <button class="cy-cog" id="cy-cog">⚙ Настроить</button>
        </div>
        <div class="cy-hero-title">Сегодня — День цикла <b>${st.dayNum || '—'}</b></div>
        <div class="cy-hero-sub">${st.prob} — Вероятность забеременеть</div>
        <div class="cy-hero-line"></div>
        <div class="cy-big">${big}</div>
        <div class="cy-big-sub">${cycShort(st.nextStart)} — След. менст.</div>
        <div class="cy-big-sub">Окно зачатия — ${rangeShort(st.fertFrom, st.fertTo)}</div>
        <div class="cy-fore"><em>Прогноз на 3 цикла:</em> ${st.next3.map(cycShort).join(' · ')}</div>
        <button class="cy-cta" id="cy-start">Начало месячных</button>
        ${st.starts.length ? '' : '<div class="cy-hint">Записей пока нет — расчёт идёт от сегодня (по умолчанию 28 дней).</div>'}
      </div>`;

    /* --- 2. полоса-таймлайн цикла --- */
    const ovS = Math.max(st.per, st.ovIdx - 3);
    const ovE = Math.min(st.avg - 1, st.ovIdx + 1);
    const n1 = Math.max(1, st.per), n2 = Math.max(1, ovS - st.per),
      n3 = Math.max(1, ovE - ovS + 1), n4 = Math.max(1, st.avg - 1 - ovE);
    const pct = Math.max(5, Math.min(95, ((st.dayNum - 0.5) / st.avg) * 100));
    const tl = `
      <div class="cy-tl">
        <div class="cy-tl-track">
          <span class="cy-sg per" style="flex:${n1}"></span>
          <span class="cy-sg fol" style="flex:${n2}"></span>
          <span class="cy-sg ovu" style="flex:${n3}"><i></i></span>
          <span class="cy-sg lut" style="flex:${n4}"></span>
          <span class="cy-tl-mark" style="left:${pct}%"><b>Сегодня</b><em></em></span>
        </div>
        <div class="cy-tl-foot">
          <span>${cycShort(st.anchor)} — начало цикла</span>
          <span>${cycShort(st.nextStart)} — след. менст.</span>
        </div>
      </div>`;

    /* --- 3. три карточки --- */
    const deg = 360 / st.avg;
    const ring = `conic-gradient(from -90deg, #E1827E 0 ${(n1 * deg).toFixed(1)}deg, #EFE6D8 ${(n1 * deg).toFixed(1)}deg ${(ovS * deg).toFixed(1)}deg, #E8B84B ${(ovS * deg).toFixed(1)}deg ${((ovE + 1) * deg).toFixed(1)}deg, #EFE6D8 ${((ovE + 1) * deg).toFixed(1)}deg 360deg)`;
    const cards = `
      <div class="cy-cards">
        <div class="cy-card card">
          <div class="cy-ring" style="background:${ring}"><i>${st.dayNum || '—'}</i></div>
          <div class="cy-card-t">День цикла</div>
          <div class="cy-card-s">из ${st.avg}</div>
        </div>
        <div class="cy-card card">
          <div class="cy-ico rose">${ICO_DROP}</div>
          <div class="cy-card-date">${cycShort(st.nextStart)}</div>
          <div class="cy-card-t">След. менст.</div>
        </div>
        <div class="cy-card card">
          <div class="cy-ico gold">${ICO_FLOWER}</div>
          <div class="cy-card-date">${cycShort(st.ovuKey)}</div>
          <div class="cy-card-t">Окно зачатия</div>
          <div class="cy-card-s">${rangeShort(st.fertFrom, st.fertTo)}</div>
        </div>
      </div>`;

    /* --- карточка настроения (ht_mood, только чтение) --- */
    const md = mood[today];
    let moodHtml = '';
    if (md) {
      const em = typeof md.mood === 'number' ? (MOOD_EMOJI[md.mood] || '') : (md.mood || '');
      moodHtml = `
      <div class="cy-mood card">
        <div class="set-title">Как вы себя чувствуете сегодня? <em class="cy-ro">только чтение</em></div>
        <div class="cy-mood-line">
          <span class="cy-mood-em">${escX(em)}</span>
          <div class="cy-mood-body">
            ${md.energy != null && md.energy !== '' ? `<div class="cy-mood-k">Энергия: ${escX(md.energy)}</div>` : ''}
            ${(md.tags || []).length ? `<div class="cy-mood-k">${md.tags.map(escX).join(' · ')}</div>` : ''}
            ${md.note ? `<div class="cy-mood-note">${escX(md.note)}</div>` : ''}
          </div>
        </div>
      </div>`;
    }

    /* --- 4. компактный календарь: факт плотно, 3 ближайших цикла — прогноз --- */
    let cells = RU_WD.map(d => `<div class="mgrid-wd">${d}</div>`).join('');
    for (let i = 0; i < startDow; i++) cells += '<div class="mgrid-cell empty"></div>';
    for (let d = 1; d <= daysIn; d++) {
      const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cd = cycle.days[k];
      const cls = [];
      if (cd && cd.kind === 'per') cls.push('f-per');
      else if (cd && cd.kind === 'spot') cls.push('f-spot');
      else if (st.perForecast.some(r => k >= r.from && k <= r.to)) cls.push('p-per');
      else if (st.ovuMark[k]) cls.push('p-ovu');
      else if (st.fertMark[k]) cls.push('p-fert');
      if (k === today) cls.push('today');
      cells += `<button class="mgrid-cell cyc-day ${cls.join(' ')}" data-k="${k}"><span class="cy-num">${d}</span></button>`;
    }
    const cal = `
      <div class="cy-sec-h"><b>Календарь</b><span>${NOM_M[m]} ${y}</span></div>
      <div class="date-nav cy-nav">
        <button class="btn-round" id="cyc-prev">‹</button>
        <div class="date-label" id="cyc-label">${NOM_M[m]} ${y}</div>
        <button class="btn-round" id="cyc-next">›</button>
      </div>
      <div class="month-grid card cy-grid" id="cyc-grid">${cells}</div>
      <div class="cy-legend">
        <span><i class="cy-dot per"></i>Месячные</span>
        <span><i class="cy-dot pred"></i>Прогноз</span>
        <span><i class="cy-dot ovu"></i>Овуляция</span>
        <span><i class="cy-dot ovup"></i>Прогноз овуляции</span>
        <span><i class="cy-dot fert"></i>Окно зачатия</span>
      </div>`;

    /* --- 5. анализ цикла --- */
    const rows = historyList(st);
    const shown = histAll ? rows : rows.slice(0, 4);
    const maxLen = Math.max(28, ...rows.map(r => r.len));
    const histHtml = rows.length ? shown.map(r => {
      const bw = Math.max(6, Math.round(r.len / maxLen * 100));
      const pw = Math.max(8, Math.round(r.pLen / r.len * 100));
      const ow = Math.round(clampN(st.avg - 14, 1, r.len - 1) / r.len * 100);
      return `<div class="cy-hrow">
        <div class="cy-hhead"><span>${cycShort(r.s)} — ${cycShort(addK(r.s, r.pLen - 1))}</span><b>${r.len}<em>дн.</em></b></div>
        <div class="cy-hbar"><div class="cy-hfill" style="width:${bw}%">
          <span class="cy-hper" style="width:${pw}%">${r.pLen}</span>
          <i class="cy-hovu" style="left:${ow}%"></i>
        </div></div>
      </div>`;
    }).join('') : '<p class="tiny">Отмечайте дни месячных — здесь появится история и средние значения.</p>';
    const analysis = `
      <div class="cy-sec">
        <div class="cy-sec-h"><b>Анализ цикла</b><span>${rows.length ? `На основе последних ${rows.length} ${plural(rows.length, ['цикла', 'циклов', 'циклов'])}` : 'нет завершённых циклов'}</span></div>
        <div class="cy-stats">
          <div class="cy-stat card rose"><span class="cy-stat-ico">${ICO_DROP}</span><b>${st.per}</b><i>Дней</i><p>Средняя длительность месячных</p></div>
          <div class="cy-stat card gold"><span class="cy-stat-ico">${ICO_RING}</span><b>${st.avg}</b><i>Дней</i><p>Средняя длина цикла</p></div>
        </div>
        <div class="set-title cy-hist-t">История</div>
        ${histHtml}
        ${rows.length > 4 ? `<button class="cy-more" id="cy-more">${histAll ? 'Свернуть' : 'Ещё'}</button>` : ''}
      </div>`;

    /* --- настройки (переопределения — в свой ключ cycleSettings) --- */
    const setHtml = `
      <div class="ds-block cy-set">
        <div class="set-title">Настройки</div>
        <div class="cy-set-row">
          <label class="tiny">Длина цикла<input type="number" id="cyc-avg" class="field" value="${st.avg}" min="18" max="60"></label>
          <label class="tiny">Длительность<input type="number" id="cyc-per" class="field" value="${st.per}" min="2" max="12"></label>
        </div>
        <div class="cy-set-btns">
          <button class="btn-ghost" id="cyc-today">🌸 Отметить сегодняшний день</button>
          <button class="cy-reset" id="cyc-reset">Считать по записям</button>
        </div>
        <p class="tiny cy-set-hint">По умолчанию всё считается по вашим записям: нет данных — 28 и 5 дней. Тапните день в сетке — откроется карточка дня.</p>
      </div>`;

    const box = document.getElementById('sched-cycleview');
    box.innerHTML = head + tl + cards + moodHtml + cal + analysis + setHtml;

    box.querySelector('#cy-start').onclick = () => markPer(today);
    box.querySelector('#cy-cog').onclick = () => openCycleSetup();
    box.querySelector('#cyc-prev').onclick = () => { cycMonth = new Date(cycMonth.getFullYear(), cycMonth.getMonth() - 1, 1); renderCycle(); };
    box.querySelector('#cyc-next').onclick = () => { cycMonth = new Date(cycMonth.getFullYear(), cycMonth.getMonth() + 1, 1); renderCycle(); };
    box.querySelectorAll('#cyc-grid [data-k]').forEach(c => c.onclick = () => openCycleDay(c.dataset.k));
    const moreBtn = box.querySelector('#cy-more');
    if (moreBtn) moreBtn.onclick = () => { histAll = !histAll; renderCycle(); };
    box.querySelector('#cyc-avg').onchange = e => {
      delete cSet.avgLen; cSet.cycleLen = clampN(e.target.value, 18, 60); saveCSet(); renderCycle();
    };
    box.querySelector('#cyc-per').onchange = e => {
      delete cSet.perLen; cSet.periodLen = clampN(e.target.value, 2, 12); saveCSet(); renderCycle();
    };
    box.querySelector('#cyc-today').onclick = () => openCycleDay(today);
    box.querySelector('#cyc-reset').onclick = () => {
      cSet = cSet.start ? { start: cSet.start } : {}; saveCSet(); renderCycle(); HT.toast('Считаем по записям ✨');
    };
  }

  function openCycleDay(k) {
    const st = cycleState();
    const cd = cycle.days[k] || null;
    const dt = new Date(k + 'T00:00:00');
    const n = dayNumAt(k, st);
    const hasRec = st.starts.length > 0;
    const isPerFact = !!(cd && cd.kind === 'per');
    const status = (cd && (cd.kind === 'per' || cd.kind === 'spot')) ? 'Факт'
      : (k > st.today ? 'Прогноз' : (k < st.today ? 'Рассчитано' : 'Прогноз'));
    const md = mood[k];
    const evs = calEv[k] || [];
    const canStart = k >= st.today && !isPerFact;
    const moodHtml = md ? `
      <div class="ds-block">
        <div class="set-title">Как вы себя чувствуете? <em class="cy-ro">только чтение</em></div>
        <div class="cy-mood-line">
          <span class="cy-mood-em">${typeof md.mood === 'number' ? (MOOD_EMOJI[md.mood] || '') : escX(md.mood || '')}</span>
          <div class="cy-mood-body">
            ${md.energy != null && md.energy !== '' ? `<div class="cy-mood-k">Энергия: ${escX(md.energy)}</div>` : ''}
            ${(md.tags || []).length ? `<div class="cy-mood-k">${md.tags.map(escX).join(' · ')}</div>` : ''}
            ${md.note ? `<div class="cy-mood-note">${escX(md.note)}</div>` : ''}
          </div>
        </div>
      </div>` : '';
    const evHtml = evs.length ? `
      <div class="ds-block">
        <div class="set-title">События дня <em class="cy-ro">только чтение</em></div>
        ${evs.map(e => `<div class="cy-ev">${escX(e.text)}</div>`).join('')}
      </div>` : '';
    HT.openModal(`
      <div class="m-title">День цикла <button class="m-close">✕</button></div>
      <div class="cy-mdate">${dt.getDate()} ${HT.RU_MONTHS[dt.getMonth()]} <span>${DAYS[DOW[dt.getDay()]]}</span></div>
      <div class="cy-mgrid">
        <div><span>День цикла</span><b>${hasRec ? n : '—'}</b></div>
        <div><span>Фаза</span><b>${hasRec ? phaseOf(n, st) : '—'}</b></div>
        <div><span>Статус</span><b>${status}</b></div>
        <div><span>До месячных</span><b>${hasRec ? untilPer(k, st) : '—'}</b></div>
      </div>
      ${canStart ? '<button class="btn-primary wide" id="cy-m-start">Начало месячных</button>' : ''}
      ${moodHtml}${evHtml}
      <div class="ds-block">
        <div class="set-title">Отметка дня</div>
        <div class="tag-chips" id="cd-kind">
          <button class="tag-chip ${cd && cd.kind === 'per' ? 'sel' : ''}" data-c="per">🌸 Месячные</button>
          <button class="tag-chip ${cd && cd.kind === 'spot' ? 'sel' : ''}" data-c="spot">🩷 Мажет</button>
          <button class="tag-chip ${!cd ? 'sel' : ''}" data-c="">Нет отметки</button>
        </div>
      </div>
      <div class="ds-block">
        <div class="set-title">Симптомы и самочувствие</div>
        <div class="tag-chips" id="cd-tags">
          ${CYC_TAGS.map(t => `<button class="tag-chip ${(cd && cd.tags || []).includes(t) ? 'sel' : ''}" data-t="${t}">${t}</button>`).join('')}
        </div>
        <input class="field" id="cd-note" style="margin-top:10px" placeholder="Заметка: как себя чувствуешь…" maxlength="200" value="${((cd && cd.note) || '').replace(/"/g, '&quot;')}">
      </div>
      <button class="btn-primary wide" id="cd-save">Сохранить</button>`);

    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    const startBtn = box.querySelector('#cy-m-start');
    if (startBtn) startBtn.onclick = () => { HT.closeModal(); markPer(k); };
    let kind = cd ? cd.kind : '';
    let tags = (cd && cd.tags || []).slice();
    box.querySelectorAll('#cd-kind .tag-chip').forEach(b => b.onclick = () => {
      box.querySelectorAll('#cd-kind .tag-chip').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); kind = b.dataset.c;
    });
    box.querySelectorAll('#cd-tags .tag-chip').forEach(b => b.onclick = () => {
      b.classList.toggle('sel');
      const t = b.dataset.t;
      if (tags.includes(t)) tags = tags.filter(x => x !== t); else tags.push(t);
    });
    box.querySelector('#cd-save').onclick = () => {
      const note = box.querySelector('#cd-note').value.trim();
      if (kind) { cycleDel.delete(k); cycle.days[k] = { kind, tags, note }; }
      else { cycleDel.add(k); delete cycle.days[k]; }
      saveCycle();
      HT.closeModal();
      renderCycle(); renderMonth();
      HT.toast('🌸 День сохранён');
    };
  }

  /* ================= РАСПИСАНИЕ (дневник) ================= */
  const GRADE_TEXT = {
    5: ['🏆 Молодец! Отличная оценка! 🎉', 'hi'],
    4: ['🎉 Молодец! Очень хорошо! ⭐', 'hi'],
    3: ['🙂 Неплохо! Стараниями добьёшься большего 💪', 'mid'],
    2: ['💪 Ничего! Надо постараться — и получится! 🌱', 'low']
  };
  function pickGrade(row) {
    HT.openModal(`
      <div class="m-title">Оценка за урок <button class="m-close">✕</button></div>
      <div class="grade-pick">
        <button class="g5" data-g="5">5</button>
        <button class="g4" data-g="4">4</button>
        <button class="g3" data-g="3">3</button>
        <button class="g2" data-g="2">2</button>
        <button class="g0" data-g="0">нет</button>
      </div>
      <p class="tiny" style="text-align:center;margin-top:12px">5 и 4 — «Молодец!», 3 — «Неплохо», 2 — «Постараться» 🌟</p>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = HT.closeModal;
    box.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const g = Number(b.dataset.g);
      if (g) row.grade = g; else delete row.grade;
      save();
      HT.closeModal();
      renderRows();
      if (g) {
        const [msg, lvl] = GRADE_TEXT[g];
        HT.celebrate(msg, lvl);
      }
    });
  }

  function renderChips() {
    const wrap = document.getElementById('sched-days');
    wrap.innerHTML = '';
    for (let i = 1; i <= 7; i++) {
      const b = document.createElement('button');
      b.className = 'day-chip' + (i === day ? ' active' : '');
      b.textContent = CHIPS[i];
      b.title = DAYS[i];
      b.onclick = () => { day = i; renderChips(); renderRows(); document.getElementById('hdr-sub').textContent = DAYS[day]; };
      wrap.appendChild(b);
    }
  }

  function renderRows() {
    const wrap = document.getElementById('sched-list');
    const rows = data[day] || [];
    wrap.innerHTML = '';
    rows.forEach((r, idx) => {
      const el = document.createElement('div');
      el.className = 'diary-row';
      const g = r.grade;
      el.innerHTML = `
        <div class="cell num d-num" contenteditable="true" data-f="n">${r.n || ''}</div>
        <div class="cell d-subj" contenteditable="true" data-f="subj" data-ph="Предмет">${r.subj || ''}</div>
        <div class="cell d-hw hw" contenteditable="true" data-f="hw" data-ph="Домашнее задание">${r.hw || ''}</div>
        <button class="grade-cell ${g ? 'set g' + g : ''}" title="Поставить оценку">${g || '—'}</button>
        <button class="row-del" title="Удалить урок">✕</button>`;

      el.querySelectorAll('[contenteditable]').forEach(c => {
        c.addEventListener('input', () => {
          rows[idx][c.dataset.f] = c.textContent;
          save();
        });
      });
      el.querySelector('.grade-cell').onclick = () => pickGrade(rows[idx]);
      el.querySelector('.row-del').onclick = () => {
        if (!confirm('Удалить урок?')) return;
        rows.splice(idx, 1);
        save(); renderRows();
      };
      wrap.appendChild(el);
    });
    document.getElementById('sched-hint').classList.toggle('hidden', rows.length > 0);
  }

  document.getElementById('btn-add-row').onclick = () => {
    if (!data[day]) data[day] = [];
    const nums = data[day].map(r => Number(r.n) || 0);
    data[day].push({ n: String((nums.length ? Math.max(...nums) : 0) + 1), subj: '', hw: '' });
    save(); renderRows();
    const cells = document.querySelectorAll('#sched-list .diary-row');
    const last = cells[cells.length - 1];
    if (last) last.querySelectorAll('[contenteditable]')[1].focus();
  };

  HT.onShow['tab-schedule'] = () => {
    habits = HT.get('habits', []);
    if (view === 'month') renderMonth();
    else if (view === 'cycle') { renderCycle(); maybeOnboard(); }
    else { renderChips(); renderRows(); }
  };
  renderChips();
  renderRows();
})();
