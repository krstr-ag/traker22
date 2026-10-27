/* ===== ПЛАНЫ НА ДЕНЬ (задачи с группами + заметки + неделя) ===== */
(() => {
  const KEY = 'plans';
  let plans = HT.get(KEY, {});
  let groups = HT.get('taskGroups', null) || ['Учёба', 'Дом', 'Спорт', 'Личное'];
  let dayNotes = HT.get('dayNotes', {});

  /* миграция: раньше значение по дате было строкой HTML */
  Object.keys(plans).forEach(k => {
    if (typeof plans[k] === 'string') plans[k] = { tasks: [], html: plans[k] };
    if (!plans[k].tasks) plans[k].tasks = [];
    if (plans[k].html == null) plans[k].html = '';
    plans[k].tasks.forEach(t => { if (t.grp == null) t.grp = ''; });
    /* заметки к дню переезжают в отдельное хранилище — не путаем с планами */
    if (plans[k].html && !dayNotes[k]) dayNotes[k] = plans[k].html;
    plans[k].html = '';
  });
  HT.set('dayNotes', dayNotes);

  let cur = new Date();
  cur.setHours(0, 0, 0, 0);
  let newGrp = '';      // группа для новой задачи
  let filterGrp = '';   // фильтр списка ('' = все)

  const daynoteCard = document.getElementById('daynote-card');
  const label = document.getElementById('plan-date-label');
  const dateInput = document.getElementById('plan-date-input');
  const taskInput = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  const grpChips = document.getElementById('task-grp-chips');
  const filterBox = document.getElementById('task-filter');
  let saveT, view = 'day';

  function key() { return HT.dkey(cur); }
  function entry(k = key()) {
    if (!plans[k]) plans[k] = { tasks: [], html: '' };
    return plans[k];
  }
  const saveGroups = () => HT.set('taskGroups', groups);

  /* заметки к дню теперь живут отдельно — в «Заметках» (LiteWriter) */
  function saveNow() {}

  /* ---------- чипы групп ---------- */
  function renderGrpChips() {
    grpChips.innerHTML =
      `<button class="grp-chip ${newGrp === '' ? 'sel' : ''}" data-g="">Без группы</button>` +
      groups.map(g => `<button class="grp-chip ${newGrp === g ? 'sel' : ''}" data-g="${g}">${g}</button>`).join('') +
      `<button class="grp-chip" data-new="1">＋ своя</button>`;
    grpChips.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      newGrp = b.dataset.g;
      renderGrpChips();
    });
    grpChips.querySelector('[data-new]').onclick = () => {
      const name = prompt('Название группы (например: Школа, Творчество…):');
      if (!name || !name.trim()) return;
      const g = name.trim().slice(0, 20);
      if (!groups.includes(g)) { groups.push(g); saveGroups(); }
      newGrp = g;
      renderGrpChips();
      HT.toast(`📁 Группа «${g}» добавлена`);
    };
  }

  function renderFilter() {
    const used = new Set();
    entry().tasks.forEach(t => { if (t.grp) used.add(t.grp); });
    const list = groups.filter(g => used.has(g));
    if (!list.length) { filterBox.innerHTML = ''; filterGrp = ''; return; }
    filterBox.innerHTML =
      `<button class="grp-chip ${filterGrp === '' ? 'sel' : ''}" data-f="">Все</button>` +
      list.map(g => `<button class="grp-chip ${filterGrp === g ? 'sel' : ''}" data-f="${g}">${g}</button>`).join('');
    filterBox.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
      filterGrp = b.dataset.f;
      renderFilter(); renderTasks();
    });
  }

  /* ---------- задачи ---------- */
  function renderTasks() {
    const e = entry();
    taskList.innerHTML = '';
    const shown = e.tasks.filter(t => !filterGrp || t.grp === filterGrp);
    if (!shown.length) {
      taskList.innerHTML = `<div class="task-empty">${e.tasks.length ? 'В этой группе задач нет' : 'Задач пока нет — напишите выше и нажмите «+ Добавить» ✎'}</div>`;
      renderFilter();
      return;
    }
    shown.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'task-item' + (t.done ? ' done' : '');
      el.innerHTML = `
        <span class="task-num">${i + 1}</span>
        <input type="checkbox" ${t.done ? 'checked' : ''}>
        <div class="task-text"></div>
        ${t.grp ? `<span class="task-grp">${t.grp}</span>` : ''}
        <button class="task-del" title="Удалить задачу">✕</button>`;
      el.querySelector('.task-text').textContent = t.text;
      el.querySelector('input').onchange = ev => {
        t.done = ev.target.checked;
        HT.set(KEY, plans);
        renderTasks();
        if (t.done) HT.celebrate('✅ Задача выполнена! Молодец! 🎉', 'hi');
      };
      el.querySelector('.task-del').onclick = () => {
        e.tasks = e.tasks.filter(x => x.id !== t.id);
        HT.set(KEY, plans);
        renderTasks();
        HT.toast('🗑 Задача удалена');
      };
      taskList.appendChild(el);
    });
    renderFilter();
  }

  function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    entry().tasks.push({ id: HT.uid(), text, done: false, grp: newGrp });
    HT.set(KEY, plans);
    taskInput.value = '';
    renderTasks();
    taskInput.focus();
  }
  document.getElementById('task-add').onclick = addTask;
  taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  /* ---------- навигация по дням ---------- */
  function loadDate() {
    plans = HT.get(KEY, plans);
    dayNotes = HT.get('dayNotes', dayNotes);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((cur - t) / 864e5);
    label.textContent = diff === 0 ? 'Сегодня' : diff === -1 ? 'Вчера' : diff === 1 ? 'Завтра' : HT.fmtRu(cur);
    dateInput.value = key();
    renderTasks();
    renderDayNote();
  }

  /* карточка «Заметка к дню» — отдельная от планов, открывается в Заметках */
  function renderDayNote() {
    if (!daynoteCard) return;
    dayNotes = HT.get('dayNotes', dayNotes);
    const raw = dayNotes[key()] || '';
    const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) {
      daynoteCard.innerHTML = `
        <div class="daynote-preview">
          <div class="daynote-date">${HT.fmtRu(cur)}</div>
          <div class="daynote-text"></div>
          <span class="daynote-open">Открыть заметку →</span>
        </div>`;
      daynoteCard.querySelector('.daynote-text').textContent =
        text.slice(0, 180) + (text.length > 180 ? '…' : '');
    } else {
      daynoteCard.innerHTML = `
        <button class="daynote-empty" id="daynote-add">
          <svg class="ic" viewBox="0 0 24 24"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/><path d="M14 6.5l3.5 3.5"/></svg>
          <span><b>Добавить заметку к дню</b><i>откроется редактор — заметки хранятся отдельно от планов</i></span>
        </button>`;
    }
    /* премиальная анимация: лист карточки разворачивается во весь экран */
    daynoteCard.onclick = () => {
      const src = daynoteCard.firstElementChild || daynoteCard;
      if (HT.flipOpen) HT.flipOpen(src, () => HT.openDayNote(key()));
      else HT.openDayNote(key());
    };
  }

  function step(n) {
    saveNow();
    cur = HT.addDays(cur, n);
    loadDate();
  }

  document.getElementById('plan-prev').onclick = () => step(-1);
  document.getElementById('plan-next').onclick = () => step(1);
  dateInput.onchange = () => {
    if (!dateInput.value) return;
    saveNow();
    const [y, m, d] = dateInput.value.split('-').map(Number);
    cur = new Date(y, m - 1, d);
    loadDate();
  };

  /* переход из календаря */
  window.__plansGoToDate = k => {
    saveNow();
    const [y, m, d] = k.split('-').map(Number);
    cur = new Date(y, m - 1, d);
    if (view !== 'day') setView('day');
    loadDate();
  };

  /* ---------- вид День | Неделя | Заметки ---------- */
  const segBtns = document.querySelectorAll('#plan-seg button');
  function setView(v) {
    if (v === 'notes') { HT.showTab('tab-notes'); return; }
    view = v;
    segBtns.forEach(b => b.classList.toggle('active', b.dataset.pview === v));
    document.getElementById('plan-dayview').classList.toggle('hidden', v !== 'day');
    document.getElementById('plan-weekview').classList.toggle('hidden', v !== 'week');
    if (v === 'week') renderWeek();
  }
  segBtns.forEach(b => b.onclick = () => setView(b.dataset.pview));
  window.__plansSetView = setView;

  /* вкладка «Заметки»: сег ведёт обратно в планы */
  document.querySelectorAll('#pn-seg2 button').forEach(b => b.onclick = () => {
    const v = b.dataset.pv2;
    if (v === 'notes') return;
    HT.showTab('tab-plans');
    setView(v);
  });

  function weekStart(d) {
    const x = new Date(d);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function renderWeek() {
    const wrap = document.getElementById('plan-weekview');
    const ws = weekStart(cur);
    const todayK = HT.dkey();
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = HT.addDays(ws, i);
      const k = HT.dkey(d);
      const e = plans[k] || { tasks: [], html: '' };
      const tasks = e.tasks || [];
      const body = tasks.length
        ? tasks.map(t => `<div class="wd-task ${t.done ? 'done' : ''}"><span class="wd-dot">${t.done ? '☑' : '☐'}</span><span>${esc(t.text)}</span>${t.grp ? `<span class="task-grp">${t.grp}</span>` : ''}</div>`).join('')
        : '<div class="wd-none">нет задач</div>';
      html += `
        <div class="week-day ${k === todayK ? 'today' : ''}" data-goday="${k}">
          <h4><span>${dowName(d)}</span><span class="wd-date">${d.getDate()} ${HT.RU_MONTHS[d.getMonth()]}</span></h4>
          ${body}
        </div>`;
    }
    wrap.innerHTML = html + `<button class="btn-primary wide" id="pw-today" style="margin-top:6px">К сегодняшнему дню</button>`;
    document.getElementById('pw-today').onclick = () => {
      cur = new Date(); cur.setHours(0, 0, 0, 0);
      setView('day'); loadDate();
    };
    wrap.querySelectorAll('[data-goday]').forEach(el => el.onclick = () => {
      const [y, m, d] = el.dataset.goday.split('-').map(Number);
      cur = new Date(y, m - 1, d);
      setView('day'); loadDate();
    });
  }

  function dowName(d) {
    return ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'][d.getDay()];
  }
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* напоминание о планах дня */
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 9 && now.getMinutes() === 0) {
      const e = plans[HT.dkey()];
      const hasText = e && ((e.html || '').replace(/<[^>]*>/g, '').trim().length > 0 || (e.tasks || []).length);
      if (hasText) HT.notify('🗒 Планы на день', 'Откройте планы и начните день по списку!');
    }
  }, 60000);

  HT.onShow['tab-plans'] = () => {
    plans = HT.get(KEY, plans);
    if (view === 'day') loadDate(); else renderWeek();
    document.getElementById('hdr-sub').textContent = '';
  };
  renderGrpChips();
  loadDate();
})();
