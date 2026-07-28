(function () {
  "use strict";

  const button = document.querySelector("[data-novel-load]");
  const reader = document.querySelector("[data-novel-reader]");
  if (!button || !reader) return;

  button.addEventListener("click", function () {
    if (reader.classList.contains("is-loaded")) return;

    const iframe = document.createElement("iframe");
    iframe.src = button.dataset.novelSrc;
    iframe.title = "The Art of Making manuscript preview";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "autoplay";

    reader.classList.add("is-loaded");
    reader.appendChild(iframe);

    if (typeof window.rdprassyTrack === "function") {
      window.rdprassyTrack("novel_preview_load", {
        novel_title: "The Art of Making"
      });
    }

    iframe.focus();
  });
})();
