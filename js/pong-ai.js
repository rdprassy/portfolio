(() => {
  "use strict";

  const canvas = document.querySelector("[data-pong-canvas]");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const paddleHeight = 110;
  const elements = {
    difficulty: document.querySelector("[data-pong-difficulty]"),
    start: document.querySelector("[data-pong-start]"),
    overlay: document.querySelector("[data-pong-overlay]"),
    overlayTitle: document.querySelector("[data-pong-overlay-title]"),
    overlayCopy: document.querySelector("[data-pong-overlay-copy]"),
    overlayButton: document.querySelector("[data-pong-overlay-button]"),
    player: document.querySelector("[data-pong-player]"),
    ai: document.querySelector("[data-pong-ai]"),
    rally: document.querySelector("[data-pong-rally]"),
    best: document.querySelector("[data-pong-best]"),
    status: document.querySelector("[data-pong-status]"),
    restart: document.querySelector("[data-pong-restart]"),
    sound: document.querySelector("[data-pong-sound]"),
    up: document.querySelector("[data-pong-up]"),
    down: document.querySelector("[data-pong-down]"),
    pause: document.querySelector("[data-pong-pause]")
  };
  const player = { x: 36, y: (height - paddleHeight) / 2, width: 18, height: paddleHeight };
  const ai = { x: width - 54, y: (height - paddleHeight) / 2, width: 18, height: paddleHeight };
  const ball = { x: width / 2, y: height / 2, radius: 12, vx: 420, vy: 120 };
  const keys = { up: false, down: false };
  let state = "ready";
  let playerScore = 0;
  let aiScore = 0;
  let rally = 0;
  let lastTime = performance.now();
  let serveAt = 0;
  let soundEnabled = true;
  let audioContext;

  function getBest() {
    try { return Number(localStorage.getItem("rdprassy-pong-best")) || 0; } catch { return 0; }
  }

  function tone(frequency, duration = .055) {
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

  function showOverlay(title, copy, action) {
    elements.overlayTitle.textContent = title;
    elements.overlayCopy.textContent = copy;
    elements.overlayButton.textContent = action;
    elements.overlay.hidden = false;
  }

  function resetBall(direction = Math.random() > .5 ? 1 : -1) {
    ball.x = width / 2;
    ball.y = height / 2;
    const angle = (Math.random() * .7) - .35;
    ball.vx = Math.cos(angle) * 410 * direction;
    ball.vy = Math.sin(angle) * 410;
    rally = 0;
    elements.rally.textContent = "0";
    state = "serve";
    serveAt = performance.now() + 700;
  }

  function updateScore() {
    elements.player.textContent = String(playerScore);
    elements.ai.textContent = String(aiScore);
    elements.rally.textContent = String(rally);
    elements.best.textContent = String(Math.max(rally, getBest()));
  }

  function startMatch() {
    playerScore = 0;
    aiScore = 0;
    player.y = (height - paddleHeight) / 2;
    ai.y = (height - paddleHeight) / 2;
    resetBall(1);
    elements.overlay.hidden = true;
    elements.start.textContent = "Restart match";
    elements.status.innerHTML = "<strong>Opening serve</strong>First player to seven points wins.";
    canvas.focus({ preventScroll: true });
    updateScore();
    window.rdprassyArcade?.start("pong-ai");
  }

  function finishMatch(playerWon) {
    state = "over";
    showOverlay(
      playerWon ? "You beat the AI!" : "The AI takes the match.",
      `${playerScore}–${aiScore}. ${playerWon ? "Excellent angle control." : "Read the return and challenge it again."}`,
      "Play again"
    );
    elements.status.innerHTML = `<strong>Match complete</strong>Final score ${playerScore}–${aiScore}.`;
    window.rdprassyArcade?.complete("pong-ai", { won: playerWon, score: (playerScore * 100) + getBest() });
    window.rdprassyTrack?.("game_over", { game: "pong_ai", won: playerWon, player_score: playerScore, ai_score: aiScore });
    tone(playerWon ? 760 : 150, .25);
  }

  function scorePoint(forPlayer) {
    if (forPlayer) playerScore += 1;
    else aiScore += 1;
    tone(forPlayer ? 620 : 180, .12);
    updateScore();
    if (playerScore >= 7 || aiScore >= 7) finishMatch(playerScore >= 7);
    else {
      elements.status.innerHTML = `<strong>${forPlayer ? "Point to you" : "Point to the AI"}</strong>${playerScore}–${aiScore}. Next serve incoming.`;
      resetBall(forPlayer ? -1 : 1);
    }
  }

  function paddleCollision(paddle, movingRight) {
    const approaching = movingRight ? ball.vx > 0 : ball.vx < 0;
    if (!approaching) return false;
    const overlapsX = ball.x + ball.radius > paddle.x && ball.x - ball.radius < paddle.x + paddle.width;
    const overlapsY = ball.y + ball.radius > paddle.y && ball.y - ball.radius < paddle.y + paddle.height;
    if (!overlapsX || !overlapsY) return false;
    const relative = (ball.y - (paddle.y + (paddle.height / 2))) / (paddle.height / 2);
    const speed = Math.min(760, Math.hypot(ball.vx, ball.vy) * 1.045);
    ball.vx = Math.abs(Math.cos(relative * .85) * speed) * (movingRight ? -1 : 1);
    ball.vy = Math.sin(relative * .85) * speed;
    ball.x = movingRight ? paddle.x - ball.radius : paddle.x + paddle.width + ball.radius;
    rally += 1;
    if (rally > getBest()) {
      try { localStorage.setItem("rdprassy-pong-best", String(rally)); } catch { /* optional persistence */ }
    }
    updateScore();
    tone(340 + (rally * 9));
    return true;
  }

  function update(delta, timestamp) {
    if (state === "serve" && timestamp >= serveAt) state = "playing";
    if (state !== "playing") return;

    const playerSpeed = 570;
    if (keys.up) player.y -= playerSpeed * delta;
    if (keys.down) player.y += playerSpeed * delta;
    const gamepad = navigator.getGamepads?.()[0];
    const gamepadAxis = gamepad?.axes?.[1] || 0;
    if (Math.abs(gamepadAxis) > .16) player.y += gamepadAxis * playerSpeed * delta;
    player.y = Math.max(0, Math.min(height - paddleHeight, player.y));

    const settings = {
      rookie: { speed: 300, error: 55 },
      pro: { speed: 425, error: 24 },
      elite: { speed: 540, error: 7 }
    }[elements.difficulty.value];
    const target = ball.y - (paddleHeight / 2) + (Math.sin(timestamp / 380) * settings.error);
    const difference = target - ai.y;
    ai.y += Math.sign(difference) * Math.min(Math.abs(difference), settings.speed * delta);
    ai.y = Math.max(0, Math.min(height - paddleHeight, ai.y));

    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= height) {
      ball.y = Math.max(ball.radius, Math.min(height - ball.radius, ball.y));
      ball.vy *= -1;
      tone(250);
    }
    paddleCollision(player, false);
    paddleCollision(ai, true);
    if (ball.x < -30) scorePoint(false);
    if (ball.x > width + 30) scorePoint(true);
  }

  function draw() {
    context.fillStyle = "#071713";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(255,255,255,.2)";
    context.lineWidth = 4;
    context.setLineDash([14, 14]);
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "#c8ff5d";
    context.fillRect(player.x, player.y, player.width, player.height);
    context.fillStyle = "#65e9e4";
    context.fillRect(ai.x, ai.y, ai.width, ai.height);
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fill();
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - lastTime) / 1000, .035);
    lastTime = timestamp;
    update(delta, timestamp);
    draw();
    requestAnimationFrame(frame);
  }

  function togglePause() {
    if (state === "playing" || state === "serve") {
      state = "paused";
      showOverlay("Match paused", "Your score and rally are safe.", "Resume");
    } else if (state === "paused") {
      state = "playing";
      elements.overlay.hidden = true;
      canvas.focus({ preventScroll: true });
    }
  }

  function setPointerPosition(event) {
    if (!["playing", "serve"].includes(state)) return;
    const rectangle = canvas.getBoundingClientRect();
    const y = ((event.clientY - rectangle.top) / rectangle.height) * height;
    player.y = Math.max(0, Math.min(height - paddleHeight, y - (paddleHeight / 2)));
  }

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "w", "W"].includes(event.key)) { keys.up = true; event.preventDefault(); }
    if (["ArrowDown", "s", "S"].includes(event.key)) { keys.down = true; event.preventDefault(); }
    if (event.key.toLowerCase() === "p") togglePause();
  });
  window.addEventListener("keyup", (event) => {
    if (["ArrowUp", "w", "W"].includes(event.key)) keys.up = false;
    if (["ArrowDown", "s", "S"].includes(event.key)) keys.down = false;
  });
  canvas.addEventListener("pointermove", setPointerPosition);
  canvas.addEventListener("pointerdown", setPointerPosition);
  [[elements.up, "up"], [elements.down, "down"]].forEach(([button, direction]) => {
    button.addEventListener("pointerdown", () => { keys[direction] = true; });
    button.addEventListener("pointerup", () => { keys[direction] = false; });
    button.addEventListener("pointercancel", () => { keys[direction] = false; });
  });
  elements.pause.addEventListener("click", togglePause);
  elements.start.addEventListener("click", startMatch);
  elements.overlayButton.addEventListener("click", () => state === "paused" ? togglePause() : startMatch());
  elements.restart.addEventListener("click", startMatch);
  elements.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    elements.sound.setAttribute("aria-pressed", String(soundEnabled));
  });
  elements.best.textContent = String(getBest());
  requestAnimationFrame(frame);
})();
