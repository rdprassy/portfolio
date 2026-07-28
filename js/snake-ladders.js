(() => {
  "use strict";

  const board = document.querySelector("[data-board]");
  if (!board) return;

  const ladders = new Map([
    [3, 22], [5, 8], [11, 26], [20, 29], [27, 56],
    [36, 44], [51, 67], [71, 92], [80, 99]
  ]);
  const snakes = new Map([
    [17, 4], [19, 7], [21, 9], [43, 34], [54, 31],
    [62, 18], [64, 60], [87, 24], [95, 75], [98, 79]
  ]);
  const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const controls = {
    roll: document.querySelector("[data-roll-dice]"),
    dice: document.querySelector("[data-dice-face]"),
    message: document.querySelector("[data-game-message]"),
    turn: document.querySelector("[data-turn-label]"),
    rollCount: document.querySelector("[data-roll-count]"),
    best: document.querySelector("[data-board-best]"),
    reset: document.querySelector("[data-new-board-game]"),
    sound: document.querySelector("[data-sound-toggle]"),
    result: document.querySelector("[data-board-result]"),
    resultTitle: document.querySelector("[data-board-result-title]"),
    resultCopy: document.querySelector("[data-board-result-copy]"),
    playAgain: document.querySelector("[data-play-board-again]")
  };

  let mode = "solo";
  let players = [
    { name: "You", position: 0 },
    { name: "Browser", position: 0 }
  ];
  let currentPlayer = 0;
  let rollCount = 0;
  let rolling = false;
  let complete = false;
  let soundEnabled = true;
  let audioContext;
  let gameVersion = 0;

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function getBest() {
    try {
      const value = Number(window.localStorage.getItem("rdprassy-board-best"));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  function setBest(value) {
    try {
      window.localStorage.setItem("rdprassy-board-best", String(value));
    } catch {
      // The game remains fully playable when storage is unavailable.
    }
  }

  function track(name, parameters = {}) {
    if (typeof window.rdprassyTrack === "function") {
      window.rdprassyTrack(name, { game: "snake_ladders", ...parameters });
    }
  }

  function randomDie() {
    if (window.crypto?.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return (value[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  function tone(frequency, duration = .08, volume = .035) {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "square";
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Audio is an enhancement and may be blocked by the browser.
    }
  }

  function createBoard() {
    const fragment = document.createDocumentFragment();
    for (let row = 9; row >= 0; row -= 1) {
      const values = Array.from({ length: 10 }, (_, column) => (row * 10) + column + 1);
      if (row % 2 === 1) values.reverse();

      values.forEach((square) => {
        const cell = document.createElement("div");
        cell.className = "board-cell";
        cell.dataset.square = String(square);
        cell.setAttribute("aria-label", `Square ${square}`);
        const number = document.createElement("span");
        number.textContent = String(square);
        cell.append(number);

        const destination = ladders.get(square) || snakes.get(square);
        if (destination) {
          const route = document.createElement("span");
          const isLadder = ladders.has(square);
          route.className = `board-cell__route board-cell__route--${isLadder ? "ladder" : "snake"}`;
          route.textContent = `${isLadder ? "↗ Ladder" : "↘ Snake"} ${destination}`;
          cell.classList.add("is-special");
          cell.setAttribute(
            "aria-label",
            `Square ${square}, ${isLadder ? "ladder up" : "snake down"} to ${destination}`
          );
          cell.append(route);
        }

        const tokens = document.createElement("span");
        tokens.className = "board-cell__tokens";
        tokens.setAttribute("aria-hidden", "true");
        cell.append(tokens);
        fragment.append(cell);
      });
    }
    board.replaceChildren(fragment);
  }

  function playerName(index) {
    if (index === 0) return "You";
    return mode === "solo" ? "Browser" : "Player 2";
  }

  function updateTokens(movingPlayer = -1) {
    board.querySelectorAll(".board-cell__tokens").forEach((container) => container.replaceChildren());
    players.forEach((player, index) => {
      if (player.position < 1) return;
      const container = board.querySelector(`[data-square="${player.position}"] .board-cell__tokens`);
      if (!container) return;
      const token = document.createElement("span");
      token.className = `board-token board-token--${index === 0 ? "one" : "two"}`;
      if (index === movingPlayer) token.classList.add("is-moving");
      container.append(token);
    });
  }

  function updateInterface() {
    players.forEach((player, index) => {
      const name = document.querySelector(`[data-player-name="${index}"]`);
      const position = document.querySelector(`[data-player-position="${index}"]`);
      const panel = document.querySelector(`[data-player-panel="${index}"]`);
      if (name) name.textContent = playerName(index);
      if (position) position.textContent = String(player.position);
      if (panel) panel.classList.toggle("is-active", !complete && currentPlayer === index);
    });

    controls.rollCount.textContent = String(rollCount);
    controls.turn.textContent = complete
      ? "Game complete"
      : currentPlayer === 0
        ? "Your move"
        : mode === "solo"
          ? "Browser’s move"
          : "Player 2’s move";
    controls.roll.disabled = complete || rolling || (mode === "solo" && currentPlayer === 1);
    const best = getBest();
    controls.best.textContent = best ? String(best) : "—";
  }

  async function movePlayer(playerIndex, die, version) {
    const player = players[playerIndex];
    if (player.position + die > 100) {
      controls.message.textContent = `${playerName(playerIndex)} needs an exact roll to reach 100.`;
      tone(150, .12);
      await wait(reduceMotion ? 80 : 520);
      return;
    }

    for (let step = 0; step < die; step += 1) {
      if (version !== gameVersion) return;
      player.position += 1;
      updateTokens(playerIndex);
      updateInterface();
      tone(260 + (player.position * 2), .045, .02);
      await wait(reduceMotion ? 0 : 150);
    }

    const start = player.position;
    const destination = ladders.get(start) || snakes.get(start);
    if (destination) {
      const upward = ladders.has(start);
      controls.message.textContent = upward
        ? `Ladder! ${playerName(playerIndex)} climbs from ${start} to ${destination}.`
        : `Snake! ${playerName(playerIndex)} slides from ${start} to ${destination}.`;
      tone(upward ? 620 : 135, .2, .05);
      await wait(reduceMotion ? 80 : 650);
      if (version !== gameVersion) return;
      player.position = destination;
      updateTokens(playerIndex);
      updateInterface();
    } else {
      controls.message.textContent = `${playerName(playerIndex)} moved to square ${player.position}.`;
    }
  }

  function finishGame(winnerIndex) {
    complete = true;
    rolling = false;
    const winner = playerName(winnerIndex);
    let copy = `${winner} reached square 100 in ${rollCount} total rolls.`;

    if (mode === "solo" && winnerIndex === 0) {
      const previousBest = getBest();
      if (!previousBest || rollCount < previousBest) {
        setBest(rollCount);
        copy += " That is a new personal best.";
      }
    }

    controls.message.textContent = `${winner} wins!`;
    controls.resultTitle.textContent = winnerIndex === 0 ? "You win!" : `${winner} wins!`;
    controls.resultCopy.textContent = copy;
    controls.result.hidden = false;
    tone(523, .16, .05);
    window.setTimeout(() => tone(659, .16, .05), 120);
    window.setTimeout(() => tone(784, .3, .05), 240);
    updateInterface();
    controls.playAgain.focus();
    track("game_over", { mode, winner: winnerIndex === 0 ? "player_one" : "player_two", rolls: rollCount });
    window.rdprassyArcade?.complete("snake-ladders", {
      won: winnerIndex === 0,
      score: winnerIndex === 0 ? Math.max(1, 200 - rollCount) : 0
    });
  }

  async function takeTurn() {
    if (rolling || complete) return;
    const version = gameVersion;
    rolling = true;
    controls.roll.disabled = true;
    controls.dice.classList.remove("is-rolling");
    void controls.dice.offsetWidth;
    controls.dice.classList.add("is-rolling");
    controls.message.textContent = `${playerName(currentPlayer)} is rolling…`;

    const die = randomDie();
    for (let tick = 0; tick < (reduceMotion ? 1 : 7); tick += 1) {
      controls.dice.textContent = diceFaces[randomDie() - 1];
      tone(180 + (tick * 20), .035, .015);
      await wait(reduceMotion ? 0 : 55);
    }
    if (version !== gameVersion) return;

    controls.dice.textContent = diceFaces[die - 1];
    rollCount += 1;
    controls.message.textContent = `${playerName(currentPlayer)} rolled ${die}.`;
    updateInterface();
    await wait(reduceMotion ? 50 : 260);
    await movePlayer(currentPlayer, die, version);
    if (version !== gameVersion) return;

    if (players[currentPlayer].position === 100) {
      finishGame(currentPlayer);
      return;
    }

    currentPlayer = currentPlayer === 0 ? 1 : 0;
    rolling = false;
    updateInterface();

    if (mode === "solo" && currentPlayer === 1 && !complete) {
      controls.message.textContent = "The browser is thinking…";
      await wait(reduceMotion ? 150 : 780);
      if (version === gameVersion) takeTurn();
    }
  }

  function resetGame(announce = true) {
    gameVersion += 1;
    players = [
      { name: "You", position: 0 },
      { name: mode === "solo" ? "Browser" : "Player 2", position: 0 }
    ];
    currentPlayer = 0;
    rollCount = 0;
    rolling = false;
    complete = false;
    controls.result.hidden = true;
    controls.dice.textContent = "⚄";
    controls.message.textContent = "Roll the dice to begin.";
    updateTokens();
    updateInterface();
    if (announce) {
      track("game_start", { mode });
      window.rdprassyArcade?.start("snake-ladders");
    }
  }

  document.querySelectorAll("[data-game-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.gameMode;
      document.querySelectorAll("[data-game-mode]").forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      resetGame();
    });
  });

  controls.roll.addEventListener("click", takeTurn);
  controls.reset.addEventListener("click", () => resetGame());
  controls.playAgain.addEventListener("click", () => resetGame());
  controls.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    controls.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    controls.sound.setAttribute("aria-pressed", String(soundEnabled));
    controls.sound.setAttribute("aria-label", `Turn game sounds ${soundEnabled ? "off" : "on"}`);
    if (soundEnabled) tone(440);
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "SUMMARY") return;
    event.preventDefault();
    takeTurn();
  });

  createBoard();
  resetGame(false);
  window.rdprassyArcade?.start("snake-ladders");
})();
