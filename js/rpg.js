/* ===== RPG: «Тёмное королевство» =====
   Пошаговые бои, уровни, золото, зелья, кузница.
   Прогресс сохраняется автоматически. */

(() => {
  const KEY = 'helper_rpg_v1';

  const xpNeed = lvl => lvl * 40;

  const ZONES = [
    {
      name: '🌲 Тёмный лес', minLevel: 1,
      enemies: [
        { name: 'Серый волк',      icon: '🐺', hp: 32,  atk: 8,  def: 2,  xp: 20,  gold: 12 },
        { name: 'Гоблин-громила',  icon: '👺', hp: 42,  atk: 10, def: 3,  xp: 26,  gold: 16 },
        { name: 'Ядовитый паук',   icon: '🕷️', hp: 36,  atk: 12, def: 2,  xp: 28,  gold: 15 },
        { name: 'Лесной тролль',   icon: '👹', hp: 55,  atk: 11, def: 5,  xp: 34,  gold: 22 }
      ]
    },
    {
      name: '⛰ Забытые пещеры', minLevel: 3,
      enemies: [
        { name: 'Скелет-воин',       icon: '💀', hp: 65,  atk: 16, def: 6,  xp: 48,  gold: 28 },
        { name: 'Кровавая мышь',     icon: '🦇', hp: 48,  atk: 19, def: 4,  xp: 46,  gold: 24 },
        { name: 'Каменный голем',    icon: '🗿', hp: 88,  atk: 15, def: 11, xp: 60,  gold: 38 },
        { name: 'Гротовый ящер',     icon: '🦎', hp: 72,  atk: 21, def: 7,  xp: 58,  gold: 34 }
      ]
    },
    {
      name: '🏰 Проклятый замок', minLevel: 6,
      enemies: [
        { name: 'Огр-паладин',   icon: '👹', hp: 120, atk: 25, def: 10, xp: 95,  gold: 60 },
        { name: 'Рыцарь смерти', icon: '☠️', hp: 108, atk: 28, def: 12, xp: 105, gold: 68 },
        { name: 'Вампир-лорд',   icon: '🧛', hp: 118, atk: 30, def: 9,  xp: 115, gold: 75 },
        { name: 'ДРАКОН ТЬМЫ',   icon: '🐉', hp: 190, atk: 33, def: 14, xp: 220, gold: 160 }
      ]
    }
  ];

  const newHero = () => ({
    level: 1, xp: 0, hp: 100, maxHp: 100,
    atk: 12, def: 4, gold: 0, potions: 2,
    zone: 0, wins: 0, deaths: 0
  });

  /* ---------- Сохранение ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return newHero();
      const h = JSON.parse(raw);
      return Object.assign(newHero(), h);
    } catch { return newHero(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(hero)); } catch {}
  }

  let hero = load();
  let enemy = null;   // текущий враг в бою
  let busy = false;   // идёт ход противника
  let logs = [];

  /* ---------- DOM ---------- */
  const $ = id => document.getElementById(id);
  const battleEl = $('rpg-battle');
  const worldEl  = $('rpg-world');
  const logEl    = $('rpg-log');

  /* ---------- Журнал ---------- */
  function log(text, cls = '') {
    logs.unshift({ text, cls });
    if (logs.length > 40) logs.pop();
    renderLog();
  }
  function renderLog() {
    logEl.innerHTML = '';
    logs.forEach(l => {
      const div = document.createElement('div');
      div.className = 'log-line ' + l.cls;
      div.textContent = l.text;
      logEl.appendChild(div);
    });
  }

  /* ---------- Утилиты ---------- */
  const roll = (base, def) =>
    Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3) - def * 0.5));

  const weaponCost = () => 25 * hero.level;
  const armorCost  = () => 25 * hero.level;
  const REST_COST  = 15;
  const POTION_COST = 20;

  /* ---------- Отрисовка ---------- */
  function render() {
    $('rpg-level').textContent = `Уровень ${hero.level} · Побед: ${hero.wins}`;
    $('rpg-gold').textContent = `🪙 ${hero.gold}`;

    const hpPct = Math.max(0, hero.hp / hero.maxHp * 100);
    $('rpg-hp-bar').style.width = hpPct + '%';
    $('rpg-hp-text').textContent = `${Math.max(0, hero.hp)}/${hero.maxHp}`;

    const need = xpNeed(hero.level);
    $('rpg-xp-bar').style.width = Math.min(100, hero.xp / need * 100) + '%';
    $('rpg-xp-text').textContent = `${hero.xp}/${need}`;

    $('rpg-stats').innerHTML =
      `<span>⚔️ Атака <b>${hero.atk}</b></span>` +
      `<span>🛡️ Защита <b>${hero.def}</b></span>` +
      `<span>🧪 Зелья <b>${hero.potions}</b></span>` +
      `<span>💀 Поражений <b>${hero.deaths}</b></span>`;

    /* локации */
    const zonesEl = $('rpg-zones');
    zonesEl.innerHTML = '';
    ZONES.forEach((z, i) => {
      const btn = document.createElement('button');
      const locked = hero.level < z.minLevel;
      btn.className = 'zone-chip' +
        (hero.zone === i ? ' active' : '') +
        (locked ? ' locked' : '');
      btn.textContent = (locked ? '🔒 ' : '') + z.name;
      btn.disabled = locked;
      btn.onclick = () => { hero.zone = i; save(); render(); };
      zonesEl.appendChild(btn);
    });

    /* мир */
    const potionBtn = worldEl.querySelector('[data-world="potion"]');
    const weaponBtn = worldEl.querySelector('[data-world="weapon"]');
    const armorBtn  = worldEl.querySelector('[data-world="armor"]');
    const restBtn   = worldEl.querySelector('[data-world="rest"]');
    potionBtn.textContent = `🧪 Купить зелье (${POTION_COST} 🪙)`;
    weaponBtn.textContent = `🔨 Усилить оружие +4 (${weaponCost()} 🪙)`;
    armorBtn.textContent  = `🛡️ Усилить броню +3 (${armorCost()} 🪙)`;
    restBtn.textContent   = `⛺ Отдых — полное лечение (${REST_COST} 🪙)`;
    potionBtn.disabled = hero.gold < POTION_COST;
    weaponBtn.disabled = hero.gold < weaponCost();
    armorBtn.disabled  = hero.gold < armorCost();
    restBtn.disabled   = hero.gold < REST_COST || hero.hp >= hero.maxHp;

    /* бой */
    battleEl.classList.toggle('hidden', !enemy);
    worldEl.classList.toggle('hidden', !!enemy);
    if (enemy) {
      $('enemy-emoji').textContent = enemy.icon;
      $('enemy-name').textContent = enemy.name;
      $('enemy-hp-bar').style.width = Math.max(0, enemy.hp / enemy.maxHp * 100) + '%';
      $('enemy-hp-text').textContent = `${Math.max(0, enemy.hp)}/${enemy.maxHp}`;
      $('potion-count').textContent = `(${hero.potions})`;
      battleEl.querySelectorAll('.rpg-btn').forEach(b => b.disabled = busy);
    }
    save();
  }

  function popup(text) {
    const el = document.createElement('div');
    el.className = 'dmg-pop';
    el.textContent = text;
    el.style.left = (30 + Math.random() * 50) + '%';
    el.style.top = '10px';
    battleEl.style.position = 'relative';
    battleEl.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  /* ---------- Бой ---------- */
  function startBattle() {
    const zone = ZONES[hero.zone];
    const proto = zone.enemies[Math.floor(Math.random() * zone.enemies.length)];
    enemy = Object.assign({}, proto);
    enemy.maxHp = Math.round(proto.hp * (0.9 + Math.random() * 0.25));
    enemy.hp = enemy.maxHp;
    busy = false;
    log(`Вы встретили: ${enemy.icon} ${enemy.name}!`, 'bad');
    render();
  }

  function endBattle() { enemy = null; busy = false; render(); }

  function enemyTurn() {
    if (!enemy) return;
    busy = true;
    render();
    setTimeout(() => {
      if (!enemy) return;
      const dmg = roll(enemy.atk, hero.def);
      hero.hp -= dmg;
      log(`${enemy.icon} ${enemy.name} бьёт вас: −${dmg} HP`, 'bad');
      if (hero.hp <= 0) return onDeath();
      busy = false;
      render();
    }, 650);
  }

  function onDeath() {
    const lost = Math.floor(hero.gold * 0.3);
    hero.gold -= lost;
    hero.hp = hero.maxHp;
    hero.deaths++;
    enemy = null;
    busy = false;
    log(`💀 Вы пали... Но волшебный огонь вернул вас к жизни. Потеряно золота: ${lost}`, 'bad');
    render();
  }

  function onVictory() {
    hero.xp += enemy.xp;
    hero.gold += enemy.gold;
    hero.wins++;
    log(`✅ Победа! +${enemy.xp} XP, +${enemy.gold} 🪙`, 'gold');
    if (Math.random() < 0.25) {
      hero.potions++;
      log('🎁 Нашли зелье во вражеском луте!', 'good');
    }
    enemy = null;
    busy = false;
    levelUpCheck();
    render();
  }

  function levelUpCheck() {
    while (hero.xp >= xpNeed(hero.level)) {
      hero.xp -= xpNeed(hero.level);
      hero.level++;
      hero.maxHp += 15;
      hero.atk += 4;
      hero.def += 2;
      hero.hp = hero.maxHp;
      log(`🌟 Новый уровень: ${hero.level}! +15 HP, +4 атака, +2 защита. Полное лечение.`, 'info');
      ZONES.forEach((z, i) => {
        if (hero.level === z.minLevel && i > 0) {
          log(`🔓 Открыта локация: ${z.name}`, 'info');
        }
      });
    }
  }

  /* ---------- Действия игрока ---------- */
  function playerAction(act) {
    if (!enemy || busy) return;

    if (act === 'attack') {
      const dmg = roll(hero.atk, enemy.def);
      enemy.hp -= dmg;
      popup('-' + dmg);
      log(`⚔️ Вы бьёте ${enemy.name}: −${dmg} HP`, 'good');
      if (enemy.hp <= 0) return onVictory();
      render();
      return enemyTurn();
    }

    if (act === 'heavy') {
      if (Math.random() < 0.3) {
        log('💥 Сильный удар — промах!', 'bad');
        render();
        return enemyTurn();
      }
      const dmg = Math.round(roll(hero.atk, enemy.def) * 1.9);
      enemy.hp -= dmg;
      popup('-' + dmg);
      log(`💥 Сокрушительный удар: −${dmg} HP!`, 'good');
      if (enemy.hp <= 0) return onVictory();
      render();
      return enemyTurn();
    }

    if (act === 'potion') {
      if (hero.potions <= 0) { log('Зелий не осталось!', 'bad'); return; }
      if (hero.hp >= hero.maxHp) { log('HP и так полное — зелье не нужно.', 'info'); return; }
      hero.potions--;
      const heal = Math.round(hero.maxHp * 0.4);
      hero.hp = Math.min(hero.maxHp, hero.hp + heal);
      log(`🧪 Вы выпили зелье: +${heal} HP`, 'good');
      render();
      return enemyTurn();
    }

    if (act === 'flee') {
      if (Math.random() < 0.5) {
        log('🏃 Вы сбежали из боя.', 'info');
        return endBattle();
      }
      log('🏃 Побег не удался!', 'bad');
      render();
      return enemyTurn();
    }
  }

  /* ---------- Действия в мире ---------- */
  function worldAction(act) {
    if (enemy) return;

    if (act === 'battle') return startBattle();

    if (act === 'potion') {
      if (hero.gold < POTION_COST) return log('Не хватает золота.', 'bad');
      hero.gold -= POTION_COST;
      hero.potions++;
      log(`🧪 Куплено зелье (−${POTION_COST} 🪙). Всего: ${hero.potions}`, 'good');
    }

    if (act === 'weapon') {
      const cost = weaponCost();
      if (hero.gold < cost) return log('Не хватает золота.', 'bad');
      hero.gold -= cost;
      hero.atk += 4;
      log(`🔨 Оружие усилено! Атака: ${hero.atk} (−${cost} 🪙)`, 'good');
    }

    if (act === 'armor') {
      const cost = armorCost();
      if (hero.gold < cost) return log('Не хватает золота.', 'bad');
      hero.gold -= cost;
      hero.def += 3;
      log(`🛡️ Броня усилена! Защита: ${hero.def} (−${cost} 🪙)`, 'good');
    }

    if (act === 'rest') {
      if (hero.gold < REST_COST) return log('Не хватает золота.', 'bad');
      hero.gold -= REST_COST;
      hero.hp = hero.maxHp;
      log(`⛺ Вы отдохнули у костра. HP восстановлено (−${REST_COST} 🪙)`, 'good');
    }

    render();
  }

  /* ---------- Слушатели ---------- */
  battleEl.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => playerAction(btn.dataset.act));
  });
  worldEl.querySelectorAll('[data-world]').forEach(btn => {
    btn.addEventListener('click', () => worldAction(btn.dataset.world));
  });

  $('rpg-reset').addEventListener('click', () => {
    if (!confirm('Начать игру заново? Весь прогресс будет потерян.')) return;
    hero = newHero();
    enemy = null;
    busy = false;
    logs = [];
    log('🆕 Новая игра. Добро пожаловать в Тёмное королевство!', 'info');
    render();
  });

  /* ---------- Старт ---------- */
  log('⚔️ Добро пожаловать! Выбирайте локацию и идите в бой.', 'info');
  render();
})();
