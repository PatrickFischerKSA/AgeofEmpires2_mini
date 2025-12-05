// --- Gemeinsames Log ---
function logMessage(msg, type = "system") {
  const logEl = document.getElementById("log");
  if (!logEl) return;
  const div = document.createElement("div");
  if (type === "good") div.className = "log-good";
  else if (type === "bad") div.className = "log-bad";
  else if (type === "danger") div.className = "log-danger";
  else div.className = "log-system";
  div.textContent = msg;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

// --- Makrospiel-State ---
const macroGame = {
  tick: 0,
  speed: 1,
  ageLevel: 1,
  ages: ["", "Dunkles Zeitalter", "Feudalzeit", "Ritterzeit", "Imperium"],
  civ: "franks",
  aiDifficulty: "normal",
  resources: { food: 200, wood: 200, gold: 100, stone: 0 },
  villagers: [],
  buildings: { houses: 0, barracks: 0, range: 0, stable: 0, blacksmith: 0, market: 0 },
  military: { inf: 0, spear: 0, archer: 0, cav: 0 },
  tech: {
    doubleBit: false, horseCollar: false, wheelbarrow: false,
    forging: false, fletching: false, armorInf: false, armorArch: false
  },
  baseHPMax: 120,
  baseHP: 120,
  enemy: { baseHPMax: 300, baseHP: 300, strength: 12, timer: 35, timerBase: 35, level: 1 }
};

function totalPop() {
  return macroGame.villagers.length +
    macroGame.military.inf + macroGame.military.spear +
    macroGame.military.archer + macroGame.military.cav;
}
function popCap() {
  return 5 + macroGame.buildings.houses * 5;
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

function baseRate(task) {
  switch (task) {
    case "food": return 5;
    case "wood": return 5;
    case "gold": return 4;
    case "stone": return 3;
    default: return 0;
  }
}
function ecoMult(task) {
  let m = 1;
  if (macroGame.ageLevel >= 2) m *= 1.1;
  if (macroGame.ageLevel >= 3) m *= 1.2;
  if (macroGame.ageLevel >= 4) m *= 1.3;
  if (task === "wood" && macroGame.tech.doubleBit) m *= 1.2;
  if (task === "food" && macroGame.tech.horseCollar) m *= 1.2;
  if (macroGame.tech.wheelbarrow) m *= 1.15;
  if (macroGame.civ === "franks" && task === "food") m *= 1.1;
  return m;
}

function updateMacroUI() {
  document.getElementById("ui-tick").textContent = macroGame.tick;
  document.getElementById("ui-age").textContent = macroGame.ages[macroGame.ageLevel];
  document.getElementById("ui-civ").textContent = "Franken";
  document.getElementById("ui-diff").textContent = "Normal";

  const pop = totalPop();
  const cap = popCap();
  document.getElementById("ui-pop").textContent = pop + " / " + cap;

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

  const rFood = counts.food * baseRate("food") * ecoMult("food");
  const rWood = counts.wood * baseRate("wood") * ecoMult("wood");
  const rGold = counts.gold * baseRate("gold") * ecoMult("gold");
  const rStone = counts.stone * baseRate("stone") * ecoMult("stone");
  document.getElementById("ui-rate-food").textContent = rFood.toFixed(1);
  document.getElementById("ui-rate-wood").textContent = rWood.toFixed(1);
  document.getElementById("ui-rate-gold").textContent = rGold.toFixed(1);
  document.getElementById("ui-rate-stone").textContent = rStone.toFixed(1);

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
    Math.max(0, Math.floor(macroGame.baseHP)) + " / " + macroGame.baseHPMax;
  document.getElementById("ui-enemy-hp-label").textContent =
    Math.max(0, Math.floor(macroGame.enemy.baseHP)) + " / " + macroGame.enemy.baseHPMax;
}

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
  logMessage("Ein Dorfbewohner arbeitet nun an: " + task + ".", "system");
  updateMacroUI();
}
function trainVillager() {
  const cost = { food: 50 };
  if (!canAfford(cost)) return logMessage("Zu wenig Nahrung für einen Villager.", "bad");
  if (totalPop() >= popCap()) return logMessage("Bevölkerungsgrenze erreicht. Baue Häuser.", "bad");
  pay(cost);
  macroGame.villagers.push("food");
  logMessage("Ein neuer Dorfbewohner wurde ausgebildet.", "good");
  updateMacroUI();
}
function buildHouse() {
  const cost = { wood: 25 };
  if (!canAfford(cost)) return logMessage("Zu wenig Holz für ein Haus.", "bad");
  pay(cost);
  macroGame.buildings.houses++;
  logMessage("Ein Haus wurde gebaut. Bevölkerungsgrenze erhöht.", "good");
  updateMacroUI();
}
function buildBuilding(type, label, cost) {
  if (!canAfford(cost)) return logMessage("Zu wenig Ressourcen für " + label + ".", "bad");
  pay(cost);
  macroGame.buildings[type]++;
  logMessage(label + " wurde errichtet.", "good");
  updateMacroUI();
}
function trainUnit(kind, label, cost, requirementKey) {
  if (requirementKey && macroGame.buildings[requirementKey] <= 0)
    return logMessage("Du brauchst dafür zuerst das entsprechende Gebäude.", "bad");
  if (!canAfford(cost)) return logMessage("Zu wenig Ressourcen für " + label + ".", "bad");
  if (totalPop() >= popCap()) return logMessage("Bevölkerungsgrenze erreicht. Baue Häuser.", "bad");
  pay(cost);
  macroGame.military[kind]++;
  logMessage(label + " wurde ausgebildet.", "good");
  updateMacroUI();
}
function buyTech(key, label, cost) {
  if (macroGame.tech[key]) return logMessage("Technologie " + label + " wurde bereits erforscht.", "bad");
  if (!canAfford(cost)) return logMessage("Zu wenig Ressourcen für " + label + ".", "bad");
  pay(cost);
  macroGame.tech[key] = true;
  logMessage("Technologie " + label + " erforscht.", "good");
  updateMacroUI();
}
function ageUp(targetLevel, label, cost) {
  if (macroGame.ageLevel >= targetLevel)
    return logMessage("Du bist bereits in der " + label + " oder höher.", "bad");
  if (!canAfford(cost)) return logMessage("Zu wenig Ressourcen für den Aufstieg in die " + label + ".", "bad");
  pay(cost);
  macroGame.ageLevel = targetLevel;
  macroGame.baseHPMax += 15;
  macroGame.baseHP = Math.max(macroGame.baseHP, macroGame.baseHPMax * 0.75);
  logMessage("Du steigst in die " + label + " auf. Deine Zivilisation wird effizienter.", "good");
  updateMacroUI();
}

// Kampflogik (abstrakt)
function infantryAttack() { return 6 + (macroGame.tech.forging ? 1 : 0); }
function archerAttack() { return 7 + (macroGame.tech.fletching ? 1 : 0); }
function cavAttack() { return 9 + (macroGame.tech.forging ? 1 : 0); }

function computeAttackPower(mult) {
  let atk =
    macroGame.military.inf * infantryAttack() +
    macroGame.military.spear * (infantryAttack() - 1) +
    macroGame.military.archer * archerAttack() +
    macroGame.military.cav * cavAttack();
  return atk * mult;
}
function computeOwnLosses(mult) {
  const enemyPower = macroGame.enemy.strength;
  const factor = (enemyPower / 45) * mult;
  const lose = (c, m) => Math.min(c, Math.floor(factor * m));
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

function attackEnemy(mult, label) {
  const armySize =
    macroGame.military.inf + macroGame.military.spear +
    macroGame.military.archer + macroGame.military.cav;
  if (armySize === 0) return logMessage("Du hast keine Armee für einen Angriff.", "bad");
  const attack = computeAttackPower(mult);
  const enemyArmor = 10 + macroGame.enemy.level * 3;
  const damage = Math.max(5, Math.floor(attack - enemyArmor));
  macroGame.enemy.baseHP -= damage;

  const losses = computeOwnLosses(mult);
  applyLosses(losses);

  let msg = "Du startest einen " + label + " und verursachst " + damage + " Schaden. ";
  if (Object.values(losses).some(v => v > 0)) {
    msg += "Verluste: ";
    if (losses.inf) msg += losses.inf + " Infanterie ";
    if (losses.spear) msg += losses.spear + " Speerträger ";
    if (losses.archer) msg += losses.archer + " Bogenschützen ";
    if (losses.cav) msg += losses.cav + " Reiter ";
  }
  logMessage(msg, "bad");
  if (macroGame.enemy.baseHP <= 0) {
    macroGame.enemy.baseHP = 0;
    logMessage("Die feindliche Festung bricht zusammen. Sieg!", "good");
  }
  updateMacroUI();
}

function armorInfantry() { return macroGame.tech.armorInf ? 1 : 0; }
function armorArchers() { return macroGame.tech.armorArch ? 1 : 0; }

function enemyAttack() {
  let enemyPower = macroGame.enemy.strength;
  const defense =
    macroGame.military.inf * (4 + armorInfantry()) +
    macroGame.military.spear * (5 + armorInfantry()) +
    macroGame.military.archer * (3 + armorArchers()) +
    macroGame.military.cav * 6;
  const damageToBase = Math.max(0, enemyPower - defense * 0.6);

  const lossFactor = enemyPower / 45;
  const lose = (c, m) => Math.min(c, Math.floor(lossFactor * m));
  const lostInf = lose(macroGame.military.inf, 1.8);
  const lostSpear = lose(macroGame.military.spear, 1.4);
  const lostArch = lose(macroGame.military.archer, 1.6);
  const lostCav = lose(macroGame.military.cav, 2.0);
  macroGame.military.inf -= lostInf;
  macroGame.military.spear -= lostSpear;
  macroGame.military.archer -= lostArch;
  macroGame.military.cav -= lostCav;
  macroGame.baseHP -= damageToBase;

  if (damageToBase === 0 && (lostInf + lostSpear + lostArch + lostCav === 0))
    logMessage("Ein feindlicher Angriff wird vollständig abgewehrt.", "good");
  else {
    let msg = "Feindlicher Angriff! ";
    if (damageToBase > 0) msg += "Deine Gebäude erleiden " + Math.floor(damageToBase) + " Schaden. ";
    if (lostInf + lostSpear + lostArch + lostCav > 0) {
      msg += "Verluste: ";
      if (lostInf) msg += lostInf + " Infanterie ";
      if (lostSpear) msg += lostSpear + " Speerträger ";
      if (lostArch) msg += lostArch + " Bogenschützen ";
      if (lostCav) msg += lostCav + " Reiter ";
    }
    logMessage(msg, "danger");
  }
  if (macroGame.baseHP <= 0) {
    macroGame.baseHP = 0;
    logMessage("Deine Stadt wird niedergebrannt. Niederlage.", "danger");
  }
  updateMacroUI();
}

function macroTick() {
  macroGame.tick++;
  macroGame.villagers.forEach(task => {
    const base = baseRate(task);
    const mul = ecoMult(task);
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

// --- Action Handler ---
function handleAction(action) {
  switch (action) {
    case "assign-food": return reassignVillager("food");
    case "assign-wood": return reassignVillager("wood");
    case "assign-gold": return reassignVillager("gold");
    case "assign-stone": return reassignVillager("stone");
    case "assign-idle": return reassignVillager("idle");
    case "train-villager": return trainVillager();
    case "build-house": return buildHouse();

    case "build-barracks": return buildBuilding("barracks", "eine Kaserne", { wood:175 });
    case "build-range":   return buildBuilding("range", "eine Schießanlage", { wood:200, gold:50 });
    case "build-stable":  return buildBuilding("stable", "einen Stall", { wood:175, gold:75 });
    case "build-blacksmith": return buildBuilding("blacksmith", "eine Schmiede", { wood:150 });
    case "build-market":  return buildBuilding("market", "einen Markt", { wood:150, gold:75 });

    case "train-militia": return trainUnit("inf", "Infanterist", { food:60, gold:20 }, "barracks");
    case "train-spear":   return trainUnit("spear", "Speerträger", { food:50, wood:35 }, "barracks");
    case "train-archer":  return trainUnit("archer", "Bogenschütze", { wood:50, gold:45 }, "range");
    case "train-scout":   return trainUnit("cav", "Kundschafter", { food:80, gold:40 }, "stable");

    case "tech-doublebit":   return buyTech("doubleBit", "Doppelaxt", { food:100, gold:50 });
    case "tech-horse-collar":return buyTech("horseCollar", "Pflug", { food:125, gold:75 });
    case "tech-wheelbarrow": return buyTech("wheelbarrow", "Schubkarre", { food:175, gold:75 });

    case "tech-forging":   return buyTech("forging", "Schmieden", { food:150, gold:75 });
    case "tech-fletching": return buyTech("fletching", "Fletching", { food:120, gold:100 });
    case "tech-armor-inf": return buyTech("armorInf", "Infanterierüstung", { food:150, gold:100 });
    case "tech-armor-arch":return buyTech("armorArch", "Fernkämpferrüstung", { food:150, gold:100 });

    case "age-feudal":   return ageUp(2, "Feudalzeit", { food:500, gold:200 });
    case "age-castle":   return ageUp(3, "Ritterzeit", { food:800, gold:500 });
    case "age-imperial": return ageUp(4, "Imperium", { food:1200, gold:800 });

    case "attack-raid":  return attackEnemy(0.8, "kleinen Überfall");
    case "attack-push":  return attackEnemy(1.3, "grossen Angriff");

    case "speed-1": macroGame.speed = 1; return logMessage("Spielgeschwindigkeit auf x1 gesetzt.", "system");
    case "speed-2": macroGame.speed = 2; return logMessage("Spielgeschwindigkeit auf x2 gesetzt.", "system");
    case "speed-4": macroGame.speed = 4; return logMessage("Spielgeschwindigkeit auf x4 gesetzt.", "system");
  }
}

// --- Minimap + Smooth-Karten ---
document.addEventListener("DOMContentLoaded", () => {
  // Buttons mit Aktionen verbinden
  document.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => handleAction(btn.getAttribute("data-action")));
  });

  // Startbevölkerung
  for (let i = 0; i < 3; i++) macroGame.villagers.push("food");
  logMessage("Deine Franken erreichen das Land. Baue deine Zivilisation auf – Makrospiel und Minimap laufen zusammen.", "system");
  updateMacroUI();

  // Makrospiel-Timer
  setInterval(() => {
    for (let i = 0; i < macroGame.speed; i++) macroTick();
    updateMacroUI();
  }, 1000);

  // --- Minimap-Setup ---
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

  let playerBase = {x:5,y:5};
  let enemyBase  = {x:w-6,y:h-6};

  const units = [
    { id:1, x:20,  y:20,  vision:8,  targetX:null, targetY:null },
    { id:2, x:80,  y:120, vision:10, targetX:null, targetY:null },
    { id:3, x:180, y:60,  vision:12, targetX:null, targetY:null }
  ];
  let selectedUnitId = units[0].id;

  function index(x,y){ return y*w + x; }
  function clamp(v,min,max){ return v<min?min:v>max?max:v; }

  function fillAll(type){
    for(let i=0;i<tiles.length;i++) tiles[i]=type;
  }
  function clearFog(){
    for(let i=0;i<visible.length;i++){
      visible[i]=false;
      discovered[i]=false;
    }
  }

  function paintCircle(cx,cy,r,type){
    const r2=r*r;
    for(let dy=-r;dy<=r;dy++){
      for(let dx=-r;dx<=r;dx++){
        const nx=cx+dx, ny=cy+dy;
        if(nx<0||ny<0||nx>=w||ny>=h) continue;
        const d2=dx*dx+dy*dy;
        if(d2<=r2) tiles[index(nx,ny)]=type;
      }
    }
  }
  function paintRect(x1,y1,x2,y2,type){
    const sx=Math.max(0,Math.min(x1,x2));
    const ex=Math.min(w-1,Math.max(x1,x2));
    const sy=Math.max(0,Math.min(y1,y2));
    const ey=Math.min(h-1,Math.max(y1,y2));
    for(let y=sy;y<=ey;y++){
      for(let x=sx;x<=ex;x++){
        tiles[index(x,y)]=type;
      }
    }
  }
  function paintRing(cx,cy,rInner,rOuter,type){
    const rOut2=rOuter*rOuter, rIn2=rInner*rInner;
    for(let dy=-rOuter;dy<=rOuter;dy++){
      for(let dx=-rOuter;dx<=rOuter;dx++){
        const nx=cx+dx, ny=cy+dy;
        if(nx<0||ny<0||nx>=w||ny>=h) continue;
        const d2=dx*dx+dy*dy;
        if(d2<=rOut2 && d2>=rIn2) tiles[index(nx,ny)]=type;
      }
    }
  }
  function scatterResourcesAround(cx,cy,radius,type,count){
    let placed=0, attempts=0;
    while(placed<count && attempts<count*30){
      attempts++;
      const a=Math.random()*Math.PI*2;
      const r=Math.random()*radius;
      const nx=Math.round(cx+Math.cos(a)*r);
      const ny=Math.round(cy+Math.sin(a)*r);
      if(nx<0||ny<0||nx>=w||ny>=h) continue;
      const idx=index(nx,ny);
      if(tiles[idx]==="grass"){
        tiles[idx]=type;
        placed++;
      }
    }
  }

  function generateArabia(){
    fillAll("grass");
    for(let i=0;i<10;i++){
      const cx=Math.floor(w*(0.1+0.8*Math.random()));
      const cy=Math.floor(h*(0.1+0.8*Math.random()));
      const r=18+Math.floor(Math.random()*18);
      paintCircle(cx,cy,r,"forest");
    }
    for(let i=0;i<3;i++){
      const cx=Math.floor(w*(0.2+0.6*Math.random()));
      const cy=Math.floor(h*(0.2+0.6*Math.random()));
      const r=10+Math.floor(Math.random()*10);
      paintCircle(cx,cy,r,"water");
    }
    playerBase={x:Math.floor(w*0.25),y:Math.floor(h*0.65)};
    enemyBase ={x:Math.floor(w*0.75),y:Math.floor(h*0.35)};
    scatterResourcesAround(playerBase.x,playerBase.y,22,"gold",8);
    scatterResourcesAround(playerBase.x,playerBase.y,25,"stone",6);
    scatterResourcesAround(enemyBase.x,enemyBase.y,22,"gold",8);
    scatterResourcesAround(enemyBase.x,enemyBase.y,25,"stone",6);
  }

  function generateBlackForest(){
    fillAll("forest");
    for(let i=0;i<3;i++){
      const yMid=Math.floor(h*(0.2+0.3*i));
      paintRect(0,yMid-4,w-1,yMid+4,"grass");
    }
    for(let i=0;i<3;i++){
      const xMid=Math.floor(w*(0.2+0.3*i));
      paintRect(xMid-4,0,xMid+4,h-1,"grass");
    }
    for(let i=0;i<5;i++){
      const cx=Math.floor(w*(0.15+0.7*Math.random()));
      const cy=Math.floor(h*(0.15+0.7*Math.random()));
      const r=10+Math.floor(Math.random()*10);
      paintCircle(cx,cy,r,"grass");
    }
    playerBase={x:Math.floor(w*0.2),y:Math.floor(h*0.2)};
    enemyBase ={x:Math.floor(w*0.8),y:Math.floor(h*0.8)};
    paintCircle(playerBase.x,playerBase.y,10,"grass");
    paintCircle(enemyBase.x,enemyBase.y,10,"grass");
    scatterResourcesAround(playerBase.x,playerBase.y,18,"gold",6);
    scatterResourcesAround(playerBase.x,playerBase.y,22,"stone",6);
    scatterResourcesAround(enemyBase.x,enemyBase.y,18,"gold",6);
    scatterResourcesAround(enemyBase.x,enemyBase.y,22,"stone",6);
  }

  function generateArena(){
    fillAll("forest");
    const cx=Math.floor(w/2), cy=Math.floor(h/2);
    paintCircle(cx,cy,80,"grass");
    paintRing(cx,cy,64,72,"stone");
    playerBase={x:cx-35,y:cy+25};
    enemyBase ={x:cx+35,y:cy-25};
    paintCircle(playerBase.x,playerBase.y,9,"grass");
    paintCircle(enemyBase.x,enemyBase.y,9,"grass");
    for(let i=0;i<8;i++){
      const px=cx+Math.floor((Math.random()-0.5)*110);
      const py=cy+Math.floor((Math.random()-0.5)*80);
      const r=8+Math.floor(Math.random()*6);
      paintCircle(px,py,r,"forest");
    }
    scatterResourcesAround(playerBase.x,playerBase.y,20,"gold",8);
    scatterResourcesAround(playerBase.x,playerBase.y,24,"stone",6);
    scatterResourcesAround(enemyBase.x,enemyBase.y,20,"gold",8);
    scatterResourcesAround(enemyBase.x,enemyBase.y,24,"stone",6);
  }

  function generateIslands(){
    fillAll("water");
    const main1={x:Math.floor(w*0.28),y:Math.floor(h*0.55)};
    const main2={x:Math.floor(w*0.72),y:Math.floor(h*0.45)};
    paintCircle(main1.x,main1.y,50,"grass");
    paintCircle(main2.x,main2.y,50,"grass");
    for(let i=0;i<8;i++){
      const cx=Math.floor(w*(0.1+0.8*Math.random()));
      const cy=Math.floor(h*(0.1+0.8*Math.random()));
      const r=8+Math.floor(Math.random()*10);
      paintCircle(cx,cy,r,"grass");
    }
    for(let i=0;i<25;i++){
      const cx=Math.floor(w*Math.random());
      const cy=Math.floor(h*Math.random());
      const idx=index(cx,cy);
      if(tiles[idx]==="grass"){
        const r=5+Math.floor(Math.random()*6);
        paintCircle(cx,cy,r,"forest");
      }
    }
    playerBase={x:main1.x-10,y:main1.y};
    enemyBase ={x:main2.x+10,y:main2.y};
    paintCircle(playerBase.x,playerBase.y,9,"grass");
    paintCircle(enemyBase.x,enemyBase.y,9,"grass");
    scatterResourcesAround(playerBase.x,playerBase.y,22,"gold",7);
    scatterResourcesAround(playerBase.x,playerBase.y,24,"stone",5);
    scatterResourcesAround(enemyBase.x,enemyBase.y,22,"gold",7);
    scatterResourcesAround(enemyBase.x,enemyBase.y,24,"stone",5);
  }

  function markUnitsOnGrid(){
    unitHere.fill(false);
    units.forEach(u=>{
      if(u.x>=0&&u.x<w&&u.y>=0&&u.y<h){
        unitHere[index(u.x,u.y)]=true;
      }
    });
  }

  function placeUnitsAroundBase(){
    const bx=playerBase.x, by=playerBase.y;
    const offsets=[{dx:-4,dy:-2},{dx:+4,dy:-2},{dx:0,dy:+4}];
    units.forEach((u,i)=>{
      const o=offsets[i%offsets.length];
      u.x=clamp(bx+o.dx,1,w-2);
      u.y=clamp(by+o.dy,1,h-2);
      u.targetX=null;
      u.targetY=null;
    });
    markUnitsOnGrid();
  }

  function generateMap(kind){
    clearFog();
    logMessage("Generiere Karte: "+kind+" …","system");
    if(kind==="black_forest") generateBlackForest();
    else if(kind==="arena") generateArena();
    else if(kind==="islands") generateIslands();
    else generateArabia();

    tiles[index(playerBase.x,playerBase.y)]="player";
    tiles[index(enemyBase.x,enemyBase.y)]="enemy";
    placeUnitsAroundBase();
    recomputeVisibility();
  }

  // DOM-Tiles
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const idx=index(x,y);
      tiles[idx]="grass";
      const div=document.createElement("div");
      div.className="minimap-tile fog-undiscovered";
      div.dataset.x=x;
      div.dataset.y=y;
      div.addEventListener("click",e=>{
        e.stopPropagation();
        handleTileClick(x,y);
      });
      minimap.appendChild(div);
      tileElements[idx]=div;
    }
  }

  function recomputeVisibility(){
    for(let i=0;i<visible.length;i++) visible[i]=false;
    units.forEach(u=>{
      const {x,y,vision}=u;
      for(let dy=-vision;dy<=vision;dy++){
        for(let dx=-vision;dx<=vision;dx++){
          const nx=x+dx, ny=y+dy;
          if(nx<0||ny<0||nx>=w||ny>=h) continue;
          const d2=dx*dx+dy*dy;
          if(d2<=vision*vision){
            const idx=index(nx,ny);
            visible[idx]=true;
            discovered[idx]=true;
          }
        }
      }
    });
    updateTileClasses();
  }

  function updateTileClasses(){
    for(let i=0;i<tiles.length;i++){
      const el=tileElements[i];
      const terrain=tiles[i];
      const disc=discovered[i];
      const vis=visible[i];
      const hasUnit=unitHere[i];
      const classes=["minimap-tile"];
      if(!disc && !vis){
        classes.push("fog-undiscovered");
      }else{
        classes.push("tile-"+terrain);
        classes.push(vis ? "fog-visible" : "fog-discovered");
      }
      if(hasUnit) classes.push("has-unit");
      el.className=classes.join(" ");
    }
    units.forEach(u=>{
      if(u.x<0||u.y<0||u.x>=w||u.y>=h) return;
      const idx=index(u.x,u.y);
      const el=tileElements[idx];
      if(u.id===selectedUnitId) el.classList.add("unit-selected");
      else el.classList.remove("unit-selected");
    });
  }

  function getSelectedUnit(){ return units.find(u=>u.id===selectedUnitId) || units[0]; }
  function selectUnitAt(x,y){
    const u=units.find(u=>u.x===x && u.y===y);
    if(u){
      selectedUnitId=u.id;
      logMessage("Einheit #"+u.id+" ausgewählt.","system");
      recomputeVisibility();
      return true;
    }
    return false;
  }
  function distance2(ax,ay,bx,by){
    const dx=ax-bx, dy=ay-by;
    return dx*dx+dy*dy;
  }
  function selectNearestUnitTo(x,y){
    let best=null, bestD=Infinity;
    units.forEach(u=>{
      const d2=distance2(u.x,u.y,x,y);
      if(d2<bestD){bestD=d2;best=u;}
    });
    if(best){
      selectedUnitId=best.id;
      logMessage("Nächste Einheit #"+best.id+" automatisch ausgewählt.","system");
      recomputeVisibility();
    }
  }
  function giveMoveOrder(x,y){
    const u=getSelectedUnit();
    if(!u) return;
    u.targetX=x;
    u.targetY=y;
    logMessage("Einheit #"+u.id+" bewegt sich nach ("+x+", "+y+").","system");
  }
  function handleTileClick(x,y){
    const idx=index(x,y);
    if(selectUnitAt(x,y)) return;
    if(!visible[idx]) return logMessage("Feld ("+x+", "+y+") ist nicht sichtbar.","bad");
    if(!getSelectedUnit()) selectNearestUnitTo(x,y);
    giveMoveOrder(x,y);
  }

  function stepUnits(){
    let moved=false;
    units.forEach(u=>{
      if(u.targetX==null||u.targetY==null) return;
      if(u.x===u.targetX && u.y===u.targetY){
        u.targetX=null;u.targetY=null;
        logMessage("Einheit #"+u.id+" erreicht ihr Ziel.","system");
        return;
      }
      let dx=0,dy=0;
      if(u.x<u.targetX) dx=1; else if(u.x>u.targetX) dx=-1;
      if(u.y<u.targetY) dy=1; else if(u.y>u.targetY) dy=-1;
      const nx=u.x+dx, ny=u.y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h){
        u.targetX=null;u.targetY=null;
        return;
      }
      u.x=nx;u.y=ny;moved=true;
    });
    if(moved){
      markUnitsOnGrid();
      recomputeVisibility();
    }
  }
  setInterval(stepUnits,150);

  // Scroll & Zoom
  let zoom=0.6, offsetX=0, offsetY=0;
  function updateTransform(){
    minimap.style.transform=`translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
  }
  updateTransform();

  wrapper.addEventListener("wheel",e=>{
    e.preventDefault();
    const oldZoom=zoom;
    const delta=e.deltaY<0?0.08:-0.08;
    zoom=Math.max(0.3,Math.min(3,zoom+delta));
    const rect=wrapper.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    const my=e.clientY-rect.top;
    const factor=zoom/oldZoom;
    offsetX=mx-(mx-offsetX)*factor;
    offsetY=my-(my-offsetY)*factor;
    updateTransform();
  },{passive:false});

  let dragging=false, startX=0, startY=0;
  wrapper.addEventListener("mousedown",e=>{
    dragging=true;
    startX=e.clientX;
    startY=e.clientY;
  });
  wrapper.addEventListener("mouseup",()=>dragging=false);
  wrapper.addEventListener("mouseleave",()=>dragging=false);
  wrapper.addEventListener("mousemove",e=>{
    if(!dragging) return;
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;
    startX=e.clientX;
    startY=e.clientY;
    offsetX+=dx;
    offsetY+=dy;
    updateTransform();
  });

  // Startkarte & UI
  generateMap("arabia");
  generateBtn.addEventListener("click",()=>generateMap(mapTypeSelect.value));
});
