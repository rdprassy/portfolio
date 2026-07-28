(function () {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const returnStatePrefix = "rdprassy-return:";
  const pendingNavigationKey = "rdprassy-pending-navigation";
  const restoreScrollKey = "rdprassy-restore-scroll";

  root.classList.add("js");

  function initialiseAnalyticsBridge() {
    if (document.querySelector("script[data-rdprassy-analytics]")) {
      return;
    }

    const siteScript = Array.from(document.scripts).find(function (script) {
      return /(?:^|\/)site\.js(?:[?#].*)?$/.test(script.src || "");
    });
    const analyticsUrl = siteScript && siteScript.src
      ? new URL("analytics.js", siteScript.src).href
      : "js/analytics.js";
    const analyticsScript = document.createElement("script");
    analyticsScript.src = analyticsUrl;
    analyticsScript.async = true;
    analyticsScript.dataset.rdprassyAnalytics = "";
    document.head.appendChild(analyticsScript);
  }

  initialiseAnalyticsBridge();

  function readSession(key) {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function writeSession(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Navigation still works normally when storage is unavailable.
    }
  }

  function removeSession(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      // Nothing to clean up when storage is unavailable.
    }
  }

  function assignSectionAnchors() {
    document.querySelectorAll("main section").forEach(function (section, index) {
      if (section.id) {
        return;
      }
      const heading = section.querySelector(".kicker, h2, h1");
      const slug = (heading ? heading.textContent : "content")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      section.id = "section-" + String(index + 1) + "-" + (slug || "content");
    });
  }

  function isInternalUrl(url) {
    if (window.location.protocol === "file:") {
      return url.protocol === "file:";
    }
    return url.origin === window.location.origin;
  }

  function describeSource(link) {
    const section = link.closest("section");
    const labelElement = section && section.querySelector(".kicker, h2, h1");
    const fallbackTitle = document.title.split("|")[0].split("—")[0].trim();
    return {
      id: section ? section.id : "",
      label: labelElement ? labelElement.textContent.trim() : fallbackTitle || "previous page"
    };
  }

  function captureReturnState(destination, link) {
    const source = describeSource(link);
    const returnUrl = new URL(window.location.href);
    if (source.id) {
      returnUrl.hash = source.id;
    }

    const returnState = {
      url: returnUrl.href,
      path: window.location.pathname,
      scrollY: Math.round(window.scrollY),
      label: source.label,
      createdAt: Date.now()
    };
    const pendingState = {
      destinationPath: destination.pathname,
      returnState: returnState,
      createdAt: Date.now()
    };

    writeSession(returnStatePrefix + destination.pathname, returnState);
    writeSession(pendingNavigationKey, pendingState);
  }

  function consumeReturnState() {
    const historyReturn = history.state && history.state.rdprassyReturn;
    if (historyReturn) {
      return historyReturn;
    }

    const pending = readSession(pendingNavigationKey);
    const fresh = pending && Date.now() - pending.createdAt < 5 * 60 * 1000;
    if (fresh && pending.destinationPath === window.location.pathname) {
      removeSession(pendingNavigationKey);
      try {
        history.replaceState(
          Object.assign({}, history.state || {}, { rdprassyReturn: pending.returnState }),
          "",
          window.location.href
        );
      } catch (error) {
        // The session-backed state remains enough for a reliable fallback.
      }
      return pending.returnState;
    }

    const storedReturn = readSession(returnStatePrefix + window.location.pathname);
    if (storedReturn && Date.now() - storedReturn.createdAt < 5 * 60 * 1000) {
      return storedReturn;
    }
    removeSession(returnStatePrefix + window.location.pathname);
    return null;
  }

  function restoreScrollPosition() {
    document.body.classList.remove("page-leaving");
    document.body.classList.add("page-ready");

    const restoreState = readSession(restoreScrollKey);
    if (!restoreState || restoreState.path !== window.location.pathname) {
      return;
    }

    removeSession(restoreScrollKey);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.scrollTo({ top: restoreState.scrollY || 0, behavior: "auto" });
      });
    });
  }

  function initialiseSmartBack() {
    const homePages = ["", "index.html", "index_rdp.html", "index_bckp.html"];
    if (homePages.includes(currentPage)) {
      return;
    }

    const returnState = consumeReturnState();
    const backBar = document.createElement("div");
    const backInner = document.createElement("div");
    const backLink = document.createElement("a");
    const fallbackUrl = "index.html";

    backBar.className = "page-back";
    backInner.className = "wrap page-back__inner";
    backLink.className = "page-back__link";
    backLink.href = returnState && returnState.url ? returnState.url : fallbackUrl;
    backLink.innerHTML = '<span aria-hidden="true">←</span><span>' +
      (returnState && returnState.label ? "Back to " + returnState.label : "Back to portfolio") +
      "</span>";

    backLink.addEventListener("click", function (event) {
      if (!returnState) {
        return;
      }

      event.preventDefault();
      writeSession(restoreScrollKey, returnState);
      document.body.classList.add("page-leaving");

      window.setTimeout(function () {
        if (history.length > 1) {
          history.back();
        } else {
          window.location.href = returnState.url;
        }
      }, reducedMotion.matches ? 0 : 150);
    });

    backInner.appendChild(backLink);
    backBar.appendChild(backInner);
    const header = document.querySelector(".site-header");
    if (header) {
      header.insertAdjacentElement("afterend", backBar);
    }
  }

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
      const notesLink = Array.from(nav.querySelectorAll("a")).find(function (link) {
        return link.getAttribute("href") === "notes.html";
      });
      const legacyLink = Array.from(nav.querySelectorAll("a")).find(function (link) {
        return link.getAttribute("href") === "index_rdp.html";
      });

      if (notesLink && !nav.querySelector('a[href="ai-engineering.html"]')) {
        const aiLink = document.createElement("a");
        aiLink.href = "ai-engineering.html";
        aiLink.textContent = "AI";
        if (["ai-engineering.html", "ai-lab.html", "engineering-artifacts.html"].includes(currentPage)) {
          aiLink.setAttribute("aria-current", "page");
        }
        nav.insertBefore(aiLink, notesLink);
      }

      if (notesLink && !nav.querySelector('a[href="project-cinema.html"]')) {
        const cinemaLink = document.createElement("a");
        cinemaLink.href = "project-cinema.html";
        cinemaLink.textContent = "Films";
        if (currentPage === "project-cinema.html") {
          cinemaLink.setAttribute("aria-current", "page");
        }
        nav.insertBefore(cinemaLink, notesLink);
      }

      if (notesLink && !nav.querySelector('a[href="games.html"]')) {
        const gamesLink = document.createElement("a");
        gamesLink.href = "games.html";
        gamesLink.textContent = "Play";
        if (["games.html", "snake-ladders.html", "flappy-flight.html"].includes(currentPage)) {
          gamesLink.setAttribute("aria-current", "page");
        }
        nav.insertBefore(gamesLink, nav.querySelector('a[href="project-cinema.html"]') || notesLink);
      }

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
  assignSectionAnchors();
  initialiseSmartBack();
  window.addEventListener("pageshow", restoreScrollPosition);

  function optimiseImageLoading() {
    document.querySelectorAll("img").forEach(function (image) {
      image.decoding = "async";
      if (image.closest(".hero") || image.closest(".page-hero")) {
        image.loading = "eager";
        image.fetchPriority = "high";
      } else {
        image.loading = "lazy";
      }
    });
  }

  function trackEvent(name, properties) {
    const detail = Object.assign({
      event: name,
      page: currentPage,
      path: window.location.pathname
    }, properties || {});

    if (window.rdprassyAnalytics && typeof window.rdprassyAnalytics.track === "function") {
      window.rdprassyAnalytics.track(detail);
    } else {
      window.rdprassyEventQueue = window.rdprassyEventQueue || [];
      if (window.rdprassyEventQueue.length < 50) {
        window.rdprassyEventQueue.push(detail);
      }
    }
    if (typeof window.plausible === "function") {
      window.plausible(name, { props: properties || {} });
    }
    window.dispatchEvent(new CustomEvent("rdprassy:analytics", { detail: detail }));
  }

  function classifyTrackedLink(link) {
    if (link.dataset.track) {
      return link.dataset.track;
    }
    const href = link.getAttribute("href") || "";
    if (/downloads\/.+\.pdf(?:$|[?#])/i.test(href)) {
      return link.hasAttribute("download") ? "resume_download" : "resume_view";
    }
    if (href.startsWith("mailto:")) {
      return "contact_click";
    }
    if (/github\.com\/rdprassy/i.test(href)) {
      return "github_open";
    }
    return "";
  }

  window.rdprassyTrack = trackEvent;
  optimiseImageLoading();
  trackEvent("page_view", { title: document.title });

  window.addEventListener("load", function () {
    const navigation = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (navigation) {
      trackEvent("performance_snapshot", {
        dom_content_loaded_ms: Math.round(navigation.domContentLoadedEventEnd),
        load_ms: Math.round(navigation.loadEventEnd),
        transfer_bytes: navigation.transferSize || 0
      });
    }
  });

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
    if (link) {
      const trackedEvent = classifyTrackedLink(link);
      if (trackedEvent) {
        trackEvent(trackedEvent, {
          label: (link.textContent || "").trim().slice(0, 80),
          destination: link.getAttribute("href") || ""
        });
      }
    }
    if (
      !link ||
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
    if (!isInternalUrl(url) || samePageAnchor || url.protocol === "mailto:") {
      return;
    }

    captureReturnState(url, link);
    if (reducedMotion.matches) {
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
      ".hero .eyebrow, .hero .display, .hero .hero-copy, .hero .hero-actions, .hero .portrait-card, .page-hero .breadcrumb, .page-hero .kicker, .page-hero .page-title, .page-hero .page-lead, .arcade-hero .breadcrumb, .arcade-hero .kicker, .arcade-hero h1, .arcade-hero p, .arcade-hero .hero-actions, .arcade-machine"
    );

    heroItems.forEach(function (item, index) {
      item.classList.add("hero-animate");
      item.style.setProperty("--hero-delay", String(Math.min(index * 70, 350)) + "ms");
    });
  }

  function initialiseReveals() {
    const revealItems = document.querySelectorAll(
      ".section-heading, .panel, .card, .project-row, .timeline-item, .skill-group, .tag-list, .quote-band, .cta, .proof, .brand-showcase, .impact-note, .feed-card, .resume-option, .resume-section, .architecture-card, .decision, .evaluation-grid article, .artifact-card, .dataset-card, .cinema-card, .cinema-feature, .cinema-projects-callout, .game-library-card, .arcade-home__games, .arcade-values"
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
