(() => {
  "use strict";

  const boardElement = document.querySelector("[data-connect-board]");
  if (!boardElement) return;

  const rows = 6;
  const columns = 7;
  const elements = {
    status: document.querySelector("[data-connect-status]"),
    red: document.querySelector("[data-connect-red]"),
    yellow: document.querySelector("[data-connect-yellow]"),
    draws: document.querySelector("[data-connect-draws]"),
    round: document.querySelector("[data-connect-round]"),
    newRound: document.querySelector("[data-connect-new]"),
    sound: document.querySelector("[data-connect-sound]")
  };
  let board = Array(rows * columns).fill(0);
  let current = 1;
  let mode = "ai";
  let locked = false;
  let round = 1;
  let redWins = 0;
  let yellowWins = 0;
  let draws = 0;
  let soundEnabled = true;
  let audioContext;
  let winningCells = [];

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

  function index(row, column) {
    return (row * columns) + column;
  }

  function openRow(column, candidateBoard = board) {
    for (let row = rows - 1; row >= 0; row -= 1) {
      if (candidateBoard[index(row, column)] === 0) return row;
    }
    return -1;
  }

  function findWin(candidateBoard = board) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const player = candidateBoard[index(row, column)];
        if (!player) continue;
        for (const [dr, dc] of directions) {
          const cells = [];
          for (let step = 0; step < 4; step += 1) {
            const nextRow = row + (dr * step);
            const nextColumn = column + (dc * step);
            if (nextRow < 0 || nextRow >= rows || nextColumn < 0 || nextColumn >= columns) break;
            const cellIndex = index(nextRow, nextColumn);
            if (candidateBoard[cellIndex] !== player) break;
            cells.push(cellIndex);
          }
          if (cells.length === 4) return { player, cells };
        }
      }
    }
    return null;
  }

  function render() {
    boardElement.replaceChildren(...board.map((player, cellIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "connect-slot";
      if (winningCells.includes(cellIndex)) button.classList.add("is-winning");
      button.dataset.player = String(player);
      button.dataset.column = String(cellIndex % columns);
      button.setAttribute("aria-label", `${player ? (player === 1 ? "Red" : "Yellow") : "Empty"} slot, column ${(cellIndex % columns) + 1}`);
      button.disabled = locked;
      return button;
    }));
    elements.red.textContent = String(redWins);
    elements.yellow.textContent = String(yellowWins);
    elements.draws.textContent = String(draws);
    elements.round.textContent = String(round);
  }

  function finish(win) {
    locked = true;
    if (win) {
      winningCells = win.cells;
      if (win.player === 1) redWins += 1;
      else yellowWins += 1;
      const playerName = win.player === 1 ? (mode === "ai" ? "You" : "Red") : (mode === "ai" ? "Browser" : "Yellow");
      elements.status.innerHTML = `<strong>${playerName} win!</strong>Four connected discs complete the round.`;
      tone(win.player === 1 ? 720 : 230, .24);
      window.rdprassyArcade?.complete("connect-four", {
        won: mode === "duo" || win.player === 1,
        score: 400 + board.filter((value) => value === 0).length * 10
      });
    } else {
      draws += 1;
      elements.status.innerHTML = "<strong>Board filled</strong>No route to four — this round is a draw.";
      window.rdprassyArcade?.complete("connect-four", { completed: true, score: 250 });
    }
    render();
  }

  function place(column, player = current) {
    if (locked) return false;
    const row = openRow(column);
    if (row < 0) {
      elements.status.innerHTML = "<strong>Column full</strong>Choose another route.";
      return false;
    }
    board[index(row, column)] = player;
    tone(player === 1 ? 440 : 330);
    const win = findWin();
    if (win) {
      finish(win);
      return true;
    }
    if (!board.includes(0)) {
      finish(null);
      return true;
    }
    current = player === 1 ? 2 : 1;
    render();
    return true;
  }

  function tacticalMove(player) {
    for (let column = 0; column < columns; column += 1) {
      const row = openRow(column);
      if (row < 0) continue;
      const simulation = [...board];
      simulation[index(row, column)] = player;
      if (findWin(simulation)?.player === player) return column;
    }
    return -1;
  }

  function aiMove() {
    if (locked || mode !== "ai") return;
    let column = tacticalMove(2);
    if (column < 0) column = tacticalMove(1);
    if (column < 0) {
      const preferences = [3, 2, 4, 1, 5, 0, 6].filter((candidate) => openRow(candidate) >= 0);
      const weighted = Math.random() < .72 ? preferences.slice(0, 3) : preferences;
      column = weighted[Math.floor(Math.random() * weighted.length)];
    }
    locked = false;
    place(column, 2);
    if (!locked) {
      current = 1;
      elements.status.innerHTML = "<strong>Your move</strong>Select a column to drop the red disc.";
      render();
    }
  }

  function chooseColumn(column) {
    if (locked || (mode === "ai" && current === 2)) return;
    if (!place(column, current) || locked) return;
    if (mode === "ai") {
      locked = true;
      elements.status.innerHTML = "<strong>Browser thinking</strong>Evaluating wins, blocks, and center control.";
      render();
      window.setTimeout(aiMove, 520);
    } else {
      elements.status.innerHTML = `<strong>${current === 1 ? "Red" : "Yellow"} move</strong>Select a column for the next disc.`;
    }
  }

  function newRound(countRound = true) {
    board = Array(rows * columns).fill(0);
    current = 1;
    locked = false;
    winningCells = [];
    if (countRound) round += 1;
    elements.status.innerHTML = "<strong>Your move</strong>Select a column to drop the red disc.";
    render();
    window.rdprassyArcade?.start("connect-four");
  }

  boardElement.addEventListener("click", (event) => {
    const slot = event.target.closest("[data-column]");
    if (slot) chooseColumn(Number(slot.dataset.column));
  });
  window.addEventListener("keydown", (event) => {
    if (/^[1-7]$/.test(event.key)) chooseColumn(Number(event.key) - 1);
  });
  document.querySelectorAll("[data-connect-mode]").forEach((button) => button.addEventListener("click", () => {
    mode = button.dataset.connectMode;
    document.querySelectorAll("[data-connect-mode]").forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
    newRound();
  }));
  elements.newRound.addEventListener("click", () => newRound());
  elements.sound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.sound.textContent = soundEnabled ? "Sound on" : "Sound off";
    elements.sound.setAttribute("aria-pressed", String(soundEnabled));
  });
  newRound(false);
})();
