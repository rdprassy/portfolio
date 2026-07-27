(function () {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  root.classList.add("js");

  function setTheme(theme) {
    root.dataset.theme = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      const dark = theme === "dark";
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      button.querySelector("[data-theme-icon]").textContent = dark ? "☀" : "☾";
      button.querySelector("[data-theme-label]").textContent = dark ? "Light" : "Dark";
    });
  }

  function initialiseTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem("rdprassy-theme");
    } catch (error) {
      savedTheme = null;
    }
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(savedTheme || preferredTheme);
  }

  function enrichNavigation() {
    document.querySelectorAll("[data-site-nav]").forEach(function (nav) {
      const legacyLink = Array.from(nav.querySelectorAll("a")).find(function (link) {
        return link.getAttribute("href") === "index_rdp.html";
      });

      if (legacyLink && !nav.querySelector('a[href="now.html"]')) {
        const nowLink = document.createElement("a");
        nowLink.href = "now.html";
        nowLink.textContent = "Now";
        if (currentPage === "now.html") {
          nowLink.setAttribute("aria-current", "page");
        }
        nav.insertBefore(nowLink, legacyLink);
      }

      if (!nav.querySelector("[data-theme-toggle]")) {
        const themeButton = document.createElement("button");
        themeButton.className = "theme-button";
        themeButton.type = "button";
        themeButton.dataset.themeToggle = "";
        themeButton.innerHTML = '<span data-theme-icon aria-hidden="true">☾</span><span data-theme-label>Dark</span>';
        const contactLink = nav.querySelector(".nav-cta");
        nav.insertBefore(themeButton, contactLink || null);
      }
    });
  }

  enrichNavigation();
  initialiseTheme();

  document.addEventListener("click", function (event) {
    const themeButton = event.target.closest("[data-theme-toggle]");
    if (themeButton) {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("rdprassy-theme", nextTheme);
      } catch (error) {
        // The visual preference still applies for this page when storage is unavailable.
      }
      setTheme(nextTheme);
      return;
    }

    const link = event.target.closest("a");
    if (
      !link ||
      reducedMotion.matches ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return;
    }

    const url = new URL(link.href, window.location.href);
    const samePageAnchor = url.pathname === window.location.pathname && url.hash;
    if (url.origin !== window.location.origin || samePageAnchor || url.protocol === "mailto:") {
      return;
    }

    event.preventDefault();
    document.body.classList.add("page-leaving");
    window.setTimeout(function () {
      window.location.href = url.href;
    }, 170);
  });

  const menuButton = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-site-nav]");

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll("[data-year]").forEach(function (item) {
    item.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll("[data-print-resume]").forEach(function (button) {
    button.addEventListener("click", function () {
      window.print();
    });
  });

  function initialiseHero() {
    const heroItems = document.querySelectorAll(
      ".hero .eyebrow, .hero .display, .hero .hero-copy, .hero .hero-actions, .hero .portrait-card, .page-hero .breadcrumb, .page-hero .kicker, .page-hero .page-title, .page-hero .page-lead"
    );

    heroItems.forEach(function (item, index) {
      item.classList.add("hero-animate");
      item.style.setProperty("--hero-delay", String(Math.min(index * 70, 350)) + "ms");
    });
  }

  function initialiseReveals() {
    const revealItems = document.querySelectorAll(
      ".section-heading, .panel, .card, .project-row, .timeline-item, .skill-group, .tag-list, .quote-band, .cta, .proof, .brand-showcase, .impact-note, .feed-card, .resume-section"
    );

    revealItems.forEach(function (item, index) {
      item.classList.add("reveal");
      item.style.setProperty("--reveal-delay", String((index % 4) * 55) + "ms");
    });
    document.querySelectorAll(".tag-list").forEach(function (list) {
      list.querySelectorAll(".tag").forEach(function (tag, index) {
        tag.style.setProperty("--tag-delay", String(Math.min(index * 38, 420)) + "ms");
      });
    });

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  }

  function animateCounter(element) {
    if (element.dataset.counted === "true") {
      return;
    }

    element.dataset.counted = "true";
    const target = Number(element.dataset.count);
    const suffix = element.dataset.suffix || "";
    const duration = 950;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * eased)) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      }
    }

    window.requestAnimationFrame(frame);
  }

  function initialiseCounters() {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) {
      return;
    }

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      counters.forEach(function (counter) {
        counter.textContent = counter.dataset.count + (counter.dataset.suffix || "");
      });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.7 });

    counters.forEach(function (counter) {
      observer.observe(counter);
    });
  }

  function createFeedCard(title, description, url, meta) {
    const article = document.createElement("article");
    article.className = "feed-card";

    const metaElement = document.createElement("span");
    metaElement.className = "feed-card__meta";
    metaElement.textContent = meta;

    const heading = document.createElement("h3");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = title;
    heading.appendChild(link);

    const copy = document.createElement("p");
    copy.textContent = description;

    article.append(metaElement, heading, copy);
    return article;
  }

  function replaceFeed(container, cards, status) {
    if (!container || !cards.length) {
      return;
    }

    container.replaceChildren();
    cards.forEach(function (card) {
      container.appendChild(card);
    });
    container.dataset.feedStatus = status;
  }

  async function loadGitHubFeed() {
    const container = document.querySelector("[data-github-feed]");
    if (!container) {
      return;
    }

    try {
      const response = await fetch("https://api.github.com/users/rdprassy/repos?sort=updated&per_page=8");
      if (!response.ok) {
        throw new Error("GitHub request failed");
      }
      const repositories = await response.json();
      const cards = repositories
        .filter(function (repository) { return !repository.fork; })
        .slice(0, 3)
        .map(function (repository) {
          const updated = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" })
            .format(new Date(repository.updated_at));
          return createFeedCard(
            repository.name,
            repository.description || "Public source code, experiments, and ongoing engineering notes.",
            repository.html_url,
            (repository.language || "Code") + " · Updated " + updated
          );
        });
      replaceFeed(container, cards, "live");
    } catch (error) {
      container.dataset.feedStatus = "fallback";
    }
  }

  function stripMarkup(value) {
    const documentFragment = new DOMParser().parseFromString(value || "", "text/html");
    return (documentFragment.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  async function loadMediumFeed() {
    const container = document.querySelector("[data-medium-feed]");
    if (!container) {
      return;
    }

    const feedUrl = "https://medium.com/feed/@rdprassy";
    const endpoint = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Medium request failed");
      }
      const payload = await response.json();
      const cards = (payload.items || []).slice(0, 3).map(function (item) {
        const published = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" })
          .format(new Date(item.pubDate));
        const description = stripMarkup(item.description).slice(0, 180);
        return createFeedCard(
          item.title,
          description + (description.length === 180 ? "…" : ""),
          item.link,
          "Essay · " + published
        );
      });
      replaceFeed(container, cards, "live");
    } catch (error) {
      container.dataset.feedStatus = "fallback";
    }
  }

  initialiseHero();
  initialiseReveals();
  initialiseCounters();
  loadGitHubFeed();
  loadMediumFeed();

  window.requestAnimationFrame(function () {
    document.body.classList.add("page-ready");
  });
}());
