export const ROOM_TYPES = {
  start: { id: 'start', label: '開始', desc: 'スタート地点。' },
  battle: { id: 'battle', label: '戦闘', desc: '通常の敵と戦う。勝てば報酬。' },
  chest: { id: 'chest', label: '宝箱', desc: '武器/回復/relic/通貨などを獲得。' },
  gacha: { id: 'gacha', label: 'ガチャ', desc: '20Gでランダム強化。' },
  merchant: { id: 'merchant', label: '商人', desc: '25Gでrelicを購入。' },
  rest: { id: 'rest', label: '休憩', desc: 'HPを回復。' },
  event: { id: 'event', label: 'イベント', desc: 'ランダムな効果が発生。' },
  elite: { id: 'elite', label: 'エリート', desc: '強敵。報酬も多い。' },
  boss: { id: 'boss', label: 'ボス', desc: '階層ボス。' },
};

export const WEAPONS = {
  dagger: { id: 'dagger', name: '短剣', attackDice: [4, 4, 4, 4, 4] },
  greatsword: { id: 'greatsword', name: '大剣', attackDice: [12] },
  spear: { id: 'spear', name: '槍', attackDice: [8, 8] },
  dualblade: { id: 'dualblade', name: '双剣', attackDice: [6, 6, 6] },
};

export const SKILLS = {
  reroll: { id: 'reroll', name: 'Reroll', uses: 1, type: 'rerollOne', desc: '最低値1個を振り直し' },
  addDie: { id: 'addDie', name: 'ダイス追加', uses: 1, type: 'addTempDie', value: 6, desc: '今回だけd6追加' },
  explode: { id: 'explode', name: '爆発ロール', uses: 1, type: 'explodeMax', desc: '最大値で追加ダイス' },
  floor: { id: 'floor', name: '最低保証', uses: 1, type: 'minFloor', value: 3, desc: '出目を最低3にする' },
  ignoreGuard: { id: 'ignoreGuard', name: '防御無視', uses: 1, type: 'ignoreDefense', desc: '防御比較を無視' },
};

export const RELICS = {
  evenPlus: { id: 'evenPlus', name: '偶数+1', desc: '攻撃ロールの偶数値を+1' },
  d6to8: { id: 'd6to8', name: 'd6をd8化', desc: '武器のd6をd8として扱う' },
  maxExtra: { id: 'maxExtra', name: '最大値で追加', desc: '最大値が出るごとにd4追加' },
  firstStrike: { id: 'firstStrike', name: '初手追加', desc: '各戦闘の初手攻撃にd6追加' },
  oddPlus: { id: 'oddPlus', name: '奇数+1', desc: '攻撃ロールの奇数値を+1' },
};

export const ENEMIES = {
  slime: { id: 'slime', name: 'スライム', hp: 8, atk: [4, 4, 4], def: [4, 4], reward: 12 },
  knight: { id: 'knight', name: '騎士', hp: 14, atk: [8], def: [8, 8, 6], reward: 18 },
  assassin: { id: 'assassin', name: '暗殺者', hp: 10, atk: [6, 6, 6], def: [8, 6], reward: 16 },
  giant: { id: 'giant', name: '巨人', hp: 20, atk: [12, 10], def: [10], reward: 25 },
  lichBoss: { id: 'lichBoss', name: '骨王', hp: 30, atk: [12, 8, 8], def: [10, 8, 8], reward: 50 },
};

export const EVENT_POOL = [
  { id: 'coin', text: '落ちていた金貨を拾った。', effect: (s) => (s.gold += 20) },
  { id: 'blood', text: '血の祭壇: HPを3失ってrelic獲得。', effect: (s, _rng, pickRelic) => { s.hp = Math.max(1, s.hp - 3); s.relics.push(pickRelic()); } },
];
