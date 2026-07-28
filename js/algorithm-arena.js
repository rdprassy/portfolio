(() => {
  "use strict";

  const gridElement = document.querySelector("[data-algorithm-grid]");
  if (!gridElement) return;

  const columns = 18;
  const rows = 11;
  const start = (Math.floor(rows / 2) * columns) + 1;
  const end = (Math.floor(rows / 2) * columns) + columns - 2;
  const walls = new Set();
  const elements = {
    select: document.querySelector("[data-algorithm-select]"),
    run: document.querySelector("[data-algorithm-run]"),
    clear: document.querySelector("[data-algorithm-clear]"),
    maze: document.querySelector("[data-algorithm-maze]"),
    visited: document.querySelector("[data-algorithm-visited]"),
    path: document.querySelector("[data-algorithm-path]"),
    time: document.querySelector("[data-algorithm-time]"),
    runs: document.querySelector("[data-algorithm-runs]"),
    status: document.querySelector("[data-algorithm-status]")
  };
  let drawing = false;
  let drawWall = true;
  let running = false;
  let runCount = 0;
  let animationVersion = 0;

  function neighbours(index) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const result = [];
    if (row > 0) result.push(index - columns);
    if (row < rows - 1) result.push(index + columns);
    if (column > 0) result.push(index - 1);
    if (column < columns - 1) result.push(index + 1);
    return result;
  }

  function weight(index) {
    return ((index * 17) % 9 === 0 || (index * 11) % 13 === 0) ? 4 : 1;
  }

  function buildGrid() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < columns * rows; index += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "algorithm-cell";
      cell.dataset.index = String(index);
      cell.setAttribute("aria-label", `Grid cell ${index + 1}`);
      if (index === start) cell.classList.add("is-start");
      if (index === end) cell.classList.add("is-end");
      if (index !== start && index !== end && weight(index) > 1) {
        cell.classList.add("is-weighted");
        cell.setAttribute("aria-label", `Weighted grid cell ${index + 1}`);
      }
      fragment.append(cell);
    }
    gridElement.replaceChildren(fragment);
  }

  function clearSearch() {
    animationVersion += 1;
    gridElement.querySelectorAll(".is-visited, .is-path").forEach((cell) => {
      cell.classList.remove("is-visited", "is-path");
    });
  }

  function setWall(index, enabled) {
    if (running || index === start || index === end) return;
    const cell = gridElement.querySelector(`[data-index="${index}"]`);
    if (!cell) return;
    if (enabled) walls.add(index);
    else walls.delete(index);
    cell.classList.toggle("is-wall", enabled);
    cell.setAttribute("aria-pressed", String(enabled));
  }

  function searchBfs() {
    const queue = [start];
    const visited = new Set([start]);
    const previous = new Map();
    const order = [];
    while (queue.length) {
      const current = queue.shift();
      order.push(current);
      if (current === end) break;
      neighbours(current).forEach((next) => {
        if (!visited.has(next) && !walls.has(next)) {
          visited.add(next);
          previous.set(next, current);
          queue.push(next);
        }
      });
    }
    return { order, previous };
  }

  function searchDijkstra() {
    const distances = new Map([[start, 0]]);
    const previous = new Map();
    const pending = new Set(Array.from({ length: columns * rows }, (_, index) => index).filter((index) => !walls.has(index)));
    const order = [];
    while (pending.size) {
      let current = null;
      let best = Infinity;
      pending.forEach((index) => {
        const distance = distances.get(index) ?? Infinity;
        if (distance < best) {
          best = distance;
          current = index;
        }
      });
      if (current === null || best === Infinity) break;
      pending.delete(current);
      order.push(current);
      if (current === end) break;
      neighbours(current).forEach((next) => {
        if (!pending.has(next)) return;
        const candidate = best + weight(next);
        if (candidate < (distances.get(next) ?? Infinity)) {
          distances.set(next, candidate);
          previous.set(next, current);
        }
      });
    }
    return { order, previous };
  }

  function buildPath(previous) {
    if (!previous.has(end)) return [];
    const path = [end];
    let cursor = end;
    while (cursor !== start) {
      cursor = previous.get(cursor);
      if (cursor === undefined) return [];
      path.push(cursor);
    }
    return path.reverse();
  }

  async function animate(result, path, version) {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (let index = 0; index < result.order.length; index += 1) {
      if (version !== animationVersion) return;
      const cellIndex = result.order[index];
      if (cellIndex !== start && cellIndex !== end) {
        gridElement.querySelector(`[data-index="${cellIndex}"]`)?.classList.add("is-visited");
      }
      if (!reduceMotion && index % 2 === 0) await new Promise((resolve) => setTimeout(resolve, 8));
    }
    for (const cellIndex of path) {
      if (version !== animationVersion) return;
      if (cellIndex !== start && cellIndex !== end) {
        gridElement.querySelector(`[data-index="${cellIndex}"]`)?.classList.add("is-path");
      }
      if (!reduceMotion) await new Promise((resolve) => setTimeout(resolve, 24));
    }
  }

  async function runSearch() {
    if (running) return;
    clearSearch();
    const version = animationVersion;
    running = true;
    elements.run.disabled = true;
    runCount += 1;
    elements.runs.textContent = String(runCount);
    elements.status.innerHTML = "<strong>Search running</strong>Exploring candidate routes…";
    window.rdprassyArcade?.start("algorithm-arena");
    const started = performance.now();
    const result = elements.select.value === "dijkstra" ? searchDijkstra() : searchBfs();
    const path = buildPath(result.previous);
    const elapsed = Math.max(1, Math.round(performance.now() - started));
    elements.visited.textContent = String(result.order.length);
    elements.path.textContent = path.length ? String(path.length - 1) : "—";
    elements.time.textContent = `${elapsed}ms`;
    await animate(result, path, version);
    if (version !== animationVersion) return;
    running = false;
    elements.run.disabled = false;
    if (path.length) {
      const score = Math.max(100, 2500 - (result.order.length * 3) - path.length);
      elements.status.innerHTML = `<strong>Route found</strong>${path.length - 1} steps after visiting ${result.order.length} cells.`;
      window.rdprassyArcade?.complete("algorithm-arena", { completed: true, score });
    } else {
      elements.status.innerHTML = "<strong>No route available</strong>Remove a wall or generate a new maze.";
    }
  }

  gridElement.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest("[data-index]");
    if (!cell || running) return;
    event.preventDefault();
    drawing = true;
    const index = Number(cell.dataset.index);
    drawWall = !walls.has(index);
    setWall(index, drawWall);
    gridElement.setPointerCapture?.(event.pointerId);
  });
  gridElement.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-index]");
    if (target && gridElement.contains(target)) setWall(Number(target.dataset.index), drawWall);
  });
  window.addEventListener("pointerup", () => { drawing = false; });

  elements.clear.addEventListener("click", () => {
    if (running) return;
    walls.clear();
    clearSearch();
    gridElement.querySelectorAll(".is-wall").forEach((cell) => cell.classList.remove("is-wall"));
    elements.status.innerHTML = "<strong>Grid cleared</strong>Draw a new obstacle pattern.";
  });
  elements.maze.addEventListener("click", () => {
    if (running) return;
    walls.clear();
    clearSearch();
    for (let index = 0; index < columns * rows; index += 1) {
      if (index !== start && index !== end && Math.random() < .23) walls.add(index);
    }
    gridElement.querySelectorAll("[data-index]").forEach((cell) => {
      cell.classList.toggle("is-wall", walls.has(Number(cell.dataset.index)));
    });
    elements.status.innerHTML = "<strong>Random maze ready</strong>Run a search or edit the walls.";
  });
  elements.run.addEventListener("click", runSearch);
  buildGrid();
})();
