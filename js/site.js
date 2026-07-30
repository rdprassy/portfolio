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
      ? new URL("analytics.js", siteScript.src)
      : new URL("js/analytics.js", document.baseURI);
    if (siteScript && siteScript.src) {
      analyticsUrl.search = new URL(siteScript.src).search;
    }
    const analyticsScript = document.createElement("script");
    analyticsScript.src = analyticsUrl.href;
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

  function initialiseOpportunityBar() {
    const header = document.querySelector(".site-header");
    if (!header || document.querySelector("[data-opportunity-bar]")) {
      return;
    }

    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("rdprassy-opportunity-bar-dismissed") === "true";
    } catch (error) {
      dismissed = false;
    }
    if (dismissed) {
      return;
    }

    const bar = document.createElement("aside");
    bar.className = "opportunity-bar";
    bar.dataset.opportunityBar = "";
    bar.setAttribute("aria-label", "Availability and contact");
    bar.innerHTML = '<div class="wrap opportunity-bar__inner"><p><span class="opportunity-bar__status" aria-hidden="true"></span><strong>Open to thoughtful engineering conversations</strong><span>Collaboration · speaking · mentoring · selected opportunities</span></p><div><a href="mailto:rdprassy@gmail.com" data-track="availability_contact">Contact me ↗</a><button type="button" aria-label="Dismiss availability message" data-opportunity-dismiss>×</button></div></div>';
    header.insertAdjacentElement("afterend", bar);

    const dismissButton = bar.querySelector("[data-opportunity-dismiss]");
    dismissButton.addEventListener("click", function () {
      bar.remove();
      try {
        sessionStorage.setItem("rdprassy-opportunity-bar-dismissed", "true");
      } catch (error) {
        // The dismiss action still works for the current page.
      }
    });
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
      const primaryDestinations = [
        { label: "Recruiter", href: "recruiter.html", pages: ["recruiter.html", "resume.html"] },
        { label: "Experience", href: "experience.html", pages: ["experience.html"] },
        { label: "Work", href: "projects.html", pages: ["projects.html", "live-projects.html"] },
        { label: "AI", href: "ai-engineering.html", pages: ["ai-engineering.html", "ai-lab.html", "engineering-artifacts.html", "rag-studio.html"] },
        {
          label: "Games",
          href: "games.html",
          pages: [
            "games.html", "snake-ladders.html", "flappy-flight.html", "code-sprint.html",
            "algorithm-arena.html", "memory-stack.html", "cloud-2048.html", "pong-ai.html",
            "defend-api.html", "connect-four.html", "portfolio-quest.html", "pac-grid.html"
          ]
        }
      ];
      const exploreGroups = [
        {
          label: "Profile",
          links: [
            ["About", "about.html"], ["Journey", "journey.html"], ["Skills", "skills.html"],
            ["Achievements", "achievements.html"], ["Certifications", "certifications.html"], ["Now", "now.html"]
          ]
        },
        {
          label: "Engineering",
          links: [
            ["Projects", "projects.html"], ["Live products", "live-projects.html"], ["Applied AI", "ai-engineering.html"],
            ["RAG Studio", "rag-studio.html"], ["AI Lab", "ai-lab.html"], ["Artifacts", "engineering-artifacts.html"],
            ["Résumé library", "resume.html"]
          ]
        },
        {
          label: "Play & create",
          links: [
            ["Task Matrix", "task-manager.html"], ["Project Cinema", "project-cinema.html"],
            ["Watch & listen", "watch-listen.html"], ["Writing & music", "writer-lyricist.html"], ["Notes", "notes.html"]
          ]
        },
        {
          label: "More",
          links: [
            ["Competitive programming", "competitive-programming.html"], ["Sports", "sports.html"],
            ["Contact", "contact.html"], ["Privacy", "privacy.html"], ["Legacy portfolio", "index_rdp.html"]
          ]
        }
      ];

      nav.replaceChildren();

      primaryDestinations.forEach(function (destination) {
        const link = document.createElement("a");
        link.href = destination.href;
        link.textContent = destination.label;
        if (destination.pages.includes(currentPage)) {
          link.setAttribute("aria-current", "page");
        }
        nav.appendChild(link);
      });

      const explore = document.createElement("div");
      const exploreButton = document.createElement("button");
      const explorePanel = document.createElement("div");
      const exploreHeading = document.createElement("div");
      const exploreGrid = document.createElement("div");
      const footer = document.querySelector("footer");
      const primaryPages = primaryDestinations.flatMap(function (destination) { return destination.pages; });

      explore.className = "nav-explore";
      explore.dataset.navExplore = "";
      exploreButton.className = "nav-explore__toggle";
      exploreButton.type = "button";
      exploreButton.dataset.navExploreToggle = "";
      exploreButton.setAttribute("aria-expanded", "false");
      exploreButton.setAttribute("aria-controls", "portfolio-explore-menu");
      exploreButton.innerHTML = '<span>Explore</span><span aria-hidden="true">＋</span>';
      if (!primaryPages.includes(currentPage) && currentPage !== "contact.html" && currentPage !== "index.html") {
        exploreButton.classList.add("is-current");
      }

      explorePanel.className = "nav-explore__panel";
      explorePanel.id = "portfolio-explore-menu";
      explorePanel.dataset.navExplorePanel = "";
      explorePanel.setAttribute("aria-hidden", "true");
      exploreHeading.className = "nav-explore__heading";
      exploreHeading.innerHTML = '<div><span>Portfolio map</span><strong>Choose your own route.</strong></div><button type="button" data-nav-explore-close aria-label="Close Explore menu">×</button>';
      exploreGrid.className = "nav-explore__grid";

      exploreGroups.forEach(function (group) {
        const column = document.createElement("div");
        const heading = document.createElement("strong");
        heading.textContent = group.label;
        column.className = "nav-explore__group";
        column.appendChild(heading);
        group.links.forEach(function (destination) {
          const link = document.createElement("a");
          link.href = destination[1];
          link.textContent = destination[0];
          if (currentPage === destination[1]) {
            link.setAttribute("aria-current", "page");
          }
          column.appendChild(link);
        });
        exploreGrid.appendChild(column);
      });

      const footerButton = document.createElement("button");
      footerButton.className = "nav-explore__footer";
      footerButton.type = "button";
      footerButton.dataset.exploreFooter = "";
      footerButton.innerHTML = '<span><strong>Looking for every link?</strong><small>Jump to this page’s footer directory.</small></span><span aria-hidden="true">↓</span>';
      if (!footer) {
        footerButton.disabled = true;
      } else {
        footer.id = footer.id || "site-footer";
      }

      explorePanel.append(exploreHeading, exploreGrid, footerButton);
      explore.append(exploreButton, explorePanel);
      nav.appendChild(explore);

      const searchButton = document.createElement("button");
      searchButton.className = "nav-search";
      searchButton.type = "button";
      searchButton.dataset.commandOpen = "";
      searchButton.setAttribute("aria-label", "Search the portfolio");
      searchButton.innerHTML = '<span aria-hidden="true">⌕</span><span>Search</span><kbd>⌘K</kbd>';
      nav.appendChild(searchButton);

      const themeButton = document.createElement("button");
      themeButton.className = "theme-button";
      themeButton.type = "button";
      themeButton.dataset.themeToggle = "";
      themeButton.innerHTML = '<span data-theme-icon aria-hidden="true">☾</span><span data-theme-label>Dark</span>';
      nav.appendChild(themeButton);

      const contactLink = document.createElement("a");
      contactLink.className = "nav-cta";
      contactLink.href = "contact.html";
      contactLink.textContent = "Let’s talk";
      if (currentPage === "contact.html") {
        contactLink.setAttribute("aria-current", "page");
      }
      nav.appendChild(contactLink);

      function setExploreOpen(open) {
        explore.classList.toggle("is-open", open);
        exploreButton.setAttribute("aria-expanded", String(open));
        exploreButton.querySelector("[aria-hidden]").textContent = open ? "−" : "＋";
        explorePanel.setAttribute("aria-hidden", String(!open));
      }

      exploreButton.addEventListener("click", function () {
        setExploreOpen(!explore.classList.contains("is-open"));
      });
      explorePanel.querySelector("[data-nav-explore-close]").addEventListener("click", function () {
        setExploreOpen(false);
        exploreButton.focus();
      });
      footerButton.addEventListener("click", function () {
        if (!footer) return;
        setExploreOpen(false);
        footer.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      });
      document.addEventListener("click", function (event) {
        if (!explore.contains(event.target)) {
          setExploreOpen(false);
        }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && explore.classList.contains("is-open")) {
          setExploreOpen(false);
          exploreButton.focus();
        }
      });
    });
  }

  enrichNavigation();
  initialiseTheme();
  assignSectionAnchors();
  initialiseSmartBack();
  initialiseOpportunityBar();
  window.addEventListener("pageshow", restoreScrollPosition);

  function initialiseFooterShortcut() {
    const footer = document.querySelector(".site-footer");
    if (!footer || document.querySelector("[data-footer-shortcut]")) {
      return;
    }

    footer.id = footer.id || "site-footer";

    const shortcut = document.createElement("button");
    shortcut.className = "footer-shortcut";
    shortcut.type = "button";
    shortcut.dataset.footerShortcut = "";
    shortcut.dataset.destination = "footer";
    shortcut.setAttribute("aria-label", "Jump to the footer");
    shortcut.innerHTML = '<span data-footer-shortcut-label>More</span><span aria-hidden="true" data-footer-shortcut-arrow>↓</span>';

    shortcut.addEventListener("click", function () {
      const destination = shortcut.dataset.destination;
      const target = destination === "top" ? document.body : footer;
      target.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: destination === "top" ? "start" : "end"
      });
    });

    document.body.appendChild(shortcut);

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const label = shortcut.querySelector("[data-footer-shortcut-label]");
    const arrow = shortcut.querySelector("[data-footer-shortcut-arrow]");
    const observer = new IntersectionObserver(function (entries) {
      const footerVisible = entries.some(function (entry) {
        return entry.isIntersecting;
      });
      shortcut.dataset.destination = footerVisible ? "top" : "footer";
      shortcut.setAttribute("aria-label", footerVisible ? "Back to the top of the page" : "Jump to the footer");
      label.textContent = footerVisible ? "Top" : "More";
      arrow.textContent = footerVisible ? "↑" : "↓";
    }, { threshold: 0.12 });

    observer.observe(footer);
  }

  initialiseFooterShortcut();

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

  function initialiseProjectFilters() {
    const filterRoot = document.querySelector("[data-project-filter]");
    const grid = document.querySelector("[data-project-grid]");
    if (!filterRoot || !grid) {
      return;
    }

    const buttons = Array.from(filterRoot.querySelectorAll("[data-project-filter-value]"));
    const search = filterRoot.querySelector("[data-project-search]");
    const cards = Array.from(grid.querySelectorAll("[data-project-card]"));
    const count = document.querySelector("[data-project-count]");
    const empty = document.querySelector("[data-project-empty]");
    const reset = document.querySelector("[data-project-reset]");
    let activeFilter = "all";

    function normalise(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
    }

    function applyFilters() {
      const query = normalise(search ? search.value : "");
      let visibleCount = 0;

      cards.forEach(function (card) {
        const tags = normalise(card.dataset.projectTags);
        const text = normalise(card.textContent);
        const matchesCategory = activeFilter === "all" || tags.split(" ").includes(activeFilter);
        const matchesQuery = !query || query.split(" ").every(function (term) {
          return tags.includes(term) || text.includes(term);
        });
        const visible = matchesCategory && matchesQuery;
        card.hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      });

      if (count) {
        count.textContent = visibleCount + (visibleCount === 1 ? " project" : " projects");
      }
      if (empty) {
        empty.hidden = visibleCount !== 0;
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = button.dataset.projectFilterValue || "all";
        buttons.forEach(function (item) {
          item.setAttribute("aria-pressed", String(item === button));
        });
        applyFilters();
        trackEvent("project_filter_use", { filter: activeFilter });
      });
    });

    if (search) {
      let searchTimer = 0;
      search.addEventListener("input", function () {
        applyFilters();
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(function () {
          const query = normalise(search.value);
          if (query) {
            trackEvent("project_search", { query_length: query.length });
          }
        }, 600);
      });
    }

    if (reset) {
      reset.addEventListener("click", function () {
        activeFilter = "all";
        buttons.forEach(function (button) {
          button.setAttribute("aria-pressed", String(button.dataset.projectFilterValue === "all"));
        });
        if (search) {
          search.value = "";
        }
        applyFilters();
      });
    }

    applyFilters();
  }

  function initialiseCommandPalette() {
    if (document.querySelector("[data-command-palette]")) {
      return;
    }

    const pages = [
      { title: "Recruiter overview", detail: "60-second professional brief", href: "recruiter.html", group: "Start", keywords: "hire role fit overview resume career" },
      { title: "Selected projects", detail: "Filterable engineering case studies", href: "projects.html", group: "Work", keywords: "portfolio java react cloud enterprise research" },
      { title: "Live products", detail: "Public demos and current builds", href: "live-projects.html", group: "Work", keywords: "vercel aligniq web3 rag studio" },
      { title: "Applied AI engineering", detail: "RAG, Retail360, and agent reliability", href: "ai-engineering.html", group: "AI", keywords: "artificial intelligence agents architecture evaluation" },
      { title: "RAG Studio", detail: "Open evaluation-first retrieval system", href: "rag-studio.html", group: "AI", keywords: "retrieval citations reranking hybrid search" },
      { title: "Retrieval Systems Lab", detail: "Interactive grounded-answer demo", href: "ai-lab.html", group: "AI", keywords: "rag demo chunks threshold evaluation" },
      { title: "Experience", detail: "Career timeline and reported outcomes", href: "experience.html", group: "Profile", keywords: "pepsico pega amazon oracle teradata axa" },
      { title: "Skills", detail: "Full-stack, cloud, and AI toolkit", href: "skills.html", group: "Profile", keywords: "java spring react typescript aws azure python" },
      { title: "Résumé library", detail: "AI, visual, and portfolio editions", href: "resume.html", group: "Profile", keywords: "cv download pdf recruiter" },
      { title: "Engineering artifacts", detail: "API, evaluation, and incident templates", href: "engineering-artifacts.html", group: "Proof", keywords: "openapi checklist retrospective recommendation" },
      { title: "Project cinema", detail: "Narrated films about engineering work", href: "project-cinema.html", group: "Media", keywords: "youtube video film projects" },
      { title: "Writing and lyrics", detail: "Novel, music, and creative work", href: "writer-lyricist.html", group: "Creative", keywords: "art of making song novel lyricist" },
      { title: "Games arcade", detail: "Playable browser games", href: "games.html", group: "Play", keywords: "pac man snake flappy 2048 pong" },
      { title: "Task manager", detail: "Local Eisenhower matrix", href: "task-manager.html", group: "Tools", keywords: "tasks productivity matrix priority" },
      { title: "Certifications", detail: "Cloud and AI credentials", href: "certifications.html", group: "Proof", keywords: "azure pega oracle credential" },
      { title: "Contact", detail: "Email and professional profiles", href: "contact.html", group: "Connect", keywords: "email linkedin github reach out" }
    ];

    const dialog = document.createElement("dialog");
    dialog.className = "command-palette";
    dialog.dataset.commandPalette = "";
    dialog.setAttribute("aria-label", "Search the portfolio");
    dialog.innerHTML = '<div class="command-palette__shell"><div class="command-palette__search"><span aria-hidden="true">⌕</span><label><span class="sr-only">Search pages and projects</span><input type="search" placeholder="Search pages, projects, skills…" autocomplete="off" data-command-input></label><button type="button" data-command-close aria-label="Close search">Esc</button></div><div class="command-palette__results" role="listbox" aria-label="Search results" data-command-results></div><div class="command-palette__footer"><span>↑↓ navigate</span><span>Enter open</span><span>Esc close</span></div></div>';
    document.body.appendChild(dialog);

    const input = dialog.querySelector("[data-command-input]");
    const results = dialog.querySelector("[data-command-results]");
    const closeButton = dialog.querySelector("[data-command-close]");
    let activeIndex = 0;
    let renderedLinks = [];
    let paletteTrigger = null;

    function normalise(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
    }

    function render() {
      const query = normalise(input.value);
      const matches = pages.filter(function (page) {
        const haystack = normalise(page.title + " " + page.detail + " " + page.group + " " + page.keywords);
        return !query || query.split(" ").every(function (term) { return haystack.includes(term); });
      }).slice(0, 10);

      results.replaceChildren();
      activeIndex = 0;
      matches.forEach(function (page, index) {
        const link = document.createElement("a");
        link.className = "command-result";
        link.href = page.href;
        link.dataset.commandResult = "";
        link.setAttribute("role", "option");
        link.innerHTML = '<span><small></small><strong></strong><em></em></span><b aria-hidden="true">↗</b>';
        link.querySelector("small").textContent = page.group;
        link.querySelector("strong").textContent = page.title;
        link.querySelector("em").textContent = page.detail;
        link.setAttribute("aria-selected", String(index === 0));
        link.addEventListener("click", function () {
          trackEvent("command_palette_navigate", { destination: page.href, search_used: query ? "yes" : "no" });
        });
        results.appendChild(link);
      });

      if (!matches.length) {
        const message = document.createElement("p");
        message.className = "command-palette__empty";
        message.textContent = "No exact match. Try AI, Java, résumé, games, writing, or contact.";
        results.appendChild(message);
      }
      renderedLinks = Array.from(results.querySelectorAll("[data-command-result]"));
    }

    function setActive(nextIndex) {
      if (!renderedLinks.length) {
        return;
      }
      activeIndex = (nextIndex + renderedLinks.length) % renderedLinks.length;
      renderedLinks.forEach(function (link, index) {
        link.setAttribute("aria-selected", String(index === activeIndex));
      });
      renderedLinks[activeIndex].scrollIntoView({ block: "nearest" });
    }

    function openPalette(trigger) {
      paletteTrigger = trigger || document.activeElement;
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else {
        dialog.setAttribute("open", "");
      }
      input.value = "";
      render();
      window.setTimeout(function () { input.focus(); }, 0);
      trackEvent("command_palette_open", { trigger: "button_or_shortcut" });
    }

    function closePalette() {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
      if (paletteTrigger && typeof paletteTrigger.focus === "function") {
        paletteTrigger.focus();
      }
    }

    document.addEventListener("click", function (event) {
      const commandButton = event.target.closest("[data-command-open]");
      if (commandButton) {
        openPalette(commandButton);
      }
    });
    document.addEventListener("keydown", function (event) {
      const target = event.target;
      const typing = target && (target.matches("input, textarea, select") || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette(document.activeElement);
      } else if (event.key === "/" && !typing && !dialog.open) {
        event.preventDefault();
        openPalette(document.activeElement);
      }
    });
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive(activeIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive(activeIndex - 1);
      } else if (event.key === "Enter" && renderedLinks[activeIndex]) {
        event.preventDefault();
        renderedLinks[activeIndex].click();
      }
    });
    closeButton.addEventListener("click", closePalette);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        closePalette();
      }
    });
    dialog.addEventListener("cancel", function () {
      if (paletteTrigger && typeof paletteTrigger.focus === "function") {
        window.setTimeout(function () { paletteTrigger.focus(); }, 0);
      }
    });
  }

  function initialisePortfolioAssistant() {
    if (document.querySelector("[data-portfolio-assistant]")) {
      return;
    }

    const knowledge = [
      { id: "overview", title: "Professional overview", keywords: "overview about profile who experience engineer full stack role", answer: "Devi Prasad Choudhary Ratnala is a product-minded full-stack AI engineer with 10+ years across Java, Spring Boot, React, enterprise systems, cloud workflows, production ownership, and applied AI.", sources: [["Recruiter overview", "recruiter.html"], ["Experience", "experience.html"]] },
      { id: "ai", title: "Applied AI", keywords: "ai artificial intelligence retail360 analytics agent agents pipeline monitoring rag llm", answer: "The applied AI portfolio covers Retail360 decision support, retrieval-grounded document intelligence, and agent-assisted pipeline reliability. Reported scale and estimated impact are labeled separately.", sources: [["Applied AI case study", "ai-engineering.html"], ["RAG Studio", "rag-studio.html"]] },
      { id: "rag", title: "RAG and retrieval", keywords: "rag retrieval document documents semantic search hybrid reranking citation grounded evaluation", answer: "RAG Studio demonstrates hybrid retrieval, reciprocal-rank fusion, reranking, grounded citations, abstention, traces, and executable evaluation. The enterprise case study reports an approximately 1,500-document corpus and 300+ monthly questions.", sources: [["RAG Studio", "rag-studio.html"], ["Retrieval lab", "ai-lab.html"]] },
      { id: "retail", title: "Retail360", keywords: "retail retail360 pepsico stakeholders account analytics turnaround", answer: "Retail360 is presented as AI-assisted analytics supporting approximately 50 sales and operations stakeholders across 5+ retail accounts, with an estimated 25% improvement in analytics turnaround.", sources: [["Applied AI evidence", "ai-engineering.html"], ["Experience", "experience.html"]] },
      { id: "agents", title: "Agent-assisted reliability", keywords: "agent agents pipeline pipelines incident triage reliability failure monitoring", answer: "The agent-assisted reliability work reports monitoring across 20+ pipelines and approximately 50 monthly failure triages, with a reported 10% reduction in incident response time and human-controlled recovery.", sources: [["Agent architecture", "ai-engineering.html#ai-system-maps"], ["Incident artifact", "artifacts/incident-retrospective-template.md"]] },
      { id: "amazon", title: "Amazon Impact", keywords: "amazon aws lambda dynamodb react operations leadership incident serverless", answer: "Amazon Impact used AWS Lambda, DynamoDB, and React to create a repeatable weekly operations view for leadership. Ownership included high-severity incident response through root-cause resolution and durable fixes.", sources: [["Amazon case study", "projects.html#amazon-impact"], ["Project film", "project-cinema.html"]] },
      { id: "enterprise", title: "Enterprise experience", keywords: "oracle teradata axa pega enterprise insurance platform cloud history audit", answer: "The enterprise timeline spans AXA premium calculations, Teradata analytical-function tooling, Oracle cloud-maintenance scheduling, Amazon operations intelligence, Pega platform services, and current PepsiCo product and AI work.", sources: [["Experience timeline", "experience.html"], ["Project archive", "projects.html"]] },
      { id: "skills", title: "Technical skills", keywords: "skills stack java spring boot react typescript python django aws azure docker cicd api microservices", answer: "Core strengths include Java, Spring Boot, React, TypeScript, REST APIs, microservices, Python, AWS and Azure foundations, Docker, CI/CD, RAG, agents, evaluation, and MCP.", sources: [["Skills map", "skills.html"], ["Certifications", "certifications.html"]] },
      { id: "resume", title: "Résumés", keywords: "resume résumé cv download pdf recruiter", answer: "The résumé library offers an ATS-friendly AI and cloud edition, a visual one-page profile, and a detailed portfolio edition. Each can be viewed or downloaded.", sources: [["Résumé library", "resume.html"], ["Recruiter overview", "recruiter.html"]] },
      { id: "projects", title: "Projects", keywords: "projects work portfolio live products vercel web3 research games", answer: "The project archive includes live AI and Web3 products, enterprise case studies, public code, narrated project films, engineering artifacts, biometric research, and browser games.", sources: [["Filter projects", "projects.html#project-index"], ["Live products", "live-projects.html"]] },
      { id: "creative", title: "Creative work", keywords: "writing writer novel art making music song lyricist youtube creative", answer: "The creative portfolio includes the novel The Art of Making, original music, lyrics, and video work alongside the engineering portfolio.", sources: [["Writing and lyrics", "writer-lyricist.html"], ["Watch and listen", "watch-listen.html"]] },
      { id: "contact", title: "Contact and availability", keywords: "contact email linkedin available availability hire opportunity collaboration speaking mentoring", answer: "Devi is currently building at PepsiCo and is open to thoughtful engineering conversations, collaboration, speaking, mentoring, and selected opportunities. The direct email is rdprassy@gmail.com.", sources: [["Contact", "contact.html"], ["LinkedIn", "https://www.linkedin.com/in/rdprassy"]] }
    ];

    const launcher = document.createElement("button");
    launcher.className = "portfolio-assistant__launcher";
    launcher.type = "button";
    launcher.dataset.assistantOpen = "";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "portfolio-assistant");
    launcher.innerHTML = '<span aria-hidden="true">RD</span><strong>Ask portfolio</strong>';

    const panel = document.createElement("section");
    panel.className = "portfolio-assistant";
    panel.id = "portfolio-assistant";
    panel.dataset.portfolioAssistant = "";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Portfolio assistant");
    panel.hidden = true;
    panel.innerHTML = '<header><div><span>Evidence-grounded guide</span><h2>Ask about the portfolio</h2></div><button type="button" data-assistant-close aria-label="Close portfolio assistant">×</button></header><div class="portfolio-assistant__body"><p class="portfolio-assistant__intro">Answers come only from published portfolio content—no invented claims or live model guesswork.</p><div class="portfolio-assistant__suggestions"><button type="button" data-assistant-prompt="What AI work is showcased?">AI work</button><button type="button" data-assistant-prompt="What is the strongest project?">Top projects</button><button type="button" data-assistant-prompt="Where can I download a resume?">Résumé</button></div><div class="portfolio-assistant__answer" data-assistant-answer aria-live="polite"><p>Ask about experience, AI systems, projects, skills, résumés, writing, or contact details.</p></div></div><form class="portfolio-assistant__form" data-assistant-form><label><span class="sr-only">Ask a portfolio question</span><input type="text" maxlength="160" placeholder="Ask about RAG, Java, projects…" data-assistant-input></label><button type="submit">Ask</button></form>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const closeButton = panel.querySelector("[data-assistant-close]");
    const form = panel.querySelector("[data-assistant-form]");
    const input = panel.querySelector("[data-assistant-input]");
    const answer = panel.querySelector("[data-assistant-answer]");

    function normalise(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
    }

    function findAnswer(question) {
      const query = normalise(question);
      const tokens = query.split(" ").filter(function (token) { return token.length > 2; });
      let best = knowledge[0];
      let bestScore = 0;

      knowledge.forEach(function (entry) {
        const haystack = normalise(entry.title + " " + entry.keywords);
        let score = 0;
        tokens.forEach(function (token) {
          if (haystack.split(" ").includes(token)) {
            score += 3;
          } else if (haystack.includes(token)) {
            score += 1;
          }
        });
        if (score > bestScore) {
          bestScore = score;
          best = entry;
        }
      });

      return { entry: best, matched: bestScore > 0 };
    }

    function renderAnswer(question) {
      const result = findAnswer(question);
      answer.replaceChildren();
      const heading = document.createElement("strong");
      heading.textContent = result.matched ? result.entry.title : "Best starting point";
      const copy = document.createElement("p");
      copy.textContent = result.matched
        ? result.entry.answer
        : "I could not match that precisely, so here is the professional overview. " + result.entry.answer;
      const sources = document.createElement("div");
      sources.className = "portfolio-assistant__sources";
      result.entry.sources.forEach(function (source) {
        const link = document.createElement("a");
        link.href = source[1];
        link.textContent = source[0] + " ↗";
        if (/^https?:/i.test(source[1])) {
          link.target = "_blank";
          link.rel = "noopener";
        }
        link.addEventListener("click", function () {
          trackEvent("assistant_source_open", { topic: result.entry.id, destination: source[1] });
        });
        sources.appendChild(link);
      });
      answer.appendChild(heading);
      answer.appendChild(copy);
      answer.appendChild(sources);
      trackEvent("assistant_query", { topic: result.entry.id, matched: result.matched ? "yes" : "fallback" });
    }

    function openAssistant() {
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      input.focus();
      trackEvent("assistant_open", { page: currentPage });
    }

    function closeAssistant() {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    }

    launcher.addEventListener("click", function () {
      if (panel.hidden) {
        openAssistant();
      } else {
        closeAssistant();
      }
    });
    closeButton.addEventListener("click", closeAssistant);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const question = input.value.trim();
      if (question) {
        renderAnswer(question);
      }
    });
    panel.querySelectorAll("[data-assistant-prompt]").forEach(function (button) {
      button.addEventListener("click", function () {
        input.value = button.dataset.assistantPrompt;
        renderAnswer(input.value);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        closeAssistant();
      }
    });
  }

  function initialiseEngagementTracking() {
    const reached = new Set();
    let ticking = false;

    function checkDepth() {
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      [25, 50, 75, 90].forEach(function (threshold) {
        if (depth >= threshold && !reached.has(threshold)) {
          reached.add(threshold);
          trackEvent("scroll_depth", { percent: threshold });
        }
      });
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(checkDepth);
      }
    }, { passive: true });

    window.setTimeout(function () {
      if (!document.hidden) {
        trackEvent("engaged_visit", { seconds: 30 });
      }
    }, 30000);

    if ("IntersectionObserver" in window) {
      const seenSections = new Set();
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.target.id && !seenSections.has(entry.target.id)) {
            seenSections.add(entry.target.id);
            trackEvent("section_view", { section: entry.target.id.slice(0, 80) });
          }
        });
      }, { threshold: 0.45 });
      document.querySelectorAll("main > section[id]").forEach(function (section) {
        observer.observe(section);
      });
    }
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
    if (/linkedin\.com\/in\/rdprassy/i.test(href)) {
      return "linkedin_open";
    }
    if (/youtu(?:\.be|be\.com)/i.test(href)) {
      return "youtube_open";
    }
    if (/\.vercel\.app(?:\/|$)/i.test(href)) {
      return "live_product_open";
    }
    if (/drive\.google\.com/i.test(href)) {
      return "creative_work_open";
    }
    if (/^upi:/i.test(href)) {
      return "support_upi_open";
    }
    return "";
  }

  window.rdprassyTrack = trackEvent;
  optimiseImageLoading();
  initialiseProjectFilters();
  initialiseCommandPalette();
  initialisePortfolioAssistant();
  initialiseEngagementTracking();
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
      ".hero .eyebrow, .hero .display, .hero .hero-copy, .hero .hero-actions, .hero .portrait-card, .page-hero .breadcrumb, .page-hero .kicker, .page-hero .page-title, .page-hero .page-lead, .arcade-hero .breadcrumb, .arcade-hero .kicker, .arcade-hero h1, .arcade-hero p, .arcade-hero .hero-actions, .arcade-machine, .task-hero .breadcrumb, .task-hero .kicker, .task-hero h1, .task-hero p, .task-hero__principle"
    );

    heroItems.forEach(function (item, index) {
      item.classList.add("hero-animate");
      item.style.setProperty("--hero-delay", String(Math.min(index * 70, 350)) + "ms");
    });
  }

  function initialiseReveals() {
    const revealItems = document.querySelectorAll(
      ".section-heading, .panel, .card, .project-row, .timeline-item, .skill-group, .tag-list, .quote-band, .cta, .proof, .brand-showcase, .impact-note, .feed-card, .resume-option, .resume-section, .architecture-card, .decision, .evaluation-grid article, .artifact-card, .dataset-card, .cinema-card, .cinema-feature, .cinema-projects-callout, .game-library-card, .arcade-home__games, .arcade-values, .arcade-catalog-card, .arcade-stat-grid, .achievement-list, .task-composer, .task-stats, .matrix-quadrant, .task-home__matrix"
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
