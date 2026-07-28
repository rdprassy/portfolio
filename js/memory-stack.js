(() => {
  "use strict";

  const board = document.querySelector("[data-memory-board]");
  if (!board) return;

  const pairs = [
    { id: "amazon", technology: "AWS Lambda", outcome: "Automated weekly operations" },
    { id: "oracle", technology: "Spring Boot", outcome: "Cloud change audit trail" },
    { id: "teradata", technology: "Eclipse RCP", outcome: "Analytics developer tooling" },
    { id: "axa", technology: "Java", outcome: "Dynamic premium calculation" },
    { id: "pega", technology: "Microservices", outcome: "Shared platform capability" },
    { id: "palm", technology: "Gabor Filters", outcome: "Palmprint feature extraction" },
    { id: "aligniq", technology: "TypeScript", outcome: "Requirements traceability" },
    { id: "nft", technology: "Solidity", outcome: "Creator-owned collections" },
    { id: "wallet", technology: "ethers.js", outcome: "Wallet balance lookup" },
    { id: "ai", technology: "RAG", outcome: "Grounded enterprise answers" },
    { id: "cloud", technology: "Docker", outcome: "Repeatable deployments" },
    { id: "frontend", technology: "React", outcome: "Interactive product interfaces" }
  ];
  const elements = {
    time: document.querySelector("[data-memory-time]"),
    moves: document.querySelector("[data-memory-moves]"),
    pairs: document.querySelector("[data-memory-pairs]"),
    streak: document.querySelector("[data-memory-streak]"),
    score: document.querySelector("[data-memory-score]"),
    best: document.querySelector("[data-memory-best]"),
    status: document.querySelector("[data-memory-status]"),
    newGame: document.querySelector("[data-memory-new]"),
    sound: document.querySelector("[data-memory-sound]")
  };
  let cards = [];
  let openCards = [];
  let matched = 0;
  let moves = 0;
  let streak = 0;
  let elapsed = 0;
  let timer;
  let started = false;
  let locked = false;
  let soundEnabled = true;
  let audioContext;

  function shuffle(values) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
  }

  function getBest() {
    try { return Number(localStorage.getItem("rdprassy-memory-best")) || 0; } catch { return 0; }
  }

  function tone(frequency, duration = .08) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.03, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* optional audio */ }
  }

  function currentScore() {
    return Math.max(0, (matched * 800) + (streak * 100) - (moves * 18) - (elapsed * 6));
  }

  function update() {
    const minutes = Math.floor(elapsed / 60);
    const seconds = String(elapsed % 60).padStart(2, "0");
    const score = currentScore();
    elements.time.textContent = `${minutes}:${seconds}`;
    elements.moves.textContent = String(moves);
    elements.pairs.textContent = String(matched);
    elements.streak.textContent = String(streak);
    elements.score.textContent = String(score);
    elements.best.textContent = String(Math.max(score, getBest()));
  }

  function beginTimer() {
    if (started) return;
    started = true;
    window.rdprassyArcade?.start("memory-stack");
    timer = window.setInterval(() => {
      elapsed += 1;
      update();
    }, 1000);
  }

  function finishGame() {
    clearInterval(timer);
    const score = currentScore();
    const best = getBest();
    if (score > best) {
      try { localStorage.setItem("rdprassy-memory-best", String(score)); } catch { /* optional persistence */ }
    }
    elements.status.innerHTML = `<strong>Stack reconstructed</strong>All 12 pairs matched in ${moves} moves and ${elapsed} seconds.`;
    tone(784, .3);
    window.rdprassyArcade?.complete("memory-stack", { completed: true, score });
    window.rdprassyTrack?.("game_over", { game: "memory_stack", score, moves, elapsed });
    update();
  }

  function flipCard(button) {
    if (locked || button.classList.contains("is-flipped") || button.classList.contains("is-matched")) return;
    beginTimer();
    button.classList.add("is-flipped");
    button.setAttribute("aria-pressed", "true");
    openCards.push(button);
    tone(430);
    if (openCards.length < 2) return;

    moves += 1;
    locked = true;
    const [first, second] = openCards;
    const match = first.dataset.pair === second.dataset.pair;
    if (match) {
      window.setTimeout(() => {
        first.classList.add("is-matched");
        second.classList.add("is-matched");
        first.disabled = true;
        second.disabled = true;
        matched += 1;
        streak += 1;
        openCards = [];
        locked = false;
        elements.status.innerHTML = `<strong>Correct pair</strong>${first.dataset.label} connects with ${second.dataset.label}.`;
        tone(660, .12);
        update();
        if (matched === pairs.length) finishGame();
      }, 360);
    } else {
      streak = 0;
      window.setTimeout(() => {
        first.classList.remove("is-flipped");
        second.classList.remove("is-flipped");
        first.setAttribute("aria-pressed", "false");
        second.setAttribute("aria-pressed", "false");
        openCards = [];
        locked = false;
        elements.status.innerHTML = "<strong>Not this pair</strong>Keep the positions in memory and try again.";
        tone(170);
        update();
      }, 820);
    }
    update();
  }

  function createCard(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-card";
    button.dataset.pair = item.id;
    button.dataset.label = item.label;
    button.setAttribute("aria-label", `Hidden card ${item.position + 1}`);
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<span class="memory-card__inner"><span class="memory-card__face memory-card__front" aria-hidden="true">RD</span><span class="memory-card__face memory-card__back"><strong>${item.label}</strong><small>${item.kind}</small></span></span>`;
    button.addEventListener("click", () => flipCard(button));
    return button;
  }

  function newGame() {
    clearInterval(timer);
    openCards = [];
    matched = 0;
    moves = 0;
    streak = 0;
    elapsed = 0;
    started = false;
    locked = false;
    cards = shuffle(pairs.flatMap((pair) => [
      { id: pair.id, label: pair.technology, kind: "Technology" },
      { id: pair.id, label: pair.outcome, kind: "Project outcome" }
    ]));
    board.replaceChildren(...cards.map((item, position) => createCard({ ...item, position })));
    elements.status.innerHTML = "<strong>Board ready</strong>Turn over two cards to find a technology–outcome pair.";
    update();
  }

  elements.newGame.addEventListener("click", newGame);
  elements.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    elements.sound.setAttribute("aria-pressed", String(soundEnabled));
  });
  newGame();
})();
