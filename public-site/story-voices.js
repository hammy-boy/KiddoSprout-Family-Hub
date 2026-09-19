(function () {
  "use strict";

  if (window.KiddoSproutStoryVoices) return;
  let startPromise = null;

  function initialize() {
    if (document.querySelector("[data-hub-page]")?.classList.contains("hidden")) return false;

  const SESSION_KEYS = ["kiddosproutSupabaseSession", "flavornest_session"];
  const PUBLIC_DEMO_ONLY = window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true;
  const voiceGrid = document.querySelector("#voiceGrid");
  const voiceSearch = document.querySelector("#voiceSearch");
  const voiceCount = document.querySelector("#voiceCount");
  const voiceLibraryStatus = document.querySelector("#voiceLibraryStatus");
  const selectedVoiceLabel = document.querySelector("#selectedVoiceLabel");
  const sourceButtons = document.querySelectorAll("[data-voice-source]");
  const storyReturnLinks = document.querySelectorAll("[data-return-to-story]");
  const voiceEmojis = ["🦊", "🐼", "🦁", "🦉", "🐯", "🐸", "🦋", "🐻", "🐧", "🦄", "🐨", "🐬"];
  const voiceGlows = ["#f3e9fb", "#e3f7f1", "#fff1c7", "#e8efff", "#ffe9e5", "#e6f6d9"];
  const VOICE_LIST_TIMEOUT_MS = 12000;
  let premiumVoices = [];
  let deviceVoices = [];
  let activeSource = "all";
  let activePreview = null;
  let selectedVoice = readSelectedVoice();
  let voiceCardCounter = 0;
  let voiceLoadGeneration = 0;
  let pageActive = true;

  function storyReturnHash() {
    const value = new URLSearchParams(window.location.search).get("return") || "";
    return window.KiddoSproutStoryStorage?.parseReaderHash?.(value) ? value : "";
  }

  function cameFromStoryTheater() {
    try {
      const referrer = new URL(document.referrer);
      return referrer.origin === window.location.origin && referrer.pathname.endsWith("/story-theater.html");
    } catch (error) {
      return false;
    }
  }

  const returnHash = storyReturnHash();
  storyReturnLinks.forEach((link) => {
    if (returnHash) link.href = `story-theater.html${returnHash}`;
    link.addEventListener("click", (event) => {
      if (!returnHash || !cameFromStoryTheater() || window.history.length <= 1) return;
      event.preventDefault();
      window.history.back();
    });
  });

  function childFacingDeviceVoiceName(name, id = "") {
    const originalName = String(name || "");
    const identity = `${originalName} ${String(id || "")}`.toLowerCase();
    return identity.includes("google uk english female") ? "Alexa" : originalName;
  }

  function readSelectedVoice() {
    const value = window.KiddoSproutStoryVoiceChoice?.read?.();
    if (!value) return null;
    return {
      ...value,
      name: value.source === "device" ? childFacingDeviceVoiceName(value.name, value.id) : value.name
    };
  }

  async function sessionToken() {
    if (window.KiddoSproutStoryVoiceChoice?.demoActive?.() || PUBLIC_DEMO_ONLY) return "";
    if (window.KiddoSproutSession?.getAccessToken) {
      return String(await window.KiddoSproutSession.getAccessToken() || "");
    }
    for (const key of SESSION_KEYS) {
      try {
        const session = JSON.parse(window.sessionStorage.getItem(key) || "null");
        if (session?.access_token) return String(session.access_token);
      } catch (error) {
        // Try the next shared session key.
      }
    }
    return "";
  }

  function setStatus(message, state = "notice") {
    voiceLibraryStatus.textContent = message;
    voiceLibraryStatus.dataset.state = state;
  }

  function prettyLabel(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  }

  function hashIndex(value, length) {
    let hash = 0;
    for (const character of String(value)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return Math.abs(hash) % length;
  }

  function updateSelectedLabel() {
    selectedVoiceLabel.textContent = selectedVoice
      ? `${selectedVoice.name} is your story sound. Try every mood with it!`
      : "Hear a few voices, then choose your favourite.";
  }

  function stopPreview({ announce = true } = {}) {
    const wasPlaying = Boolean(activePreview);
    if (activePreview && typeof activePreview.pause === "function") {
      activePreview.pause();
      activePreview.currentTime = 0;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    activePreview = null;
    document.querySelectorAll(".preview-voice[data-playing='true']").forEach((button) => {
      setPreviewButtonState(button, false, button.dataset.voiceName || "story");
    });
    if (wasPlaying && announce) setStatus("Voice preview stopped.", "notice");
    return wasPlaying;
  }

  function setPreviewButtonState(button, playing, voiceName) {
    button.dataset.voiceName = voiceName;
    button.dataset.playing = String(playing);
    button.removeAttribute("aria-pressed");
    button.textContent = playing ? "■ Stop" : "▶ Hear Voice";
    button.setAttribute("aria-label", playing ? `Stop: ${voiceName} voice preview` : `Hear Voice: ${voiceName}`);
  }

  function previewVoice(voice, button) {
    stopPreview({ announce: false });
    setPreviewButtonState(button, true, voice.name);

    if (voice.source === "elevenlabs" && voice.previewUrl) {
      let audio;
      try {
        audio = new Audio(voice.previewUrl);
      } catch (error) {
        setPreviewButtonState(button, false, voice.name);
        setStatus("That sample could not open. Try another voice.", "error");
        return;
      }
      const finish = () => {
        if (activePreview !== audio) return;
        activePreview = null;
        setPreviewButtonState(button, false, voice.name);
        setStatus(`Finished ${voice.name}.`, "notice");
      };
      activePreview = audio;
      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", () => {
        if (activePreview !== audio) return;
        activePreview = null;
        setPreviewButtonState(button, false, voice.name);
        setStatus("That sample could not play. Try another voice.", "error");
      }, { once: true });
      audio.play().then(() => {
        if (activePreview === audio) setStatus(`Playing ${voice.name}.`, "success");
      }).catch(() => {
        if (activePreview !== audio) return;
        finish();
        setStatus("Tap the play button again to hear this voice.", "error");
      });
      return;
    }

    if (voice.source === "device" && "speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance("Hello, story explorer! Shall we read a magical adventure together?");
        const finish = (message, state = "notice") => {
          if (activePreview !== utterance) return;
          activePreview = null;
          setPreviewButtonState(button, false, voice.name);
          setStatus(message, state);
        };
        utterance.voice = window.speechSynthesis.getVoices().find((candidate) =>
          candidate.voiceURI === voice.id || candidate.name === voice.id || candidate.name === voice.name
        ) || null;
        utterance.rate = 0.94;
        utterance.pitch = 1.06;
        utterance.volume = 0.95;
        utterance.onend = () => finish(`Finished ${voice.name}.`);
        utterance.onerror = () => finish("That device voice could not play. Try another voice.", "error");
        activePreview = utterance;
        setStatus(`Playing ${voice.name}.`, "success");
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        activePreview = null;
        setPreviewButtonState(button, false, voice.name);
        setStatus("That device voice could not play. Try another voice.", "error");
      }
      return;
    }

    setPreviewButtonState(button, false, voice.name);
    setStatus("That voice cannot be previewed in this browser.", "error");
  }

  function chooseVoice(voice) {
    stopPreview({ announce: false });
    const choice = { source: voice.source, id: voice.id, name: voice.name, quality: voice.quality || "standard" };
    if (!window.KiddoSproutStoryVoiceChoice?.write?.(choice)) {
      setStatus("Ask a parent to log in before saving a story sound.", "notice");
      return;
    }
    selectedVoice = choice;
    updateSelectedLabel();
    setStatus(`${voice.name} is ready for your next story!`, "success");
    renderVoices();
    const selectedCard = [...voiceGrid.querySelectorAll(".voice-card")].find((card) => (
      card.dataset.voiceSource === voice.source && card.dataset.voiceId === voice.id
    ));
    selectedCard?.focus({ preventScroll: true });
  }

  function normalizedVoiceSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function voiceMatches(voice, queryWords) {
    if (!queryWords.length) return true;
    const searchable = normalizedVoiceSearch([
      voice.name,
      voice.description,
      ...(voice.tags || [])
    ].join(" "));
    return queryWords.every((word) => searchable.includes(word));
  }

  function makeVoiceCard(voice) {
    const card = document.createElement("article");
    const selected = selectedVoice?.source === voice.source && selectedVoice?.id === voice.id;
    const titleId = `voice-card-title-${++voiceCardCounter}`;
    card.className = `voice-card${selected ? " selected" : ""}`;
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-labelledby", titleId);
    card.tabIndex = -1;
    card.dataset.voiceSource = voice.source;
    card.dataset.voiceId = voice.id;
    if (selected) card.setAttribute("aria-current", "true");
    card.style.setProperty("--voice-card-glow", voiceGlows[hashIndex(voice.id, voiceGlows.length)]);

    const top = document.createElement("div");
    top.className = "voice-card-top";
    const avatar = document.createElement("span");
    avatar.className = "voice-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = voiceEmojis[hashIndex(voice.id, voiceEmojis.length)];
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    title.id = titleId;
    title.textContent = voice.name;
    const source = document.createElement("span");
    source.className = "voice-source-label";
    source.textContent = voice.source === "device"
      ? "On this device"
      : voice.quality === "studio-pro"
        ? "Studio Pro voice"
        : voice.quality === "pro"
          ? "Pro voice"
          : voice.quality === "studio"
            ? "Studio-quality voice"
          : "Magic voice";
    heading.append(title, source);
    top.append(avatar, heading);

    const details = document.createElement("div");
    const description = document.createElement("p");
    description.className = "voice-card-description";
    description.textContent = voice.description || "A story sound ready to try.";
    details.appendChild(description);
    if (voice.tags?.length) {
      const tags = document.createElement("div");
      tags.className = "voice-tags";
      voice.tags.slice(0, 3).forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "voice-tag";
        chip.textContent = tag;
        tags.appendChild(chip);
      });
      details.appendChild(tags);
    }

    const actions = document.createElement("div");
    actions.className = "voice-card-actions";
    const previewButton = document.createElement("button");
    previewButton.className = "preview-voice";
    previewButton.type = "button";
    setPreviewButtonState(previewButton, false, voice.name);
    if (voice.source === "elevenlabs" && !voice.previewUrl) {
      previewButton.disabled = true;
      previewButton.textContent = "No Sample Yet";
      previewButton.setAttribute("aria-label", `No Sample Yet: ${voice.name}`);
    } else {
      previewButton.addEventListener("click", () => {
        if (previewButton.dataset.playing === "true") {
          stopPreview();
        } else {
          previewVoice(voice, previewButton);
        }
      });
    }
    const chooseButton = document.createElement("button");
    chooseButton.className = "choose-voice";
    chooseButton.type = "button";
    chooseButton.textContent = selected ? "✓ Chosen!" : "Choose Sound";
    chooseButton.setAttribute("aria-label", selected ? `Chosen! ${voice.name}` : `Choose Sound: ${voice.name}`);
    chooseButton.disabled = selected;
    chooseButton.addEventListener("click", () => chooseVoice(voice));
    actions.append(previewButton, chooseButton);

    card.append(top, details, actions);
    return card;
  }

  function visibleVoices() {
    const queryWords = normalizedVoiceSearch(voiceSearch.value).split(" ").filter(Boolean);
    return [...premiumVoices, ...deviceVoices]
      .filter((voice) => activeSource === "all"
        || voice.source === activeSource
        || (activeSource === "pro" && voice.source === "elevenlabs" && ["pro", "studio-pro"].includes(voice.quality)))
      .filter((voice) => voiceMatches(voice, queryWords));
  }

  function focusedVoiceControl() {
    const active = document.activeElement;
    const card = active?.closest?.(".voice-card");
    if (!card || !voiceGrid.contains(card)) return null;
    const control = active.classList.contains("preview-voice")
      ? "preview"
      : active.classList.contains("choose-voice")
        ? "choose"
        : "card";
    return {
      source: card.dataset.voiceSource || "",
      id: card.dataset.voiceId || "",
      control
    };
  }

  function restoreVoiceControlFocus(previousFocus) {
    if (!previousFocus) return;
    const card = [...voiceGrid.querySelectorAll(".voice-card")].find((candidate) => (
      candidate.dataset.voiceSource === previousFocus.source && candidate.dataset.voiceId === previousFocus.id
    ));
    if (!card) {
      voiceSearch.focus({ preventScroll: true });
      return;
    }
    const selector = previousFocus.control === "preview"
      ? ".preview-voice"
      : previousFocus.control === "choose"
        ? ".choose-voice"
        : "";
    const control = selector ? card.querySelector(selector) : card;
    (control && !control.disabled ? control : card).focus({ preventScroll: true });
  }

  function renderVoices() {
    const previousFocus = focusedVoiceControl();
    // A filter or refreshed voice list can remove the active preview button.
    // Stop its audio first so a sample never carries on without a visible stop control.
    stopPreview();
    const voices = visibleVoices();
    voiceGrid.setAttribute("aria-busy", "true");
    voiceGrid.replaceChildren();
    voiceCardCounter = 0;
    voiceCount.textContent = `${voices.length} ${voices.length === 1 ? "sound" : "sounds"}`;
    if (!voices.length) {
      const empty = document.createElement("div");
      empty.className = "voice-empty";
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "🎧";
      const title = document.createElement("strong");
      title.textContent = "No sounds match that search yet";
      const detail = document.createElement("span");
      detail.textContent = "Try another word or choose All Sounds.";
      empty.append(icon, title, detail);
      voiceGrid.appendChild(empty);
      voiceGrid.setAttribute("aria-busy", "false");
      restoreVoiceControlFocus(previousFocus);
      return;
    }
    voices.forEach((voice) => voiceGrid.appendChild(makeVoiceCard(voice)));
    voiceGrid.setAttribute("aria-busy", "false");
    restoreVoiceControlFocus(previousFocus);
  }

  function refreshDeviceVoices() {
    if (!("speechSynthesis" in window)) {
      deviceVoices = [];
      renderVoices();
      return;
    }
    const seen = new Set();
    const englishVoices = window.speechSynthesis.getVoices().filter((voice) => !voice.lang || voice.lang.toLowerCase().startsWith("en"));
    deviceVoices = englishVoices.reduce((voices, voice) => {
      const id = String(voice.voiceURI || voice.name || "").trim();
      if (!id || seen.has(id)) return voices;
      seen.add(id);
      voices.push({
        source: "device",
        id,
        name: childFacingDeviceVoiceName(voice.name || "Device Voice", id),
        description: voice.localService ? "A friendly voice already on this device." : "A friendly voice available through this browser.",
        tags: [prettyLabel(voice.lang || "English"), voice.localService ? "Works offline" : "Browser voice"],
        previewUrl: ""
      });
      return voices;
    }, []);
    renderVoices();
    if (PUBLIC_DEMO_ONLY) {
      setStatus(deviceVoices.length
        ? "Device voices are ready. ElevenLabs voices are off in this fictional-data demo."
        : "Waiting for this browser to provide a device voice. ElevenLabs voices are off in this fictional-data demo.");
    }
  }

  function voiceListFetchOptions() {
    if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
      return { headers: {}, cache: "no-store" };
    }
    return { headers: {}, cache: "no-store", signal: AbortSignal.timeout(VOICE_LIST_TIMEOUT_MS) };
  }

  function safePreviewUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  async function loadPremiumVoices() {
    const generation = ++voiceLoadGeneration;
    if (PUBLIC_DEMO_ONLY) {
      setStatus(deviceVoices.length
        ? "Device voices are ready. ElevenLabs voices are off in this fictional-data demo."
        : "Waiting for this browser to provide a device voice. ElevenLabs voices are off in this fictional-data demo.");
      renderVoices();
      return;
    }
    try {
      const token = await sessionToken();
      if (!token) {
        setStatus("Device voices are ready. Ask a parent to log in for the ElevenLabs voice library.");
        renderVoices();
        return;
      }
      const options = voiceListFetchOptions();
      options.headers.Authorization = `Bearer ${token}`;
      const response = await fetch("/api/story-voices", options);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Premium voices could not load.");
      if (!pageActive || generation !== voiceLoadGeneration) return;
      premiumVoices = (Array.isArray(payload.voices) ? payload.voices : []).slice(0, 120).map((voice) => {
        const labelValues = [voice.labels?.description, voice.labels?.accent, voice.labels?.use_case]
          .map(prettyLabel)
          .filter(Boolean);
        return {
          source: "elevenlabs",
          id: String(voice.id || "").slice(0, 128),
          name: String(voice.name || "Story Voice").slice(0, 80),
          description: String(voice.description || "An expressive ElevenLabs story voice.").slice(0, 240),
          quality: ["pro", "studio", "studio-pro"].includes(voice.quality) ? voice.quality : "standard",
          tags: [...new Set([
            ...(voice.quality === "studio-pro" ? ["Studio Pro"] : voice.quality === "pro" ? ["Pro"] : voice.quality === "studio" ? ["Studio Quality"] : []),
            ...labelValues
          ])],
          previewUrl: safePreviewUrl(voice.previewUrl)
        };
      }).filter((voice) => voice.id);
      setStatus(premiumVoices.length
        ? `Magic voice library open — ${premiumVoices.length} ElevenLabs ${premiumVoices.length === 1 ? "voice" : "voices"} ready to try!`
        : "No ElevenLabs voices were found, but device voices are ready.", premiumVoices.length ? "success" : "notice");
    } catch (error) {
      if (!pageActive || generation !== voiceLoadGeneration) return;
      const message = String(error?.message || "");
      setStatus(["AbortError", "TimeoutError"].includes(error?.name)
        ? "The magic voice shelf took too long to answer, but device voices are ready to try."
        : message.includes("not set up")
          ? "Device voices are ready. A grown-up can add the ElevenLabs key to unlock more sounds."
          : "The magic voice shelf is resting, but device voices are ready to try.", "notice");
    }
    renderVoices();
  }

  sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeSource = button.dataset.voiceSource;
      sourceButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle("active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
      });
      renderVoices();
    });
  });
  voiceSearch.addEventListener("input", renderVoices);
  voiceSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !voiceSearch.value) return;
    event.preventDefault();
    voiceSearch.value = "";
    renderVoices();
  });
  window.addEventListener("storage", (event) => {
    const choiceKey = window.KiddoSproutStoryVoiceChoice?.key?.();
    if (!choiceKey || event.key !== choiceKey) return;
    if (event.storageArea && event.storageArea !== window.localStorage) return;
    selectedVoice = readSelectedVoice();
    updateSelectedLabel();
    renderVoices();
    setStatus(selectedVoice
      ? `${selectedVoice.name} was chosen in another Story Theater tab.`
      : "The saved story sound was cleared in another tab.", "notice");
  });
  window.addEventListener("pagehide", () => {
    pageActive = false;
    voiceLoadGeneration += 1;
    stopPreview({ announce: false });
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    pageActive = true;
    selectedVoice = readSelectedVoice();
    updateSelectedLabel();
    refreshDeviceVoices();
    loadPremiumVoices();
  });

  updateSelectedLabel();
  refreshDeviceVoices();
  if ("speechSynthesis" in window) window.speechSynthesis.addEventListener?.("voiceschanged", refreshDeviceVoices);
  loadPremiumVoices();

    return true;
  }

  function start(gateResult) {
    if (startPromise) return startPromise;
    startPromise = Promise.resolve(gateResult)
      .then((allowed) => allowed === true && initialize() === true)
      .catch(() => false);
    return startPromise;
  }

  window.KiddoSproutStoryVoices = Object.freeze({ start });
}());
