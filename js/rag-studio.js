(function () {
  "use strict";

  const video = document.querySelector("[data-rag-video]");
  if (!video) return;

  const tracked = new Set();
  function track(eventName, details) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, details || {});
    }
  }

  video.addEventListener("play", function () {
    if (tracked.has("play")) return;
    tracked.add("play");
    track("rag_video_play", { video_title: "RAG Studio walkthrough" });
  });

  video.addEventListener("timeupdate", function () {
    if (!video.duration) return;
    const progress = (video.currentTime / video.duration) * 100;
    [25, 50, 75].forEach(function (milestone) {
      const key = "progress_" + milestone;
      if (progress >= milestone && !tracked.has(key)) {
        tracked.add(key);
        track("rag_video_progress", {
          video_title: "RAG Studio walkthrough",
          video_percent: milestone
        });
      }
    });
  });

  video.addEventListener("ended", function () {
    track("rag_video_complete", { video_title: "RAG Studio walkthrough" });
  });
})();
