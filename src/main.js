import { ENEMIES, EVENT_POOL, RELICS, ROOM_TYPES, SKILLS, WEAPONS } from './data.js';

const ui = {
  hud: document.querySelector('#hud'), map: document.querySelector('#map'), room: document.querySelector('#room'), combat: document.querySelector('#combat'), log: document.querySelector('#log'), glossary: document.querySelector('#glossary'),
};

const state = {
  floor: 1, hp: 30, maxHp: 30, gold: 30,
  weapon: structuredClone(WEAPONS.dagger), relics: [], skills: [structuredClone(SKILLS.reroll)],
  inCombat: false, combat: null, runOver: false,
  map: { w: 7, h: 5, x: 0, y: 2, nodes: [] },
};

const rng = { int: (n) => Math.floor(Math.random() * n), pick: (arr) => arr[Math.floor(Math.random() * arr.length)] };
const diceLabel = (arr) => arr.map((d) => `d${d}`).join(',');
const log = (m) => (ui.log.textContent = `[F${state.floor}] ${m}\n` + ui.log.textContent);
const rollDie = (s) => rng.int(s) + 1;

function pickRelic() { return structuredClone(RELICS[rng.pick(Object.keys(RELICS))]); }
function pickEnemy(kind = 'normal') {
  const pool = kind === 'elite' ? ['knight', 'assassin', 'giant'] : ['slime', 'slime', 'knight', 'assassin'];
  return structuredClone(ENEMIES[rng.pick(pool)]);
}
function sortDesc(a) { return [...a].sort((x, y) => y - x); }

function buildMap() {
  const normal = ['battle', 'chest', 'gacha', 'merchant', 'rest', 'event'];
  state.map.nodes = Array.from({ length: state.map.h }, (_, y) =>
    Array.from({ length: state.map.w }, (_, x) => {
      if (x === 0 && y === 2) return { type: 'start', revealed: true, done: true };
      if (x === state.map.w - 1) return { type: y === 2 ? 'boss' : 'elite', revealed: false, done: false };
      return { type: rng.pick(normal), revealed: x <= 1, done: false };
    }),
  );
}

function legalMoves() {
  const { x, y, w, h } = state.map;
  return [[x + 1, y], [x + 1, y - 1], [x + 1, y + 1]].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h);
}

function compareDamage(atkRolls, defRolls) {
  const a = sortDesc(atkRolls);
  const d = state.combat.skillFlags.ignoreDefense ? [] : sortDesc(defRolls);
  let dmg = 0;
  for (let i = 0; i < a.length; i++) if (i >= d.length || a[i] > d[i]) dmg++;
  return { dmg, a, d };
}

function getWeaponDice() {
  let dice = [...state.weapon.attackDice];
  if (state.relics.some((r) => r.id === 'd6to8')) dice = dice.map((d) => (d === 6 ? 8 : d));
  if (state.combat?.turn === 1 && state.relics.some((r) => r.id === 'firstStrike')) dice.push(6);
  return dice;
}

function applyRollMods(rolls, sidesList) {
  let out = rolls.map((v, i) => ({ v, s: sidesList[i] ?? 6 }));
  if (state.relics.some((r) => r.id === 'evenPlus')) out = out.map((o) => (o.v % 2 === 0 ? { ...o, v: o.v + 1 } : o));
  if (state.relics.some((r) => r.id === 'oddPlus')) out = out.map((o) => (o.v % 2 === 1 ? { ...o, v: o.v + 1 } : o));
  if (state.combat.skillFlags.minFloor) out = out.map((o) => ({ ...o, v: Math.max(o.v, state.combat.skillFlags.minFloor) }));
  if (state.combat.skillFlags.explodeMax) for (const o of [...out]) if (o.v >= o.s) out.push({ v: rollDie(6), s: 6 });
  if (state.relics.some((r) => r.id === 'maxExtra')) for (const o of [...out]) if (o.v >= o.s) out.push({ v: rollDie(4), s: 4 });
  return out.map((o) => o.v);
}

function useSkill(id) {
  const sk = state.skills.find((s) => s.id === id);
  if (!sk || sk.uses <= 0) return;
  sk.uses--;
  if (sk.type === 'rerollOne') state.combat.skillFlags.rerollOne = true;
  if (sk.type === 'addTempDie') state.combat.skillFlags.tempDie = sk.value;
  if (sk.type === 'explodeMax') state.combat.skillFlags.explodeMax = true;
  if (sk.type === 'minFloor') state.combat.skillFlags.minFloor = sk.value;
  if (sk.type === 'ignoreDefense') state.combat.skillFlags.ignoreDefense = true;
  log(`スキル使用: ${sk.name}`);
  render();
}

function startCombat(enemy) { state.inCombat = true; state.combat = { enemy, turn: 1, skillFlags: {} }; log(`${enemy.name} が現れた！`); render(); }

function playerAttack() {
  const c = state.combat;
  const wDice = getWeaponDice(); if (c.skillFlags.tempDie) wDice.push(c.skillFlags.tempDie);
  let atk = wDice.map(rollDie);
  if (c.skillFlags.rerollOne) { const i = atk.indexOf(Math.min(...atk)); atk[i] = rollDie(wDice[i]); }
  atk = applyRollMods(atk, wDice);
  const res = compareDamage(atk, c.enemy.def.map(rollDie));
  c.enemy.hp -= res.dmg;
  log(`あなた ${JSON.stringify(res.a)} vs 敵防御 ${JSON.stringify(res.d)} => ${res.dmg}ダメージ`);
  if (c.enemy.hp <= 0) {
    state.gold += c.enemy.reward; state.inCombat = false; state.combat = null;
    log(`${c.enemy.name} 撃破。${c.enemy.reward}G獲得`);
    if (state.map.x === state.map.w - 1) { state.floor++; buildMap(); state.map.x = 0; state.map.y = 2; log('次の階層へ進んだ'); }
    render(); return;
  }
  enemyAttack();
}

function enemyAttack() {
  const c = state.combat;
  const res = compareDamage(c.enemy.atk.map(rollDie), [6, 6].map(rollDie));
  state.hp -= res.dmg;
  log(`${c.enemy.name} ${JSON.stringify(res.a)} vs あなた防御 ${JSON.stringify(res.d)} => ${res.dmg}ダメージ`);
  c.turn++; c.skillFlags = {};
  if (state.hp <= 0) { state.runOver = true; state.inCombat = false; log('GAME OVER'); }
  render();
}

function resolveRoom(type) {
  if (type === 'battle') return startCombat(pickEnemy('normal'));
  if (type === 'elite') return startCombat(pickEnemy('elite'));
  if (type === 'boss') return startCombat(structuredClone(ENEMIES.lichBoss));
  if (type === 'chest') {
    const roll = rng.int(5);
    if (roll === 0) { state.weapon = structuredClone(rng.pick(Object.values(WEAPONS))); log(`宝箱: 武器 ${state.weapon.name}`); }
    if (roll === 1) { const relic = pickRelic(); state.relics.push(relic); log(`宝箱: relic ${relic.name}`); }
    if (roll === 2) { state.hp = Math.min(state.maxHp, state.hp + 8); log('宝箱: 8回復'); }
    if (roll === 3) { state.gold += 30; log('宝箱: 30G'); }
    if (roll === 4) { const sk = structuredClone(rng.pick(Object.values(SKILLS))); state.skills.push(sk); log(`宝箱: スキル ${sk.name}`); }
  }
  if (type === 'gacha') {
    if (state.gold < 20) log('ガチャ: 20G不足'); else {
      state.gold -= 20;
      const got = rng.pick(['relic', 'skill', 'weaponMut', 'cursePower']);
      if (got === 'relic') { const relic = pickRelic(); state.relics.push(relic); log(`ガチャ: relic ${relic.name}`); }
      if (got === 'skill') { const sk = structuredClone(rng.pick(Object.values(SKILLS))); state.skills.push(sk); log(`ガチャ: スキル ${sk.name}`); }
      if (got === 'weaponMut') { state.weapon.attackDice.push(rng.pick([4, 6, 8])); log('ガチャ: 武器ダイス+1'); }
      if (got === 'cursePower') { state.weapon.attackDice.push(10); state.maxHp -= 2; state.hp = Math.min(state.hp, state.maxHp); log('ガチャ: 呪い強化 +d10 / 最大HP-2'); }
    }
  }
  if (type === 'merchant') { if (state.gold >= 25) { state.gold -= 25; const relic = pickRelic(); state.relics.push(relic); log(`商人: ${relic.name}`); } else log('商人: 25G必要'); }
  if (type === 'rest') { state.hp = Math.min(state.maxHp, state.hp + 10); log('休憩: 10回復'); }
  if (type === 'event') { const e = rng.pick(EVENT_POOL); e.effect(state, rng, pickRelic); log(`イベント: ${e.text}`); }
}

function moveTo(nx, ny) {
  if (state.inCombat || state.runOver) return;
  if (!legalMoves().some(([x, y]) => x === nx && y === ny)) return;
  state.map.x = nx; state.map.y = ny;
  const node = state.map.nodes[ny][nx];
  node.revealed = true; node.done = true;
  legalMoves().forEach(([x, y]) => { state.map.nodes[y][x].revealed = true; });
  resolveRoom(node.type);
  render();
}

function renderGlossary() {
  ui.glossary.innerHTML = `
    <div class="small">${Object.values(ROOM_TYPES).map((t) => `<div><strong>${t.label}</strong>: ${t.desc}</div>`).join('')}</div>
    <hr />
    <div class="small"><strong>戦闘ルール:</strong> 攻撃/防御ダイスを降順に並べて比較。攻撃側が上回った数がダメージ。比較相手がいない余剰攻撃ダイスは成功扱い。</div>
  `;
}

function render() {
  ui.hud.innerHTML = `<h2>ステータス</h2><div class="hud-grid">
    <div class="kv">HP<br><strong>${state.hp}/${state.maxHp}</strong></div>
    <div class="kv">階層<br><strong>${state.floor}</strong></div>
    <div class="kv">所持金<br><strong>${state.gold}G</strong></div>
    <div class="kv">武器<br><strong>${state.weapon.name}</strong><br>${diceLabel(state.weapon.attackDice)}</div>
  </div>
  <div><strong>Relics:</strong> ${state.relics.map((r) => `<span class="badge" title="${r.desc}">${r.name}</span>`).join('') || 'なし'}</div>
  <div><strong>Skills:</strong> ${state.skills.map((s) => `<span class="badge" title="${s.desc}">${s.name}(${s.uses})</span>`).join('')}</div>`;

  if (state.runOver) { ui.room.innerHTML = '<h2>ゲームオーバー</h2><button onclick="window.location.reload()">最初から</button>'; ui.combat.classList.add('hidden'); return; }

  ui.map.innerHTML = `<h2>ダンジョンマップ（右に進む）</h2><div class="map-grid">${state.map.nodes.flatMap((row, y) => row.map((n, x) => {
    const here = x === state.map.x && y === state.map.y;
    const canMove = legalMoves().some(([mx, my]) => mx === x && my === y);
    return `<div class="tile ${n.revealed ? 'revealed' : ''} ${here ? 'current' : ''}">${n.revealed ? ROOM_TYPES[n.type].label : '???'}${canMove && !state.inCombat ? `<button data-x="${x}" data-y="${y}">移動</button>` : ''}</div>`;
  })).join('')}</div>`;
  ui.map.querySelectorAll('button').forEach((b) => { b.onclick = () => moveTo(Number(b.dataset.x), Number(b.dataset.y)); });

  if (state.inCombat) {
    ui.combat.classList.remove('hidden');
    const c = state.combat;
    ui.combat.innerHTML = `<h2>戦闘: ${c.enemy.name} (HP:${c.enemy.hp})</h2><div>敵攻撃:${diceLabel(c.enemy.atk)} / 敵防御:${diceLabel(c.enemy.def)}</div><div id="skills"></div><button id="attack">攻撃</button>`;
    const sk = ui.combat.querySelector('#skills');
    state.skills.forEach((s) => { const b = document.createElement('button'); b.textContent = `${s.name}(${s.uses})`; b.disabled = s.uses <= 0; b.onclick = () => useSkill(s.id); sk.appendChild(b); });
    ui.combat.querySelector('#attack').onclick = playerAttack;
    ui.room.innerHTML = '<h2>戦闘中</h2><p>スキルを選んでから攻撃できます。</p>';
  } else {
    ui.combat.classList.add('hidden');
    ui.room.innerHTML = '<h2>探索中</h2><p>青枠が現在地です。右方向の「移動」ボタンで次のマスへ進んでください。</p>';
  }

  renderGlossary();
}

buildMap();
render();
log('探索開始: マスを移動して進もう');
