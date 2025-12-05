// Mini Age of Empires II – Expanded
// Features: Minimap, Zivilisationen, Upgrades, KI-Schwierigkeitsgrade

const game = {
  tick: 0,
  speed: 1, // 1, 2, 4
  started: false,
  ages: ["", "Dunkles Zeitalter", "Feudalzeit", "Ritterzeit", "Imperium"],
  ageLevel: 1,
  civ: null,
  aiDifficulty: null,
  resources: { food: 200, wood: 200, gold: 100, stone: 0 },
  villagers: [], // tasks: food, wood, gold, stone, build, idle
  buildings: {
    houses: 0,
    barracks: 0,
    range: 0,
    stable: 0,
    blacksmith: 0,
    market: 0
  },
  military: {
    inf: 0,
    spear: 0,
    skirm: 0,
    archer: 0,
    cav: 0
  },
  tech: {
    // Eco
    doubleBit: false,
    horseCollar: false,
    wheelbarrow: false,
    handcart: false,
    // Military
    forging: false,
    ironCasting: false,
    fletching: false,
    bodkin: false,
    armorInf: false,
    armorArch: false
  },
  baseHPMax: 120,
  baseHP: 120,
  enemy: {
    baseHPMax: 300,
    baseHP: 300,
    strength: 12,
    timer: 35,
    timerBase: 35,
    level: 1,
    ecoBonus: 1.0,
    strengthGrowth: 6,
    minTimerBase: 18
  },
  map: {
    width: 16,
    height: 16,
    tiles: [], // strings: "grass","forest","gold","stone","water","player","enemy"
    playerPos: { x: 3, y: 12 },
    enemyPos: { x: 12, y: 3 }
  }
};

const CIV_LABELS = {
  vikings: "Wikinger",
  franks: "Franken",
  mongols: "Mongolen",
  aztecs: "Azteken"
};

const DIFF_LABELS = {
  easy: "Leicht",
  normal: "Normal",
  hard: "Schwer"
};

// ---- Utility ----

function totalPop() {
  return (
    game.villagers.length +
    game.military.inf +
    game.military.spear +
    game.military.skirm +
    game.military.archer +
    game.military.cav
  );
}

function popCap() {
  const base = 5;
  const perHouse = 5;
  return base + game.buildings.houses * perHouse;
}

function canAfford(cost) {
  return (
    game.resources.food >= (cost.food || 0) &&
    game.resources.wood >= (cost.wood || 0) &&
    game.resources.gold >= (cost.gold || 0) &&
    game.resources.stone >= (cost.stone || 0)
  );
}

function pay(cost) {
  game.resources.food -= cost.food || 0;
  game.resources.wood -= cost.wood || 0;
  game.resources.gold -= cost.gold || 0;
  game.resources.stone -= cost.stone || 0;
}

// Ressourcenbasis pro Villager
function baseRateForTask(task) {
  switch (task) {
    case "food": return 5;
    case "wood": return 5;
    case "gold": return 4;
    case "stone": return 3;
    default: return 0;
  }
}

function ecoMultiplierForTask(task) {
  let mul = 1.0;

  // Zeitalter
  if (game.ageLevel === 2) mul *= 1.10;
  if (game.ageLevel === 3) mul *= 1.25;
  if (game.ageLevel === 4) mul *= 1.40;

  // Allgemeine Eco-Techs
  if (game.tech.wheelbarrow) mul *= 1.15;
  if (game.tech.handcart) mul *= 1.20;

  // Spezifische Eco-Techs
  if (task === "wood" && game.tech.doubleBit) mul *= 1.20;
  if (task === "food" && game.tech.horseCollar) mul *= 1.20;

  // Zivilisations-Boni
  if (game.civ === "vikings" && task === "wood") mul *= 1.15;
  if (game.civ === "franks" && task === "food") mul *= 1.10;
  if (game.civ === "mongols" && task === "food") mul *= 1.20;
  if (game.civ === "aztecs" && task === "gold") mul *= 1.20;

  return mul;
}

// Logging

function logMessage(msg, type = "system") {
  const logEl = document.getElementById("log");
  if (!logEl) return;
  const div = document.createElement("div");
  if (type === "good") div.className = "log-good";
  else if (type === "bad") div.className = "log-bad";
  else if (type === "danger") div.className = "log-danger";
  else div.className = "log-system";
  const t = game.tick.toString().padStart(3, "0");
  div.textContent = `[${t}s] ${msg}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

// ---- Minimap ----

function generateMap() {
  const w = game.map.width;
  const h = game.map.height;
  const tiles = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tiles.push("grass");
    }
  }

  function addPatch(type, count, size) {
    for (let i = 0; i < count; i++) {
      const px = Math.floor(Math.random() * w);
      const py = Math.floor(Math.random() * h);
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && Math.random() < 0.6) {
            tiles[ny * w + nx] = type;
          }
        }
      }
    }
  }

  addPatch("forest", 4, 2);
  addPatch("gold", 2, 1);
  addPatch("stone", 2, 1);
  addPatch("water", 2, 2);

  game.map.playerPos = { x: 3, y: h - 4 };
  game.map.enemyPos = { x: w - 4, y: 3 };

  tiles[game.map.playerPos.y * w + game.map.playerPos.x] = "player";
  tiles[game.map.enemyPos.y * w + game.map.enemyPos.x] = "enemy";

  game.map.tiles = tiles;
}

function renderMinimap() {
  const mm = document.getElementById("minimap");
  if (!mm) return;
  mm.innerHTML = "";
  const w = game.map.width;

  game.map.tiles.forEach((tileType, index) => {
    const div = document.createElement("div");
    div.classList.add("minimap-tile", "tile-" + tileType);
    const x = index % w;
    const y = Math.floor(index / w);
    div.title = `${x}, ${y}`;
    div.addEventListener("click", () => {
      logMessage(`Minimap: Klick auf Feld (${x}, ${y}) – Typ: ${tileType}.`, "system");
    });
    mm.appendChild(div);
  });
}

// ---- UI ----

function updateUI() {
  const tickEl = document.getElementById("ui-tick");
  if (!tickEl) return;
  tickEl.textContent = game.tick;
  document.getElementById("ui-age").textContent = game.ages[game.ageLevel];
  document.getElementById("ui-civ").textContent = game.civ ? CIV_LABELS[game.civ] : "–";
  document.getElementById("ui-diff").textContent = game.aiDifficulty ? DIFF_LABELS[game.aiDifficulty] : "–";

  const pop = totalPop();
  const cap = popCap();
  document.getElementById("ui-pop").textContent = `${pop} / ${cap}`;

  document.getElementById("ui-food").textContent = Math.floor(game.resources.food);
  document.getElementById("ui-wood").textContent = Math.floor(game.resources.wood);
  document.getElementById("ui-gold").textContent = Math.floor(game.resources.gold);
  document.getElementById("ui-stone").textContent = Math.floor(game.resources.stone);

  const counts = { food: 0, wood: 0, gold: 0, stone: 0, build: 0, idle: 0 };
  game.villagers.forEach(t => counts[t]++);
  document.getElementById("ui-vils-count").textContent = game.villagers.length;
  document.getElementById("ui-task-food").textContent = counts.food;
  document.getElementById("ui-task-wood").textContent = counts.wood;
  document.getElementById("ui-task-gold").textContent = counts.gold;
  document.getElementById("ui-task-stone").textContent = counts.stone;
  document.getElementById("ui-task-build").textContent = counts.build;
  document.getElementById("ui-task-idle").textContent = counts.idle;

  const rateFood = counts.food * baseRateForTask("food") * ecoMultiplierForTask("food");
  const rateWood = counts.wood * baseRateForTask("wood") * ecoMultiplierForTask("wood");
  const rateGold = counts.gold * baseRateForTask("gold") * ecoMultiplierForTask("gold");
  const rateStone = counts.stone * baseRateForTask("stone") * ecoMultiplierForTask("stone");
  document.getElementById("ui-rate-food").textContent = rateFood.toFixed(1);
  document.getElementById("ui-rate-wood").textContent = rateWood.toFixed(1);
  document.getElementById("ui-rate-gold").textContent = rateGold.toFixed(1);
  document.getElementById("ui-rate-stone").textContent = rateStone.toFixed(1);

  document.getElementById("ui-houses").textContent = game.buildings.houses;
  document.getElementById("ui-barracks").textContent = game.buildings.barracks;
  document.getElementById("ui-ranges").textContent = game.buildings.range;
  document.getElementById("ui-stables").textContent = game.buildings.stable;
  document.getElementById("ui-blacksmiths").textContent = game.buildings.blacksmith;
  document.getElementById("ui-markets").textContent = game.buildings.market;

  document.getElementById("ui-mil-inf").textContent = game.military.inf;
  document.getElementById("ui-mil-spear").textContent = game.military.spear;
  document.getElementById("ui-mil-skirm").textContent = game.military.skirm;
  document.getElementById("ui-mil-archer").textContent = game.military.archer;
  document.getElementById("ui-mil-cav").textContent = game.military.cav;

  const baseRatio = Math.max(0, game.baseHP) / game.baseHPMax;
  const enemyRatio = Math.max(0, game.enemy.baseHP) / game.enemy.baseHPMax;
  const baseBar = document.getElementById("ui-base-hp-bar");
  const enemyBar = document.getElementById("ui-enemy-hp-bar");
  baseBar.style.width = (baseRatio * 100) + "%";
  enemyBar.style.width = (enemyRatio * 100) + "%";
  document.getElementById("ui-base-hp-label").textContent =
    `${Math.max(0, Math.floor(game.baseHP))} / ${game.baseHPMax}`;
  document.getElementById("ui-enemy-hp-label").textContent =
    `${Math.max(0, Math.floor(game.enemy.baseHP))} / ${game.enemy.baseHPMax}`;
}

// ---- Kampfwerte ----

function infantryAttack() {
  let atk = 6;
  if (game.tech.forging) atk += 1;
  if (game.tech.ironCasting) atk += 1;
  if (game.civ === "aztecs") atk *= 1.15;
  return atk;
}

function cavAttack() {
  let atk = 10;
  if (game.tech.forging) atk += 1;
  if (game.tech.ironCasting) atk += 1;
  if (game.civ === "franks") atk += 1;
  return atk;
}

function archerAttack() {
  let atk = 7;
  if (game.tech.fletching) atk += 1;
  if (game.tech.bodkin) atk += 1;
  if (game.civ === "vikings") atk += 0.5;
  return atk;
}

function skirmAttack() {
  let atk = 4;
  if (game.tech.fletching) atk += 1;
  if (game.tech.bodkin) atk += 1;
  return atk;
}

function spearAttack() {
  let atk = 5;
  if (game.tech.forging) atk += 1;
  if (game.tech.ironCasting) atk += 1;
  return atk;
}

function armorInfantry() {
  let arm = 0;
  if (game.tech.armorInf) arm += 1;
  return arm;
}

function armorArchers() {
  let arm = 0;
  if (game.tech.armorArch) arm += 1;
  return arm;
}

// ---- Tick-Logik ----

function gameTickLogic() {
  if (!game.started) return;
  if (game.baseHP <= 0 || game.enemy.baseHP <= 0) return;

  game.tick++;

  game.villagers.forEach(task => {
    const base = baseRateForTask(task);
    const mul = ecoMultiplierForTask(task);
    const gain = base * mul;
    if (task === "food") game.resources.food += gain;
    if (task === "wood") game.resources.wood += gain;
    if (task === "gold") game.resources.gold += gain;
    if (task === "stone") game.resources.stone += gain;
  });

  game.enemy.timer -= 1;
  if (game.enemy.timer <= 0) {
    enemyAttack();
    game.enemy.level++;
    game.enemy.strength += game.enemy.strengthGrowth;
    game.enemy.timerBase = Math.max(game.enemy.minTimerBase, game.enemy.timerBase - 1);
    game.enemy.timer = game.enemy.timerBase;
  }

  if (game.baseHP <= 0) {
    game.baseHP = 0;
    logMessage("Deine Stadt wird niedergebrannt. Niederlage.", "danger");
  } else if (game.enemy.baseHP <= 0) {
    game.enemy.baseHP = 0;
    logMessage("Die feindliche Festung bricht zusammen. Sieg!", "good");
  }
}

function mainLoop() {
  for (let i = 0; i < game.speed; i++) {
    gameTickLogic();
  }
  updateUI();
}

// ---- Feind-KI ----

function enemyAttack() {
  let enemyPower = game.enemy.strength * game.enemy.ecoBonus;

  const totalArmy =
    game.military.inf +
    game.military.spear +
    game.military.skirm +
    game.military.archer +
    game.military.cav;

  let counterBonus = 0;
  if (totalArmy > 0) {
    const archerShare = (game.military.archer + game.military.skirm) / totalArmy;
    if (archerShare > 0.6) counterBonus += 0.2 * enemyPower;
    const cavShare = game.military.cav / totalArmy;
    if (cavShare > 0.4) counterBonus += 0.15 * enemyPower;
  }
  enemyPower += counterBonus;

  const defInf = (4 + armorInfantry());
  const defSpear = (5 + armorInfantry());
  const defSkirm = (3 + armorArchers());
  const defArch = (3 + armorArchers());
  const defCav = 6;

  let defense =
    game.military.inf * defInf +
    game.military.spear * defSpear +
    game.military.skirm * defSkirm +
    game.military.archer * defArch +
    game.military.cav * defCav;

  const damageToBase = Math.max(0, enemyPower - defense * 0.6);

  const lossFactor = enemyPower / 45;
  const lose = (count, m) => Math.min(count, Math.floor(lossFactor * m));

  const lostInf = lose(game.military.inf, 1.8);
  const lostSpear = lose(game.military.spear, 1.4);
  const lostSkirm = lose(game.military.skirm, 1.3);
  const lostArch = lose(game.military.archer, 1.6);
  const lostCav = lose(game.military.cav, 2.0);

  game.military.inf -= lostInf;
  game.military.spear -= lostSpear;
  game.military.skirm -= lostSkirm;
  game.military.archer -= lostArch;
  game.military.cav -= lostCav;
  game.baseHP -= damageToBase;

  if (damageToBase === 0 && (lostInf + lostSpear + lostSkirm + lostArch + lostCav === 0)) {
    logMessage("Ein feindlicher Angriff wird vollständig abgewehrt.", "good");
  } else {
    let msg = "Feindlicher Angriff! ";
    if (damageToBase > 0) msg += `Deine Gebäude erleiden ${Math.floor(damageToBase)} Schaden. `;
    if (lostInf + lostSpear + lostSkirm + lostArch + lostCav > 0) {
      msg += "Verluste: ";
      if (lostInf) msg += `${lostInf} Infanterie `;
      if (lostSpear) msg += `${lostSpear} Speerträger `;
      if (lostSkirm) msg += `${lostSkirm} Plänkler `;
      if (lostArch) msg += `${lostArch} Bogenschützen `;
      if (lostCav) msg += `${lostCav} Reiter `;
    }
    logMessage(msg, "danger");
  }
}

// ---- Spieleraktionen ----

function ensureVillager() {
  if (game.villagers.length === 0) {
    logMessage("Du hast keine Dorfbewohner.", "bad");
    return false;
  }
  return true;
}

function reassignVillager(task) {
  if (!ensureVillager()) return;
  game.villagers[0] = task;
  logMessage(`Ein Dorfbewohner arbeitet nun an: ${task}.`, "system");
  updateUI();
}

function trainVillager() {
  const cost = { food: 50 };
  if (!canAfford(cost)) {
    logMessage("Zu wenig Nahrung für einen neuen Villager.", "bad");
    return;
  }
  if (totalPop() >= popCap()) {
    logMessage("Bevölkerungsgrenze erreicht. Baue mehr Häuser.", "bad");
    return;
  }
  pay(cost);
  game.villagers.push("food");
  logMessage("Ein neuer Dorfbewohner wurde ausgebildet.", "good");
  updateUI();
}

function buildHouse() {
  const cost = { wood: 25 };
  if (!canAfford(cost)) {
    logMessage("Zu wenig Holz für ein Haus.", "bad");
    return;
  }
  pay(cost);
  game.buildings.houses += 1;
  logMessage("Ein Haus wurde gebaut. Bevölkerungsgrenze erhöht.", "good");
  updateUI();
}

function buildBuilding(type, label, cost) {
  if (!canAfford(cost)) {
    logMessage(`Zu wenig Ressourcen für ${label}.`, "bad");
    return;
  }
  pay(cost);
  game.buildings[type] += 1;
  logMessage(`${label} wurde errichtet.`, "good");
  updateUI();
}

function trainUnit(kind, label, cost, requirementKey) {
  if (requirementKey && game.buildings[requirementKey] <= 0) {
    logMessage(`Du benötigst ein entsprechendes Gebäude, um ${label} auszubilden.`, "bad");
    return;
  }
  if (!canAfford(cost)) {
    logMessage(`Zu wenig Ressourcen für ${label}.`, "bad");
    return;
  }
  if (totalPop() >= popCap()) {
    logMessage("Bevölkerungsgrenze erreicht. Baue mehr Häuser.", "bad");
    return;
  }
  pay(cost);
  game.military[kind] += 1;
  logMessage(`${label} wurde ausgebildet.`, "good");
  updateUI();
}

function buyTech(key, label, cost, requirementFn) {
  if (game.tech[key]) {
    logMessage(`Technologie ${label} wurde bereits erforscht.`, "bad");
    return;
  }
  if (requirementFn && !requirementFn()) {
    logMessage(`Voraussetzungen für ${label} sind noch nicht erfüllt.`, "bad");
    return;
  }
  if (!canAfford(cost)) {
    logMessage(`Zu wenig Ressourcen für ${label}.`, "bad");
    return;
  }
  pay(cost);
  game.tech[key] = true;
  logMessage(`Technologie ${label} erforscht.`, "good");
  updateUI();
}

function ageUp(targetLevel, label, cost) {
  if (game.ageLevel >= targetLevel) {
    logMessage(`Du befindest dich bereits in der ${label} oder höher.`, "bad");
    return;
  }
  if (!canAfford(cost)) {
    logMessage(`Zu wenig Ressourcen für den Aufstieg in die ${label}.`, "bad");
    return;
  }
  pay(cost);
  game.ageLevel = targetLevel;
  game.baseHPMax += 15;
  game.baseHP = Math.max(game.baseHP, game.baseHPMax * 0.75);
  logMessage(`Du steigst in die ${label} auf. Deine Zivilisation wird effizienter.`, "good");
  updateUI();
}

// ---- Angriffe des Spielers ----

function computeAttackPower(multiplier) {
  let atk =
    game.military.inf * infantryAttack() +
    game.military.spear * spearAttack() +
    game.military.skirm * skirmAttack() +
    game.military.archer * archerAttack() +
    game.military.cav * cavAttack();
  return atk * multiplier;
}

function computeOwnLosses(powerMultiplier) {
  const enemyPower = game.enemy.strength;
  const factor = (enemyPower / 45) * powerMultiplier;
  const lose = (count, m) => Math.min(count, Math.floor(factor * m));
  return {
    inf: lose(game.military.inf, 1.5),
    spear: lose(game.military.spear, 1.3),
    skirm: lose(game.military.skirm, 1.4),
    arch: lose(game.military.archer, 1.7),
    cav: lose(game.military.cav, 2.0)
  };
}

function applyLosses(losses) {
  game.military.inf -= losses.inf;
  game.military.spear -= losses.spear;
  game.military.skirm -= losses.skirm;
  game.military.archer -= losses.arch;
  game.military.cav -= losses.cav;
}

function attackEnemyRaid() {
  const armySize =
    game.military.inf +
    game.military.spear +
    game.military.skirm +
    game.military.archer +
    game.military.cav;

  if (armySize === 0) {
    logMessage("Du hast keine Armee für einen Überfall.", "bad");
    return;
  }

  const attack = computeAttackPower(0.8);
  const enemyArmor = 15 + game.enemy.level * 3;
  const damage = Math.max(5, Math.floor(attack - enemyArmor));
  game.enemy.baseHP -= damage;

  const losses = computeOwnLosses(0.6);
  applyLosses(losses);

  let msg = `Du führst einen Überfall durch und verursachst ${damage} Schaden. `;
  if (Object.values(losses).some(v => v > 0)) {
    msg += "Verluste: ";
    if (losses.inf) msg += `${losses.inf} Infanterie `;
    if (losses.spear) msg += `${losses.spear} Speerträger `;
    if (losses.skirm) msg += `${losses.skirm} Plänkler `;
    if (losses.arch) msg += `${losses.arch} Bogenschützen `;
    if (losses.cav) msg += `${losses.cav} Reiter `;
    logMessage(msg, "bad");
  } else {
    logMessage(msg + "Deine Truppe kehrt unversehrt zurück.", "good");
  }

  if (game.enemy.baseHP <= 0) {
    game.enemy.baseHP = 0;
    logMessage("Die feindliche Festung bricht zusammen. Sieg!", "good");
  }
  updateUI();
}

function attackEnemyPush() {
  const armySize =
    game.military.inf +
    game.military.spear +
    game.military.skirm +
    game.military.archer +
    game.military.cav;

  if (armySize === 0) {
    logMessage("Du hast keine Armee für einen grossen Angriff.", "bad");
    return;
  }

  const attack = computeAttackPower(1.3);
  const enemyArmor = 10 + game.enemy.level * 2.5;
  const damage = Math.max(10, Math.floor(attack - enemyArmor));
  game.enemy.baseHP -= damage;

  const losses = computeOwnLosses(1.0);
  applyLosses(losses);

  let msg = `Du startest einen grossen Angriff und verursachst ${damage} Schaden. `;
  if (Object.values(losses).some(v => v > 0)) {
    msg += "Verluste: ";
    if (losses.inf) msg += `${losses.inf} Infanterie `;
    if (losses.spear) msg += `${losses.spear} Speerträger `;
    if (losses.skirm) msg += `${losses.skirm} Plänkler `;
    if (losses.arch) msg += `${losses.arch} Bogenschützen `;
    if (losses.cav) msg += `${losses.cav} Reiter `;
  }
  logMessage(msg, "bad");

  if (game.enemy.baseHP <= 0) {
    game.enemy.baseHP = 0;
    logMessage("Die feindliche Festung bricht zusammen. Sieg!", "good");
  }
  updateUI();
}

// ---- Speed ----

function setSpeed(mult) {
  game.speed = mult;
  logMessage(`Spielgeschwindigkeit auf x${mult} gesetzt.`, "system");
}

// ---- Setup (Ziv & Schwierigkeit) ----

function applyDifficulty(diff) {
  game.aiDifficulty = diff;
  if (diff === "easy") {
    game.enemy.ecoBonus = 0.9;
    game.enemy.strengthGrowth = 4;
    game.enemy.timerBase = 40;
    game.enemy.minTimerBase = 25;
  } else if (diff === "normal") {
    game.enemy.ecoBonus = 1.0;
    game.enemy.strengthGrowth = 6;
    game.enemy.timerBase = 32;
    game.enemy.minTimerBase = 20;
  } else if (diff === "hard") {
    game.enemy.ecoBonus = 1.25;
    game.enemy.strengthGrowth = 8;
    game.enemy.timerBase = 26;
    game.enemy.minTimerBase = 16;
  }
  game.enemy.timer = game.enemy.timerBase;
}

function setupOverlayInit() {
  const civBtns = document.querySelectorAll(".setup-btn[data-civ]");
  const diffBtns = document.querySelectorAll(".setup-btn[data-diff]");
  const civLabel = document.getElementById("setup-civ-label");
  const diffLabel = document.getElementById("setup-diff-label");
  const startBtn = document.getElementById("setup-start-btn");
  const overlay = document.getElementById("setup-overlay");

  civBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      civBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      const civ = btn.getAttribute("data-civ");
      game.civ = civ;
      civLabel.textContent = CIV_LABELS[civ];
      maybeEnableStart();
    });
  });

  diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      diffBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      const diff = btn.getAttribute("data-diff");
      applyDifficulty(diff);
      diffLabel.textContent = DIFF_LABELS[diff];
      maybeEnableStart();
    });
  });

  function maybeEnableStart() {
    if (game.civ && game.aiDifficulty) {
      startBtn.disabled = false;
    }
  }

  startBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    startGame();
  });
}

function startGame() {
  game.started = true;

  for (let i = 0; i < 3; i++) game.villagers.push("food");

  logMessage(
    `Deine ${CIV_LABELS[game.civ]} erreichen ein neues Land. Führe sie durch die Zeitalter!`,
    "system"
  );

  updateUI();
}

// ---- Button-Handler ----

function handleAction(action) {
  switch (action) {
    case "assign-food": return reassignVillager("food");
    case "assign-wood": return reassignVillager("wood");
    case "assign-gold": return reassignVillager("gold");
    case "assign-stone": return reassignVillager("stone");
    case "assign-idle": return reassignVillager("idle");
    case "train-villager": return trainVillager();
    case "build-house": return buildHouse();

    case "build-barracks":
      return buildBuilding("barracks", "eine Kaserne", { wood: 175 });
    case "build-range":
      return buildBuilding("range", "eine Schießanlage", { wood: 200, gold: 50 });
    case "build-stable":
      return buildBuilding("stable", "einen Stall", { wood: 175, gold: 75 });
    case "build-blacksmith":
      return buildBuilding("blacksmith", "eine Schmiede", { wood: 150 });
    case "build-market":
      return buildBuilding("market", "einen Markt", { wood: 150, gold: 75 });

    case "train-militia":
      return trainUnit("inf", "Infanterist", { food: 60, gold: 20 }, "barracks");
    case "train-spear":
      return trainUnit("spear", "Speerträger", { food: 50, wood: 35 }, "barracks");
    case "train-skirm":
      return trainUnit("skirm", "Plänkler", { food: 40, wood: 30 }, "range");
    case "train-archer":
      return trainUnit("archer", "Bogenschütze", { wood: 50, gold: 45 }, "range");
    case "train-scout":
      return trainUnit("cav", "Kundschafter", { food: 80, gold: 40 }, "stable");

    case "tech-doublebit":
      return buyTech("doubleBit", "Doppelaxt", { food: 100, gold: 50 }, () => true);
    case "tech-horse-collar":
      return buyTech("horseCollar", "Pflug", { food: 125, gold: 75 }, () => true);
    case "tech-wheelbarrow":
      return buyTech("wheelbarrow", "Schubkarre", { food: 175, gold: 75 }, () => game.buildings.market > 0);
    case "tech-handcart":
      return buyTech("handcart", "Handkarren", { food: 300, gold: 200 }, () => game.tech.wheelbarrow);

    case "tech-forging":
      return buyTech("forging", "Schmieden", { food: 150, gold: 75 }, () => game.buildings.blacksmith > 0);
    case "tech-iron-casting":
      return buyTech("ironCasting", "Eisenschmelze", { food: 220, gold: 120 }, () => game.tech.forging);
    case "tech-fletching":
      return buyTech("fletching", "Fletching", { food: 120, gold: 100 }, () => game.buildings.blacksmith > 0);
    case "tech-bodkin":
      return buyTech("bodkin", "Bodkin Arrow", { food: 200, gold: 150 }, () => game.tech.fletching);
    case "tech-armor-inf":
      return buyTech("armorInf", "Infanterierüstung", { food: 150, gold: 100 }, () => game.buildings.blacksmith > 0);
    case "tech-armor-arch":
      return buyTech("armorArch", "Fernkämpferrüstung", { food: 150, gold: 100 }, () => game.buildings.blacksmith > 0);

    case "age-feudal":
      return ageUp(2, "Feudalzeit", { food: 500, gold: 200 });
    case "age-castle":
      return ageUp(3, "Ritterzeit", { food: 800, gold: 500 });
    case "age-imperial":
      return ageUp(4, "Imperium", { food: 1200, gold: 800 });

    case "attack-raid":
      return attackEnemyRaid();
    case "attack-push":
      return attackEnemyPush();

    case "speed-1":
      return setSpeed(1);
    case "speed-2":
      return setSpeed(2);
    case "speed-4":
      return setSpeed(4);
  }
}

// ---- Init ----

function initGame() {
  generateMap();
  renderMinimap();

  document.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      handleAction(action);
    });
  });

  setupOverlayInit();
  updateUI();

  setInterval(mainLoop, 1000);
}

document.addEventListener("DOMContentLoaded", initGame);
