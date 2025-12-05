// Makrospiel + 256x256 HD-Minimap mit AoE2-Kartentypen

// -------- Makrospiel-State --------

const macroGame = {
  tick: 0,
  speed: 1,
  ageLevel: 1,
  ages: ["", "Dunkles Zeitalter", "Feudalzeit", "Ritterzeit", "Imperium"],
  civ: "franks",
  aiDifficulty: "normal",
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
    archer: 0,
    cav: 0
  },
  tech: {
    doubleBit: false,
    horseCollar: false,
    wheelbarrow: false,
    forging: false,
    fletching: false,
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
    level: 1
  }
};

// -------- Utility Makrospiel --------

function totalPop() {
  return (
    macroGame.villagers.length +
    macroGame.military.inf +
    macroGame.military.spear +
    macroGame.military.archer +
    macroGame.military.cav
  );
}

function popCap() {
  const base = 5;
  const perHouse = 5;
  return base + macroGame.buildings.houses * perHouse;
}

function canAfford(cost) {
  return (
    macroGame.resources.food >= (cost.food || 0) &&
    macroGame.resources.wood >= (cost.wood || 0) &&
    macroGame.resources.gold >= (cost.gold || 0) &&
    macroGame.resources.stone >= (cost.stone || 0)
  );
}

function pay(cost) {
  macroGame.resources.food -= cost.food || 0;
  macroGame.resources.wood -= cost.wood || 0;
  macroGame.resources.gold -= cost.gold || 0;
  macroGame.resources.stone -= cost.stone || 0;
}

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
  let mul = 1;
  if (macroGame.ageLevel >= 2) mul *= 1.1;
  if (macroGame.ageLevel >= 3) mul *= 1.2;
  if (macroGame.ageLevel >= 4) mul *= 1.3;
  if (task === "wood" && macroGame.tech.doubleBit) mul *= 1.2;
  if (task === "food" && macroGame.tech.horseCollar) mul *= 1.2;
  if (macroGame.tech.wheelbarrow) mul *= 1.15;
  if (macroGame.civ === "franks" && task === "food") mul *= 1.1;
  return mul;
}

// Logging (gemeinsam mit Minimap)

function logMessage(msg, type = "system") {
  const logEl = document.getElementById("log");
  if (!logEl) return;
  const div = document.createElement("div");
  if (type === "good") div.className = "log-good";
  else if (type === "bad") div.className = "log-bad";
  else if (type === "danger") div.className = "log-danger";
  else div.className = "log-system";
  const t = macroGame.tick.toString().padStart(3, "0");
  div.textContent = `[${t}s] ${msg}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

// -------- UI Makrospiel --------

function updateMacroUI() {
  document.getElementById("ui-tick").textContent = macroGame.tick;
  document.getElementById("ui-age").textContent = macroGame.ages[macroGame.ageLevel];
  document.getElementById("ui-civ").textContent = "Franken";
  document.getElementById("ui-diff").textContent = "Normal";

  const pop = totalPop();
  const cap = popCap();
  document.getElementById("ui-pop").textContent = `${pop} / ${cap}`;

  document.getElementById("ui-food").textContent = Math.floor(macroGame.resources.food);
  document.getElementById("ui-wood").textContent = Math.floor(macroGame.resources.wood);
  document.getElementById("ui-gold").textContent = Math.floor(macroGame.resources.gold);
  document.getElementById("ui-stone").textContent = Math.floor(macroGame.resources.stone);

  const counts = { food:0, wood:0, gold:0, stone:0, build:0, idle:0 };
  macroGame.villagers.forEach(t => counts[t]++);
  document.getElementById("ui-vils-count").textContent = macroGame.villagers.length;
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

  document.getElementById("ui-houses").textContent = macroGame.buildings.houses;
  document.getElementById("ui-barracks").textContent = macroGame.buildings.barracks;
  document.getElementById("ui-ranges").textContent = macroGame.buildings.range;
  document.getElementById("ui-stables").textContent = macroGame.buildings.stable;
  document.getElementById("ui-blacksmiths").textContent = macroGame.buildings.blacksmith;
  document.getElementById("ui-markets").textContent = macroGame.buildings.market;

  document.getElementById("ui-mil-inf").textContent = macroGame.military.inf;
  document.getElementById("ui-mil-spear").textContent = macroGame.military.spear;
  document.getElementById("ui-mil-archer").textContent = macroGame.military.archer;
  document.getElementById("ui-mil-cav").textContent = macroGame.military.cav;

  const baseRatio = Math.max(0, macroGame.baseHP) / macroGame.baseHPMax;
  const enemyRatio = Math.max(0, macroGame.enemy.baseHP) / macroGame.enemy.baseHPMax;
  const baseBar = document.getElementById("ui-base-hp-bar");
  const enemyBar = document.getElementById("ui-enemy-hp-bar");
  baseBar.style.width = (baseRatio * 100) + "%";
  enemyBar.style.width = (enemyRatio * 100) + "%";
  document.getElementById("ui-base-hp-label").textContent =
    `${Math.max(0, Math.floor(macroGame.baseHP))} / ${macroGame.baseHPMax}`;
  document.getElementById("ui-enemy-hp-label").textContent =
    `${Math.max(0, Math.floor(macroGame.enemy.baseHP))} / ${macroGame.enemy.baseHPMax}`;
}

// -------- Makrospiel-Logik --------

function ensureVillager() {
  if (macroGame.villagers.length === 0) {
    logMessage("Du hast keine Dorfbewohner.", "bad");
    return false;
  }
  return true;
}

function reassignVillager(task) {
  if (!ensureVillager()) return;
  macroGame.villagers[0] = task;
  logMessage(`Ein Dorfbewohner arbeitet nun an: ${task}.`, "system");
  updateMacroUI();
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
  macroGame.villagers.push("food");
  logMessage("Ein neuer Dorfbewohner wurde ausgebildet.", "good");
  updateMacroUI();
}

function buildHouse() {
  const cost = { wood: 25 };
  if (!canAfford(cost)) {
    logMessage("Zu wenig Holz für ein Haus.", "bad");
    return;
  }
  pay(cost);
  macroGame.buildings.houses += 1;
  logMessage("Ein Haus wurde gebaut. Bevölkerungsgrenze erhöht.", "good");
  updateMacroUI();
}

function buildBuilding(type, label, cost) {
  if (!canAfford(cost)) {
    logMessage(`Zu wenig Ressourcen für ${label}.`, "bad");
    return;
  }
  pay(cost);
  macroGame.buildings[type] += 1;
  logMessage(`${label} wurde errichtet.`, "good");
  updateMacroUI();
}

function trainUnit(kind, label, cost, requirementKey) {
  if (requirementKey && macroGame.buildings[requirementKey] <= 0) {
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
  macroGame.military[kind] += 1;
  logMessage(`${label} wurde ausgebildet.`, "good");
  updateMacroUI();
}

function buyTech(key, label, cost) {
  if (macroGame.tech[key]) {
    logMessage(`Technologie ${label} wurde bereits erforscht.`, "bad");
    return;
  }
  if (!canAfford(cost)) {
    logMessage(`Zu wenig Ressourcen für ${label}.`, "bad");
    return;
  }
  pay(cost);
  macroGame.tech[key] = true;
  logMessage(`Technologie ${label} erforscht.`, "good");
  updateMacroUI();
}

function ageUp(targetLevel, label, cost) {
  if (macroGame.ageLevel >= targetLevel) {
    logMessage(`Du befindest dich bereits in der ${label} oder höher.`, "bad");
    return;
  }
  if (!canAfford(cost)) {
    logMessage(`Zu wenig Ressourcen für den Aufstieg in die ${label}.`, "bad");
    return;
  }
  pay(cost);
  macroGame.ageLevel = targetLevel;
  macroGame.baseHPMax += 15;
  macroGame.baseHP = Math.max(macroGame.baseHP, macroGame.baseHPMax * 0.75);
  logMessage(`Du steigst in die ${label} auf. Deine Zivilisation wird effizienter.`, "good");
  updateMacroUI();
}

// Kampfgrößen (abstrakt)

function infantryAttack() {
  let atk = 6;
  if (macroGame.tech.forging) atk += 1;
  if (macroGame.civ === "franks") atk += 0.5;
  return atk;
}

function archerAttack() {
  let atk = 7;
  if (macroGame.tech.fletching) atk += 1;
  return atk;
}

function cavAttack() {
  let atk = 9;
  if (macroGame.tech.forging) atk += 1;
  return atk;
}

function armorInfantry() { return macroGame.tech.armorInf ? 1 : 0; }
function armorArchers() { return macroGame.tech.armorArch ? 1 : 0; }

function computeAttackPower(multiplier) {
  let atk =
    macroGame.military.inf * infantryAttack() +
    macroGame.military.spear * (infantryAttack() - 1) +
    macroGame.military.archer * archerAttack() +
    macroGame.military.cav * cavAttack();
  return atk * multiplier;
}

function computeOwnLosses(powerMultiplier) {
  const enemyPower = macroGame.enemy.strength;
  const factor = (enemyPower / 45) * powerMultiplier;
  const lose = (count, m) => Math.min(count, Math.floor(factor * m));
  return {
    inf: lose(macroGame.military.inf, 1.5),
    spear: lose(macroGame.military.spear, 1.3),
    archer: lose(macroGame.military.archer, 1.7),
    cav: lose(macroGame.military.cav, 2.0)
  };
}

function applyLosses(losses) {
  macroGame.military.inf -= losses.inf;
  macroGame.military.spear -= losses.spear;
  macroGame.military.archer -= losses.archer;
  macroGame.military.cav -= losses.cav;
}

function attackEnemy(multiplier, label) {
  const armySize =
    macroGame.military.inf +
    macroGame.military.spear +
    macroGame.military.archer +
    macroGame.military.cav;

  if (armySize === 0) {
    logMessage("Du hast keine Armee für einen Angriff.", "bad");
    return;
  }

  const attack = computeAttackPower(multiplier);
  const enemyArmor = 10 + macroGame.enemy.level * 3;
  const damage = Math.max(5, Math.floor(attack - enemyArmor));
  macroGame.enemy.baseHP -= damage;

  const losses = computeOwnLosses(multiplier);
  applyLosses(losses);

  let msg = `Du startest einen ${label} und verursachst ${damage} Schaden. `;
  if (Object.values(losses).some(v => v > 0)) {
    msg += "Verluste: ";
    if (losses.inf) msg += `${losses.inf} Infanterie `;
    if (losses.spear) msg += `${losses.spear} Speerträger `;
    if (losses.archer) msg += `${losses.archer} Bogenschützen `;
    if (losses.cav) msg += `${losses.cav} Reiter `;
  }
  logMessage(msg, "bad");

  if (macroGame.enemy.baseHP <= 0) {
    macroGame.enemy.baseHP = 0;
    logMessage("Die feindliche Festung bricht zusammen. Sieg!", "good");
  }
  updateMacroUI();
}

// Feind-KI (abstrakt)

function enemyAttack() {
  let enemyPower = macroGame.enemy.strength;
  const totalArmy =
    macroGame.military.inf +
    macroGame.military.spear +
    macroGame.military.archer +
    macroGame.military.cav;

  let defense =
    macroGame.military.inf * (4 + armorInfantry()) +
    macroGame.military.spear * (5 + armorInfantry()) +
    macroGame.military.archer * (3 + armorArchers()) +
    macroGame.military.cav * 6;

  const damageToBase = Math.max(0, enemyPower - defense * 0.6);

  const lossFactor = enemyPower / 45;
  const lose = (count, m) => Math.min(count, Math.floor(lossFactor * m));

  const lostInf = lose(macroGame.military.inf, 1.8);
  const lostSpear = lose(macroGame.military.spear, 1.4);
  const lostArch = lose(macroGame.military.archer, 1.6);
  const lostCav = lose(macroGame.military.cav, 2.0);

  macroGame.military.inf -= lostInf;
  macroGame.military.spear -= lostSpear;
  macroGame.military.archer -= lostArch;
  macroGame.military.cav -= lostCav;
  macroGame.baseHP -= damageToBase;

  if (damageToBase === 0 && (lostInf + lostSpear + lostArch + lostCav === 0)) {
    logMessage("Ein feindlicher Angriff wird vollständig abgewehrt.", "good");
  } else {
    let msg = "Feindlicher Angriff! ";
    if (damageToBase > 0) msg += `Deine Gebäude erleiden ${Math.floor(damageToBase)} Schaden. `;
    if (lostInf + lostSpear + lostArch + lostCav > 0) {
      msg += "Verluste: ";
      if (lostInf) msg += `${lostInf} Infanterie `;
      if (lostSpear) msg += `${lostSpear} Speerträger `;
      if (lostArch) msg += `${lostArch} Bogenschützen `;
      if (lostCav) msg += `${lostCav} Reiter `;
    }
    logMessage(msg, "danger");
  }

  if (macroGame.baseHP <= 0) {
    macroGame.baseHP = 0;
    logMessage("Deine Stadt wird niedergebrannt. Niederlage.", "danger");
  }
}

// Tick-Logik Makrospiel

function macroTick() {
  macroGame.tick++;

  macroGame.villagers.forEach(task => {
    const base = baseRateForTask(task);
    const mul = ecoMultiplierForTask(task);
    const gain = base * mul;
    if (task === "food") macroGame.resources.food += gain;
    if (task === "wood") macroGame.resources.wood += gain;
    if (task === "gold") macroGame.resources.gold += gain;
    if (task === "stone") macroGame.resources.stone += gain;
  });

  macroGame.enemy.timer--;
  if (macroGame.enemy.timer <= 0) {
    enemyAttack();
    macroGame.enemy.level++;
    macroGame.enemy.strength += 6;
    macroGame.enemy.timerBase = Math.max(18, macroGame.enemy.timerBase - 1);
    macroGame.enemy.timer = macroGame.enemy.timerBase;
  }
}

// -------- Minimap + Kartentypen --------

document.addEventListener("DOMContentLoaded", () => {
  const w = 256;
  const h = 256;
  const minimap = document.getElementById("minimap");
  const wrapper = document.getElementById("minimap-wrapper");
  const mapTypeSelect = document.getElementById("map-type");
  const generateBtn = document.getElementById("btn-generate");

  const tiles = new Array(w*h);
  const tileElements = new Array(w*h);
  const discovered = new Array(w*h).fill(false);
  const visible = new Array(w*h).fill(false);
  const unitHere = new Array(w*h).fill(false);

  let currentMapType = "arabia";
  let playerBase = { x: 5, y: 5 };
  let enemyBase  = { x: w-6, y: h-6 };

  const units = [
    { id: 1, x: 20,  y: 20,  vision: 8,  targetX: null, targetY: null },
    { id: 2, x: 80,  y: 120, vision: 10, targetX: null, targetY: null },
    { id: 3, x: 180, y: 60,  vision: 12, targetX: null, targetY: null }
  ];
  let selectedUnitId = units[0].id;

  function index(x, y) { return y * w + x; }
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  function fillAll(type) {
    for (let i = 0; i < tiles.length; i++) tiles[i] = type;
  }
  function clearFog() {
    for (let i = 0; i < discovered.length; i++) {
      discovered[i] = false;
      visible[i] = false;
    }
  }
  function paintCircle(cx, cy, r, type, probability = 1.0) {
    const r2 = r*r;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const d2 = dx*dx + dy*dy;
        if (d2 <= r2 && Math.random() <= probability) {
          tiles[index(nx, ny)] = type;
        }
      }
    }
  }
  function paintRect(x1, y1, x2, y2, type) {
    const sx = Math.max(0, Math.min(x1, x2));
    const ex = Math.min(w-1, Math.max(x1, x2));
    const sy = Math.max(0, Math.min(y1, y2));
    const ey = Math.min(h-1, Math.max(y1, y2));
    for (let y = sy; y <= ey; y++) {
      for (let x = sx; x <= ex; x++) {
        tiles[index(x, y)] = type;
      }
    }
  }
  function paintRing(cx, cy, rInner, rOuter, type) {
    const rOut2 = rOuter*rOuter;
    const rIn2 = rInner*rInner;
    for (let dy = -rOuter; dy <= rOuter; dy++) {
      for (let dx = -rOuter; dx <= rOuter; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const d2 = dx*dx + dy*dy;
        if (d2 <= rOut2 && d2 >= rIn2) {
          tiles[index(nx, ny)] = type;
        }
      }
    }
  }
  function scatterResourcesAround(x, y, radius, type, count) {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 20) {
      attempts++;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const nx = Math.round(x + Math.cos(ang)*r);
      const ny = Math.round(y + Math.sin(ang)*r);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const idx = index(nx, ny);
      if (tiles[idx] === "grass") {
        tiles[idx] = type;
        placed++;
      }
    }
  }

  function generateArabia() {
    fillAll("grass");
    for (let i = 0; i < 40; i++) {
      const cx = Math.floor(Math.random() * w);
      const cy = Math.floor(Math.random() * h);
      const r = 6 + Math.floor(Math.random() * 8);
      paintCircle(cx, cy, r, "forest", 0.8);
    }
    for (let i = 0; i < 6; i++) {
      const cx = Math.floor(Math.random() * w);
      const cy = Math.floor(Math.random() * h);
      const r = 4 + Math.floor(Math.random() * 4);
      paintCircle(cx, cy, r, "water", 0.7);
    }
    playerBase = { x: Math.floor(w*0.25), y: Math.floor(h*0.6) };
    enemyBase  = { x: Math.floor(w*0.75), y: Math.floor(h*0.4) };
    scatterResourcesAround(playerBase.x, playerBase.y, 20, "gold", 8);
    scatterResourcesAround(playerBase.x, playerBase.y, 24, "stone", 6);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 20, "gold", 8);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 24, "stone", 6);
  }

  function generateBlackForest() {
    fillAll("grass");
    for (let i = -20; i <= 20; i+=4) {
      const cx = Math.floor(w*0.5) + i;
      const cy = Math.floor(h*0.5) + i;
      paintCircle(cx, cy, 30 + Math.floor(Math.random()*10), "forest", 0.95);
    }
    for (let i = 0; i < 10; i++) {
      const sx = Math.floor(Math.random()*w);
      const sy = Math.floor(Math.random()*h);
      const ex = sx + Math.floor((Math.random()-0.5)*60);
      const ey = sy + Math.floor((Math.random()-0.5)*60);
      paintRect(sx, sy, ex, ey, "grass");
    }
    playerBase = { x: Math.floor(w*0.2), y: Math.floor(h*0.2) };
    enemyBase  = { x: Math.floor(w*0.8), y: Math.floor(h*0.8) };
    paintCircle(playerBase.x, playerBase.y, 10, "grass", 1.0);
    paintCircle(enemyBase.x, enemyBase.y, 10, "grass", 1.0);
    scatterResourcesAround(playerBase.x, playerBase.y, 18, "gold", 6);
    scatterResourcesAround(playerBase.x, playerBase.y, 22, "stone", 6);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 18, "gold", 6);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 22, "stone", 6);
  }

  function generateArena() {
    fillAll("grass");
    const cx = Math.floor(w/2);
    const cy = Math.floor(h/2);
    paintRing(cx, cy, 70, 78, "stone");
    paintCircle(cx, cy, 68, "grass", 1.0);
    playerBase = { x: cx - 40, y: cy + 30 };
    enemyBase  = { x: cx + 40, y: cy - 30 };
    paintCircle(playerBase.x, playerBase.y, 10, "grass", 1.0);
    paintCircle(enemyBase.x, enemyBase.y, 10, "grass", 1.0);
    for (let i = 0; i < 25; i++) {
      const px = cx + Math.floor((Math.random()-0.5)*120);
      const py = cy + Math.floor((Math.random()-0.5)*120);
      paintCircle(px, py, 8 + Math.floor(Math.random()*6), "forest", 0.8);
    }
    scatterResourcesAround(playerBase.x, playerBase.y, 18, "gold", 8);
    scatterResourcesAround(playerBase.x, playerBase.y, 22, "stone", 6);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 18, "gold", 8);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 22, "stone", 6);
  }

  function generateIslands() {
    fillAll("water");
    const cy = Math.floor(h/2);
    paintCircle(Math.floor(w*0.3), cy, 45, "grass", 0.9);
    paintCircle(Math.floor(w*0.7), cy, 45, "grass", 0.9);
    for (let i = 0; i < 10; i++) {
      const px = Math.floor(Math.random()*w);
      const py = Math.floor(Math.random()*h);
      const r = 8 + Math.floor(Math.random()*10);
      paintCircle(px, py, r, "grass", 0.85);
    }
    for (let i = 0; i < 35; i++) {
      const px = Math.floor(Math.random()*w);
      const py = Math.floor(Math.random()*h);
      if (tiles[index(px, py)] === "grass") {
        paintCircle(px, py, 6 + Math.floor(Math.random()*4), "forest", 0.9);
      }
    }
    playerBase = { x: Math.floor(w*0.25), y: cy };
    enemyBase  = { x: Math.floor(w*0.75), y: cy };
    paintCircle(playerBase.x, playerBase.y, 10, "grass", 1.0);
    paintCircle(enemyBase.x, enemyBase.y, 10, "grass", 1.0);
    scatterResourcesAround(playerBase.x, playerBase.y, 18, "gold", 7);
    scatterResourcesAround(playerBase.x, playerBase.y, 20, "stone", 5);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 18, "gold", 7);
    scatterResourcesAround(enemyBase.x, enemyBase.y, 20, "stone", 5);
  }

  function markUnitsOnGrid() {
    unitHere.fill(false);
    units.forEach(u => {
      if (u.x >= 0 && u.x < w && u.y >= 0 && u.y < h) {
        unitHere[index(u.x, u.y)] = true;
      }
    });
  }

  function placeUnitsAroundPlayerBase() {
    const baseX = playerBase.x;
    const baseY = playerBase.y;
    const offsets = [
      {dx:-4, dy:-2},
      {dx:+4, dy:-2},
      {dx:0,  dy:+4}
    ];
    units.forEach((u, i) => {
      const off = offsets[i % offsets.length];
      u.x = clamp(baseX + off.dx, 1, w-2);
      u.y = clamp(baseY + off.dy, 1, h-2);
      u.targetX = null;
      u.targetY = null;
    });
    markUnitsOnGrid();
  }

  function generateMap(mapType) {
    currentMapType = mapType;
    clearFog();
    logMessage("Generiere Karte: " + mapType + " …", "system");

    switch (mapType) {
      case "black_forest": generateBlackForest(); break;
      case "arena": generateArena(); break;
      case "islands": generateIslands(); break;
      case "arabia":
      default: generateArabia(); break;
    }

    tiles[index(playerBase.x, playerBase.y)] = "player";
    tiles[index(enemyBase.x, enemyBase.y)] = "enemy";

    placeUnitsAroundPlayerBase();
    recomputeVisibility();
  }

  // Tiles initial erzeugen (DOM)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = index(x, y);
      tiles[idx] = "grass";
      const div = document.createElement("div");
      div.className = "minimap-tile fog-undiscovered";
      div.dataset.index = idx.toString();
      div.dataset.x = x.toString();
      div.dataset.y = y.toString();
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        handleTileClick(x, y);
      });
      minimap.appendChild(div);
      tileElements[idx] = div;
    }
  }

  function recomputeVisibility() {
    for (let i = 0; i < visible.length; i++) visible[i] = false;

    units.forEach(u => {
      const { x, y, vision } = u;
      for (let dy = -vision; dy <= vision; dy++) {
        for (let dx = -vision; dx <= vision; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const dist2 = dx*dx + dy*dy;
          if (dist2 <= vision*vision) {
            const idx = index(nx, ny);
            visible[idx] = true;
            discovered[idx] = true;
          }
        }
      }
    });

    updateTileClasses();
  }

  function updateTileClasses() {
    for (let i = 0; i < tiles.length; i++) {
      const el = tileElements[i];
      const terrain = tiles[i];
      const disc = discovered[i];
      const vis = visible[i];
      const hasUnit = unitHere[i];

      const classes = ["minimap-tile"];
      if (!disc && !vis) {
        classes.push("fog-undiscovered");
      } else {
        classes.push("tile-" + terrain);
        if (vis) classes.push("fog-visible");
        else classes.push("fog-discovered");
      }
      if (hasUnit) classes.push("has-unit");
      el.className = classes.join(" ");
    }

    units.forEach(u => {
      if (u.x < 0 || u.y < 0 || u.x >= w || u.y >= h) return;
      const idx = index(u.x, u.y);
      const el = tileElements[idx];
      if (u.id === selectedUnitId) el.classList.add("unit-selected");
      else el.classList.remove("unit-selected");
    });
  }

  function getSelectedUnit() {
    return units.find(u => u.id === selectedUnitId) || units[0];
  }
  function selectUnitAt(x, y) {
    const u = units.find(u => u.x === x && u.y === y);
    if (u) {
      selectedUnitId = u.id;
      logMessage("Einheit #" + u.id + " ausgewählt.", "system");
      recomputeVisibility();
      return true;
    }
    return false;
  }
  function distanceSquared(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx*dx + dy*dy;
  }
  function selectNearestUnitTo(x, y) {
    let best = null;
    let bestDist = Infinity;
    units.forEach(u => {
      const d2 = distanceSquared(u.x, u.y, x, y);
      if (d2 < bestDist) {
        bestDist = d2;
        best = u;
      }
    });
    if (best) {
      selectedUnitId = best.id;
      logMessage("Nächste Einheit #" + best.id + " automatisch ausgewählt.", "system");
      recomputeVisibility();
    }
  }
  function giveMoveOrderToSelected(x, y) {
    const u = getSelectedUnit();
    if (!u) return;
    u.targetX = x;
    u.targetY = y;
    logMessage(`Einheit #${u.id} erhält Bewegungsbefehl nach (${x}, ${y}).`, "system");
  }

  function handleTileClick(x, y) {
    const idx = index(x, y);

    if (selectUnitAt(x, y)) return;

    if (!visible[idx]) {
      logMessage(`Feld (${x}, ${y}) ist nicht sichtbar – kein Befehl möglich.`, "bad");
      return;
    }

    if (!getSelectedUnit()) {
      selectNearestUnitTo(x, y);
    }
    giveMoveOrderToSelected(x, y);
  }

  function stepUnits() {
    let anyMoved = false;
    units.forEach(u => {
      if (u.targetX == null || u.targetY == null) return;
      if (u.x === u.targetX && u.y === u.targetY) {
        u.targetX = null;
        u.targetY = null;
        logMessage(`Einheit #${u.id} ist am Ziel angekommen.`, "system");
        return;
      }
      let dx = 0, dy = 0;
      if (u.x < u.targetX) dx = 1;
      else if (u.x > u.targetX) dx = -1;
      if (u.y < u.targetY) dy = 1;
      else if (u.y > u.targetY) dy = -1;
      const newX = u.x + dx;
      const newY = u.y + dy;
      if (newX < 0 || newY < 0 || newX >= w || newY >= h) {
        u.targetX = null;
        u.targetY = null;
        return;
      }
      u.x = newX;
      u.y = newY;
      anyMoved = true;
    });
    if (anyMoved) {
      markUnitsOnGrid();
      recomputeVisibility();
    }
  }

  setInterval(stepUnits, 150);

  // Scroll & Zoom
  let zoom = 0.8;
  let offsetX = 0;
  let offsetY = 0;
  function updateTransform() {
    minimap.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
  }
  updateTransform();

  wrapper.addEventListener("wheel", e => {
    e.preventDefault();
    const oldZoom = zoom;
    const zoomDelta = (e.deltaY < 0 ? 0.1 : -0.1);
    zoom = Math.max(0.3, Math.min(3, zoom + zoomDelta));
    const rect = wrapper.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scaleFactor = zoom / oldZoom;
    offsetX = mx - (mx - offsetX) * scaleFactor;
    offsetY = my - (my - offsetY) * scaleFactor;
    updateTransform();
  }, { passive:false });

  let dragging = false;
  let startX = 0;
  let startY = 0;
  wrapper.addEventListener("mousedown", e => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  wrapper.addEventListener("mouseup", () => { dragging = false; });
  wrapper.addEventListener("mouseleave", () => { dragging = false; });
  wrapper.addEventListener("mousemove", e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;
    offsetX += dx;
    offsetY += dy;
    updateTransform();
  });

  // UI: Map-Typ wechseln
  generateBtn.addEventListener("click", () => {
    generateMap(mapTypeSelect.value);
  });

  // Startkarte
  generateMap("arabia");

  // Buttons Makrospiel verbinden
  document.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      handleAction(action);
    });
  });

  // Startbevölkerung
  for (let i = 0; i < 3; i++) macroGame.villagers.push("food");
  logMessage("Deine Franken erreichen das Land. Baue deine Zivilisation auf – Minimap & Makrospiel laufen zusammen.", "system");
  updateMacroUI();

  // Masterloop
  setInterval(() => {
    for (let i = 0; i < macroGame.speed; i++) {
      macroTick();
    }
    updateMacroUI();
  }, 1000);
});

// -------- Action-Handler Makrospiel --------

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
    case "train-archer":
      return trainUnit("archer", "Bogenschütze", { wood: 50, gold: 45 }, "range");
    case "train-scout":
      return trainUnit("cav", "Kundschafter", { food: 80, gold: 40 }, "stable");

    case "tech-doublebit":
      return buyTech("doubleBit", "Doppelaxt", { food: 100, gold: 50 });
    case "tech-horse-collar":
      return buyTech("horseCollar", "Pflug", { food: 125, gold: 75 });
    case "tech-wheelbarrow":
      return buyTech("wheelbarrow", "Schubkarre", { food: 175, gold: 75 });

    case "tech-forging":
      return buyTech("forging", "Schmieden", { food: 150, gold: 75 });
    case "tech-fletching":
      return buyTech("fletching", "Fletching", { food: 120, gold: 100 });
    case "tech-armor-inf":
      return buyTech("armorInf", "Infanterierüstung", { food: 150, gold: 100 });
    case "tech-armor-arch":
      return buyTech("armorArch", "Fernkämpferrüstung", { food: 150, gold: 100 });

    case "age-feudal":
      return ageUp(2, "Feudalzeit", { food: 500, gold: 200 });
    case "age-castle":
      return ageUp(3, "Ritterzeit", { food: 800, gold: 500 });
    case "age-imperial":
      return ageUp(4, "Imperium", { food: 1200, gold: 800 });

    case "attack-raid":
      return attackEnemy(0.8, "kleinen Überfall");
    case "attack-push":
      return attackEnemy(1.3, "grossen Angriff");

    case "speed-1":
      macroGame.speed = 1;
      return logMessage("Spielgeschwindigkeit auf x1 gesetzt.", "system");
    case "speed-2":
      macroGame.speed = 2;
      return logMessage("Spielgeschwindigkeit auf x2 gesetzt.", "system");
    case "speed-4":
      macroGame.speed = 4;
      return logMessage("Spielgeschwindigkeit auf x4 gesetzt.", "system");
  }
}
