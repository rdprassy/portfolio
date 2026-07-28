(() => {
  "use strict";

  const input = document.querySelector("[data-code-input]");
  if (!input) return;

  const commandSets = {
    starter: [
      "git status", "npm run build", "docker ps", "git pull origin main",
      "npm test", "java -version", "node --version", "git log --oneline"
    ],
    engineer: [
      "git checkout -b feature/arcade", "docker compose up --build",
      "npm run test -- --coverage", "kubectl get pods --all-namespaces",
      "mvn clean verify -DskipTests=false", "git rebase origin/main",
      "curl -fsS https://api.example.com/health", "terraform plan -out=release.plan"
    ],
    architect: [
      "kubectl rollout status deployment/api-gateway",
      "aws cloudformation validate-template --template-body file://stack.yml",
      "docker buildx build --platform linux/amd64,linux/arm64 .",
      "git log --graph --decorate --all --oneline",
      "terraform apply -auto-approve release.plan",
      "mvn dependency:tree -Dincludes=org.springframework",
      "npm audit --omit=dev --audit-level=high",
      "curl -H \"Authorization: Bearer token\" https://api.example.com/v1"
    ]
  };
  const elements = {
    prompt: document.querySelector("[data-code-prompt]"),
    feedback: document.querySelector("[data-code-feedback]"),
    time: document.querySelector("[data-code-time]"),
    score: document.querySelector("[data-code-score]"),
    completed: document.querySelector("[data-code-completed]"),
    combo: document.querySelector("[data-code-combo]"),
    wpm: document.querySelector("[data-code-wpm]"),
    best: document.querySelector("[data-code-best]"),
    stage: document.querySelector("[data-code-stage]"),
    status: document.querySelector("[data-code-status]"),
    difficulty: document.querySelector("[data-code-difficulty]"),
    start: document.querySelector("[data-code-start]"),
    reset: document.querySelector("[data-code-reset]"),
    sound: document.querySelector("[data-code-sound]")
  };

  let command = "";
  let time = 60;
  let score = 0;
  let completed = 0;
  let combo = 1;
  let typedCharacters = 0;
  let running = false;
  let timer;
  let previousIndex = -1;
  let soundEnabled = true;
  let audioContext;

  function getBest() {
    try { return Number(localStorage.getItem("rdprassy-code-best")) || 0; } catch { return 0; }
  }

  function tone(frequency, duration = .06) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "square";
      gain.gain.setValueAtTime(.025, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch { /* optional audio */ }
  }

  function chooseCommand() {
    const list = commandSets[elements.difficulty.value];
    let index;
    do { index = Math.floor(Math.random() * list.length); } while (index === previousIndex && list.length > 1);
    previousIndex = index;
    command = list[index];
    input.value = "";
    renderPrompt();
  }

  function renderPrompt() {
    const value = input.value;
    elements.prompt.replaceChildren(...Array.from(command).map((character, index) => {
      const span = document.createElement("span");
      span.textContent = character;
      if (index < value.length) span.className = value[index] === character ? "is-complete" : "is-error";
      else if (index === value.length) span.className = "is-current";
      return span;
    }));
  }

  function update() {
    const elapsedMinutes = Math.max((60 - time) / 60, 1 / 60);
    elements.time.textContent = String(time);
    elements.score.textContent = String(score);
    elements.completed.textContent = String(completed);
    elements.combo.textContent = `×${combo}`;
    elements.wpm.textContent = String(Math.round((typedCharacters / 5) / elapsedMinutes));
    elements.best.textContent = String(Math.max(score, getBest()));
  }

  function endSprint() {
    if (!running) return;
    running = false;
    clearInterval(timer);
    input.disabled = true;
    elements.start.disabled = false;
    elements.difficulty.disabled = false;
    elements.stage.textContent = "COMPLETE";
    const previousBest = getBest();
    if (score > previousBest) {
      try { localStorage.setItem("rdprassy-code-best", String(score)); } catch { /* optional persistence */ }
    }
    elements.status.innerHTML = `<strong>Sprint complete</strong>${completed} commands shipped with a final score of ${score}.`;
    elements.feedback.textContent = score > previousBest ? "New personal best committed." : "Sprint closed. Reset or run again.";
    tone(784, .24);
    window.rdprassyArcade?.complete("code-sprint", { completed: true, score });
    window.rdprassyTrack?.("game_over", { game: "code_sprint", score, commands: completed });
    update();
  }

  function startSprint() {
    clearInterval(timer);
    time = 60;
    score = 0;
    completed = 0;
    combo = 1;
    typedCharacters = 0;
    running = true;
    elements.start.disabled = true;
    elements.difficulty.disabled = true;
    input.disabled = false;
    elements.stage.textContent = "LIVE";
    elements.status.innerHTML = "<strong>Deployment window open</strong>Type each command exactly as displayed.";
    chooseCommand();
    input.focus();
    update();
    window.rdprassyArcade?.start("code-sprint");
    window.rdprassyTrack?.("game_start", { game: "code_sprint", difficulty: elements.difficulty.value });
    timer = window.setInterval(() => {
      time -= 1;
      update();
      if (time <= 0) endSprint();
    }, 1000);
  }

  function resetSprint() {
    clearInterval(timer);
    running = false;
    time = 60;
    score = 0;
    completed = 0;
    combo = 1;
    typedCharacters = 0;
    input.value = "";
    input.disabled = true;
    elements.start.disabled = false;
    elements.difficulty.disabled = false;
    elements.stage.textContent = "WAITING";
    elements.prompt.textContent = "Press Start Sprint to load the first command.";
    elements.feedback.textContent = "Accuracy builds the multiplier.";
    elements.status.innerHTML = "<strong>Terminal ready</strong>Select a difficulty and start the sprint.";
    update();
  }

  input.addEventListener("input", () => {
    if (!running) return;
    renderPrompt();
    const value = input.value;
    const accurate = command.startsWith(value);
    elements.feedback.textContent = accurate ? "Syntax valid…" : "Mismatch detected — correct the highlighted character.";
    if (!accurate) {
      combo = 1;
      tone(150);
    }
    if (value === command) {
      const multiplier = elements.difficulty.value === "architect" ? 3 : elements.difficulty.value === "engineer" ? 2 : 1;
      score += command.length * combo * multiplier;
      typedCharacters += command.length;
      completed += 1;
      combo = Math.min(combo + 1, 9);
      tone(660, .1);
      chooseCommand();
    }
    update();
  });

  elements.start.addEventListener("click", startSprint);
  elements.reset.addEventListener("click", resetSprint);
  elements.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    elements.sound.setAttribute("aria-pressed", String(soundEnabled));
  });
  elements.best.textContent = String(getBest());
})();
