
document.addEventListener("DOMContentLoaded", () => {
  const w = 256;
  const h = 256;
  const minimap = document.getElementById("minimap");
  const wrapper = document.getElementById("minimap-wrapper");
  const log = document.getElementById("log");
  const mapTypeSelect = document.getElementById("map-type");
  const generateBtn = document.getElementById("btn-generate");

  function logMsg(msg, type="system"){
    const d = document.createElement("div");
    d.className = type === "good" ? "log-good" :
                  type === "bad" ? "log-bad" :
                  type === "danger" ? "log-danger" : "log-system";
    d.textContent = msg;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

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
    // grosse Waldflächen
    for(let i=0;i<10;i++){
      const cx=Math.floor(w*(0.1+0.8*Math.random()));
      const cy=Math.floor(h*(0.1+0.8*Math.random()));
      const r=18+Math.floor(Math.random()*18);
      paintCircle(cx,cy,r,"forest");
    }
    // einige Oasen / Seen
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
    // breite Wiesenbänder (Wege) horizontal
    for(let i=0;i<3;i++){
      const yMid=Math.floor(h*(0.2+0.3*i));
      paintRect(0,yMid-4,w-1,yMid+4,"grass");
    }
    // und vertikal
    for(let i=0;i<3;i++){
      const xMid=Math.floor(w*(0.2+0.3*i));
      paintRect(xMid-4,0,xMid+4,h-1,"grass");
    }
    // grosse Lichtungen
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
    paintRing(cx,cy,64,72,"stone"); // Mauer-Ring
    playerBase={x:cx-35,y:cy+25};
    enemyBase ={x:cx+35,y:cy-25};
    paintCircle(playerBase.x,playerBase.y,9,"grass");
    paintCircle(enemyBase.x,enemyBase.y,9,"grass");
    // Wälder im Inneren in grossen Blöcken
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
    // ein paar kleinere Inseln
    for(let i=0;i<8;i++){
      const cx=Math.floor(w*(0.1+0.8*Math.random()));
      const cy=Math.floor(h*(0.1+0.8*Math.random()));
      const r=8+Math.floor(Math.random()*10);
      paintCircle(cx,cy,r,"grass");
    }
    // Wälder auf den Inseln, aber grossflächig
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
    logMsg("Generiere Karte: "+kind+" …","system");
    if(kind==="black_forest") generateBlackForest();
    else if(kind==="arena") generateArena();
    else if(kind==="islands") generateIslands();
    else generateArabia();

    tiles[index(playerBase.x,playerBase.y)]="player";
    tiles[index(enemyBase.x,enemyBase.y)]="enemy";
    placeUnitsAroundBase();
    recomputeVisibility();
  }

  // Tiles im DOM anlegen
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
        classes.push(vis?"fog-visible":"fog-discovered");
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

  function getSelectedUnit(){
    return units.find(u=>u.id===selectedUnitId) || units[0];
  }
  function selectUnitAt(x,y){
    const u=units.find(u=>u.x===x && u.y===y);
    if(u){
      selectedUnitId=u.id;
      logMsg("Einheit #"+u.id+" ausgewählt.","system");
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
      logMsg("Nächste Einheit #"+best.id+" automatisch ausgewählt.","system");
      recomputeVisibility();
    }
  }
  function giveMoveOrder(x,y){
    const u=getSelectedUnit();
    if(!u) return;
    u.targetX=x;
    u.targetY=y;
    logMsg(`Einheit #${u.id} bewegt sich nach (${x}, ${y}).`,"system");
  }

  function handleTileClick(x,y){
    const idx=index(x,y);
    if(selectUnitAt(x,y)) return;
    if(!visible[idx]){
      logMsg(`Feld (${x}, ${y}) ist nicht sichtbar.`,`bad`);
      return;
    }
    if(!getSelectedUnit()) selectNearestUnitTo(x,y);
    giveMoveOrder(x,y);
  }

  function stepUnits(){
    let moved=false;
    units.forEach(u=>{
      if(u.targetX==null||u.targetY==null) return;
      if(u.x===u.targetX && u.y===u.targetY){
        u.targetX=null;u.targetY=null;
        logMsg(`Einheit #${u.id} erreicht ihr Ziel.`,"system");
        return;
      }
      let dx=0,dy=0;
      if(u.x<u.targetX) dx=1;
      else if(u.x>u.targetX) dx=-1;
      if(u.y<u.targetY) dy=1;
      else if(u.y>u.targetY) dy=-1;
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
  let zoom=0.6;
  let offsetX=0, offsetY=0;
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

  // Karte initial
  generateMap("arabia");

  // UI
  generateBtn.addEventListener("click",()=>{
    generateMap(mapTypeSelect.value);
  });
});
