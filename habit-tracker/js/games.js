/* ===== ИГРЫ: память, реакция, математика, судоку, морской бой, слова, карточки, 2048 ===== */
(() => {
  const escS = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const DEF = { memory: null, reaction: null, g2048: null, words: 0, math: 0, sudoku: null, sea: 0, cards: 0 };
  let scores = HT.get('scores', {});
  Object.keys(DEF).forEach(k => { if (scores[k] === undefined) scores[k] = DEF[k]; });
  const saveScores = () => HT.set('scores', scores);

  const BEST = {
    memory: s => s ? `${s} ходов` : 'не пройдено',
    reaction: s => s ? `${s} мс` : 'не пройдено',
    '2048': s => s ? `${s}` : 'нет рекорда',
    words: s => s ? `${s} слов` : 'нет рекорда',
    math: s => s ? `${s}/10` : 'нет рекорда',
    sudoku: s => s ? `решено: ${s}` : 'не решено',
    sea: s => {
      if (s && typeof s === 'object') {
        if (s.shots) return `${s.shots} выстр. · ${s.acc}%`;
        return s.wins ? `побед: ${s.wins}` : 'нет побед';
      }
      return s ? `побед: ${s}` : 'нет побед';
    },
    cards: s => s ? `повторено: ${s}` : 'нет данных'
  };

  function renderBests() {
    Object.keys(BEST).forEach(k => {
      const el = document.getElementById('best-' + k);
      if (el) el.textContent = BEST[k](scores[k]);
    });
    const hint = document.querySelector('#tab-games .empty-hint');
    if (hint) hint.textContent =
      'Восемь игр с уровнями и рекордами: память, реакция, математика, судоку, морской бой 10×10 против умного ИИ, анаграммы, флеш-карточки с готовыми наборами и 2048. Победы приносят награды!';
  }

  const open = html => HT.openModal(html);
  const close = () => HT.closeModal();
  const head = t => `<div class="m-title">${t} <button class="m-close">✕</button></div>`;
  const bindClose = () => {
    const b = document.getElementById('modal-box');
    if (b) b.querySelector('.m-close').onclick = close;
  };
  /* закрытие с доп. действием (остановка таймеров) */
  const bindCloseX = fn => {
    const b = document.getElementById('modal-box');
    if (b) b.querySelector('.m-close').onclick = () => { try { fn && fn(); } catch (e) {} close(); };
  };
  const hit = () => { try { HT.rewards && HT.rewards.gameHit && HT.rewards.gameHit(); } catch (e) {} };

  /* общая кнопка «пригласить друга» (офлайн-приглашение: копируем ссылку) */
  function inviteBtn(game) {
    return `<button class="btn-ghost wide" id="invite-friend">Пригласить друга играть</button>
      <p class="tiny" id="invite-note" style="text-align:center"></p>`;
  }
  function bindInvite(game) {
    const b = document.getElementById('invite-friend');
    if (!b) return;
    b.onclick = () => {
      const link = `https://treker.app/play/${game}-${Math.random().toString(36).slice(2, 8)}`;
      const done = () => {
        const n = document.getElementById('invite-note');
        if (n) n.textContent = 'Ссылка скопирована — другу останется открыть её.';
        HT.toast('Приглашение скопировано');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(done).catch(() => HT.toast('Ссылка: ' + link));
      } else HT.toast('Ссылка: ' + link);
    };
  }

  /* ================= 1. ПАМЯТЬ (наборы + уровни) ================= */
  const MEM_SETS = [
    { id: 'nature', n: 'Природа', e: ['🌿', '🍁', '🌊', '🌙', '☀️', '🍀', '🌵', '🌈', '⭐', '🍄', '🌻', '🏔️'] },
    { id: 'animals', n: 'Звери', e: ['🐱', '🦊', '🐼', '🐸', '🦉', '🐢', '🐬', '🦢', '🦋', '🐝', '🐿️', '🐨'] },
    { id: 'food', n: 'Вкусности', e: ['🍓', '🥑', '🍪', '🍋', '🍇', '🥕', '🍯', '🥝', '🥐', '🍒', '🧁', '🍫'] },
    { id: 'space', n: 'Космос', e: ['🪐', '🚀', '☄️', '🌍', '🛸', '🌑', '🔭', '✨', '🌌', '🛰️', '🌕', '🌠'] },
    { id: 'city', n: 'Город', e: ['🚲', '🚌', '🚦', '🏙️', '🚇', '🌉', '🏪', '🚕', '🚉', '🛵', '🎡', '🗺️'] }
  ];
  const MEM_LEVELS = [
    { id: 'easy', n: 'Легко', pairs: 6, cols: 4 },
    { id: 'normal', n: 'Средне', pairs: 8, cols: 4 },
    { id: 'hard', n: 'Сложно', pairs: 10, cols: 5 },
    { id: 'expert', n: 'Эксперт', pairs: 12, cols: 6 }
  ];
  let memSet = 0, memLvl = 1;

  function memory() {
    const lvl = MEM_LEVELS[memLvl];
    const set = MEM_SETS[memSet];
    const deck = [...set.e.slice(0, lvl.pairs), ...set.e.slice(0, lvl.pairs)]
      .map(e => ({ e, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x, i) => ({ e: x.e, i }));
    let flipped = [], matched = 0, moves = 0, lock = false, secs = 0;

    open(`${head('Память — найди пары')}
      <div class="lvl-chips" id="mem-sets">${MEM_SETS.map((s, i) =>
        `<button class="lvl-chip ${i === memSet ? 'sel' : ''}" data-s="${i}">${s.n}</button>`).join('')}</div>
      <div class="lvl-chips" id="mem-lvls">${MEM_LEVELS.map((l, i) =>
        `<button class="lvl-chip ${i === memLvl ? 'sel' : ''}" data-l="${i}">${l.n}</button>`).join('')}</div>
      <div class="g-stats" id="mem-stats">
        <div class="g-stat"><b id="mem-moves">0</b><span>ходы</span></div>
        <div class="g-stat"><b id="mem-found">0</b><span>пар из ${lvl.pairs}</span></div>
        <div class="g-stat"><b id="mem-time">0:00</b><span>время</span></div>
      </div>
      <div class="game-area"><div class="mem-grid" id="mem-grid" style="grid-template-columns:repeat(${lvl.cols},1fr)">
        ${deck.map(d => `<button class="mem-card" data-i="${d.i}" data-e="${d.e}">
          <span class="mem-face mem-back"></span><span class="mem-face mem-front">${d.e}</span></button>`).join('')}
      </div></div>`);
    bindCloseX(() => { clearInterval(tick); });

    const tick = setInterval(() => {
      const t = document.getElementById('mem-time');
      if (!t) return clearInterval(tick);
      secs++;
      t.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    }, 1000);

    const box = document.getElementById('modal-box');
    box.querySelectorAll('#mem-sets [data-s]').forEach(b => b.onclick = () => {
      clearInterval(tick); memSet = Number(b.dataset.s); memory();
    });
    box.querySelectorAll('#mem-lvls [data-l]').forEach(b => b.onclick = () => {
      clearInterval(tick); memLvl = Number(b.dataset.l); memory();
    });

    document.getElementById('mem-grid').onclick = e => {
      const c = e.target.closest('.mem-card');
      if (!c || lock || c.classList.contains('flipped') || c.classList.contains('matched')) return;
      c.classList.add('flipped');
      flipped.push(c);
      if (flipped.length === 2) {
        moves++;
        document.getElementById('mem-moves').textContent = moves;
        const [a, b] = flipped;
        if (a.dataset.e === b.dataset.e) {
          a.classList.add('matched'); b.classList.add('matched');
          flipped = [];
          matched++;
          document.getElementById('mem-found').textContent = matched;
          if (matched === lvl.pairs) {
            clearInterval(tick);
            const key = 'mem-' + lvl.id;
            const rec = scores[key] === undefined || scores[key] === null || moves < scores[key];
            if (rec) { scores[key] = moves; saveScores(); renderBests(); }
            if (scores.memory === null || scores.memory === undefined || moves < scores.memory) {
              scores.memory = moves; saveScores(); renderBests();
            }
            hit();
            HT.celebrate(rec ? `Новый рекорд: ${moves} ходов!` : `Память пройдена за ${moves} ходов`, rec ? 'hi' : 'mid');
          }
        } else {
          lock = true;
          setTimeout(() => {
            a.classList.remove('flipped'); b.classList.remove('flipped');
            flipped = []; lock = false;
          }, 700);
        }
      }
    };
  }

  /* ================= 2. РЕАКЦИЯ (режимы + уровни) ================= */
  const REACT_MODES = [
    { id: 'simple', n: 'Обычный', hint: 'Жми, как только станет зелёным' },
    { id: 'colors', n: 'Цвета', hint: 'Нажми ТОЛЬКО зелёный цвет из четырёх' },
    { id: 'numbers', n: 'Числа', hint: 'Жми, когда число станет 7' }
  ];
  const REACT_LVLS = [
    { n: 'Легко', min: 1200, max: 4200 },
    { n: 'Средне', min: 900, max: 3200 },
    { n: 'Сложно', min: 600, max: 2400 },
    { n: 'Эксперт', min: 380, max: 1700 }
  ];
  const REACT_ROUNDS = 5;
  let reactMode = 0, reactLvl = 1;

  function reaction() {
    const mode = REACT_MODES[reactMode];
    let state = 'idle', t0 = 0, timer, results = [], round = 0, target = 0, shown = '';

    open(`${head('Тест реакции')}
      <div class="lvl-chips" id="rx-modes">${REACT_MODES.map((m, i) =>
        `<button class="lvl-chip ${i === reactMode ? 'sel' : ''}" data-m="${i}">${m.n}</button>`).join('')}</div>
      <div class="lvl-chips" id="rx-lvls">${REACT_LVLS.map((m, i) =>
        `<button class="lvl-chip ${i === reactLvl ? 'sel' : ''}" data-v="${i}">${m.n}</button>`).join('')}</div>
      <p class="tiny" id="rx-hint">${mode.hint} · попытка <b id="rx-round">0</b>/${REACT_ROUNDS} · лучшая: <b>${scores.reaction ? scores.reaction + ' мс' : '—'}</b></p>
      <div class="game-area">
        <div class="react-zone" id="rz">Нажмите «Старт»</div>
        <div class="react-colors hidden" id="rx-colors"></div>
      </div>
      <div class="m-row" style="margin-top:10px">
        <button class="btn-primary" id="rz-start">Старт</button>
        <button class="btn-ghost" id="rz-reset" style="margin:0">Сброс</button>
      </div>`);
    bindCloseX(() => clearTimeout(timer));

    const box = document.getElementById('modal-box');
    const z = document.getElementById('rz');
    box.querySelectorAll('#rx-modes [data-m]').forEach(b => b.onclick = () => { clearTimeout(timer); reactMode = Number(b.dataset.m); close(); reaction(); });
    box.querySelectorAll('#rx-lvls [data-v]').forEach(b => b.onclick = () => { clearTimeout(timer); reactLvl = Number(b.dataset.v); close(); reaction(); });

    const COLORS = [['Зелёный', '#7A8B6F'], ['Красный', '#C4693F'], ['Синий', '#5F7D8B'], ['Жёлтый', '#D9A93F']];

    function newRound() {
      round++;
      const rEl = document.getElementById('rx-round');
      if (rEl) rEl.textContent = round;
      const waitMin = REACT_LVLS[reactLvl].min;
      const waitMax = REACT_LVLS[reactLvl].max;
      state = 'wait';
      z.className = 'react-zone wait';
      z.textContent = 'Ждите… не жмите!';

      if (mode.id === 'colors') {
        z.textContent = 'Выберите зелёный цвет!';
        const pick = COLORS.slice().sort(() => Math.random() - .5);
        const row = document.getElementById('rx-colors');
        row.classList.remove('hidden');
        row.innerHTML = pick.map(c => `<button data-c="${c[0]}" style="background:${c[1]};color:#fff">${c[0]}</button>`).join('');
        state = 'readyColor';
        t0 = performance.now();
        row.onclick = e => {
          const b = e.target.closest('[data-c]');
          if (!b || state !== 'readyColor') return;
          const ms = Math.round(performance.now() - t0);
          row.classList.add('hidden');
          finish(b.dataset.c === 'Зелёный' ? ms : null);
        };
        return;
      }

      timer = setTimeout(() => {
        state = 'ready';
        z.className = 'react-zone ready';
        if (mode.id === 'numbers') {
          shown = String(Math.floor(Math.random() * 3) + 5);
          z.innerHTML = `Число: <b>${shown}</b>`;
          target = '7';
        } else {
          z.textContent = 'ЖМИ!';
          target = 'ok';
        }
        t0 = performance.now();
      }, waitMin + Math.random() * (waitMax - waitMin));
    }

    function finish(ms) {
      state = 'idle';
      z.className = 'react-zone';
      if (ms === null) {
        z.innerHTML = 'Мимо! Попытка не засчитана';
        round--;
      } else {
        results.push(ms);
        z.innerHTML = `Реакция: <b>${ms} мс</b><br>${ms < 250 ? 'Молния!' : ms < 400 ? 'Отлично!' : ms < 600 ? 'Хорошо' : 'Есть куда расти'}`;
      }
      const rs = results.slice().sort((a, b) => a - b);
      const avg = rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) / rs.length) : 0;
      const best = rs.length ? rs[0] : null;
      if (results.length >= REACT_ROUNDS) {
        hit();
        if (best !== null && (scores.reaction === null || scores.reaction === undefined || best < scores.reaction)) {
          scores.reaction = best; saveScores(); renderBests();
          HT.celebrate(`Новый рекорд реакции: ${best} мс!`, 'hi');
        } else {
          HT.toast(`Итог: лучшая ${best} мс, средняя ${avg} мс`);
        }
        results = []; round = 0;
      } else if (ms !== null) {
        setTimeout(newRound, 900);
      }
    }

    z.onclick = () => {
      if (mode.id === 'colors') return;
      if (state === 'wait') {
        clearTimeout(timer);
        state = 'idle';
        z.className = 'react-zone';
        z.textContent = 'Слишком рано! Ещё раз.';
        round = Math.max(0, round - 1);
      } else if (state === 'ready') {
        const ms = Math.round(performance.now() - t0);
        if (mode.id === 'numbers' && shown !== target) finish(null);
        else finish(ms);
      } else {
        HT.toast('Нажмите «Старт»');
      }
    };

    document.getElementById('rz-start').onclick = () => { results = []; round = 0; newRound(); };
    document.getElementById('rz-reset').onclick = () => {
      clearTimeout(timer); state = 'idle'; results = []; round = 0;
      z.className = 'react-zone'; z.textContent = 'Нажмите «Старт»';
      document.getElementById('rx-colors').classList.add('hidden');
    };
  }

  /* ================= 3. МАТЕМАТИКА (сложность + приглашение) ================= */
  const MATH_LVLS = ['Легко', 'Средне', 'Сложно', 'Эксперт'];
  let mathLvl = 0;

  function math() {
    let score = 0, streak = 0, answer = 0, num = 0;
    const TOTAL = 10;

    const gen = () => {
      const lvl = Math.min(4, mathLvl + 1 + Math.floor(score / 4));
      const ops = lvl === 1 ? ['+', '-'] : lvl === 2 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b;
      const big = lvl >= 4;
      if (op === '×') {
        a = (big ? 6 : 2) + Math.floor(Math.random() * (big ? 10 : 9));
        b = (big ? 6 : 2) + Math.floor(Math.random() * (big ? 10 : 9));
        answer = a * b;
      } else if (op === '÷') {
        b = (big ? 6 : 2) + Math.floor(Math.random() * (big ? 10 : 9));
        answer = (big ? 6 : 2) + Math.floor(Math.random() * (big ? 10 : 9));
        a = b * answer;
      } else {
        a = (big ? 40 : 5) + Math.floor(Math.random() * (big ? 60 : 40));
        b = (big ? 20 : 2) + Math.floor(Math.random() * (big ? 40 : 30));
        if (op === '-' && b > a) { const t = a; a = b; b = t; }
        answer = op === '+' ? a + b : a - b;
      }
      const opts = new Set([answer]);
      let guard = 0;
      while (opts.size < 4 && guard++ < 60) {
        const step = (big ? 3 : 1) + Math.floor(Math.random() * 6);
        const v = answer + step * (Math.random() < .5 ? 1 : -1);
        if (v >= 0) opts.add(v);
      }
      while (opts.size < 4) opts.add(answer + opts.size);
      document.getElementById('math-expr').textContent = `${a} ${op} ${b} = ?`;
      document.getElementById('math-opts').innerHTML = [...opts].sort(() => Math.random() - .5)
        .map(v => `<button data-v="${v}">${v}</button>`).join('');
      document.getElementById('math-head').innerHTML =
        `<div class="g-stat"><b>${score}</b><span>очки</span></div>
         <div class="g-stat"><b>${streak}</b><span>серия</span></div>
         <div class="g-stat"><b>${num}/${TOTAL}</b><span>примеры</span></div>`;
    };

    open(`${head('Математика — быстрый счёт')}
      <div class="lvl-chips" id="math-lvls">${MATH_LVLS.map((n, i) =>
        `<button class="lvl-chip ${i === mathLvl ? 'sel' : ''}" data-v="${i}">${n}</button>`).join('')}</div>
      <div class="math-head" id="math-head"></div>
      <div class="game-area">
        <div class="math-expr" id="math-expr"></div>
        <div class="math-opts" id="math-opts"></div>
      </div>
      <p class="tiny" style="margin-top:10px;text-align:center">10 примеров. Чем длиннее серия — тем сложнее!</p>
      ${inviteBtn('math')}`);
    bindClose();
    bindInvite('math');
    document.querySelectorAll('#math-lvls [data-v]').forEach(b => b.onclick = () => {
      mathLvl = Number(b.dataset.v); close(); math();
    });

    document.getElementById('math-opts').onclick = e => {
      const btn = e.target.closest('[data-v]');
      if (!btn) return;
      num++;
      if (Number(btn.dataset.v) === answer) { score++; streak++; HT.toast('Верно!'); }
      else { streak = 0; HT.toast(`Верный ответ: ${answer}`); }
      if (num >= TOTAL) {
        const rec = score > (scores.math || 0);
        if (rec) { scores.math = score; saveScores(); renderBests(); }
        hit();
        HT.celebrate(rec ? `Новый рекорд: ${score}/${TOTAL}!` : `Итог: ${score}/${TOTAL}`, rec ? 'hi' : 'mid');
        close();
        return;
      }
      gen();
    };
    gen();
  }

  /* ================= 4. СУДОКУ (4 сложности) ================= */
  function genFull() {
    const g = Array.from({ length: 9 }, () => Array(9).fill(0));
    const ok = (r, c, v) => {
      for (let i = 0; i < 9; i++) {
        if (g[r][i] === v) return false;
        if (g[i][c] === v) return false;
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === v) return false;
      return true;
    };
    const fill = (n = 0) => {
      if (n === 81) return true;
      const r = Math.floor(n / 9), c = n % 9;
      if (g[r][c]) return fill(n + 1);
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - .5);
      for (const v of nums) {
        if (ok(r, c, v)) {
          g[r][c] = v;
          if (fill(n + 1)) return true;
          g[r][c] = 0;
        }
      }
      return false;
    };
    fill(0);
    return g;
  }

  const SUD_LEVELS = [
    { id: 'easy', n: 'Лёгкое', holes: 36 },
    { id: 'normal', n: 'Среднее', holes: 46 },
    { id: 'hard', n: 'Сложное', holes: 54 },
    { id: 'expert', n: 'Эксперт', holes: 58 }
  ];
  let sudLvl = 0;

  function sudoku() {
    const full = genFull();
    const puzzle = full.map(r => r.slice());
    const holes = [];
    while (holes.length < SUD_LEVELS[sudLvl].holes) {
      const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
      if (puzzle[r][c]) { puzzle[r][c] = 0; holes.push(r + ',' + c); }
    }
    const given = puzzle.map(r => r.map(v => !!v));
    const work = puzzle.map(r => r.slice());
    let sel = null;

    open(`${head('Судоку')}
      <div class="lvl-chips" id="sud-lvls">${SUD_LEVELS.map((l, i) =>
        `<button class="lvl-chip ${i === sudLvl ? 'sel' : ''}" data-v="${i}">${l.n}</button>`).join('')}</div>
      <div class="sudoku-wrap" id="sud-grid"></div>
      <div class="sud-pad" id="sud-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => `<button data-v="${v}">${v}</button>`).join('')}
        <button class="acc" data-v="0">стирать</button>
      </div>
      <div class="m-row" style="margin-top:10px">
        <button class="btn-ghost" id="sud-new" style="margin:0">Новое поле</button>
        <button class="btn-ghost" id="sud-check" style="margin:0">Проверить</button>
      </div>`);
    bindClose();

    const draw = () => {
      const g = document.getElementById('sud-grid');
      if (!g) return;
      let html = '';
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const v = work[r][c];
        const cls = [
          'sud-c',
          given[r][c] ? 'given' : '',
          sel && sel[0] === r && sel[1] === c ? 'sel' : '',
          (c % 3 === 2 && c !== 8) ? 'b3-c' : '',
          (r % 3 === 2 && r !== 8) ? 'b3-r' : ''
        ].join(' ');
        html += `<button class="${cls}" data-r="${r}" data-c="${c}">${v || ''}</button>`;
      }
      g.innerHTML = html;
    };

    document.getElementById('sud-grid').onclick = e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      sel = [Number(b.dataset.r), Number(b.dataset.c)];
      draw();
    };
    document.getElementById('sud-pad').onclick = e => {
      const b = e.target.closest('[data-v]');
      if (!b || !sel) return HT.toast('Сначала выберите клетку');
      const [r, c] = sel;
      if (given[r][c]) return HT.toast('Эта клетка дана условием');
      work[r][c] = Number(b.dataset.v);
      draw();
      if (work.every((row, i) => row.every((v, j) => v === full[i][j]))) {
        scores.sudoku = (scores.sudoku || 0) + 1;
        saveScores(); renderBests(); hit();
        HT.celebrate(`Судоку решено — уровень «${SUD_LEVELS[sudLvl].n}»`, 'hi');
      }
    };
    document.getElementById('sud-check').onclick = () => {
      let bad = 0, empty = 0;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (!work[r][c]) empty++;
        else if (work[r][c] !== full[r][c]) bad++;
      }
      HT.toast(bad ? `Ошибок: ${bad}` : empty ? `Верно, осталось клеток: ${empty}` : 'Всё верно!');
    };
    document.getElementById('sud-new').onclick = () => { close(); sudoku(); };
    document.querySelectorAll('#sud-lvls [data-v]').forEach(b => b.onclick = () => { sudLvl = Number(b.dataset.v); close(); sudoku(); });

    draw();
  }

  /* ================= 5. МОРСКОЙ БОЙ 10×10 (расстановка + умный ИИ) ================= */
  const SEA_N = 10;
  const SEA_LBL = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];
  const SEA_FLEET = [{ len: 4, n: 1 }, { len: 3, n: 2 }, { len: 2, n: 3 }, { len: 1, n: 4 }];
  let seaToken = 0;

  const zgrid = () => Array.from({ length: SEA_N }, () => Array(SEA_N).fill(0));
  const seaSizes = () => {
    const a = [];
    SEA_FLEET.forEach(f => { for (let i = 0; i < f.n; i++) a.push(f.len); });
    return a;
  };
  const shipMake = (r, c, len, hor) => {
    const cells = [];
    for (let i = 0; i < len; i++) cells.push(hor ? { r, c: c + i } : { r: r + i, c });
    return { r, c, len, hor, cells };
  };
  const fleetOcc = fleet => {
    const g = zgrid();
    fleet.forEach((s, i) => s.cells.forEach(p => { g[p.r][p.c] = i + 1; }));
    return g;
  };
  const canPut = (g, r, c, len, hor) => {
    if (hor && c + len > SEA_N) return false;
    if (!hor && r + len > SEA_N) return false;
    for (let i = 0; i < len; i++) {
      const rr = hor ? r : r + i, cc = hor ? c + i : c;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const ar = rr + dr, ac = cc + dc;
        if (ar < 0 || ac < 0 || ar >= SEA_N || ac >= SEA_N) continue;
        if (g[ar][ac]) return false;
      }
    }
    return true;
  };
  const autoFleet = () => {
    const fleet = [];
    seaSizes().forEach(len => {
      for (let t = 0; t < 3000; t++) {
        const hor = Math.random() < .5;
        const r = Math.floor(Math.random() * SEA_N);
        const c = Math.floor(Math.random() * SEA_N);
        if (canPut(fleetOcc(fleet), r, c, len, hor)) { fleet.push(shipMake(r, c, len, hor)); break; }
      }
    });
    return fleet;
  };
  const shipSunk = (s, shots) => s.cells.every(p => shots[p.r][p.c] === 2);
  const fleetAlive = (fleet, shots) => fleet.filter(s => !shipSunk(s, shots)).length;
  const edgeCls = (s, r, c) => {
    const maxR = s.hor ? s.r : s.r + s.len - 1;
    const maxC = s.hor ? s.c + s.len - 1 : s.c;
    return (r === s.r ? ' out-t' : '') + (r === maxR ? ' out-b' : '') +
           (c === s.c ? ' out-l' : '') + (c === maxC ? ' out-r' : '');
  };

  function seaBoard(grid, shots, fleet, showShips) {
    let h = '<span class="sea-lbl corner"></span>';
    for (let c = 0; c < SEA_N; c++) h += `<span class="sea-lbl">${SEA_LBL[c]}</span>`;
    for (let r = 0; r < SEA_N; r++) {
      h += `<span class="sea-lbl">${r + 1}</span>`;
      for (let c = 0; c < SEA_N; c++) {
        let cls = 'sea-c';
        if ((r + c) % 2) cls += ' alt';
        const v = grid[r][c], s = shots[r][c];
        const sh = v ? fleet[v - 1] : null;
        if (sh && showShips) {
          cls += ' sh';
          if (s === 2) cls += shipSunk(sh, shots) ? ' dead' : ' hit';
          cls += edgeCls(sh, r, c);
        } else if (sh && s === 2) {
          cls += ' sh' + (shipSunk(sh, shots) ? ' dead' : ' hit') + edgeCls(sh, r, c);
        } else if (s === 1) {
          cls += ' miss';
        } else if (s === 2) {
          cls += ' hit';
        }
        h += `<button class="${cls}" data-r="${r}" data-c="${c}" tabindex="-1"></button>`;
      }
    }
    return h;
  }

  const normSea = () => {
    const s = scores.sea;
    if (s && typeof s === 'object') return Object.assign({ wins: 0, shots: null, acc: null }, s);
    return { wins: typeof s === 'number' ? s : 0, shots: null, acc: null };
  };

  /* --- расстановка перед боем --- */
  function seaSetup() {
    const my = ++seaToken;
    let fleet = [], queue = seaSizes(), hor = true;

    const draw = () => {
      if (my !== seaToken) return;
      const mine = document.getElementById('sea-mine');
      if (mine) mine.innerHTML = seaBoard(fleetOcc(fleet), zgrid(), fleet, true);
      const rem = {};
      queue.forEach(l => { rem[l] = (rem[l] || 0) + 1; });
      const fw = document.getElementById('sea-fleet');
      if (fw) fw.innerHTML = SEA_FLEET.map(f => {
        const n = rem[f.len] || 0;
        return `<span class="sea-chip ${n ? '' : 'off'}"><i>${'▮'.repeat(f.len)}</i>×${n}</span>`;
      }).join('');
      const st = document.getElementById('sea-status');
      if (st) st.textContent = queue.length
        ? `Расстановка флота · следующий: ${queue[0]}-палубный`
        : 'Флот готов — начинайте бой';
      const or = document.getElementById('sea-orient');
      if (or) or.textContent = hor ? '↔ горизонтально' : '↕ вертикально';
      const go = document.getElementById('sea-go');
      if (go) go.disabled = queue.length > 0;
    };

    open(`${head('Морской бой — расстановка')}
      <div class="sea-status" id="sea-status"></div>
      <div class="sea-fleet" id="sea-fleet"></div>
      <div class="sea-tools">
        <button class="lvl-chip sel" id="sea-orient"></button>
        <button class="lvl-chip" id="sea-auto">Автоматически</button>
        <button class="lvl-chip" id="sea-clear">Очистить</button>
      </div>
      <div class="sea-wrap">
        <div class="sea-caption">Твой флот · 10 кораблей</div>
        <div class="sea-grid10" id="sea-mine"></div>
      </div>
      <button class="btn-primary wide" id="sea-go" disabled>В бой</button>
      <p class="tiny" style="text-align:center">Тапните клетку — корабль встанет; тапните по кораблю — уберётся. Корабли не касаются даже по диагонали.</p>`);
    bindCloseX(() => { seaToken++; });

    const mine = document.getElementById('sea-mine');
    mine.onclick = e => {
      if (my !== seaToken) return;
      const b = e.target.closest('[data-r]');
      if (!b) return;
      const r = Number(b.dataset.r), c = Number(b.dataset.c);
      const g = fleetOcc(fleet);
      if (g[r][c]) {
        const idx = (() => {
          for (let i = 0; i < fleet.length; i++) if (fleet[i].cells.some(p => p.r === r && p.c === c)) return i;
          return -1;
        })();
        if (idx >= 0) {
          queue.unshift(fleet[idx].len);
          fleet.splice(idx, 1);
          draw();
        }
        return;
      }
      if (!queue.length) return;
      const len = queue[0];
      if (!canPut(g, r, c, len, hor)) return HT.toast('Здесь нельзя: корабли не касаются');
      fleet.push(shipMake(r, c, len, hor));
      queue.shift();
      draw();
    };
    document.getElementById('sea-orient').onclick = () => { hor = !hor; draw(); };
    document.getElementById('sea-auto').onclick = () => { fleet = autoFleet(); queue = []; draw(); };
    document.getElementById('sea-clear').onclick = () => { fleet = []; queue = seaSizes(); draw(); };
    document.getElementById('sea-go').onclick = () => {
      if (queue.length) return;
      seaBattle(fleet.slice());
    };

    draw();
  }

  /* --- бой --- */
  function seaBattle(myFleet) {
    const my = ++seaToken;
    const foeFleet = autoFleet();
    if (myFleet.length < 10 || foeFleet.length < 10) {
      HT.toast('Не удалось расставить флот');
      return seaSetup();
    }
    const myG = fleetOcc(myFleet), foeG = fleetOcc(foeFleet);
    const myShots = zgrid(), foeShots = zgrid(); /* кто и куда стрелял */
    let turn = 'me', over = false, shots = 0, hits = 0, taken = 0;
    let aiHits = [];
    const t0 = Date.now();

    const status = () => {
      const st = document.getElementById('sea-status');
      if (st) {
        st.className = 'sea-status' + (over ? '' : turn === 'me' ? ' me' : ' foe');
        st.textContent = over ? 'Бой окончен'
          : turn === 'me' ? 'Твой ход' : 'Ход противника…';
      }
      const stat = document.getElementById('sea-stat');
      if (stat) stat.innerHTML = `выстрелы <b>${shots}</b> · точность <b>${shots ? Math.round(hits / shots * 100) : 0}%</b>`;
      const ms = document.getElementById('sea-mystat');
      if (ms) ms.innerHTML = `потоплено у тебя: <b>${10 - fleetAlive(myFleet, myShots)}</b>/10 · ходов противника: <b>${taken}</b>`;
    };

    const draw = () => {
      if (my !== seaToken) return false;
      const m = document.getElementById('sea-mine'), f = document.getElementById('sea-foe');
      if (!m || !f) return false;
      m.innerHTML = seaBoard(myG, myShots, myFleet, true);
      f.innerHTML = seaBoard(foeG, foeShots, foeFleet, false);
      status();
      return true;
    };

    const finish = win => {
      over = true;
      turn = 'end';
      const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
      const acc = shots ? Math.round(hits / shots * 100) : 0;
      let record = false;
      if (win) {
        const rec = normSea();
        record = rec.shots === null || rec.shots === undefined || shots < rec.shots;
        rec.wins = (rec.wins || 0) + 1;
        if (record) { rec.shots = shots; rec.acc = acc; }
        scores.sea = rec;
        saveScores(); renderBests(); hit();
        HT.celebrate(`🏆 Победа за ${shots} выстрелов!`, 'hi');
      }
      draw();
      const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      open(`${head(win ? 'Победа' : 'Флот уничтожен')}
        <div class="sea-result">
          <div class="sr-big">${shots}</div>
          <div class="sr-cap">${win ? 'выстрелов до победы' : 'выстрелов сделано'}</div>
          <div class="sr-row">
            <div><b>${hits}</b><span>попаданий</span></div>
            <div><b>${acc}%</b><span>точность</span></div>
            <div><b>${mm}</b><span>время</span></div>
          </div>
          ${record ? '<div class="sr-rec">★ Новый рекорд</div>' : ''}
        </div>
        <button class="btn-primary wide" id="sr-again">Ещё партия</button>
        <button class="btn-ghost wide" id="sr-back" style="margin-top:8px">К играм</button>`);
      bindCloseX(() => { seaToken++; });
      const a = document.getElementById('sr-again');
      if (a) a.onclick = () => seaSetup();
      const b = document.getElementById('sr-back');
      if (b) b.onclick = close;
    };

    /* --- ИИ: после попадания бьёт по соседям, подранка добивает по направлению --- */
    const aiPick = () => {
      if (aiHits.length >= 2) {
        const rows = {}, cols = {};
        aiHits.forEach(p => {
          (rows[p.r] = rows[p.r] || []).push(p.c);
          (cols[p.c] = cols[p.c] || []).push(p.r);
        });
        const tryLine = (list, fixed, hor) => {
          const a = list.slice().sort((x, y) => x - y);
          if (a.length < 2 || a[a.length - 1] - a[0] !== a.length - 1) return null;
          const cand = [];
          if (hor) {
            if (a[0] - 1 >= 0) cand.push([fixed, a[0] - 1]);
            if (a[a.length - 1] + 1 < SEA_N) cand.push([fixed, a[a.length - 1] + 1]);
          } else {
            if (a[0] - 1 >= 0) cand.push([a[0] - 1, fixed]);
            if (a[a.length - 1] + 1 < SEA_N) cand.push([a[a.length - 1] + 1, fixed]);
          }
          const free = cand.filter(p => !myShots[p[0]][p[1]]);
          return free.length ? free[Math.floor(Math.random() * free.length)] : null;
        };
        for (const k in rows) { const p = tryLine(rows[k], Number(k), true); if (p) return p; }
        for (const k in cols) { const p = tryLine(cols[k], Number(k), false); if (p) return p; }
      }
      const nb = [];
      aiHits.forEach(p => [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => {
        const r = p.r + d[0], c = p.c + d[1];
        if (r >= 0 && c >= 0 && r < SEA_N && c < SEA_N && !myShots[r][c]) nb.push([r, c]);
      }));
      if (nb.length) return nb[Math.floor(Math.random() * nb.length)];
      const free = [];
      for (let r = 0; r < SEA_N; r++) for (let c = 0; c < SEA_N; c++) if (!myShots[r][c]) free.push([r, c]);
      const par = free.filter(p => (p[0] + p[1]) % 2 === 0);
      const pool = par.length ? par : free;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const enemyStep = () => {
      if (over || my !== seaToken || !document.getElementById('sea-foe')) return;
      const p = aiPick();
      const r = p[0], c = p[1];
      taken++;
      const hitIt = myG[r][c] !== 0;
      myShots[r][c] = hitIt ? 2 : 1;
      if (!hitIt) {
        turn = 'me';
        draw();
        return;
      }
      aiHits.push({ r, c });
      const idx = myG[r][c];
      const sh = myFleet[idx - 1];
      if (shipSunk(sh, myShots)) aiHits = aiHits.filter(q => myG[q.r][q.c] !== idx);
      if (fleetAlive(myFleet, myShots) === 0) { draw(); finish(false); return; }
      draw();
      setTimeout(enemyStep, 620);
    };

    open(`${head('Морской бой 10×10')}
      <div class="sea-status" id="sea-status"></div>
      <div class="sea-wrap">
        <div class="sea-caption"><span>Поле противника</span><span class="sea-stat" id="sea-stat"></span></div>
        <div class="sea-grid10" id="sea-foe"></div>
      </div>
      <div class="sea-wrap">
        <div class="sea-caption"><span>Твой флот</span><span class="sea-stat" id="sea-mystat"></span></div>
        <div class="sea-grid10" id="sea-mine"></div>
      </div>
      <div class="sea-legend">
        <span><i class="lg miss"></i>мимо</span>
        <span><i class="lg hit"></i>попал</span>
        <span><i class="lg dead"></i>потоплен</span>
      </div>
      <button class="btn-ghost wide" id="sea-new">Новая партия</button>
      ${inviteBtn('sea')}`);
    bindCloseX(() => { seaToken++; });
    bindInvite('sea');

    document.getElementById('sea-foe').onclick = e => {
      if (over || my !== seaToken || turn !== 'me') return;
      const b = e.target.closest('[data-r]');
      if (!b) return;
      const r = Number(b.dataset.r), c = Number(b.dataset.c);
      if (foeShots[r][c]) return HT.toast('Уже стреляли сюда');
      shots++;
      const hitIt = foeG[r][c] !== 0;
      foeShots[r][c] = hitIt ? 2 : 1;
      if (hitIt) {
        hits++;
        draw();
        if (fleetAlive(foeFleet, foeShots) === 0) finish(true);
        return;
      }
      turn = 'foe';
      draw();
      setTimeout(enemyStep, 620);
    };
    document.getElementById('sea-new').onclick = () => seaSetup();

    draw();
  }

  /* ================= 6. СЛОВА (уровни сложности) ================= */
  const WORDS = ['котик', 'лесной', 'солнце', 'кофе', 'книга', 'радуга', 'смех', 'друг', 'мечта', 'закат',
    'снегирь', 'весна', 'утро', 'дорога', 'море', 'гора', 'луна', 'цветок', 'бабочка', 'музыка',
    'история', 'школа', 'деньги', 'время', 'сердце', 'дыхание', 'река', 'птица', 'волна', 'звезда',
    'туман', 'сказка', 'поэзия', 'тишина', 'улыбка', 'счастье', 'привычка', 'победа', 'отражение', 'вдохновение',
    'расписание', 'впечатление', 'воображение', 'путешествие', 'любопытство', 'воспоминание', 'человечество'];
  const WORD_LVLS = [
    { n: 'Легко', min: 4, max: 5 },
    { n: 'Средне', min: 6, max: 7 },
    { n: 'Сложно', min: 8, max: 99 }
  ];
  let wordLvl = 0;

  function words() {
    let score = 0, target = '', letters = [], chosen = [];
    const pool = WORDS.filter(w => w.length >= WORD_LVLS[wordLvl].min && w.length <= WORD_LVLS[wordLvl].max);

    const nextWord = () => {
      target = pool[Math.floor(Math.random() * pool.length)];
      letters = target.split('').sort(() => Math.random() - .5);
      chosen = new Array(target.length).fill('');
      draw();
    };
    const draw = () => {
      const t = document.getElementById('words-target');
      if (!t) return;
      t.textContent = target;
      const sub = document.getElementById('words-sub');
      if (sub) sub.innerHTML = `слово из <b>${target.length}</b> букв · очки <b>${score}</b>`;
      document.getElementById('words-letters').innerHTML = letters.map((l, i) =>
        `<button class="letter-btn" data-l="${i}" ${!l ? 'disabled' : ''}>${l || ''}</button>`).join('');
      document.getElementById('words-answer').innerHTML = chosen.map((c, i) =>
        `<div class="ans-slot" data-slot="${i}">${c || ''}</div>`).join('');
    };
    const check = () => {
      const word = chosen.join('');
      if (word.length < target.length) return HT.toast('Соберите все буквы!');
      if (word === target) {
        score++;
        if (score > (scores.words || 0)) { scores.words = score; saveScores(); renderBests(); }
        hit();
        HT.toast('Верно! +1 очко');
        nextWord();
      } else {
        HT.toast('Не то слово — попробуйте ещё');
        chosen = new Array(target.length).fill('');
        draw();
      }
    };

    open(`${head('Слова — собери анаграмму')}
      <div class="lvl-chips" id="w-lvls">${WORD_LVLS.map((l, i) =>
        `<button class="lvl-chip ${i === wordLvl ? 'sel' : ''}" data-v="${i}">${l.n}</button>`).join('')}</div>
      <p class="tiny" id="words-sub" style="text-align:center"></p>
      <div class="words-word" id="words-target"></div>
      <div class="words-answer" id="words-answer"></div>
      <div class="words-letters" id="words-letters"></div>
      <div class="m-row" style="margin-top:14px">
        <button class="btn-ghost" id="words-clear" style="margin:0">Сброс</button>
        <button class="btn-primary" id="words-check">Проверить</button>
        <button class="btn-ghost" id="words-skip" style="margin:0">Другое</button>
      </div>`);
    bindClose();
    document.querySelectorAll('#w-lvls [data-v]').forEach(b => b.onclick = () => {
      wordLvl = Number(b.dataset.v); close(); words();
    });

    document.getElementById('words-letters').onclick = e => {
      const b = e.target.closest('[data-l]');
      if (!b) return;
      const li = Number(b.dataset.l);
      const slot = chosen.findIndex(c => c === '');
      if (slot < 0) return;
      chosen[slot] = letters[li];
      letters[li] = null;
      draw();
    };
    document.getElementById('words-answer').onclick = e => {
      const s = e.target.closest('[data-slot]');
      if (!s) return;
      const i = Number(s.dataset.slot);
      const ch = chosen[i];
      if (!ch) return;
      const empty = letters.findIndex(l => l === null);
      if (empty >= 0) letters[empty] = ch;
      chosen[i] = '';
      draw();
    };
    document.getElementById('words-check').onclick = check;
    document.getElementById('words-clear').onclick = () => {
      letters = target.split('').sort(() => Math.random() - .5);
      chosen = new Array(target.length).fill('');
      draw();
    };
    document.getElementById('words-skip').onclick = nextWord;

    nextWord();
  }

  /* ================= 7. ФЛЕШ-КАРТОЧКИ (готовые наборы + свои колоды) ================= */
  const PRESETS = [
    {
      id: 'en', name: 'English words', icon: 'Aa', tint: '#C4693F',
      cards: [
        { f: 'cat', b: 'кот' }, { f: 'forest', b: 'лес' }, { f: 'water', b: 'вода' },
        { f: 'friend', b: 'друг' }, { f: 'house', b: 'дом' }, { f: 'book', b: 'книга' },
        { f: 'sun', b: 'солнце' }, { f: 'night', b: 'ночь' }, { f: 'bread', b: 'хлеб' },
        { f: 'city', b: 'город' }, { f: 'school', b: 'школа' }, { f: 'time', b: 'время' },
        { f: 'hand', b: 'рука' }, { f: 'star', b: 'звезда' }, { f: 'road', b: 'дорога' },
        { f: 'happy', b: 'счастливый' }
      ]
    },
    {
      id: 'cap', name: 'Столицы мира', icon: '🌍', tint: '#7A8B6F',
      cards: [
        { f: 'Франция', b: 'Париж' }, { f: 'Германия', b: 'Берлин' }, { f: 'Италия', b: 'Рим' },
        { f: 'Испания', b: 'Мадрид' }, { f: 'Япония', b: 'Токио' }, { f: 'Египет', b: 'Каир' },
        { f: 'Канада', b: 'Оттава' }, { f: 'Австралия', b: 'Канберра' }, { f: 'Бразилия', b: 'Бразилиа' },
        { f: 'Индия', b: 'Нью-Дели' }, { f: 'Китай', b: 'Пекин' }, { f: 'Великобритания', b: 'Лондон' },
        { f: 'Португалия', b: 'Лиссабон' }, { f: 'Швеция', b: 'Стокгольм' }, { f: 'Турция', b: 'Анкара' },
        { f: 'Южная Корея', b: 'Сеул' }
      ]
    },
    {
      id: 'space', name: 'Планеты и космос', icon: '🪐', tint: '#5F7D8B',
      cards: [
        { f: 'Самая большая планета', b: 'Юпитер' },
        { f: 'Планета с кольцами', b: 'Сатурн' },
        { f: 'Красная планета', b: 'Марс' },
        { f: 'Ближайшая к Солнцу', b: 'Меркурий' },
        { f: 'Ледяной гигант', b: 'Нептун' },
        { f: 'Планета-близнец Земли', b: 'Венера' },
        { f: 'Спутник Земли', b: 'Луна' },
        { f: 'Наша галактика', b: 'Млечный Путь' },
        { f: 'Пояс астероидов — между', b: 'Марсом и Юпитером' },
        { f: 'Цвет Марса', b: 'Рыжий' },
        { f: 'Первый человек в космосе', b: 'Юрий Гагарин' },
        { f: 'Экватор Земли', b: '12 742 км' }
      ]
    },
    {
      id: 'hist', name: 'История: даты', icon: '№', tint: '#A9542F',
      cards: [
        { f: '1492', b: 'Открытие Америки' },
        { f: '1240', b: 'Невская битва' },
        { f: '1380', b: 'Куликовская битва' },
        { f: '1453', b: 'Падение Константинополя' },
        { f: '1789', b: 'Взятие Бастилии' },
        { f: '1812', b: 'Отечественная война' },
        { f: '1815', b: 'Ватерлоо' },
        { f: '1861', b: 'Отмена крепостного права' },
        { f: '1905', b: 'Первая русская революция' },
        { f: '1917', b: 'Октябрьская революция' },
        { f: '1945', b: 'Победа во Второй мировой войне' },
        { f: '1961', b: 'Полёт Юрия Гагарина' }
      ]
    }
  ];

  const decks = () => HT.get('decks', []);
  const saveDecks = d => HT.set('decks', d);

  function cards() {
    const list = decks();
    open(`${head('Флеш-карточки')}
      <div class="fc-sec">Готовые наборы</div>
      <div class="fc-presets">
        ${PRESETS.map((p, i) => `
          <div class="fc-preset" data-preset="${i}">
            <div class="fc-cover" style="--cv:${p.tint}"><span>${escS(p.icon)}</span></div>
            <div class="fc-p-name">${escS(p.name)}</div>
            <div class="fc-p-sub">${p.cards.length} карточек</div>
            <button class="btn-primary">Учить</button>
          </div>`).join('')}
      </div>
      <div class="fc-sec">Мои колоды</div>
      ${list.length ? list.map((d, i) => `
        <div class="fc-deck">
          <div class="fc-d-ico" style="--cv:#C4693F">✦</div>
          <div class="fc-d-info">
            <div class="fc-d-name">${escS(d.name)}</div>
            <div class="fc-d-sub">${d.cards.length} карточек${d.known ? ` · повторено ${d.known}` : ''}</div>
          </div>
          <button class="btn-primary" data-study="${i}">Учить</button>
          <button class="btn-ghost" data-del-deck="${i}" style="margin:0;padding:9px 13px">✕</button>
        </div>`).join('')
        : '<p class="empty-hint">Своих колод пока нет — создайте первую: например, «Термины по биологии» или «Глаголы с предлогами».</p>'}
      <button class="btn-primary wide" id="fc-new" style="margin-top:12px">Создать колоду</button>`);
    bindClose();

    document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => study(PRESETS[Number(b.dataset.preset)], null));
    document.querySelectorAll('[data-study]').forEach(b => b.onclick = () => {
      const i = Number(b.dataset.study);
      const d = decks()[i];
      study(d, i);
    });
    document.querySelectorAll('[data-del-deck]').forEach(b => b.onclick = () => {
      const i = Number(b.dataset.delDeck);
      if (!confirm(`Удалить колоду «${list[i].name}»?`)) return;
      const d = decks(); d.splice(i, 1); saveDecks(d); close(); cards();
    });
    document.getElementById('fc-new').onclick = () => newDeck();
  }

  function newDeck() {
    HT.openModal(`
      <div class="m-title">Новая колода <button class="m-close">✕</button></div>
      <div class="m-label">Название колоды</div>
      <input class="field" id="fc-name" placeholder="Например: Английские слова" maxlength="40">
      <div class="m-label">Карточки (вопрос / ответ)</div>
      <div id="fc-rows">
        <div class="fc-row"><input class="field" data-f="front" placeholder="Вопрос"><input class="field" data-f="back" placeholder="Ответ"></div>
        <div class="fc-row"><input class="field" data-f="front" placeholder="Вопрос"><input class="field" data-f="back" placeholder="Ответ"></div>
      </div>
      <button class="btn-ghost wide" id="fc-addrow" style="margin-top:8px">+ ещё карточка</button>
      <button class="btn-primary wide" id="fc-save" style="margin-top:10px">Создать колоду</button>`);
    const box = document.getElementById('modal-box');
    box.querySelector('.m-close').onclick = () => { HT.closeModal(); cards(); };
    box.querySelector('#fc-addrow').onclick = () => {
      const row = document.createElement('div');
      row.className = 'fc-row';
      row.innerHTML = '<input class="field" data-f="front" placeholder="Вопрос"><input class="field" data-f="back" placeholder="Ответ">';
      box.querySelector('#fc-rows').appendChild(row);
    };
    box.querySelector('#fc-save').onclick = () => {
      const name = box.querySelector('#fc-name').value.trim();
      if (!name) return HT.toast('Дайте название колоде');
      const cardsArr = [];
      box.querySelectorAll('#fc-rows .fc-row').forEach(r => {
        const f = r.querySelector('[data-f="front"]').value.trim();
        const b = r.querySelector('[data-f="back"]').value.trim();
        if (f && b) cardsArr.push({ f, b });
      });
      if (!cardsArr.length) return HT.toast('Добавьте хотя бы одну карточку');
      const d = decks();
      d.push({ name, cards: cardsArr, known: 0 });
      saveDecks(d);
      HT.closeModal();
      close();
      cards();
      HT.toast('Колода создана');
    };
  }

  /* учебная сессия: переворот 0.4s, прогресс, «Знаю / Повторить», итог с оценкой */
  function study(deck, deckIdx) {
    if (!deck || !deck.cards || !deck.cards.length) return HT.toast('В колоде нет карточек');
    const total = deck.cards.length;
    let queue = deck.cards.map((c, i) => i).sort(() => Math.random() - .5);
    let pos = 0, known = 0, repeats = 0, flipped = false;

    const saveProgress = () => {
      if (deckIdx === null || deckIdx === undefined) return;
      const list = decks();
      if (list[deckIdx]) {
        list[deckIdx].known = (list[deckIdx].known || 0) + known;
        saveDecks(list);
      }
    };

    const result = () => {
      saveProgress();
      scores.cards = (scores.cards || 0) + known;
      saveScores(); renderBests(); hit();
      const attempts = known + repeats;
      const acc = attempts ? Math.round(known / attempts * 100) : 100;
      const grade = acc >= 95 ? 5 : acc >= 85 ? 4 : acc >= 70 ? 3 : 2;
      open(`${head(deck.name)}
        <div class="fc-result">
          <div class="fc-grade g${grade}">${grade}</div>
          <div class="fc-res-cap">оценка</div>
          <div class="sr-row">
            <div><b>${known}/${total}</b><span>выучено</span></div>
            <div><b>${repeats}</b><span>повторов</span></div>
            <div><b>${acc}%</b><span>с первого раза</span></div>
          </div>
        </div>
        <button class="btn-primary wide" id="fc-again">Ещё раз</button>
        <button class="btn-ghost wide" id="fc-back" style="margin-top:8px">К наборам</button>`);
      bindClose();
      document.getElementById('fc-again').onclick = () => { close(); study(deck, deckIdx); };
      document.getElementById('fc-back').onclick = () => { close(); cards(); };
      if (grade >= 4) HT.celebrate(`${deck.name}: оценка ${grade}`, 'hi');
    };

    const draw = () => {
      if (pos >= queue.length) return result();
      const c = deck.cards[queue[pos]];
      const shown = Math.min(pos + 1, total);
      const pct = Math.round((shown / total) * 100);
      open(`${head(deck.name)}
        <div class="fc-prog">
          <span class="fc-prog-num">${shown}/${total}</span>
          <div class="fc-bar"><i style="width:${pct}%"></i></div>
        </div>
        <div class="fc-stage">
          <button class="fc-card ${flipped ? 'flipped' : ''}" id="fc-card">
            <span class="fc-face fc-front"><span class="fc-lbl">вопрос</span><span class="fc-text">${escS(c.f)}</span></span>
            <span class="fc-face fc-back"><span class="fc-lbl">ответ</span><span class="fc-text">${escS(c.b)}</span></span>
          </button>
        </div>
        <p class="tiny" style="text-align:center">Нажмите карточку, чтобы перевернуть</p>
        <div class="m-row" style="margin-top:12px">
          <button class="btn-ghost" id="fc-no" style="margin:0">Повторить</button>
          <button class="btn-primary" id="fc-yes">Знаю</button>
        </div>`);
      bindClose();
      document.getElementById('fc-card').onclick = () => {
        flipped = !flipped;
        document.getElementById('fc-card').classList.toggle('flipped', flipped);
      };
      document.getElementById('fc-yes').onclick = () => { known++; pos++; flipped = false; draw(); };
      document.getElementById('fc-no').onclick = () => {
        repeats++;
        queue.push(queue[pos]); pos++; flipped = false; draw();
      };
    };
    draw();
  }

  /* ================= 8. 2048 (размер поля) ================= */
  const G_SIZES = [{ n: '4×4', v: 4 }, { n: '5×5', v: 5 }];
  let gSize = 4;

  function g2048() {
    const N = gSize;
    let grid, score, over;

    const spawn = () => {
      const empty = [];
      grid.forEach((r, i) => r.forEach((v, j) => { if (!v) empty.push([i, j]); }));
      if (!empty.length) return;
      const [i, j] = empty[Math.floor(Math.random() * empty.length)];
      grid[i][j] = Math.random() < 0.9 ? 2 : 4;
    };
    const init = () => { grid = Array.from({ length: N }, () => Array(N).fill(0)); score = 0; over = false; spawn(); spawn(); draw(); };
    const slide = row => {
      const a = row.filter(v => v);
      const res = [];
      let gained = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === a[i + 1]) { res.push(a[i] * 2); gained += a[i] * 2; i++; }
        else res.push(a[i]);
      }
      while (res.length < N) res.push(0);
      return { res, gained };
    };
    const rotate = m => m[0].map((_, i) => m.map(r => r[i]).reverse());

    const move = dir => {
      if (over) return;
      let m = grid.map(r => r.slice());
      const times = { left: 0, up: 1, right: 2, down: 3 }[dir];
      for (let t = 0; t < times; t++) m = rotate(m);
      let gained = 0;
      m = m.map(r => { const o = slide(r); gained += o.gained; return o.res; });
      for (let t = 0; t < (4 - times) % 4; t++) m = rotate(m);
      const changed = JSON.stringify(m) !== JSON.stringify(grid);
      grid = m;
      score += gained;
      if (changed) spawn();
      draw();
      if (score > (scores.g2048 || 0)) { scores.g2048 = score; saveScores(); renderBests(); }
      if (isOver()) {
        over = true;
        hit();
        HT.toast(`Игра окончена: ${score} очков`);
      }
    };
    const isOver = () => {
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        if (!grid[i][j]) return false;
        if (j < N - 1 && grid[i][j] === grid[i][j + 1]) return false;
        if (i < N - 1 && grid[i][j] === grid[i + 1][j]) return false;
      }
      return true;
    };
    const draw = () => {
      const g = document.getElementById('g2048-grid');
      if (!g) return;
      g.innerHTML = grid.flat().map(v => `<div class="tile" data-v="${v || ''}">${v || ''}</div>`).join('');
      const s = document.getElementById('g2048-score');
      if (s) s.innerHTML = `<div class="g-stat"><b>${score}</b><span>очки</span></div>
        <div class="g-stat"><b>${scores.g2048 || 0}</b><span>рекорд</span></div>`;
    };

    open(`${head('2048')}
      <div class="lvl-chips" id="g-size">${G_SIZES.map(s =>
        `<button class="lvl-chip ${s.v === gSize ? 'sel' : ''}" data-v="${s.v}">${s.n}</button>`).join('')}</div>
      <div class="g-stats" id="g2048-score"></div>
      <div class="game-area"><div class="g2048" id="g2048-grid" style="grid-template-columns:repeat(${N},1fr)"></div></div>
      <div class="m-row" style="margin-top:12px;justify-content:center">
        <button class="btn-round" data-dir="up">↑</button>
      </div>
      <div class="m-row" style="justify-content:center">
        <button class="btn-round" data-dir="left">←</button>
        <button class="btn-round" data-dir="down">↓</button>
        <button class="btn-round" data-dir="right">→</button>
      </div>
      <p class="tiny" style="text-align:center;margin-top:8px">Соединяйте одинаковые плитки и доберитесь до 2048!</p>`);
    bindClose();
    document.querySelectorAll('#g-size [data-v]').forEach(b => b.onclick = () => {
      gSize = Number(b.dataset.v); close(); g2048();
    });
    document.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => move(b.dataset.dir));

    const box = document.getElementById('modal-box');
    let sx = 0, sy = 0;
    box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    }, { passive: true });

    init();
  }

  /* ---------- меню игр ---------- */
  document.querySelectorAll('[data-game]').forEach(b => b.onclick = () => {
    const fn = { memory, reaction, g2048, words, math, sudoku, cards, sea: seaSetup }[b.dataset.game];
    if (fn) fn();
    else HT.toast('Игра скоро будет доступна');
  });

  HT.onShow['tab-games'] = renderBests;
  renderBests();
})();
