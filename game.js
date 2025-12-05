
document.addEventListener("DOMContentLoaded", () => {
  const w = 256;
  const h = 256;
  const minimap = document.getElementById("minimap");
  const log = document.getElementById("log");

  function logMsg(msg) {
    const div = document.createElement("div");
    div.textContent = msg;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  const tiles = [];
  const types = ["grass","forest","gold","stone","water"];

  for (let i = 0; i < w*h; i++) {
    tiles.push(types[Math.floor(Math.random()*types.length)]);
  }

  // player + enemy
  tiles[5*w + 5] = "player";
  tiles[(h-6)*w + (w-6)] = "enemy";

  tiles.forEach((t, idx) => {
    const div = document.createElement("div");
    div.classList.add("minimap-tile", "tile-" + t);
    const x = idx % w;
    const y = Math.floor(idx / w);
    div.addEventListener("click", () => logMsg(`(${x}, ${y}) – ${t}`));
    minimap.appendChild(div);
  });
});
