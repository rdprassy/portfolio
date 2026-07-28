(() => {
  "use strict";

  const boardElement = document.querySelector("[data-cloud-board]");
  if (!boardElement) return;

  const labels = {
    2: "Code", 4: "Service", 8: "Container", 16: "Cluster",
    32: "Zone", 64: "Region", 128: "Multi-region", 256: "Edge",
    512: "Platform", 1024: "Global", 2048: "Resilient"
  };
  const elements = {
    score: document.querySelector("[data-cloud-score]"),
    best: document.querySelector("[data-cloud-best]"),
    largest: document.querySelector("[data-cloud-largest]"),
    moves: document.querySelector("[data-cloud-moves]"),
    status: document.querySelector("[data-cloud-status]"),
    newGame: document.querySelector("[data-cloud-new]")
  };
  let board = Array(16).fill(0);
  let score = 0;
  let moves = 0;
  let finished = false;
  let touchStart = null;

  function getBest() {
    try { return Number(localStorage.getItem("rdprassy-cloud-best")) || 0; } catch { return 0; }
  }

  function setBest(value) {
    try { localStorage.setItem("rdprassy-cloud-best", String(value)); } catch { /* optional persistence */ }
  }

  function addTile() {
    const empty = board.map((value, index) => value === 0 ? index : -1).filter((index) => index >= 0);
    if (!empty.length) return;
    const index = empty[Math.floor(Math.random() * empty.length)];
    board[index] = Math.random() < .9 ? 2 : 4;
  }

  function render() {
    boardElement.replaceChildren(...board.map((value, index) => {
      const cell = document.createElement("div");
      cell.className = "cloud-tile";
      cell.dataset.value = String(value);
      cell.setAttribute("aria-label", value ? `${value}, ${labels[value] || "Scaled platform"}` : `Empty cell ${index + 1}`);
      cell.innerHTML = value ? `<strong>${value}</strong><small>${labels[value] || "Hyper-scale"}</small>` : "<strong>0</strong>";
      return cell;
    }));
    const largest = Math.max(...board);
    elements.score.textContent = String(score);
    elements.best.textContent = String(Math.max(score, getBest()));
    elements.largest.textContent = String(largest);
    elements.moves.textContent = String(moves);
  }

  function linesFor(direction) {
    const lines = [];
    for (let major = 0; major < 4; major += 1) {
      const line = [];
      for (let minor = 0; minor < 4; minor += 1) {
        let row;
        let column;
        if (direction === "left" || direction === "right") {
          row = major;
          column = direction === "left" ? minor : 3 - minor;
        } else {
          row = direction === "up" ? minor : 3 - minor;
          column = major;
        }
        line.push((row * 4) + column);
      }
      lines.push(line);
    }
    return lines;
  }

  function mergeLine(values) {
    const compact = values.filter(Boolean);
    const result = [];
    for (let index = 0; index < compact.length; index += 1) {
      if (compact[index] === compact[index + 1]) {
        const merged = compact[index] * 2;
        result.push(merged);
        score += merged;
        index += 1;
      } else {
        result.push(compact[index]);
      }
    }
    while (result.length < 4) result.push(0);
    return result;
  }

  function canMove() {
    if (board.includes(0)) return true;
    for (let index = 0; index < 16; index += 1) {
      const row = Math.floor(index / 4);
      const column = index % 4;
      if (column < 3 && board[index] === board[index + 1]) return true;
      if (row < 3 && board[index] === board[index + 4]) return true;
    }
    return false;
  }

  function move(direction) {
    if (finished) return;
    const before = board.join(",");
    linesFor(direction).forEach((line) => {
      const merged = mergeLine(line.map((index) => board[index]));
      line.forEach((index, position) => { board[index] = merged[position]; });
    });
    if (board.join(",") === before) return;
    moves += 1;
    addTile();
    if (score > getBest()) setBest(score);
    const largest = Math.max(...board);
    if (largest >= 2048) {
      finished = true;
      elements.status.innerHTML = "<strong>Global platform achieved</strong>You reached the resilient 2048 architecture.";
      window.rdprassyArcade?.complete("cloud-2048", { completed: true, score });
    } else if (!canMove()) {
      finished = true;
      elements.status.innerHTML = `<strong>Architecture saturated</strong>No merges remain. Final score: ${score}.`;
      window.rdprassyArcade?.complete("cloud-2048", { completed: true, score });
    } else {
      elements.status.innerHTML = `<strong>${labels[largest] || "Platform"} tier online</strong>Keep merging matching infrastructure.`;
    }
    render();
  }

  function newGame() {
    board = Array(16).fill(0);
    score = 0;
    moves = 0;
    finished = false;
    addTile();
    addTile();
    elements.status.innerHTML = "<strong>Two services online</strong>Merge matching tiles to evolve the platform.";
    render();
    window.rdprassyArcade?.start("cloud-2048");
  }

  window.addEventListener("keydown", (event) => {
    const direction = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[event.key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  });
  document.querySelectorAll("[data-cloud-move]").forEach((button) => button.addEventListener("click", () => move(button.dataset.cloudMove)));
  boardElement.addEventListener("pointerdown", (event) => {
    touchStart = { x: event.clientX, y: event.clientY };
  });
  boardElement.addEventListener("pointerup", (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  elements.newGame.addEventListener("click", newGame);
  newGame();
})();
