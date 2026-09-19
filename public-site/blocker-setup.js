(function () {
  "use strict";

  const PUBLIC_DEMO_ONLY = window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true;
  const SESSION_DEMO_ACTIVE = (() => {
    try {
      return window.sessionStorage?.getItem("kiddosprout.demo.v1.active") === "1";
    } catch (error) {
      return false;
    }
  })();
  const READ_ONLY_DEMO = PUBLIC_DEMO_ONLY || SESSION_DEMO_ACTIVE;
  const form = document.getElementById("blocker-download-form");
  const pinInput = document.getElementById("blocker-pin");
  const confirmInput = document.getElementById("blocker-pin-confirm");
  const confirmField = document.getElementById("confirm-pin-field");
  const enrollmentFields = document.getElementById("blocker-enrollment-fields");
  const accountPasswordInput = document.getElementById("blocker-account-password");
  const humanCheck = document.getElementById("blocker-human-check");
  const humanCheckStatus = document.getElementById("blocker-human-check-status");
  const status = document.getElementById("blocker-download-status");
  const retryButton = document.getElementById("retry-blocker-check");
  const downloadButton = document.getElementById("download-blocker");
  const downloadPlatformIcon = document.getElementById("download-platform-icon");
  const downloadPlatformLabel = document.getElementById("download-platform-label");
  const platformButtons = Array.from(document.querySelectorAll("[data-blocker-platform]"));
  const architectureField = document.getElementById("windows-architecture-field");
  const architectureSelect = document.getElementById("windows-architecture");
  const setupPanels = Array.from(document.querySelectorAll("[data-setup-platform]"));
  const viewButton = document.getElementById("view-blocker-pin");
  const intro = document.getElementById("download-intro");
  const buildLabel = document.getElementById("blocker-build-label");
  const downloadTitle = document.getElementById("download-title");
  const previewNote = document.getElementById("blocker-preview-note");
  const protectedResourceLinks = Array.from(document.querySelectorAll("[data-live-blocker-resource]"));
  let pinConfigured = false;
  let downloadFilename = "KiddoSproutBlocker-macOS.zip";
  let selectedPlatform = /Windows/i.test(navigator.userAgent || "") ? "windows" : "mac";
  let setupGeneration = 0;
  let readyArtifact = "";
  let downloadInProgress = false;
  let humanCheckController = null;
  let humanCheckStarting = false;
  let humanCheckGeneration = 0;
  let captchaToken = "";
  const FETCH_TIMEOUT_MS = 15000;

  function selectedArtifact() {
    if (selectedPlatform !== "windows") return "mac";
    return architectureSelect.value === "windows-arm64" ? "windows-arm64" : "windows";
  }

  function selectedPlatformCopy() {
    const artifact = selectedArtifact();
    if (artifact === "windows-arm64") {
      return { family: "windows", name: "Windows ARM64", icon: "⊞" };
    }
    if (artifact === "windows") {
      return { family: "windows", name: "Windows x64", icon: "⊞" };
    }
    return { family: "mac", name: "Mac", icon: "" };
  }

  function defaultFilenameForArtifact(artifactId) {
    if (artifactId === "windows-arm64") return "KiddoSproutBlocker-Windows-arm64.zip";
    if (artifactId === "windows") return "KiddoSproutBlocker-Windows-x64.zip";
    return "KiddoSproutBlocker-macOS.zip";
  }

  function renderPlatformChoice() {
    const copy = selectedPlatformCopy();
    platformButtons.forEach((button) => {
      const selected = button.dataset.blockerPlatform === selectedPlatform;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    architectureField.hidden = selectedPlatform !== "windows";
    setupPanels.forEach((panel) => {
      panel.hidden = panel.dataset.setupPlatform !== copy.family;
    });
    downloadPlatformIcon.textContent = READ_ONLY_DEMO ? "🔒" : copy.icon;
    downloadPlatformLabel.textContent = READ_ONLY_DEMO
      ? `${copy.name} download unavailable in preview`
      : `Download for ${copy.name}`;
  }

  function setStatus(message, type = "") {
    const error = type === "error";
    status.setAttribute("role", error ? "alert" : "status");
    status.setAttribute("aria-live", error ? "assertive" : "polite");
    status.className = `download-status${type ? ` ${type}` : ""}`;
    status.textContent = message;
  }

  function setRetryState(visible, busy = false) {
    retryButton.hidden = READ_ONLY_DEMO || !visible;
    retryButton.disabled = busy;
    retryButton.setAttribute("aria-busy", String(busy));
    retryButton.textContent = busy ? "Checking download…" : "Check download again";
  }

  function setInputInvalid(input, invalid) {
    input.setAttribute("aria-invalid", String(Boolean(invalid)));
  }

  function setConfirmPINRequired(required) {
    const focusWouldBeHidden = !required && confirmField.contains(document.activeElement);
    if (focusWouldBeHidden) pinInput.focus({ preventScroll: true });
    confirmField.hidden = !required;
    confirmInput.required = required;
  }

  function disposeHumanCheck() {
    humanCheckGeneration += 1;
    humanCheckStarting = false;
    captchaToken = "";
    humanCheckController?.remove?.();
    humanCheckController = null;
    humanCheck.replaceChildren();
    humanCheckStatus.hidden = false;
    humanCheckStatus.textContent = "The safety check will appear here.";
    humanCheckStatus.dataset.state = "notice";
    humanCheckStatus.setAttribute("role", "status");
    humanCheckStatus.setAttribute("aria-live", "polite");
  }

  async function mountHumanCheck() {
    if (enrollmentFields.hidden || humanCheckStarting || humanCheckController) return;
    disposeHumanCheck();
    const generation = humanCheckGeneration;
    humanCheckStarting = true;
    humanCheckStatus.textContent = "Starting the safety check…";
    const helper = window.KiddoSproutHumanCheck;
    if (!helper?.render) {
      humanCheckStarting = false;
      humanCheckStatus.textContent = "The safety check could not start. Refresh the page and try again.";
      humanCheckStatus.dataset.state = "error";
      return;
    }
    try {
      const controller = await helper.render(humanCheck, {
        statusElement: humanCheckStatus,
        widgetOptions: {
          action: "kiddosprout_blocker_pin",
          appearance: "always",
          language: "auto",
          retry: "never",
          "refresh-expired": "never",
          "refresh-timeout": "never",
          size: "flexible",
          theme: document.documentElement.classList.contains("theme-night") ? "dark" : "light"
        },
        onToken(token) {
          if (generation !== humanCheckGeneration) return;
          captchaToken = String(token || "");
          humanCheckStatus.hidden = false;
          humanCheckStatus.textContent = "Safety check complete.";
          humanCheckStatus.dataset.state = "success";
        },
        onExpired() {
          if (generation === humanCheckGeneration) captchaToken = "";
        },
        onError() {
          if (generation === humanCheckGeneration) captchaToken = "";
        },
        onTimeout() {
          if (generation === humanCheckGeneration) captchaToken = "";
        },
        onUnsupported() {
          if (generation === humanCheckGeneration) captchaToken = "";
        }
      });
      if (generation !== humanCheckGeneration || enrollmentFields.hidden) {
        controller.remove();
        return;
      }
      humanCheckController = controller;
    } catch (error) {
      if (generation !== humanCheckGeneration) return;
      humanCheckStatus.hidden = false;
      humanCheckStatus.textContent = "The safety check could not start. Refresh the page and try again.";
      humanCheckStatus.dataset.state = "error";
    } finally {
      if (generation === humanCheckGeneration) humanCheckStarting = false;
    }
  }

  function setEnrollmentRequired(required) {
    setConfirmPINRequired(required);
    enrollmentFields.hidden = !required;
    accountPasswordInput.required = required;
    if (!required) {
      accountPasswordInput.value = "";
      accountPasswordInput.removeAttribute("aria-invalid");
      disposeHumanCheck();
      return;
    }
    void mountHumanCheck();
  }

  function normalizePINSpacing(value) {
    return String(value || "").replace(/\s/g, "");
  }

  function friendlyServiceError(error, fallback) {
    if (["AbortError", "TimeoutError"].includes(error?.name)) {
      return "The download service took too long to answer. Check your connection and try again.";
    }
    if (window.KiddoSproutSession?.isTemporaryError?.(error)) {
      return "The account service is temporarily unavailable. Your saved sign-in is safe; reconnect and try again.";
    }
    if (error instanceof TypeError || error?.name === "TypeError") {
      return "The download service is offline. Start KiddoSprout, then use Check download again.";
    }
    return error?.message || fallback;
  }

  function bindPlatformChoices(onChange) {
    platformButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (downloadInProgress) return;
        selectedPlatform = button.dataset.blockerPlatform === "windows" ? "windows" : "mac";
        onChange();
      });
    });
    architectureSelect.addEventListener("change", () => {
      if (!downloadInProgress) onChange();
    });
  }

  function enableLiveResourceLinks() {
    protectedResourceLinks.forEach((link) => {
      link.setAttribute("href", "/api/blocker/checksums");
      link.setAttribute("download", "");
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
      link.textContent = "Download public SHA-256 checksums";
    });
  }

  function initializePublicPreview() {
    document.body.classList.add("public-blocker-preview");
    document.title = "Game Blocker Setup Preview | KiddoSprout";
    buildLabel.textContent = "Demo · Setup preview";
    downloadTitle.textContent = "Preview Mac or Windows setup";
    intro.textContent = "Choose a computer to preview its setup guide. This page cannot request a PIN or download an installer.";
    previewNote.hidden = false;
    form.setAttribute("aria-disabled", "true");
    pinInput.disabled = true;
    pinInput.required = false;
    confirmInput.disabled = true;
    confirmInput.required = false;
    accountPasswordInput.disabled = true;
    accountPasswordInput.required = false;
    viewButton.disabled = true;
    downloadButton.disabled = true;
    setRetryState(false);
    setStatus("Real downloads stay protected behind a verified parent account.", "preview");
    protectedResourceLinks.forEach((link) => {
      link.removeAttribute("href");
      link.removeAttribute("download");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
      link.textContent = "public checksums are available on the live setup page";
    });
    form.addEventListener("submit", (event) => event.preventDefault());
    bindPlatformChoices(renderPlatformChoice);
    renderPlatformChoice();
  }

  if (READ_ONLY_DEMO) {
    initializePublicPreview();
    return;
  }

  enableLiveResourceLinks();

  async function accessToken() {
    return window.KiddoSproutSession?.getAccessToken?.() || "";
  }

  function safeDownloadFilename(value, fallback) {
    const filename = String(value || "").trim().split(/[\\/]/).pop() || "";
    return filename.length <= 180 && /^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/i.test(filename)
      ? filename
      : fallback;
  }

  function filenameFromResponse(response, fallback = downloadFilename) {
    const disposition = String(response.headers.get("content-disposition") || "");
    const encodedMatch = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
    const regularMatch = disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
    let candidate = encodedMatch?.[1] || regularMatch?.[1] || regularMatch?.[2] || "";
    candidate = candidate.trim().replace(/^"|"$/g, "");
    if (encodedMatch) {
      try {
        candidate = decodeURIComponent(candidate);
      } catch (error) {
        candidate = "";
      }
    }
    return safeDownloadFilename(candidate, fallback);
  }

  function isZipResponse(response) {
    const contentType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    return ["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(contentType);
  }

  function fetchOptions(options = {}) {
    if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") return options;
    return { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) };
  }

  async function hasZipSignature(blob) {
    if (!blob || blob.size < 4 || typeof blob.slice !== "function") return false;
    const bytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    return bytes[0] === 0x50 && bytes[1] === 0x4b && (
      (bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08)
    );
  }

  function responseSHA256(response) {
    const value = String(response.headers.get("x-kiddosprout-sha256") || "").trim().toLowerCase();
    return /^[a-f0-9]{64}$/.test(value) ? value : "";
  }

  async function blobSHA256(blob) {
    if (!window.crypto?.subtle || typeof blob?.arrayBuffer !== "function") {
      throw new Error("This browser cannot verify the download. Update the browser, then try again.");
    }
    let digest;
    try {
      digest = await window.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    } catch (error) {
      throw new Error("The download integrity check could not finish. Try the download again.");
    }
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function setPlatformControlsDisabled(disabled) {
    platformButtons.forEach((button) => { button.disabled = disabled; });
    architectureSelect.disabled = disabled;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function checkSetup(options = {}) {
    const generation = ++setupGeneration;
    const artifactId = selectedArtifact();
    const copy = selectedPlatformCopy();
    const restoreFocus = options.restoreFocus === true;
    readyArtifact = "";
    renderPlatformChoice();
    downloadButton.disabled = true;
    setRetryState(restoreFocus, restoreFocus);
    setStatus(`Checking the ${copy.name} download…`);
    try {
      const token = await accessToken();
      if (generation !== setupGeneration) return;
      if (!token) {
        setStatus("Your parent login has expired. Log in again first.", "error");
        downloadButton.disabled = true;
        setRetryState(true);
        return;
      }
      const response = await fetch(`/api/blocker/status?platform=${encodeURIComponent(artifactId)}`, fetchOptions({
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      }));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The protected download could not be checked.");
      if (typeof payload.pinConfigured !== "boolean" || typeof payload.artifact?.ready !== "boolean") {
        throw new Error("The download service returned an unexpected status. Check the download again.");
      }
      if (generation !== setupGeneration) return;
      pinConfigured = Boolean(payload.pinConfigured);
      downloadFilename = safeDownloadFilename(payload.filename, defaultFilenameForArtifact(artifactId));
      setEnrollmentRequired(!pinConfigured);
      const platformLabel = [payload.platform, payload.architecture].filter(Boolean).join(" ");
      buildLabel.textContent = payload.version
        ? `Protected download · ${platformLabel} · Version ${payload.version}`
        : `Protected download · ${copy.name}`;
      intro.textContent = pinConfigured
        ? "Enter the Blocker PIN you created for an earlier download. It works for either computer pack and is separate from the dashboard passcode."
        : `Create a Blocker PIN for this download, then enter the same numbers when the ${copy.name} app opens.`;
      const artifactReady = payload.artifact?.ready === true;
      readyArtifact = artifactReady ? artifactId : "";
      downloadButton.disabled = !artifactReady;
      setRetryState(!artifactReady);
      setStatus(artifactReady
        ? (pinConfigured ? `The protected ${copy.name} download is ready.` : "Create your Blocker PIN to unlock the first download.")
        : `The ${copy.name} build is still being prepared.`, artifactReady ? "success" : "");
    } catch (error) {
      if (generation !== setupGeneration) return;
      setStatus(friendlyServiceError(error, "The protected download is unavailable."), "error");
      downloadButton.disabled = true;
      setRetryState(true);
    } finally {
      if (restoreFocus && generation === setupGeneration) {
        window.requestAnimationFrame(() => {
          (retryButton.hidden ? pinInput : retryButton).focus({ preventScroll: true });
        });
      }
    }
  }

  bindPlatformChoices(checkSetup);

  retryButton.addEventListener("click", () => {
    if (downloadInProgress || retryButton.disabled) return;
    checkSetup({ restoreFocus: true });
  });

  viewButton.addEventListener("click", () => {
    const showing = pinInput.type === "text";
    pinInput.type = showing ? "password" : "text";
    confirmInput.type = showing ? "password" : "text";
    viewButton.textContent = showing ? "Show" : "Hide";
    viewButton.setAttribute("aria-pressed", String(!showing));
    pinInput.focus();
  });

  [pinInput, confirmInput].forEach((input) => {
    input.addEventListener("input", () => {
      // Spaces are harmless when a PIN is typed or pasted. Keep every other
      // non-digit visible so validation can reject it instead of silently
      // changing, for example, 24a68 into a different valid PIN.
      input.value = normalizePINSpacing(input.value);
      setInputInvalid(input, false);
    });
  });

  accountPasswordInput.addEventListener("input", () => {
    accountPasswordInput.removeAttribute("aria-invalid");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (downloadInProgress) return;
    const artifactId = selectedArtifact();
    const copy = selectedPlatformCopy();
    if (readyArtifact !== artifactId) {
      downloadButton.disabled = true;
      setStatus(`Wait until the ${copy.name} download finishes checking.`, "error");
      return;
    }
    const pin = normalizePINSpacing(pinInput.value);
    const confirmPin = normalizePINSpacing(confirmInput.value);
    pinInput.value = pin;
    confirmInput.value = confirmPin;
    if (!/^\d{4,8}$/.test(pin)) {
      setInputInvalid(pinInput, true);
      setStatus("Use 4–8 digits for the parent PIN.", "error");
      pinInput.focus();
      return;
    }
    if (!pinConfigured && pin !== confirmPin) {
      setInputInvalid(confirmInput, true);
      setStatus("The two PINs do not match.", "error");
      confirmInput.focus();
      return;
    }
    const accountPassword = accountPasswordInput.value;
    if (!pinConfigured && !accountPassword) {
      accountPasswordInput.setAttribute("aria-invalid", "true");
      setStatus("Enter the parent account password.", "error");
      accountPasswordInput.focus();
      return;
    }
    const currentCaptchaToken = pinConfigured
      ? ""
      : (captchaToken || humanCheckController?.getToken?.() || "");
    if (!pinConfigured && !currentCaptchaToken) {
      setStatus("Complete the safety check first.", "error");
      humanCheckStatus.hidden = false;
      humanCheckStatus.textContent = "Confirm you are human before continuing.";
      humanCheckStatus.dataset.state = "error";
      humanCheck.scrollIntoView({ block: "nearest" });
      return;
    }
    setInputInvalid(pinInput, false);
    setInputInvalid(confirmInput, false);
    accountPasswordInput.removeAttribute("aria-invalid");
    const enrollmentAttempt = !pinConfigured;
    downloadInProgress = true;
    setupGeneration += 1;
    downloadButton.disabled = true;
    setPlatformControlsDisabled(true);
    form.setAttribute("aria-busy", "true");
    downloadPlatformIcon.textContent = "⌛";
    downloadPlatformLabel.textContent = `Preparing ${copy.name} download…`;
    setStatus(enrollmentAttempt ? "Verifying the parent account…" : "Checking the parent PIN…");
    try {
      const token = await accessToken();
      if (!token) {
        readyArtifact = "";
        setStatus("Your parent login has expired. Log in again first.", "error");
        return;
      }
      const requestBody = JSON.stringify({
        pin,
        confirmPin: pinConfigured ? pin : confirmPin,
        ...(enrollmentAttempt ? { accountPassword, captchaToken: currentCaptchaToken } : {})
      });
      if (enrollmentAttempt) accountPasswordInput.value = "";
      const response = await fetch(`/api/blocker/download/${artifactId}`, fetchOptions({
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: requestBody,
        cache: "no-store"
      }));
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if ([401, 404, 503].includes(response.status)) readyArtifact = "";
        if (payload.code === "incorrect_pin") setInputInvalid(pinInput, true);
        if (payload.code === "reauthentication_failed") accountPasswordInput.setAttribute("aria-invalid", "true");
        const requestError = new Error(payload.error || "The download could not start.");
        requestError.code = String(payload.code || "");
        throw requestError;
      }
      if (!isZipResponse(response)) {
        throw new Error("The download service returned an unexpected file. Refresh the page and try again.");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error(`The ${copy.name} download was empty.`);
      if (!(await hasZipSignature(blob))) {
        throw new Error("The download service returned a file that was not a valid ZIP. Refresh the page and try again.");
      }
      const expectedSHA256 = responseSHA256(response);
      if (!expectedSHA256) {
        throw new Error("The download service did not provide a valid integrity check. Refresh the page and try again.");
      }
      if ((await blobSHA256(blob)) !== expectedSHA256) {
        throw new Error("The download failed its integrity check and was not saved. Try the download again.");
      }
      const filename = filenameFromResponse(response, defaultFilenameForArtifact(artifactId));
      triggerDownload(blob, filename);
      pinConfigured = true;
      setEnrollmentRequired(false);
      setStatus(`Downloaded ${filename}. Open START HERE and install the included Chrome or Edge website blocker.`, "success");
    } catch (error) {
      if (enrollmentAttempt && !pinConfigured) {
        disposeHumanCheck();
        void mountHumanCheck();
      }
      if (!readyArtifact) setRetryState(true);
      setStatus(friendlyServiceError(error, "The protected download could not start."), "error");
    } finally {
      downloadInProgress = false;
      setPlatformControlsDisabled(false);
      form.setAttribute("aria-busy", "false");
      renderPlatformChoice();
      downloadButton.disabled = readyArtifact !== selectedArtifact();
    }
  });

  renderPlatformChoice();
  checkSetup();
}());
