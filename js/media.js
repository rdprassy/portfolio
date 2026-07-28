(function () {
  "use strict";

  document.querySelectorAll("[data-player-load]").forEach(function (button) {
    button.addEventListener("click", function () {
      const player = button.closest("[data-youtube-player]");
      if (!player || player.classList.contains("is-loaded")) {
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.src = button.dataset.youtubeSrc;
      iframe.title = button.dataset.youtubeTitle || "YouTube media player";
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;

      player.classList.add("is-loaded");
      player.appendChild(iframe);

      if (typeof window.rdprassyTrack === "function") {
        window.rdprassyTrack("youtube_player_load", {
          collection: player.dataset.playerName || "YouTube collection"
        });
      }

      iframe.focus();
    });
  });
})();
