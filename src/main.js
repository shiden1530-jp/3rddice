import { ENEMIES, EVENT_POOL, RELICS, ROOM_TYPES, SKILLS, WEAPONS } from './data.js';

const ui = {
  hud: document.querySelector('#hud'),
  map: document.querySelector('#node-map'),
  combat: document.querySelector('#combat'),
  room: document.querySelector('#room'),
  log: document.querySelector('#log'),
};

const state = {
  floor: 1,
  hp: 30,
  maxHp: 30,
  gold: 30,
  weapon: structuredClone(WEAPONS.dagger),
  relics: [],
  skills: [structuredClone(SKILLS.reroll)],
  inCombat: false,
  combat: null,
  currentNodes: [],
  runOver: false,
};

const rng = {
  int(n) { return Math.floor(Math.random() * n); },
  pick(arr) { return arr[this.int(arr.length)]; },
};

function log(msg) {
  ui.log.textContent = `[F${state.floor}] ${msg}\n` + ui.log.textContent;
}

function rollDie(sides) { return rng.int(sides) + 1; }
function sortDesc(a) { return [...a].sort((x, y) => y - x); }

function formatDice(dice) { return dice.map(d => `d${d}`).join(','); }
function pickRelic() { return structuredClone(RELICS[rng.pick(Object.keys(RELICS))]); }
function pickEnemy(kind = 'normal') {
  const pool = kind === 'elite' ? ['knight', 'assassin', 'giant'] : ['slime', 'slime', 'knight', 'assassin'];
  return structuredClone(ENEMIES[rng.pick(pool)]);
}

function getWeaponDice() {
  let dice = [...state.weapon.attackDice];
  if (state.relics.some(r => r.id === 'd6to8')) dice = dice.map(d => d === 6 ? 8 : d);
  if (state.combat?.turn === 1 && state.relics.some(r => r.id === 'firstStrike')) dice.push(6);
  return dice;
}

function applyRollMods(rolls, sidesList) {
  let out = rolls.map((v, i) => ({ v, s: sidesList[i] ?? 6 }));
  if (state.relics.some(r => r.id === 'evenPlus')) out = out.map(o => o.v % 2 === 0 ? { ...o, v: o.v + 1 } : o);
  if (state.relics.some(r => r.id === 'oddPlus')) out = out.map(o => o.v % 2 === 1 ? { ...o, v: o.v + 1 } : o);
  if (state.combat.skillFlags.minFloor) out = out.map(o => ({ ...o, v: Math.max(o.v, state.combat.skillFlags.minFloor) }));
  if (state.combat.skillFlags.explodeMax) {
    const extra = [];
    for (const o of out) if (o.v >= o.s) extra.push({ v: rollDie(6), s: 6 });
    out.push(...extra);
  }
  if (state.relics.some(r => r.id === 'maxExtra')) {
    const extra = [];
    for (const o of out) if (o.v >= o.s) extra.push({ v: rollDie(4), s: 4 });
    out.push(...extra);
  }
  return out.map(o => o.v);
}

function compareDamage(atkRolls, defRolls) {
  const a = sortDesc(atkRolls);
  const d = state.combat.skillFlags.ignoreDefense ? [] : sortDesc(defRolls);
  let dmg = 0;
  for (let i = 0; i < a.length; i++) {
    if (i >= d.length || a[i] > d[i]) dmg++;
  }
  return { dmg, a, d };
}

function startCombat(enemy) {
  state.inCombat = true;
  state.combat = { enemy, turn: 1, skillFlags: {}, usedSkills: new Set() };
  log(`${enemy.name} が現れた！`);
  render();
}

function playerAttack() {
  const c = state.combat;
  const weaponDice = getWeaponDice();
  if (c.skillFlags.tempDie) weaponDice.push(c.skillFlags.tempDie);
  let atkRolls = weaponDice.map(rollDie);

  if (c.skillFlags.rerollOne) {
    const i = atkRolls.indexOf(Math.min(...atkRolls));
    atkRolls[i] = rollDie(weaponDice[i]);
  }
  atkRolls = applyRollMods(atkRolls, weaponDice);
  const defRolls = c.enemy.def.map(rollDie);
  const result = compareDamage(atkRolls, defRolls);
  c.enemy.hp -= result.dmg;

  log(`あなたの攻撃 ${JSON.stringify(result.a)} vs ${JSON.stringify(result.d)} => ${result.dmg}ダメージ`);

  if (c.enemy.hp <= 0) {
    state.gold += c.enemy.reward;
    log(`${c.enemy.name} を撃破。${c.enemy.reward}G獲得`);
    state.inCombat = false;
    state.combat = null;
    state.floor++;
    buildNodes();
    render();
    return;
  }

  enemyAttack();
}

function enemyAttack() {
  const c = state.combat;
  const eAtk = c.enemy.atk.map(rollDie);
  const pDef = [6,6].map(rollDie);
  const res = compareDamage(eAtk, pDef);
  state.hp -= res.dmg;
  log(`${c.enemy.name}の攻撃 ${JSON.stringify(res.a)} vs ${JSON.stringify(res.d)} => ${res.dmg}ダメージ`);

  c.turn++;
  c.skillFlags = {};
  if (state.hp <= 0) {
    state.runOver = true;
    state.inCombat = false;
    log('あなたは力尽きた... GAME OVER');
  }
  render();
}

function useSkill(skillId) {
  const c = state.combat;
  const skill = state.skills.find(s => s.id === skillId);
  if (!skill || skill.uses <= 0) return;
  skill.uses--;
  c.usedSkills.add(skill.id);
  if (skill.type === 'rerollOne') c.skillFlags.rerollOne = true;
  if (skill.type === 'addTempDie') c.skillFlags.tempDie = skill.value;
  if (skill.type === 'explodeMax') c.skillFlags.explodeMax = true;
  if (skill.type === 'minFloor') c.skillFlags.minFloor = skill.value;
  if (skill.type === 'ignoreDefense') c.skillFlags.ignoreDefense = true;
  log(`スキル使用: ${skill.name}`);
  render();
}

function buildNodes() {
  const table = state.floor % 5 === 0
    ? ['elite', 'chest', 'rest', 'gacha', 'boss']
    : ['battle', 'chest', 'gacha', 'merchant', 'rest', 'event'];
  state.currentNodes = Array.from({ length: 3 }, () => rng.pick(table));
}

function enterRoom(type) {
  if (state.runOver || state.inCombat) return;
  if (type === 'battle') return startCombat(pickEnemy('normal'));
  if (type === 'elite') return startCombat(pickEnemy('elite'));
  if (type === 'boss') return startCombat(structuredClone(ENEMIES.lichBoss));

  if (type === 'chest') {
    const roll = rng.int(5);
    if (roll === 0) { state.weapon = structuredClone(rng.pick(Object.values(WEAPONS))); log(`宝箱: 武器 ${state.weapon.name}`); }
    if (roll === 1) { const relic = pickRelic(); state.relics.push(relic); log(`宝箱: relic ${relic.name}`); }
    if (roll === 2) { state.hp = Math.min(state.maxHp, state.hp + 8); log('宝箱: 8回復'); }
    if (roll === 3) { state.gold += 30; log('宝箱: 30G獲得'); }
    if (roll === 4) { state.skills.push(structuredClone(rng.pick(Object.values(SKILLS)))); log('宝箱: スキル獲得'); }
  }

  if (type === 'gacha') {
    if (state.gold < 20) log('ガチャ: お金不足');
    else {
      state.gold -= 20;
      const outcomes = ['relic', 'skill', 'weaponMut', 'cursePower'];
      const got = rng.pick(outcomes);
      if (got === 'relic') { const relic = pickRelic(); state.relics.push(relic); log(`ガチャ: レアrelic ${relic.name}`); }
      if (got === 'skill') { const sk = structuredClone(rng.pick(Object.values(SKILLS))); state.skills.push(sk); log(`ガチャ: スキル ${sk.name}`); }
      if (got === 'weaponMut') { state.weapon.attackDice.push(rng.pick([4,6,8])); log('ガチャ: 武器ダイス+1'); }
      if (got === 'cursePower') { state.weapon.attackDice.push(10); state.maxHp -= 2; state.hp = Math.min(state.hp, state.maxHp); log('ガチャ: 呪い強化(+d10, 最大HP-2)'); }
    }
  }

  if (type === 'merchant') {
    if (state.gold >= 25) {
      state.gold -= 25;
      const relic = pickRelic();
      state.relics.push(relic);
      log(`商人: ${relic.name} を購入`);
    } else log('商人: 25G必要');
  }

  if (type === 'rest') {
    state.hp = Math.min(state.maxHp, state.hp + 10);
    log('休憩: 10回復');
  }

  if (type === 'event') {
    const e = rng.pick(EVENT_POOL);
    e.effect(state, rng, pickRelic);
    log(`イベント: ${e.text}`);
  }

  state.floor++;
  buildNodes();
  render();
}

function render() {
  ui.hud.innerHTML = `
    <h2>ステータス</h2>
    <div class="hud-grid">
      <div>HP: ${state.hp}/${state.maxHp}</div>
      <div>階層: ${state.floor}</div>
      <div>所持金: ${state.gold}G</div>
      <div>武器: ${state.weapon.name} (${formatDice(state.weapon.attackDice)})</div>
    </div>
    <div><strong>Relics:</strong> ${(state.relics.map(r => `<span class="badge">${r.name}</span>`).join('') || 'なし')}</div>
    <div><strong>Skills:</strong> ${state.skills.map(s => `<span class="badge">${s.name}(${s.uses})</span>`).join('')}</div>
  `;

  if (state.runOver) {
    ui.room.innerHTML = '<h2>ゲームオーバー</h2><button id="restart">最初から</button>';
    document.querySelector('#restart').onclick = () => window.location.reload();
    ui.map.classList.add('hidden');
    ui.combat.classList.add('hidden');
    return;
  }

  if (state.inCombat) {
    ui.map.classList.add('hidden');
    ui.combat.classList.remove('hidden');
    const c = state.combat;
    ui.combat.innerHTML = `
      <h2>戦闘: ${c.enemy.name}</h2>
      <div>敵HP: ${c.enemy.hp}</div>
      <div>敵攻撃: ${formatDice(c.enemy.atk)} / 敵防御: ${formatDice(c.enemy.def)}</div>
      <div class="btn-row" id="skill-buttons"></div>
      <hr/>
      <button id="attack">攻撃</button>
    `;
    const btnWrap = document.querySelector('#skill-buttons');
    state.skills.forEach(s => {
      const b = document.createElement('button');
      b.textContent = `${s.name} (${s.uses})`;
      b.disabled = s.uses <= 0;
      b.onclick = () => useSkill(s.id);
      btnWrap.appendChild(b);
    });
    document.querySelector('#attack').onclick = playerAttack;
    ui.room.innerHTML = '<h2>戦闘中...</h2>';
    return;
  }

  ui.combat.classList.add('hidden');
  ui.map.classList.remove('hidden');
  ui.map.innerHTML = `<h2>探索ノード</h2><div class="node-list">${state.currentNodes.map((n, i) => `<button data-node="${n}" data-i="${i}">${n}</button>`).join('')}</div>`;
  ui.map.querySelectorAll('button').forEach(b => b.onclick = () => enterRoom(b.dataset.node));
  ui.room.innerHTML = '<h2>部屋を選択してください</h2><p>戦闘とビルド強化を繰り返し、深層を目指そう。</p>';
}

buildNodes();
render();
log('ダンジョン探索開始');
