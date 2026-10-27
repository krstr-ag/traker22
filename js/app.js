/* Помощник — вся логика приложения */

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

/* ---------- Дата в шапке ---------- */
const dateEl = document.getElementById('today-date');
const now = new Date();
dateEl.textContent = now.toLocaleDateString('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long'
});

/* ---------- Переключение вкладок ---------- */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

/* ---------- Универсальный список (задачи + покупки) ---------- */
function createList({ formId, inputId, listId, hintId, storageKey, clearBtnId }) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  const hint = document.getElementById(hintId);
  const clearBtn = clearBtnId ? document.getElementById(clearBtnId) : null;
  let items = store.get(storageKey, []);

  function save() { store.set(storageKey, items); }

  function render() {
    list.innerHTML = '';
    items.forEach((item, i) => {
      const li = document.createElement('li');
      if (item.done) li.classList.add('done');

      const check = document.createElement('button');
      check.className = 'item-check';
      check.textContent = '✓';
      check.onclick = () => { items[i].done = !items[i].done; save(); render(); };

      const text = document.createElement('span');
      text.className = 'item-text';
      text.textContent = item.text;

      const del = document.createElement('button');
      del.className = 'item-delete';
      del.textContent = '✕';
      del.onclick = () => { items.splice(i, 1); save(); render(); };

      li.append(check, text, del);
      list.appendChild(li);
    });

    hint.classList.toggle('hidden', items.length > 0);
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !items.some(x => x.done));
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    items.unshift({ text, done: false });
    input.value = '';
    save();
    render();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      items = items.filter(x => !x.done);
      save();
      render();
    });
  }

  render();
  return { render };
}

createList({
  formId: 'task-form', inputId: 'task-input', listId: 'task-list',
  hintId: 'task-hint', storageKey: 'helper_tasks'
});

createList({
  formId: 'shop-form', inputId: 'shop-input', listId: 'shop-list',
  hintId: 'shop-hint', storageKey: 'helper_shop', clearBtnId: 'shop-clear'
});

/* ---------- Заметки (автосохранение) ---------- */
const notesArea = document.getElementById('notes-area');
const notesStatus = document.getElementById('notes-status');
notesArea.value = store.get('helper_notes', '');

let saveTimer;
notesArea.addEventListener('input', () => {
  notesStatus.textContent = 'Сохраняется…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    store.set('helper_notes', notesArea.value);
    notesStatus.textContent = 'Сохранено ✓';
  }, 400);
});

/* ---------- Таймер ---------- */
const timerDisplay = document.getElementById('timer-display');
const timerBar = document.getElementById('timer-bar');
const timerStartBtn = document.getElementById('timer-start');
const timerResetBtn = document.getElementById('timer-reset');

let totalSeconds = 25 * 60;
let remaining = totalSeconds;
let ticking = null;

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function renderTimer() {
  timerDisplay.textContent = fmt(remaining);
  const progress = 1 - remaining / totalSeconds;
  timerBar.style.width = (progress * 100) + '%';
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
  } catch {}
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

function stopTimer() {
  clearInterval(ticking);
  ticking = null;
  timerStartBtn.textContent = 'Старт';
}

timerStartBtn.addEventListener('click', () => {
  if (ticking) { stopTimer(); return; }
  timerStartBtn.textContent = 'Пауза';
  ticking = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      remaining = 0;
      renderTimer();
      stopTimer();
      timerStartBtn.textContent = 'Заново';
      beep();
      return;
    }
    renderTimer();
  }, 1000);
});

timerResetBtn.addEventListener('click', () => {
  stopTimer();
  remaining = totalSeconds;
  renderTimer();
});

document.querySelectorAll('#timer-presets .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#timer-presets .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    stopTimer();
    totalSeconds = Number(chip.dataset.min) * 60;
    remaining = totalSeconds;
    renderTimer();
  });
});

renderTimer();

/* ---------- Калькулятор ---------- */
const calcPrevious = document.getElementById('calc-previous');
const calcCurrent = document.getElementById('calc-current');

let cur = '0';       // текущее число (строка)
let prev = null;     // сохранённое число
let op = null;       // операция
let justEvaluated = false;

function show() {
  calcCurrent.textContent = cur.replace('.', ',');
  calcPrevious.textContent = prev === null ? '' :
    `${String(prev).replace('.', ',')} ${{ '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || ''}`;
}

function compute(a, b, operation) {
  switch (operation) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : a / b;
  }
  return b;
}

function digit(d) {
  if (justEvaluated) { cur = '0'; justEvaluated = false; }
  if (d === ',') {
    if (cur.includes('.')) return;
    cur += '.';
  } else {
    if (cur === '0') cur = d;
    else if (cur.replace('-', '').replace('.', '').length < 12) cur += d;
  }
  show();
}

function setOperation(nextOp) {
  const value = parseFloat(cur);
  if (prev !== null && op && !justEvaluated) {
    const result = compute(prev, value, op);
    prev = result;
    cur = String(result);
  } else {
    prev = value;
  }
  op = nextOp;
  justEvaluated = true;
  cur = '0';
  show();
  // показываем выражение сразу
  calcCurrent.textContent = '0';
}

function equals() {
  if (op === null || prev === null) return;
  const value = parseFloat(cur);
  const result = compute(prev, value, op);
  calcPrevious.textContent = `${String(prev).replace('.', ',')} ${{ '+': '+', '-': '−', '*': '×', '/': '÷' }[op]} ${String(value).replace('.', ',')} =`;
  const r = Math.round(result * 1e10) / 1e10;
  cur = isNaN(r) ? 'Ошибка' : String(r);
  prev = null;
  op = null;
  justEvaluated = true;
  calcCurrent.textContent = cur.replace('.', ',');
}

function clearAll() { cur = '0'; prev = null; op = null; justEvaluated = false; show(); }

function backspace() {
  if (justEvaluated) return;
  cur = cur.length > 1 ? cur.slice(0, -1) : '0';
  if (cur === '-') cur = '0';
  show();
}

function negate() {
  if (cur === '0' || cur === 'Ошибка') return;
  cur = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
  show();
}

function percent() {
  if (prev !== null && op) {
    cur = String(prev * parseFloat(cur) / 100);
  } else {
    cur = String(parseFloat(cur) / 100);
  }
  show();
}

document.getElementById('calc-grid').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.digit !== undefined) digit(btn.dataset.digit);
  else if (btn.dataset.op) setOperation(btn.dataset.op);
  else if (btn.dataset.action === 'equals') equals();
  else if (btn.dataset.action === 'clear') clearAll();
  else if (btn.dataset.action === 'backspace') backspace();
  else if (btn.dataset.action === 'negate') negate();
  else if (btn.dataset.action === 'percent') percent();
});

show();

/* ---------- Сервис-воркер (офлайн-режим + установка) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
