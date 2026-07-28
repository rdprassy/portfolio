(() => {
  "use strict";

  const canvas = document.querySelector("[data-quest-canvas]");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const player = { x: 40, y: 430, width: 34, height: 44, vx: 0, vy: 0, grounded: false };
  const keys = { left: false, right: false };
  const levels = [
    {
      name: "Foundations", accent: "#65e9e4", sky: "#dff8ef", milestone: { x: 445, y: 322, label: "Java" },
      platforms: [[0, 500, 260, 40], [330, 500, 250, 40], [650, 500, 310, 40], [170, 400, 150, 20], [405, 370, 150, 20], [670, 330, 130, 20]],
      hazards: [[270, 488, 50, 12], [590, 488, 50, 12]]
    },
    {
      name: "Enterprise Systems", accent: "#ef9e56", sky: "#f6e8d8", milestone: { x: 706, y: 252, label: "Spring" },
      platforms: [[0, 500, 210, 40], [275, 500, 260, 40], [610, 500, 350, 40], [120, 390, 145, 20], [350, 330, 145, 20], [640, 300, 150, 20]],
      hazards: [[220, 488, 45, 12], [545, 488, 55, 12]]
    },
    {
      name: "Cloud Scale", accent: "#5f8dff", sky: "#dfe9ff", milestone: { x: 480, y: 205, label: "Cloud" },
      platforms: [[0, 500, 250, 40], [325, 500, 205, 40], [610, 500, 350, 40], [150, 405, 120, 20], [360, 340, 120, 20], [450, 250, 120, 20], [680, 350, 130, 20]],
      hazards: [[260, 488, 55, 12], [540, 488, 60, 12]]
    },
    {
      name: "Platform Engineering", accent: "#8d75ff", sky: "#eee9ff", milestone: { x: 725, y: 190, label: "Platform" },
      platforms: [[0, 500, 190, 40], [255, 500, 230, 40], [560, 500, 400, 40], [95, 395, 115, 20], [295, 325, 120, 20], [505, 280, 120, 20], [675, 235, 130, 20]],
      hazards: [[198, 488, 48, 12], [495, 488, 55, 12]]
    },
    {
      name: "Applied AI", accent: "#c8ff5d", sky: "#eaf6cf", milestone: { x: 510, y: 150, label: "AI" },
      platforms: [[0, 500, 225, 40], [300, 500, 250, 40], [630, 500, 330, 40], [140, 390, 120, 20], [330, 310, 120, 20], [465, 200, 120, 20], [650, 315, 120, 20]],
      hazards: [[235, 488, 55, 12], [560, 488, 60, 12]]
    }
  ];
  const elements = {
    chapter: document.querySelector("[data-quest-chapter]"),
    collected: document.querySelector("[data-quest-collected]"),
    score: document.querySelector("[data-quest-score]"),
    best: document.querySelector("[data-quest-best]"),
    lives: document.querySelector("[data-quest-lives]"),
    level: document.querySelector("[data-quest-level]"),
    status: document.querySelector("[data-quest-status]"),
    overlay: document.querySelector("[data-quest-overlay]"),
    overlayTitle: document.querySelector("[data-quest-overlay-title]"),
    overlayCopy: document.querySelector("[data-quest-overlay-copy]"),
    start: document.querySelector("[data-quest-start]"),
    restart: document.querySelector("[data-quest-restart]"),
    sound: document.querySelector("[data-quest-sound]"),
    left: document.querySelector("[data-quest-left]"),
    right: document.querySelector("[data-quest-right]"),
    jump: document.querySelector("[data-quest-jump]")
  };
  let state = "ready";
  let levelIndex = 0;
  let collected = 0;
  let levelCollected = false;
  let lives = 3;
  let score = 0;
  let lastTime = performance.now();
  let soundEnabled = true;
  let audioContext;
  let invulnerableUntil = 0;

  function getBest() {
    try { return Number(localStorage.getItem("rdprassy-quest-best")) || 0; } catch { return 0; }
  }

  function tone(frequency, duration = .07) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.025, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* optional audio */ }
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function resetPlayer() {
    player.x = 36;
    player.y = 430;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
  }

  function updateHud() {
    const level = levels[levelIndex];
    elements.chapter.textContent = `Chapter ${levelIndex + 1} · ${level.name}`;
    elements.collected.textContent = String(collected);
    elements.score.textContent = String(score);
    elements.best.textContent = String(Math.max(score, getBest()));
    elements.lives.textContent = String(lives);
    elements.level.textContent = `${levelIndex + 1}/5`;
  }

  function showOverlay(title, copy, action) {
    elements.overlayTitle.textContent = title;
    elements.overlayCopy.textContent = copy;
    elements.start.textContent = action;
    elements.overlay.hidden = false;
  }

  function startGame() {
    state = "playing";
    levelIndex = 0;
    collected = 0;
    levelCollected = false;
    lives = 3;
    score = 0;
    resetPlayer();
    elements.overlay.hidden = true;
    elements.status.innerHTML = "<strong>Chapter 1 · Foundations</strong>Collect the Java milestone, then reach the portal.";
    canvas.focus({ preventScroll: true });
    updateHud();
    window.rdprassyArcade?.start("portfolio-quest");
  }

  function loseLife(timestamp) {
    if (timestamp < invulnerableUntil) return;
    lives -= 1;
    tone(120, .18);
    if (lives <= 0) {
      state = "over";
      showOverlay("Quest paused at this chapter.", `You collected ${collected} of 5 milestones.`, "Try again");
      elements.status.innerHTML = `<strong>Quest over</strong>Final score: ${score}.`;
      window.rdprassyArcade?.complete("portfolio-quest", { score, completed: false });
      return;
    }
    score = Math.max(0, score - 150);
    invulnerableUntil = timestamp + 1100;
    resetPlayer();
    elements.status.innerHTML = `<strong>Life lost</strong>${lives} chances remain in ${levels[levelIndex].name}.`;
    updateHud();
  }

  function finishQuest() {
    state = "over";
    score += lives * 500;
    if (score > getBest()) {
      try { localStorage.setItem("rdprassy-quest-best", String(score)); } catch { /* optional persistence */ }
    }
    showOverlay("Journey complete!", `All five milestones collected. Final score: ${score}.`, "Run it again");
    elements.status.innerHTML = "<strong>Applied AI chapter complete</strong>The complete engineering journey is unlocked.";
    window.rdprassyArcade?.complete("portfolio-quest", { completed: true, score });
    window.rdprassyTrack?.("game_over", { game: "portfolio_quest", completed: true, score });
    tone(820, .3);
    updateHud();
  }

  function advanceLevel() {
    if (!levelCollected) {
      elements.status.innerHTML = `<strong>Portal locked</strong>Collect the ${levels[levelIndex].milestone.label} milestone first.`;
      return;
    }
    score += 350;
    if (levelIndex === levels.length - 1) {
      finishQuest();
      return;
    }
    levelIndex += 1;
    levelCollected = false;
    resetPlayer();
    const next = levels[levelIndex];
    elements.status.innerHTML = `<strong>Chapter ${levelIndex + 1} · ${next.name}</strong>Collect the ${next.milestone.label} milestone and find the portal.`;
    tone(680, .16);
    updateHud();
  }

  function jump() {
    if (state !== "playing" || !player.grounded) return;
    player.vy = -620;
    player.grounded = false;
    tone(510);
  }

  function update(delta, timestamp) {
    if (state !== "playing") return;
    const level = levels[levelIndex];
    const previousBottom = player.y + player.height;
    player.vx = 0;
    if (keys.left && !keys.right) player.vx = -325;
    if (keys.right && !keys.left) player.vx = 325;
    if ((!keys.left && !keys.right) || (keys.left && keys.right)) player.vx = 0;
    player.vy += 1580 * delta;
    player.x += player.vx * delta;
    player.y += player.vy * delta;
    player.x = Math.max(0, Math.min(width - player.width, player.x));
    player.grounded = false;

    level.platforms.forEach(([x, y, platformWidth, platformHeight]) => {
      const platform = { x, y, width: platformWidth, height: platformHeight };
      if (
        player.vy >= 0 &&
        previousBottom <= y + 8 &&
        player.y + player.height >= y &&
        player.x + player.width > x &&
        player.x < x + platformWidth
      ) {
        player.y = y - player.height;
        player.vy = 0;
        player.grounded = true;
      }
    });

    if (player.y > height + 30) {
      loseLife(timestamp);
      return;
    }
    level.hazards.forEach(([x, y, hazardWidth, hazardHeight]) => {
      if (overlaps(player, { x, y, width: hazardWidth, height: hazardHeight })) loseLife(timestamp);
    });

    const milestone = { x: level.milestone.x, y: level.milestone.y, width: 34, height: 34 };
    if (!levelCollected && overlaps(player, milestone)) {
      levelCollected = true;
      collected += 1;
      score += 700;
      elements.status.innerHTML = `<strong>${level.milestone.label} collected</strong>The portal is now active.`;
      tone(760, .16);
      updateHud();
    }

    const portal = { x: 895, y: 420, width: 45, height: 80 };
    if (overlaps(player, portal)) {
      player.x = 840;
      advanceLevel();
    }
  }

  function drawPlatform([x, y, platformWidth, platformHeight], accent) {
    context.fillStyle = "#102a25";
    context.fillRect(x, y, platformWidth, platformHeight);
    context.fillStyle = accent;
    context.fillRect(x, y, platformWidth, 7);
  }

  function draw() {
    const level = levels[levelIndex];
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, level.sky);
    gradient.addColorStop(1, "#f6f4ef");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.globalAlpha = .08;
    context.fillStyle = "#102a25";
    for (let x = 0; x < width; x += 80) {
      context.fillRect(x, 0, 2, height);
    }
    context.globalAlpha = 1;

    level.platforms.forEach((platform) => drawPlatform(platform, level.accent));
    level.hazards.forEach(([x, y, hazardWidth, hazardHeight]) => {
      context.fillStyle = "#ff6a65";
      for (let spike = 0; spike < hazardWidth; spike += 14) {
        context.beginPath();
        context.moveTo(x + spike, y + hazardHeight);
        context.lineTo(x + spike + 7, y);
        context.lineTo(x + spike + 14, y + hazardHeight);
        context.fill();
      }
    });

    const portalActive = levelCollected;
    context.fillStyle = portalActive ? level.accent : "#9aa9a4";
    context.strokeStyle = "#102a25";
    context.lineWidth = 6;
    context.beginPath();
    context.roundRect(895, 420, 45, 80, 20);
    context.fill();
    context.stroke();
    context.fillStyle = "#102a25";
    context.font = "900 8px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("NEXT", 917, 464);

    if (!levelCollected) {
      const milestone = level.milestone;
      context.fillStyle = level.accent;
      context.strokeStyle = "#102a25";
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(milestone.x + 17, milestone.y);
      context.lineTo(milestone.x + 34, milestone.y + 17);
      context.lineTo(milestone.x + 17, milestone.y + 34);
      context.lineTo(milestone.x, milestone.y + 17);
      context.closePath();
      context.fill();
      context.stroke();
      context.fillStyle = "#102a25";
      context.font = "900 8px Inter, sans-serif";
      context.fillText(milestone.label.toUpperCase(), milestone.x + 17, milestone.y + 20);
    }

    context.globalAlpha = performance.now() < invulnerableUntil && Math.floor(performance.now() / 100) % 2 ? .35 : 1;
    context.fillStyle = "#102a25";
    context.beginPath();
    context.roundRect(player.x, player.y, player.width, player.height, 9);
    context.fill();
    context.fillStyle = level.accent;
    context.font = "900 12px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("RD", player.x + (player.width / 2), player.y + 26);
    context.globalAlpha = 1;
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - lastTime) / 1000, .035);
    lastTime = timestamp;
    update(delta, timestamp);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "a", "A"].includes(event.key)) { keys.left = true; event.preventDefault(); }
    if (["ArrowRight", "d", "D"].includes(event.key)) { keys.right = true; event.preventDefault(); }
    if ([" ", "ArrowUp", "w", "W"].includes(event.key)) { event.preventDefault(); jump(); }
  });
  window.addEventListener("keyup", (event) => {
    if (["ArrowLeft", "a", "A"].includes(event.key)) keys.left = false;
    if (["ArrowRight", "d", "D"].includes(event.key)) keys.right = false;
  });
  [[elements.left, "left"], [elements.right, "right"]].forEach(([button, direction]) => {
    button.addEventListener("pointerdown", () => { keys[direction] = true; });
    button.addEventListener("pointerup", () => { keys[direction] = false; });
    button.addEventListener("pointercancel", () => { keys[direction] = false; });
  });
  elements.jump.addEventListener("pointerdown", jump);
  elements.start.addEventListener("click", startGame);
  elements.restart.addEventListener("click", startGame);
  elements.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    elements.sound.setAttribute("aria-pressed", String(soundEnabled));
  });
  elements.best.textContent = String(getBest());
  updateHud();
  requestAnimationFrame(frame);
})();
