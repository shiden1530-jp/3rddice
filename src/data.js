export const ROOM_TYPES = ["battle", "chest", "gacha", "merchant", "rest", "event", "elite", "boss"];

export const WEAPONS = {
  dagger: { id: "dagger", name: "短剣", attackDice: [4, 4, 4, 4, 4], effects: [] },
  greatsword: { id: "greatsword", name: "大剣", attackDice: [12], effects: ["highVariance"] },
  spear: { id: "spear", name: "槍", attackDice: [8, 8], effects: ["pierce1"] },
  dualblade: { id: "dualblade", name: "双剣", attackDice: [6, 6, 6], effects: ["critPair"] },
};

export const SKILLS = {
  reroll: { id: "reroll", name: "Reroll", uses: 1, type: "rerollOne" },
  addDie: { id: "addDie", name: "ダイス追加", uses: 1, type: "addTempDie", value: 6 },
  explode: { id: "explode", name: "爆発ロール", uses: 1, type: "explodeMax" },
  floor: { id: "floor", name: "最低保証", uses: 1, type: "minFloor", value: 3 },
  ignoreGuard: { id: "ignoreGuard", name: "防御無視", uses: 1, type: "ignoreDefense" },
};

export const RELICS = {
  evenPlus: { id: "evenPlus", name: "偶数+1", desc: "攻撃ロールの偶数値を+1" },
  d6to8: { id: "d6to8", name: "d6をd8化", desc: "武器のd6をd8として扱う" },
  maxExtra: { id: "maxExtra", name: "最大値で追加", desc: "最大値が出るごとにd4を1個追加" },
  firstStrike: { id: "firstStrike", name: "初手追加", desc: "各戦闘の初手攻撃にd6追加" },
  oddPlus: { id: "oddPlus", name: "奇数+1", desc: "攻撃ロールの奇数値を+1" },
};

export const ENEMIES = {
  slime: { id: "slime", name: "スライム", hp: 8, atk: [4,4,4], def: [4,4], reward: 12 },
  knight: { id: "knight", name: "騎士", hp: 14, atk: [8], def: [8,8,6], reward: 18 },
  assassin: { id: "assassin", name: "暗殺者", hp: 10, atk: [6,6,6], def: [8,6], reward: 16 },
  giant: { id: "giant", name: "巨人", hp: 20, atk: [12,10], def: [10], reward: 25 },
  lichBoss: { id: "lichBoss", name: "骨王", hp: 30, atk: [12,8,8], def: [10,8,8], reward: 50 },
};

export const EVENT_POOL = [
  { id: "coin", text: "落ちていた金貨を拾った。", effect: (s) => (s.gold += 20) },
  { id: "blood", text: "血の祭壇: HPを3失ってレリック獲得。", effect: (s, rng, pickRelic) => { s.hp = Math.max(1, s.hp - 3); s.relics.push(pickRelic(rng)); } },
];
