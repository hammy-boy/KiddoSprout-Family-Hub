    const navButtons = document.querySelectorAll("[data-jump]");
    const tabButtons = document.querySelectorAll("[data-filter]");
    const hubCards = document.querySelectorAll(".hub-card");
    const toast = document.querySelector("#toast");
    const burstLayer = document.querySelector("#burstLayer");
    const appModal = document.querySelector("#appModal");
    const appTitle = document.querySelector("#appTitle");
    const appSubtitle = document.querySelector("#appSubtitle");
    const appBody = document.querySelector("#appBody");
    const parentGate = document.querySelector("#parentGate");
    const lockBox = document.querySelector(".lock-box");
    const passcodeInput = document.querySelector("#passcodeInput");
    const viewPassword = document.querySelector("#viewPassword");
    const passcodeSetting = document.querySelector("#passcodeSetting");
    const viewSettingPassword = document.querySelector("#viewSettingPassword");
    const passcodeSettingStatus = document.querySelector("#passcodeSettingStatus");
    const themeModeSetting = document.querySelector("#themeModeSetting");
    const themeModeStatus = document.querySelector("#themeModeStatus");
    const secondParentNameSetting = document.querySelector("#secondParentNameSetting");
    const secondParentEmailSetting = document.querySelector("#secondParentEmailSetting");
    const settingsToggle = document.querySelector("#settingsToggle");
    const settingsMenu = document.querySelector("#settingsMenu");
    const settingsClose = document.querySelector("#settingsClose");
    const quickThemeModeSetting = document.querySelector("#quickThemeModeSetting");
    const quickParentSettings = document.querySelector("#quickParentSettings");
    const loginEmail = document.querySelector("#loginEmail");
    const loginPassword = document.querySelector("#loginPassword");
    const viewLoginPassword = document.querySelector("#viewLoginPassword");
    const loginStatus = document.querySelector("#loginStatus");
    const loginSupabaseStatus = document.querySelector("#loginSupabaseStatus");
    const signupFamily = document.querySelector("#signupFamily");
    const signupParent = document.querySelector("#signupParent");
    const signupEmail = document.querySelector("#signupEmail");
    const signupParentTwo = document.querySelector("#signupParentTwo");
    const signupEmailTwo = document.querySelector("#signupEmailTwo");
    const signupPasscode = document.querySelector("#signupPasscode");
    const viewSignupPassword = document.querySelector("#viewSignupPassword");
    const signupStatus = document.querySelector("#signupStatus");
    const downloadSignupButton = document.querySelector("#downloadSignup");
    const resendLoginEmailButton = document.querySelector("#resendLoginEmail");
    const resendSignupEmailButton = document.querySelector("#resendSignupEmail");
    const forgotPanel = document.querySelector("#forgotPanel");
    const recoveryEmail = document.querySelector("#recoveryEmail");
    const recoveryCode = document.querySelector("#recoveryCode");
    const recoveryPasscode = document.querySelector("#recoveryPasscode");
    const viewRecoveryPassword = document.querySelector("#viewRecoveryPassword");
    const rulesInput = document.querySelector("#rulesInput");
    const choresInput = document.querySelector("#choresInput");
    const focusInput = document.querySelector("#focusInput");
    const newChildName = document.querySelector("#newChildName");
    const newChildDob = document.querySelector("#newChildDob");
    const newChildDevice = document.querySelector("#newChildDevice");
    const newChildAvatarIcon = document.querySelector("#newChildAvatarIcon");
    const newChildAvatarColor = document.querySelector("#newChildAvatarColor");
    const newChildSchoolYear = document.querySelector("#newChildSchoolYear");
    const newChildEmergencyContact = document.querySelector("#newChildEmergencyContact");
    const newChildCareNote = document.querySelector("#newChildCareNote");
    const newChildWarning = document.querySelector("#newChildWarning");
    const removeChildButton = document.querySelector("#removeChild");
    const removeChildStatus = document.querySelector("#removeChildStatus");
    const editChildName = document.querySelector("#editChildName");
    const editChildDob = document.querySelector("#editChildDob");
    const editChildDevice = document.querySelector("#editChildDevice");
    const editChildAvatarIcon = document.querySelector("#editChildAvatarIcon");
    const editChildAvatarColor = document.querySelector("#editChildAvatarColor");
    const editChildSchoolYear = document.querySelector("#editChildSchoolYear");
    const editChildEmergencyContact = document.querySelector("#editChildEmergencyContact");
    const editChildCareNote = document.querySelector("#editChildCareNote");
    const editChildWarning = document.querySelector("#editChildWarning");
    const kidAvatarIcon = document.querySelector("#kidAvatarIcon");
    const kidAvatarColor = document.querySelector("#kidAvatarColor");
    const kidAvatarColorText = document.querySelector("#kidAvatarColorText");
    const kidCostume = document.querySelector("#kidCostume");
    const kidAvatarPreview = document.querySelector("#kidAvatarPreview");
    const kidAvatarName = document.querySelector("#kidAvatarName");
    const kidCostumePreview = document.querySelector("#kidCostumePreview");
    const avatarChoiceButtons = document.querySelectorAll("[data-avatar-choice]");
    const flyerAllowedToggle = document.querySelector("#flyerAllowedToggle");
    const flyerAllowedLabel = document.querySelector("#flyerAllowedLabel");
    const parentHomeworkToggle = document.querySelector("#parentHomeworkToggle");
    const parentHomeworkLabel = document.querySelector("#parentHomeworkLabel");
    const passcodeStatus = document.querySelector("#passcodeStatus");
    const unlockParentButton = document.querySelector("#unlockParent");
    const downloadKiddoSproutButton = document.querySelector("#downloadKiddoSprout");
    const SUPABASE_CONFIG = window.KIDDO_SPROUT_SUPABASE || {};
    const KIDDO_AUTH_SESSION_KEY = "kiddosproutSupabaseSession";
    const FLAVORNEST_AUTH_SESSION_KEY = "flavornest_session";
    const DEFAULT_SUPABASE_URL = "";
    const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "";
    function cleanSupabaseUrl(value) {
      const url = String(value || "").trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return "";
      if (url.includes("your_supabase")) return "";
      return url;
    }
    function cleanSupabaseKey(value) {
      const key = String(value || "").trim();
      if (!key || key.includes("your_supabase")) return "";
      return key;
    }
    const SUPABASE_URL = cleanSupabaseUrl(SUPABASE_CONFIG.url) || DEFAULT_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = cleanSupabaseKey(SUPABASE_CONFIG.publishableKey || SUPABASE_CONFIG.anonKey) || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
    const SUPABASE_CONNECTED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
    const RESEND_EMAIL_COOLDOWN_SECONDS = 30;
    let resendEmailCooldown = 0;
    let resendEmailCooldownTimer = null;
    let kiddoInstallPrompt = null;
    const reportColors = {
      Explorer: "#147d7f",
      Stories: "#8c5aa8",
      Movement: "#df604a",
      Games: "#f1b43f"
    };
    const requestNames = [
      ["Galaxy Game", "G", "Game app"],
      ["Clip Studio", "C", "Video app"],
      ["Puzzle Arcade", "P", "Game app"],
      ["Stream Box", "S", "Video app"],
      ["Sketch Pad", "S", "Creative app"]
    ];
    const APP_CATALOG = {
      studio: { title: "Creator Studio", initial: "C", kind: "Create", defaultRule: "request" },
      explore: { title: "Explorer Lab", initial: "E", kind: "Learning", defaultRule: "allowed" },
      move: { title: "Move Breaks", initial: "M", kind: "Movement", defaultRule: "allowed" },
      story: { title: "Story Theater", initial: "S", kind: "Original books", defaultRule: "allowed" },
      recipe: { title: "FlavorNest", initial: "F", kind: "Recipe app", defaultRule: "allowed" },
      spending: { title: "Smart Spending", initial: "$", kind: "Money app", defaultRule: "allowed" },
      flyer: { title: "Sprout Flyer", initial: "F", kind: "Game", defaultRule: "request" },
      gameSites: {
        title: "Game Websites",
        initial: "G",
        kind: "External game websites",
        defaultRule: "blocked",
        domains: [
          "crazygames.com",
          "poki.com",
          "coolmathgames.com",
          "miniclip.com",
          "friv.com",
          "kongregate.com",
          "addictinggames.com",
          "y8.com",
          "now.gg",
          "itch.io",
          "steamcommunity.com",
          "steampowered.com",
          "epicgames.com",
          "xbox.com",
          "playstation.com",
          "nintendo.com",
          "minecraft.net",
          "fortnite.com"
        ],
        keywordMatch: true
      },
      roblox: { title: "Roblox", initial: "R", kind: "External game site", defaultRule: "blocked", domains: ["roblox.com", "web.roblox.com"] }
    };
    const todayTasks = [
      { id: "chore", title: "Chore Check", detail: "Finish one helpful task and mark it done.", report: "Stories", minutes: 5 },
      { id: "explore", title: "Nature Quest", detail: "Open Explorer Lab and finish one fact card.", report: "Explorer", minutes: 8 },
      { id: "move", title: "Move Reset", detail: "Complete one movement break before games.", report: "Movement", minutes: 5 },
      { id: "story", title: "Original Book", detail: "Read one Story Theater page before bedtime.", report: "Stories", minutes: 10 }
    ];
    const dailyGoalItems = [
      { id: "learn", title: "Learn", detail: "Open a learning hub", report: "Explorer", minutes: 5 },
      { id: "move", title: "Move", detail: "Take one active break", report: "Movement", minutes: 5 },
      { id: "read", title: "Read", detail: "Log reading time", report: "Stories", minutes: 5 },
      { id: "kind", title: "Kind", detail: "Finish a kindness quest", report: "Stories", minutes: 2 },
      { id: "safe", title: "Safe", detail: "Review a family rule", report: "Explorer", minutes: 2 }
    ];
    const kindnessPrompts = [
      "Say one kind thing to someone at home.",
      "Help tidy one shared space for two minutes.",
      "Ask someone how their day is going and listen.",
      "Draw or write a thank-you note.",
      "Let someone else choose the next family activity.",
      "Teach someone one fun fact you learned today.",
      "Put away one thing without being asked.",
      "Use calm words to solve a tiny problem."
    ];
    const sparkPrompts = [
      {
        title: "Explorer burst",
        text: "Open Explorer Lab, learn one fact, then tell someone at home what surprised you."
      },
      {
        title: "Mini maker moment",
        text: "Use Creator Studio to plan a safe 20-second clip about something you know well."
      },
      {
        title: "Move and reset",
        text: "Take a short movement break, breathe slowly, then come back ready for your next task."
      },
      {
        title: "Story spotlight",
        text: "Read one Story Theater page using a different voice for each character."
      },
      {
        title: "Kindness signal",
        text: "Do one helpful thing quietly, then mark a daily win when you finish."
      },
      {
        title: "Future app slot",
        text: "Your final Smart Spending app has a place ready when you bring it in."
      }
    ];
    const DEFAULT_STATE = {
      "activeChild": "",
      "familyName": "KiddoSprout Family",
      "parentName": "Parent",
      "parentEmail": "",
      "secondParentName": "",
      "secondParentEmail": "",
      "parentPasscode": "4321",
      "parentAccountCreated": false,
      "themeMode": "auto",
      "wellbeingGoals": {
            "water": 4,
            "eyeBreaks": 3
      },
      "schedule": {
            "schoolStart": "08:45",
            "schoolEnd": "15:15",
            "bedtimeStart": "20:30",
            "bedtimeEnd": "07:00"
      },
      "parentNote": "",
      "safetyAlerts": [],
      "moodCheckins": [],
      "problemReports": [],
      "scanHistory": [],
      "trustedContacts": [
            "Parent or guardian",
            "Teacher",
            "School office"
      ],
      "familyRules": [
            "Ask before downloading a new app.",
            "Use kind words in chats and comments.",
            "Take a movement break after long screen time."
      ],
      "chores": [
            { "title": "Tidy desk" },
            { "title": "Read 10 minutes" },
            { "title": "Pack school bag" }
      ],
      "focusGoal": "Read or learn for 15 minutes",
      "children": {}
};

    let state = null;
    let requestIndex = 0;
    let saveTimer = null;
    let moveTimer = null;
    let moveSeconds = 30;
    let focusTimer = null;
    let focusSeconds = 900;
    let closeTimer = null;
    let flyerAnimation = null;
    let flyerGame = null;
    let viewMode = (window.location.hash || "#login").slice(1);
    if (!["child", "parent", "signup", "login"].includes(viewMode)) {
      viewMode = "login";
    }
    let parentUnlocked = window.sessionStorage.getItem("parentUnlocked") === "true";
    let failedPasscodeAttempts = Number(window.sessionStorage.getItem("failedPasscodeAttempts") || "0");
    let lockoutUntil = Number(window.sessionStorage.getItem("lockoutUntil") || "0");
    let lockoutTimer = null;
    let recoveryCodeRequested = false;
    let pendingRemoveChildId = "";

    function currentChild() {
      state.children ??= {};
      if (!Object.keys(state.children).length) {
        state.activeChild = "";
        return null;
      }
      if (!state.children[state.activeChild]) {
        state.activeChild = Object.keys(state.children)[0];
      }
      const child = state.children[state.activeChild];
      ensureChildAppState(child);
      return child;
    }

    function hasChildProfiles() {
      return Boolean(state.children && Object.keys(state.children).length);
    }

    function removeDemoChildren(savedState) {
      savedState.children ??= {};
      const demoProfiles = {
        ava: "Ava",
        noah: "Noah",
        mia: "Mia"
      };
      Object.entries(demoProfiles).forEach(([id, name]) => {
        const child = savedState.children[id];
        if (child && child.name === name && !child.dateOfBirth && !child.schoolYear && !child.emergencyContact) {
          delete savedState.children[id];
        }
      });
      if (!savedState.children[savedState.activeChild]) {
        savedState.activeChild = Object.keys(savedState.children)[0] || "";
      }
    }

    function currentParentPasscode() {
      return state.parentPasscode || "4321";
    }

    function hasParentAccount() {
      return Boolean(state.parentAccountCreated || (state.parentEmail && state.parentName));
    }

    function getKiddoSession() {
      try {
        return JSON.parse(window.localStorage.getItem(KIDDO_AUTH_SESSION_KEY) || window.localStorage.getItem(FLAVORNEST_AUTH_SESSION_KEY) || "null");
      } catch (error) {
        return null;
      }
    }

    function hasKiddoSession() {
      const session = getKiddoSession();
      return Boolean(session && session.access_token && session.user && session.user.email);
    }

    function saveKiddoSession(session) {
      if (!session || !session.access_token) return;
      window.localStorage.setItem(KIDDO_AUTH_SESSION_KEY, JSON.stringify(session));
      window.localStorage.setItem(FLAVORNEST_AUTH_SESSION_KEY, JSON.stringify(session));
    }

    function clearKiddoSession() {
      window.localStorage.removeItem(KIDDO_AUTH_SESSION_KEY);
      window.localStorage.removeItem(FLAVORNEST_AUTH_SESSION_KEY);
      window.sessionStorage.removeItem("parentUnlocked");
      parentUnlocked = false;
    }

    async function kiddoAuthRequest(path, body) {
      if (!SUPABASE_CONNECTED) {
        throw new Error("Supabase is not connected. Check your Supabase URL and publishable key.");
      }
      const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };
      if (!response.ok) {
        throw new Error(data.error_description || data.msg || data.error || "Something went wrong");
      }
      return data;
    }

    function kiddoAuthRedirectUrl() {
      return window.location.origin + window.location.pathname;
    }

    function kiddoSignUpRequest(email, password) {
      return kiddoAuthRequest("signup", {
        email,
        password,
        options: { email_redirect_to: kiddoAuthRedirectUrl() }
      });
    }

    function kiddoSignInRequest(email, password) {
      return kiddoAuthRequest("token?grant_type=password", { email, password });
    }

    function kiddoResendSignupEmail(email) {
      return kiddoAuthRequest("resend", {
        type: "signup",
        email,
        options: { email_redirect_to: kiddoAuthRedirectUrl() }
      });
    }

    function updateResendEmailButtons() {
      const label = resendEmailCooldown > 0 ? `Resend in ${resendEmailCooldown}s` : "Resend Email";
      [resendLoginEmailButton, resendSignupEmailButton].forEach((button) => {
        if (!button) return;
        button.textContent = label;
        button.disabled = resendEmailCooldown > 0;
      });
    }

    function startResendEmailCooldown() {
      resendEmailCooldown = RESEND_EMAIL_COOLDOWN_SECONDS;
      updateResendEmailButtons();
      window.clearInterval(resendEmailCooldownTimer);
      resendEmailCooldownTimer = window.setInterval(() => {
        resendEmailCooldown -= 1;
        if (resendEmailCooldown <= 0) {
          resendEmailCooldown = 0;
          window.clearInterval(resendEmailCooldownTimer);
          resendEmailCooldownTimer = null;
        }
        updateResendEmailButtons();
      }, 1000);
    }

    function friendlySupabaseError(error) {
      const message = String(error?.message || error || "");
      if (message.toLowerCase().includes("<!doctype") || message.toLowerCase().includes("not valid json")) {
        return "Supabase is not connected. Check your Supabase URL and publishable key.";
      }
      return message || "Supabase login failed.";
    }

    function normalizeAppRules(child) {
      child.appRules ??= {};
      Object.entries(APP_CATALOG).forEach(([id, app]) => {
        child.appRules[id] ??= app.defaultRule;
      });
      child.appRules.spending = "allowed";
      if (child.flyerAllowed === true) {
        child.appRules.flyer = "allowed";
      }
      if (child.flyerAllowed === false && !child.appRules.flyer) {
        child.appRules.flyer = "request";
      }
      child.flyerAllowed = child.appRules.flyer === "allowed";
    }

    function getAppRule(child, appId) {
      normalizeAppRules(child);
      return child.appRules[appId] || APP_CATALOG[appId]?.defaultRule || "request";
    }

    function setAppRule(child, appId, rule) {
      normalizeAppRules(child);
      child.appRules[appId] = ["allowed", "request", "blocked"].includes(rule) ? rule : "request";
      if (appId === "flyer") {
        child.flyerAllowed = child.appRules.flyer === "allowed";
      }
    }

    function appRuleLabel(rule) {
      if (rule === "allowed") return "Allowed";
      if (rule === "blocked") return "Blocked";
      return "Ask parent";
    }

    function requestAppAccess(child, appId) {
      const app = APP_CATALOG[appId] || { title: "App", initial: "A", kind: "App" };
      child.currentRequest = [
        app.title,
        `${child.name} wants to open ${app.title} (${app.kind}).`,
        app.initial,
        "appAccess",
        appId
      ];
      child.pending += 1;
      render();
      queueSave();
      showToast(app.title + " request sent to parent dashboard.");
    }

    function extensionBlockRules() {
      const child = currentChild();
      if (!child) {
        return [];
      }
      ensureChildAppState(child);
      return Object.entries(APP_CATALOG)
        .filter(([, app]) => Array.isArray(app.domains) && app.domains.length)
        .map(([id, app]) => ({
          id,
          title: app.title,
          rule: getAppRule(child, id),
          domains: app.domains,
          keywordMatch: Boolean(app.keywordMatch)
        }));
    }

    function broadcastExtensionBlockRules() {
      const child = currentChild();
      window.postMessage({
        source: "kiddosprout",
        type: "blockRules",
        child: child ? child.name : "",
        rules: extensionBlockRules()
      }, window.location.origin);
    }

    window.addEventListener("message", (event) => {
      if (event.source !== window || event.data?.source !== "kiddosprout-blocker") {
        return;
      }
      if (event.data.type === "ready") {
        showToast("KiddoSprout browser blocker connected.");
        broadcastExtensionBlockRules();
      } else if (event.data.type === "rulesSaved") {
        showToast("Browser blocker rules updated.");
      }
    });

    function formatMinutes(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (!hours) {
        return mins + "m";
      }
      return mins ? hours + "h " + mins + "m" : hours + "h";
    }

    function formatClock(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = String(seconds % 60).padStart(2, "0");
      return mins + ":" + secs;
    }

    function decorateRange(input) {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value || min);
      const progress = ((value - min) / (max - min)) * 100;
      input.style.setProperty("--range-progress", progress + "%");
    }

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
    }

    function celebrate(x = window.innerWidth / 2, y = window.innerHeight * 0.38) {
      const colors = ["#147d7f", "#5d9b3a", "#f1b43f", "#df604a", "#346f9f"];
      for (let index = 0; index < 18; index += 1) {
        const piece = document.createElement("span");
        const angle = (Math.PI * 2 * index) / 18;
        const distance = 72 + ((index % 4) * 14);
        piece.className = "burst-piece";
        piece.style.setProperty("--x", x + "px");
        piece.style.setProperty("--y", y + "px");
        piece.style.setProperty("--tx", (Math.cos(angle) * distance) + "px");
        piece.style.setProperty("--ty", (Math.sin(angle) * distance) + "px");
        piece.style.setProperty("--c", colors[index % colors.length]);
        burstLayer.appendChild(piece);
        window.setTimeout(() => piece.remove(), 820);
      }
    }

    function celebrateElement(element) {
      const box = element.getBoundingClientRect();
      celebrate(box.left + (box.width / 2), box.top + (box.height / 2));
    }

    function addButtonRipple(event) {
      const button = event.target.closest("button");
      if (!button || button.disabled) {
        return;
      }
      const box = button.getBoundingClientRect();
      const size = Math.max(box.width, box.height);
      const ripple = document.createElement("span");
      ripple.className = "tap-ripple";
      ripple.style.setProperty("--rx", (event.clientX - box.left) + "px");
      ripple.style.setProperty("--ry", (event.clientY - box.top) + "px");
      ripple.style.setProperty("--rs", size + "px");
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 620);
    }

    async function saveState(showMessage = false) {
      window.localStorage.setItem("kiddosproutState", JSON.stringify(state));
      if (showMessage) {
        showToast("Family settings saved.");
      }
    }

    function cleanBrandText(value) {
      if (typeof value !== "string") {
        return value;
      }
      const compactOldBrand = ["Safe", "Sprout"].join("");
      const spacedOldBrand = ["Safe", " Sprout"].join("");
      return value
        .replaceAll(compactOldBrand, "KiddoSprout")
        .replaceAll(spacedOldBrand, "KiddoSprout")
        .replaceAll(compactOldBrand.toLowerCase(), "kiddosprout")
        .replaceAll(spacedOldBrand.toLowerCase(), "kiddosprout");
    }

    function cleanSavedBranding(value) {
      if (Array.isArray(value)) {
        return value.map(cleanSavedBranding);
      }
      if (value && typeof value === "object") {
        Object.keys(value).forEach((key) => {
          value[key] = cleanSavedBranding(value[key]);
        });
        return value;
      }
      return cleanBrandText(value);
    }

    function queueSave() {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => saveState(), 450);
    }

    function themeChoiceLabel(choice, resolved) {
      if (choice === "auto") {
        return "Auto now using " + (resolved === "night" ? "Night" : "Day");
      }
      return choice === "night" ? "Night" : "Day";
    }

    function resolveTheme(choice = "auto") {
      if (choice === "day" || choice === "night") {
        return choice;
      }
      const hour = new Date().getHours();
      return hour >= 19 || hour < 7 ? "night" : "day";
    }

    function applyThemeMode(choice = state?.themeMode || "auto") {
      const themeChoice = ["auto", "day", "night"].includes(choice) ? choice : "auto";
      const resolved = resolveTheme(themeChoice);
      document.body.classList.toggle("theme-night", resolved === "night");
      document.body.classList.toggle("theme-day", resolved === "day");
      document.body.dataset.themeMode = themeChoice;
      if (themeModeSetting) {
        themeModeSetting.value = themeChoice;
      }
      if (quickThemeModeSetting) {
        quickThemeModeSetting.value = themeChoice;
      }
      if (themeModeStatus) {
        themeModeStatus.value = themeChoiceLabel(themeChoice, resolved);
      }
    }

    function saveThemeMode(choice = themeModeSetting.value) {
      state.themeMode = choice;
      applyThemeMode(state.themeMode);
      queueSave();
      showToast(themeModeStatus.value + " theme saved.");
    }

    function setSettingsMenu(open) {
      settingsMenu.classList.toggle("open", open);
      settingsToggle.setAttribute("aria-expanded", String(open));
    }

    function closeSettingsMenu() {
      setSettingsMenu(false);
    }

    function openParentSettingsFromMenu() {
      closeSettingsMenu();
      const advancedSettings = document.querySelector("#advancedSettings");
      if (advancedSettings) {
        advancedSettings.open = true;
      }
      setMode("parent");
      window.setTimeout(() => {
        const target = document.querySelector("#advancedSettings");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 250);
    }

    function updateRoute(mode) {
      const nextHash = "#" + mode;
      if (window.location.hash !== nextHash) {
        window.history.pushState({ mode }, "", nextHash);
      }
    }

    function showParentGate() {
      parentGate.classList.add("open");
      parentGate.setAttribute("aria-hidden", "false");
      lockBox.classList.remove("success", "slide-away");
      passcodeInput.value = "";
      passcodeInput.type = "password";
      viewPassword.checked = false;
      forgotPanel.style.display = "none";
      passcodeStatus.textContent = "";
      updatePasscodeLockout();
      checkServerLockout();
      passcodeInput.focus();
    }

    function hideParentGate() {
      parentGate.classList.remove("open");
      parentGate.setAttribute("aria-hidden", "true");
    }

    function setMode(mode, options = {}) {
      if ((mode === "parent" || mode === "child") && !hasKiddoSession()) {
        viewMode = "login";
        updateRoute("login");
        document.body.classList.remove("mode-child", "mode-signup");
        document.body.classList.add("mode-login");
        document.querySelector("#modeToggle").textContent = "Child Site";
        document.querySelector("#siteTitle").textContent = "KiddoSprout Login";
        document.querySelector("#heroTitle").textContent = "Log in to KiddoSprout.";
        if (loginSupabaseStatus) {
          loginSupabaseStatus.textContent = SUPABASE_CONNECTED ? "Supabase is connected." : "Supabase is not connected yet.";
          loginSupabaseStatus.classList.toggle("success", SUPABASE_CONNECTED);
        }
        hideParentGate();
        closeApp();
        if (state) {
          render();
        }
        if (!options.quiet) {
          showToast("Log in to open KiddoSprout.");
        }
        return;
      }
      if ((mode === "parent" || mode === "child") && !hasParentAccount()) {
        viewMode = "signup";
        updateRoute("signup");
        document.body.classList.remove("mode-child", "mode-login");
        document.body.classList.add("mode-signup");
        document.querySelector("#modeToggle").textContent = "Child Site";
        document.querySelector("#siteTitle").textContent = "KiddoSprout Sign Up";
        document.querySelector("#heroTitle").textContent = "Create your KiddoSprout family hub.";
        hideParentGate();
        closeApp();
        if (state) {
          render();
        }
        if (!options.quiet) {
          showToast("Create a parent account first.");
        }
        return;
      }
      if (mode === "parent" && !parentUnlocked && !options.unlocked) {
        updateRoute("parent");
        showParentGate();
        return;
      }
      if (mode === "child" && !hasChildProfiles()) {
        if (!parentUnlocked && !options.unlocked) {
          updateRoute("parent");
          showParentGate();
          if (!options.quiet) {
            showToast("Parent must unlock before adding a child profile.");
          }
          return;
        }
        viewMode = "parent";
        updateRoute("parent");
        document.body.classList.remove("mode-child", "mode-signup");
        document.querySelector("#modeToggle").textContent = "Child Site";
        document.querySelector("#siteTitle").textContent = "KiddoSprout Parent Dashboard";
        document.querySelector("#heroTitle").textContent = "Add a real child profile first.";
        hideParentGate();
        closeApp();
        if (state) {
          render();
        }
        window.setTimeout(() => {
          const target = document.querySelector("#manageChildren");
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 220);
        if (!options.quiet) {
          showToast("Add your first child profile before opening the child site.");
        }
        return;
      }
      if (mode === "child" || mode === "signup" || mode === "login") {
        parentUnlocked = false;
        window.sessionStorage.removeItem("parentUnlocked");
      }
      viewMode = mode;
      updateRoute(mode);
      document.body.classList.toggle("mode-child", mode === "child");
      document.body.classList.toggle("mode-signup", mode === "signup");
      document.body.classList.toggle("mode-login", mode === "login");
      document.querySelector("#modeToggle").textContent = mode === "child" ? "Parent Site" : "Child Site";
      document.querySelector("#siteTitle").textContent = mode === "child" ? "KiddoSprout Child Site" : mode === "signup" ? "KiddoSprout Sign Up" : mode === "login" ? "KiddoSprout Login" : "KiddoSprout Parent Dashboard";
      document.querySelector("#heroTitle").textContent = mode === "child" ? "Your KiddoSprout space for today." : mode === "signup" ? "Create your KiddoSprout family hub." : mode === "login" ? "Log in to KiddoSprout." : "KiddoSprout helps kids grow online.";
      hideParentGate();
      closeApp();
      if (state) {
        render();
      }
      if (mode === "login" && loginSupabaseStatus) {
        loginSupabaseStatus.textContent = SUPABASE_CONNECTED ? "Supabase is connected." : "Supabase is not connected yet.";
        loginSupabaseStatus.classList.toggle("success", SUPABASE_CONNECTED);
      }
      if (!options.quiet) {
        showToast(mode === "child" ? "Child Site opened." : mode === "signup" ? "Sign up opened." : mode === "login" ? "Login opened." : "Parent Dashboard opened.");
      }
    }

    function unlockParent() {
      if (!hasParentAccount()) {
        passcodeStatus.textContent = "Create a parent account first.";
        shakePasscodeBox();
        showToast("Create a parent account before logging in.");
        window.setTimeout(() => setMode("signup"), 650);
        return;
      }

      if (Date.now() < lockoutUntil) {
        updatePasscodeLockout();
        return;
      }

      if (passcodeInput.value === currentParentPasscode()) {
        parentUnlocked = true;
        failedPasscodeAttempts = 0;
        lockoutUntil = 0;
        window.sessionStorage.setItem("parentUnlocked", "true");
        window.localStorage.removeItem("kiddoSproutLockoutUntil");
        window.localStorage.removeItem("kiddoSproutFailedAttempts");
        window.sessionStorage.removeItem("failedPasscodeAttempts");
        window.sessionStorage.removeItem("lockoutUntil");
        showPasscodeSuccess("Welcome");
        window.setTimeout(() => lockBox.classList.add("slide-away"), 520);
        window.setTimeout(() => setMode("parent", { unlocked: true }), 1780);
        return;
      }

      failedPasscodeAttempts = Number(window.localStorage.getItem("kiddoSproutFailedAttempts") || "0") + 1;
      window.localStorage.setItem("kiddoSproutFailedAttempts", String(failedPasscodeAttempts));
      window.sessionStorage.setItem("failedPasscodeAttempts", String(failedPasscodeAttempts));
      passcodeInput.value = "";
      shakePasscodeBox();

      if (failedPasscodeAttempts >= 3) {
        lockoutUntil = Date.now() + 30000;
        window.localStorage.setItem("kiddoSproutLockoutUntil", String(lockoutUntil));
        window.sessionStorage.setItem("lockoutUntil", String(lockoutUntil));
        updatePasscodeLockout();
        showToast("Too many attempts. Try again in 30 seconds.");
        return;
      }

      unlockParentButton.disabled = false;
      const triesLeft = 3 - failedPasscodeAttempts;
      passcodeStatus.textContent = "Incorrect password. " + triesLeft + " tries left.";
      showToast(passcodeStatus.textContent);
    }

    function checkServerLockout() {
      const sharedLockout = Number(window.localStorage.getItem("kiddoSproutLockoutUntil") || "0");
      if (sharedLockout > Date.now()) {
        lockoutUntil = sharedLockout;
        window.sessionStorage.setItem("lockoutUntil", String(lockoutUntil));
        updatePasscodeLockout();
      }
    }

    function shakePasscodeBox() {
      lockBox.classList.remove("shake");
      void lockBox.offsetWidth;
      lockBox.classList.add("shake");
    }

    function showPasscodeSuccess(message) {
      passcodeStatus.textContent = message;
      passcodeStatus.classList.add("success");
      lockBox.classList.add("success");
      window.setTimeout(() => {
        passcodeStatus.classList.remove("success");
        lockBox.classList.remove("success", "slide-away");
      }, 900);
    }

    function saveParentPasscode() {
      const nextPasscode = passcodeSetting.value.trim();
      if (!nextPasscode) {
        passcodeSettingStatus.textContent = "Required";
        showToast("Passcode cannot be empty.");
        return;
      }
      state.parentPasscode = nextPasscode;
      passcodeSettingStatus.textContent = "Saved";
      passcodeSettingStatus.style.color = "#147d46";
      queueSave();
      showToast("Parent passcode updated.");
      window.setTimeout(() => {
        passcodeSettingStatus.style.color = "";
      }, 900);
    }

    function saveSecondParent() {
      const name = secondParentNameSetting.value.trim();
      const email = secondParentEmailSetting.value.trim().toLowerCase();
      if ((name && !email) || (!name && email)) {
        showToast("Add both second parent name and email, or leave both blank.");
        return;
      }
      state.secondParentName = name;
      state.secondParentEmail = email;
      queueSave();
      showToast(name ? "Second parent saved." : "Second parent cleared.");
    }

    async function loginKiddoSprout() {
      const email = loginEmail.value.trim().toLowerCase();
      const password = loginPassword.value;
      if (!email || !password) {
        loginStatus.textContent = "Enter your email and password.";
        showToast("Enter your KiddoSprout login details.");
        return;
      }
      loginStatus.textContent = "Logging in...";
      try {
        const session = await kiddoSignInRequest(email, password);
        saveKiddoSession(session);
        state.parentEmail = email;
        state.parentName ||= "Parent";
        state.familyName ||= "KiddoSprout Family";
        state.parentPasscode ||= password;
        state.parentAccountCreated = true;
        parentUnlocked = true;
        window.sessionStorage.setItem("parentUnlocked", "true");
        saveState();
        loginStatus.textContent = "Welcome back";
        loginStatus.classList.add("success");
        showToast("Logged in to KiddoSprout.");
        window.setTimeout(() => {
          loginStatus.classList.remove("success");
          setMode("parent", { unlocked: true });
        }, 700);
      } catch (error) {
        loginStatus.textContent = friendlySupabaseError(error);
        showToast("KiddoSprout login failed.");
      }
    }

    async function resendKiddoSproutEmail(source = "login") {
      const statusElement = source === "signup" ? signupStatus : loginStatus;
      const emailInput = source === "signup" ? signupEmail : loginEmail;
      const fallbackEmail = loginEmail.value.trim().toLowerCase() || signupEmail.value.trim().toLowerCase() || state.parentEmail || "";
      const email = (emailInput.value.trim().toLowerCase() || fallbackEmail).trim();

      if (resendEmailCooldown > 0) {
        statusElement.textContent = `Wait ${resendEmailCooldown} seconds before resending.`;
        return;
      }

      if (!email) {
        statusElement.textContent = "Enter your parent email first.";
        showToast("Enter your email first.");
        return;
      }

      statusElement.textContent = "Sending confirmation email...";
      try {
        await kiddoResendSignupEmail(email);
        statusElement.textContent = "Confirmation email sent. Check your inbox and spam folder.";
        statusElement.classList.add("success");
        showToast("Confirmation email sent.");
        startResendEmailCooldown();
        window.setTimeout(() => statusElement.classList.remove("success"), 2000);
      } catch (error) {
        statusElement.textContent = friendlySupabaseError(error);
        showToast("Could not resend email.");
      }
    }

    async function createAccount() {
      const familyName = signupFamily.value.trim();
      const parentName = signupParent.value.trim();
      const parentEmail = signupEmail.value.trim().toLowerCase();
      const secondParentName = signupParentTwo.value.trim();
      const secondParentEmail = signupEmailTwo.value.trim().toLowerCase();
      const passcode = signupPasscode.value.trim();

      if (!familyName || !parentName || !parentEmail || !passcode) {
        signupStatus.textContent = "Complete required fields";
        showToast("Complete the required sign up fields.");
        return;
      }

      if (passcode.length < 6) {
        signupStatus.textContent = "Password needs at least 6 characters";
        showToast("Use at least 6 characters for Supabase login.");
        return;
      }

      if ((secondParentName && !secondParentEmail) || (!secondParentName && secondParentEmail)) {
        signupStatus.textContent = "Add both second parent details";
        showToast("Add both second parent name and email, or leave both blank.");
        return;
      }

      signupStatus.textContent = "Creating Supabase account...";
      try {
        const session = await kiddoSignUpRequest(parentEmail, passcode);
        if (session?.access_token) {
          saveKiddoSession(session);
        }
      } catch (error) {
        signupStatus.textContent = friendlySupabaseError(error);
        showToast("Supabase sign up failed.");
        return;
      }

      state.familyName = familyName;
      state.parentName = parentName;
      state.parentEmail = parentEmail;
      state.secondParentName = secondParentName;
      state.secondParentEmail = secondParentEmail;
      state.parentPasscode = passcode;
      state.parentAccountCreated = true;
      signupStatus.textContent = hasKiddoSession() ? "Welcome" : "Account created. Check your email, then log in.";
      signupStatus.classList.add("success");
      saveState();
      if (!hasKiddoSession()) {
        startResendEmailCooldown();
        window.setTimeout(() => {
          signupStatus.classList.remove("success");
          setMode("login");
        }, 1300);
        return;
      }
      parentUnlocked = true;
      window.sessionStorage.setItem("parentUnlocked", "true");
      window.setTimeout(() => {
        signupStatus.classList.remove("success");
        setMode("parent", { unlocked: true });
        window.setTimeout(() => {
          document.querySelector("#manageChildren")?.scrollIntoView({ behavior: "smooth", block: "start" });
          showToast("Now add your first real child profile.");
        }, 250);
      }, 650);
    }

    async function installKiddoSproutApp(triggerButton = downloadKiddoSproutButton) {
      const statusElement = triggerButton === downloadSignupButton ? signupStatus : passcodeStatus;
      const originalButtonText = triggerButton?.textContent || "Install KiddoSprout App";
      if (triggerButton) {
        triggerButton.disabled = true;
        triggerButton.textContent = "Opening installer...";
      }

      if (kiddoInstallPrompt) {
        kiddoInstallPrompt.prompt();
        const result = await kiddoInstallPrompt.userChoice;
        kiddoInstallPrompt = null;
        if (result?.outcome === "accepted") {
          statusElement.textContent = "KiddoSprout is installing.";
          statusElement.classList.add("success");
          showToast("KiddoSprout app installing.");
        } else {
          statusElement.textContent = "Install cancelled.";
          showToast("KiddoSprout install cancelled.");
        }
      } else if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
        statusElement.textContent = "KiddoSprout is already installed.";
        statusElement.classList.add("success");
        showToast("KiddoSprout is already installed.");
      } else {
        statusElement.textContent = "Use your browser menu to install KiddoSprout: Share or menu, then Add to Dock/Home Screen.";
        showToast("Use browser install menu.");
      }
      window.setTimeout(() => statusElement.classList.remove("success"), 1800);
      if (triggerButton) {
        triggerButton.disabled = false;
        triggerButton.textContent = originalButtonText;
      }
    }

    async function sendRecoveryCode() {
      const email = recoveryEmail.value.trim().toLowerCase();
      const savedEmail = (state.parentEmail || "").toLowerCase();
      const secondSavedEmail = (state.secondParentEmail || "").toLowerCase();

      if (!email || (email !== savedEmail && email !== secondSavedEmail)) {
        passcodeStatus.textContent = "Email not found";
        shakePasscodeBox();
        showToast("Email not found");
        return;
      }

      passcodeStatus.textContent = "Sending code...";
      try {
        const response = await fetch("/api/recovery/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Could not send code");
        }
        recoveryCodeRequested = true;
        passcodeStatus.textContent = "Code sent to your email";
        passcodeStatus.classList.add("success");
        showToast("One-time code sent.");
        window.setTimeout(() => passcodeStatus.classList.remove("success"), 1200);
      } catch (error) {
        recoveryCodeRequested = false;
        passcodeStatus.textContent = error.message;
        shakePasscodeBox();
        showToast(error.message);
      }
    }

    async function resetPasscodeWithCode() {
      const newPasscode = recoveryPasscode.value.trim();
      const email = recoveryEmail.value.trim().toLowerCase();

      if (!recoveryCodeRequested) {
        passcodeStatus.textContent = "Send a one-time code first";
        shakePasscodeBox();
        showToast("Send a one-time code first.");
        return;
      }

      if (!newPasscode) {
        passcodeStatus.textContent = "Enter a new password";
        showToast("Enter a new password");
        return;
      }

      passcodeStatus.textContent = "Checking code...";
      try {
        const response = await fetch("/api/recovery/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: recoveryCode.value.trim() })
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Incorrect one-time code");
        }
      } catch (error) {
        passcodeStatus.textContent = error.message;
        shakePasscodeBox();
        showToast(error.message);
        return;
      }

      state.parentPasscode = newPasscode;
      recoveryCodeRequested = false;
      failedPasscodeAttempts = 0;
      lockoutUntil = 0;
      window.sessionStorage.removeItem("failedPasscodeAttempts");
      window.sessionStorage.removeItem("lockoutUntil");
      saveState();
      passcodeInput.value = "";
      recoveryCode.value = "";
      recoveryPasscode.value = "";
      showPasscodeSuccess("Password reset");
      showToast("Parent passcode reset.");
    }

    function updatePasscodeLockout() {
      window.clearInterval(lockoutTimer);
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);

      if (remaining <= 0) {
        lockoutUntil = 0;
        failedPasscodeAttempts = 0;
        window.sessionStorage.removeItem("lockoutUntil");
        window.sessionStorage.removeItem("failedPasscodeAttempts");
        passcodeInput.disabled = false;
        unlockParentButton.disabled = false;
        passcodeStatus.textContent = "";
        return;
      }

      passcodeInput.disabled = true;
      unlockParentButton.disabled = true;
      passcodeStatus.textContent = "Too many attempts. Try again in " + remaining + " seconds.";
      lockoutTimer = window.setInterval(updatePasscodeLockout, 1000);
    }

    function ensureChildAppState(child) {
      state.wellbeingGoals ??= { water: 4, eyeBreaks: 3 };
      state.wellbeingGoals.water = Math.max(1, Number(state.wellbeingGoals.water || 4));
      state.wellbeingGoals.eyeBreaks = Math.max(1, Number(state.wellbeingGoals.eyeBreaks || 3));
      state.schedule ??= {};
      state.schedule.schoolStart ||= "08:45";
      state.schedule.schoolEnd ||= "15:15";
      state.schedule.bedtimeStart ||= "20:30";
      state.schedule.bedtimeEnd ||= "07:00";
      state.parentNote ??= "";
      state.problemReports ??= [];
      state.scanHistory ??= [];
      state.trustedContacts ??= ["Parent or guardian", "Teacher", "School office"];
      child.name ??= "Child";
      child.device ??= "Tablet";
      child.dailyLimit = Number(child.dailyLimit ?? 120);
      child.usedToday = Number(child.usedToday ?? 0);
      child.pending = Number(child.pending ?? 0);
      child.blockedHits = Number(child.blockedHits ?? 0);
      child.bedtime ??= false;
      child.currentRequest ??= ["No request", "No pending request", "-"];
      child.report ??= {};
      child.report.Explorer ??= 0;
      child.report.Stories ??= 0;
      child.report.Movement ??= 0;
      child.report.Games ??= 0;
      child.streaks ??= { reading: 0, homework: 0, exercise: 0, chores: 0 };
      child.streaks.reading ??= 0;
      child.streaks.homework ??= 0;
      child.streaks.exercise ??= 0;
      child.streaks.chores ??= 0;
      child.homeworkMode ??= false;
      child.creatorQueue ??= [];
      child.explorerFact ??= 0;
      child.storyPage ??= 0;
      child.completedTasks ??= [];
      child.avatarIcon ??= "star";
      child.avatarColor ??= "#147d7f";
      child.costume ??= "Explorer";
      child.dailyWins ??= {};
      child.kindnessPoints ??= 0;
      child.kindnessPrompt ??= 0;
      child.sparkIndex ??= 0;
      child.readingLog ??= [];
      child.waterCount ??= 0;
      child.eyeBreaks ??= 0;
      child.flyerBest ??= 0;
      child.flyerAllowed ??= false;
      normalizeAppRules(child);
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character]));
    }

    function makeChildId(name) {
      const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "child";
      let id = base;
      let count = 2;
      while (state.children[id]) {
        id = base + "-" + count;
        count += 1;
      }
      return id;
    }

    function calculateAge(dateOfBirth) {
      if (!dateOfBirth) {
        return "";
      }
      const birthday = new Date(dateOfBirth + "T00:00:00");
      if (Number.isNaN(birthday.getTime())) {
        return "";
      }
      const today = new Date();
      let age = today.getFullYear() - birthday.getFullYear();
      const monthDelta = today.getMonth() - birthday.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthday.getDate())) {
        age -= 1;
      }
      return Math.max(0, age);
    }

    function avatarSymbol(icon, fallbackName) {
      const symbols = {
        star: "★",
        bolt: "!",
        book: "B",
        rocket: "▲",
        heart: "♥",
        smile: "☺",
        rainbow: "◒",
        leaf: "◆",
        crown: "♛"
      };
      return symbols[icon] || (fallbackName || "?").slice(0, 1).toUpperCase();
    }

    function safeAvatarColor(color) {
      return /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#147d7f";
    }

    function colorTextToHex(value) {
      const text = String(value || "").trim();
      if (/^#[0-9a-f]{6}$/i.test(text)) {
        return text;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return "";
      }
      ctx.fillStyle = "#000000";
      ctx.fillStyle = text;
      if (ctx.fillStyle === "#000000" && !/^black$/i.test(text)) {
        return "";
      }
      return ctx.fillStyle;
    }

    function createDefaultChild(name, dateOfBirth, age, device, avatarIcon, avatarColor, costume, schoolYear, emergencyContact, careNote) {
      return {
        name,
        dateOfBirth,
        age,
        device,
        avatarIcon,
        avatarColor,
        costume,
        schoolYear,
        emergencyContact,
        careNote,
        dailyLimit: 120,
        usedToday: 0,
        pending: 0,
        blockedHits: 0,
        bedtime: false,
        currentRequest: ["No request", "No pending request", "-"],
        report: {
          Explorer: 0,
          Stories: 0,
          Movement: 0,
          Games: 0
        },
        streaks: {
          reading: 0,
          homework: 0,
          exercise: 0,
          chores: 0
        },
        homeworkMode: false,
        creatorQueue: [],
        explorerFact: 0,
        storyPage: 0,
        completedTasks: [],
        dailyWins: {},
        kindnessPoints: 0,
        kindnessPrompt: 0,
        sparkIndex: 0,
        readingLog: [],
        waterCount: 0,
        eyeBreaks: 0,
        flyerBest: 0,
        flyerAllowed: false
      };
    }

    function setUnderFiveWarning(target, age) {
      if (age !== "" && age < 5) {
        target.textContent = "Warning: for children under 5, this app may not be needed. Simple supervised screen time is usually better.";
        return;
      }
      target.textContent = "";
    }

    function updateNewChildWarning() {
      const age = calculateAge(newChildDob.value);
      setUnderFiveWarning(newChildWarning, age);
    }

    function updateEditChildWarning() {
      const age = calculateAge(editChildDob.value);
      setUnderFiveWarning(editChildWarning, age);
    }

    function renderChildEditor() {
      const child = currentChild();
      if (!child) {
        editChildName.value = "";
        editChildDob.value = "";
        editChildDevice.value = "Tablet";
        editChildAvatarIcon.value = "star";
        editChildAvatarColor.value = "#147d7f";
        editChildSchoolYear.value = "";
        editChildEmergencyContact.value = "";
        editChildCareNote.value = "";
        editChildWarning.textContent = "Add a child profile above before editing.";
        document.querySelector("#saveChildProfile").disabled = true;
        removeChildButton.disabled = true;
        removeChildStatus.textContent = "No child profile selected.";
        return;
      }
      document.querySelector("#saveChildProfile").disabled = false;
      removeChildButton.disabled = false;
      const device = child.device || "Tablet";
      const normalizedDevice = device.charAt(0).toUpperCase() + device.slice(1);
      editChildName.value = child.name || "";
      editChildDob.value = child.dateOfBirth || "";
      editChildDevice.value = ["Tablet", "Phone", "Laptop", "Shared device"].includes(device) ? device : normalizedDevice;
      if (!editChildDevice.value) {
        editChildDevice.value = "Tablet";
      }
      editChildAvatarIcon.value = child.avatarIcon || "star";
      editChildAvatarColor.value = safeAvatarColor(child.avatarColor);
      child.costume ??= "Explorer";
      editChildSchoolYear.value = child.schoolYear || "";
      editChildEmergencyContact.value = child.emergencyContact || "";
      editChildCareNote.value = child.careNote || "";
      updateEditChildWarning();
    }

    function saveSelectedChildProfile() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        newChildName.focus();
        return;
      }
      const name = editChildName.value.trim();
      if (!name) {
        showToast("Child name cannot be empty.");
        editChildName.focus();
        return;
      }
      child.name = name;
      child.dateOfBirth = editChildDob.value;
      child.age = calculateAge(child.dateOfBirth);
      child.device = editChildDevice.value;
      child.avatarIcon = editChildAvatarIcon.value;
      child.avatarColor = safeAvatarColor(editChildAvatarColor.value);
      child.costume ??= "Explorer";
      child.schoolYear = editChildSchoolYear.value;
      child.emergencyContact = editChildEmergencyContact.value.trim();
      child.careNote = editChildCareNote.value.trim();
      render();
      queueSave();
      showToast(child.name + "'s details saved.");
    }

    function addChildProfile() {
      const name = newChildName.value.trim();
      const dateOfBirth = newChildDob.value;
      const age = calculateAge(dateOfBirth);
      const device = newChildDevice.value;
      const avatarIcon = newChildAvatarIcon.value;
      const avatarColor = safeAvatarColor(newChildAvatarColor.value);
      const costume = "Explorer";
      const schoolYear = newChildSchoolYear.value;
      const emergencyContact = newChildEmergencyContact.value.trim();
      const careNote = newChildCareNote.value.trim();
      if (!name) {
        showToast("Enter a child name first.");
        newChildName.focus();
        return;
      }

      const id = makeChildId(name);
      state.children[id] = createDefaultChild(name, dateOfBirth, age, device, avatarIcon, avatarColor, costume, schoolYear, emergencyContact, careNote);
      state.activeChild = id;
      newChildName.value = "";
      newChildDob.value = "";
      newChildDevice.value = "Tablet";
      newChildAvatarIcon.value = "star";
      newChildAvatarColor.value = "#147d7f";
      newChildSchoolYear.value = "";
      newChildEmergencyContact.value = "";
      newChildCareNote.value = "";
      newChildWarning.textContent = "";
      render();
      queueSave();
      showToast(age !== "" && age < 5 ? name + " was added. Under-5 warning noted." : name + " was added.");
    }

    function removeSelectedChild() {
      const childIds = Object.keys(state.children);
      const child = currentChild();
      if (!child) {
        removeChildStatus.textContent = "No child profile selected.";
        showToast("Add a child profile first.");
        return;
      }
      if (childIds.length <= 1) {
        removeChildStatus.textContent = "You need at least one child profile.";
        showToast("Keep at least one child profile.");
        return;
      }

      if (pendingRemoveChildId !== state.activeChild) {
        pendingRemoveChildId = state.activeChild;
        removeChildStatus.textContent = "Press Remove Selected Child again to delete " + child.name + ".";
        removeChildButton.textContent = "Confirm Remove";
        showToast("Confirm removal for " + child.name + ".");
        return;
      }

      const removedName = child.name;
      delete state.children[state.activeChild];
      state.activeChild = Object.keys(state.children)[0];
      pendingRemoveChildId = "";
      removeChildStatus.textContent = "";
      removeChildButton.textContent = "Remove Selected Child";
      render();
      queueSave();
      showToast(removedName + " was removed.");
    }

    function childAgeSummary(child) {
      if (child.age === undefined || child.age === "") {
        return "";
      }
      return escapeHtml(child.age) + " yrs · ";
    }

    function childSchoolSummary(child) {
      return child.schoolYear ? escapeHtml(child.schoolYear) + " · " : "";
    }

    function addReportMinutes(label, minutes) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      child.report[label] = (child.report[label] || 0) + minutes;
      renderControls(child);
      queueSave();
    }

    function renderProfiles() {
      const strip = document.querySelector("#profileStrip");
      if (pendingRemoveChildId !== state.activeChild) {
        pendingRemoveChildId = "";
        removeChildButton.textContent = "Remove Selected Child";
        removeChildStatus.textContent = "";
      }
      renderChildEditor();
      if (!hasChildProfiles()) {
        strip.innerHTML = `
          <div class="empty-profile-note">
            <strong>No child profiles yet</strong>
            <span>Add your first real child above. The child site stays locked until a profile exists.</span>
          </div>
        `;
        return;
      }
      strip.innerHTML = Object.entries(state.children).map(([id, child]) => `
        <button class="profile-btn ${id === state.activeChild ? "active" : ""}" data-child="${id}">
          <span class="avatar" style="background: ${safeAvatarColor(child.avatarColor)};">${escapeHtml(avatarSymbol(child.avatarIcon, child.name))}</span>
          <span>
            <strong>${escapeHtml(child.name)}</strong>
            <span class="small">${escapeHtml(child.device)} · ${childAgeSummary(child)}${childSchoolSummary(child)}${child.pending} pending</span>
          </span>
        </button>
      `).join("");

      strip.querySelectorAll("[data-child]").forEach((button) => {
        button.addEventListener("click", () => {
          state.activeChild = button.dataset.child;
          render();
          queueSave();
          showToast("Switched to " + currentChild().name + "'s profile.");
        });
      });
    }

    function renderReport(child) {
      const values = Object.values(child.report);
      const max = Math.max(...values, 1);
      document.querySelector("#reportRows").innerHTML = Object.entries(child.report).map(([label, minutes]) => {
        const width = Math.max(8, Math.round((minutes / max) * 100));
        const color = reportColors[label] || "#147d7f";
        return `
          <div class="bar-row">
            <span>${label}</span>
            <div class="track"><div class="fill" style="--w: ${width}%; --c: ${color};"></div></div>
            <strong>${minutes}m</strong>
          </div>
        `;
      }).join("");
    }

    function renderSafetyAlerts() {
      const alerts = state.safetyAlerts || [];
      document.querySelector("#safetyAlerts").innerHTML = alerts.length
        ? alerts.map((alert) => `
          <div class="filter-item">
            <span>${alert.child}: ${alert.message}</span>
            <strong>${alert.time}</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No safety alerts</span><strong>Clear</strong></div>`;
    }

    function renderProblemReports() {
      const reports = state.problemReports || [];
      document.querySelector("#problemReports").innerHTML = reports.length
        ? reports.map((report, index) => `
          <div class="problem-report ${report.status === "Reviewed" ? "reviewed" : ""}">
            <div>
              <strong>${escapeHtml(report.child)}: ${escapeHtml(report.type)}</strong>
              <p class="small">${escapeHtml(report.note || "No note added.")}</p>
              <span class="small">${escapeHtml(report.urgency)} · ${escapeHtml(report.time)} · ${escapeHtml(report.status || "New")}</span>
            </div>
            <div class="choice-row">
              <button class="approve" data-review-report="${index}">Reviewed</button>
              <button class="tiny" data-follow-report="${index}">Follow Up</button>
            </div>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No problem reports</span><strong>Clear</strong></div>`;

      document.querySelectorAll("[data-review-report]").forEach((button) => {
        button.addEventListener("click", () => reviewProblemReport(Number(button.dataset.reviewReport)));
      });
      document.querySelectorAll("[data-follow-report]").forEach((button) => {
        button.addEventListener("click", () => followUpProblemReport(Number(button.dataset.followReport)));
      });
    }

    function renderScanHistory() {
      const history = state.scanHistory || [];
      document.querySelector("#scanHistory").innerHTML = history.length
        ? history.slice(0, 6).map((scan) => `
          <div class="filter-item">
            <span>${escapeHtml(scan.label)}</span>
            <strong>${escapeHtml(scan.result)}</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No scans yet</span><strong>Ready</strong></div>`;
    }

    function renderTrustedContacts() {
      const contacts = state.trustedContacts || [];
      const contactList = document.querySelector("#trustedContactsList");
      document.querySelector("#trustedContactsInput").value = contacts.join("\n");
      contactList.innerHTML = contacts.length
        ? contacts.map((contact) => `<div class="filter-item"><span>${escapeHtml(contact)}</span><strong>Trusted</strong></div>`).join("")
        : `<div class="filter-item"><span>No contacts set</span><strong>Ask</strong></div>`;
    }

    function renderMoodCheckins() {
      const moods = state.moodCheckins || [];
      document.querySelector("#moodCheckins").innerHTML = moods.length
        ? moods.map((mood) => `
          <div class="filter-item">
            <span>${mood.child}: ${mood.mood}</span>
            <strong>${mood.time}</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No mood check-ins</span><strong>Clear</strong></div>`;
    }

    function renderFamilyRules() {
      const rules = state.familyRules || [];
      rulesInput.value = rules.join("\n");
      document.querySelector("#childRules").innerHTML = rules.length
        ? rules.map((rule) => `<div class="filter-item"><span>${rule}</span><strong>Rule</strong></div>`).join("")
        : `<div class="filter-item"><span>No rules set</span><strong>Open</strong></div>`;
    }

    function renderChores() {
      const chores = state.chores || [];
      choresInput.value = chores.map((chore) => chore.title).join("\n");
      document.querySelector("#childChores").innerHTML = chores.length
        ? chores.map((chore, index) => `
          <div class="filter-item">
            <span>${chore.title}</span>
            <button class="tiny" data-chore="${index}">Done</button>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No chores set</span><strong>Open</strong></div>`;

      document.querySelectorAll("[data-chore]").forEach((button) => {
        button.addEventListener("click", () => submitChore(Number(button.dataset.chore)));
      });
    }

    function renderFocus() {
      focusInput.value = state.focusGoal || "";
      document.querySelector("#childFocusGoal").textContent = state.focusGoal || "Focus for 15 minutes";
      document.querySelector("#focusClock").textContent = formatClock(focusSeconds);
    }

    function timeToMinutes(value) {
      const [hours, minutes] = String(value || "00:00").split(":").map(Number);
      return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    }

    function isNowInsideRange(start, end) {
      const now = new Date();
      const current = now.getHours() * 60 + now.getMinutes();
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      if (startMinutes <= endMinutes) {
        return current >= startMinutes && current < endMinutes;
      }
      return current >= startMinutes || current < endMinutes;
    }

    function renderParentNote() {
      const note = (state.parentNote || "").trim();
      document.querySelector("#parentNoteInput").value = note;
      document.querySelector("#childParentNote").textContent = note || "No parent note yet.";
    }

    function renderFamilySchedule() {
      state.schedule ??= {};
      const schedule = state.schedule;
      document.querySelector("#schoolStartInput").value = schedule.schoolStart || "08:45";
      document.querySelector("#schoolEndInput").value = schedule.schoolEnd || "15:15";
      document.querySelector("#bedtimeStartInput").value = schedule.bedtimeStart || "20:30";
      document.querySelector("#bedtimeEndInput").value = schedule.bedtimeEnd || "07:00";

      const schoolNow = isNowInsideRange(schedule.schoolStart, schedule.schoolEnd);
      const bedtimeNow = isNowInsideRange(schedule.bedtimeStart, schedule.bedtimeEnd);
      document.querySelector("#scheduleNow").textContent = bedtimeNow ? "Bedtime" : schoolNow ? "School time" : "Free time";
      document.querySelector("#scheduleCards").innerHTML = `
        <article class="mini-card schedule-item">
          <span class="small">School</span>
          <strong>${escapeHtml(schedule.schoolStart)} - ${escapeHtml(schedule.schoolEnd)}</strong>
          <p class="small">${schoolNow ? "Focus and learning apps are best right now." : "School hours are saved."}</p>
        </article>
        <article class="mini-card schedule-item">
          <span class="small">Bedtime</span>
          <strong>${escapeHtml(schedule.bedtimeStart)} - ${escapeHtml(schedule.bedtimeEnd)}</strong>
          <p class="small">${bedtimeNow ? "Screens should be winding down now." : "Bedtime lock follows parent settings."}</p>
        </article>
      `;
    }

    function updateKidAvatarPreview() {
      const child = currentChild();
      if (!child) {
        kidAvatarPreview.textContent = "KS";
        kidAvatarPreview.style.background = "#147d7f";
        kidAvatarName.textContent = "Add a child profile";
        kidCostumePreview.textContent = "Costume: not set";
        return;
      }
      const icon = kidAvatarIcon.value || child.avatarIcon || "star";
      const color = safeAvatarColor(kidAvatarColor.value || child.avatarColor);
      const costume = kidCostume.value || child.costume || "Explorer";
      kidAvatarPreview.textContent = avatarSymbol(icon, child.name);
      kidAvatarPreview.style.background = color;
      kidAvatarName.textContent = child.name + "'s avatar";
      kidCostumePreview.textContent = "Costume: " + costume;
      avatarChoiceButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.avatarChoice === icon);
      });
    }

    function renderKidAvatarStudio(child) {
      kidAvatarIcon.value = child.avatarIcon || "star";
      kidAvatarColor.value = safeAvatarColor(child.avatarColor);
      kidAvatarColorText.value = safeAvatarColor(child.avatarColor);
      kidCostume.value = child.costume || "Explorer";
      updateKidAvatarPreview();
    }

    function saveKidAvatar() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      child.avatarIcon = kidAvatarIcon.value;
      child.avatarColor = safeAvatarColor(colorTextToHex(kidAvatarColorText.value) || kidAvatarColor.value);
      kidAvatarColor.value = child.avatarColor;
      kidAvatarColorText.value = child.avatarColor;
      child.costume = kidCostume.value;
      render();
      queueSave();
      showToast(child.name + "'s look was saved.");
      celebrateElement(kidAvatarPreview);
    }

    function childBadges(child) {
      const report = child.report || {};
      const completed = child.completedTasks || [];
      const streaks = child.streaks || {};
      const longestStreak = Math.max(streaks.reading || 0, streaks.homework || 0, streaks.exercise || 0, streaks.chores || 0);
      return [
        {
          mark: "*",
          title: "Creator",
          detail: "Saved an avatar style",
          unlocked: Boolean(child.costume && child.avatarIcon)
        },
        {
          mark: "4",
          title: "Homework Hero",
          detail: "Completed every daily plan card",
          unlocked: todayTasks.every((task) => completed.includes(task.id))
        },
        {
          mark: "E",
          title: "Explorer",
          detail: "Earned 30 Explorer minutes",
          unlocked: (report.Explorer || 0) >= 30
        },
        {
          mark: "R",
          title: "Reading Champion",
          detail: "Earned 30 story minutes",
          unlocked: (report.Stories || 0) >= 30
        },
        {
          mark: "M",
          title: "Active Kid",
          detail: "Earned 20 movement minutes",
          unlocked: (report.Movement || 0) >= 20
        },
        {
          mark: "30",
          title: "30-Day Streak Master",
          detail: "Built any 30-day habit streak",
          unlocked: longestStreak >= 30
        }
      ];
    }

    function renderBadgeShelf(child) {
      const badges = childBadges(child);
      const unlocked = badges.filter((badge) => badge.unlocked).length;
      document.querySelector("#badgeCount").textContent = unlocked + "/" + badges.length;
      document.querySelector("#badgeShelf").innerHTML = badges.map((badge) => `
        <article class="badge ${badge.unlocked ? "unlocked" : ""}">
          <span class="badge-mark">${badge.mark}</span>
          <span>
            <strong>${badge.title}</strong>
            <span class="small">${badge.detail}</span>
          </span>
        </article>
      `).join("");
    }

    function renderStreaks(child) {
      const streaks = child.streaks || {};
      const items = [
        ["Reading Streak", streaks.reading || 0, "Story pages and reading time"],
        ["Homework Streak", streaks.homework || 0, "Focus sessions and plan work"],
        ["Exercise Streak", streaks.exercise || 0, "Move breaks and active resets"],
        ["Chore Streak", streaks.chores || 0, "Helpful tasks and home routines"]
      ];
      const best = Math.max(...items.map((item) => item[1]), 0);
      document.querySelector("#bestStreak").textContent = best + " days";
      document.querySelector("#streakShelf").innerHTML = items.map(([title, days, detail]) => `
        <article class="badge ${days > 0 ? "unlocked" : ""}">
          <span class="badge-mark">${days}</span>
          <span>
            <strong>${title}</strong>
            <span class="small">${detail}</span>
          </span>
        </article>
      `).join("");
    }

    function renderHomeworkMode(child) {
      document.querySelector("#homeworkModeState").textContent = child.homeworkMode ? "Homework On" : "Homework Off";
      document.querySelector("#homeworkModeSub").textContent = child.homeworkMode
        ? "Games, videos, and entertainment requests are paused."
        : "Games and video requests are available.";
      if (parentHomeworkToggle) {
        parentHomeworkToggle.checked = Boolean(child.homeworkMode);
      }
      if (parentHomeworkLabel) {
        parentHomeworkLabel.textContent = child.homeworkMode
          ? "Games, videos, and entertainment requests are paused."
          : "Games and video requests are available.";
      }
    }

    function renderDailyGoalBoard(child) {
      const wins = child.dailyWins || {};
      document.querySelector("#dailyGoalBoard").innerHTML = dailyGoalItems.map((goal) => {
        const done = Boolean(wins[goal.id]);
        return `
          <button class="goal-chip ${done ? "done" : ""}" data-daily-win="${goal.id}">
            <span>${goal.title}</span>
            <small>${goal.detail}</small>
          </button>
        `;
      }).join("");

      document.querySelectorAll("[data-daily-win]").forEach((button) => {
        button.addEventListener("click", () => completeDailyWin(button.dataset.dailyWin));
      });
    }

    function renderKindnessQuest(child) {
      const index = Number(child.kindnessPrompt || 0) % kindnessPrompts.length;
      document.querySelector("#kindnessPrompt").textContent = kindnessPrompts[index];
      document.querySelector("#kindnessPoints").textContent = (child.kindnessPoints || 0) + " points";
    }

    function renderDailySpark(child) {
      const spark = sparkPrompts[Number(child.sparkIndex || 0) % sparkPrompts.length];
      document.querySelector("#sparkTitle").textContent = spark.title;
      document.querySelector("#sparkText").textContent = spark.text;
    }

    function renderReadingLog(child) {
      const log = child.readingLog || [];
      const total = log.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
      document.querySelector("#readingTotal").textContent = total + "m";
      document.querySelector("#readingHistory").innerHTML = log.length
        ? log.slice(0, 5).map((item) => `
          <div class="filter-item">
            <span>${escapeHtml(item.title)}</span>
            <strong>${Number(item.minutes || 0)}m</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No reading logged yet</span><strong>Start</strong></div>`;
    }

    function renderHealthyBreaks(child) {
      const waterGoal = Math.max(1, Number(state.wellbeingGoals?.water || 4));
      const eyeGoal = Math.max(1, Number(state.wellbeingGoals?.eyeBreaks || 3));
      const waterCount = Number(child.waterCount || 0);
      const eyeCount = Number(child.eyeBreaks || 0);
      document.querySelector("#waterProgress").textContent = waterCount + "/" + waterGoal;
      document.querySelector("#eyeProgress").textContent = eyeCount + "/" + eyeGoal;
      document.querySelector("#waterFill").style.setProperty("--w", Math.min(100, Math.round((waterCount / waterGoal) * 100)) + "%");
      document.querySelector("#eyeFill").style.setProperty("--w", Math.min(100, Math.round((eyeCount / eyeGoal) * 100)) + "%");
    }

    function renderWellbeingSnapshot(child) {
      const wins = Object.values(child.dailyWins || {}).filter(Boolean).length;
      const readingTotal = (child.readingLog || []).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
      const lastRead = (child.readingLog || [])[0]?.title || "Nothing logged yet";
      document.querySelector("#wellbeingSnapshot").innerHTML = `
        <div class="filter-item"><span>Daily wins</span><strong>${wins}/${dailyGoalItems.length}</strong></div>
        <div class="filter-item"><span>Water progress</span><strong>${Number(child.waterCount || 0)}/${Number(state.wellbeingGoals?.water || 4)}</strong></div>
        <div class="filter-item"><span>Eye breaks</span><strong>${Number(child.eyeBreaks || 0)}/${Number(state.wellbeingGoals?.eyeBreaks || 3)}</strong></div>
        <div class="filter-item"><span>Kindness points</span><strong>${Number(child.kindnessPoints || 0)}</strong></div>
        <div class="filter-item"><span>Reading total</span><strong>${readingTotal}m</strong></div>
        <div class="filter-item"><span>Last reading</span><strong>${escapeHtml(lastRead)}</strong></div>
      `;
    }

    function renderTodayPlan(child) {
      document.querySelector("#todayPlan").innerHTML = todayTasks.map((task) => {
        const done = child.completedTasks.includes(task.id);
        return `
          <article class="plan-item ${done ? "done" : ""}">
            <span class="small">${task.report} · +${task.minutes}m</span>
            <h3>${task.title}</h3>
            <p class="small">${task.detail}</p>
            <button data-task="${task.id}">${done ? "Done" : "Complete"}</button>
          </article>
        `;
      }).join("");

      document.querySelectorAll("[data-task]").forEach((button) => {
        button.addEventListener("click", () => completeTask(button.dataset.task));
      });
    }

    function renderAppAccessRules(child) {
      normalizeAppRules(child);
      const list = document.querySelector("#appAccessList");
      if (!list) {
        return;
      }
      list.innerHTML = Object.entries(APP_CATALOG).map(([id, app]) => {
        const rule = getAppRule(child, id);
        return `
          <div class="filter-item app-access-item">
            <span>${escapeHtml(app.title)} <small>${escapeHtml(app.kind)}</small></span>
            <div class="choice-row">
              <button class="tiny ${rule === "allowed" ? "active-rule" : ""}" data-app-rule="${id}" data-rule="allowed">Allow</button>
              <button class="tiny ${rule === "request" ? "active-rule" : ""}" data-app-rule="${id}" data-rule="request">Ask</button>
              <button class="block ${rule === "blocked" ? "active-rule" : ""}" data-app-rule="${id}" data-rule="blocked">Block</button>
            </div>
          </div>
        `;
      }).join("");

      document.querySelectorAll("[data-app-rule]").forEach((button) => {
        button.addEventListener("click", () => {
          const app = APP_CATALOG[button.dataset.appRule];
          setAppRule(child, button.dataset.appRule, button.dataset.rule);
          renderControls(child);
          broadcastExtensionBlockRules();
          queueSave();
          showToast(app.title + " is now set to " + appRuleLabel(button.dataset.rule) + ".");
        });
      });
    }

    function renderHubAccess(child) {
      normalizeAppRules(child);
      Object.entries(APP_CATALOG).forEach(([id, app]) => {
        const rule = getAppRule(child, id);
        const label = document.querySelector(`[data-app-status-label="${id}"]`);
        if (label) {
          label.textContent = rule === "allowed" ? "Approved app" : rule === "blocked" ? "Blocked by parent" : "Needs parent approval";
        }
        document.querySelectorAll(`[data-open-app="${id}"], [data-open-app-link="${id}"]`).forEach((control) => {
          control.classList.toggle("blocked-app", rule === "blocked");
          control.classList.toggle("request-app", rule === "request");
          control.setAttribute("aria-label", `${app.title}: ${appRuleLabel(rule)}`);
        });
      });
    }

    function setChildControlsDisabled(disabled) {
      [
        "#approveBtn",
        "#blockBtn",
        "#childAskApp",
        "#limitRange",
        "#bedtimeToggle",
        "#flyerAllowedToggle",
        "#saveKidAvatar",
        "#startFocus",
        "#resetFocus",
        "#completeFocus",
        "#sendParentChat",
        "#clearParentChat"
      ].forEach((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          element.disabled = disabled;
        }
      });
      document.querySelectorAll("[data-open-app], [data-open-app-link], [data-help-action], [data-mood]").forEach((element) => {
        element.classList.toggle("blocked-app", disabled);
        element.setAttribute("aria-disabled", disabled ? "true" : "false");
      });
    }

    function renderNoChildState() {
      setChildControlsDisabled(true);
      document.querySelector("#childWelcome").textContent = "Add a child profile";
      document.querySelector("#timeLeft").textContent = "0m";
      document.querySelector("#pendingCount").textContent = "0";
      document.querySelector("#blockedHits").textContent = "0";
      document.querySelector("#limitRange").value = 30;
      decorateRange(document.querySelector("#limitRange"));
      document.querySelector("#bedtimeToggle").checked = false;
      document.querySelector("#deviceState").textContent = "No child selected";
      document.querySelector("#deviceSub").textContent = "Create a real child profile before using controls.";
      document.querySelector("#appName").textContent = "No request yet";
      document.querySelector("#appMeta").textContent = "Requests appear here after a real child profile exists.";
      document.querySelector("#appInitial").textContent = "-";
      document.querySelector("#reportRows").innerHTML = `
        <div class="filter-item">
          <span>Add a child profile to start reports.</span>
          <strong>Waiting</strong>
        </div>
      `;
      renderSafetyAlerts();
      renderProblemReports();
      renderScanHistory();
      renderTrustedContacts();
      renderMoodCheckins();
      renderFamilyRules();
      renderChores();
      renderFocus();
      renderParentNote();
      renderFamilySchedule();
      broadcastExtensionBlockRules();
    }

    function renderControls(child) {
      setChildControlsDisabled(false);
      ensureChildAppState(child);
      const left = Math.max(0, child.dailyLimit - child.usedToday);
      document.querySelector("#childWelcome").textContent = child.name + "'s Child Mode";
      renderKidAvatarStudio(child);
      renderBadgeShelf(child);
      renderStreaks(child);
      renderHomeworkMode(child);
      renderDailyGoalBoard(child);
      renderKindnessQuest(child);
      renderDailySpark(child);
      renderReadingLog(child);
      renderHealthyBreaks(child);
      document.querySelector("#timeLeft").textContent = formatMinutes(left);
      document.querySelector("#pendingCount").textContent = child.pending;
      document.querySelector("#blockedHits").textContent = child.blockedHits;
      document.querySelector("#lockState").textContent = child.bedtime ? "On" : "Off";
      document.querySelector("#limitRange").value = child.dailyLimit;
      decorateRange(document.querySelector("#limitRange"));
      document.querySelector("#limitValue").textContent = formatMinutes(child.dailyLimit);
      document.querySelector("#bedtimeToggle").checked = child.bedtime;
      const flyerRule = getAppRule(child, "flyer");
      flyerAllowedToggle.checked = flyerRule === "allowed";
      flyerAllowedLabel.textContent = flyerRule === "allowed"
        ? "Allowed for this child profile."
        : flyerRule === "blocked"
          ? "Blocked by parent settings."
          : "Parent approval required before play.";
      renderAppAccessRules(child);
      renderHubAccess(child);
      document.querySelector("#deviceState").textContent = child.bedtime ? "Device Locked" : "Device Active";
      document.querySelector("#deviceSub").textContent = child.bedtime
        ? "Only emergency phone calls are available."
        : "Emergency calls stay available when locked.";
      document.querySelector("#appName").textContent = child.currentRequest[0];
      document.querySelector("#appMeta").textContent = child.currentRequest[1];
      document.querySelector("#appInitial").textContent = child.currentRequest[2];
      renderTodayPlan(child);
      renderReport(child);
      renderSafetyAlerts();
      renderProblemReports();
      renderScanHistory();
      renderTrustedContacts();
      renderMoodCheckins();
      renderFamilyRules();
      renderChores();
      renderFocus();
      renderParentNote();
      renderFamilySchedule();
      renderWellbeingSnapshot(child);
      broadcastExtensionBlockRules();
    }

    function render() {
      state.themeMode ??= "auto";
      applyThemeMode(state.themeMode);
      passcodeSetting.value = currentParentPasscode();
      passcodeSettingStatus.textContent = "Saved";
      signupFamily.value = state.familyName || "";
      signupParent.value = state.parentName || "";
      signupEmail.value = state.parentEmail || "";
      signupParentTwo.value = state.secondParentName || "";
      signupEmailTwo.value = state.secondParentEmail || "";
      secondParentNameSetting.value = state.secondParentName || "";
      secondParentEmailSetting.value = state.secondParentEmail || "";
      document.querySelector("#waterGoalInput").value = Number(state.wellbeingGoals?.water || 4);
      document.querySelector("#eyeGoalInput").value = Number(state.wellbeingGoals?.eyeBreaks || 3);
      renderParentNote();
      renderFamilySchedule();
      renderProfiles();
      const child = currentChild();
      if (child) {
        renderControls(child);
      } else {
        renderNoChildState();
      }
    }

    function openApp(app) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        setMode("parent", { unlocked: true });
        return;
      }
      ensureChildAppState(child);
      const rule = getAppRule(child, app);
      if (rule === "blocked") {
        const appTitle = APP_CATALOG[app]?.title || "This app";
        child.blockedHits += 1;
        renderControls(child);
        queueSave();
        showToast(appTitle + " is blocked by parent settings.");
        return;
      }
      if (rule === "request") {
        requestAppAccess(child, app);
        return;
      }
      const hubPages = {
        studio: "creator-studio.html",
        explore: "nature-explorer.html",
        move: "move-breaks.html",
        story: "story-theater.html"
      };
      if (hubPages[app]) {
        window.location.href = hubPages[app];
        return;
      }
      window.clearTimeout(closeTimer);
      const titles = {
        studio: ["Creator Studio", "Safe prompts, pretend recording, and parent review queue."],
        explore: ["Explorer Lab", "Nature facts, map quests, and discovery minutes."],
        move: ["Move Breaks", "Short activity timers that count toward healthy movement."],
        story: ["Story Theater", "Original books, bookmarks, and calm story time."],
        recipe: ["FlavorNest", "Connected recipes, safe steps, and family kitchen wins."],
        flyer: ["Sprout Flyer", "Tap, click, or press Space to fly through friendly clouds."]
      };
      appTitle.textContent = titles[app][0];
      appSubtitle.textContent = child.name + " · " + titles[app][1];
      appBody.innerHTML = appMarkup(app, child);
      appModal.classList.add("open");
      appModal.setAttribute("aria-hidden", "false");
      bindAppActions(app);
      if (app === "flyer") {
        setupFlyerGame();
      }
    }

    function openLinkedApp(event) {
      const link = event.currentTarget;
      const appId = link.dataset.openAppLink;
      const child = currentChild();
      if (!child) {
        event.preventDefault();
        showToast("Add a child profile first.");
        setMode("parent", { unlocked: true });
        return;
      }
      ensureChildAppState(child);
      const rule = getAppRule(child, appId);
      if (rule === "allowed") {
        return;
      }
      event.preventDefault();
      const appTitleText = APP_CATALOG[appId]?.title || "This app";
      if (rule === "blocked") {
        child.blockedHits += 1;
        renderControls(child);
        queueSave();
        showToast(appTitleText + " is blocked by parent settings.");
        return;
      }
      requestAppAccess(child, appId);
    }

    function completeTask(taskId) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      if (child.completedTasks.includes(taskId)) {
        showToast("That task is already complete for " + child.name + ".");
        return;
      }
      const task = todayTasks.find((item) => item.id === taskId);
      child.completedTasks.push(task.id);
      child.report[task.report] = (child.report[task.report] || 0) + task.minutes;
      if (task.id === "story") {
        child.streaks.reading += 1;
      } else if (task.id === "move") {
        child.streaks.exercise += 1;
      } else if (task.id === "chore") {
        child.streaks.chores += 1;
      } else {
        child.streaks.homework += 1;
      }
      renderControls(child);
      queueSave();
      showToast(task.title + " completed for " + child.name + ".");
      celebrate();
    }

    function resetTodayPlan() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.completedTasks = [];
      renderControls(child);
      queueSave();
      showToast(child.name + "'s plan was reset.");
    }

    function toggleHomeworkMode() {
      const child = currentChild();
      if (!child) {
        parentHomeworkToggle.checked = false;
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.homeworkMode = !child.homeworkMode;
      if (child.homeworkMode) {
        child.streaks.homework += 1;
      }
      renderControls(child);
      queueSave();
      showToast(child.homeworkMode ? "Homework Mode started by parent." : "Homework Mode ended by parent.");
    }

    function saveWellbeingGoals() {
      state.wellbeingGoals = {
        water: Math.max(1, Math.min(12, Number(document.querySelector("#waterGoalInput").value || 4))),
        eyeBreaks: Math.max(1, Math.min(12, Number(document.querySelector("#eyeGoalInput").value || 3)))
      };
      const child = currentChild();
      if (child) {
        renderControls(child);
      } else {
        renderNoChildState();
      }
      queueSave();
      showToast("Wellbeing goals saved.");
    }

    function saveTrustedContacts() {
      state.trustedContacts = document.querySelector("#trustedContactsInput").value
        .split(/\r?\n/)
        .map((contact) => contact.trim())
        .filter(Boolean);
      renderTrustedContacts();
      queueSave();
      showToast("Trusted contacts saved.");
    }

    function submitProblemReport() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      const typedProblem = document.querySelector("#problemType").value.trim();
      const type = typedProblem ? typedProblem.slice(0, 48) : "Problem";
      const urgency = document.querySelector("#problemUrgency").value;
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      state.problemReports = state.problemReports || [];
      state.problemReports.unshift({
        child: child.name,
        type,
        urgency,
        note: typedProblem,
        time,
        status: "New"
      });
      state.safetyAlerts = state.safetyAlerts || [];
      state.safetyAlerts.unshift({
        child: child.name,
        message: type + " reported" + (urgency === "Needs help now" ? " - urgent" : ""),
        time
      });
      document.querySelector("#problemType").value = "";
      renderControls(child);
      queueSave();
      showToast("Problem report sent to parent dashboard.");
      celebrate();
    }

    function clearProblemForm() {
      document.querySelector("#problemType").value = "";
      document.querySelector("#problemUrgency").value = "Needs help now";
      showToast("Problem report form cleared.");
    }

    function reviewProblemReport(index) {
      const report = (state.problemReports || [])[index];
      if (!report) {
        return;
      }
      report.status = "Reviewed";
      renderProblemReports();
      queueSave();
      showToast("Problem report marked reviewed.");
    }

    function followUpProblemReport(index) {
      const report = (state.problemReports || [])[index];
      if (!report) {
        return;
      }
      report.status = "Follow up";
      state.safetyAlerts = state.safetyAlerts || [];
      state.safetyAlerts.unshift({
        child: report.child,
        message: "Parent follow-up needed: " + report.type,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      const child = currentChild();
      if (child) {
        renderControls(child);
      } else {
        renderNoChildState();
      }
      queueSave();
      showToast("Follow-up added to safety alerts.");
    }

    function analyzeScanText(rawValue) {
      const value = rawValue.trim();
      const lower = value.toLowerCase();
      const blockedWords = [
        "adult", "porn", "xxx", "nude", "gambling", "casino", "betting",
        "weapon", "drugs", "self harm", "kill myself", "suicide", "hate speech"
      ];
      const cautionWords = [
        "chat with strangers", "meet up", "send photo", "private message",
        "free robux", "free coins", "giveaway", "download apk", "unknown link"
      ];
      const allowedDomains = [
        "nationalgeographic.com", "kids.nationalgeographic.com", "nasa.gov",
        "bbc.co.uk", "khanacademy.org", "duolingo.com", "scratch.mit.edu",
        "wikipedia.org", "commonsensemedia.org"
      ];

      let hostname = "";
      try {
        const parsed = new URL(value.includes("://") ? value : "https://" + value);
        hostname = parsed.hostname.replace(/^www\./, "");
      } catch (error) {
        hostname = "";
      }

      const matchedBlocked = blockedWords.filter((word) => lower.includes(word));
      const matchedCaution = cautionWords.filter((word) => lower.includes(word));
      const isAllowedDomain = hostname && allowedDomains.some((domain) => hostname === domain || hostname.endsWith("." + domain));
      const hasSuspiciousUrl = Boolean(hostname) && (
        /[0-9]{6,}/.test(hostname) ||
        hostname.split("-").length > 4 ||
        !hostname.includes(".") ||
        lower.includes("login") && lower.includes("free")
      );

      if (!value) {
        return {
          result: "Empty",
          level: "caution",
          detail: "Type or paste something to scan.",
          reasons: []
        };
      }

      if (matchedBlocked.length) {
        return {
          result: "Blocked",
          level: "blocked",
          detail: "Matched blocked safety terms: " + matchedBlocked.join(", "),
          reasons: matchedBlocked
        };
      }

      if (hasSuspiciousUrl || matchedCaution.length) {
        return {
          result: "Needs Review",
          level: "review",
          detail: matchedCaution.length ? "Matched caution terms: " + matchedCaution.join(", ") : "The URL pattern looks unusual.",
          reasons: matchedCaution
        };
      }

      if (isAllowedDomain) {
        return {
          result: "Allowed",
          level: "allowed",
          detail: "Recognized as an approved learning or safety resource.",
          reasons: []
        };
      }

      return {
        result: "Allowed",
        level: "allowed",
        detail: "No blocked terms or suspicious URL patterns were found.",
        reasons: []
      };
    }

    function runRealScan() {
      const input = document.querySelector("#scanInput");
      const output = document.querySelector("#scanResult");
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      const scan = analyzeScanText(input.value);
      output.className = "scan-result " + scan.level;
      output.innerHTML = `<strong>${scan.result}</strong><span class="small">${escapeHtml(scan.detail)}</span>`;

      state.scanHistory = state.scanHistory || [];
      state.scanHistory.unshift({
        label: (input.value.trim() || "Empty scan").slice(0, 48),
        result: scan.result,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      state.scanHistory = state.scanHistory.slice(0, 12);

      if (scan.result === "Blocked" || scan.result === "Needs Review") {
        child.blockedHits += 1;
        state.safetyAlerts = state.safetyAlerts || [];
        state.safetyAlerts.unshift({
          child: child.name,
          message: "Scanner flagged: " + scan.result,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
      }

      renderControls(child);
      queueSave();
      showToast("Scan complete: " + scan.result + ".");
    }

    function completeDailyWin(goalId) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      const goal = dailyGoalItems.find((item) => item.id === goalId);
      if (!goal) {
        return;
      }
      if (child.dailyWins[goalId]) {
        showToast(goal.title + " is already complete today.");
        return;
      }
      child.dailyWins[goalId] = true;
      child.report[goal.report] = (child.report[goal.report] || 0) + goal.minutes;
      if (goalId === "move") {
        child.streaks.exercise += 1;
      } else if (goalId === "read") {
        child.streaks.reading += 1;
      } else if (goalId === "learn" || goalId === "safe") {
        child.streaks.homework += 1;
      }
      renderControls(child);
      queueSave();
      showToast(goal.title + " win added.");
      celebrate();
    }

    function resetDailyWins() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.dailyWins = {};
      child.waterCount = 0;
      child.eyeBreaks = 0;
      renderControls(child);
      queueSave();
      showToast("Daily wins and healthy breaks were reset.");
    }

    function nextKindnessQuest() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.kindnessPrompt = Number(child.kindnessPrompt || 0) + 1;
      renderKindnessQuest(child);
      queueSave();
      showToast("New kindness quest ready.");
    }

    function nextDailySpark() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.sparkIndex = Number(child.sparkIndex || 0) + 1;
      renderDailySpark(child);
      queueSave();
      showToast("New daily spark ready.");
      celebrateElement(document.querySelector(".spark-card"));
    }

    function completeKindnessQuest() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.kindnessPoints = Number(child.kindnessPoints || 0) + 5;
      child.dailyWins.kind = true;
      child.streaks.homework += 1;
      state.moodCheckins = state.moodCheckins || [];
      state.moodCheckins.unshift({
        child: child.name,
        mood: "Completed kindness quest",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      nextKindnessQuest();
      renderControls(child);
      queueSave();
      showToast("Kindness quest complete.");
      celebrate();
    }

    function addReadingLog() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      const titleInput = document.querySelector("#readingTitle");
      const minutesInput = document.querySelector("#readingMinutes");
      const title = titleInput.value.trim() || "Reading time";
      const minutes = Math.max(1, Math.min(120, Number(minutesInput.value || 10)));
      child.readingLog.unshift({ title, minutes });
      child.readingLog = child.readingLog.slice(0, 12);
      child.dailyWins.read = true;
      child.streaks.reading += 1;
      child.report.Stories = (child.report.Stories || 0) + minutes;
      titleInput.value = "";
      minutesInput.value = 10;
      renderControls(child);
      queueSave();
      showToast(minutes + " reading minutes added.");
      celebrate();
    }

    function addWaterBreak() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.waterCount = Number(child.waterCount || 0) + 1;
      renderControls(child);
      queueSave();
      showToast("Water break added.");
      if (child.waterCount >= Number(state.wellbeingGoals?.water || 4)) {
        celebrate();
      }
    }

    function addEyeBreak() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.eyeBreaks = Number(child.eyeBreaks || 0) + 1;
      child.report.Movement = (child.report.Movement || 0) + 1;
      renderControls(child);
      queueSave();
      showToast("Eye break added.");
      if (child.eyeBreaks >= Number(state.wellbeingGoals?.eyeBreaks || 3)) {
        celebrate();
      }
    }

    function appMarkup(app, child) {
      const factList = [
        "A sea turtle can travel thousands of miles across the ocean and still return near its birthplace.",
        "Redwood trees can grow taller than a 30-story building.",
        "A day on Venus is longer than a year on Venus.",
        "Octopuses have three hearts and can solve simple puzzles.",
        "Honey never really spoils when it is sealed and stored properly.",
        "The heart of a blue whale is about the size of a small car.",
        "Bananas are berries, but strawberries are not true berries.",
        "Sharks existed before trees grew on Earth.",
        "Lightning can heat the air around it hotter than the surface of the Sun.",
        "A group of stars that forms a picture is called a constellation.",
        "The Moon moves a little farther away from Earth every year.",
        "Saturn is less dense than water, even though it is enormous.",
        "Mars has the tallest known volcano in the solar system.",
        "Jupiter has a giant storm called the Great Red Spot.",
        "A year on Mercury is only 88 Earth days.",
        "Neptune has winds faster than the speed of sound.",
        "The Sun is a star, and it is the closest star to Earth.",
        "There are more stars in the universe than grains of sand on Earth.",
        "Comets are made of ice, dust, and rocky material.",
        "Astronauts can grow taller in space because their spines stretch slightly.",
        "The International Space Station travels around Earth about every 90 minutes.",
        "Earth is the only planet we know has liquid water on its surface.",
        "The Pacific Ocean is the largest ocean on Earth.",
        "Most of Earth's oxygen is made by tiny ocean plants called phytoplankton.",
        "Coral reefs are made by tiny animals called coral polyps.",
        "A giant squid has eyes as big as dinner plates.",
        "Some jellyfish can glow in the dark.",
        "Dolphins have names for each other using special whistles.",
        "Sea otters hold hands while resting so they do not drift apart.",
        "A seahorse father carries the babies before they are born.",
        "The deepest part of the ocean is the Mariana Trench.",
        "Some fish can change color to blend into coral reefs.",
        "Penguins cannot fly, but they are excellent swimmers.",
        "Polar bears have black skin under their white-looking fur.",
        "A cheetah is the fastest land animal.",
        "Elephants can recognize themselves in a mirror.",
        "Giraffes have the same number of neck bones as humans.",
        "A tiger's stripes are unique, like a fingerprint.",
        "Koalas have fingerprints that look a lot like human fingerprints.",
        "Bats are the only mammals that can truly fly.",
        "A hummingbird can flap its wings dozens of times each second.",
        "Owls can turn their heads far around, but not all the way around.",
        "Flamingos are pink because of the food they eat.",
        "Bees communicate by doing a waggle dance.",
        "Ants can lift many times their own body weight.",
        "Butterflies taste with their feet.",
        "Dragonflies can fly forward, backward, and hover in place.",
        "Ladybugs are helpful because they eat plant pests called aphids.",
        "Worms help soil by mixing it and making tunnels for air and water.",
        "Frogs absorb water through their skin.",
        "Some frogs can freeze in winter and thaw in spring.",
        "A chameleon can move each eye in a different direction.",
        "Crocodiles can replace their teeth many times.",
        "Snakes smell with their tongues.",
        "Turtles have shells that are part of their skeleton.",
        "Camels can close their nostrils to keep out blowing sand.",
        "Kangaroos cannot walk backward easily.",
        "Sloths move slowly because their bodies save energy.",
        "Arctic foxes change coat color with the seasons.",
        "Plants use sunlight to make food in a process called photosynthesis.",
        "Bamboo can grow very quickly, sometimes more than a foot in a day.",
        "Sunflowers can turn toward the Sun while they are growing.",
        "Cactus spines are actually modified leaves.",
        "Some trees can communicate through underground fungi networks.",
        "The Amazon rainforest makes its own rainy weather.",
        "A seed can stay asleep for years before it sprouts.",
        "Moss does not have true roots like many other plants.",
        "Venus flytraps are plants that can catch insects.",
        "A pineapple is made from many tiny flowers joined together.",
        "The tallest mountain on Earth above sea level is Mount Everest.",
        "The longest river is debated, but the Nile and Amazon are both enormous.",
        "Deserts can be cold as well as hot.",
        "Antarctica is the driest continent on Earth.",
        "A volcano can build new land when lava cools.",
        "Earthquakes happen when pieces of Earth's crust move suddenly.",
        "The Grand Canyon was carved mainly by the Colorado River.",
        "A glacier is a huge river of ice that moves slowly.",
        "Islands can form from volcanoes under the ocean.",
        "A peninsula is land surrounded by water on three sides.",
        "Clouds are made of tiny water droplets or ice crystals.",
        "Rainbows appear when sunlight bends and reflects inside water drops.",
        "Thunder is the sound made by rapidly expanding air after lightning.",
        "Snowflakes usually have six sides.",
        "Hail forms when storm winds lift water droplets into freezing air.",
        "A tornado is a spinning column of air touching the ground.",
        "Hurricanes get energy from warm ocean water.",
        "Fog is a cloud that forms near the ground.",
        "Wind is moving air caused by differences in air pressure.",
        "A barometer is a tool that measures air pressure.",
        "Your brain uses a lot of your body's energy.",
        "Human bones are strong, but they are also living tissue.",
        "The smallest bones in your body are inside your ear.",
        "Your skin is your body's largest organ.",
        "You blink many times each minute without thinking about it.",
        "Taste buds help you sense sweet, salty, sour, bitter, and umami flavors.",
        "Your lungs take oxygen from the air and move it into your blood.",
        "Blood carries oxygen and nutrients around your body.",
        "Muscles work in pairs to move many parts of your body.",
        "Your fingerprints formed before you were born.",
        "Sound travels faster through water than through air.",
        "Magnets have a north pole and a south pole.",
        "Water expands when it freezes, which is unusual for a liquid.",
        "A shadow changes size when the light source moves.",
        "A prism can split white light into rainbow colors.",
        "Static electricity can make tiny bits of paper jump.",
        "A lever is a simple machine that helps lift or move things.",
        "Friction slows moving objects down.",
        "Gravity pulls objects toward each other.",
        "Recycling aluminum saves a lot of energy compared with making new aluminum."
      ];
      const storyPages = [
        "Mara opened the glowing book and found a map tucked between two pages.",
        "The map led past the moonlit garden to a door with a tiny brass star.",
        "Behind the door was a library where every shelf whispered a different adventure.",
        "Mara chose the quietest whisper and carried a new story home."
      ];
      const recipes = [
        {
          title: "Rainbow Fruit Cup",
          time: "8 min",
          ingredients: "Banana, berries, apple, yoghurt",
          steps: "Wash fruit, chop with an adult nearby, layer colors, add yoghurt."
        },
        {
          title: "Crunchy Wrap",
          time: "10 min",
          ingredients: "Wrap, cheese, cucumber, carrot",
          steps: "Spread, sprinkle, add crunchy veg, roll tightly, slice with help."
        },
        {
          title: "Cosy Toast Faces",
          time: "7 min",
          ingredients: "Toast, spread, fruit slices",
          steps: "Toast bread, add spread, make a smile face with fruit."
        }
      ];

      if (app === "studio") {
        const queue = child.creatorQueue.length
          ? child.creatorQueue.map((item) => `<div class="filter-item"><span>${item}</span><strong>Review</strong></div>`).join("")
          : `<div class="filter-item"><span>No clips waiting</span><strong>Clear</strong></div>`;
        return `
          <div class="mini-grid">
            <div class="mini-card"><span class="small">Prompt</span><strong>Teach a 20-second fact</strong><p class="small">Keep faces, location, and school logos private.</p></div>
            <div class="mini-card"><span class="small">Queue</span><strong>${child.creatorQueue.length}</strong><p class="small">Parent approval required before publishing.</p></div>
          </div>
          <div class="choice-row">
            <button class="approve" data-app-action="record">Record Safe Clip</button>
            <button class="tiny" data-app-action="clearQueue">Clear Queue</button>
          </div>
          <div class="filter-list">${queue}</div>
        `;
      }

      if (app === "explore") {
        return `
          <div class="mini-card"><span class="small">Discovery card</span><strong>Wild Fact</strong><p>${factList[child.explorerFact % factList.length]}</p></div>
          <div class="mini-grid">
            <div class="mini-card"><span class="small">Quest</span><strong>Find 3 habitats</strong><p class="small">Forest, ocean, desert</p></div>
            <div class="mini-card"><span class="small">Earned</span><strong>+8m</strong><p class="small">Added to Explorer report when completed.</p></div>
          </div>
          <div class="choice-row">
            <button class="approve" data-app-action="nextFact">Next Fact</button>
            <button class="tiny" data-app-action="completeQuest">Complete Quest</button>
          </div>
        `;
      }

      if (app === "move") {
        return `
          <div class="mini-card"><span class="small">Activity</span><strong id="moveClock">${moveSeconds}s</strong><p class="small">Desk stretch, dance reset, then deep breath.</p></div>
          <div class="choice-row">
            <button class="approve" data-app-action="startMove">Start Timer</button>
            <button class="tiny" data-app-action="resetMove">Reset</button>
          </div>
        `;
      }

      if (app === "recipe") {
        return `
          <div class="mini-card recipe-card">
            <span class="small">Separate page</span>
            <strong>FlavorNest Recipes</strong>
            <p class="small">Open the full recipe page for search, saved recipes, and adding family meals.</p>
            <a class="mini-link" href="recipe.html">Open Recipe Page</a>
          </div>
          <div class="story-box">Kitchen safety: ask an adult before using knives, heat, blenders, or anything sharp.</div>
        `;
      }

      if (app === "flyer") {
        return `
          <div class="flyer-game">
            <div class="flyer-score">
              <span>Score <strong id="flyerScore">0</strong></span>
              <span>Best <strong id="flyerBest">${Number(child.flyerBest || 0)}</strong></span>
            </div>
            <canvas id="flyerCanvas" width="640" height="360" aria-label="Sprout Flyer game"></canvas>
            <div class="choice-row">
              <button class="approve" data-app-action="startFlyer">Start Game</button>
              <button class="tiny" data-app-action="flapFlyer">Fly</button>
              <button class="tiny" data-app-action="resetFlyer">Restart</button>
            </div>
            <p class="small">Tap the game, click Fly, or press Space to stay in the air.</p>
          </div>
        `;
      }

      return `
        <div class="story-box">${storyPages[child.storyPage % storyPages.length]}</div>
        <div class="mini-grid">
          <div class="mini-card"><span class="small">Bookmark</span><strong>Page ${(child.storyPage % storyPages.length) + 1}</strong><p class="small">Story time adds calm reading minutes.</p></div>
          <div class="mini-card"><span class="small">Mode</span><strong>Read Aloud</strong><p class="small">Soft pacing for bedtime reading.</p></div>
        </div>
        <div class="choice-row">
          <button class="approve" data-app-action="nextPage">Next Page</button>
          <button class="tiny" data-app-action="readTime">Add 10m Reading</button>
        </div>
      `;
    }

    function bindAppActions(app) {
      appBody.querySelectorAll("[data-app-action]").forEach((button) => {
        button.addEventListener("click", () => handleAppAction(app, button.dataset.appAction));
      });
    }

    function handleAppAction(app, action) {
      const child = currentChild();
      ensureChildAppState(child);
      let shouldCelebrate = false;

      if (action === "record") {
        child.creatorQueue.push("Fact clip " + (child.creatorQueue.length + 1));
        child.currentRequest = ["Creator Clip", "Video upload requested from " + child.name + "'s profile", "C", "creatorUpload"];
        child.pending += 1;
        showToast("Clip queued for parent review.");
      } else if (action === "clearQueue") {
        child.creatorQueue = [];
        showToast("Creator review queue cleared.");
      } else if (action === "nextFact") {
        child.explorerFact += 1;
        addReportMinutes("Explorer", 2);
        showToast("New explorer fact opened.");
        shouldCelebrate = true;
      } else if (action === "completeQuest") {
        addReportMinutes("Explorer", 8);
        showToast("Explorer quest completed.");
        shouldCelebrate = true;
      } else if (action === "startMove") {
        startMoveTimer();
        return;
      } else if (action === "resetMove") {
        resetMoveTimer();
        return;
      } else if (action.startsWith("recipe")) {
        child.dailyWins.kind = true;
        child.report.Stories = (child.report.Stories || 0) + 3;
        state.moodCheckins = state.moodCheckins || [];
        state.moodCheckins.unshift({
          child: child.name,
          mood: "Made a FlavorNest snack",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
        showToast("Recipe win saved for " + child.name + ".");
        shouldCelebrate = true;
      } else if (action === "startFlyer") {
        startFlyerGame();
        return;
      } else if (action === "flapFlyer") {
        flapFlyer();
        return;
      } else if (action === "resetFlyer") {
        resetFlyerGame(true);
        return;
      } else if (action === "nextPage") {
        child.storyPage += 1;
        addReportMinutes("Stories", 4);
        showToast("Story page saved.");
        shouldCelebrate = true;
      } else if (action === "readTime") {
        addReportMinutes("Stories", 10);
        showToast("Reading minutes added.");
        shouldCelebrate = true;
      }

      render();
      openApp(app);
      queueSave();
      if (shouldCelebrate) {
        celebrate();
      }
    }

    function startMoveTimer() {
      window.clearInterval(moveTimer);
      moveSeconds = 30;
      const clock = document.querySelector("#moveClock");
      clock.textContent = moveSeconds + "s";
      moveTimer = window.setInterval(() => {
        moveSeconds -= 1;
        clock.textContent = moveSeconds + "s";
        if (moveSeconds <= 0) {
          window.clearInterval(moveTimer);
          addReportMinutes("Movement", 5);
          showToast("Move Break complete.");
          celebrate();
          moveSeconds = 30;
          openApp("move");
        }
      }, 1000);
    }

    function resetMoveTimer() {
      window.clearInterval(moveTimer);
      moveSeconds = 30;
      openApp("move");
      showToast("Move timer reset.");
    }

    function setupFlyerGame() {
      stopFlyerGame();
      const canvas = document.querySelector("#flyerCanvas");
      if (!canvas) {
        return;
      }
      flyerGame = {
        canvas,
        ctx: canvas.getContext("2d"),
        bird: { x: 110, y: 170, vy: 0, size: 22 },
        clouds: [],
        frame: 0,
        score: 0,
        running: false,
        over: false
      };
      canvas.addEventListener("pointerdown", flapFlyer);
      document.addEventListener("keydown", handleFlyerKey);
      resetFlyerGame(false);
    }

    function stopFlyerGame() {
      if (flyerAnimation) {
        window.cancelAnimationFrame(flyerAnimation);
        flyerAnimation = null;
      }
      document.removeEventListener("keydown", handleFlyerKey);
      flyerGame = null;
    }

    function handleFlyerKey(event) {
      if (event.code === "Space" && appModal.classList.contains("open") && flyerGame) {
        event.preventDefault();
        flapFlyer();
      }
    }

    function resetFlyerGame(startNow) {
      if (!flyerGame) {
        return;
      }
      if (flyerAnimation) {
        window.cancelAnimationFrame(flyerAnimation);
        flyerAnimation = null;
      }
      flyerGame.bird = { x: 110, y: 170, vy: 0, size: 22 };
      flyerGame.clouds = [
        { x: 390, gapY: 150, passed: false },
        { x: 650, gapY: 210, passed: false }
      ];
      flyerGame.frame = 0;
      flyerGame.score = 0;
      flyerGame.running = Boolean(startNow);
      flyerGame.over = false;
      updateFlyerScore();
      drawFlyerGame(startNow ? "" : "Press Start");
      if (startNow) {
        loopFlyerGame();
      }
    }

    function startFlyerGame() {
      if (!flyerGame) {
        return;
      }
      if (flyerGame.over) {
        resetFlyerGame(true);
        return;
      }
      flyerGame.running = true;
      flapFlyer();
      loopFlyerGame();
    }

    function flapFlyer() {
      if (!flyerGame) {
        return;
      }
      if (flyerGame.over) {
        resetFlyerGame(true);
        return;
      }
      flyerGame.running = true;
      flyerGame.bird.vy = -6.2;
    }

    function loopFlyerGame() {
      if (!flyerGame || !flyerGame.running) {
        return;
      }
      if (flyerAnimation) {
        return;
      }
      flyerAnimation = window.requestAnimationFrame(() => {
        flyerAnimation = null;
        updateFlyerGame();
        drawFlyerGame("");
        if (flyerGame && flyerGame.running) {
          loopFlyerGame();
        }
      });
    }

    function updateFlyerGame() {
      const game = flyerGame;
      const bird = game.bird;
      const gap = 120;
      game.frame += 1;
      bird.vy += 0.26;
      bird.y += bird.vy;
      game.clouds.forEach((cloud) => {
        cloud.x -= 1.65;
        if (!cloud.passed && cloud.x + 42 < bird.x) {
          cloud.passed = true;
          game.score += 1;
          updateFlyerScore();
        }
      });
      if (game.clouds[0].x < -80) {
        game.clouds.shift();
        game.clouds.push({
          x: game.clouds[game.clouds.length - 1].x + 310,
          gapY: 92 + Math.round(Math.random() * 148),
          passed: false
        });
      }
      const hitEdge = bird.y < 8 || bird.y + bird.size > game.canvas.height - 34;
      const hitCloud = game.clouds.some((cloud) => (
        bird.x + bird.size > cloud.x &&
        bird.x < cloud.x + 58 &&
        (bird.y < cloud.gapY - gap / 2 || bird.y + bird.size > cloud.gapY + gap / 2)
      ));
      if (hitEdge || hitCloud) {
        finishFlyerGame();
      }
    }

    function drawFlyerGame(message) {
      const game = flyerGame;
      if (!game) {
        return;
      }
      const { canvas, ctx, bird, clouds } = game;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#bdefff");
      sky.addColorStop(1, "#effadf");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
      for (let index = 0; index < 6; index += 1) {
        const x = (index * 125 + game.frame * 0.45) % 760 - 80;
        const y = 38 + (index % 3) * 34;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 22, y - 8, 24, 0, Math.PI * 2);
        ctx.arc(x + 48, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      clouds.forEach((cloud) => {
        drawCloudWall(ctx, cloud.x, 0, cloud.gapY - 60);
        drawCloudWall(ctx, cloud.x, cloud.gapY + 60, canvas.height - cloud.gapY - 94);
      });

      ctx.fillStyle = "#6fbf73";
      ctx.fillRect(0, canvas.height - 34, canvas.width, 34);
      ctx.fillStyle = "#4c9a59";
      ctx.fillRect(0, canvas.height - 34, canvas.width, 6);

      ctx.fillStyle = "#f4c14a";
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, bird.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff4c1";
      ctx.beginPath();
      ctx.ellipse(bird.x - 5, bird.y + 2, 12, 8, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#17202a";
      ctx.beginPath();
      ctx.arc(bird.x + 7, bird.y - 7, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#df604a";
      ctx.beginPath();
      ctx.moveTo(bird.x + bird.size - 2, bird.y);
      ctx.lineTo(bird.x + bird.size + 12, bird.y + 6);
      ctx.lineTo(bird.x + bird.size - 2, bird.y + 12);
      ctx.fill();

      if (message || game.over) {
        ctx.fillStyle = "rgba(23, 32, 42, 0.74)";
        ctx.fillRect(190, 126, 260, 90);
        ctx.fillStyle = "white";
        ctx.font = "700 24px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(game.over ? "Nice try!" : message, canvas.width / 2, 166);
        ctx.font = "600 14px system-ui";
        ctx.fillText(game.over ? "Tap Restart to fly again" : "Tap, click, or press Space", canvas.width / 2, 192);
      }
    }

    function drawCloudWall(ctx, x, y, height) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, 58, height);
      ctx.fillStyle = "#dff4f8";
      for (let offset = 0; offset < height + 32; offset += 28) {
        ctx.beginPath();
        ctx.arc(x + 8, y + offset, 15, 0, Math.PI * 2);
        ctx.arc(x + 30, y + offset + 4, 18, 0, Math.PI * 2);
        ctx.arc(x + 54, y + offset, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function updateFlyerScore() {
      const child = currentChild();
      const score = flyerGame ? flyerGame.score : 0;
      document.querySelector("#flyerScore").textContent = score;
      document.querySelector("#flyerBest").textContent = Math.max(Number(child.flyerBest || 0), score);
    }

    function finishFlyerGame() {
      const child = currentChild();
      if (flyerAnimation) {
        window.cancelAnimationFrame(flyerAnimation);
        flyerAnimation = null;
      }
      flyerGame.running = false;
      flyerGame.over = true;
      child.flyerBest = Math.max(Number(child.flyerBest || 0), flyerGame.score);
      child.report.Games = (child.report.Games || 0) + Math.max(1, flyerGame.score);
      updateFlyerScore();
      drawFlyerGame("");
      renderReport(child);
      queueSave();
      showToast("Sprout Flyer score: " + flyerGame.score + ".");
    }

    function closeApp() {
      window.clearInterval(moveTimer);
      stopFlyerGame();
      appModal.classList.remove("open");
      appModal.setAttribute("aria-hidden", "true");
      closeTimer = window.setTimeout(() => {
        appBody.innerHTML = "";
      }, 230);
    }

    function nextRequest() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        setMode("parent", { unlocked: true });
        return;
      }
      ensureChildAppState(child);
      requestIndex = (requestIndex + 1) % requestNames.length;
      const [name, initial, type] = requestNames[requestIndex];
      if (child.homeworkMode && (type === "Game app" || type === "Video app")) {
        showToast("Homework Mode is blocking game and video requests.");
        sendSafetyAlert("Homework Mode blocked a " + type.toLowerCase() + " request");
        return;
      }
      child.currentRequest = [name, `${type} requested from ${child.name}'s ${child.device}`, initial, "appDownload"];
      child.pending += 1;
      render();
      queueSave();
      showToast("Request sent to parent dashboard.");
      celebrate();
    }

    function sendSafetyAlert(message) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      state.safetyAlerts = state.safetyAlerts || [];
      state.safetyAlerts.unshift({
        child: child.name,
        message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      renderSafetyAlerts();
      queueSave();
      showToast("Sent to parent dashboard.");
    }

    function handleHelpAction(action) {
      if (action === "needHelp") {
        sendSafetyAlert("Needs help now");
      } else if (action === "extraTime") {
        const child = currentChild();
        if (!child) {
          showToast("Add a child profile first.");
          return;
        }
        child.currentRequest = ["Extra Time", "Extra screen time requested from " + child.name + "'s profile", "+", "extraTime"];
        child.pending += 1;
        render();
        queueSave();
        showToast("Extra time request sent.");
        celebrate();
      } else if (action === "calmBreak") {
        addReportMinutes("Movement", 2);
        openApp("move");
        showToast("Calm break started.");
        celebrate();
      }
    }

    function sendMoodCheckin(mood) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      state.moodCheckins = state.moodCheckins || [];
      state.moodCheckins.unshift({
        child: child.name,
        mood,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      if (mood === "Need help") {
        sendSafetyAlert("Mood check-in says they need help");
      }
      renderMoodCheckins();
      queueSave();
      showToast("Mood check-in sent.");
      if (mood !== "Need help") {
        celebrate();
      }
    }

    function saveFamilyRules() {
      state.familyRules = rulesInput.value
        .split(/\r?\n/)
        .map((rule) => rule.trim())
        .filter(Boolean);
      renderFamilyRules();
      queueSave();
      showToast("Family rules saved.");
    }

    function saveChores() {
      state.chores = choresInput.value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ title: line }));
      renderChores();
      queueSave();
      showToast("Chores saved.");
    }

    function saveFocusGoal() {
      state.focusGoal = focusInput.value.trim() || "Focus for 15 minutes";
      renderFocus();
      queueSave();
      showToast("Focus goal saved.");
    }

    function saveParentNote() {
      state.parentNote = document.querySelector("#parentNoteInput").value.trim();
      renderParentNote();
      queueSave();
      showToast(state.parentNote ? "Parent note saved." : "Parent note cleared.");
    }

    function saveSchedule() {
      state.schedule = {
        schoolStart: document.querySelector("#schoolStartInput").value || "08:45",
        schoolEnd: document.querySelector("#schoolEndInput").value || "15:15",
        bedtimeStart: document.querySelector("#bedtimeStartInput").value || "20:30",
        bedtimeEnd: document.querySelector("#bedtimeEndInput").value || "07:00"
      };
      renderFamilySchedule();
      queueSave();
      showToast("Family schedule saved.");
    }

    function exportWeeklySummary() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      const summary = {
        app: "KiddoSprout",
        exportedAt: new Date().toISOString(),
        familyName: state.familyName,
        child: {
          name: child.name,
          device: child.device,
          schoolYear: child.schoolYear || "",
          dailyLimit: child.dailyLimit,
          usedToday: child.usedToday,
          pendingRequests: child.pending,
          blockedHits: child.blockedHits,
          bedtimeLocked: Boolean(child.bedtime)
        },
        schedule: state.schedule,
        wellbeing: {
          dailyWins: child.dailyWins || {},
          waterCount: child.waterCount || 0,
          eyeBreaks: child.eyeBreaks || 0,
          readingLog: child.readingLog || [],
          kindnessPoints: child.kindnessPoints || 0
        },
        reports: {
          appMinutes: child.report || {},
          safetyAlerts: state.safetyAlerts || [],
          moodCheckins: state.moodCheckins || [],
          problemReports: state.problemReports || [],
          scanHistory: state.scanHistory || []
        }
      };
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "kiddosprout-weekly-summary-" + child.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      showToast("Weekly summary downloaded.");
    }

    function startFocusSession() {
      window.clearInterval(focusTimer);
      focusTimer = window.setInterval(() => {
        focusSeconds = Math.max(0, focusSeconds - 1);
        document.querySelector("#focusClock").textContent = formatClock(focusSeconds);
        if (focusSeconds === 0) {
          window.clearInterval(focusTimer);
          completeFocusSession();
        }
      }, 1000);
      showToast("Focus session started.");
    }

    function resetFocusSession() {
      window.clearInterval(focusTimer);
      focusSeconds = 900;
      renderFocus();
      showToast("Focus session reset.");
    }

    function completeFocusSession() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      const message = "Please check my focus work: " + (state.focusGoal || "Focus session");
      child.currentRequest = ["Parent Chat", `${child.name}: ${message}`, "P", "parentChat", message];
      child.pending += 1;
      focusSeconds = 900;
      renderControls(child);
      queueSave();
      showToast("Message sent to parent for checking.");
    }

    function sendParentChat() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      const type = document.querySelector("#parentChatType").value;
      const note = document.querySelector("#parentChatMessage").value.trim();
      const message = note ? type + ": " + note : type;
      child.currentRequest = ["Parent Chat", `${child.name}: ${message}`, "P", "parentChat", message];
      child.pending += 1;
      document.querySelector("#parentChatMessage").value = "";
      render();
      queueSave();
      showToast("Parent chat sent.");
    }

    function clearParentChat() {
      document.querySelector("#parentChatMessage").value = "";
      document.querySelector("#parentChatType").value = "Please check my homework";
      showToast("Parent chat cleared.");
    }

    function submitChore(index) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      const chore = (state.chores || [])[index];
      if (!chore) {
        return;
      }
      child.currentRequest = [
        chore.title,
        `${child.name} marked a helpful chore as done.`,
        "C",
        "choreComplete"
      ];
      child.pending += 1;
      render();
      queueSave();
      showToast("Chore sent for parent approval.");
    }

    function approveCurrentRequest(child) {
      ensureChildAppState(child);
      const kind = child.currentRequest[3] || "appDownload";
      if (kind === "creatorUpload") {
        child.creatorQueue = child.creatorQueue.slice(1);
      } else if (kind === "extraTime") {
        child.dailyLimit += 15;
      } else if (kind === "choreComplete") {
        child.report.Stories = (child.report.Stories || 0) + 2;
        child.streaks.chores += 1;
      } else if (kind === "parentChat") {
        if (String(child.currentRequest[4] || "").toLowerCase().includes("homework")) {
          child.streaks.homework += 1;
        }
      } else if (kind === "appAccess") {
        setAppRule(child, child.currentRequest[4], "allowed");
      } else if (kind === "flyerAccess") {
        setAppRule(child, "flyer", "allowed");
      }
      child.pending = Math.max(0, child.pending - 1);
    }

    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.querySelector("#" + button.dataset.jump);
        if (target) {
          if (target.tagName === "DETAILS") {
            target.open = true;
          }
          const parentPanel = target.closest("details");
          if (parentPanel) {
            parentPanel.open = true;
          }
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        document.querySelectorAll(".nav button").forEach((item) => item.classList.remove("active"));
        if (button.closest(".nav")) {
          button.classList.add("active");
        }
      });
    });

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const filter = button.dataset.filter;
        hubCards.forEach((card) => {
          card.style.display = filter === "all" || card.dataset.kind === filter ? "" : "none";
        });
      });
    });

    document.querySelectorAll("[data-open-app]").forEach((button) => {
      button.addEventListener("click", () => openApp(button.dataset.openApp));
    });
    document.querySelectorAll("[data-open-app-link]").forEach((link) => {
      link.addEventListener("click", openLinkedApp);
    });
    document.querySelectorAll("[data-help-action]").forEach((button) => {
      button.addEventListener("click", () => handleHelpAction(button.dataset.helpAction));
    });
    document.querySelectorAll("[data-mood]").forEach((button) => {
      button.addEventListener("click", () => sendMoodCheckin(button.dataset.mood));
    });

    document.querySelector("#modeToggle").addEventListener("click", () => setMode(viewMode === "child" ? "parent" : "child"));
    document.querySelector("#heroChildMode").addEventListener("click", () => setMode("child"));
    document.querySelector("#childAskApp").addEventListener("click", nextRequest);
    document.querySelector("#unlockParent").addEventListener("click", unlockParent);
    document.querySelector("#backToChild").addEventListener("click", () => setMode("child"));
    document.querySelector("#openSignup").addEventListener("click", () => setMode("signup"));
    document.querySelector("#savePasscodeSetting").addEventListener("click", saveParentPasscode);
    document.querySelector("#saveSecondParent").addEventListener("click", saveSecondParent);
    settingsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setSettingsMenu(!settingsMenu.classList.contains("open"));
    });
    settingsClose.addEventListener("click", closeSettingsMenu);
    settingsMenu.addEventListener("click", (event) => event.stopPropagation());
    quickParentSettings.addEventListener("click", openParentSettingsFromMenu);
    themeModeSetting.addEventListener("change", () => saveThemeMode(themeModeSetting.value));
    quickThemeModeSetting.addEventListener("change", () => saveThemeMode(quickThemeModeSetting.value));
    document.querySelector("#saveRules").addEventListener("click", saveFamilyRules);
    document.querySelector("#saveChores").addEventListener("click", saveChores);
    document.querySelector("#saveFocus").addEventListener("click", saveFocusGoal);
    document.querySelector("#saveParentNote").addEventListener("click", saveParentNote);
    document.querySelector("#saveWellbeing").addEventListener("click", saveWellbeingGoals);
    document.querySelector("#saveTrustedContacts").addEventListener("click", saveTrustedContacts);
    document.querySelector("#saveSchedule").addEventListener("click", saveSchedule);
    document.querySelector("#addChild").addEventListener("click", addChildProfile);
    removeChildButton.addEventListener("click", removeSelectedChild);
    document.querySelector("#saveKidAvatar").addEventListener("click", saveKidAvatar);
    kidAvatarIcon.addEventListener("input", updateKidAvatarPreview);
    kidAvatarColor.addEventListener("input", () => {
      kidAvatarColorText.value = kidAvatarColor.value;
      updateKidAvatarPreview();
    });
    kidAvatarColorText.addEventListener("input", () => {
      const color = colorTextToHex(kidAvatarColorText.value);
      if (color) {
        kidAvatarColor.value = color;
        updateKidAvatarPreview();
      }
    });
    kidCostume.addEventListener("input", updateKidAvatarPreview);
    avatarChoiceButtons.forEach((button) => {
      button.addEventListener("click", () => {
        kidAvatarIcon.value = button.dataset.avatarChoice;
        updateKidAvatarPreview();
      });
    });
    newChildDob.max = new Date().toISOString().slice(0, 10);
    editChildDob.max = new Date().toISOString().slice(0, 10);
    newChildDob.addEventListener("input", updateNewChildWarning);
    editChildDob.addEventListener("input", updateEditChildWarning);
    document.querySelector("#saveChildProfile").addEventListener("click", saveSelectedChildProfile);
    newChildName.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addChildProfile();
      }
    });
    document.querySelector("#createAccount").addEventListener("click", createAccount);
    downloadSignupButton.addEventListener("click", () => installKiddoSproutApp(downloadSignupButton));
    downloadKiddoSproutButton.addEventListener("click", () => installKiddoSproutApp(downloadKiddoSproutButton));
    document.querySelector("#loginKiddoSprout").addEventListener("click", loginKiddoSprout);
    document.querySelector("#loginToSignup").addEventListener("click", () => setMode("signup"));
    document.querySelector("#signupToLogin").addEventListener("click", () => setMode("login"));
    resendLoginEmailButton.addEventListener("click", () => resendKiddoSproutEmail("login"));
    resendSignupEmailButton.addEventListener("click", () => resendKiddoSproutEmail("signup"));
    document.querySelector("#signupToChild").addEventListener("click", () => setMode("child"));
    document.querySelector("#forgotPassword").addEventListener("click", () => {
      forgotPanel.style.display = forgotPanel.style.display === "none" ? "grid" : "none";
      passcodeStatus.textContent = "";
    });
    document.querySelector("#sendRecoveryCode").addEventListener("click", sendRecoveryCode);
    document.querySelector("#resetPasscode").addEventListener("click", resetPasscodeWithCode);
    viewPassword.addEventListener("change", () => {
      passcodeInput.type = viewPassword.checked ? "text" : "password";
    });
    viewLoginPassword.addEventListener("change", () => {
      loginPassword.type = viewLoginPassword.checked ? "text" : "password";
    });
    loginPassword.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loginKiddoSprout();
      }
    });
    loginEmail.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        loginKiddoSprout();
      }
    });
    viewSettingPassword.addEventListener("change", () => {
      passcodeSetting.type = viewSettingPassword.checked ? "text" : "password";
    });
    viewSignupPassword.addEventListener("change", () => {
      signupPasscode.type = viewSignupPassword.checked ? "text" : "password";
    });
    viewRecoveryPassword.addEventListener("change", () => {
      recoveryPasscode.type = viewRecoveryPassword.checked ? "text" : "password";
    });
    passcodeSetting.addEventListener("input", () => {
      passcodeSettingStatus.textContent = "Unsaved";
    });
    passcodeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        unlockParent();
      }
    });
    window.addEventListener("popstate", () => {
      parentUnlocked = window.sessionStorage.getItem("parentUnlocked") === "true";
      const nextMode = (window.location.hash || "#login").slice(1);
      setMode(["child", "parent", "signup", "login"].includes(nextMode) ? nextMode : "login", { quiet: true });
    });
    document.querySelector("#saveNow").addEventListener("click", () => saveState(true));
    document.querySelector("#resetPlan").addEventListener("click", resetTodayPlan);
    document.querySelector("#newSpark").addEventListener("click", nextDailySpark);
    parentHomeworkToggle.addEventListener("change", toggleHomeworkMode);
    document.querySelector("#resetDailyWins").addEventListener("click", resetDailyWins);
    document.querySelector("#completeKindness").addEventListener("click", completeKindnessQuest);
    document.querySelector("#nextKindness").addEventListener("click", nextKindnessQuest);
    document.querySelector("#addReading").addEventListener("click", addReadingLog);
    document.querySelector("#addWater").addEventListener("click", addWaterBreak);
    document.querySelector("#addEyeBreak").addEventListener("click", addEyeBreak);
    document.querySelector("#sendParentChat").addEventListener("click", sendParentChat);
    document.querySelector("#clearParentChat").addEventListener("click", clearParentChat);
    document.querySelector("#parentChatMessage").addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        sendParentChat();
      }
    });
    document.querySelector("#submitProblemReport")?.addEventListener("click", submitProblemReport);
    document.querySelector("#clearProblemForm")?.addEventListener("click", clearProblemForm);
    document.querySelector("#startFocus").addEventListener("click", startFocusSession);
    document.querySelector("#resetFocus").addEventListener("click", resetFocusSession);
    document.querySelector("#completeFocus").addEventListener("click", completeFocusSession);
    document.querySelector("#closeApp").addEventListener("click", closeApp);
    appModal.addEventListener("click", (event) => {
      if (event.target === appModal) {
        closeApp();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && appModal.classList.contains("open")) {
        closeApp();
      }
    });
    document.addEventListener("click", addButtonRipple);
    document.addEventListener("click", closeSettingsMenu);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSettingsMenu();
      }
    });

    document.querySelector("#approveBtn").addEventListener("click", () => {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      const requestName = child.currentRequest[0];
      approveCurrentRequest(child);
      render();
      queueSave();
      showToast(requestName + " approved for " + child.name + ".");
    });

    document.querySelector("#blockBtn").addEventListener("click", () => {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      const requestName = child.currentRequest[0];
      const kind = child.currentRequest[3] || "appDownload";
      if (kind === "appAccess") {
        setAppRule(child, child.currentRequest[4], "blocked");
      } else if (kind === "flyerAccess") {
        setAppRule(child, "flyer", "blocked");
      }
      child.pending = Math.max(0, child.pending - 1);
      render();
      queueSave();
      showToast(requestName + " blocked for " + child.name + ".");
    });

    document.querySelector("#limitRange").addEventListener("input", (event) => {
      const child = currentChild();
      if (!child) {
        event.target.value = 30;
        showToast("Add a child profile first.");
        return;
      }
      child.dailyLimit = Number(event.target.value);
      decorateRange(event.target);
      renderControls(child);
      queueSave();
    });

    document.querySelector("#bedtimeToggle").addEventListener("change", (event) => {
      const child = currentChild();
      if (!child) {
        event.target.checked = false;
        showToast("Add a child profile first.");
        return;
      }
      child.bedtime = event.target.checked;
      renderControls(child);
      queueSave();
      showToast(child.bedtime ? child.name + "'s bedtime lock is active." : child.name + "'s bedtime lock is off.");
    });
    flyerAllowedToggle.addEventListener("change", (event) => {
      const child = currentChild();
      if (!child) {
        event.target.checked = false;
        showToast("Add a child profile first.");
        return;
      }
      setAppRule(child, "flyer", event.target.checked ? "allowed" : "request");
      renderControls(child);
      queueSave();
      showToast(event.target.checked ? "Sprout Flyer allowed for " + child.name + "." : "Sprout Flyer will ask before play.");
    });

    document.querySelector("#scanBtn").addEventListener("click", () => {
      runRealScan();
    });

    document.querySelector("#clearAlerts").addEventListener("click", () => {
      state.safetyAlerts = [];
      renderSafetyAlerts();
      queueSave();
      showToast("Safety alerts cleared.");
    });

    document.querySelector("#clearMood").addEventListener("click", () => {
      state.moodCheckins = [];
      renderMoodCheckins();
      queueSave();
      showToast("Mood check-ins cleared.");
    });

    document.querySelector("#clearProblemReports").addEventListener("click", () => {
      state.problemReports = [];
      renderProblemReports();
      queueSave();
      showToast("Problem reports cleared.");
    });
    document.querySelector("#exportWeeklySummary").addEventListener("click", exportWeeklySummary);

    try {
      state = JSON.parse(window.localStorage.getItem("kiddosproutState")) || JSON.parse(JSON.stringify(DEFAULT_STATE));
    } catch (error) {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    cleanSavedBranding(state);
    removeDemoChildren(state);
    const existingKiddoSession = getKiddoSession();
    if (existingKiddoSession?.user?.email) {
      state.parentEmail ||= existingKiddoSession.user.email;
      state.parentName ||= existingKiddoSession.user.user_metadata?.name || "Parent";
      state.familyName ||= "KiddoSprout Family";
      state.parentAccountCreated = true;
      parentUnlocked = true;
      window.sessionStorage.setItem("parentUnlocked", "true");
      if (viewMode === "login") {
        viewMode = "parent";
      }
    }
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      kiddoInstallPrompt = event;
      [downloadSignupButton, downloadKiddoSproutButton].forEach((button) => {
        if (!button) return;
        button.disabled = false;
        button.textContent = button === downloadSignupButton ? "Install App" : "Install KiddoSprout App";
      });
    });
    window.addEventListener("appinstalled", () => {
      kiddoInstallPrompt = null;
      showToast("KiddoSprout installed.");
    });
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch(() => {
          showToast("Offline install setup could not start.");
        });
      });
    }
    state.parentAccountCreated ??= Boolean(state.parentEmail && state.parentName);
    if (!state.parentAccountCreated) {
      state.parentEmail = "";
      state.secondParentEmail = "";
    }
    state.themeMode ??= "auto";
    applyThemeMode(state.themeMode);
    window.setInterval(() => {
      if (state.themeMode === "auto") {
        applyThemeMode("auto");
      }
    }, 60000);
    setMode(viewMode, { quiet: true });
