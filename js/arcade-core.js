(() => {
  "use strict";

  const storageKey = "rdprassy-arcade-progress-v1";
  const gameNames = {
    "snake-ladders": "Snake & Ladders",
    "flappy-flight": "Flappy Flight",
    "code-sprint": "Code Sprint",
    "algorithm-arena": "Algorithm Arena",
    "memory-stack": "Memory Stack",
    "cloud-2048": "2048: Cloud Edition",
    "pong-ai": "Pong vs AI",
    "defend-api": "Defend the API",
    "connect-four": "Connect Four",
    "portfolio-quest": "Portfolio Quest"
  };
  const gamePaths = Object.fromEntries(Object.keys(gameNames).map((slug) => [slug, `${slug}.html`]));
  const achievementRules = [
    { id: "first-boot", title: "First Boot", copy: "Play your first arcade game.", test: (data) => data.totalPlays >= 1 },
    { id: "arcade-tour", title: "Arcade Tour", copy: "Try three different games.", test: (data) => Object.keys(data.games).length >= 3 },
    { id: "high-five", title: "High Five", copy: "Win or complete five runs.", test: (data) => data.totalWins >= 5 },
    { id: "full-stack-player", title: "Full-Stack Player", copy: "Try all ten arcade games.", test: (data) => Object.keys(data.games).length >= 10 },
    { id: "persistent", title: "Persistent", copy: "Launch twenty game sessions.", test: (data) => data.totalPlays >= 20 }
  ];

  function blankProgress() {
    return { totalPlays: 0, totalWins: 0, games: {}, achievements: {}, dailyCompleted: {}, updatedAt: null };
  }

  function load() {
    try {
      const value = JSON.parse(window.localStorage.getItem(storageKey));
      return value && typeof value === "object"
        ? { ...blankProgress(), ...value, games: value.games || {}, achievements: value.achievements || {}, dailyCompleted: value.dailyCompleted || {} }
        : blankProgress();
    } catch {
      return blankProgress();
    }
  }

  function save(data) {
    data.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // Progress gracefully becomes session-only when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent("rdprassy:arcade-progress", { detail: data }));
  }

  function evaluateAchievements(data) {
    const newlyUnlocked = [];
    achievementRules.forEach((rule) => {
      if (!data.achievements[rule.id] && rule.test(data)) {
        data.achievements[rule.id] = new Date().toISOString();
        newlyUnlocked.push(rule);
      }
    });
    return newlyUnlocked;
  }

  function ensureGame(data, slug) {
    data.games[slug] ||= { plays: 0, wins: 0, best: null, lastPlayed: null };
    return data.games[slug];
  }

  function dailyChallenge() {
    const date = new Date().toISOString().slice(0, 10);
    const slugs = Object.keys(gameNames);
    const seed = Array.from(date).reduce((total, character) => total + character.charCodeAt(0), 0);
    const slug = slugs[seed % slugs.length];
    return { date, slug, name: gameNames[slug], path: gamePaths[slug] };
  }

  function announceAchievements(items) {
    items.forEach((item, index) => {
      window.setTimeout(() => {
        const toast = document.createElement("div");
        toast.className = "arcade-achievement-toast";
        toast.setAttribute("role", "status");
        toast.innerHTML = `<span>Achievement unlocked</span><strong>${item.title}</strong>`;
        document.body.append(toast);
        requestAnimationFrame(() => toast.classList.add("is-visible"));
        window.setTimeout(() => {
          toast.classList.remove("is-visible");
          window.setTimeout(() => toast.remove(), 280);
        }, 3600);
      }, index * 450);
    });
  }

  function start(slug) {
    if (!gameNames[slug]) return;
    const data = load();
    const game = ensureGame(data, slug);
    game.plays += 1;
    game.lastPlayed = new Date().toISOString();
    data.totalPlays += 1;
    const unlocked = evaluateAchievements(data);
    save(data);
    announceAchievements(unlocked);
  }

  function complete(slug, options = {}) {
    if (!gameNames[slug]) return;
    const data = load();
    const game = ensureGame(data, slug);
    const score = Number(options.score);
    if (options.won || options.completed) {
      game.wins += 1;
      data.totalWins += 1;
    }
    if (Number.isFinite(score) && (game.best === null || score > game.best)) {
      game.best = score;
    }
    const daily = dailyChallenge();
    if (daily.slug === slug && (options.won || options.completed)) {
      data.dailyCompleted[daily.date] = true;
    }
    const unlocked = evaluateAchievements(data);
    save(data);
    announceAchievements(unlocked);
  }

  function renderDashboard() {
    const root = document.querySelector("[data-arcade-dashboard]");
    if (!root) return;
    const data = load();
    const gamesPlayed = Object.keys(data.games).length;
    const unlockedCount = Object.keys(data.achievements).length;
    root.querySelector("[data-arcade-total-plays]").textContent = String(data.totalPlays);
    root.querySelector("[data-arcade-games-played]").textContent = `${gamesPlayed}/10`;
    root.querySelector("[data-arcade-wins]").textContent = String(data.totalWins);
    root.querySelector("[data-arcade-achievements]").textContent = `${unlockedCount}/${achievementRules.length}`;

    const achievementList = root.querySelector("[data-achievement-list]");
    if (achievementList) {
      achievementList.replaceChildren(...achievementRules.map((rule) => {
        const unlocked = Boolean(data.achievements[rule.id]);
        const item = document.createElement("article");
        item.className = `achievement-chip${unlocked ? " is-unlocked" : ""}`;
        item.innerHTML = `<span aria-hidden="true">${unlocked ? "✓" : "◇"}</span><div><strong>${rule.title}</strong><small>${rule.copy}</small></div>`;
        return item;
      }));
    }

    const daily = dailyChallenge();
    const dailyTitle = root.querySelector("[data-daily-title]");
    const dailyCopy = root.querySelector("[data-daily-copy]");
    const dailyLink = root.querySelector("[data-daily-link]");
    if (dailyTitle && dailyCopy && dailyLink) {
      const complete = Boolean(data.dailyCompleted[daily.date]);
      dailyTitle.textContent = daily.name;
      dailyCopy.textContent = complete
        ? "Daily challenge complete on this device. Come back tomorrow for a new game."
        : "Complete one run today to mark the daily challenge.";
      dailyLink.href = daily.path;
      dailyLink.textContent = complete ? "Play again →" : "Accept challenge →";
    }

    const leaderboard = root.querySelector("[data-local-leaderboard]");
    if (leaderboard) {
      const ranked = Object.entries(data.games)
        .filter(([, game]) => game.best !== null)
        .sort((a, b) => (b[1].best || 0) - (a[1].best || 0))
        .slice(0, 5);
      leaderboard.replaceChildren(...(ranked.length ? ranked.map(([slug, game], index) => {
        const row = document.createElement("li");
        row.innerHTML = `<span>${index + 1}</span><strong>${gameNames[slug]}</strong><b>${game.best}</b>`;
        return row;
      }) : [Object.assign(document.createElement("li"), { className: "is-empty", textContent: "Complete a scored game to create your local leaderboard." })]));
    }

    document.querySelectorAll("[data-game-progress]").forEach((element) => {
      const game = data.games[element.dataset.gameProgress];
      element.textContent = game
        ? `${game.plays} ${game.plays === 1 ? "play" : "plays"}${game.best !== null ? ` · best ${game.best}` : ""}`
        : "Not played yet";
    });
  }

  window.rdprassyArcade = {
    start,
    complete,
    getProgress: load,
    games: { ...gameNames }
  };

  renderDashboard();
  window.addEventListener("rdprassy:arcade-progress", renderDashboard);
})();
