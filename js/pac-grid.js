(() => {
  "use strict";

  const canvas = document.querySelector("[data-pac-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const tileSize = 40;
  const baseMaze = [
    "###################",
    "#o.......#.......o#",
    "#.###.##.#.##.###.#",
    "#.................#",
    "#.###.#.#####.#.###",
    "#.....#...#...#...#",
    "#####.### # ###.###",
    "#####.#       #.###",
    "#####.# ## ## #.###",
    "     .  #   #  .   ",
    "#####.# ##### #.###",
    "#####.#       #.###",
    "#####.# ##### #.###",
    "#........#........#",
    "#.###.##.#.##.###.#",
    "#o..#.... ....#..o#",
    "###.#.#.#####.#.###",
    "#.....#...#...#...#",
    "#.#######.#.#######",
    "#.................#",
    "###################"
  ];
  const rows = baseMaze.length;
  const columns = baseMaze[0].length;
  const playerStart = { row: 15, column: 9 };
  const sentinelStarts = [
    { row: 9, column: 9, color: "#ff6a65", name: "Trace", strategy: "chase" },
    { row: 9, column: 10, color: "#65e9e4", name: "Vector", strategy: "ambush" },
    { row: 9, column: 11, color: "#ef9e56", name: "Orbit", strategy: "scatter" }
  ];
  const directions = {
    up: { row: -1, column: 0, opposite: "down", angle: -Math.PI / 2 },
    down: { row: 1, column: 0, opposite: "up", angle: Math.PI / 2 },
    left: { row: 0, column: -1, opposite: "right", angle: Math.PI },
    right: { row: 0, column: 1, opposite: "left", angle: 0 }
  };
  const elements = {
    overlay: document.querySelector("[data-pac-overlay]"),
    overlayTitle: document.querySelector("[data-pac-overlay-title]"),
    overlayCopy: document.querySelector("[data-pac-overlay-copy]"),
    overlayButton: document.querySelector("[data-pac-overlay-button]"),
    score: document.querySelector("[data-pac-score]"),
    best: document.querySelector("[data-pac-best]"),
    lives: document.querySelector("[data-pac-lives]"),
    level: document.querySelector("[data-pac-level]"),
    levelTop: document.querySelector("[data-pac-level-top]"),
    dots: document.querySelector("[data-pac-dots]"),
    status: document.querySelector("[data-pac-status]"),
    hudStatus: document.querySelector("[data-pac-hud-status]"),
    powerBar: document.querySelector("[data-pac-power-bar]"),
    powerLabel: document.querySelector("[data-pac-power-label]"),
    start: document.querySelector("[data-pac-start]"),
    restart: document.querySelector("[data-pac-restart]"),
    pause: document.querySelector("[data-pac-pause]"),
    sound: document.querySelector("[data-pac-sound]")
  };

  let maze = [];
  let player;
  let sentinels = [];
  let state = "ready";
  let score = 0;
  let lives = 3;
  let level = 1;
  let dotsRemaining = 0;
  let powerUntil = 0;
  let powerChain = 0;
  let playerStepAt = 0;
  let sentinelStepAt = 0;
  let resumeAt = 0;
  let lastTimestamp = 0;
  let soundEnabled = true;
  let runStarted = false;
  let clearedLevel = false;
  let audioContext;

  function readBest() {
    try { return Number(localStorage.getItem("rdprassy-pac-grid-best")) || 0; } catch { return 0; }
  }

  function saveBest() {
    if (score <= readBest()) return;
    try { localStorage.setItem("rdprassy-pac-grid-best", String(score)); } catch { /* optional persistence */ }
  }

  function tone(frequency, duration = .055, volume = .025) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* audio is optional */ }
  }

  function copyMaze() {
    maze = baseMaze.map((row) => row.split(""));
    dotsRemaining = maze.reduce((total, row) => total + row.filter((tile) => tile === "." || tile === "o").length, 0);
  }

  function resetActors(timestamp = performance.now()) {
    player = {
      row: playerStart.row,
      column: playerStart.column,
      previousRow: playerStart.row,
      previousColumn: playerStart.column,
      direction: "left",
      requestedDirection: "left",
      movedAt: timestamp
    };
    sentinels = sentinelStarts.map((sentinel, index) => ({
      ...sentinel,
      previousRow: sentinel.row,
      previousColumn: sentinel.column,
      direction: index === 1 ? "up" : index === 2 ? "left" : "right",
      movedAt: timestamp,
      returningUntil: 0
    }));
    playerStepAt = timestamp + 320;
    sentinelStepAt = timestamp + 520;
  }

  function showOverlay(title, copy, action) {
    elements.overlayTitle.textContent = title;
    elements.overlayCopy.textContent = copy;
    elements.overlayButton.textContent = action;
    elements.overlay.hidden = false;
  }

  function hideOverlay() {
    elements.overlay.hidden = true;
    canvas.focus({ preventScroll: true });
  }

  function updateInterface(timestamp = performance.now()) {
    const powerRemaining = Math.max(0, powerUntil - timestamp);
    const powerRatio = Math.min(1, powerRemaining / 7000);
    elements.score.textContent = String(score);
    elements.best.textContent = String(Math.max(score, readBest()));
    elements.lives.textContent = String(lives);
    elements.level.textContent = String(level);
    elements.levelTop.textContent = String(level).padStart(2, "0");
    elements.dots.textContent = String(dotsRemaining);
    elements.powerBar.style.transform = `scaleX(${powerRatio})`;
    elements.powerLabel.textContent = powerRemaining > 0 ? `Power mode · ${(powerRemaining / 1000).toFixed(1)}s` : "Power cell inactive";
    elements.hudStatus.textContent = state === "running" ? (powerRemaining > 0 ? "POWER MODE" : "LIVE") : state.toUpperCase();
  }

  function tileAt(row, column) {
    if (row === 9 && column < 0) return maze[row][columns - 1];
    if (row === 9 && column >= columns) return maze[row][0];
    if (row < 0 || row >= rows || column < 0 || column >= columns) return "#";
    return maze[row][column];
  }

  function nextCell(row, column, direction) {
    const delta = directions[direction];
    let nextRow = row + delta.row;
    let nextColumn = column + delta.column;
    if (nextRow === 9 && nextColumn < 0) nextColumn = columns - 1;
    if (nextRow === 9 && nextColumn >= columns) nextColumn = 0;
    return { row: nextRow, column: nextColumn };
  }

  function canMove(row, column, direction) {
    const next = nextCell(row, column, direction);
    return tileAt(next.row, next.column) !== "#";
  }

  function moveEntity(entity, direction, timestamp) {
    const next = nextCell(entity.row, entity.column, direction);
    entity.previousRow = entity.row;
    entity.previousColumn = entity.column;
    entity.row = next.row;
    entity.column = next.column;
    entity.direction = direction;
    entity.movedAt = timestamp;
  }

  function playerDelay() {
    return Math.max(82, 122 - ((level - 1) * 4));
  }

  function sentinelDelay() {
    return Math.max(92, 154 - ((level - 1) * 7));
  }

  function consumeTile(timestamp) {
    const tile = maze[player.row]?.[player.column];
    if (tile !== "." && tile !== "o") return;
    maze[player.row][player.column] = " ";
    dotsRemaining -= 1;
    if (tile === "o") {
      score += 50;
      powerUntil = timestamp + Math.max(4200, 7200 - ((level - 1) * 500));
      powerChain = 0;
      tone(580, .12);
      elements.status.innerHTML = "<strong>Power cell active</strong>Sentinels are vulnerable. Capture them before the meter expires.";
    } else {
      score += 10;
      tone(220 + ((dotsRemaining % 5) * 24), .025, .012);
    }
    saveBest();
    updateInterface(timestamp);
    if (dotsRemaining === 0) finishLevel(timestamp);
  }

  function wrappedDistance(a, b) {
    const rowDistance = Math.abs(a.row - b.row);
    const directColumn = Math.abs(a.column - b.column);
    return rowDistance + Math.min(directColumn, columns - directColumn);
  }

  function playerTargetAhead(steps) {
    const delta = directions[player.direction];
    return {
      row: Math.max(0, Math.min(rows - 1, player.row + (delta.row * steps))),
      column: (player.column + (delta.column * steps) + columns) % columns
    };
  }

  function sentinelTarget(sentinel) {
    if (sentinel.strategy === "ambush") return playerTargetAhead(4);
    if (sentinel.strategy === "scatter" && wrappedDistance(sentinel, player) < 6) return { row: rows - 2, column: 1 };
    return { row: player.row, column: player.column };
  }

  function chooseSentinelDirection(sentinel, timestamp) {
    let options = Object.keys(directions).filter((direction) => canMove(sentinel.row, sentinel.column, direction));
    if (options.length > 1) {
      options = options.filter((direction) => direction !== directions[sentinel.direction]?.opposite);
    }
    if (!options.length) return directions[sentinel.direction]?.opposite || "left";

    const frightened = powerUntil > timestamp && sentinel.returningUntil <= timestamp;
    const target = sentinel.returningUntil > timestamp
      ? sentinelStarts[sentinels.indexOf(sentinel)]
      : sentinelTarget(sentinel);
    const ranked = options.map((direction) => {
      const cell = nextCell(sentinel.row, sentinel.column, direction);
      const jitter = Math.random() * (sentinel.strategy === "scatter" ? 2.8 : .7);
      return { direction, distance: wrappedDistance(cell, target) + jitter };
    });
    ranked.sort((a, b) => frightened ? b.distance - a.distance : a.distance - b.distance);
    if (!frightened && Math.random() < .08 + (level * .01)) {
      return ranked[Math.min(1, ranked.length - 1)].direction;
    }
    return ranked[0].direction;
  }

  function sameCell(a, b) {
    return a.row === b.row && a.column === b.column;
  }

  function crossedPaths(a, b) {
    return a.row === b.previousRow && a.column === b.previousColumn &&
      b.row === a.previousRow && b.column === a.previousColumn;
  }

  function handleCollisions(timestamp) {
    if (state !== "running") return;
    const collided = sentinels.find((sentinel) => sentinel.returningUntil <= timestamp && (sameCell(player, sentinel) || crossedPaths(player, sentinel)));
    if (!collided) return;
    if (powerUntil > timestamp) {
      powerChain += 1;
      const bonus = 200 * (2 ** (powerChain - 1));
      score += bonus;
      collided.returningUntil = timestamp + 1400;
      collided.previousRow = collided.row;
      collided.previousColumn = collided.column;
      collided.row = sentinelStarts[sentinels.indexOf(collided)].row;
      collided.column = sentinelStarts[sentinels.indexOf(collided)].column;
      tone(760 + (powerChain * 90), .16);
      elements.status.innerHTML = `<strong>${collided.name} captured</strong>+${bonus} points. Keep the power chain alive.`;
      saveBest();
      updateInterface(timestamp);
      return;
    }
    loseLife(timestamp);
  }

  function loseLife(timestamp) {
    lives -= 1;
    tone(105, .35);
    updateInterface(timestamp);
    if (lives <= 0) {
      finishRun();
      return;
    }
    state = "recovering";
    resumeAt = timestamp + 1250;
    powerUntil = 0;
    elements.status.innerHTML = `<strong>Signal interrupted</strong>${lives} ${lives === 1 ? "life" : "lives"} remaining. Reconnecting…`;
    resetActors(timestamp);
  }

  function finishLevel(timestamp) {
    state = "level-clear";
    clearedLevel = true;
    score += 1000 * level;
    saveBest();
    window.rdprassyArcade?.complete("pac-grid", { completed: true, score });
    window.rdprassyTrack?.("game_level_complete", { game: "pac_grid", level, score });
    tone(880, .3);
    elements.status.innerHTML = `<strong>Grid ${level} cleared</strong>Level bonus awarded. Preparing a faster maze…`;
    level += 1;
    resumeAt = timestamp + 1800;
    updateInterface(timestamp);
  }

  function prepareNextLevel(timestamp) {
    copyMaze();
    resetActors(timestamp);
    powerUntil = 0;
    powerChain = 0;
    state = "running";
    elements.status.innerHTML = `<strong>Grid ${level} live</strong>Sentinels are moving faster. Clear every signal dot.`;
    updateInterface(timestamp);
  }

  function finishRun() {
    state = "over";
    saveBest();
    window.rdprassyArcade?.complete("pac-grid", { completed: false, score });
    window.rdprassyTrack?.("game_over", { game: "pac_grid", score, level, cleared_level: clearedLevel });
    showOverlay("Grid run complete", `Score ${score}. You reached level ${level}${clearedLevel ? " and cleared at least one maze." : "."}`, "Run again");
    elements.status.innerHTML = `<strong>Run complete</strong>Final score ${score}. Your best stays on this device.`;
    updateInterface();
  }

  function startRun() {
    score = 0;
    lives = 3;
    level = 1;
    powerUntil = 0;
    powerChain = 0;
    clearedLevel = false;
    copyMaze();
    resetActors();
    state = "running";
    runStarted = true;
    elements.start.textContent = "Restart run";
    elements.status.innerHTML = "<strong>Grid live</strong>Collect every signal dot. Large cells activate power mode.";
    hideOverlay();
    updateInterface();
    window.rdprassyArcade?.start("pac-grid");
    window.rdprassyTrack?.("game_start", { game: "pac_grid" });
  }

  function togglePause() {
    if (state === "running") {
      state = "paused";
      showOverlay("Grid paused", "Your score, lives, and remaining dots are safe.", "Resume");
      updateInterface();
    } else if (state === "paused") {
      state = "running";
      playerStepAt = performance.now() + 100;
      sentinelStepAt = performance.now() + 140;
      hideOverlay();
      updateInterface();
    }
  }

  function requestDirection(direction) {
    if (!directions[direction]) return;
    if (state === "ready" && !runStarted) startRun();
    player.requestedDirection = direction;
  }

  function updateGame(timestamp) {
    if (state === "recovering" && timestamp >= resumeAt) {
      state = "running";
      elements.status.innerHTML = "<strong>Reconnected</strong>Keep moving and clear the remaining dots.";
    }
    if (state === "level-clear" && timestamp >= resumeAt) prepareNextLevel(timestamp);
    if (state !== "running") return;

    if (timestamp >= playerStepAt) {
      if (canMove(player.row, player.column, player.requestedDirection)) {
        player.direction = player.requestedDirection;
      }
      if (canMove(player.row, player.column, player.direction)) {
        moveEntity(player, player.direction, timestamp);
        consumeTile(timestamp);
      }
      playerStepAt = timestamp + playerDelay();
      handleCollisions(timestamp);
    }

    if (state === "running" && timestamp >= sentinelStepAt) {
      sentinels.forEach((sentinel) => {
        const direction = chooseSentinelDirection(sentinel, timestamp);
        moveEntity(sentinel, direction, timestamp);
      });
      sentinelStepAt = timestamp + sentinelDelay();
      handleCollisions(timestamp);
    }

    if (powerUntil && timestamp >= powerUntil) {
      powerUntil = 0;
      powerChain = 0;
      elements.status.innerHTML = "<strong>Power mode ended</strong>Sentinels are dangerous again.";
      tone(170, .12);
    }
    updateInterface(timestamp);
  }

  function interpolatedPosition(entity, timestamp, duration) {
    const ratio = Math.max(0, Math.min(1, (timestamp - entity.movedAt) / duration));
    let previousColumn = entity.previousColumn;
    let column = entity.column;
    if (Math.abs(column - previousColumn) > 1) {
      if (column === 0) previousColumn = -1;
      else if (previousColumn === 0) previousColumn = columns;
    }
    return {
      row: entity.previousRow + ((entity.row - entity.previousRow) * ratio),
      column: previousColumn + ((column - previousColumn) * ratio)
    };
  }

  function roundedRectangle(x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  function drawMaze(timestamp) {
    context.fillStyle = "#050c0a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const tile = maze[row][column];
        const x = column * tileSize;
        const y = row * tileSize;
        if (tile === "#") {
          context.fillStyle = "#123b34";
          roundedRectangle(x + 2, y + 2, tileSize - 4, tileSize - 4, 9);
          context.fill();
          context.strokeStyle = "#2d8f78";
          context.lineWidth = 2;
          context.stroke();
        } else if (tile === "." || tile === "o") {
          const pulse = tile === "o" ? 1 + (Math.sin(timestamp / 160) * .13) : 1;
          context.fillStyle = tile === "o" ? "#c8ff5d" : "#f2dfab";
          context.beginPath();
          context.arc(x + (tileSize / 2), y + (tileSize / 2), (tile === "o" ? 7 : 3.2) * pulse, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }

  function drawPlayer(timestamp) {
    const position = interpolatedPosition(player, timestamp, playerDelay());
    const centerX = (position.column * tileSize) + (tileSize / 2);
    const centerY = (position.row * tileSize) + (tileSize / 2);
    const mouth = .18 + (Math.abs(Math.sin(timestamp / 85)) * .23);
    const angle = directions[player.direction].angle;
    context.fillStyle = "#c8ff5d";
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, 15, angle + mouth, angle + (Math.PI * 2) - mouth);
    context.closePath();
    context.fill();
    context.fillStyle = "#07120f";
    context.font = "900 7px ui-monospace, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("RD", centerX - (Math.cos(angle) * 3), centerY - (Math.sin(angle) * 3));
  }

  function drawSentinel(sentinel, index, timestamp) {
    const position = interpolatedPosition(sentinel, timestamp, sentinelDelay());
    const centerX = (position.column * tileSize) + (tileSize / 2);
    const centerY = (position.row * tileSize) + (tileSize / 2);
    const frightened = powerUntil > timestamp && sentinel.returningUntil <= timestamp;
    const flashing = powerUntil - timestamp < 1800 && Math.floor(timestamp / 180) % 2 === 0;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(Math.PI / 4);
    context.fillStyle = sentinel.returningUntil > timestamp ? "rgba(255,255,255,.3)" : frightened ? (flashing ? "#fff" : "#8d75ff") : sentinel.color;
    roundedRectangle(-12, -12, 24, 24, 6);
    context.fill();
    context.restore();
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(centerX - 6, centerY - 3, 4.5, 0, Math.PI * 2);
    context.arc(centerX + 6, centerY - 3, 4.5, 0, Math.PI * 2);
    context.fill();
    const look = directions[sentinel.direction];
    context.fillStyle = "#07120f";
    context.beginPath();
    context.arc(centerX - 6 + (look.column * 1.7), centerY - 3 + (look.row * 1.7), 2, 0, Math.PI * 2);
    context.arc(centerX + 6 + (look.column * 1.7), centerY - 3 + (look.row * 1.7), 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,.72)";
    context.font = "900 7px ui-monospace, monospace";
    context.textAlign = "center";
    context.fillText(String(index + 1), centerX, centerY + 10);
  }

  function draw(timestamp) {
    drawMaze(timestamp);
    if (player) drawPlayer(timestamp);
    sentinels.forEach((sentinel, index) => drawSentinel(sentinel, index, timestamp));
  }

  function frame(timestamp) {
    lastTimestamp = timestamp;
    updateGame(timestamp);
    draw(timestamp);
    requestAnimationFrame(frame);
  }

  const keyDirections = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right"
  };
  window.addEventListener("keydown", (event) => {
    const direction = keyDirections[event.key];
    if (direction) {
      requestDirection(direction);
      event.preventDefault();
    }
    if (event.key === "p" || event.key === "P") togglePause();
  });

  document.querySelectorAll("[data-pac-direction]").forEach((button) => {
    button.addEventListener("pointerdown", () => requestDirection(button.dataset.pacDirection));
  });
  elements.pause.addEventListener("click", togglePause);
  elements.start.addEventListener("click", startRun);
  elements.restart.addEventListener("click", startRun);
  elements.overlayButton.addEventListener("click", () => state === "paused" ? togglePause() : startRun());
  elements.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    elements.sound.setAttribute("aria-pressed", String(soundEnabled));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") togglePause();
  });

  copyMaze();
  resetActors();
  elements.best.textContent = String(readBest());
  updateInterface();
  requestAnimationFrame(frame);
})();
