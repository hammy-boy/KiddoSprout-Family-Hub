(function () {
  "use strict";

  // Optional when the browser pages and the AI Worker use different origins.
  // A deployment may replace the empty value with its trusted HTTPS Worker
  // origin, for example: "https://kiddosprout.example.workers.dev". When the
  // Worker serves this page itself, the controller safely discovers the
  // same-origin API and this may stay empty. Never put an API key here.
  if (typeof window.KIDDO_SPROUT_TUTOR_ORIGIN !== "string") {
    window.KIDDO_SPROUT_TUTOR_ORIGIN = "";
  }

  // An account host can inject an ordered list before this file loads. Each
  // value is still validated by sprout-tutor.js and must be an HTTPS origin.
  const configuredOrigins = Array.isArray(window.KIDDO_SPROUT_TUTOR_ORIGINS)
    ? window.KIDDO_SPROUT_TUTOR_ORIGINS.filter((value) => typeof value === "string").slice(0, 4)
    : [];
  window.KIDDO_SPROUT_TUTOR_ORIGINS = Object.freeze(configuredOrigins);
}());
