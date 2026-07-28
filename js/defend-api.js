(() => {
  "use strict";

  const canvas = document.querySelector("[data-defend-canvas]");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const laneY = [150, 300, 450];
  const defenseTypes = {
    rate: { label: "RATE", cost: 35, damage: 34, range: 175, cooldown: .7, color: "#ff6a65" },
    cache: { label: "CACHE", cost: 50, damage: 21, range: 215, cooldown: .48, color: "#65e9e4" },
    queue: { label: "QUEUE", cost: 65, damage: 13, range: 250, cooldown: .75, color: "#8d75ff", slow: .55 }
  };
  const elements = {
    health: document.querySelector("[data-defend-health]"),
    capacity: document.querySelector("[data-defend-capacity]"),
    wave: document.querySelector("[data-defend-wave]"),
    blocked: document.querySelector("[data-defend-blocked]"),
    best: document.querySelector("[data-defend-best]"),
    status: document.querySelector("[data-defend-status]"),
    overlay: document.querySelector("[data-defend-overlay]"),
    overlayTitle: document.querySelector("[data-defend-overlay-title]"),
    overlayCopy: document.querySelector("[data-defend-overlay-copy]"),
    start: document.querySelector("[data-defend-start]"),
    restart: document.querySelector("[data-defend-restart]"),
    sound: document.querySelector("[data-defend-sound]")
  };
  let state = "ready";
  let health = 100;
  let capacity = 120;
  let wave = 0;
  let blocked = 0;
  let selected = "rate";
  let defenses = [];
  let enemies = [];
  let pendingSpawns = 0;
  let spawnTimer = 0;
  let waveDelay = 0;
  let lastTime = performance.now();
  let soundEnabled = true;
  let audioContext;

  function getBest() {
    try { return Number(localStorage.getItem("rdprassy-defend-best")) || 0; } catch { return 0; }
  }

  function tone(frequency, duration = .05) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "square";
      gain.gain.setValueAtTime(.02, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* optional audio */ }
  }

  function updateHud() {
    elements.health.textContent = String(Math.max(0, Math.round(health)));
    elements.capacity.textContent = String(Math.round(capacity));
    elements.wave.textContent = `${wave}/6`;
    elements.blocked.textContent = String(blocked);
    elements.best.textContent = String(Math.max(blocked, getBest()));
  }

  function showOverlay(title, copy, action) {
    elements.overlayTitle.textContent = title;
    elements.overlayCopy.textContent = copy;
    elements.start.textContent = action;
    elements.overlay.hidden = false;
  }

  function startWave() {
    wave += 1;
    pendingSpawns = 4 + (wave * 3);
    spawnTimer = .4;
    elements.status.innerHTML = `<strong>Wave ${wave} active</strong>${pendingSpawns} requests detected across three lanes.`;
    updateHud();
  }

  function startGame() {
    state = "playing";
    health = 100;
    capacity = 120;
    wave = 0;
    blocked = 0;
    defenses = [];
    enemies = [];
    pendingSpawns = 0;
    waveDelay = 0;
    elements.overlay.hidden = true;
    startWave();
    canvas.focus({ preventScroll: true });
    window.rdprassyArcade?.start("defend-api");
  }

  function finish(won) {
    state = "over";
    const score = blocked * 100 + Math.round(health * 10);
    if (blocked > getBest()) {
      try { localStorage.setItem("rdprassy-defend-best", String(blocked)); } catch { /* optional persistence */ }
    }
    showOverlay(
      won ? "Production is stable." : "The API went offline.",
      won ? `${blocked} hostile requests blocked with ${Math.round(health)}% health remaining.` : `${blocked} requests blocked before capacity failed.`,
      "Run incident again"
    );
    elements.status.innerHTML = `<strong>${won ? "Incident resolved" : "Service unavailable"}</strong>Final defense score: ${score}.`;
    window.rdprassyArcade?.complete("defend-api", { won, score });
    window.rdprassyTrack?.("game_over", { game: "defend_api", won, blocked, health: Math.round(health) });
    tone(won ? 740 : 120, .28);
    updateHud();
  }

  function spawnEnemy() {
    const kinds = [
      { label: "GET", color: "#65e9e4", health: 52, speed: 72 },
      { label: "BOT", color: "#ff6a65", health: 78, speed: 58 },
      { label: "POST", color: "#ffd85d", health: 64, speed: 66 }
    ];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    enemies.push({
      x: -30,
      lane: Math.floor(Math.random() * 3),
      health: kind.health + (wave * 7),
      maxHealth: kind.health + (wave * 7),
      speed: kind.speed + (wave * 3),
      label: kind.label,
      color: kind.color,
      slowUntil: 0
    });
  }

  function deploy(event) {
    if (state !== "playing") return;
    const rectangle = canvas.getBoundingClientRect();
    const x = ((event.clientX - rectangle.left) / rectangle.width) * width;
    const y = ((event.clientY - rectangle.top) / rectangle.height) * height;
    const lane = Math.max(0, Math.min(2, Math.floor(y / (height / 3))));
    const type = defenseTypes[selected];
    if (capacity < type.cost) {
      elements.status.innerHTML = `<strong>Insufficient capacity</strong>${type.label} requires ${type.cost} capacity.`;
      tone(140);
      return;
    }
    const deploymentX = Math.max(180, Math.min(760, x));
    if (defenses.some((defense) => defense.lane === lane && Math.abs(defense.x - deploymentX) < 58)) {
      elements.status.innerHTML = "<strong>Deployment collision</strong>Choose a clearer position in this lane.";
      return;
    }
    capacity -= type.cost;
    defenses.push({ x: deploymentX, lane, type: selected, cooldown: .1, flash: 0 });
    elements.status.innerHTML = `<strong>${type.label} deployed</strong>Lane ${lane + 1} now has additional protection.`;
    tone(520);
    updateHud();
  }

  function update(delta, timestamp) {
    if (state !== "playing") return;
    capacity = Math.min(160, capacity + (delta * 2.2));
    if (pendingSpawns > 0) {
      spawnTimer -= delta;
      if (spawnTimer <= 0) {
        spawnEnemy();
        pendingSpawns -= 1;
        spawnTimer = Math.max(.38, 1.02 - (wave * .08));
      }
    }

    defenses.forEach((defense) => {
      defense.cooldown -= delta;
      defense.flash = Math.max(0, defense.flash - delta);
      if (defense.cooldown > 0) return;
      const type = defenseTypes[defense.type];
      const targets = enemies
        .filter((enemy) => enemy.lane === defense.lane && Math.abs(enemy.x - defense.x) <= type.range)
        .sort((a, b) => b.x - a.x);
      const target = targets[0];
      if (!target) return;
      let damage = type.damage;
      if (defense.type === "cache" && target.label === "GET") damage *= 1.8;
      target.health -= damage;
      if (type.slow) {
        enemies.filter((enemy) => enemy.lane === defense.lane).forEach((enemy) => { enemy.slowUntil = timestamp + 1300; });
      }
      defense.cooldown = type.cooldown;
      defense.flash = .12;
      tone(250 + (damage * 5), .025);
    });

    enemies.forEach((enemy) => {
      const speedFactor = timestamp < enemy.slowUntil ? .45 : 1;
      enemy.x += enemy.speed * speedFactor * delta;
      if (enemy.x >= 884 && enemy.health > 0) {
        health -= enemy.label === "BOT" ? 18 : 11;
        enemy.health = 0;
        enemy.passed = true;
        tone(110, .12);
      }
    });

    enemies = enemies.filter((enemy) => {
      if (enemy.health > 0) return true;
      if (!enemy.passed) {
        blocked += 1;
        capacity = Math.min(160, capacity + 8);
      }
      return false;
    });

    if (health <= 0) {
      finish(false);
      return;
    }
    if (pendingSpawns === 0 && enemies.length === 0) {
      if (wave >= 6) {
        finish(true);
        return;
      }
      waveDelay += delta;
      if (waveDelay > 1.6) {
        waveDelay = 0;
        capacity = Math.min(160, capacity + 35);
        startWave();
      }
    }
    updateHud();
  }

  function draw() {
    context.fillStyle = "#071713";
    context.fillRect(0, 0, width, height);
    laneY.forEach((y, index) => {
      context.strokeStyle = "rgba(255,255,255,.12)";
      context.lineWidth = 3;
      context.setLineDash([12, 12]);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = "rgba(255,255,255,.35)";
      context.font = "800 13px Inter, sans-serif";
      context.fillText(`LANE ${index + 1}`, 18, y - 62);
    });

    context.fillStyle = "#c8ff5d";
    context.fillRect(890, 55, 54, height - 110);
    context.fillStyle = "#102a25";
    context.font = "900 13px Inter, sans-serif";
    context.save();
    context.translate(917, height / 2);
    context.rotate(-Math.PI / 2);
    context.textAlign = "center";
    context.fillText("PRODUCTION API", 0, 5);
    context.restore();

    defenses.forEach((defense) => {
      const type = defenseTypes[defense.type];
      const y = laneY[defense.lane];
      context.fillStyle = defense.flash > 0 ? "#fff" : type.color;
      context.strokeStyle = "#102a25";
      context.lineWidth = 5;
      context.beginPath();
      context.arc(defense.x, y, 25, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = "#102a25";
      context.font = "900 8px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(type.label, defense.x, y + 3);
    });

    enemies.forEach((enemy) => {
      const y = laneY[enemy.lane];
      context.fillStyle = enemy.color;
      context.strokeStyle = "#102a25";
      context.lineWidth = 4;
      context.beginPath();
      context.roundRect(enemy.x - 28, y - 21, 56, 42, 10);
      context.fill();
      context.stroke();
      context.fillStyle = "#102a25";
      context.font = "900 10px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(enemy.label, enemy.x, y + 4);
      context.fillStyle = "rgba(255,255,255,.25)";
      context.fillRect(enemy.x - 28, y - 31, 56, 5);
      context.fillStyle = "#c8ff5d";
      context.fillRect(enemy.x - 28, y - 31, 56 * Math.max(0, enemy.health / enemy.maxHealth), 5);
    });
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - lastTime) / 1000, .035);
    lastTime = timestamp;
    update(delta, timestamp);
    draw();
    requestAnimationFrame(frame);
  }

  document.querySelectorAll("[data-defense]").forEach((button) => button.addEventListener("click", () => {
    selected = button.dataset.defense;
    document.querySelectorAll("[data-defense]").forEach((candidate) => candidate.classList.toggle("is-selected", candidate === button));
  }));
  canvas.addEventListener("pointerdown", deploy);
  elements.start.addEventListener("click", startGame);
  elements.restart.addEventListener("click", startGame);
  elements.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    elements.sound.setAttribute("aria-pressed", String(soundEnabled));
  });
  elements.best.textContent = String(getBest());
  requestAnimationFrame(frame);
})();
