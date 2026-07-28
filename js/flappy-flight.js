(() => {
  "use strict";

  const canvas = document.querySelector("[data-flight-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const groundHeight = 64;
  const bird = { x: 220, y: height / 2, radius: 22, velocity: 0, rotation: 0 };
  const controls = {
    stage: document.querySelector("[data-flight-stage]"),
    score: document.querySelector("[data-flight-score]"),
    best: document.querySelector("[data-flight-best]"),
    overlay: document.querySelector("[data-flight-overlay]"),
    overlayTitle: document.querySelector("[data-flight-overlay-title]"),
    overlayCopy: document.querySelector("[data-flight-overlay-copy]"),
    start: document.querySelector("[data-flight-start]"),
    status: document.querySelector("[data-flight-status]"),
    flap: document.querySelector("[data-flap]"),
    pause: document.querySelector("[data-flight-pause]"),
    restart: document.querySelector("[data-flight-restart]"),
    sound: document.querySelector("[data-flight-sound]")
  };

  let state = "ready";
  let score = 0;
  let pipes = [];
  let pipeTimer = .95;
  let lastTime = performance.now();
  let visualTime = 0;
  let soundEnabled = true;
  let audioContext;

  function getBest() {
    try {
      const stored = Number(window.localStorage.getItem("rdprassy-flight-best"));
      return Number.isFinite(stored) && stored > 0 ? stored : 0;
    } catch {
      return 0;
    }
  }

  function setBest(value) {
    try {
      window.localStorage.setItem("rdprassy-flight-best", String(value));
    } catch {
      // Persistence is optional; gameplay is not.
    }
  }

  function track(name, parameters = {}) {
    if (typeof window.rdprassyTrack === "function") {
      window.rdprassyTrack(name, { game: "flappy_flight", ...parameters });
    }
  }

  function tone(frequency, duration = .07, volume = .03, type = "sine") {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Some browsers block Web Audio until a later user interaction.
    }
  }

  function updateScore() {
    controls.score.textContent = String(score);
    controls.best.textContent = String(Math.max(score, getBest()));
  }

  function showOverlay(title, copy, action) {
    controls.overlayTitle.textContent = title;
    controls.overlayCopy.textContent = copy;
    controls.start.textContent = action;
    controls.overlay.hidden = false;
  }

  function hideOverlay() {
    controls.overlay.hidden = true;
  }

  function resetWorld() {
    score = 0;
    pipes = [];
    pipeTimer = .95;
    bird.y = height / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    updateScore();
  }

  function startGame() {
    resetWorld();
    state = "playing";
    controls.pause.disabled = false;
    controls.pause.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    hideOverlay();
    controls.status.textContent = "Flight started. Score 0.";
    canvas.focus({ preventScroll: true });
    track("game_start");
    window.rdprassyArcade?.start("flappy-flight");
    flap();
  }

  function flap() {
    if (state === "ready" || state === "gameover") {
      startGame();
      return;
    }
    if (state === "paused") {
      resumeGame();
      return;
    }
    if (state !== "playing") return;
    bird.velocity = -500;
    tone(620, .055, .025, "square");
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    controls.pause.innerHTML = '<span aria-hidden="true">▶</span> Resume';
    controls.status.textContent = "Flight paused.";
    showOverlay("Flight paused", "Your run is safe. Resume when you are ready.", "Resume flight");
  }

  function resumeGame() {
    if (state !== "paused") return;
    state = "playing";
    controls.pause.innerHTML = '<span aria-hidden="true">Ⅱ</span> Pause';
    controls.status.textContent = `Flight resumed. Score ${score}.`;
    hideOverlay();
    canvas.focus({ preventScroll: true });
  }

  function endGame() {
    if (state !== "playing") return;
    state = "gameover";
    controls.pause.disabled = true;
    const previousBest = getBest();
    const isBest = score > previousBest;
    if (isBest) setBest(score);
    updateScore();
    controls.status.textContent = `Flight over. Final score ${score}.`;
    showOverlay(
      isBest ? "New best flight!" : "Flight complete",
      `You cleared ${score} ${score === 1 ? "pipe" : "pipes"}.${isBest ? " New personal best." : ""}`,
      "Fly again"
    );
    tone(175, .24, .045, "sawtooth");
    track("game_over", { score, personal_best: isBest });
    window.rdprassyArcade?.complete("flappy-flight", { completed: true, score });
  }

  function addPipe() {
    const gap = Math.max(144, 184 - (Math.floor(score / 10) * 4));
    const margin = 76;
    const playableHeight = height - groundHeight;
    const top = margin + (Math.random() * (playableHeight - gap - (margin * 2)));
    pipes.push({
      x: width + 30,
      width: 86,
      top,
      gap,
      counted: false
    });
  }

  function intersectsPipe(pipe) {
    const inset = 5;
    const birdLeft = bird.x - bird.radius + inset;
    const birdRight = bird.x + bird.radius - inset;
    const birdTop = bird.y - bird.radius + inset;
    const birdBottom = bird.y + bird.radius - inset;
    const overlapsX = birdRight > pipe.x && birdLeft < pipe.x + pipe.width;
    if (!overlapsX) return false;
    return birdTop < pipe.top || birdBottom > pipe.top + pipe.gap;
  }

  function update(delta) {
    visualTime += delta;
    if (state === "ready") {
      bird.y = (height / 2) + (Math.sin(visualTime * 3) * 8);
      bird.rotation = Math.sin(visualTime * 3) * .05;
      return;
    }
    if (state !== "playing") return;

    const gravity = 1450;
    const speed = 210 + (Math.floor(score / 5) * 12);
    bird.velocity += gravity * delta;
    bird.y += bird.velocity * delta;
    bird.rotation = Math.max(-.45, Math.min(1.05, bird.velocity / 680));

    pipeTimer -= delta;
    if (pipeTimer <= 0) {
      addPipe();
      pipeTimer = Math.max(1.12, 1.48 - (score * .008));
    }

    pipes.forEach((pipe) => {
      pipe.x -= speed * delta;
      if (!pipe.counted && pipe.x + pipe.width < bird.x) {
        pipe.counted = true;
        score += 1;
        updateScore();
        controls.status.textContent = `Score ${score}.`;
        tone(880, .08, .035, "square");
      }
    });
    pipes = pipes.filter((pipe) => pipe.x + pipe.width > -20);

    if (
      bird.y - bird.radius <= 0 ||
      bird.y + bird.radius >= height - groundHeight ||
      pipes.some(intersectsPipe)
    ) {
      endGame();
    }
  }

  function roundedRectangle(x, y, rectangleWidth, rectangleHeight, radius) {
    const safeRadius = Math.min(radius, rectangleWidth / 2, rectangleHeight / 2);
    context.beginPath();
    context.roundRect(x, y, rectangleWidth, rectangleHeight, safeRadius);
  }

  function drawCloud(x, y, scale) {
    context.save();
    context.globalAlpha = .62;
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(x, y, 25 * scale, Math.PI, 0);
    context.arc(x + (28 * scale), y - (12 * scale), 34 * scale, Math.PI, 0);
    context.arc(x + (64 * scale), y, 24 * scale, Math.PI, 0);
    context.lineTo(x + (88 * scale), y + (17 * scale));
    context.lineTo(x - (25 * scale), y + (17 * scale));
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawBackground() {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#67e2dc");
    sky.addColorStop(.72, "#c7f4df");
    sky.addColorStop(1, "#e9efc0");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    const drift = (visualTime * 18) % (width + 220);
    drawCloud(width - drift, 88, .9);
    drawCloud((width + 430 - drift) % (width + 280) - 120, 175, .58);
    drawCloud((width + 760 - drift) % (width + 320) - 140, 62, .7);

    context.fillStyle = "#7dd5aa";
    context.beginPath();
    context.moveTo(0, height - groundHeight);
    for (let x = 0; x <= width; x += 80) {
      const y = height - groundHeight - 42 - (Math.sin((x / 115) + .7) * 26);
      context.lineTo(x, y);
    }
    context.lineTo(width, height - groundHeight);
    context.closePath();
    context.fill();
  }

  function drawPipe(pipe) {
    const capHeight = 24;
    const capOverhang = 8;
    const gradient = context.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    gradient.addColorStop(0, "#075e4d");
    gradient.addColorStop(.45, "#1ba07f");
    gradient.addColorStop(1, "#064c40");
    context.fillStyle = gradient;
    context.strokeStyle = "#102a25";
    context.lineWidth = 6;

    roundedRectangle(pipe.x, -12, pipe.width, pipe.top + 12, 9);
    context.fill();
    context.stroke();
    roundedRectangle(pipe.x - capOverhang, pipe.top - capHeight, pipe.width + (capOverhang * 2), capHeight, 6);
    context.fill();
    context.stroke();

    const bottom = pipe.top + pipe.gap;
    roundedRectangle(pipe.x, bottom, pipe.width, height - groundHeight - bottom + 12, 9);
    context.fill();
    context.stroke();
    roundedRectangle(pipe.x - capOverhang, bottom, pipe.width + (capOverhang * 2), capHeight, 6);
    context.fill();
    context.stroke();

    context.fillStyle = "rgba(255,255,255,.16)";
    context.fillRect(pipe.x + 14, 0, 9, Math.max(0, pipe.top - 25));
    context.fillRect(pipe.x + 14, bottom + 25, 9, height - groundHeight - bottom - 25);
  }

  function drawBird() {
    context.save();
    context.translate(bird.x, bird.y);
    context.rotate(bird.rotation);

    context.fillStyle = "#8d75ff";
    context.strokeStyle = "#102a25";
    context.lineWidth = 6;
    context.beginPath();
    context.ellipse(-18, 7, 23, 14, -.25, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#c8ff5d";
    context.beginPath();
    context.ellipse(0, 0, 30, 24, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(17, -10, 11, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = "#102a25";
    context.beginPath();
    context.arc(20, -9, 4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ef9e56";
    context.beginPath();
    context.moveTo(27, -2);
    context.lineTo(50, 5);
    context.lineTo(27, 11);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = "#102a25";
    context.font = "900 12px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("RD", 1, 4);
    context.restore();
  }

  function drawGround() {
    const stripeOffset = (visualTime * 100) % 48;
    context.fillStyle = "#102a25";
    context.fillRect(0, height - groundHeight, width, 9);
    context.fillStyle = "#e4ecc4";
    context.fillRect(0, height - groundHeight + 9, width, groundHeight - 9);
    context.strokeStyle = "#8bbf7f";
    context.lineWidth = 9;
    for (let x = -48 + stripeOffset; x < width + 48; x += 48) {
      context.beginPath();
      context.moveTo(x, height - groundHeight + 12);
      context.lineTo(x + 26, height);
      context.stroke();
    }
  }

  function drawScore() {
    if (state === "ready") return;
    context.save();
    context.fillStyle = "rgba(16, 42, 37, .78)";
    roundedRectangle((width / 2) - 43, 24, 86, 66, 18);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "900 42px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(score), width / 2, 57);
    context.restore();
  }

  function draw() {
    drawBackground();
    pipes.forEach(drawPipe);
    drawGround();
    drawBird();
    drawScore();
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - lastTime) / 1000, .035);
    lastTime = timestamp;
    update(delta);
    draw();
    window.requestAnimationFrame(frame);
  }

  controls.start.addEventListener("click", () => {
    if (state === "paused") resumeGame();
    else startGame();
  });
  controls.flap.addEventListener("click", flap);
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    flap();
  });
  controls.pause.addEventListener("click", () => {
    if (state === "paused") resumeGame();
    else pauseGame();
  });
  controls.restart.addEventListener("click", startGame);
  controls.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    controls.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    controls.sound.setAttribute("aria-pressed", String(soundEnabled));
    controls.sound.setAttribute("aria-label", `Turn game sounds ${soundEnabled ? "off" : "on"}`);
    if (soundEnabled) tone(520);
  });

  window.addEventListener("keydown", (event) => {
    if (!["Space", "ArrowUp"].includes(event.code) || event.repeat) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    event.preventDefault();
    flap();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") pauseGame();
  });

  resetWorld();
  showOverlay("Ready for takeoff?", "Press Space, click, or tap to flap through the gaps.", "Start flight");
  window.requestAnimationFrame(frame);
})();
