(function () {
  "use strict";

  // Optional for GitHub Pages deployments. Set this only to a trusted HTTPS
  // Worker origin, for example: "https://your-worker.example.workers.dev".
  // With no origin configured, Sprout Tutor uses its clearly labelled,
  // non-AI Practice Coach instead.
  if (typeof window.KIDDO_SPROUT_TUTOR_ORIGIN !== "string") {
    window.KIDDO_SPROUT_TUTOR_ORIGIN = "";
  }
}());
