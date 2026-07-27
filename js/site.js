(function () {
  const button = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-site-nav]");

  if (button && nav) {
    button.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      button.setAttribute("aria-expanded", String(open));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll("[data-year]").forEach(function (item) {
    item.textContent = String(new Date().getFullYear());
  });
}());
