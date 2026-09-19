    const navButtons = document.querySelectorAll("[data-jump]");
    const featureFolders = document.querySelectorAll(".feature-folder");
    const tabButtons = document.querySelectorAll("[data-filter]");
    const hubCards = document.querySelectorAll(".hub-card");
    const toast = document.querySelector("#toast");
    const burstLayer = document.querySelector("#burstLayer");
    const appModal = document.querySelector("#appModal");
    const appTitle = document.querySelector("#appTitle");
    const appSubtitle = document.querySelector("#appSubtitle");
    const appBody = document.querySelector("#appBody");
    const parentGate = document.querySelector("#parentGate");
    const appShell = document.querySelector(".shell");
    const lockBox = document.querySelector(".lock-box");
    const passcodeInput = document.querySelector("#passcodeInput");
    const viewPassword = document.querySelector("#viewPassword");
    const passcodeSetting = document.querySelector("#passcodeSetting");
    const viewSettingPassword = document.querySelector("#viewSettingPassword");
    const passcodeSettingStatus = document.querySelector("#passcodeSettingStatus");
    const savePasscodeSettingButton = document.querySelector("#savePasscodeSetting");
    const themeModeSetting = document.querySelector("#themeModeSetting");
    const themeModeStatus = document.querySelector("#themeModeStatus");
    const quickThemeModeStatus = document.querySelector("#quickThemeModeStatus");
    const languageModeSetting = document.querySelector("#languageModeSetting");
    const secondParentNameSetting = document.querySelector("#secondParentNameSetting");
    const secondParentEmailSetting = document.querySelector("#secondParentEmailSetting");
    const secondParentStatus = document.querySelector("#secondParentStatus");
    const settingsToggle = document.querySelector("#settingsToggle");
    const settingsMenu = document.querySelector("#settingsMenu");
    const settingsClose = document.querySelector("#settingsClose");
    const quickThemeModeSetting = document.querySelector("#quickThemeModeSetting");
    const quickLanguageModeSetting = document.querySelector("#quickLanguageModeSetting");
    const quickParentSettings = document.querySelector("#quickParentSettings");
    const logoutKiddoSproutButton = document.querySelector("#logoutKiddoSprout");
    const loginForm = document.querySelector("#loginForm");
    const accountLoginFields = document.querySelector("#accountLoginFields");
    const loginEmail = document.querySelector("#loginEmail");
    const loginPassword = document.querySelector("#loginPassword");
    const viewLoginPassword = document.querySelector("#viewLoginPassword");
    const loginStatus = document.querySelector("#loginStatus");
    const loginSupabaseStatus = document.querySelector("#loginSupabaseStatus");
    const googleLoginChoice = document.querySelector("#googleLoginChoice");
    const googleLoginButton = document.querySelector("#googleLogin");
    const googleLoginStatus = document.querySelector("#googleLoginStatus");
    const loginAuthDivider = document.querySelector("#loginAuthDivider");
    const forgotAccountPasswordButton = document.querySelector("#forgotAccountPassword");
    const accountPasswordRecoveryPanel = document.querySelector("#accountPasswordRecoveryPanel");
    const accountPasswordRecoveryHelp = document.querySelector("#accountPasswordRecoveryHelp");
    const accountPasswordRecoveryRequestFields = document.querySelector("#accountPasswordRecoveryRequestFields");
    const accountPasswordUpdateFields = document.querySelector("#accountPasswordUpdateFields");
    const sendAccountPasswordRecoveryButton = document.querySelector("#sendAccountPasswordRecovery");
    const cancelAccountPasswordRecoveryButton = document.querySelector("#cancelAccountPasswordRecovery");
    const accountPasswordNew = document.querySelector("#accountPasswordNew");
    const accountPasswordConfirm = document.querySelector("#accountPasswordConfirm");
    const viewAccountPassword = document.querySelector("#viewAccountPassword");
    const updateAccountPasswordButton = document.querySelector("#updateAccountPassword");
    const cancelAccountPasswordUpdateButton = document.querySelector("#cancelAccountPasswordUpdate");
    const accountPasswordRecoveryStatus = document.querySelector("#accountPasswordRecoveryStatus");
    const signupForm = document.querySelector("#signupForm");
    const signupFamily = document.querySelector("#signupFamily");
    const signupParent = document.querySelector("#signupParent");
    const signupEmail = document.querySelector("#signupEmail");
    const signupParentTwo = document.querySelector("#signupParentTwo");
    const signupEmailTwo = document.querySelector("#signupEmailTwo");
    const signupPassword = document.querySelector("#signupPassword");
    const signupPasswordConfirm = document.querySelector("#signupPasswordConfirm");
    const signupPasscode = document.querySelector("#signupPasscode");
    const createAccountButton = document.querySelector("#createAccount");
    const viewSignupPassword = document.querySelector("#viewSignupPassword");
    const signupStatus = document.querySelector("#signupStatus");
    const googleSignupChoice = document.querySelector("#googleSignupChoice");
    const googleSignupButton = document.querySelector("#googleSignup");
    const googleSignupStatus = document.querySelector("#googleSignupStatus");
    const signupAuthDivider = document.querySelector("#signupAuthDivider");
    const googleOnboardingIntro = document.querySelector("#googleOnboardingIntro");
    const signupTrackIntro = document.querySelector("#signupTrackIntro");
    const signupTrackTitle = document.querySelector("#signupTrackTitle");
    const signupTrackHelp = document.querySelector("#signupTrackHelp");
    const signupProgress = document.querySelector("#signupProgress");
    const googleOnboardingActions = document.querySelector("#googleOnboardingActions");
    const finishGoogleSetupButton = document.querySelector("#finishGoogleSetup");
    const signupDetailsFields = document.querySelector("#signupDetailsFields");
    const signupHumanCheckCard = document.querySelector("#signupHumanCheckCard");
    const emailSignupActions = document.querySelector("#emailSignupActions");
    const signupEmailAvailability = document.querySelector("#signupEmailAvailability");
    const signupEmailLabel = document.querySelector("#signupEmailLabel");
    const signupPasswordLabel = document.querySelector("#signupPasswordLabel");
    const signupNoteTitle = document.querySelector("#signupNoteTitle");
    const signupNoteText = document.querySelector("#signupNoteText");
    const signupBenefitEmail = document.querySelector("#signupBenefitEmail");
    const downloadSignupButton = document.querySelector("#downloadSignup");
    const signupInstallStatus = document.querySelector("#signupInstallStatus");
    const resendLoginEmailButton = document.querySelector("#resendLoginEmail");
    const resendSignupEmailButton = document.querySelector("#resendSignupEmail");
    const loginHumanCheck = document.querySelector("#loginHumanCheck");
    const loginHumanCheckStatus = document.querySelector("#loginHumanCheckStatus");
    const signupHumanCheck = document.querySelector("#signupHumanCheck");
    const signupHumanCheckStatus = document.querySelector("#signupHumanCheckStatus");
    const recoveryHumanCheck = document.querySelector("#recoveryHumanCheck");
    const recoveryHumanCheckStatus = document.querySelector("#recoveryHumanCheckStatus");
    const emailConfirmationCard = document.querySelector("#emailConfirmationCard");
    const confirmationEmail = document.querySelector("#confirmationEmail");
    const checkEmailConfirmationButton = document.querySelector("#checkEmailConfirmation");
    const restartEmailSignupButton = document.querySelector("#restartEmailSignup");
    const achievementTitle = document.querySelector("#achievementTitle");
    const achievementTarget = document.querySelector("#achievementTarget");
    const achievementReward = document.querySelector("#achievementReward");
    const achievementStatus = document.querySelector("#achievementStatus");
    const achievementChartList = document.querySelector("#achievementChartList");
    const openAchievementLockButton = document.querySelector("#openAchievementLock");
    const achievementLockedNote = document.querySelector("#achievementLockedNote");
    const achievementLockPanel = document.querySelector("#achievementLockPanel");
    const achievementPasscode = document.querySelector("#achievementPasscode");
    const viewAchievementPasscode = document.querySelector("#viewAchievementPasscode");
    const unlockAchievementEditorButton = document.querySelector("#unlockAchievementEditor");
    const cancelAchievementUnlockButton = document.querySelector("#cancelAchievementUnlock");
    const achievementLockStatus = document.querySelector("#achievementLockStatus");
    const achievementEditor = document.querySelector("#achievementEditor");
    const lockAchievementEditorButton = document.querySelector("#lockAchievementEditor");
    const forgotPanel = document.querySelector("#forgotPanel");
    const forgotPasswordButton = document.querySelector("#forgotPassword");
    const googleRecoveryChoice = document.querySelector("#googleRecoveryChoice");
    const googleRecoveryButton = document.querySelector("#googleRecovery");
    const googleRecoveryStatus = document.querySelector("#googleRecoveryStatus");
    const emailRecoveryFlow = document.querySelector("#emailRecoveryFlow");
    const recoveryEmailAvailability = document.querySelector("#recoveryEmailAvailability");
    const recoveryEmail = document.querySelector("#recoveryEmail");
    const recoveryCode = document.querySelector("#recoveryCode");
    const recoveryPasscode = document.querySelector("#recoveryPasscode");
    const viewRecoveryPassword = document.querySelector("#viewRecoveryPassword");
    const rulesInput = document.querySelector("#rulesInput");
    const choresInput = document.querySelector("#choresInput");
    const focusInput = document.querySelector("#focusInput");
    const trustedContactsInput = document.querySelector("#trustedContactsInput");
    const trustedContactsStatus = document.querySelector("#trustedContactsStatus");
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
    const passcodeLockoutCountdown = document.querySelector("#passcodeLockoutCountdown");
    const downloadKiddoSproutButton = document.querySelector("#downloadKiddoSprout");
    const parentInstallStatus = document.querySelector("#parentInstallStatus");
    const pwaUpdateNotice = document.querySelector("#pwaUpdateNotice");
    const pwaUpdateTitle = document.querySelector("#pwaUpdateTitle");
    const pwaUpdateMessage = document.querySelector("#pwaUpdateMessage");
    const pwaUpdateNowButton = document.querySelector("#pwaUpdateNow");
    const demoBanner = document.querySelector("#demoBanner");
    const exploreDemoButton = document.querySelector("#exploreDemo");
    const resetDemoButton = document.querySelector("#resetDemo");
    const exitDemoButton = document.querySelector("#exitDemo");
    const SUPABASE_CONFIG = window.KIDDO_SPROUT_SUPABASE || {};
    const KIDDO_AUTH_SESSION_KEY = "kiddosproutSupabaseSession";
    const FLAVORNEST_AUTH_SESSION_KEY = "flavornest_session";
    const FAMILY_STATE_KEY = "kiddosproutState";
    const FAMILY_PREFERENCES_KEY = "kiddosproutPreferences";
    const DEFAULT_SUPABASE_URL = "";
    const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "";
    const KIDDO_MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
    const PUBLIC_DEMO_ONLY = SUPABASE_CONFIG.publicDemoOnly === true;
    const OFFLINE_SAFE_MODE = PUBLIC_DEMO_ONLY && SUPABASE_CONFIG.offline === true;
    function cleanSupabaseUrl(value) {
      const url = String(value || "").trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
      const isManagedUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
      const isLocalUrl = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
      if (!isManagedUrl && !isLocalUrl) return "";
      if (url.includes("your_supabase")) return "";
      return url;
    }
    function cleanSupabaseKey(value) {
      const key = String(value || "").trim();
      if (!key || key.includes("your_supabase")) return "";
      if (KIDDO_MODERN_PUBLISHABLE_KEY.test(key)) return key;
      const parts = key.split(".");
      if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return "";
      try {
        const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
          .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
        return String(JSON.parse(window.atob(payload))?.role || "").toLowerCase() === "anon" ? key : "";
      } catch (error) {
        return "";
      }
    }
    const SUPABASE_URL = cleanSupabaseUrl(SUPABASE_CONFIG.url) || DEFAULT_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = cleanSupabaseKey(SUPABASE_CONFIG.publishableKey || SUPABASE_CONFIG.anonKey) || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
    const SUPABASE_CONNECTED = Boolean(!PUBLIC_DEMO_ONLY && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
    const AUTH_EMAIL_DELIVERY_READY = Boolean(!PUBLIC_DEMO_ONLY && SUPABASE_CONFIG.emailDeliveryReady === true);
    const GOOGLE_AUTH_CONFIGURED = Boolean(!PUBLIC_DEMO_ONLY && SUPABASE_CONFIG.googleAuthReady === true);
    const EMAIL_DELIVERY_UNAVAILABLE_MESSAGE = "Email sign-up and recovery are not available on this KiddoSprout setup yet. A grown-up can use Google sign-in if it is offered.";
    const ACCOUNT_RECOVERY_REQUEST_MESSAGE = "If a KiddoSprout account matches that email, a password reset link will arrive. Check the inbox and spam folder.";
    const SIGNUP_EMAIL_REQUEST_MESSAGE = "If this email can be used for KiddoSprout, a confirmation link will arrive. Check the inbox and spam folder before trying to log in.";
    const KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY = "kiddosproutGoogleOAuthTransaction";
    const KIDDO_GOOGLE_OAUTH_TRANSACTION_PARAM = "ks_oauth";
    const KIDDO_GOOGLE_OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;
    const KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY = "kiddosproutEmailSignupTransaction";
    const KIDDO_EMAIL_SIGNUP_TRANSACTION_PARAM = "ks_signup";
    const KIDDO_EMAIL_SIGNUP_TRANSACTION_TTL_MS = 60 * 60 * 1000;
    const KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY = "kiddosproutPasswordRecoveryTransaction";
    const KIDDO_PASSWORD_RECOVERY_TRANSACTION_PARAM = "ks_recovery";
    const KIDDO_PASSWORD_RECOVERY_TRANSACTION_TTL_MS = 60 * 60 * 1000;
    const KIDDO_AUTH_QUERY_SECRET_PARAMETERS = new Set([
      "access_token",
      "refresh_token",
      "provider_token",
      "provider_refresh_token",
      "id_token",
      "token",
      "token_hash",
      "code",
      "confirmation_url",
      "error",
      "error_code",
      "error_description"
    ]);
    const AUTH_REQUEST_TIMEOUT_MS = 15000;
    const RESEND_EMAIL_COOLDOWN_SECONDS = 60;
    let resendEmailCooldown = 0;
    let resendEmailCooldownTimer = null;
    let resendEmailInFlight = false;
    let loginRequestInFlight = false;
    let signupRequestInFlight = false;
    let recoveryRequestInFlight = false;
    let recoveryResetInFlight = false;
    let confirmationRequestInFlight = false;
    let emailConfirmationPending = false;
    let googleSetupRequestInFlight = false;
    let googleAuthAvailable = false;
    let googleAuthCheckComplete = !GOOGLE_AUTH_CONFIGURED;
    let googleOnboardingActive = false;
    let googleOnboardingSession = null;
    let accountPasswordRecoverySession = null;
    let accountPasswordRecoveryRequestInFlight = false;
    let accountPasswordUpdateInFlight = false;
    let accountPasswordRecoveryGeneration = 0;
    let authViewGeneration = 0;
    let accountConnectionCheckGeneration = 0;
    const humanChecks = {
      login: { controller: null, token: "", starting: false, generation: 0 },
      signup: { controller: null, token: "", starting: false, generation: 0 },
      recovery: { controller: null, token: "", starting: false, generation: 0 }
    };
    let signupProgressStage = "details";
    let kiddoInstallPrompt = null;
    let kiddoInstallInFlight = false;
    let kiddoInstallPending = false;
    let kiddoInstallPendingTimer = 0;
    let kiddoServiceWorkerRegistration = null;
    let kiddoServiceWorkerRegistrationInFlight = false;
    let kiddoServiceWorkerUpdateCheckInFlight = false;
    let kiddoServiceWorkerUpdateCheckFailed = false;
    let kiddoServiceWorkerLastUpdateCheck = 0;
    let kiddoServiceWorkerReloadRequested = false;
    let kiddoServiceWorkerControllerChanged = false;
    let kiddoServiceWorkerReloadHandled = false;
    const observedKiddoSproutWorkers = new WeakSet();
    const KIDDO_SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;
    const KIDDO_INSTALL_PENDING_TIMEOUT_MS = 60 * 1000;
    let parentGateTrigger = null;
    let settingsMenuOwnedFocusAtPointerDown = false;
    let modeEntryFocusGeneration = 0;
    let kiddoAppInstalled = Boolean(
      window.matchMedia?.("(display-mode: standalone)").matches
      || window.navigator.standalone === true
    );
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
      arcade: { title: "Sprout Arcade", initial: "A", kind: "Game", defaultRule: "request" },
      studio: { title: "Creator Studio", initial: "C", kind: "Create", defaultRule: "request" },
      explore: { title: "Explorer Lab", initial: "E", kind: "Learning", defaultRule: "allowed" },
      move: { title: "Move Breaks", initial: "M", kind: "Movement", defaultRule: "allowed" },
      story: { title: "Story Theater", initial: "S", kind: "Original books", defaultRule: "allowed" },
      recipe: { title: "FlavorNest", initial: "F", kind: "Recipe app", defaultRule: "allowed" },
      spending: { title: "Smart Spending", initial: "$", kind: "Money app", defaultRule: "allowed" },
      arcade: { title: "Sprout Arcade", initial: "A", kind: "Game library", defaultRule: "request" },
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
    const APP_RULE_VALUES = new Set(["allowed", "request", "blocked"]);
    const HOMEWORK_PAUSED_APP_IDS = new Set(["arcade", "flyer", "gameSites", "roblox"]);
    const TRUSTED_CONTACT_LIMIT = 20;
    const TRUSTED_CONTACT_NAME_LIMIT = 80;
    const CHILD_PROFILE_LIMIT = 20;
    const CHILD_PROFILE_ID_LIMIT = 160;
    const CHILD_PROFILE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,159})$/;
    const CHILD_PROFILE_UNSAFE_IDS = new Set(["__proto__", "constructor", "prototype"]);
    const CHILD_PROFILE_NAME_LIMIT = 80;
    const CHILD_PROFILE_SHORT_TEXT_LIMIT = 160;
    const CHILD_PROFILE_NOTE_LIMIT = 500;
    const CHILD_REQUEST_LIMIT = 100;
    const CHILD_CREATOR_QUEUE_LIMIT = 100;
    const CHILD_READING_LOG_LIMIT = 12;
    const CHILD_ACHIEVEMENT_LIMIT = 20;
    const FAMILY_ACTIVITY_LIMIT = 100;
    const FAMILY_SCAN_HISTORY_LIMIT = 12;
    const FAMILY_CONTENT_ITEM_LIMIT = 100;
    const FAMILY_CONTENT_TEXT_LIMIT = 500;
    const CHILD_AVATAR_ICONS = new Set(["star", "bolt", "book", "rocket", "heart", "smile", "rainbow", "leaf", "crown"]);
    const CHILD_DEVICES = new Set(["Tablet", "Phone", "Laptop", "Shared device"]);
    const CHILD_COSTUMES = new Set(["Explorer", "Space Pilot", "Story Wizard", "Dance Captain", "Ocean Guide", "Inventor"]);
    const CHILD_SCHOOL_YEARS = new Set(["", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7+"]);
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
        title: "Money mission",
        text: "Open Smart Spending and try one safe money choice: save, spend, or share."
      }
    ];
    const DEFAULT_STATE = {
      "activeChild": "",
      "familyName": "KiddoSprout Family",
      "parentName": "Parent",
      "parentEmail": "",
      "parentAuthUserId": "",
      "secondParentName": "",
      "secondParentEmail": "",
      "parentPasscode": "",
      "parentPasscodeRecord": null,
      "parentAccountCreated": false,
      "themeMode": "auto",
      "languageMode": "en-GB",
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

    function readBrowserStorage(storage, key, fallback = "") {
      try {
        const value = storage?.getItem?.(key);
        return value === null || value === undefined ? fallback : value;
      } catch (error) {
        return fallback;
      }
    }

    function writeBrowserStorage(storage, key, value) {
      try {
        storage?.setItem?.(key, String(value));
        return true;
      } catch (error) {
        return false;
      }
    }

    function removeBrowserStorage(storage, key) {
      try {
        storage?.removeItem?.(key);
        return true;
      } catch (error) {
        return false;
      }
    }

    let state = null;
    let legacyLocalFamilyState = null;
    let familyStateOwnerId = "";
    let familyStateCloudReady = false;
    let familySaveGeneration = 0;
    let familySaveTail = Promise.resolve();
    let displayPreferenceSaveGeneration = 0;
    let familyStateBootstrapping = true;
    let parentPasscodeMigrationPromise = Promise.resolve(false);
    let requestIndex = 0;
    let criticalSaveInFlight = false;
    let moveTimer = null;
    let moveSeconds = 30;
    let focusTimer = null;
    let focusSeconds = 900;
    let focusDeadline = 0;
    let closeTimer = null;
    let appModalTrigger = null;
    let flyerAnimation = null;
    let flyerGame = null;
    // Keep the incoming callback fragment only until its single validation
    // pass. This mutable copy is erased before any asynchronous auth work so
    // access and refresh tokens do not remain captured for the page lifetime.
    let initialAuthCallbackHash = window.location.hash;
    let viewMode = (window.location.hash || "#login").slice(1);
    if (!["child", "parent", "signup", "login"].includes(viewMode)) {
      viewMode = "login";
    }
    let parentUnlocked = readBrowserStorage(window.sessionStorage, "parentUnlocked") === "true";
    let failedPasscodeAttempts = Number(readBrowserStorage(window.sessionStorage, "failedPasscodeAttempts", "0"));
    let lockoutUntil = Number(readBrowserStorage(window.sessionStorage, "lockoutUntil", "0"));
    let lockoutTimer = null;
    let lockoutWasActive = false;
    let recoveryCodeRequested = false;
    let recoveryEmailRequested = "";
    let recoveryRequestGeneration = 0;
    let kiddoSessionVerified = false;
    let pendingRemoveChildId = "";
    let achievementEditorUnlocked = false;
    let achievementPasscodeAttempts = Number(readBrowserStorage(window.localStorage, "kiddoSproutAchievementPasscodeAttempts", "0"));
    let achievementLockUntil = Number(readBrowserStorage(window.localStorage, "kiddoSproutAchievementLockUntil", "0"));
    let achievementLockTimer = null;

    function isDemoMode() {
      return PUBLIC_DEMO_ONLY || window.KiddoSproutDemo?.active?.() === true;
    }

    function translate(key, variables = {}, fallback = "") {
      const translated = window.KiddoSproutLanguage?.text?.(key, variables, state?.languageMode);
      if (!translated || translated === key) return fallback || key;
      return translated;
    }

    function setTranslatedText(element, key, fallback) {
      if (!element) return;
      element.dataset.i18n = key;
      element.textContent = translate(key, {}, fallback);
    }

    function createDemoState() {
      const demoState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      const child = createDefaultChild(
        "Demo Child",
        "",
        9,
        "Shared tablet",
        "rocket",
        "#8c5aa8",
        "Space Pilot",
        "",
        "",
        ""
      );
      Object.assign(child, {
        dailyLimit: 120,
        usedToday: 47,
        pending: 1,
        blockedHits: 6,
        currentRequest: ["Puzzle Arcade", "Game app requested from the fictional demo profile", "P", "appDownload"],
        requests: [["Puzzle Arcade", "Game app requested from the fictional demo profile", "P", "appDownload"]],
        report: { Explorer: 42, Stories: 31, Movement: 18, Games: 12 },
        streaks: { reading: 4, homework: 3, exercise: 5, chores: 4 },
        completedTasks: ["explore", "move"],
        dailyWins: { learn: true, move: true, safe: true },
        kindnessPoints: 15,
        readingLog: [
          { title: "The Lantern Library", minutes: 12 },
          { title: "Ocean Fact Book", minutes: 8 }
        ],
        waterCount: 3,
        eyeBreaks: 2,
        achievementChart: [
          { id: "demo-reading", title: "Read five days", target: 5, progress: 4, reward: "Choose the family story" },
          { id: "demo-kindness", title: "Kindness streak", target: 7, progress: 5, reward: "Pick Friday’s snack" }
        ],
        flyerBest: 8,
        appRules: {
          studio: "allowed",
          explore: "allowed",
          move: "allowed",
          story: "allowed",
          recipe: "allowed",
          spending: "allowed",
          arcade: "allowed",
          flyer: "allowed",
          gameSites: "blocked",
          roblox: "blocked"
        },
        flyerAllowed: true
      });
      Object.assign(demoState, {
        activeChild: "demo-child",
        familyName: OFFLINE_SAFE_MODE ? "Offline Preview Family" : "Sprout Demo Family",
        parentName: OFFLINE_SAFE_MODE ? "Offline Grown-up" : "Demo Grown-up",
        parentEmail: "",
        parentAuthUserId: "",
        secondParentName: "",
        secondParentEmail: "",
        parentPasscode: "",
        parentAccountCreated: true,
        parentNote: "Homework first, then choose a fun hub together.",
        safetyAlerts: [
          { childId: "demo-child", child: "Demo Child", message: "Asked for help with a confusing link", time: "16:10" }
        ],
        moodCheckins: [
          { childId: "demo-child", child: "Demo Child", mood: "Feeling curious", time: "15:45" }
        ],
        problemReports: [],
        scanHistory: [],
        children: { "demo-child": child }
      });
      return demoState;
    }

    function demoBlockedMessage(element) {
      return element?.dataset?.demoProtected || "This live feature is unavailable in Demo Mode";
    }

    function applyDemoAvailability() {
      const demoMode = isDemoMode();
      document.body.classList.toggle("demo-mode", demoMode);
      document.body.classList.toggle("public-demo-only", PUBLIC_DEMO_ONLY);
      document.body.classList.toggle("offline-safe-mode", OFFLINE_SAFE_MODE);
      if (demoBanner) demoBanner.hidden = !demoMode;
      if (exitDemoButton) exitDemoButton.hidden = PUBLIC_DEMO_ONLY;
      if (!demoMode) return;

      if (OFFLINE_SAFE_MODE && demoBanner) {
        demoBanner.setAttribute("aria-label", translate("offline.banner.label", {}, "Offline Preview"));
        const badge = demoBanner.querySelector("[data-i18n='demo.badge']");
        const title = demoBanner.querySelector("[data-i18n='demo.title']");
        const help = demoBanner.querySelector("[data-i18n='demo.help']");
        if (badge) badge.textContent = translate("offline.banner.badge", {}, "Offline Preview");
        if (title) title.textContent = translate("offline.banner.title", {}, "You are viewing fictional offline data.");
        if (help) help.textContent = translate(
          "offline.banner.help",
          {},
          "Your private family account was not opened without an online security check. Changes stay in this tab."
        );
        if (resetDemoButton) resetDemoButton.textContent = translate("offline.banner.reset", {}, "Reset preview");
      }

      document.querySelectorAll("[data-demo-protected]").forEach((element) => {
        if (element.hasAttribute("data-public-demo-preview")) {
          element.removeAttribute("aria-disabled");
          element.setAttribute(
            "title",
            element.dataset.demoPreviewTitle
              || translate("parent.blocker.previewTitle", {}, "Open the read-only Game Blocker setup preview")
          );
          if (element.dataset.publicDemoLabel) {
            element.textContent = translate(element.dataset.publicDemoLabelKey || "", {}, element.dataset.publicDemoLabel);
          }
          return;
        }
        element.setAttribute("aria-disabled", "true");
        element.setAttribute("title", demoBlockedMessage(element));
        if ("disabled" in element) element.disabled = true;
        if (element.matches("a[href]")) {
          element.dataset.demoHref = element.getAttribute("href") || "";
          element.removeAttribute("href");
        }
      });
      document.querySelectorAll("[data-demo-lock-controls]").forEach((panel) => {
        panel.querySelectorAll("input, select, textarea, button").forEach((control) => {
          control.disabled = true;
          control.setAttribute("aria-disabled", "true");
        });
      });
    }

    function startDemoMode() {
      const demoState = createDemoState();
      if (!window.KiddoSproutDemo?.start?.(demoState)) {
        showToast("Demo Mode could not start in this browser.");
        return;
      }
      state = demoState;
      kiddoSessionVerified = false;
      parentUnlocked = true;
      viewMode = "parent";
      closeSettingsMenu();
      setMode("parent", { unlocked: true, quiet: true });
      focusModeEntry("parent");
      window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
      showToast("Colleague Demo Mode opened with fictional data.");
    }

    function resetDemoMode() {
      if (!isDemoMode()) return;
      const resetState = createDemoState();
      if (!window.KiddoSproutDemo?.reset?.(resetState)) {
        showToast("Demo data could not be reset in this browser.");
        return;
      }
      abandonFocusSession();
      state = resetState;
      parentUnlocked = true;
      lockAchievementControls({ quiet: true, render: false });
      setMode(viewMode === "child" ? "child" : "parent", { unlocked: true, quiet: true });
      showToast("Demo data reset.");
    }

    function exitDemoMode() {
      if (!isDemoMode()) return;
      if (PUBLIC_DEMO_ONLY) {
        showToast("This public preview stays in Demo Mode.");
        return;
      }
      cancelQueuedSaves();
      window.KiddoSproutDemo.exit();
      const destination = window.location.pathname + window.location.search + "#login";
      window.location.replace(destination);
    }

    function currentChild() {
      const entries = repairChildCollectionShape();
      if (!entries.length) {
        state.activeChild = "";
        return null;
      }
      const child = state.children[state.activeChild];
      ensureChildAppState(child);
      return child;
    }

    function familyCallContextSnapshot() {
      const session = getKiddoSession();
      const children = Object.fromEntries(
        Object.entries(state?.children || {}).map(([id, child]) => [id, String(child?.name || "Child")])
      );
      const child = state?.activeChild ? state.children?.[state.activeChild] : null;
      return Object.freeze({
        mode: viewMode,
        demo: isDemoMode(),
        familyOwnerId: String(familyStateOwnerId || session?.user?.id || ""),
        childId: String(state?.activeChild || ""),
        childName: String(child?.name || ""),
        children
      });
    }

    function notifyFamilyCallContext() {
      window.dispatchEvent(new CustomEvent("kiddosprout:family-call-context", {
        detail: familyCallContextSnapshot()
      }));
    }

    window.KiddoSproutFamilyCallContext = Object.freeze({
      get: familyCallContextSnapshot
    });

    function hasChildProfiles() {
      return repairChildCollectionShape().length > 0;
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

    function hasStoredParentPasscode() {
      return Boolean(
        window.KiddoSproutPasscode?.isRecord?.(state?.parentPasscodeRecord)
        || /^\d{4,8}$/.test(String(state?.parentPasscode || ""))
      );
    }

    async function createParentPasscodeRecord(passcode) {
      if (!window.KiddoSproutPasscode?.create) {
        throw new Error("Secure PIN storage could not start in this browser.");
      }
      return window.KiddoSproutPasscode.create(passcode);
    }

    async function storeParentPasscode(passcode) {
      const record = await createParentPasscodeRecord(passcode);
      state.parentPasscodeRecord = record;
      state.parentPasscode = "";
      return record;
    }

    async function migrateLegacyParentPasscode() {
      if (isDemoMode()) return false;
      const legacyPasscode = String(state?.parentPasscode || "");
      if (window.KiddoSproutPasscode?.isRecord?.(state?.parentPasscodeRecord)) {
        if (!legacyPasscode) return false;
        state.parentPasscode = "";
        if (!await saveState()) {
          state.parentPasscode = legacyPasscode;
          throw new Error("The old readable PIN could not be upgraded securely.");
        }
        stageLegacyFamilyStateForMigration();
        return true;
      }
      if (!/^\d{4,8}$/.test(legacyPasscode)) {
        return false;
      }
      const previousRecord = state.parentPasscodeRecord;
      await storeParentPasscode(legacyPasscode);
      if (!await saveState()) {
        state.parentPasscode = legacyPasscode;
        state.parentPasscodeRecord = previousRecord;
        throw new Error("The upgraded PIN could not be saved securely.");
      }
      stageLegacyFamilyStateForMigration();
      return true;
    }

    async function verifyParentPasscode(passcode) {
      await parentPasscodeMigrationPromise;
      if (window.KiddoSproutPasscode?.isRecord?.(state?.parentPasscodeRecord)) {
        return window.KiddoSproutPasscode.verify(passcode, state.parentPasscodeRecord);
      }
      const legacyPasscode = String(state?.parentPasscode || "");
      if (!legacyPasscode || String(passcode || "") !== legacyPasscode) return false;
      const previousRecord = state.parentPasscodeRecord;
      try {
        await storeParentPasscode(legacyPasscode);
        if (!await saveState()) throw new Error("The upgraded PIN could not be saved.");
      } catch (error) {
        // Do not lock an existing family out when an older browser cannot run
        // the one-time security upgrade or its local storage is temporarily full.
        state.parentPasscode = legacyPasscode;
        state.parentPasscodeRecord = previousRecord;
      }
      return true;
    }

    function hasParentAccount() {
      return Boolean(state.parentAccountCreated || (state.parentEmail && state.parentName));
    }

    function getKiddoSession() {
      if (isDemoMode()) return null;
      if (window.KiddoSproutSession?.getSession) {
        return window.KiddoSproutSession.getSession() || null;
      }

      const sessionKeys = [KIDDO_AUTH_SESSION_KEY, FLAVORNEST_AUTH_SESSION_KEY];
      const readFirstSession = (storage) => {
        for (const key of sessionKeys) {
          try {
            const session = JSON.parse(readBrowserStorage(storage, key, "null"));
            if (session?.access_token) return session;
          } catch (error) {
            // Try the other shared key.
          }
        }
        return null;
      };
      const clearLegacySessions = () => sessionKeys.forEach((key) => {
        removeBrowserStorage(window.localStorage, key);
      });
      const tabSession = readFirstSession(window.sessionStorage);
      if (tabSession) {
        clearLegacySessions();
        return tabSession;
      }

      const legacySession = readFirstSession(window.localStorage);
      let migrated = false;
      if (legacySession) {
        const encoded = JSON.stringify(legacySession);
        sessionKeys.forEach((key) => {
          migrated = writeBrowserStorage(window.sessionStorage, key, encoded) || migrated;
        });
      }
      clearLegacySessions();
      return migrated ? legacySession : null;
    }

    function hasKiddoSession() {
      const session = getKiddoSession();
      return Boolean(kiddoSessionVerified && session && session.access_token && session.user && session.user.email);
    }

    function saveKiddoSession(session) {
      if (isDemoMode()) return false;
      if (!session || !session.access_token) return false;
      if (window.KiddoSproutSession?.save) {
        return window.KiddoSproutSession.save(session) !== false;
      }
      const serialized = JSON.stringify(session);
      const savedKiddoSproutSession = writeBrowserStorage(window.sessionStorage, KIDDO_AUTH_SESSION_KEY, serialized);
      const savedFlavorNestSession = writeBrowserStorage(window.sessionStorage, FLAVORNEST_AUTH_SESSION_KEY, serialized);
      removeBrowserStorage(window.localStorage, KIDDO_AUTH_SESSION_KEY);
      removeBrowserStorage(window.localStorage, FLAVORNEST_AUTH_SESSION_KEY);
      return savedKiddoSproutSession || savedFlavorNestSession;
    }

    function acceptKiddoSession(session) {
      if (isDemoMode()) return null;
      const userId = String(session?.user?.id || "").trim();
      const userEmail = String(session?.user?.email || "").trim().toLowerCase();
      if (!session?.access_token || !userId || !userEmail) {
        clearKiddoSession();
        throw new Error("This account session could not be verified.");
      }
      if (!session.user.email_confirmed_at && !session.user.confirmed_at) {
        clearKiddoSession();
        throw new Error("Email not confirmed");
      }

      const familyUserId = String(state?.parentAuthUserId || "").trim();
      const familyEmail = String(state?.parentEmail || "").trim().toLowerCase();
      const ownsExistingFamily = Boolean(state?.parentAccountCreated || familyEmail);
      const idMismatch = Boolean(familyUserId && familyUserId !== userId);
      // A local/self-hosted Auth user gets a different UUID after the family is
      // moved to hosted Auth. Rebind only after the server verifies the same,
      // confirmed email; a genuinely different parent remains locked out.
      const sameConfirmedEmail = Boolean(
        familyEmail
        && familyEmail === userEmail
        && (session.user.email_confirmed_at || session.user.confirmed_at)
      );
      const verifiedAccountMigration = idMismatch && sameConfirmedEmail;
      const migrationMismatch = Boolean(!familyUserId && ownsExistingFamily && (!familyEmail || familyEmail !== userEmail));
      if ((idMismatch && !verifiedAccountMigration) || migrationMismatch) {
        clearKiddoSession();
        throw new Error("This browser's family hub belongs to a different parent account. Use the matching parent login.");
      }

      const sessionSaved = saveKiddoSession(session);
      const savedSession = sessionSaved ? getKiddoSession() : null;
      if (!savedSession
          || String(savedSession.access_token || "") !== String(session.access_token)
          || String(savedSession.user?.id || "") !== userId) {
        clearKiddoSession();
        throw new Error("This browser could not save your sign-in. Check its storage or private-browsing settings, then try again.");
      }
      state.parentAuthUserId = userId;
      kiddoSessionVerified = true;
      return session;
    }

    function clearKiddoSession() {
      if (isDemoMode()) return;
      familySaveGeneration += 1;
      displayPreferenceSaveGeneration += 1;
      familyStateOwnerId = "";
      familyStateCloudReady = false;
      try {
        // This also invalidates any refresh or validation request already in
        // flight, so a late response cannot silently sign the parent back in.
        window.KiddoSproutSession?.clear?.();
      } catch (error) {
        // Continue clearing the local UI even when browser storage is blocked.
      }
      [KIDDO_AUTH_SESSION_KEY, FLAVORNEST_AUTH_SESSION_KEY].forEach((key) => {
        removeBrowserStorage(window.sessionStorage, key);
        removeBrowserStorage(window.localStorage, key);
      });
      try {
        window.sessionStorage.removeItem("parentUnlocked");
      } catch (error) {
        // The in-memory lock below remains authoritative for this page.
      }
      parentUnlocked = false;
      kiddoSessionVerified = false;
      window.dispatchEvent(new CustomEvent("kiddosprout:session-cleared"));
    }

    function authRequestSignal(timeoutMs = AUTH_REQUEST_TIMEOUT_MS) {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(timeoutMs);
      }
      if (typeof AbortController === "undefined") return undefined;
      const controller = new AbortController();
      window.setTimeout(() => controller.abort(), timeoutMs);
      return controller.signal;
    }

    async function kiddoAuthRequest(path, body) {
      if (isDemoMode()) {
        throw new Error("Live account actions are unavailable in Demo Mode.");
      }
      if (!SUPABASE_CONNECTED) {
        throw new Error("Account service is unavailable. Check the app configuration.");
      }
      const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: authRequestSignal()
      });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };
      if (!response.ok) {
        const error = new Error(data.error_description || data.msg || data.message || data.error || "Something went wrong");
        error.code = String(data.code || data.error_code || data.error || "");
        error.status = response.status;
        throw error;
      }
      return data;
    }

    function kiddoAuthRedirectUrl() {
      return window.location.origin + window.location.pathname;
    }

    function createAuthTransactionNonce() {
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      return window.btoa(String.fromCharCode(...randomBytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    }

    async function authEmailFingerprint(email, nonce) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const normalizedNonce = String(nonce || "");
      if (!isValidEmailAddress(normalizedEmail)
          || !/^[A-Za-z0-9_-]{43}$/.test(normalizedNonce)
          || !window.crypto?.subtle
          || typeof TextEncoder !== "function") {
        throw new Error("Secure browser storage is unavailable.");
      }
      const digest = new Uint8Array(await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(normalizedNonce + "\u0000" + normalizedEmail)
      ));
      return window.btoa(String.fromCharCode(...digest))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    }

    function createGoogleOAuthTransaction(intent) {
      const safeIntent = intent === "signup" ? "signup" : "login";
      const nonce = createAuthTransactionNonce();
      const transaction = { nonce, intent: safeIntent, createdAt: Date.now() };
      if (!writeBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY, JSON.stringify(transaction))) {
        throw new Error("Secure browser storage is unavailable.");
      }
      return transaction;
    }

    function consumeGoogleOAuthTransaction(returnedNonce) {
      const serializedTransaction = readBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY);
      removeBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY);
      if (!serializedTransaction || !returnedNonce) return null;

      try {
        const transaction = JSON.parse(serializedTransaction);
        const age = Date.now() - Number(transaction?.createdAt);
        const hasValidShape = /^[A-Za-z0-9_-]{43}$/.test(String(transaction?.nonce || ""))
          && (transaction?.intent === "login" || transaction?.intent === "signup")
          && Number.isFinite(age)
          && age >= 0
          && age <= KIDDO_GOOGLE_OAUTH_TRANSACTION_TTL_MS;
        if (!hasValidShape || transaction.nonce !== returnedNonce) return null;
        return transaction;
      } catch {
        return null;
      }
    }

    async function createEmailSignupTransaction(email = "") {
      const nonce = createAuthTransactionNonce();
      const transaction = {
        nonce,
        emailFingerprint: await authEmailFingerprint(email, nonce),
        createdAt: Date.now()
      };
      if (!writeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY, JSON.stringify(transaction))) {
        throw new Error("Secure browser storage is unavailable.");
      }
      return transaction;
    }

    function readEmailSignupTransaction() {
      const serialized = readBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
      if (!serialized) return null;
      try {
        const transaction = JSON.parse(serialized);
        const age = Date.now() - Number(transaction?.createdAt);
        if (!/^[A-Za-z0-9_-]{43}$/.test(String(transaction?.nonce || ""))
            || !/^[A-Za-z0-9_-]{43}$/.test(String(transaction?.emailFingerprint || ""))
            || !Number.isFinite(age) || age < 0 || age > KIDDO_EMAIL_SIGNUP_TRANSACTION_TTL_MS) {
          removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
          return null;
        }
        return transaction;
      } catch (error) {
        removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
        return null;
      }
    }

    function refreshEmailSignupTransaction(returnedNonce) {
      const transaction = readEmailSignupTransaction();
      if (!transaction || transaction.nonce !== returnedNonce) return false;
      transaction.createdAt = Date.now();
      return writeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY, JSON.stringify(transaction));
    }

    async function matchingEmailSignupTransaction(email) {
      const transaction = readEmailSignupTransaction();
      if (!transaction) return null;
      try {
        const fingerprint = await authEmailFingerprint(email, transaction.nonce);
        return fingerprint === transaction.emailFingerprint ? transaction : null;
      } catch (error) {
        return null;
      }
    }

    function matchEmailSignupTransaction(returnedNonce) {
      const transaction = readEmailSignupTransaction();
      return transaction && transaction.nonce === returnedNonce ? transaction : null;
    }

    async function createPasswordRecoveryTransaction(email) {
      const nonce = createAuthTransactionNonce();
      const transaction = {
        nonce,
        emailFingerprint: await authEmailFingerprint(email, nonce),
        createdAt: Date.now()
      };
      if (!writeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY, JSON.stringify(transaction))) {
        throw new Error("Secure browser storage is unavailable.");
      }
      return transaction;
    }

    function readPasswordRecoveryTransaction() {
      const serialized = readBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
      if (!serialized) return null;
      try {
        const transaction = JSON.parse(serialized);
        const age = Date.now() - Number(transaction?.createdAt);
        const valid = /^[A-Za-z0-9_-]{43}$/.test(String(transaction?.nonce || ""))
          && /^[A-Za-z0-9_-]{43}$/.test(String(transaction?.emailFingerprint || ""))
          && Number.isFinite(age)
          && age >= 0
          && age <= KIDDO_PASSWORD_RECOVERY_TRANSACTION_TTL_MS;
        if (!valid) {
          removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
          return null;
        }
        return transaction;
      } catch (error) {
        removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
        return null;
      }
    }

    function matchPasswordRecoveryTransaction(returnedNonce) {
      const transaction = readPasswordRecoveryTransaction();
      return transaction && transaction.nonce === returnedNonce ? transaction : null;
    }

    function kiddoGoogleRedirectUrl(transactionNonce) {
      const redirectUrl = new URL(kiddoAuthRedirectUrl());
      redirectUrl.searchParams.set(KIDDO_GOOGLE_OAUTH_TRANSACTION_PARAM, transactionNonce);
      return redirectUrl.toString();
    }

    function kiddoEmailSignupRedirectUrl(transactionNonce = "") {
      const redirectUrl = new URL(kiddoAuthRedirectUrl());
      if (transactionNonce) redirectUrl.searchParams.set(KIDDO_EMAIL_SIGNUP_TRANSACTION_PARAM, transactionNonce);
      return redirectUrl.toString();
    }

    function kiddoPasswordRecoveryRedirectUrl(transactionNonce) {
      const redirectUrl = new URL(kiddoAuthRedirectUrl());
      redirectUrl.searchParams.set(KIDDO_PASSWORD_RECOVERY_TRANSACTION_PARAM, transactionNonce);
      return redirectUrl.toString();
    }

    function parseKiddoAuthCallback(callbackUrl, callbackHash) {
      const url = new URL(callbackUrl);
      const params = new URLSearchParams(String(callbackHash || "").replace(/^#/, ""));
      const unsafeQueryParameters = [...url.searchParams.keys()].filter((name) => (
        KIDDO_AUTH_QUERY_SECRET_PARAMETERS.has(String(name).toLowerCase())
      ));
      return {
        params,
        returnedNonce: url.searchParams.get(KIDDO_GOOGLE_OAUTH_TRANSACTION_PARAM) || "",
        returnedEmailNonce: url.searchParams.get(KIDDO_EMAIL_SIGNUP_TRANSACTION_PARAM) || "",
        returnedRecoveryNonce: url.searchParams.get(KIDDO_PASSWORD_RECOVERY_TRANSACTION_PARAM) || "",
        unsafeQueryParameters
      };
    }

    function hasKiddoAuthCallbackMaterial(callbackUrl, callbackHash) {
      const callback = parseKiddoAuthCallback(callbackUrl, callbackHash);
      const hasSensitiveHashParameter = [...callback.params.keys()].some((name) => (
        KIDDO_AUTH_QUERY_SECRET_PARAMETERS.has(String(name).toLowerCase())
      ));
      return Boolean(
        callback.returnedNonce
        || callback.returnedEmailNonce
        || callback.returnedRecoveryNonce
        || callback.unsafeQueryParameters.length
        || hasSensitiveHashParameter
      );
    }

    function classifyKiddoAuthCallback({
      callbackType = "",
      hasSensitiveAuthPayload = false,
      returnedNonce = "",
      returnedEmailNonce = "",
      returnedRecoveryNonce = ""
    } = {}) {
      const callbackReferenceCount = [returnedNonce, returnedEmailNonce, returnedRecoveryNonce]
        .filter(Boolean).length;
      const conflictingCallbackDetails = callbackReferenceCount > 1
        || Boolean(returnedEmailNonce && callbackType && callbackType !== "signup")
        || Boolean(returnedRecoveryNonce && callbackType && callbackType !== "recovery");
      return {
        conflictingCallbackDetails,
        looksLikeGoogleCallback: !conflictingCallbackDetails && Boolean(
          returnedNonce
          || (!callbackType && hasSensitiveAuthPayload && !returnedEmailNonce && !returnedRecoveryNonce)
        ),
        attemptedEmailCallback: !conflictingCallbackDetails && !returnedNonce && Boolean(
          returnedEmailNonce || (callbackType === "signup" && !returnedRecoveryNonce)
        ),
        attemptedRecoveryCallback: !conflictingCallbackDetails && !returnedNonce && Boolean(
          returnedRecoveryNonce || (callbackType === "recovery" && !returnedEmailNonce)
        )
      };
    }

    function stripKiddoAuthCallbackUrl(mode) {
      const safeMode = mode === "signup" ? "signup" : "login";
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete(KIDDO_GOOGLE_OAUTH_TRANSACTION_PARAM);
      cleanUrl.searchParams.delete(KIDDO_EMAIL_SIGNUP_TRANSACTION_PARAM);
      cleanUrl.searchParams.delete(KIDDO_PASSWORD_RECOVERY_TRANSACTION_PARAM);
      [...cleanUrl.searchParams.keys()].forEach((name) => {
        if (KIDDO_AUTH_QUERY_SECRET_PARAMETERS.has(String(name).toLowerCase())) {
          cleanUrl.searchParams.delete(name);
        }
      });
      cleanUrl.hash = `#${safeMode}`;
      window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    }

    function discardDemoKiddoAuthCallback(callbackHash = initialAuthCallbackHash) {
      initialAuthCallbackHash = "";
      if (!hasKiddoAuthCallbackMaterial(window.location.href, callbackHash)) return false;
      stripKiddoAuthCallbackUrl("login");
      removeBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY);
      removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
      removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
      return true;
    }

    function isGoogleAuthUser(user) {
      const provider = String(user?.app_metadata?.provider || "").toLowerCase();
      const providers = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [];
      const identities = Array.isArray(user?.identities) ? user.identities : [];
      return provider === "google"
        || providers.some((item) => String(item).toLowerCase() === "google")
        || identities.some((identity) => String(identity?.provider || "").toLowerCase() === "google");
    }

    function setGoogleAuthStatus(element, message, success = false) {
      if (!element) return;
      element.textContent = message;
      element.classList.toggle("success", success);
    }

    function updateGoogleAuthPresentation() {
      const offerConfiguredGoogle = GOOGLE_AUTH_CONFIGURED;
      const googleRoutePending = offerConfiguredGoogle && !googleAuthCheckComplete;
      const googleRouteReady = offerConfiguredGoogle && googleAuthAvailable;
      const signupRouteConfigured = googleRouteReady || googleRoutePending || AUTH_EMAIL_DELIVERY_READY;
      const recoveryRouteConfigured = googleRouteReady || googleRoutePending || AUTH_EMAIL_DELIVERY_READY;
      const noSignupRoute = !signupRouteConfigured && !googleOnboardingActive;
      if (googleLoginChoice) googleLoginChoice.hidden = !offerConfiguredGoogle;
      if (loginAuthDivider) loginAuthDivider.hidden = !offerConfiguredGoogle;
      [googleLoginButton, googleSignupButton, googleRecoveryButton].forEach((button) => {
        if (!button) return;
        // Keep configured Google routes keyboard-reachable while readiness is
        // checked. startGoogleOAuth() remains the guarded authority and writes
        // any unavailable explanation to the button's live status region.
        button.disabled = false;
        button.setAttribute("aria-disabled", String(!googleAuthAvailable));
      });
      if (googleRecoveryChoice) googleRecoveryChoice.hidden = !offerConfiguredGoogle;
      if (emailRecoveryFlow) emailRecoveryFlow.hidden = !AUTH_EMAIL_DELIVERY_READY;
      if (recoveryEmailAvailability) {
        recoveryEmailAvailability.hidden = recoveryRouteConfigured;
        recoveryEmailAvailability.textContent = recoveryRouteConfigured
          ? ""
          : translate("auth.emailUnavailable", {}, EMAIL_DELIVERY_UNAVAILABLE_MESSAGE);
      }
      if (forgotPasswordButton) {
        forgotPasswordButton.disabled = false;
        forgotPasswordButton.title = recoveryRouteConfigured
          ? ""
          : translate("auth.recovery.unavailableTitle", {}, "Open recovery details and see what still needs to be enabled.");
      }
      if (forgotAccountPasswordButton) {
        forgotAccountPasswordButton.hidden = !AUTH_EMAIL_DELIVERY_READY;
        forgotAccountPasswordButton.disabled = !SUPABASE_CONNECTED || !AUTH_EMAIL_DELIVERY_READY;
        forgotAccountPasswordButton.title = AUTH_EMAIL_DELIVERY_READY
          ? ""
          : translate("auth.recovery.unavailableTitle", {}, "Password reset email is not enabled on this setup.");
      }

      [document.querySelector("#loginToSignup"), document.querySelector("#openSignup")].forEach((button) => {
        if (!button) return;
        button.disabled = false;
        button.title = signupRouteConfigured
          ? ""
          : translate("auth.signup.unavailableActionTitle", {}, "Open account setup details and see what still needs to be enabled.");
      });

      const googleOnlySignup = (googleRouteReady || googleRoutePending) && !AUTH_EMAIL_DELIVERY_READY && !googleOnboardingActive;
      if (googleSignupChoice) googleSignupChoice.hidden = !offerConfiguredGoogle || googleOnboardingActive || emailConfirmationPending;
      if (signupAuthDivider) signupAuthDivider.hidden = !offerConfiguredGoogle || googleOnlySignup || googleOnboardingActive || noSignupRoute || emailConfirmationPending;
      if (signupEmailAvailability) {
        signupEmailAvailability.hidden = !noSignupRoute;
        signupEmailAvailability.textContent = noSignupRoute
          ? translate("auth.emailUnavailable", {}, EMAIL_DELIVERY_UNAVAILABLE_MESSAGE)
          : "";
      }
      if (signupDetailsFields) signupDetailsFields.hidden = googleOnlySignup || noSignupRoute || emailConfirmationPending;
      if (signupHumanCheckCard) signupHumanCheckCard.hidden = googleOnlySignup || googleOnboardingActive || noSignupRoute;
      if (emailSignupActions) emailSignupActions.hidden = googleOnlySignup || googleOnboardingActive || noSignupRoute || emailConfirmationPending;
      if (googleOnboardingIntro) googleOnboardingIntro.hidden = !googleOnboardingActive;
      if (googleOnboardingActions) googleOnboardingActions.hidden = !googleOnboardingActive;
      if (signupTrackIntro) signupTrackIntro.hidden = noSignupRoute || googleOnlySignup || emailConfirmationPending;
      document.querySelectorAll(".google-onboarding-only").forEach((element) => {
        element.hidden = !googleOnboardingActive;
      });
      signupPasswordConfirm.required = googleOnboardingActive;

      if (googleOnboardingActive) {
        if (signupTrackTitle) signupTrackTitle.textContent = translate("auth.signup.googleTrackTitle", {}, "Finish Google setup");
        if (signupTrackHelp) signupTrackHelp.textContent = translate("auth.signup.googleTrackHelp", {}, "Google already confirmed your email. Finish the family details—no confirmation message is required.");
        signupEmail.readOnly = true;
        if (signupEmailLabel) signupEmailLabel.textContent = translate("auth.signup.googleEmailLabel", {}, "Google-confirmed parent email");
        if (signupPasswordLabel) signupPasswordLabel.textContent = translate("auth.signup.googlePasswordLabel", {}, "Create a KiddoSprout password");
        if (signupNoteTitle) signupNoteTitle.textContent = translate("auth.signup.googleNoteTitle", {}, "One last sprout step");
        if (signupNoteText) signupNoteText.textContent = translate("auth.signup.googleNoteHelp", {}, "Finish the family details and create a separate KiddoSprout password and parent PIN.");
        if (signupBenefitEmail) signupBenefitEmail.textContent = translate("auth.signup.googleBenefit", {}, "Google-confirmed grown-up email");
        signupProgress?.setAttribute("hidden", "");
      } else {
        if (signupTrackTitle) signupTrackTitle.textContent = translate("auth.signup.emailTrackTitle", {}, "Email and password signup");
        if (signupTrackHelp) signupTrackHelp.textContent = translate("auth.signup.emailTrackHelp", {}, "Create your account here, then use the confirmation link sent to your inbox.");
        signupEmail.readOnly = false;
        if (signupEmailLabel) signupEmailLabel.textContent = translate("auth.email", {}, "Parent email");
        if (signupPasswordLabel) signupPasswordLabel.textContent = translate("auth.signup.accountPassword", {}, "Account password");
        if (signupNoteTitle) signupNoteTitle.textContent = noSignupRoute
          ? translate("auth.signup.unavailableTitle", {}, "Account sign-up is not on yet")
          : googleOnlySignup
            ? translate("auth.signup.googleOnlyTitle", {}, "Quick, private setup")
            : translate("auth.signup.noteTitle", {}, "Three quick steps");
        if (signupNoteText) signupNoteText.textContent = noSignupRoute
          ? translate("auth.signup.unavailableHelp", {}, "The KiddoSprout owner still needs to finish a secure email or Google sign-in route. Existing families can return to Log In.")
          : googleOnlySignup
            ? translate("auth.signup.googleOnlyHelp", {}, "Choose Google to confirm your grown-up email, then finish your family details securely.")
            : translate("auth.signup.noteHelp", {}, "Add family details, complete the safety check, then create your account and confirm your email.");
        if (signupBenefitEmail) signupBenefitEmail.textContent = noSignupRoute
          ? translate("auth.signup.unavailableBenefit", {}, "Secure sign-up stays closed until setup is complete")
          : googleOnlySignup
            ? translate("auth.signup.googleOnlyBenefit", {}, "Google confirms your email")
            : translate("auth.signup.emailBenefit", {}, "Email confirmation before access");
        if (noSignupRoute || googleOnlySignup) signupProgress?.setAttribute("hidden", "");
        else signupProgress?.removeAttribute("hidden");
      }
      updateAuthActionButtons();
    }

    function setGoogleAuthAvailability(available, message = "", options = {}) {
      googleAuthCheckComplete = options.checked !== false;
      googleAuthAvailable = Boolean(GOOGLE_AUTH_CONFIGURED && available);
      const statusMessage = message || (googleAuthAvailable ? "Google sign-in is ready." : "Google sign-in is being set up.");
      setGoogleAuthStatus(googleLoginStatus, statusMessage, googleAuthAvailable);
      setGoogleAuthStatus(googleSignupStatus, statusMessage, googleAuthAvailable);
      setGoogleAuthStatus(googleRecoveryStatus, statusMessage, googleAuthAvailable);
      updateGoogleAuthPresentation();
      updateResendEmailButtons();
    }

    function startGoogleOAuth(intent = "login", statusOverride = null) {
      if (isDemoMode()) {
        showToast("Live account actions are unavailable in Demo Mode.");
        return;
      }
      const safeIntent = intent === "signup" ? "signup" : "login";
      const statusElement = statusOverride || (safeIntent === "signup" ? googleSignupStatus : googleLoginStatus);
      if (!SUPABASE_CONNECTED || !GOOGLE_AUTH_CONFIGURED || !googleAuthAvailable) {
        setGoogleAuthStatus(statusElement, "Google sign-in is not ready yet.");
        return;
      }

      let transaction;
      try {
        transaction = createGoogleOAuthTransaction(safeIntent);
      } catch {
        setGoogleAuthStatus(statusElement, "Google sign-in could not start securely. Please try again.");
        return;
      }

      const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
      authorizeUrl.searchParams.set("provider", "google");
      authorizeUrl.searchParams.set("redirect_to", kiddoGoogleRedirectUrl(transaction.nonce));
      signupPassword.value = "";
      signupPasswordConfirm.value = "";
      signupPasscode.value = "";
      setGoogleAuthStatus(statusElement, "Opening Google securely…");
      window.location.assign(authorizeUrl.toString());
    }

    function authSecurity(captchaToken) {
      return { gotrue_meta_security: { captcha_token: captchaToken } };
    }

    function kiddoSignUpRequest(email, password, captchaToken, profile, transactionNonce) {
      const redirect = encodeURIComponent(kiddoEmailSignupRedirectUrl(transactionNonce));
      return kiddoAuthRequest(`signup?redirect_to=${redirect}`, {
        email,
        password,
        data: profile,
        ...authSecurity(captchaToken)
      });
    }

    function kiddoSignInRequest(email, password, captchaToken) {
      return kiddoAuthRequest("token?grant_type=password", { email, password, ...authSecurity(captchaToken) });
    }

    async function kiddoResendSignupEmail(email, captchaToken) {
      const transaction = await matchingEmailSignupTransaction(email);
      const redirect = encodeURIComponent(kiddoEmailSignupRedirectUrl(transaction?.nonce || ""));
      const result = await kiddoAuthRequest(`resend?redirect_to=${redirect}`, { type: "signup", email, ...authSecurity(captchaToken) });
      if (transaction) refreshEmailSignupTransaction(transaction.nonce);
      return result;
    }

    function kiddoRequestAccountPasswordRecovery(email, captchaToken, transactionNonce) {
      const redirect = encodeURIComponent(kiddoPasswordRecoveryRedirectUrl(transactionNonce));
      return kiddoAuthRequest(`recover?redirect_to=${redirect}`, {
        email,
        ...authSecurity(captchaToken)
      });
    }

    async function kiddoUpdateAccountPassword(accessToken, password) {
      if (!SUPABASE_CONNECTED || !accessToken) {
        throw new Error("The password reset link is no longer available. Request a new one.");
      }
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password }),
        cache: "no-store",
        signal: authRequestSignal()
      });
      const contentType = response.headers.get("content-type") || "";
      const user = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };
      if (!response.ok || !user?.id || !user?.email) {
        const error = new Error(user?.error_description || user?.msg || user?.message || user?.error || "The password could not be updated.");
        error.code = String(user?.code || user?.error_code || user?.error || "");
        error.status = response.status;
        throw error;
      }
      return user;
    }

    async function endTemporaryAuthSession(accessToken) {
      if (!SUPABASE_CONNECTED || !accessToken) return false;
      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`
          },
          cache: "no-store",
          signal: authRequestSignal(5000)
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    }

    function kiddoSendRecoveryOtp(email, captchaToken) {
      return kiddoAuthRequest("otp", {
        email,
        create_user: false,
        ...authSecurity(captchaToken)
      });
    }

    function kiddoVerifyRecoveryOtp(email, token) {
      return kiddoAuthRequest("verify", { email, token, type: "email" });
    }

    async function kiddoUpdateAuthenticatedUser(session, password, profile) {
      if (isDemoMode()) throw new Error("Live account actions are unavailable in Demo Mode.");
      const sessionApi = window.KiddoSproutSession;
      const expectedUserId = String(session?.user?.id || "").trim();
      const expectedEmail = String(session?.user?.email || "").trim().toLowerCase();
      if (!expectedUserId || !expectedEmail || typeof sessionApi?.getAccessToken !== "function"
          || typeof sessionApi?.getSession !== "function") {
        throw new Error("Your secure Google session expired. Continue with Google again.");
      }
      const accessToken = String(await sessionApi.getAccessToken() || "");
      const currentSession = sessionApi.getSession();
      if (!accessToken
          || String(currentSession?.user?.id || "").trim() !== expectedUserId
          || String(currentSession?.access_token || "") !== accessToken) {
        throw new Error("The parent account changed before Google setup could be saved. Continue with Google again.");
      }
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password, data: profile }),
        cache: "no-store",
        signal: authRequestSignal()
      });
      const user = await response.json().catch(() => ({}));
      const latestSession = sessionApi.getSession();
      if (String(latestSession?.user?.id || "").trim() !== expectedUserId
          || String(latestSession?.access_token || "") !== accessToken) {
        throw new Error("The parent account changed before Google setup could be saved. Continue with Google again.");
      }
      if (!response.ok || String(user?.id || "").trim() !== expectedUserId
          || String(user?.email || "").trim().toLowerCase() !== expectedEmail) {
        throw new Error(user?.msg || user?.error_description || user?.error || "Family setup could not be saved.");
      }
      const nextSession = { ...latestSession, access_token: accessToken, user };
      acceptKiddoSession(nextSession);
      return nextSession;
    }

    function clearLoginSecret() {
      loginPassword.value = "";
      viewLoginPassword.checked = false;
      loginPassword.type = "password";
    }

    function maskSignupSecrets({ clear = false } = {}) {
      viewSignupPassword.checked = false;
      signupPassword.type = "password";
      signupPasswordConfirm.type = "password";
      signupPasscode.type = "password";
      if (clear) {
        signupPassword.value = "";
        signupPasswordConfirm.value = "";
        signupPasscode.value = "";
      }
    }

    function clearRecoverySecrets(options) {
      const { clearEmail = false, cancelRequest = false } = options || {};
      if (cancelRequest) {
        recoveryRequestGeneration += 1;
        recoveryRequestInFlight = false;
        recoveryResetInFlight = false;
        const resetPasscodeButton = document.querySelector("#resetPasscode");
        if (resetPasscodeButton) {
          resetPasscodeButton.disabled = false;
          resetPasscodeButton.setAttribute("aria-disabled", "false");
          resetPasscodeButton.setAttribute("aria-busy", "false");
        }
      }
      recoveryCodeRequested = false;
      recoveryEmailRequested = "";
      recoveryEmail.readOnly = false;
      recoveryCode.value = "";
      recoveryPasscode.value = "";
      viewRecoveryPassword.checked = false;
      recoveryPasscode.type = "password";
      if (clearEmail) recoveryEmail.value = "";
      updateAuthActionButtons();
    }

    function setAccountPasswordRecoveryStage(step = "request") {
      const updating = step === "update";
      accountPasswordRecoveryRequestFields.hidden = updating;
      accountPasswordRecoveryRequestFields.toggleAttribute("inert", updating);
      accountPasswordRecoveryRequestFields.setAttribute("aria-hidden", String(updating));
      accountPasswordUpdateFields.hidden = !updating;
      accountPasswordUpdateFields.toggleAttribute("inert", !updating);
      accountPasswordUpdateFields.setAttribute("aria-hidden", String(!updating));
      accountLoginFields.hidden = updating;
      accountLoginFields.toggleAttribute("inert", updating);
      accountLoginFields.setAttribute("aria-hidden", String(updating));
      const helpKey = updating ? "auth.accountRecovery.updateHelp" : "auth.accountRecovery.requestHelp";
      const helpFallback = updating
        ? "Choose a new KiddoSprout password. The reset session will be signed out as soon as it is saved."
        : "Enter your parent email above, complete the safety check, then request a secure reset link.";
      accountPasswordRecoveryHelp.dataset.i18n = helpKey;
      accountPasswordRecoveryHelp.textContent = translate(helpKey, {}, helpFallback);
    }

    function showAccountPasswordRecovery(step = "request") {
      accountPasswordRecoveryPanel.hidden = false;
      accountPasswordRecoveryPanel.removeAttribute("inert");
      accountPasswordRecoveryPanel.setAttribute("aria-hidden", "false");
      setAccountPasswordRecoveryStage(step);
      forgotAccountPasswordButton.setAttribute("aria-expanded", "true");
      updateAuthActionButtons();
    }

    function hideAccountPasswordRecovery({ clearStatus = true, revokeSession = true, clearTransaction = false, force = false } = {}) {
      if (accountPasswordUpdateInFlight && !force) {
        setAuthStatus(
          accountPasswordRecoveryStatus,
          translate(
            "auth.accountRecovery.finishing",
            {},
            "Your new password is being saved. Keep this page open until it finishes."
          ),
          "notice"
        );
        accountPasswordRecoveryPanel.scrollIntoView({ behavior: preferredScrollBehavior(), block: "center" });
        return false;
      }
      accountPasswordRecoveryGeneration += 1;
      accountPasswordRecoveryRequestInFlight = false;
      accountPasswordUpdateInFlight = false;
      const accessToken = String(accountPasswordRecoverySession?.access_token || "");
      accountPasswordRecoverySession = null;
      accountPasswordRecoveryPanel.hidden = true;
      accountPasswordRecoveryPanel.setAttribute("inert", "");
      accountPasswordRecoveryPanel.setAttribute("aria-hidden", "true");
      setAccountPasswordRecoveryStage("request");
      forgotAccountPasswordButton.setAttribute("aria-expanded", "false");
      accountPasswordNew.value = "";
      accountPasswordConfirm.value = "";
      accountPasswordNew.type = "password";
      accountPasswordConfirm.type = "password";
      viewAccountPassword.checked = false;
      if (clearTransaction) removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
      if (clearStatus) setAuthStatus(accountPasswordRecoveryStatus, "", "notice");
      if (revokeSession && accessToken) void endTemporaryAuthSession(accessToken);
      updateAuthActionButtons();
      return true;
    }

    function setEmailConfirmationStage(active, { focus = false } = {}) {
      emailConfirmationPending = Boolean(active);
      emailConfirmationCard.hidden = !emailConfirmationPending;
      emailConfirmationCard.toggleAttribute("inert", !emailConfirmationPending);
      emailConfirmationCard.setAttribute("aria-hidden", String(!emailConfirmationPending));
      setSignupProgress(emailConfirmationPending ? "email" : "details");
      updateGoogleAuthPresentation();
      if (!emailConfirmationPending || !focus) return;
      window.requestAnimationFrame(() => {
        emailConfirmationCard.scrollIntoView({ behavior: preferredScrollBehavior(), block: "center" });
        const confirmationTarget = emailConfirmationCard.querySelector("#emailConfirmationTitle");
        confirmationTarget?.setAttribute("tabindex", "-1");
        confirmationTarget?.focus({ preventScroll: true });
      });
    }

    function restartEmailSignup() {
      if (confirmationRequestInFlight) return;
      removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
      confirmationEmail.textContent = "";
      signupEmail.value = "";
      maskSignupSecrets({ clear: true });
      setEmailConfirmationStage(false);
      setAuthStatus(
        signupStatus,
        translate("auth.signup.confirmationRestarted", {}, "Enter the email you want to use, then create the account again."),
        "notice"
      );
      rearmHumanCheck("signup");
      window.requestAnimationFrame(() => {
        signupEmail.scrollIntoView({ behavior: preferredScrollBehavior(), block: "center" });
        signupEmail.focus({ preventScroll: true });
      });
    }

    function setSignupProgress(stage) {
      const stages = ["details", "safety", "email"];
      const labelFallbacks = ["Family details", "Safety check", "Confirm email"];
      const labels = stages.map((item, index) => translate(`auth.signup.progress.${item}`, {}, labelFallbacks[index]));
      signupProgressStage = stage === "complete" || stages.includes(stage) ? stage : "details";
      const activeIndex = stages.indexOf(signupProgressStage);
      document.querySelectorAll("[data-signup-progress]").forEach((item) => {
        const itemIndex = stages.indexOf(item.dataset.signupProgress);
        const complete = itemIndex < activeIndex || signupProgressStage === "complete";
        const active = itemIndex === activeIndex && signupProgressStage !== "complete";
        item.classList.toggle("complete", complete);
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
        const stateLabel = complete
          ? translate("auth.signup.progress.completed", {}, "Completed")
          : active
            ? translate("auth.signup.progress.current", {}, "Current step")
            : translate("auth.signup.progress.upcoming", {}, "Upcoming step");
        item.setAttribute(
          "aria-label",
          translate(
            "auth.signup.progress.step",
            { step: itemIndex + 1, total: stages.length, label: labels[itemIndex], state: stateLabel },
            `Step ${itemIndex + 1} of ${stages.length}: ${labels[itemIndex]}. ${stateLabel}.`
          )
        );
      });
    }

    function authButtonFor(kind) {
      if (kind === "signup") return document.querySelector("#createAccount");
      if (kind === "recovery") return document.querySelector("#sendRecoveryCode");
      return document.querySelector("#loginKiddoSprout");
    }

    function updateAuthActionButtons() {
      const actions = [
        [authButtonFor("login"), loginRequestInFlight, false, "auth.login.busy", "Logging in…", "auth.login", "Log In"],
        [authButtonFor("signup"), signupRequestInFlight, !AUTH_EMAIL_DELIVERY_READY, "auth.signup.busy", "Creating account…", "auth.signup.createAndSend", "Create Account & Send Email"],
        [authButtonFor("recovery"), recoveryRequestInFlight || recoveryResetInFlight, !AUTH_EMAIL_DELIVERY_READY, recoveryResetInFlight ? "auth.recovery.resetBusy" : "auth.recovery.busy", recoveryResetInFlight ? "Finishing PIN reset…" : "Sending code…", "auth.recovery.send", "Send One-Time Code"],
        [checkEmailConfirmationButton, confirmationRequestInFlight, false, "auth.signup.confirmationBusy", "Checking confirmation…", "auth.signup.confirmationContinue", "I've Confirmed — Continue"],
        [finishGoogleSetupButton, googleSetupRequestInFlight, false, "auth.signup.googleBusy", "Saving family setup…", "auth.signup.finishGoogle", "Finish Family Setup"]
      ];
      actions.forEach(([button, busy, unavailable, busyKey, busyFallback, readyKey, readyFallback]) => {
        if (!button) return;
        // Keep a busy action in the tab order so an async failure does not dump
        // keyboard focus onto <body>. Each handler already guards repeat calls.
        button.disabled = Boolean(unavailable);
        button.setAttribute("aria-disabled", String(Boolean(busy || unavailable)));
        const readyLabel = translate(readyKey, {}, readyFallback);
        if (busy) {
          button.dataset.authReadyLabel = readyLabel;
          button.textContent = translate(busyKey, {}, busyFallback);
        } else {
          button.textContent = readyLabel;
          delete button.dataset.authReadyLabel;
        }
        button.setAttribute("aria-busy", String(Boolean(busy)));
      });
      if (sendAccountPasswordRecoveryButton) {
        sendAccountPasswordRecoveryButton.disabled = !AUTH_EMAIL_DELIVERY_READY;
        sendAccountPasswordRecoveryButton.setAttribute("aria-disabled", String(accountPasswordRecoveryRequestInFlight || !AUTH_EMAIL_DELIVERY_READY));
        sendAccountPasswordRecoveryButton.setAttribute("aria-busy", String(accountPasswordRecoveryRequestInFlight));
        sendAccountPasswordRecoveryButton.textContent = accountPasswordRecoveryRequestInFlight
          ? translate("auth.accountRecovery.sending", {}, "Sending reset email…")
          : translate("auth.accountRecovery.send", {}, "Send reset email");
      }
      if (updateAccountPasswordButton) {
        updateAccountPasswordButton.setAttribute("aria-disabled", String(accountPasswordUpdateInFlight));
        updateAccountPasswordButton.setAttribute("aria-busy", String(accountPasswordUpdateInFlight));
        updateAccountPasswordButton.textContent = accountPasswordUpdateInFlight
          ? translate("auth.accountRecovery.updating", {}, "Updating password…")
          : translate("auth.accountRecovery.update", {}, "Update password");
      }
      [cancelAccountPasswordRecoveryButton, cancelAccountPasswordUpdateButton].forEach((button) => {
        if (!button) return;
        button.disabled = accountPasswordUpdateInFlight;
        button.setAttribute("aria-disabled", String(accountPasswordUpdateInFlight));
        button.textContent = accountPasswordUpdateInFlight
          ? translate("auth.accountRecovery.finishingAction", {}, "Finishing…")
          : translate("auth.accountRecovery.cancel", {}, "Cancel");
      });
      if (restartEmailSignupButton) {
        const restartUnavailable = confirmationRequestInFlight;
        restartEmailSignupButton.disabled = restartUnavailable;
        restartEmailSignupButton.setAttribute("aria-disabled", String(restartUnavailable));
        restartEmailSignupButton.textContent = translate(
          "auth.signup.confirmationChange",
          {},
          "Change email / Start over"
        );
      }
    }

    function humanCheckElements(kind) {
      if (kind === "signup") {
        return { container: signupHumanCheck, status: signupHumanCheckStatus, start: document.querySelector("#signupHumanCheckStart") };
      }
      if (kind === "recovery") {
        return { container: recoveryHumanCheck, status: recoveryHumanCheckStatus, start: document.querySelector("#recoveryHumanCheckStart") };
      }
      return { container: loginHumanCheck, status: loginHumanCheckStatus, start: document.querySelector("#loginHumanCheckStart") };
    }

    function setHumanCheckStatus(kind, message, verified = false) {
      const { status } = humanCheckElements(kind);
      if (!status) return;
      status.hidden = false;
      status.textContent = message;
      status.classList.toggle("verified", verified);
      status.dataset.state = verified ? "success" : "notice";
    }

    function setHumanCheckStartState(kind, state = "idle") {
      const { container, start } = humanCheckElements(kind);
      if (container) container.hidden = state === "idle";
      if (!start) return;
      const label = start.querySelector(".human-check-start-label");
      const verified = state === "verified";
      const checking = state === "checking";
      const emailUnavailable = (kind === "signup" || kind === "recovery") && !AUTH_EMAIL_DELIVERY_READY;
      start.dataset.state = state;
      start.disabled = emailUnavailable;
      start.setAttribute("aria-disabled", String(checking || verified || emailUnavailable));
      start.setAttribute("aria-pressed", String(verified));
      if (label) {
        label.textContent = verified
          ? translate("human.confirmed", {}, "Human confirmed")
          : checking
            ? translate("human.checking", {}, "Checking…")
            : translate("auth.notRobot", {}, "I’m not a robot");
      }
    }

    function rearmHumanCheck(kind, message = "Tick the box to confirm you’re human.") {
      const check = humanChecks[kind];
      if (!check) return;
      check.generation += 1;
      check.starting = false;
      check.token = "";
      const previousController = check.controller;
      check.controller = null;
      previousController?.remove();
      setHumanCheckStartState(kind, "idle");
      setHumanCheckStatus(kind, message, false);
      updateAuthActionButtons();
    }

    function clearHumanCheckToken(kind, message = "Tick the box to confirm you’re human.") {
      rearmHumanCheck(kind, message);
    }

    async function ensureHumanCheck(kind) {
      const check = humanChecks[kind];
      if (!check || check.controller || check.starting) return check?.controller || null;
      const { container, status, start } = humanCheckElements(kind);
      const button = authButtonFor(kind);
      if (!container || !status || !start || !button) return null;
      if ((kind === "signup" || kind === "recovery") && !AUTH_EMAIL_DELIVERY_READY) {
        setHumanCheckStatus(kind, EMAIL_DELIVERY_UNAVAILABLE_MESSAGE);
        return null;
      }
      const generation = check.generation + 1;
      check.generation = generation;
      check.starting = true;
      setHumanCheckStartState(kind, "checking");
      if (!window.KiddoSproutHumanCheck) {
        check.starting = false;
        setHumanCheckStartState(kind, "idle");
        setHumanCheckStatus(kind, "Safety check could not start. Refresh the page.");
        return null;
      }
      setHumanCheckStatus(kind, "Starting the safety check…");
      try {
        const controller = await window.KiddoSproutHumanCheck.render(container, {
          statusElement: status,
          widgetOptions: {
            action: `kiddosprout_${kind}`,
            appearance: "always",
            language: window.KiddoSproutLanguage?.turnstileLanguage?.(state?.languageMode) || "en",
            retry: "never",
            "refresh-expired": "never",
            "refresh-timeout": "never",
            size: "flexible",
            theme: document.body.classList.contains("theme-night") ? "dark" : "light"
          },
          onToken(token) {
            if (check.generation !== generation) return;
            check.token = token;
            updateAuthActionButtons();
            setHumanCheckStartState(kind, "verified");
            setHumanCheckStatus(kind, "Safety check complete.", true);
            if (kind === "signup" && signupProgressStage !== "email") setSignupProgress("safety");
          },
          onExpired() {
            if (check.generation === generation) rearmHumanCheck(kind, "Safety check expired. Tick the box again.");
          },
          onError() {
            if (check.generation === generation) rearmHumanCheck(kind, "Safety check failed. Tick the box to try again.");
          },
          onTimeout() {
            if (check.generation === generation) rearmHumanCheck(kind, "Safety check timed out. Tick the box to try again.");
          },
          onUnsupported() {
            if (check.generation === generation) rearmHumanCheck(kind, "This browser needs an update before the safety check can run.");
          }
        });
        if (check.generation !== generation) {
          controller.remove();
          return null;
        }
        check.controller = controller;
        check.starting = false;
        if (!check.token) setHumanCheckStatus(kind, "Finish the Cloudflare check below.");
        return controller;
      } catch (error) {
        if (check.generation === generation) {
          rearmHumanCheck(kind, "Safety check could not start. Tick the box to try again.");
        }
        return null;
      }
    }

    function requireHumanCheck(kind, statusElement) {
      const token = humanChecks[kind]?.token || humanChecks[kind]?.controller?.getToken() || "";
      if (token) return token;
      setAuthStatus(statusElement, "Complete the safety check first.", "error");
      setHumanCheckStatus(kind, "Tick the box to confirm you’re human.");
      humanCheckElements(kind).start?.focus();
      return "";
    }

    async function checkKiddoSupabaseConnection() {
      const checkGeneration = ++accountConnectionCheckGeneration;
      if (!loginSupabaseStatus) return;
      if (isDemoMode()) {
        loginSupabaseStatus.textContent = "Live account services are off in Demo Mode.";
        loginSupabaseStatus.classList.remove("success");
        return;
      }
      if (!SUPABASE_CONNECTED) {
        loginSupabaseStatus.textContent = "Account service is unavailable.";
        loginSupabaseStatus.classList.remove("success");
        setGoogleAuthAvailability(false, "Google sign-in is unavailable.");
        return;
      }
      loginSupabaseStatus.textContent = "Checking account service...";
      try {
        const headers = {
          apikey: SUPABASE_PUBLISHABLE_KEY
        };
        // Login readiness depends on Auth only. Probing the owner-protected
        // recipe table here produced an expected 401 in every signed-out
        // browser and made a healthy login screen look broken in diagnostics.
        const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
          headers,
          cache: "no-store",
          signal: authRequestSignal()
        });
        const authSettings = authResponse.ok ? await authResponse.json().catch(() => ({})) : {};
        if (checkGeneration !== accountConnectionCheckGeneration) return;
        const googleProviderReady = authSettings?.external?.google === true;
        setGoogleAuthAvailability(googleProviderReady, googleProviderReady
          ? "Google sign-in is ready."
          : "Google sign-in is being set up.");
        const ready = authResponse.ok;
        loginSupabaseStatus.textContent = ready ? "" : "Account service configuration needs attention.";
        loginSupabaseStatus.classList.toggle("success", ready);
      } catch (error) {
        if (checkGeneration !== accountConnectionCheckGeneration) return;
        loginSupabaseStatus.textContent = "Account service could not be reached.";
        loginSupabaseStatus.classList.remove("success");
        setGoogleAuthAvailability(false, "Google sign-in could not be checked.");
      }
    }

    function updateResendEmailButtons() {
      const label = resendEmailInFlight
        ? translate("auth.resendBusy", {}, "Sending confirmation email…")
        : resendEmailCooldown > 0
          ? translate("auth.resendCooldown", { seconds: resendEmailCooldown }, `Resend confirmation in ${resendEmailCooldown}s`)
          : translate("auth.resend", {}, "Resend Confirmation Email");
      [resendLoginEmailButton, resendSignupEmailButton].forEach((button) => {
        if (!button) return;
        button.textContent = label;
        button.hidden = !AUTH_EMAIL_DELIVERY_READY;
        button.disabled = !AUTH_EMAIL_DELIVERY_READY;
        button.setAttribute("aria-disabled", String(!AUTH_EMAIL_DELIVERY_READY || resendEmailInFlight || resendEmailCooldown > 0));
      });
    }

    function requireEmailDelivery(statusElement) {
      if (AUTH_EMAIL_DELIVERY_READY) return true;
      setAuthStatus(statusElement, translate("auth.emailUnavailable", {}, EMAIL_DELIVERY_UNAVAILABLE_MESSAGE), "error");
      showToast("Email sign-up and recovery are not enabled yet.");
      return false;
    }

    function requireAccountService(statusElement) {
      if (SUPABASE_CONNECTED) return true;
      setAuthStatus(statusElement, "KiddoSprout account service is not connected yet. Please try again after setup is complete.", "error");
      showToast("KiddoSprout account service is unavailable.");
      return false;
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

    function isValidEmailAddress(value) {
      const email = String(value || "").trim();
      return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setAuthStatus(element, message, stateName = "error") {
      if (!element) return;
      const success = stateName === "success";
      const error = stateName === "error";
      element.textContent = message;
      element.classList.toggle("success", success);
      element.dataset.state = stateName;
      element.setAttribute("role", error ? "alert" : "status");
      element.setAttribute("aria-live", error ? "assertive" : "polite");
      element.setAttribute("aria-atomic", "true");
    }

    function showAuthFieldError(statusElement, input, message, toastMessage = message) {
      setAuthStatus(statusElement, message, "error");
      if (input) {
        input.setAttribute("aria-invalid", "true");
        if (statusElement?.id) input.setAttribute("aria-errormessage", statusElement.id);
        input.focus();
      }
      // The nearby assertive error plus the focused field's aria-errormessage
      // already announces this problem. Keep the toast visual-only here so a
      // screen reader does not repeat the same error three times.
      showToast(toastMessage, { announce: false });
      return false;
    }

    function clearAuthFieldError(input) {
      input?.removeAttribute("aria-invalid");
      input?.removeAttribute("aria-errormessage");
    }

    function isAccountExistenceDisclosure(error) {
      const message = String(error?.message || error || "").toLowerCase();
      const code = String(error?.code || "").toLowerCase();
      return code.includes("user_already_exists")
        || code.includes("email_exists")
        || code.includes("user_not_found")
        || message.includes("already registered")
        || message.includes("already been registered")
        || message.includes("user not found");
    }

    function friendlySupabaseError(error) {
      const message = String(error?.message || error || "");
      const lower = message.toLowerCase();
      const code = String(error?.code || "").toLowerCase();
      if (error?.kind === "conflict") {
        return "Family settings changed in another tab. Reload before saving again.";
      }
      if (error?.kind === "schema_missing" || lower.includes("family storage has not been installed")) {
        return "Secure family storage needs setup before accounts can be used.";
      }
      if (error?.name === "AbortError" || error?.name === "TimeoutError" || lower.includes("timed out") || lower.includes("timeout") || lower.includes("<!doctype") || lower.includes("not valid json") || lower.includes("failed to fetch") || lower.includes("networkerror")) {
        return "Account service is temporarily unavailable.";
      }
      if (lower.includes("captcha") || lower.includes("verification process failed")) {
        return "Complete the safety check and try again.";
      }
      if (lower.includes("invalid login") || code.includes("invalid_credentials")) {
        return "That email and password did not match. Please try again.";
      }
      if (lower.includes("email not confirmed")) {
        return "That email and password could not be used. If you recently signed up, check your inbox for a confirmation link.";
      }
      if (code.includes("email_address_not_authorized") || lower.includes("email address not authorized")) {
        return "KiddoSprout email delivery is not ready for that address yet. Please ask the app owner to finish custom email setup.";
      }
      if (Number(error?.status) === 429 || code.includes("over_email_send_rate_limit") || lower.includes("rate limit") || lower.includes("email rate limit")) {
        return "Too many account requests. Wait a moment, then try again.";
      }
      if (Number(error?.status) >= 500) {
        return "Account service is temporarily unavailable.";
      }
      if (lower.includes("error sending") || lower.includes("smtp") || lower.includes("mailer")) {
        return "KiddoSprout could not send that email right now. Please try again later.";
      }
      if (lower.includes("expired") || lower.includes("invalid token") || lower.includes("invalid otp")) {
        return "That email link or code has expired. Please request a new one.";
      }
      if (code.includes("user_already_exists") || code.includes("email_exists") || code.includes("user_not_found")
          || lower.includes("already registered") || lower.includes("already been registered") || lower.includes("user not found")) {
        return "KiddoSprout could not complete that account request. Check the details or use password recovery.";
      }
      if (lower.includes("weak password") || lower.includes("password should be")) {
        return "Choose a stronger password with at least 8 characters.";
      }
      if (code.includes("email_address_invalid") || lower.includes("invalid email") || lower.includes("email address is invalid")) {
        return "Enter a complete email address, such as grownup@example.com.";
      }
      if (lower.includes("family hub belongs to a different parent account")) {
        return "This browser already has another family saved. Use that family’s parent login, or use a separate browser profile for a different family.";
      }
      if (lower.includes("localstorage") || lower.includes("browser storage") || lower.includes("quota")) {
        return "This browser could not save your sign-in. Check its storage or private-browsing settings, then try again.";
      }
      if (lower.includes("signups not allowed") || lower.includes("signup is disabled")) {
        return "New parent accounts are not available on this KiddoSprout setup yet.";
      }
      return "KiddoSprout could not complete that account request. Please try again.";
    }

    function emptyPendingRequest() {
      return ["No request", "No pending request", "-"];
    }

    function normalizePendingRequest(request) {
      if (!Array.isArray(request)) return null;
      const title = String(request[0] || "").trim();
      if (!title || title.toLowerCase() === "no request" || title.toLowerCase() === "no request yet") {
        return null;
      }
      return [
        title.slice(0, 100),
        String(request[1] || "Request from Child Mode").slice(0, 240),
        String(request[2] || title.slice(0, 1)).slice(0, 3),
        String(request[3] || "appDownload").slice(0, 40),
        ...request.slice(4, 8).map((value) => String(value ?? "").slice(0, 240))
      ];
    }

    function updatePendingRequestView(child) {
      child.pending = child.requests.length;
      child.currentRequest = child.requests[0]
        ? [...child.requests[0]]
        : emptyPendingRequest();
      return child.requests[0] || null;
    }

    function syncPendingRequests(child) {
      const reportedCount = Number.isFinite(Number(child.pending))
        ? Math.max(0, Math.floor(Number(child.pending)))
        : 0;
      const reportedRequest = normalizePendingRequest(child.currentRequest);
      const hadQueue = Array.isArray(child.requests);
      child.requests = hadQueue
        ? child.requests.map(normalizePendingRequest).filter(Boolean).slice(0, 100)
        : [];

      // Older saves and connected hub pages use currentRequest + pending. Fold
      // that latest request into the FIFO without inventing unrecoverable rows.
      const reportedKey = reportedRequest ? JSON.stringify(reportedRequest) : "";
      const queueHasReportedRequest = reportedKey && child.requests.some((request) => JSON.stringify(request) === reportedKey);
      if (reportedRequest && reportedCount > child.requests.length && !queueHasReportedRequest && child.requests.length < 100) {
        child.requests.push(reportedRequest);
      }

      return updatePendingRequestView(child);
    }

    function enqueuePendingRequest(child, request) {
      const normalized = normalizePendingRequest(request);
      if (!normalized) return false;
      syncPendingRequests(child);
      if (child.requests.length >= 100) return false;
      child.requests.push(normalized);
      updatePendingRequestView(child);
      return true;
    }

    function takePendingRequest(child) {
      syncPendingRequests(child);
      const request = child.requests.shift() || null;
      updatePendingRequestView(child);
      return request;
    }

    function removePendingRequests(child, predicate) {
      syncPendingRequests(child);
      child.requests = child.requests.filter((request) => !predicate(request));
      updatePendingRequestView(child);
    }

    function snapshotPendingRequestState(child) {
      syncPendingRequests(child);
      return {
        requests: child.requests.map((request) => [...request]),
        pending: child.pending,
        currentRequest: Array.isArray(child.currentRequest) ? [...child.currentRequest] : emptyPendingRequest()
      };
    }

    function pendingRequestKey(request) {
      return JSON.stringify(normalizePendingRequest(request) || []);
    }

    function enqueueTrackedPendingRequest(child, request) {
      if (!enqueuePendingRequest(child, request)) return null;
      return [...child.requests[child.requests.length - 1]];
    }

    function rollbackEnqueuedPendingRequest(child, snapshot, addedRequest) {
      if (!snapshot || !addedRequest) return;
      syncPendingRequests(child);
      const addedKey = pendingRequestKey(addedRequest);
      const originalCount = snapshot.requests.filter((request) => pendingRequestKey(request) === addedKey).length;
      const matchingIndexes = [];
      child.requests.forEach((request, index) => {
        if (pendingRequestKey(request) === addedKey) matchingIndexes.push(index);
      });
      if (matchingIndexes.length > originalCount) {
        child.requests.splice(matchingIndexes[matchingIndexes.length - 1], 1);
      }
      updatePendingRequestView(child);
    }

    function restoreRemovedPendingRequest(child, snapshot) {
      if (!snapshot) return;
      syncPendingRequests(child);
      const remainingOriginalCounts = new Map();
      snapshot.requests.forEach((request) => {
        const key = pendingRequestKey(request);
        remainingOriginalCounts.set(key, (remainingOriginalCounts.get(key) || 0) + 1);
      });
      const additions = [];
      child.requests.forEach((request) => {
        const key = pendingRequestKey(request);
        const remaining = remainingOriginalCounts.get(key) || 0;
        if (remaining > 0) remainingOriginalCounts.set(key, remaining - 1);
        else additions.push([...request]);
      });
      child.requests = [
        ...snapshot.requests.map((request) => [...request]),
        ...additions
      ].slice(0, 100);
      updatePendingRequestView(child);
    }

    function normalizeAppRules(child) {
      if (!child.appRules || typeof child.appRules !== "object" || Array.isArray(child.appRules)) {
        child.appRules = {};
      }
      const hadSavedFlyerRule = APP_RULE_VALUES.has(child.appRules.flyer);
      Object.entries(APP_CATALOG).forEach(([id, app]) => {
        if (!APP_RULE_VALUES.has(child.appRules[id])) {
          child.appRules[id] = app.defaultRule;
        }
      });
      if (!hadSavedFlyerRule && child.flyerAllowed === true) {
        child.appRules.flyer = "allowed";
      }
      child.flyerAllowed = child.appRules.flyer === "allowed";
    }

    function getAppRule(child, appId) {
      normalizeAppRules(child);
      return child.appRules[appId] || APP_CATALOG[appId]?.defaultRule || "request";
    }

    function isAppPausedByHomework(child, appId) {
      return Boolean(child?.homeworkMode) && HOMEWORK_PAUSED_APP_IDS.has(appId);
    }

    function effectiveAppRule(child, appId) {
      return isAppPausedByHomework(child, appId) ? "blocked" : getAppRule(child, appId);
    }

    function setAppRule(child, appId, rule) {
      normalizeAppRules(child);
      child.appRules[appId] = ["allowed", "request", "blocked"].includes(rule) ? rule : "request";
      if (appId === "flyer") {
        child.flyerAllowed = child.appRules.flyer === "allowed";
      }
    }

    function appRuleLabel(rule) {
      if (rule === "allowed") return translate("parent.appRule.allowedState", {}, "Allowed");
      if (rule === "blocked") return translate("parent.appRule.blockedState", {}, "Blocked");
      return translate("parent.appRule.requestState", {}, "Ask parent");
    }

    async function requestAppAccess(child, appId, control = null) {
      const app = APP_CATALOG[appId] || { title: "App", initial: "A", kind: "App" };
      syncPendingRequests(child);
      const alreadyWaiting = child.requests.some((request) => (
        request[3] === "appAccess" && request[4] === appId
      ));
      if (alreadyWaiting) {
        showToast(app.title + " is already waiting for parent review.");
        return false;
      }
      if (child.requests.length >= 100) {
        showToast("The parent request list is full. Review a request before adding another.");
        return false;
      }
      const previousRequests = snapshotPendingRequestState(child);
      return runCriticalSave({
        control,
        apply: () => enqueueTrackedPendingRequest(child, [
          app.title,
          `${child.name} wants to open ${app.title} (${app.kind}).`,
          app.initial,
          "appAccess",
          appId
        ]),
        rollback: (addedRequest) => rollbackEnqueuedPendingRequest(child, previousRequests, addedRequest),
        render,
        success: app.title + " request sent to parent dashboard.",
        failure: app.title + " request was not saved. Please try again."
      });
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
          rule: effectiveAppRule(child, id),
          domains: app.domains,
          keywordMatch: Boolean(app.keywordMatch)
        }));
    }

    function broadcastExtensionBlockRules() {
      if (isDemoMode()) return;
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
      } else if (event.data.type === "rulesSaveFailed") {
        showToast(event.data.message || "Browser blocker rules could not be saved. Try reloading the extension.");
      }
    });

    function formatMinutes(minutes) {
      const total = Number.isFinite(Number(minutes)) ? Math.max(0, Math.round(Number(minutes))) : 0;
      const hours = Math.floor(total / 60);
      const mins = total % 60;
      if (!hours) {
        return mins + "m";
      }
      return mins ? hours + "h " + mins + "m" : hours + "h";
    }

    function formatClock(seconds) {
      const total = Number.isFinite(Number(seconds)) ? Math.max(0, Math.floor(Number(seconds))) : 0;
      const mins = Math.floor(total / 60);
      const secs = String(total % 60).padStart(2, "0");
      return mins + ":" + secs;
    }

    function decorateRange(input) {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value || min);
      const progress = ((value - min) / (max - min)) * 100;
      input.style.setProperty("--range-progress", progress + "%");
    }

    function showToast(message, options = {}) {
      const announce = options.announce !== false;
      toast.setAttribute("role", announce ? "status" : "presentation");
      toast.setAttribute("aria-live", announce ? "polite" : "off");
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

    function readSafeFamilyPreferences() {
      try {
        const saved = JSON.parse(readBrowserStorage(window.localStorage, FAMILY_PREFERENCES_KEY, "null"));
        return window.KiddoSproutFamilyState?.safeLocalState?.(saved) || {
          themeMode: ["auto", "day", "night"].includes(saved?.themeMode) ? saved.themeMode : "auto",
          languageMode: window.KiddoSproutLanguage?.normalize?.(saved?.languageMode) || "en-GB"
        };
      } catch (error) {
        return { themeMode: "auto", languageMode: "en-GB" };
      }
    }

    function persistSafeFamilyPreferences(value = state) {
      const preferences = window.KiddoSproutFamilyState?.safeLocalState?.(value) || {
        themeMode: ["auto", "day", "night"].includes(value?.themeMode) ? value.themeMode : "auto",
        languageMode: window.KiddoSproutLanguage?.normalize?.(value?.languageMode) || "en-GB"
      };
      const saved = writeBrowserStorage(window.localStorage, FAMILY_PREFERENCES_KEY, JSON.stringify(preferences));
      return saved;
    }

    async function saveDisplayPreferences() {
      const demo = isDemoMode();
      const savedInBrowser = demo ? false : persistSafeFamilyPreferences(state);
      const ownerId = currentFamilySessionOwner();
      const savedInFamilyState = await saveState();
      return demo
        ? savedInFamilyState
        : savedInBrowser || (Boolean(ownerId) && savedInFamilyState);
    }

    function clearMigratedLegacyFamilyState(session = getKiddoSession()) {
      if (!legacyStateMatchesSession(session)) return false;
      if (!removeBrowserStorage(window.localStorage, FAMILY_STATE_KEY)) return false;
      legacyLocalFamilyState = null;
      return true;
    }

    function stageLegacyFamilyStateForMigration() {
      if (!legacyLocalFamilyState || familyStateOwnerId) return false;
      try {
        // Preserve an offline-safe migration copy until the owner-scoped cloud
        // write succeeds, but replace any readable legacy PIN with its one-way
        // verifier before updating that temporary copy.
        const staged = window.KiddoSproutFamilyState?.sanitizeCloudState?.(state);
        if (!staged || typeof staged !== "object" || Array.isArray(staged)) return false;
        if (!writeBrowserStorage(window.localStorage, FAMILY_STATE_KEY, JSON.stringify(staged))) return false;
        legacyLocalFamilyState = staged;
        return true;
      } catch (error) {
        return false;
      }
    }

    function currentFamilySessionOwner() {
      const session = getKiddoSession();
      return kiddoSessionVerified ? String(session?.user?.id || "").trim() : "";
    }

    async function saveState(showMessage = false) {
      if (isDemoMode()) {
        try {
          if (!window.KiddoSproutDemo.write(state)) throw new Error("Demo storage is unavailable.");
          if (showMessage) showToast("Demo changes saved in this tab.");
          return true;
        } catch (error) {
          if (showMessage) showToast("Demo changes could not be saved in this tab.");
          return false;
        }
      }

      persistSafeFamilyPreferences(state);
      const ownerId = currentFamilySessionOwner();
      // During first-time signup and legacy migration the verified session can
      // arrive a moment later. Keep that pending state in memory only; the
      // confirmation/login path saves it to the protected cloud row.
      if (!ownerId) {
        const pendingSafelyInMemory = familyStateBootstrapping || viewMode === "signup" || !state.parentAccountCreated;
        if (showMessage) {
          showToast(pendingSafelyInMemory
            ? "Sign in to finish saving private family details."
            : "A verified parent login is required to save family details.");
        }
        return pendingSafelyInMemory;
      }

      const familyStateApi = window.KiddoSproutFamilyState;
      if (typeof familyStateApi?.save !== "function" || typeof familyStateApi?.sanitizeCloudState !== "function") {
        if (showMessage) showToast("Secure family storage could not start.");
        return false;
      }

      let snapshot;
      try {
        snapshot = familyStateApi.sanitizeCloudState(state);
      } catch (error) {
        if (showMessage) showToast("These family settings could not be saved safely.");
        return false;
      }

      const generation = familySaveGeneration;
      const operation = familySaveTail.catch(() => null).then(async () => {
        if (generation !== familySaveGeneration || currentFamilySessionOwner() !== ownerId) {
          throw new Error("The parent account changed before these settings could be saved.");
        }
        return familyStateApi.save(snapshot, { expectedOwnerId: ownerId });
      });
      familySaveTail = operation.catch(() => null);

      try {
        await operation;
        if (generation === familySaveGeneration && currentFamilySessionOwner() === ownerId) {
          familyStateCloudReady = true;
        }
        clearMigratedLegacyFamilyState(getKiddoSession());
        if (showMessage) showToast("Family settings saved securely.");
        return true;
      } catch (error) {
        if (error?.kind === "conflict") {
          showToast("Family settings changed in another tab. Reload before saving again.");
        } else if (showMessage) {
          showToast("Family settings could not be saved securely. Reconnect and try again.");
        }
        return false;
      }
    }

    function isPlainFamilyRecord(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const prototype = Object.getPrototypeOf(value);
      return prototype === Object.prototype || prototype === null;
    }

    function boundedFamilyText(value, fallback = "", maximum = CHILD_PROFILE_SHORT_TEXT_LIMIT) {
      return typeof value === "string" ? value.slice(0, maximum) : fallback;
    }

    function boundedChildText(value, fallback = "", maximum = CHILD_PROFILE_SHORT_TEXT_LIMIT) {
      if (typeof value !== "string") return fallback;
      const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/gu, " ").trim();
      return cleaned.slice(0, maximum) || fallback;
    }

    function boundedFamilyInteger(value, fallback, minimum, maximum) {
      if ((typeof value !== "number" && typeof value !== "string") || value === "") return fallback;
      const number = Number(value);
      if (!Number.isFinite(number)) return fallback;
      return Math.min(maximum, Math.max(minimum, Math.round(number)));
    }

    function normalizeFamilyRows(value, fields, limit) {
      if (!Array.isArray(value)) return [];
      return value
        .filter(isPlainFamilyRecord)
        .slice(0, limit)
        .map((row) => {
          const normalized = Object.fromEntries(fields.map(([key, maximum, fallback = ""]) => [
            key,
            boundedFamilyText(row[key], fallback, maximum)
          ]));
          const childId = boundedChildText(row.childId, "", CHILD_PROFILE_ID_LIMIT);
          const id = boundedChildText(row.id, "", 200);
          const createdAt = boundedChildText(row.createdAt, "", 80);
          if (isSafeChildProfileId(childId)) normalized.childId = childId;
          if (id) normalized.id = id;
          if (createdAt && Number.isFinite(Date.parse(createdAt))) normalized.createdAt = createdAt;
          return normalized;
        });
    }

    function normalizeFamilyCollections(source) {
      const rules = Array.isArray(source.familyRules)
        ? source.familyRules
          .filter((rule) => typeof rule === "string")
          .map((rule) => rule.trim().slice(0, FAMILY_CONTENT_TEXT_LIMIT))
          .filter(Boolean)
          .slice(0, FAMILY_CONTENT_ITEM_LIMIT)
        : [];
      const chores = Array.isArray(source.chores)
        ? source.chores
          .map((chore) => typeof chore === "string" ? chore : isPlainFamilyRecord(chore) ? chore.title : "")
          .filter((title) => typeof title === "string")
          .map((title) => ({ title: title.trim().slice(0, CHILD_PROFILE_SHORT_TEXT_LIMIT) }))
          .filter((chore) => chore.title)
          .slice(0, FAMILY_CONTENT_ITEM_LIMIT)
        : [];
      return {
        safetyAlerts: normalizeFamilyRows(source.safetyAlerts, [
          ["child", CHILD_PROFILE_NAME_LIMIT],
          ["message", FAMILY_CONTENT_TEXT_LIMIT],
          ["time", 80]
        ], FAMILY_ACTIVITY_LIMIT),
        moodCheckins: normalizeFamilyRows(source.moodCheckins, [
          ["child", CHILD_PROFILE_NAME_LIMIT],
          ["mood", CHILD_PROFILE_SHORT_TEXT_LIMIT],
          ["time", 80]
        ], FAMILY_ACTIVITY_LIMIT),
        problemReports: normalizeFamilyRows(source.problemReports, [
          ["child", CHILD_PROFILE_NAME_LIMIT],
          ["type", 48, "Problem"],
          ["urgency", 80],
          ["note", FAMILY_CONTENT_TEXT_LIMIT],
          ["time", 80],
          ["status", 40, "New"]
        ], FAMILY_ACTIVITY_LIMIT),
        scanHistory: normalizeFamilyRows(source.scanHistory, [
          ["label", 48],
          ["result", 80],
          ["time", 80]
        ], FAMILY_SCAN_HISTORY_LIMIT),
        familyRules: rules,
        chores
      };
    }

    function normalizeChildBirthDate(value) {
      const date = typeof value === "string" ? value.trim() : "";
      const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return "";
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day
        ? date
        : "";
    }

    function isSafeChildProfileId(value) {
      return typeof value === "string"
        && value.length <= CHILD_PROFILE_ID_LIMIT
        && CHILD_PROFILE_ID_PATTERN.test(value)
        && !CHILD_PROFILE_UNSAFE_IDS.has(value);
    }

    function isSafeChildProfileEntry(id, child) {
      return isSafeChildProfileId(id) && isPlainFamilyRecord(child);
    }

    function normalizeChildProfile(value) {
      if (!isPlainFamilyRecord(value)) return null;
      const requests = Array.isArray(value.requests)
        ? value.requests.map(normalizePendingRequest).filter(Boolean).slice(0, CHILD_REQUEST_LIMIT)
        : [];
      const currentRequest = normalizePendingRequest(value.currentRequest);
      const reportedPending = boundedFamilyInteger(value.pending, 0, 0, CHILD_REQUEST_LIMIT);
      if (currentRequest
          && reportedPending > requests.length
          && requests.length < CHILD_REQUEST_LIMIT
          && !requests.some((request) => JSON.stringify(request) === JSON.stringify(currentRequest))) {
        requests.push(currentRequest);
      }

      const reportSource = isPlainFamilyRecord(value.report) ? value.report : {};
      const streakSource = isPlainFamilyRecord(value.streaks) ? value.streaks : {};
      const appRuleSource = isPlainFamilyRecord(value.appRules) ? value.appRules : {};
      const report = Object.fromEntries(["Explorer", "Stories", "Movement", "Games"].map((key) => [
        key,
        boundedFamilyInteger(reportSource[key], 0, 0, 1_000_000)
      ]));
      const streaks = Object.fromEntries(["reading", "homework", "exercise", "chores"].map((key) => [
        key,
        boundedFamilyInteger(streakSource[key], 0, 0, 100_000)
      ]));
      const appRules = Object.fromEntries(Object.entries(APP_CATALOG).map(([id, app]) => [
        id,
        APP_RULE_VALUES.has(appRuleSource[id]) ? appRuleSource[id] : app.defaultRule
      ]));
      if (!APP_RULE_VALUES.has(appRuleSource.flyer) && value.flyerAllowed === true) appRules.flyer = "allowed";

      const completedTaskIds = new Set(todayTasks.map((task) => task.id));
      const completedTasks = Array.isArray(value.completedTasks)
        ? [...new Set(value.completedTasks.filter((task) => typeof task === "string" && completedTaskIds.has(task)))]
        : [];
      const dailyWinIds = new Set(dailyGoalItems.map((goal) => goal.id));
      const dailyWinSource = isPlainFamilyRecord(value.dailyWins) ? value.dailyWins : {};
      const dailyWins = Object.fromEntries(
        Object.entries(dailyWinSource).filter(([id, done]) => dailyWinIds.has(id) && done === true)
      );
      const creatorQueue = Array.isArray(value.creatorQueue)
        ? value.creatorQueue
          .filter((item) => typeof item === "string")
          .map((item) => boundedChildText(item, "", 100))
          .filter(Boolean)
          .slice(0, CHILD_CREATOR_QUEUE_LIMIT)
        : [];
      const readingLog = Array.isArray(value.readingLog)
        ? value.readingLog
          .filter(isPlainFamilyRecord)
          .map((item) => ({
            title: boundedChildText(item.title, "Reading time", CHILD_PROFILE_SHORT_TEXT_LIMIT),
            minutes: boundedFamilyInteger(item.minutes, 10, 1, 120)
          }))
          .slice(0, CHILD_READING_LOG_LIMIT)
        : [];
      const achievementChart = Array.isArray(value.achievementChart)
        ? value.achievementChart
          .filter(isPlainFamilyRecord)
          .slice(0, CHILD_ACHIEVEMENT_LIMIT)
          .map((achievement, index) => {
            const target = boundedFamilyInteger(achievement.target, 1, 1, 100);
            return {
              id: boundedChildText(achievement.id, `goal-${index + 1}`, 100),
              title: boundedChildText(achievement.title, "New goal", 80),
              target,
              progress: boundedFamilyInteger(achievement.progress, 0, 0, target),
              reward: boundedChildText(achievement.reward, "", 80)
            };
          })
        : [];
      const dateOfBirth = normalizeChildBirthDate(value.dateOfBirth);
      const age = boundedFamilyInteger(value.age, "", 0, 120);
      const avatarIcon = CHILD_AVATAR_ICONS.has(value.avatarIcon) ? value.avatarIcon : "star";
      const avatarColor = /^#[0-9a-f]{6}$/i.test(String(value.avatarColor || "")) ? value.avatarColor : "#147d7f";
      const device = CHILD_DEVICES.has(value.device) ? value.device : "Tablet";
      const costume = CHILD_COSTUMES.has(value.costume) ? value.costume : "Explorer";
      const schoolYear = CHILD_SCHOOL_YEARS.has(value.schoolYear) ? value.schoolYear : "";

      return {
        name: boundedChildText(value.name, "Child", CHILD_PROFILE_NAME_LIMIT),
        dateOfBirth,
        age,
        device,
        avatarIcon,
        avatarColor,
        costume,
        schoolYear,
        emergencyContact: boundedChildText(value.emergencyContact, "", CHILD_PROFILE_SHORT_TEXT_LIMIT),
        careNote: boundedChildText(value.careNote, "", CHILD_PROFILE_NOTE_LIMIT),
        dailyLimit: boundedFamilyInteger(value.dailyLimit, 120, 30, 300),
        usedToday: boundedFamilyInteger(value.usedToday, 0, 0, 1440),
        pending: requests.length,
        blockedHits: boundedFamilyInteger(value.blockedHits, 0, 0, 1_000_000),
        bedtime: value.bedtime === true,
        currentRequest: requests[0] ? [...requests[0]] : emptyPendingRequest(),
        requests,
        report,
        streaks,
        homeworkMode: value.homeworkMode === true,
        creatorQueue,
        explorerFact: boundedFamilyInteger(value.explorerFact, 0, 0, 1_000_000),
        storyPage: boundedFamilyInteger(value.storyPage, 0, 0, 1_000_000),
        completedTasks,
        dailyWins,
        kindnessPoints: boundedFamilyInteger(value.kindnessPoints, 0, 0, 1_000_000),
        kindnessPrompt: boundedFamilyInteger(value.kindnessPrompt, 0, 0, 1_000_000),
        sparkIndex: boundedFamilyInteger(value.sparkIndex, 0, 0, 1_000_000),
        readingLog,
        waterCount: boundedFamilyInteger(value.waterCount, 0, 0, 10_000),
        eyeBreaks: boundedFamilyInteger(value.eyeBreaks, 0, 0, 10_000),
        achievementChart,
        flyerBest: boundedFamilyInteger(value.flyerBest, 0, 0, 1_000_000),
        flyerAllowed: appRules.flyer === "allowed",
        appRules
      };
    }

    function normalizeChildProfiles(value, activeChild = "") {
      if (!isPlainFamilyRecord(value)) return { children: Object.create(null), activeChild: "" };
      const validEntries = Object.entries(value).filter(([id, child]) => isSafeChildProfileEntry(id, child));
      let selectedEntries = validEntries.slice(0, CHILD_PROFILE_LIMIT);
      const requestedId = typeof activeChild === "string" ? activeChild : "";
      if (isSafeChildProfileId(requestedId)
          && !selectedEntries.some(([id]) => id === requestedId)) {
        const requestedEntry = validEntries.find(([id]) => id === requestedId);
        if (requestedEntry) selectedEntries = [...selectedEntries.slice(0, CHILD_PROFILE_LIMIT - 1), requestedEntry];
      }
      const children = Object.create(null);
      selectedEntries.forEach(([id, child]) => {
        const normalizedChild = normalizeChildProfile(child);
        if (normalizedChild) children[id] = normalizedChild;
      });
      const ids = Object.keys(children);
      return {
        children,
        activeChild: Object.prototype.hasOwnProperty.call(children, requestedId) ? requestedId : ids[0] || ""
      };
    }

    function repairChildCollectionShape() {
      if (!state) return [];
      const source = isPlainFamilyRecord(state.children) ? state.children : {};
      const validEntries = Object.entries(source).filter(([id, child]) => isSafeChildProfileEntry(id, child));
      let selectedEntries = validEntries.slice(0, CHILD_PROFILE_LIMIT);
      if (isSafeChildProfileId(state.activeChild)
          && !selectedEntries.some(([id]) => id === state.activeChild)) {
        const activeEntry = validEntries.find(([id]) => id === state.activeChild);
        if (activeEntry) selectedEntries = [...selectedEntries.slice(0, CHILD_PROFILE_LIMIT - 1), activeEntry];
      }
      const children = Object.create(null);
      selectedEntries.forEach(([id, child]) => { children[id] = child; });
      state.children = children;
      if (!Object.prototype.hasOwnProperty.call(children, state.activeChild)) {
        state.activeChild = Object.keys(children)[0] || "";
      }
      return Object.entries(children);
    }

    function normalizePrivateFamilyState(value) {
      const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
      const normalized = {
        ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
        ...source
      };
      normalized.wellbeingGoals = {
        ...DEFAULT_STATE.wellbeingGoals,
        ...(source.wellbeingGoals && typeof source.wellbeingGoals === "object" ? source.wellbeingGoals : {})
      };
      normalized.schedule = {
        ...DEFAULT_STATE.schedule,
        ...(source.schedule && typeof source.schedule === "object" ? source.schedule : {})
      };
      normalized.trustedContacts = normalizeTrustedContacts(normalized.trustedContacts).contacts;
      Object.assign(normalized, normalizeFamilyCollections({ ...DEFAULT_STATE, ...source }));
      normalized.parentNote = boundedFamilyText(normalized.parentNote, "", FAMILY_CONTENT_TEXT_LIMIT);
      normalized.focusGoal = boundedFamilyText(normalized.focusGoal, DEFAULT_STATE.focusGoal, CHILD_PROFILE_SHORT_TEXT_LIMIT);
      const profiles = normalizeChildProfiles(source.children, source.activeChild);
      normalized.children = profiles.children;
      normalized.activeChild = profiles.activeChild;
      cleanSavedBranding(normalized);
      removeDemoChildren(normalized);
      // Keep a valid legacy PIN in memory just long enough for
      // migrateLegacyParentPasscode() to replace it with a one-way verifier.
      // The temporary legacy recovery copy is sanitized immediately after the
      // verifier is made, then retained only until its cloud write succeeds.
      const legacyPasscode = String(source.parentPasscode || "");
      normalized.parentPasscode = /^\d{4,8}$/.test(legacyPasscode) ? legacyPasscode : "";
      normalized.parentPasscodeRecord ??= null;
      normalized.themeMode = ["auto", "day", "night"].includes(normalized.themeMode)
        ? normalized.themeMode
        : "auto";
      normalized.languageMode = window.KiddoSproutLanguage?.normalize?.(normalized.languageMode) || "en-GB";
      return normalized;
    }

    function legacyStateMatchesSession(session) {
      const legacy = legacyLocalFamilyState;
      if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return false;
      const ownerId = String(session?.user?.id || "").trim();
      const legacyOwnerId = String(legacy.parentAuthUserId || "").trim();
      if (legacyOwnerId) return legacyOwnerId === ownerId;
      const legacyEmail = String(legacy.parentEmail || "").trim().toLowerCase();
      const sessionEmail = String(session?.user?.email || "").trim().toLowerCase();
      return Boolean(legacyEmail && sessionEmail && legacyEmail === sessionEmail);
    }

    function signupStateFromVerifiedMetadata(session) {
      const profile = session?.user?.user_metadata;
      const setup = profile?.kiddosprout_signup_setup;
      const passcodeRecord = setup?.version === 1 ? setup.parent_passcode_record : null;
      if (!window.KiddoSproutPasscode?.isRecord?.(passcodeRecord)) return null;
      const parentEmail = String(session?.user?.email || "").trim().toLowerCase();
      if (!isValidEmailAddress(parentEmail)) return null;
      const secondParentEmail = String(profile.second_parent_email || "").trim().toLowerCase();
      return normalizePrivateFamilyState({
        ...state,
        familyName: String(profile.family_name || "KiddoSprout Family").trim().slice(0, 80) || "KiddoSprout Family",
        parentName: String(profile.parent_name || "Parent").trim().slice(0, 80) || "Parent",
        parentEmail,
        secondParentName: String(profile.second_parent_name || "").trim().slice(0, 80),
        secondParentEmail: isValidEmailAddress(secondParentEmail) && secondParentEmail !== parentEmail
          ? secondParentEmail
          : "",
        parentPasscode: "",
        parentPasscodeRecord: passcodeRecord,
        parentAccountCreated: true
      });
    }

    async function hydrateFamilyStateForSession(session) {
      if (isDemoMode()) return false;
      const ownerId = String(session?.user?.id || "").trim();
      if (!ownerId || !kiddoSessionVerified) {
        throw new Error("A verified parent login is required to load family details.");
      }
      if (familyStateOwnerId === ownerId && familyStateCloudReady) return true;
      const familyStateApi = window.KiddoSproutFamilyState;
      if (typeof familyStateApi?.load !== "function" || typeof familyStateApi?.migrate !== "function") {
        throw new Error("Secure family storage could not start.");
      }

      let cloudState = await familyStateApi.load({ expectedOwnerId: ownerId });
      if (!cloudState && legacyStateMatchesSession(session)) {
        // `state` contains the cleaned, in-memory copy. In particular, the
        // legacy readable PIN has already been replaced by its verifier before
        // this owner-scoped upload; the original localStorage object is used
        // only to confirm which account owns the migration.
        const migration = await familyStateApi.migrate(state, { expectedOwnerId: ownerId });
        cloudState = migration?.state || null;
      }
      if (!cloudState) {
        const recoveredSignupState = signupStateFromVerifiedMetadata(session);
        if (recoveredSignupState) {
          cloudState = await familyStateApi.save(recoveredSignupState, { expectedOwnerId: ownerId });
        }
      }
      if (cloudState) {
        state = normalizePrivateFamilyState(cloudState);
      } else {
        state = normalizePrivateFamilyState(state);
      }
      state.parentAuthUserId = ownerId;
      state.parentEmail ||= String(session.user.email || "").trim().toLowerCase();
      familyStateOwnerId = ownerId;
      familyStateCloudReady = Boolean(cloudState);
      if (cloudState) clearMigratedLegacyFamilyState(session);
      persistSafeFamilyPreferences(state);
      return Boolean(cloudState);
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

    function createSaveBatcher(options = {}) {
      const save = options.save;
      const canConfirm = options.canConfirm || (() => false);
      const generation = options.generation || (() => 0);
      const setTimer = options.setTimer || setTimeout;
      const clearTimer = options.clearTimer || clearTimeout;
      const delayMs = Math.max(0, Number(options.delayMs ?? 450));
      let timer = null;
      let running = false;
      let immediateRequested = false;
      let cancellationGeneration = 0;
      let waiters = [];

      function schedule() {
        if (running || waiters.length === 0) return;
        if (timer !== null) clearTimer(timer);
        const delay = immediateRequested ? 0 : delayMs;
        timer = setTimer(() => {
          timer = null;
          void drain();
        }, delay);
      }

      async function drain() {
        if (running || waiters.length === 0) return;
        running = true;
        const batch = waiters;
        waiters = [];
        immediateRequested = false;
        const activeGeneration = generation();
        const activeCancellationGeneration = cancellationGeneration;
        const applicable = batch.filter((waiter) => (
          waiter.generation === activeGeneration
          && waiter.cancellationGeneration === activeCancellationGeneration
        ));
        const confirmedWriteAvailable = applicable.length > 0 && Boolean(canConfirm());
        let saved = false;
        if (applicable.length > 0) {
          try {
            saved = Boolean(await save());
          } catch (error) {
            saved = false;
          }
        }
        const generationStillCurrent = generation() === activeGeneration;
        const batchWasNotCancelled = cancellationGeneration === activeCancellationGeneration;
        batch.forEach((waiter) => {
          waiter.resolve(Boolean(
            saved
            && generationStillCurrent
            && batchWasNotCancelled
            && waiter.generation === activeGeneration
            && waiter.cancellationGeneration === activeCancellationGeneration
            && (!waiter.confirmed || confirmedWriteAvailable)
          ));
        });
        running = false;
        if (waiters.length > 0) {
          // Promise continuations from the completed batch run before this
          // timer. A failed critical action can therefore roll back its
          // optimistic in-memory change before a later batch takes a snapshot.
          setTimer(schedule, 0);
        }
      }

      function queue(queueOptions = {}) {
        return new Promise((resolve) => {
          waiters.push({
            resolve,
            confirmed: queueOptions.confirmed === true,
            generation: generation(),
            cancellationGeneration
          });
          immediateRequested = immediateRequested || queueOptions.immediate === true;
          schedule();
        });
      }

      function cancel() {
        cancellationGeneration += 1;
        if (timer !== null) {
          clearTimer(timer);
          timer = null;
        }
        immediateRequested = false;
        const cancelled = waiters;
        waiters = [];
        cancelled.forEach((waiter) => waiter.resolve(false));
      }

      return Object.freeze({ queue, cancel });
    }

    const familySaveBatcher = createSaveBatcher({
      save: () => saveState(),
      canConfirm: () => isDemoMode() || Boolean(currentFamilySessionOwner()),
      generation: () => familySaveGeneration,
      setTimer: (callback, delay) => window.setTimeout(callback, delay),
      clearTimer: (timer) => window.clearTimeout(timer)
    });

    function queueSave(options = {}) {
      return familySaveBatcher.queue(options);
    }

    function cancelQueuedSaves() {
      familySaveBatcher.cancel();
    }

    function setCriticalSaveControlBusy(control, busy) {
      if (!control) return;
      control.setAttribute("aria-busy", String(busy));
      if (busy) {
        control.dataset.criticalSaveDisabled = String(Boolean(control.disabled));
        if ("disabled" in control) control.disabled = true;
        control.setAttribute("aria-disabled", "true");
        return;
      }
      const wasDisabled = control.dataset.criticalSaveDisabled === "true";
      delete control.dataset.criticalSaveDisabled;
      if ("disabled" in control) control.disabled = wasDisabled;
      if (wasDisabled) control.setAttribute("aria-disabled", "true");
      else control.removeAttribute("aria-disabled");
    }

    async function runCriticalSave(options = {}) {
      if (criticalSaveInFlight) {
        showToast("Please wait for the current save to finish.");
        return false;
      }
      criticalSaveInFlight = true;
      const actionState = state;
      const actionGeneration = familySaveGeneration;
      const control = options.control || null;
      const modeControl = document.querySelector("#modeToggle");
      const saveNowControl = document.querySelector("#saveNow");
      const busyControls = [...new Set([control, modeControl, saveNowControl].filter(Boolean))];
      let context;
      let applied = false;
      let saved = false;
      let actionStillCurrent = false;
      try {
        busyControls.forEach((busyControl) => setCriticalSaveControlBusy(busyControl, true));
        try {
          applied = true;
          context = options.apply?.();
          saved = await queueSave({ confirmed: true, immediate: true });
        } catch (error) {
          saved = false;
        }

        actionStillCurrent = state === actionState && familySaveGeneration === actionGeneration;
        if (!saved && applied && actionStillCurrent) {
          try {
            options.rollback?.(context);
          } catch (error) {
            window.console?.warn?.("KiddoSprout could not roll back a failed save.", error);
          }
        } else if (saved && actionStillCurrent) {
          try {
            options.onSuccess?.(context);
          } catch (error) {
            // Persistence is authoritative. Log presentation-only failures and
            // continue to the normal render instead of undoing a cloud write.
            window.console?.warn?.("KiddoSprout saved the change but could not finish its UI update.", error);
          }
        }
      } finally {
        busyControls.forEach((busyControl) => {
          try {
            setCriticalSaveControlBusy(busyControl, false);
          } catch (error) {
            // Always release the global lock, even if a detached control can no
            // longer be updated after an asynchronous save.
          }
        });
        criticalSaveInFlight = false;
      }

      if (!actionStillCurrent) return false;
      try {
        options.render?.(saved, context);
      } catch (error) {
        // Persistence already has an authoritative result; a later render can
        // safely repair a transient presentation failure.
        window.console?.warn?.("KiddoSprout could not refresh the saved view.", error);
      }
      const message = saved ? options.success : options.failure;
      const resolvedMessage = typeof message === "function" ? message(context) : message;
      if (resolvedMessage) showToast(resolvedMessage);
      return saved;
    }

    function themeChoiceLabel(choice, resolved) {
      if (choice === "auto") {
        return translate("theme.auto", {
          resolved: translate(resolved === "night" ? "theme.night" : "theme.day", {}, resolved === "night" ? "Night" : "Day")
        }, "Auto now using " + (resolved === "night" ? "Night" : "Day"));
      }
      return translate(choice === "night" ? "theme.night" : "theme.day", {}, choice === "night" ? "Night" : "Day");
    }

    function updateThemeStatus(output, choice, resolved) {
      if (!output) return;
      const resolvedLabel = translate(
        resolved === "night" ? "theme.night" : "theme.day",
        {},
        resolved === "night" ? "Night" : "Day"
      );
      const choiceLabel = translate(
        choice === "auto" ? "settings.theme.auto" : choice === "night" ? "settings.theme.night" : "settings.theme.day",
        {},
        choice === "auto" ? "Auto by time" : choice === "night" ? "Night" : "Day"
      );
      output.value = themeChoiceLabel(choice, resolved);
      output.dataset.resolvedTheme = resolved;
      output.setAttribute("aria-label", translate(
        "theme.currentA11y",
        { resolved: resolvedLabel, choice: choiceLabel },
        `Current look: ${resolvedLabel}. Theme setting: ${choiceLabel}.`
      ));
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
      const wasNight = document.body.classList.contains("theme-night");
      document.body.classList.toggle("theme-night", resolved === "night");
      document.body.classList.toggle("theme-day", resolved === "day");
      document.body.dataset.themeMode = themeChoice;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        "content",
        resolved === "night" ? "#0b202c" : "#3fa35b"
      );
      if (themeModeSetting) {
        themeModeSetting.value = themeChoice;
      }
      if (quickThemeModeSetting) {
        quickThemeModeSetting.value = themeChoice;
      }
      updateThemeStatus(themeModeStatus, themeChoice, resolved);
      updateThemeStatus(quickThemeModeStatus, themeChoice, resolved);
      const isNight = resolved === "night";
      if (wasNight !== isNight) {
        Object.entries(humanChecks).forEach(([kind, check]) => {
          if (!check.controller && !check.starting && !check.token) return;
          rearmHumanCheck(kind, translate("human.themeRearm", {}, "Theme changed. Tick the box to run the safety check again."));
        });
      }
    }

    async function saveThemeMode(choice = themeModeSetting.value) {
      const generation = ++displayPreferenceSaveGeneration;
      state.themeMode = ["auto", "day", "night"].includes(choice) ? choice : "auto";
      applyThemeMode(state.themeMode);
      const saved = await saveDisplayPreferences();
      if (generation !== displayPreferenceSaveGeneration) return saved;
      showToast(saved
        ? translate("theme.saved", { theme: themeChoiceLabel(state.themeMode, resolveTheme(state.themeMode)) }, `${themeChoiceLabel(state.themeMode, resolveTheme(state.themeMode))} theme saved.`)
        : translate("theme.notSaved", {}, "Theme changed for now, but this browser could not save it."));
      return saved;
    }

    function applyModeLanguage(mode = viewMode, heroKey = "") {
      const safeMode = ["child", "signup", "login", "parent"].includes(mode) ? mode : "parent";
      const modeToggle = document.querySelector("#modeToggle");
      const siteTitle = document.querySelector("#siteTitle");
      const heroTitle = document.querySelector("#heroTitle");
      const heroDescription = document.querySelector("#heroDescription");
      if (modeToggle) {
        modeToggle.textContent = translate(safeMode === "child" ? "mode.parentButton" : "mode.childButton", {}, safeMode === "child" ? "Parent Site" : "Child Site");
      }
      if (siteTitle) {
        siteTitle.textContent = translate(`mode.site.${safeMode}`, {}, `KiddoSprout ${safeMode === "parent" ? "Parent Dashboard" : safeMode[0].toUpperCase() + safeMode.slice(1)}`);
      }
      if (heroTitle) {
        heroTitle.textContent = translate(heroKey || `mode.hero.${safeMode}`, {}, "KiddoSprout helps kids grow online.");
      }
      if (heroDescription) {
        const childMode = safeMode === "child";
        heroDescription.textContent = translate(
          childMode ? "hero.child.description" : "hero.parent.description",
          {},
          childMode
            ? "Choose a hub, finish a small win, and share what you discover with someone at home."
            : "A brighter family hub for parent approvals, child requests, homework focus, recipe ideas, smart spending, safe games, and calm screen-time routines."
        );
      }
    }

    function applyDynamicLanguageText() {
      const needsChildProfile = viewMode === "parent" && !isDemoMode() && !hasChildProfiles();
      applyModeLanguage(viewMode, needsChildProfile ? "mode.hero.addChild" : "");
      const themeChoice = ["auto", "day", "night"].includes(state?.themeMode) ? state.themeMode : "auto";
      const resolvedTheme = resolveTheme(themeChoice);
      updateThemeStatus(themeModeStatus, themeChoice, resolvedTheme);
      updateThemeStatus(quickThemeModeStatus, themeChoice, resolvedTheme);
      renderFamilySchedule({ syncInputs: false });
      const child = currentChild();
      const childWelcome = document.querySelector("#childWelcome");
      const deviceState = document.querySelector("#deviceState");
      const deviceSub = document.querySelector("#deviceSub");
      if (!child) {
        if (childWelcome) childWelcome.textContent = translate("mode.noChild", {}, "Add a child profile");
        if (deviceState) deviceState.textContent = translate("parent.noChild", {}, "No child selected");
        if (deviceSub) deviceSub.textContent = translate("parent.noChildHelp", {}, "Create a child profile before using controls.");
        const appName = document.querySelector("#appName");
        const appMeta = document.querySelector("#appMeta");
        if (appName) appName.textContent = translate("parent.noRequest", {}, "No request yet");
        if (appMeta) appMeta.textContent = translate("parent.noRequestHelp", {}, "Requests appear here after a child profile exists.");
        return;
      }
      if (childWelcome) childWelcome.textContent = translate("mode.childWelcome", { name: child.name }, child.name + "'s Child Mode");
      renderAppAccessRules(child);
      renderHubAccess(child);
      if (deviceState || deviceSub) renderBedtimeStatus(child);
      renderPendingRequest(child);
    }

    function applyLanguageMode(choice = state?.languageMode || "en-GB", options = {}) {
      const previous = window.KiddoSproutLanguage?.current?.() || "en-GB";
      const language = window.KiddoSproutLanguage?.normalize?.(choice) || "en-GB";
      if (state) state.languageMode = language;
      window.KiddoSproutLanguage?.apply?.(language);
      setAccountPasswordRecoveryStage(accountPasswordUpdateFields.hidden ? "request" : "update");
      updateGoogleAuthPresentation();
      setSignupProgress(signupProgressStage);
      updateResendEmailButtons();
      if (languageModeSetting) languageModeSetting.value = language;
      if (quickLanguageModeSetting) quickLanguageModeSetting.value = language;
      applyDynamicLanguageText();
      applyDemoAvailability();
      if (kiddoAppInstalled) markKiddoSproutInstalled();
      else if (kiddoInstallInFlight || kiddoInstallPending) updateKiddoInstallButtons(kiddoInstallInFlight ? "opening" : "idle");
      if (pwaUpdateNotice && !pwaUpdateNotice.hidden) {
        showKiddoSproutUpdateNotice(pwaUpdateNotice.dataset.action || "activate");
      }
      if (options.rearm !== false && previous !== language) {
        Object.entries(humanChecks).forEach(([kind, check]) => {
          if (!check.controller && !check.starting && !check.token) return;
          rearmHumanCheck(kind, translate("human.rearm", {}, "Language changed. Tick the box to run the safety check again."));
        });
      }
      return language;
    }

    async function saveLanguageMode(choice = languageModeSetting?.value || "en-GB") {
      const generation = ++displayPreferenceSaveGeneration;
      const language = applyLanguageMode(choice);
      const label = window.KiddoSproutLanguage?.label?.(language) || language;
      const saved = await saveDisplayPreferences();
      if (generation !== displayPreferenceSaveGeneration) return saved;
      showToast(saved
        ? translate("language.saved", { language: label }, `Language changed to ${label}.`)
        : translate("language.notSaved", {}, "Language changed for now, but this browser could not save it."));
      return saved;
    }

    function syncPreferencesFromStorage(event) {
      if (event?.storageArea && event.storageArea !== window.localStorage) return;
      const preferencesCleared = event?.key === null
        || (event?.key === FAMILY_PREFERENCES_KEY && event.newValue === null);
      if (isDemoMode() || (!preferencesCleared && event?.key !== FAMILY_PREFERENCES_KEY)) return;
      try {
        const preferences = preferencesCleared
          ? { themeMode: "auto", languageMode: "en-GB" }
          : JSON.parse(event.newValue);
        if (!preferences || typeof preferences !== "object") return;
        displayPreferenceSaveGeneration += 1;
        if (Object.prototype.hasOwnProperty.call(preferences, "themeMode")) {
          const theme = ["auto", "day", "night"].includes(preferences.themeMode) ? preferences.themeMode : "auto";
          if (theme !== state?.themeMode) {
            state.themeMode = theme;
            applyThemeMode(theme);
          }
        }
        if (Object.prototype.hasOwnProperty.call(preferences, "languageMode")) {
          const language = window.KiddoSproutLanguage?.normalize?.(preferences.languageMode) || "en-GB";
          state.languageMode = language;
          applyLanguageMode(language);
        }
      } catch (error) {
        // Ignore damaged or unrelated writes from another tab and keep this tab usable.
      }
    }

    function cancelPendingModeEntryFocus() {
      modeEntryFocusGeneration += 1;
    }

    function fitSettingsMenuToViewport() {
      if (!settingsMenu.classList.contains("open")) return;
      settingsMenu.style.maxHeight = "";
      const viewport = window.visualViewport;
      const viewportBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight || document.documentElement.clientHeight;
      const menuTop = settingsMenu.getBoundingClientRect().top;
      const availableHeight = Math.floor(viewportBottom - Math.max(0, menuTop) - 16);
      settingsMenu.style.maxHeight = Math.max(44, availableHeight) + "px";
    }

    function setSettingsMenu(open, options = {}) {
      if (open) {
        cancelPendingModeEntryFocus();
        settingsMenu.removeAttribute("inert");
      }
      settingsMenu.classList.toggle("open", open);
      settingsMenu.setAttribute("aria-hidden", String(!open));
      settingsToggle.setAttribute("aria-expanded", String(open));
      if (!open) {
        settingsMenu.setAttribute("inert", "");
        settingsMenu.style.maxHeight = "";
      }
      if (open && options.focus === true) {
        // The open class removes visibility:hidden immediately. Focus now so
        // background-tab animation throttling cannot strand keyboard users on
        // the page behind the menu. Force Chromium to apply the visibility
        // change before focusing; otherwise it can reject this focus attempt
        // until a throttled timer eventually runs.
        settingsMenu.getBoundingClientRect();
        fitSettingsMenuToViewport();
        settingsClose.focus();
        window.setTimeout(() => {
          if (settingsMenu.classList.contains("open")
              && !settingsMenu.contains(document.activeElement)) {
            settingsClose.focus({ preventScroll: true });
          }
        }, 0);
      }
    }

    function closeSettingsMenu(options = {}) {
      const wasOpen = settingsMenu.classList.contains("open");
      const ownedFocus = settingsMenu.contains(document.activeElement);
      setSettingsMenu(false);
      const shouldRestoreFocus = options.restoreFocus === true
        || (ownedFocus && options.restoreFocus !== false);
      if (wasOpen && shouldRestoreFocus) {
        settingsToggle.focus({ preventScroll: true });
      }
    }

    function openParentSettingsFromMenu() {
      closeSettingsMenu();
      setMode("parent");
      const target = document.querySelector("#advancedSettings");
      if (!target || viewMode !== "parent" || parentGate.classList.contains("open")) return;
      target.open = true;
      cancelPendingModeEntryFocus();
      target.querySelector("summary")?.focus({ preventScroll: true });
      scrollToJumpTarget(target);
    }

    async function logoutKiddoSprout() {
      if (isDemoMode()) {
        exitDemoMode();
        return;
      }
      closeSettingsMenu();
      const session = getKiddoSession();
      const accessToken = String(session?.access_token || "");
      let serverLogoutConfirmed = !SUPABASE_CONNECTED || !accessToken;
      if (logoutKiddoSproutButton) {
        logoutKiddoSproutButton.disabled = true;
        logoutKiddoSproutButton.textContent = translate("settings.loggingOut", {}, "Logging out…");
      }

      // Invalidate the tab first: a slow/offline revocation request must not
      // leave private family UI usable or let a late refresh sign the user back in.
      cancelQueuedSaves();
      clearKiddoSession();
      clearLoginSecret();
      maskSignupSecrets({ clear: true });
      clearRecoverySecrets({ clearEmail: true, cancelRequest: true });
      removeBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY);
      removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
      removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
      hideAccountPasswordRecovery({ revokeSession: true });
      googleOnboardingActive = false;
      googleOnboardingSession = null;
      familySaveGeneration += 1;
      familyStateOwnerId = "";
      familyStateCloudReady = false;
      const preferences = readSafeFamilyPreferences();
      state = normalizePrivateFamilyState({
        ...DEFAULT_STATE,
        themeMode: preferences.themeMode,
        languageMode: preferences.languageMode
      });
      lockAchievementControls({ quiet: true, render: false });
      viewMode = "login";
      window.history.replaceState({}, "", window.location.pathname + window.location.search + "#login");
      setMode("login", { quiet: true });

      try {
        if (SUPABASE_CONNECTED && accessToken) {
          const response = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${accessToken}`
            },
            cache: "no-store",
            signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
              ? AbortSignal.timeout(5000)
              : undefined
          });
          serverLogoutConfirmed = response.ok;
        }
      } catch (error) {
        // Local logout already completed before the best-effort server request.
      } finally {
        if (logoutKiddoSproutButton) {
          logoutKiddoSproutButton.disabled = false;
          logoutKiddoSproutButton.textContent = translate("settings.logout", {}, "Log out");
        }
        showToast(serverLogoutConfirmed
          ? "You are safely logged out."
          : "Signed out on this browser. The account service could not confirm server logout.");
      }
    }

    function updateRoute(mode, options = {}) {
      const nextHash = "#" + mode;
      if (window.location.hash !== nextHash) {
        const method = options.replace === true ? "replaceState" : "pushState";
        window.history[method]({ mode }, "", nextHash);
      }
    }

    function syncModalBackgroundInert() {
      const familyCallModalOpen = document.querySelector("#familyCallModal")?.classList.contains("open") === true;
      const blockedByOverlay = parentGate.classList.contains("open") || appModal.classList.contains("open")
        || familyCallModalOpen;
      appShell?.toggleAttribute("inert", blockedByOverlay);
      demoBanner?.toggleAttribute("inert", blockedByOverlay);
    }

    window.addEventListener("kiddosprout:family-call-modal", syncModalBackgroundInert);

    function focusModeEntry(mode) {
      const requestGeneration = ++modeEntryFocusGeneration;
      const activeAtRequest = document.activeElement;
      window.requestAnimationFrame(() => {
        const activeNow = document.activeElement;
        const userMovedFocus = activeNow
          && activeNow !== activeAtRequest
          && activeNow !== document.body
          && activeNow !== document.documentElement
          && activeNow.isConnected
          && activeNow.getClientRects().length > 0;
        if (requestGeneration !== modeEntryFocusGeneration
            || userMovedFocus
            || viewMode !== mode
            || parentGate.classList.contains("open")
            || appModal.classList.contains("open")
            || settingsMenu.classList.contains("open")) return;
        const candidates = mode === "login"
          ? [loginEmail, document.querySelector(".login-only .card-head h2")]
          : mode === "signup"
            ? [signupFamily, googleSignupButton, document.querySelector("#signupEntryTitle")]
            : mode === "child"
              ? [document.querySelector("#childWelcome")]
              : [document.querySelector("#heroTitle")];
        const target = candidates.find((candidate) => {
          if (!candidate || candidate.disabled || candidate.getAttribute("aria-disabled") === "true") return false;
          if (candidate.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
          return candidate.getClientRects().length > 0;
        });
        if (!target) return;
        if (!target.matches("input, select, textarea, button, a[href], [tabindex]")) {
          target.setAttribute("tabindex", "-1");
        }
        target.focus({ preventScroll: true });
      });
    }

    function showParentGate() {
      cancelPendingModeEntryFocus();
      closeSettingsMenu();
      if (!parentGate.classList.contains("open") && document.activeElement?.focus) {
        parentGateTrigger = document.activeElement;
      }
      parentGate.removeAttribute("inert");
      parentGate.classList.add("open");
      parentGate.setAttribute("aria-hidden", "false");
      syncModalBackgroundInert();
      lockBox.classList.remove("success", "slide-away");
      passcodeInput.value = "";
      passcodeInput.type = "password";
      viewPassword.checked = false;
      clearRecoverySecrets({ cancelRequest: true });
      forgotPanel.style.display = "none";
      forgotPasswordButton.setAttribute("aria-expanded", "false");
      passcodeStatus.textContent = "";
      checkServerLockout();
      const locked = updatePasscodeLockout();
      if (GOOGLE_AUTH_CONFIGURED) checkKiddoSupabaseConnection();
      (locked ? document.querySelector("#backToChild") : passcodeInput).focus();
    }

    function hideParentGate() {
      const wasOpen = parentGate.classList.contains("open");
      clearRecoverySecrets({ cancelRequest: true });
      if (humanChecks.recovery.controller || humanChecks.recovery.starting || humanChecks.recovery.token) {
        rearmHumanCheck("recovery");
      }
      parentGate.classList.remove("open");
      parentGate.setAttribute("aria-hidden", "true");
      parentGate.setAttribute("inert", "");
      syncModalBackgroundInert();
      if (wasOpen && parentGateTrigger?.isConnected) {
        const returnTarget = parentGateTrigger;
        parentGateTrigger = null;
        window.requestAnimationFrame(() => returnTarget.focus({ preventScroll: true }));
      }
    }

    function setMode(mode, options = {}) {
      closeSettingsMenu();
      const demoMode = isDemoMode();
      if (demoMode && mode !== "parent" && mode !== "child") mode = "parent";
      if (accountPasswordUpdateInFlight && mode !== "login") {
        viewMode = "login";
        updateRoute("login", { replace: true });
        showAccountPasswordRecovery("update");
        setAuthStatus(
          accountPasswordRecoveryStatus,
          translate(
            "auth.accountRecovery.finishing",
            {},
            "Your new password is being saved. Keep this page open until it finishes."
          ),
          "notice"
        );
        window.requestAnimationFrame(() => {
          accountPasswordRecoveryPanel.scrollIntoView({ behavior: preferredScrollBehavior(), block: "center" });
        });
        return;
      }
      if (mode !== viewMode) authViewGeneration += 1;
      if (mode !== "login") clearLoginSecret();
      if (mode !== "login" && accountPasswordRecoveryPanel && !accountPasswordRecoveryPanel.hidden) {
        hideAccountPasswordRecovery({ revokeSession: true, clearTransaction: true });
      }
      if (mode !== "signup") maskSignupSecrets({ clear: true });
      if (demoMode) parentUnlocked = true;
      if (viewMode === "child" && mode !== "child") abandonFocusSession();
      if (mode !== "login" && (humanChecks.login.controller || humanChecks.login.starting || humanChecks.login.token)) {
        rearmHumanCheck("login");
      }
      if (mode !== "signup" && (humanChecks.signup.controller || humanChecks.signup.starting || humanChecks.signup.token)) {
        rearmHumanCheck("signup");
      }
      const enteringChildMode = mode === "child" && viewMode !== "child";
      if (mode !== "child" || enteringChildMode) {
        lockAchievementControls({ quiet: true, render: false });
      }
      if ((mode === "parent" || mode === "child") && !demoMode && !hasKiddoSession()) {
        viewMode = "login";
        updateRoute("login", { replace: options.replaceHistory === true });
        document.body.classList.remove("mode-child", "mode-signup");
        document.body.classList.add("mode-login");
        applyModeLanguage("login");
        if (loginSupabaseStatus) {
          loginSupabaseStatus.textContent = SUPABASE_CONNECTED ? "" : "Account service is unavailable.";
          loginSupabaseStatus.classList.remove("success");
          checkKiddoSupabaseConnection();
        }
        hideParentGate();
        closeApp();
        if (state) {
          render();
        }
        rearmHumanCheck("login");
        focusModeEntry("login");
        if (!options.quiet) {
          showToast("Log in to open KiddoSprout.");
        }
        return;
      }
      if ((mode === "parent" || mode === "child") && !demoMode && !hasParentAccount()) {
        viewMode = "signup";
        updateRoute("signup", { replace: options.replaceHistory === true });
        document.body.classList.remove("mode-child", "mode-login");
        document.body.classList.add("mode-signup");
        applyModeLanguage("signup");
        hideParentGate();
        closeApp();
        if (state) {
          render();
        }
        rearmHumanCheck("signup");
        focusModeEntry("signup");
        if (!options.quiet) {
          showToast("Create a parent account first.");
        }
        return;
      }
      if (mode === "parent" && !demoMode && !parentUnlocked && !options.unlocked) {
        updateRoute("parent", { replace: options.replaceHistory === true });
        showParentGate();
        return;
      }
      if (mode === "child" && !hasChildProfiles()) {
        if (!parentUnlocked && !options.unlocked) {
          updateRoute("parent", { replace: options.replaceHistory === true });
          showParentGate();
          if (!options.quiet) {
            showToast("Parent must unlock before adding a child profile.");
          }
          return;
        }
        viewMode = "parent";
        updateRoute("parent", { replace: options.replaceHistory === true });
        document.body.classList.remove("mode-child", "mode-signup");
        applyModeLanguage("parent", "mode.hero.addChild");
        hideParentGate();
        closeApp();
        if (state) {
          render();
        }
        window.setTimeout(() => {
          const target = document.querySelector("#manageChildren");
          if (target) {
            target.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
          }
        }, 220);
        if (!options.quiet) {
          showToast("Add your first child profile before opening the child site.");
        }
        return;
      }
      if (!demoMode && (mode === "child" || mode === "signup" || mode === "login")) {
        parentUnlocked = false;
        removeBrowserStorage(window.sessionStorage, "parentUnlocked");
      }
      viewMode = mode;
      updateRoute(mode, { replace: options.replaceHistory === true });
      document.body.classList.toggle("mode-child", mode === "child");
      document.body.classList.toggle("mode-signup", mode === "signup");
      document.body.classList.toggle("mode-login", mode === "login");
      applyModeLanguage(mode);
      hideParentGate();
      closeApp();
      if (state) {
        render();
      }
      applyDemoAvailability();
      if (mode === "login" && loginSupabaseStatus) {
        loginSupabaseStatus.textContent = SUPABASE_CONNECTED ? "" : "Account service is unavailable.";
        loginSupabaseStatus.classList.remove("success");
      }
      if (mode === "login" || mode === "signup") {
        rearmHumanCheck(mode);
        updateGoogleAuthPresentation();
        checkKiddoSupabaseConnection();
      }
      if (!options.quiet) {
        showToast(demoMode
          ? (mode === "child" ? "Demo Child Site opened." : "Demo Parent Dashboard opened.")
          : mode === "child" ? "Child Site opened." : mode === "signup" ? "Sign up opened." : mode === "login" ? "Login opened." : "Parent Dashboard opened.");
      }
      // setMode is also used by history navigation, authentication callbacks,
      // and delayed safety redirects. Own the entry focus here so those routes
      // cannot reveal a new view while leaving keyboard focus on hidden content.
      focusModeEntry(mode);
    }

    let modeRouteSyncQueued = false;
    function synchronizeModeRoute() {
      if (modeRouteSyncQueued) return;
      modeRouteSyncQueued = true;
      // Fragment history traversal can dispatch both popstate and hashchange.
      // Read the latest URL once on the next task so gates, human checks, and
      // delayed entry focus are not reset twice for one browser action.
      window.setTimeout(() => {
        modeRouteSyncQueued = false;
        parentUnlocked = readBrowserStorage(window.sessionStorage, "parentUnlocked") === "true";
        const nextMode = (window.location.hash || "#login").slice(1);
        const safeMode = ["child", "parent", "signup", "login"].includes(nextMode) ? nextMode : "login";
        setMode(safeMode, { quiet: true, replaceHistory: true });
      }, 0);
    }

    function openChildModeFromHero() {
      setMode("child");
      if (viewMode !== "child") {
        return;
      }
      const childWelcome = document.querySelector("#childWelcome");
      if (childWelcome) {
        childWelcome.setAttribute("tabindex", "-1");
        childWelcome.focus({ preventScroll: true });
      }
    }

    async function unlockParent() {
      if (unlockParentButton.disabled) return;
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

      const candidatePasscode = passcodeInput.value;
      unlockParentButton.disabled = true;
      passcodeStatus.textContent = "Checking PIN…";
      let passcodeMatches = false;
      try {
        passcodeMatches = await verifyParentPasscode(candidatePasscode);
      } catch (error) {
        passcodeStatus.textContent = "Secure PIN checking is unavailable in this browser.";
        showToast(passcodeStatus.textContent);
        unlockParentButton.disabled = false;
        return;
      }

      if (passcodeMatches) {
        parentUnlocked = true;
        failedPasscodeAttempts = 0;
        lockoutUntil = 0;
        writeBrowserStorage(window.sessionStorage, "parentUnlocked", "true");
        removeBrowserStorage(window.localStorage, "kiddoSproutLockoutUntil");
        removeBrowserStorage(window.localStorage, "kiddoSproutFailedAttempts");
        removeBrowserStorage(window.sessionStorage, "failedPasscodeAttempts");
        removeBrowserStorage(window.sessionStorage, "lockoutUntil");
        showPasscodeSuccess("Welcome");
        window.setTimeout(() => lockBox.classList.add("slide-away"), 520);
        window.setTimeout(() => {
          setMode("parent", { unlocked: true });
          focusModeEntry("parent");
        }, 1780);
        return;
      }

      failedPasscodeAttempts = Number(readBrowserStorage(window.localStorage, "kiddoSproutFailedAttempts", "0")) + 1;
      writeBrowserStorage(window.localStorage, "kiddoSproutFailedAttempts", failedPasscodeAttempts);
      writeBrowserStorage(window.sessionStorage, "failedPasscodeAttempts", failedPasscodeAttempts);
      passcodeInput.value = "";
      shakePasscodeBox();

      if (failedPasscodeAttempts >= 3) {
        lockoutUntil = Date.now() + 30000;
        writeBrowserStorage(window.localStorage, "kiddoSproutLockoutUntil", lockoutUntil);
        writeBrowserStorage(window.sessionStorage, "lockoutUntil", lockoutUntil);
        updatePasscodeLockout();
        showToast("Too many attempts. Try again in 30 seconds.");
        return;
      }

      unlockParentButton.disabled = false;
      const triesLeft = 3 - failedPasscodeAttempts;
      passcodeStatus.textContent = "Incorrect PIN. " + triesLeft + " tries left.";
      showToast(passcodeStatus.textContent);
    }

    function checkServerLockout() {
      const sharedLockout = Number(readBrowserStorage(window.localStorage, "kiddoSproutLockoutUntil", "0"));
      if (sharedLockout > Date.now()) {
        lockoutUntil = sharedLockout;
        writeBrowserStorage(window.sessionStorage, "lockoutUntil", lockoutUntil);
        updatePasscodeLockout();
      } else if (sharedLockout) {
        lockoutUntil = 0;
        failedPasscodeAttempts = 0;
        removeBrowserStorage(window.localStorage, "kiddoSproutLockoutUntil");
        removeBrowserStorage(window.localStorage, "kiddoSproutFailedAttempts");
        removeBrowserStorage(window.sessionStorage, "lockoutUntil");
        removeBrowserStorage(window.sessionStorage, "failedPasscodeAttempts");
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

    async function saveParentPasscode() {
      const nextPasscode = passcodeSetting.value.trim();
      if (!/^\d{4,8}$/.test(nextPasscode)) {
        passcodeSettingStatus.classList.remove("success");
        setTranslatedText(passcodeSettingStatus, "settings.passcode.useDigits", "Use 4–8 digits");
        showToast(translate("settings.passcode.useDigitsToast", {}, "Use 4–8 digits for the parent passcode."));
        return;
      }
      const previousRecord = state.parentPasscodeRecord;
      const previousLegacyPasscode = state.parentPasscode;
      savePasscodeSettingButton.disabled = true;
      passcodeSettingStatus.classList.remove("success");
      setTranslatedText(passcodeSettingStatus, "settings.passcode.securing", "Securing…");
      try {
        await storeParentPasscode(nextPasscode);
        if (!await saveState()) {
          state.parentPasscodeRecord = previousRecord;
          state.parentPasscode = previousLegacyPasscode;
          throw new Error("The new PIN could not be saved securely.");
        }
        passcodeSetting.value = "";
        viewSettingPassword.checked = false;
        passcodeSetting.type = "password";
        setTranslatedText(passcodeSettingStatus, "settings.passcode.set", "PIN set");
        passcodeSettingStatus.classList.add("success");
        showToast(translate("settings.passcode.updated", {}, "Parent passcode updated securely."));
        window.setTimeout(() => {
          passcodeSettingStatus.classList.remove("success");
        }, 900);
      } catch (error) {
        passcodeSettingStatus.classList.remove("success");
        setTranslatedText(passcodeSettingStatus, "settings.passcode.couldNotSave", "Could not save securely");
        showToast(error?.message === "The new PIN could not be saved securely."
          ? translate("settings.passcode.saveError", {}, "The parent PIN could not be saved securely.")
          : error?.message || translate("settings.passcode.saveError", {}, "The parent PIN could not be saved securely."));
      } finally {
        savePasscodeSettingButton.disabled = false;
      }
    }

    function clearSecondParentValidation() {
      clearAuthFieldError(secondParentNameSetting);
      clearAuthFieldError(secondParentEmailSetting);
      setAuthStatus(secondParentStatus, "", "notice");
    }

    function saveSecondParent() {
      const name = secondParentNameSetting.value.trim();
      const email = secondParentEmailSetting.value.trim().toLowerCase();
      clearAuthFieldError(secondParentNameSetting);
      clearAuthFieldError(secondParentEmailSetting);
      if ((name && !email) || (!name && email)) {
        const missingInput = name ? secondParentEmailSetting : secondParentNameSetting;
        const message = translate("settings.secondParent.completeBoth", {}, "Add both second parent name and email, or leave both blank.");
        return showAuthFieldError(secondParentStatus, missingInput, message);
      }
      if (email && !isValidEmailAddress(email)) {
        return showAuthFieldError(
          secondParentStatus,
          secondParentEmailSetting,
          translate("settings.secondParent.invalidEmail", {}, "Enter a complete second parent email.")
        );
      }
      const parentEmail = String(state.parentEmail || "").trim().toLowerCase();
      if (email && parentEmail && email === parentEmail) {
        return showAuthFieldError(
          secondParentStatus,
          secondParentEmailSetting,
          translate("settings.secondParent.sameEmail", {}, "Use a different email for the second parent.")
        );
      }
      state.secondParentName = name;
      state.secondParentEmail = email;
      queueSave();
      const message = name
        ? translate("settings.secondParent.saved", {}, "Second parent saved.")
        : translate("settings.secondParent.cleared", {}, "Second parent cleared.");
      setAuthStatus(secondParentStatus, message, "success");
      showToast(message, { announce: false });
    }

    async function loginKiddoSprout() {
      const loginButton = authButtonFor("login");
      if (loginRequestInFlight) return;
      if (!requireAccountService(loginStatus)) return;
      const email = loginEmail.value.trim().toLowerCase();
      const password = loginPassword.value;
      if (!email) return showAuthFieldError(loginStatus, loginEmail, "Enter your parent email.");
      if (!isValidEmailAddress(email)) return showAuthFieldError(loginStatus, loginEmail, "Enter a complete email address, such as grownup@example.com.");
      if (!password) return showAuthFieldError(loginStatus, loginPassword, "Enter your KiddoSprout password.");
      const captchaToken = requireHumanCheck("login", loginStatus);
      if (!captchaToken) return;
      const operationGeneration = authViewGeneration;
      loginRequestInFlight = true;
      updateAuthActionButtons();
      setAuthStatus(loginStatus, "Logging in…", "notice");
      try {
        const session = await kiddoSignInRequest(email, password, captchaToken);
        if (operationGeneration !== authViewGeneration || viewMode !== "login") {
          void endTemporaryAuthSession(session?.access_token);
          return;
        }
        acceptKiddoSession(session);
        clearLoginSecret();
        const familyStateLoaded = await hydrateFamilyStateForSession(session);
        if (operationGeneration !== authViewGeneration || viewMode !== "login") {
          clearKiddoSession();
          void endTemporaryAuthSession(session?.access_token);
          return;
        }
        state.parentEmail = email;
        state.parentName ||= "Parent";
        state.familyName ||= "KiddoSprout Family";
        state.parentAccountCreated = true;
        const stateSaved = await saveState();
        if (operationGeneration !== authViewGeneration || viewMode !== "login") return;
        if (!familyStateLoaded && !stateSaved) {
          parentUnlocked = false;
          removeBrowserStorage(window.sessionStorage, "parentUnlocked");
          clearHumanCheckToken("login", "Complete the safety check again after reconnecting, then log in.");
          setAuthStatus(
            loginStatus,
            "Login succeeded, but this account's family hub could not be created securely. Reconnect, then log in again.",
            "error"
          );
          showToast("Family setup could not be saved securely.");
          return;
        }
        humanChecks.login.controller?.remove();
        humanChecks.login.controller = null;
        humanChecks.login.token = "";
        parentUnlocked = true;
        writeBrowserStorage(window.sessionStorage, "parentUnlocked", "true");
        setAuthStatus(loginStatus, stateSaved
          ? "Welcome back"
          : "Welcome back. Secure family storage could not save your latest details; reconnect and try again.", stateSaved ? "success" : "error");
        showToast("Logged in to KiddoSprout.");
        window.setTimeout(() => {
          if (operationGeneration !== authViewGeneration || viewMode !== "login") return;
          loginStatus.classList.remove("success");
          setMode("parent", { unlocked: true });
          focusModeEntry("parent");
        }, 700);
      } catch (error) {
        if (operationGeneration !== authViewGeneration || viewMode !== "login") return;
        setAuthStatus(loginStatus, friendlySupabaseError(error), "error");
        clearHumanCheckToken("login");
        showToast("KiddoSprout login failed.");
      } finally {
        loginRequestInFlight = false;
        updateAuthActionButtons();
      }
    }

    async function resendKiddoSproutEmail(source = "login") {
      if (resendEmailInFlight) return;
      const statusElement = source === "signup" ? signupStatus : loginStatus;
      const emailInput = source === "signup" ? signupEmail : loginEmail;
      const fallbackEmail = loginEmail.value.trim().toLowerCase() || signupEmail.value.trim().toLowerCase() || state.parentEmail || "";
      const email = (emailInput.value.trim().toLowerCase() || fallbackEmail).trim();

      if (!requireEmailDelivery(statusElement)) return;
      if (!requireAccountService(statusElement)) return;

      if (resendEmailCooldown > 0) {
        setAuthStatus(statusElement, `Wait ${resendEmailCooldown} seconds before resending.`, "notice");
        return;
      }

      if (!email) {
        return showAuthFieldError(statusElement, emailInput, "Enter your parent email first.", "Enter your email first.");
      }
      if (!isValidEmailAddress(email)) {
        return showAuthFieldError(statusElement, emailInput, "Enter a complete email address before resending.");
      }

      const captchaToken = requireHumanCheck(source, statusElement);
      if (!captchaToken) return;

      resendEmailInFlight = true;
      updateResendEmailButtons();
      setAuthStatus(statusElement, "Sending confirmation email…", "notice");
      try {
        await kiddoResendSignupEmail(email, captchaToken);
        setAuthStatus(statusElement, "If an unconfirmed KiddoSprout account matches that email, a confirmation link will arrive. Check the inbox and spam folder.", "success");
        showToast("Confirmation request finished.");
        startResendEmailCooldown();
        window.setTimeout(() => statusElement.classList.remove("success"), 2000);
      } catch (error) {
        if (isAccountExistenceDisclosure(error)) {
          setAuthStatus(statusElement, "If an unconfirmed KiddoSprout account matches that email, a confirmation link will arrive. Check the inbox and spam folder.", "success");
          startResendEmailCooldown();
          showToast("Confirmation request finished.");
        } else {
          setAuthStatus(statusElement, friendlySupabaseError(error), "error");
          showToast("Could not resend email.");
        }
      } finally {
        resendEmailInFlight = false;
        clearHumanCheckToken(source, "Complete the safety check again before another account request.");
        updateResendEmailButtons();
      }
    }

    async function requestAccountPasswordRecovery() {
      if (accountPasswordRecoveryRequestInFlight) return;
      if (!requireEmailDelivery(accountPasswordRecoveryStatus)) return;
      if (!requireAccountService(accountPasswordRecoveryStatus)) return;
      const email = loginEmail.value.trim().toLowerCase();
      if (!email) return showAuthFieldError(
        accountPasswordRecoveryStatus,
        loginEmail,
        translate("auth.accountRecovery.emailRequired", {}, "Enter your parent email first.")
      );
      if (!isValidEmailAddress(email)) {
        return showAuthFieldError(
          accountPasswordRecoveryStatus,
          loginEmail,
          translate("auth.accountRecovery.emailInvalid", {}, "Enter a complete email address, such as grownup@example.com.")
        );
      }
      const captchaToken = requireHumanCheck("login", accountPasswordRecoveryStatus);
      if (!captchaToken) return;

      const generation = ++accountPasswordRecoveryGeneration;
      accountPasswordRecoveryRequestInFlight = true;
      updateAuthActionButtons();
      setAuthStatus(
        accountPasswordRecoveryStatus,
        translate("auth.accountRecovery.requesting", {}, "Requesting a secure password reset link…"),
        "notice"
      );
      try {
        const transaction = await createPasswordRecoveryTransaction(email);
        await kiddoRequestAccountPasswordRecovery(email, captchaToken, transaction.nonce);
        if (generation !== accountPasswordRecoveryGeneration || accountPasswordRecoveryPanel.hidden) return;
        setAuthStatus(
          accountPasswordRecoveryStatus,
          translate("auth.accountRecovery.requestComplete", {}, ACCOUNT_RECOVERY_REQUEST_MESSAGE),
          "success"
        );
        showToast(translate("auth.accountRecovery.requestFinishedToast", {}, "Password reset request finished."));
      } catch (error) {
        if (generation !== accountPasswordRecoveryGeneration || accountPasswordRecoveryPanel.hidden) return;
        if (isAccountExistenceDisclosure(error)) {
          setAuthStatus(
            accountPasswordRecoveryStatus,
            translate("auth.accountRecovery.requestComplete", {}, ACCOUNT_RECOVERY_REQUEST_MESSAGE),
            "success"
          );
          showToast(translate("auth.accountRecovery.requestFinishedToast", {}, "Password reset request finished."));
        } else {
          setAuthStatus(accountPasswordRecoveryStatus, friendlySupabaseError(error), "error");
          showToast(translate("auth.accountRecovery.requestFailedToast", {}, "Password reset could not be requested."));
        }
      } finally {
        if (generation === accountPasswordRecoveryGeneration) {
          accountPasswordRecoveryRequestInFlight = false;
          clearHumanCheckToken(
            "login",
            translate(
              "auth.accountRecovery.safetyAgain",
              {},
              "Complete the safety check again before another account request."
            )
          );
          updateAuthActionButtons();
        }
      }
    }

    async function updateAccountPasswordFromRecovery() {
      if (accountPasswordUpdateInFlight) return;
      const recoverySession = accountPasswordRecoverySession;
      const accessToken = String(recoverySession?.access_token || "");
      const password = accountPasswordNew.value;
      const confirmation = accountPasswordConfirm.value;
      if (!accessToken) {
        setAuthStatus(
          accountPasswordRecoveryStatus,
          translate(
            "auth.accountRecovery.linkExpired",
            {},
            "The password reset link is no longer available. Request a new one."
          ),
          "error"
        );
        showAccountPasswordRecovery("request");
        return;
      }
      if (password.length < 8) {
        return showAuthFieldError(
          accountPasswordRecoveryStatus,
          accountPasswordNew,
          translate("auth.accountRecovery.passwordShort", {}, "New password needs at least 8 characters.")
        );
      }
      if (password !== confirmation) {
        return showAuthFieldError(
          accountPasswordRecoveryStatus,
          accountPasswordConfirm,
          translate("auth.accountRecovery.passwordMismatch", {}, "The two new passwords do not match.")
        );
      }

      const generation = ++accountPasswordRecoveryGeneration;
      accountPasswordUpdateInFlight = true;
      updateAuthActionButtons();
      setAuthStatus(
        accountPasswordRecoveryStatus,
        translate("auth.accountRecovery.updating", {}, "Updating your password…"),
        "notice"
      );
      try {
        const user = await kiddoUpdateAccountPassword(accessToken, password);
        if (generation !== accountPasswordRecoveryGeneration
            || accessToken !== String(accountPasswordRecoverySession?.access_token || "")) return;
        if (String(user.email || "").trim().toLowerCase() !== String(recoverySession.user?.email || "").trim().toLowerCase()) {
          throw new Error(translate(
            "auth.accountRecovery.accountChanged",
            {},
            "The password reset account changed before it could be saved."
          ));
        }
        await endTemporaryAuthSession(accessToken);
        if (generation !== accountPasswordRecoveryGeneration) return;
        accountPasswordRecoverySession = null;
        removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
        hideAccountPasswordRecovery({ clearStatus: true, revokeSession: false, force: true });
        loginPassword.value = "";
        setAuthStatus(
          loginStatus,
          translate("auth.accountRecovery.updated", {}, "Password updated. Log in with your new password."),
          "success"
        );
        loginPassword.focus();
        showToast(translate("auth.accountRecovery.updatedToast", {}, "Password updated. Please log in again."));
      } catch (error) {
        if (generation !== accountPasswordRecoveryGeneration) return;
        setAuthStatus(accountPasswordRecoveryStatus, friendlySupabaseError(error), "error");
      } finally {
        if (generation === accountPasswordRecoveryGeneration) {
          accountPasswordUpdateInFlight = false;
          updateAuthActionButtons();
        }
      }
    }

    async function createAccount() {
      if (signupRequestInFlight) return;
      const familyName = signupFamily.value.trim();
      const parentName = signupParent.value.trim();
      const parentEmail = signupEmail.value.trim().toLowerCase();
      const secondParentName = signupParentTwo.value.trim();
      const secondParentEmail = signupEmailTwo.value.trim().toLowerCase();
      const accountPassword = signupPassword.value;
      const passcode = signupPasscode.value.trim();

      removeBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY);

      if (!requireEmailDelivery(signupStatus)) return;
      if (!requireAccountService(signupStatus)) return;

      if (!familyName) return showAuthFieldError(signupStatus, signupFamily, "Enter your family name.");
      if (!parentName) return showAuthFieldError(signupStatus, signupParent, "Enter the parent name.");
      if (!parentEmail) return showAuthFieldError(signupStatus, signupEmail, "Enter the parent email.");
      if (!isValidEmailAddress(parentEmail)) return showAuthFieldError(signupStatus, signupEmail, "Enter a complete parent email, such as grownup@example.com.");
      if (!accountPassword) return showAuthFieldError(signupStatus, signupPassword, "Create an account password.");
      if (!passcode) return showAuthFieldError(signupStatus, signupPasscode, "Create a 4–8 digit parent PIN.");

      if (accountPassword.length < 8) {
        return showAuthFieldError(signupStatus, signupPassword, "Password needs at least 8 characters.");
      }

      if (!/^\d{4,8}$/.test(passcode)) {
        return showAuthFieldError(signupStatus, signupPasscode, "Parent PIN must be 4–8 digits.");
      }

      if (accountPassword === passcode) {
        return showAuthFieldError(signupStatus, signupPasscode, "Use a different account password and parent PIN.");
      }

      if ((secondParentName && !secondParentEmail) || (!secondParentName && secondParentEmail)) {
        return showAuthFieldError(
          signupStatus,
          secondParentName ? signupEmailTwo : signupParentTwo,
          "Add both second parent details, or leave both blank."
        );
      }
      if (secondParentEmail && !isValidEmailAddress(secondParentEmail)) {
        return showAuthFieldError(signupStatus, signupEmailTwo, "Enter a complete second parent email.");
      }
      if (secondParentEmail && secondParentEmail === parentEmail) {
        return showAuthFieldError(signupStatus, signupEmailTwo, "Use a different email for the second parent.");
      }

      const captchaToken = requireHumanCheck("signup", signupStatus);
      if (!captchaToken) return;

      const operationGeneration = authViewGeneration;
      signupRequestInFlight = true;
      updateAuthActionButtons();
      setAuthStatus(signupStatus, "Securing your parent PIN…", "notice");
      let remoteRequestStarted = false;
      try {
        const passcodeRecord = await createParentPasscodeRecord(passcode);
        if (operationGeneration !== authViewGeneration || viewMode !== "signup") return;
        const emailSignupTransaction = await createEmailSignupTransaction(parentEmail);
        setAuthStatus(signupStatus, "Creating your account and sending the confirmation email…", "notice");
        remoteRequestStarted = true;
        const session = await kiddoSignUpRequest(parentEmail, accountPassword, captchaToken, {
          family_name: familyName,
          parent_name: parentName,
          second_parent_name: secondParentName,
          second_parent_email: secondParentEmail,
          // Supabase keeps this one-way verifier with the unconfirmed user so
          // following the email link in a new tab can finish the first secure
          // family-state write without retaining the readable PIN or password.
          kiddosprout_signup_setup: {
            version: 1,
            parent_passcode_record: passcodeRecord
          },
          kiddosprout_signup_nonce: emailSignupTransaction.nonce
        }, emailSignupTransaction.nonce);
        if (operationGeneration !== authViewGeneration || viewMode !== "signup") {
          if (session?.access_token) void endTemporaryAuthSession(session.access_token);
          return;
        }
        if (session?.access_token) {
          acceptKiddoSession(session);
        }
        // Keep the password only while an unconfirmed same-tab signup still
        // needs it, but never leave it readable after the remote request.
        maskSignupSecrets();

        const sessionReady = hasKiddoSession();
        signupPasscode.value = "";
        if (!sessionReady) {
          setAuthStatus(signupStatus, SIGNUP_EMAIL_REQUEST_MESSAGE, "success");
          clearHumanCheckToken("signup", "After confirming your email, complete the safety check again to continue here.");
          startResendEmailCooldown();
          confirmationEmail.textContent = parentEmail;
          setEmailConfirmationStage(true, { focus: true });
          return;
        }

        state.familyName = familyName;
        state.parentName = parentName;
        state.parentEmail = parentEmail;
        state.secondParentName = secondParentName;
        state.secondParentEmail = secondParentEmail;
        state.parentPasscodeRecord = passcodeRecord;
        state.parentPasscode = "";
        state.parentAccountCreated = true;
        const stateSaved = await saveState();
        if (operationGeneration !== authViewGeneration || viewMode !== "signup") return;
        setAuthStatus(signupStatus, stateSaved ? "Welcome" : "Your account is ready, but private family storage did not save the setup.", stateSaved ? "success" : "error");
        if (!stateSaved) {
          clearHumanCheckToken("signup", "Complete the safety check again after reconnecting, then continue.");
          confirmationEmail.textContent = parentEmail;
          setEmailConfirmationStage(true, { focus: true });
          setAuthStatus(
            signupStatus,
            "Your account is ready, but private family storage did not save the setup. Reconnect, complete the safety check, then choose Continue.",
            "error"
          );
          return;
        }
        humanChecks.signup.controller?.remove();
        humanChecks.signup.controller = null;
        humanChecks.signup.token = "";
        removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
        maskSignupSecrets({ clear: true });
        setSignupProgress("complete");
        parentUnlocked = true;
        writeBrowserStorage(window.sessionStorage, "parentUnlocked", "true");
        window.setTimeout(() => {
          if (operationGeneration !== authViewGeneration || viewMode !== "signup") return;
          signupStatus.classList.remove("success");
          setMode("parent", { unlocked: true });
          focusModeEntry("parent");
          window.setTimeout(() => {
            document.querySelector("#manageChildren")?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
            showToast("Now add your first real child profile.");
          }, 250);
        }, 650);
      } catch (error) {
        if (operationGeneration !== authViewGeneration || viewMode !== "signup") return;
        const localPinError = !remoteRequestStarted;
        const existenceHidden = remoteRequestStarted && isAccountExistenceDisclosure(error);
        setAuthStatus(signupStatus, existenceHidden
          ? SIGNUP_EMAIL_REQUEST_MESSAGE
          : localPinError
            ? "Secure PIN storage is unavailable in this browser. Try a current browser outside private mode."
            : friendlySupabaseError(error), existenceHidden ? "success" : "error");
        if (remoteRequestStarted) clearHumanCheckToken("signup");
        if (existenceHidden) {
          signupPasscode.value = "";
          confirmationEmail.textContent = parentEmail;
          setEmailConfirmationStage(true, { focus: true });
          startResendEmailCooldown();
          showToast("Account request finished.");
        } else {
          showToast(remoteRequestStarted ? "Could not create your account." : "The parent PIN could not be secured in this browser.");
        }
      } finally {
        signupRequestInFlight = false;
        updateAuthActionButtons();
      }
    }

    async function continueAfterEmailConfirmation() {
      if (confirmationRequestInFlight) return;
      const email = signupEmail.value.trim().toLowerCase() || state.parentEmail || "";
      const password = signupPassword.value;
      if (!requireAccountService(signupStatus)) return;
      if (!email || !isValidEmailAddress(email)) return showAuthFieldError(signupStatus, signupEmail, "Enter the account email again.");
      if (!password) return showAuthFieldError(signupStatus, signupPassword, "Enter the account password again.");
      const captchaToken = requireHumanCheck("signup", signupStatus);
      if (!captchaToken) return;

      const operationGeneration = authViewGeneration;
      confirmationRequestInFlight = true;
      updateAuthActionButtons();
      setAuthStatus(signupStatus, "Checking your email confirmation…", "notice");
      try {
        const session = await kiddoSignInRequest(email, password, captchaToken);
        if (operationGeneration !== authViewGeneration || viewMode !== "signup") {
          void endTemporaryAuthSession(session?.access_token);
          return;
        }
        acceptKiddoSession(session);
        maskSignupSecrets({ clear: true });
        await hydrateFamilyStateForSession(session);
        if (operationGeneration !== authViewGeneration || viewMode !== "signup") {
          clearKiddoSession();
          void endTemporaryAuthSession(session?.access_token);
          return;
        }
        if (!await saveState()) {
          throw new Error("Secure family storage could not finish email confirmation.");
        }
        removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
        humanChecks.signup.controller?.remove();
        humanChecks.signup.controller = null;
        humanChecks.signup.token = "";
        setEmailConfirmationStage(false);
        setSignupProgress("complete");
        parentUnlocked = true;
        writeBrowserStorage(window.sessionStorage, "parentUnlocked", "true");
        setAuthStatus(signupStatus, "Email confirmed. Welcome!", "success");
        window.setTimeout(() => {
          if (operationGeneration !== authViewGeneration || viewMode !== "signup") return;
          signupStatus.classList.remove("success");
          setMode("parent", { unlocked: true });
          focusModeEntry("parent");
          window.setTimeout(() => {
            document.querySelector("#manageChildren")?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
            showToast("Email confirmed. You can add your child's profile now.");
          }, 250);
        }, 650);
      } catch (error) {
        if (operationGeneration !== authViewGeneration || viewMode !== "signup") return;
        setAuthStatus(signupStatus, friendlySupabaseError(error), "error");
        clearHumanCheckToken("signup", "Complete the safety check again, then retry.");
      } finally {
        confirmationRequestInFlight = false;
        updateAuthActionButtons();
      }
    }

    function beginGoogleOnboarding(session) {
      const user = session?.user || {};
      const profile = user.user_metadata || {};
      googleOnboardingActive = true;
      googleOnboardingSession = session;
      viewMode = "signup";
      signupFamily.value = state.parentAccountCreated && state.familyName !== "KiddoSprout Family"
        ? state.familyName
        : (profile.family_name || "");
      signupParent.value = state.parentAccountCreated && state.parentName !== "Parent"
        ? state.parentName
        : (profile.parent_name || profile.full_name || profile.name || "");
      signupEmail.value = String(user.email || "").toLowerCase();
      signupParentTwo.value = state.parentAccountCreated ? (state.secondParentName || "") : (profile.second_parent_name || "");
      signupEmailTwo.value = state.parentAccountCreated ? (state.secondParentEmail || "") : (profile.second_parent_email || "");
      signupPassword.value = "";
      signupPasswordConfirm.value = "";
      signupPasscode.value = "";
      maskSignupSecrets();
      signupStatus.textContent = "Google confirmed your email. Finish the details below.";
      signupStatus.classList.add("success");
      setMode("signup", { quiet: true });
      updateGoogleAuthPresentation();
      window.setTimeout(() => {
        signupStatus.classList.remove("success");
        signupFamily.focus();
      }, 700);
    }

    async function finishGoogleSetup() {
      if (googleSetupRequestInFlight) return;
      const familyName = signupFamily.value.trim();
      const parentName = signupParent.value.trim();
      const parentEmail = signupEmail.value.trim().toLowerCase();
      const secondParentName = signupParentTwo.value.trim();
      const secondParentEmail = signupEmailTwo.value.trim().toLowerCase();
      const accountPassword = signupPassword.value;
      const confirmedPassword = signupPasswordConfirm.value;
      const passcode = signupPasscode.value.trim();
      const session = googleOnboardingSession || getKiddoSession();

      if (!googleOnboardingActive || !session?.user || !isGoogleAuthUser(session.user)) {
        setAuthStatus(signupStatus, "Continue with Google again to finish setup.", "error");
        return;
      }
      if (!familyName) return showAuthFieldError(signupStatus, signupFamily, "Enter your family name.");
      if (!parentName) return showAuthFieldError(signupStatus, signupParent, "Enter the parent name.");
      if (!parentEmail || !isValidEmailAddress(parentEmail)) return showAuthFieldError(signupStatus, signupEmail, "Google did not return a complete parent email. Continue with Google again.");
      if (!accountPassword) return showAuthFieldError(signupStatus, signupPassword, "Create a KiddoSprout password.");
      if (!confirmedPassword) return showAuthFieldError(signupStatus, signupPasswordConfirm, "Type the KiddoSprout password again.");
      if (!passcode) return showAuthFieldError(signupStatus, signupPasscode, "Create a 4–8 digit parent PIN.");
      if (parentEmail !== String(session.user.email || "").toLowerCase()) {
        setAuthStatus(signupStatus, "The parent email must match the Google account you confirmed.", "error");
        return;
      }
      if (accountPassword.length < 8) {
        return showAuthFieldError(signupStatus, signupPassword, "KiddoSprout password needs at least 8 characters.");
      }
      if (accountPassword !== confirmedPassword) {
        return showAuthFieldError(signupStatus, signupPasswordConfirm, "The two KiddoSprout passwords do not match.");
      }
      if (!/^\d{4,8}$/.test(passcode)) {
        return showAuthFieldError(signupStatus, signupPasscode, "Parent PIN must be 4–8 digits.");
      }
      if (accountPassword === passcode) {
        return showAuthFieldError(signupStatus, signupPasscode, "Use a different KiddoSprout password and parent PIN.");
      }
      if ((secondParentName && !secondParentEmail) || (!secondParentName && secondParentEmail)) {
        return showAuthFieldError(
          signupStatus,
          secondParentName ? signupEmailTwo : signupParentTwo,
          "Add both second parent details, or leave both blank."
        );
      }
      if (secondParentEmail && !isValidEmailAddress(secondParentEmail)) return showAuthFieldError(signupStatus, signupEmailTwo, "Enter a complete second parent email.");
      if (secondParentEmail && secondParentEmail === parentEmail) return showAuthFieldError(signupStatus, signupEmailTwo, "Use a different email for the second parent.");

      googleSetupRequestInFlight = true;
      updateAuthActionButtons();
      setAuthStatus(signupStatus, "Securing your parent PIN…", "notice");
      try {
        const passcodeRecord = await createParentPasscodeRecord(passcode);
        setAuthStatus(signupStatus, "Saving your family hub securely…", "notice");
        const updatedSession = await kiddoUpdateAuthenticatedUser(session, accountPassword, {
          family_name: familyName,
          parent_name: parentName,
          second_parent_name: secondParentName,
          second_parent_email: secondParentEmail,
          kiddosprout_onboarding_complete: true
        });
        maskSignupSecrets();
        googleOnboardingSession = updatedSession;
        state.familyName = familyName;
        state.parentName = parentName;
        state.parentEmail = parentEmail;
        state.parentAuthUserId = updatedSession.user.id;
        state.secondParentName = secondParentName;
        state.secondParentEmail = secondParentEmail;
        state.parentPasscodeRecord = passcodeRecord;
        state.parentPasscode = "";
        state.parentAccountCreated = true;
        const stateSaved = await saveState();
        if (!stateSaved) {
          parentUnlocked = false;
          removeBrowserStorage(window.sessionStorage, "parentUnlocked");
          googleOnboardingActive = true;
          googleOnboardingSession = updatedSession;
          setAuthStatus(
            signupStatus,
            "Your account is ready, but private family storage could not save the details. Reconnect or reload, then finish setup again.",
            "error"
          );
          updateGoogleAuthPresentation();
          return;
        }
        parentUnlocked = true;
        writeBrowserStorage(window.sessionStorage, "parentUnlocked", "true");
        removeBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY);
        maskSignupSecrets({ clear: true });
        googleOnboardingActive = false;
        googleOnboardingSession = null;
        setAuthStatus(signupStatus, "Your family hub is ready!", "success");
        updateGoogleAuthPresentation();
        window.setTimeout(() => {
          signupStatus.classList.remove("success");
          setMode("parent", { unlocked: true });
          focusModeEntry("parent");
          window.setTimeout(() => {
            document.querySelector("#manageChildren")?.scrollIntoView({ behavior: preferredScrollBehavior(), block: "start" });
            showToast("Family setup complete. Now add your first child profile.");
          }, 250);
        }, 650);
      } catch (error) {
        setAuthStatus(signupStatus, /secure pin storage/i.test(String(error?.message || ""))
          ? "Secure PIN storage is unavailable in this browser. Try a current browser outside private mode."
          : friendlySupabaseError(error), "error");
        showToast("Family setup could not be saved.");
      } finally {
        googleSetupRequestInFlight = false;
        updateAuthActionButtons();
      }
    }

    async function completeKiddoAuthCallback() {
      const callbackHash = initialAuthCallbackHash;
      initialAuthCallbackHash = "";
      if (isDemoMode()) {
        discardDemoKiddoAuthCallback(callbackHash);
        return false;
      }
      const hash = String(callbackHash || "").replace(/^#/, "");
      const {
        params,
        returnedNonce,
        returnedEmailNonce,
        returnedRecoveryNonce,
        unsafeQueryParameters
      } = parseKiddoAuthCallback(window.location.href, callbackHash);
      if (unsafeQueryParameters.length) {
        stripKiddoAuthCallbackUrl("login");
        removeBrowserStorage(window.sessionStorage, KIDDO_GOOGLE_OAUTH_TRANSACTION_KEY);
        removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
        setAuthStatus(
          loginStatus,
          "For safety, an account token in the address bar was removed. Start sign-in again.",
          "error"
        );
        viewMode = "login";
        return false;
      }
      if (!hash || !hash.includes("=")) {
        if (returnedNonce || returnedEmailNonce || returnedRecoveryNonce) {
          stripKiddoAuthCallbackUrl("login");
        }
        return false;
      }
      const callbackType = params.get("type") || "";
      const accessToken = params.get("access_token") || "";
      const refreshToken = params.get("refresh_token") || "";
      const hasSensitiveAuthPayload = params.has("access_token")
        || params.has("refresh_token")
        || params.has("provider_token")
        || params.has("provider_refresh_token")
        || params.has("error")
        || params.has("error_description");
      const {
        conflictingCallbackDetails,
        looksLikeGoogleCallback,
        attemptedEmailCallback,
        attemptedRecoveryCallback
      } = classifyKiddoAuthCallback({
        callbackType,
        hasSensitiveAuthPayload,
        returnedNonce,
        returnedEmailNonce,
        returnedRecoveryNonce
      });
      const emailSignupTransaction = attemptedEmailCallback && returnedEmailNonce
        ? matchEmailSignupTransaction(returnedEmailNonce)
        : null;
      const supportedEmailCallback = Boolean(attemptedEmailCallback && emailSignupTransaction);
      const passwordRecoveryTransaction = attemptedRecoveryCallback && returnedRecoveryNonce
        ? matchPasswordRecoveryTransaction(returnedRecoveryNonce)
        : null;
      const supportedRecoveryCallback = Boolean(attemptedRecoveryCallback && passwordRecoveryTransaction);
      const oauthTransaction = looksLikeGoogleCallback
        ? consumeGoogleOAuthTransaction(returnedNonce)
        : null;
      const possibleGoogleCallback = Boolean(oauthTransaction);
      const callbackMode = possibleGoogleCallback && oauthTransaction.intent === "signup"
        ? "signup"
        : supportedEmailCallback
          ? "signup"
          : "login";

      if (looksLikeGoogleCallback || attemptedEmailCallback || attemptedRecoveryCallback || hasSensitiveAuthPayload) {
        stripKiddoAuthCallbackUrl(callbackMode);
      }
      if (conflictingCallbackDetails) {
        stripKiddoAuthCallbackUrl("login");
        setAuthStatus(loginStatus, "This account link contains conflicting request details. Request a new link.", "error");
        viewMode = "login";
        return false;
      }
      if (looksLikeGoogleCallback && !possibleGoogleCallback) {
        setAuthStatus(loginStatus, "Google sign-in expired or was not started in this tab. Please try again.", "error");
        viewMode = "login";
        return false;
      }
      if (attemptedEmailCallback && !supportedEmailCallback) {
        setAuthStatus(loginStatus, "For safety, this email link cannot sign in a browser that did not start the signup. Return to Log In and use the account password.", "error");
        viewMode = "login";
        return false;
      }
      if (attemptedRecoveryCallback && !supportedRecoveryCallback) {
        setAuthStatus(loginStatus, "For safety, this password reset link must be opened in the browser that requested it. Request a new link here.", "error");
        viewMode = "login";
        return false;
      }
      if (!possibleGoogleCallback && !supportedEmailCallback && !supportedRecoveryCallback) return false;

      const callbackError = params.get("error_description") || params.get("error");
      if (callbackError) {
        const targetStatus = supportedRecoveryCallback
          ? accountPasswordRecoveryStatus
          : callbackMode === "signup" ? signupStatus : loginStatus;
        if (supportedRecoveryCallback) {
          removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
          showAccountPasswordRecovery("request");
        }
        setAuthStatus(targetStatus, friendlySupabaseError(callbackError), "error");
        viewMode = callbackMode;
        return false;
      }

      if (!accessToken || !SUPABASE_CONNECTED) return false;

      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`
          },
          cache: "no-store",
          signal: authRequestSignal()
        });
        const user = await response.json();
        if (isDemoMode()) return false;
        if (!response.ok || !user?.email) {
          throw new Error(user?.msg || user?.error || "The confirmation link could not be completed.");
        }
        if (!user.email_confirmed_at && !user.confirmed_at) {
          throw new Error("Email not confirmed");
        }

        const googleUser = isGoogleAuthUser(user);
        if (possibleGoogleCallback && !googleUser) {
          throw new Error("Google sign-in could not be verified. Please try again.");
        }
        if ((possibleGoogleCallback || supportedEmailCallback) && !refreshToken) {
          throw new Error("The account link did not include a complete session. Please request a new link.");
        }
        if (supportedEmailCallback
            && (user.user_metadata?.kiddosprout_signup_nonce !== emailSignupTransaction.nonce
              || await authEmailFingerprint(user.email, emailSignupTransaction.nonce)
                !== emailSignupTransaction.emailFingerprint)) {
          throw new Error("This confirmation link does not match the signup started in this browser.");
        }
        if (supportedRecoveryCallback
            && await authEmailFingerprint(user.email, passwordRecoveryTransaction.nonce)
              !== passwordRecoveryTransaction.emailFingerprint) {
          throw new Error("This password reset link does not match the account requested in this browser.");
        }

        const expiresIn = Number(params.get("expires_in") || 3600);
        const expiresAt = Number(params.get("expires_at")) || Math.floor(Date.now() / 1000) + expiresIn;
        const confirmedSession = {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: params.get("token_type") || "bearer",
          expires_in: expiresIn,
          expires_at: expiresAt,
          user
        };
        if (supportedRecoveryCallback) {
          clearKiddoSession();
          accountPasswordRecoverySession = confirmedSession;
          removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
          viewMode = "login";
          showAccountPasswordRecovery("update");
          setAuthStatus(
            accountPasswordRecoveryStatus,
            translate(
              "auth.accountRecovery.verified",
              {},
              "Reset link verified. Choose and confirm your new password."
            ),
            "success"
          );
          window.requestAnimationFrame(() => {
            accountPasswordRecoveryPanel.scrollIntoView({ behavior: preferredScrollBehavior(), block: "center" });
            accountPasswordNew.focus({ preventScroll: true });
          });
          return true;
        }
        acceptKiddoSession(confirmedSession);
        if (supportedEmailCallback) maskSignupSecrets({ clear: true });
        await hydrateFamilyStateForSession(confirmedSession);
        const profile = user.user_metadata || {};

        if (possibleGoogleCallback) {
          const localFamilyReady = hasParentAccount()
            && String(state.parentAuthUserId || "") === String(user.id || "")
            && hasStoredParentPasscode();
          if (!localFamilyReady || profile.kiddosprout_onboarding_complete !== true) {
            beginGoogleOnboarding(confirmedSession);
            return true;
          }
          state.parentEmail = user.email;
          state.parentName = profile.parent_name || state.parentName || profile.full_name || profile.name || "Parent";
          state.familyName = profile.family_name || state.familyName || "KiddoSprout Family";
          state.secondParentName = profile.second_parent_name || state.secondParentName || "";
          state.secondParentEmail = profile.second_parent_email || state.secondParentEmail || "";
          state.parentAccountCreated = true;
          if (!await saveState()) {
            throw new Error("Secure family storage could not finish Google sign-in.");
          }
          parentUnlocked = true;
          writeBrowserStorage(window.sessionStorage, "parentUnlocked", "true");
          viewMode = "parent";
          window.history.replaceState({}, "", window.location.pathname + window.location.search + "#parent");
          setAuthStatus(loginStatus, "Google sign-in complete. Welcome back!", "success");
          return true;
        }

        state.parentEmail = user.email;
        state.parentName ||= profile.parent_name || profile.name || "Parent";
        state.familyName ||= profile.family_name || "KiddoSprout Family";
        state.secondParentName ||= profile.second_parent_name || "";
        state.secondParentEmail ||= profile.second_parent_email || "";
        state.parentAccountCreated = true;
        if (!await saveState()) {
          throw new Error("Secure family storage could not finish email confirmation.");
        }
        removeBrowserStorage(window.localStorage, KIDDO_EMAIL_SIGNUP_TRANSACTION_KEY);
        parentUnlocked = true;
        writeBrowserStorage(window.sessionStorage, "parentUnlocked", "true");
        setEmailConfirmationStage(false);
        setSignupProgress("complete");
        setAuthStatus(signupStatus, "Email confirmed. Welcome!", "success");
        viewMode = "parent";
        window.history.replaceState({}, "", window.location.pathname + window.location.search + "#parent");
        return true;
      } catch (error) {
        clearKiddoSession();
        if (supportedRecoveryCallback) {
          accountPasswordRecoverySession = null;
          removeBrowserStorage(window.localStorage, KIDDO_PASSWORD_RECOVERY_TRANSACTION_KEY);
          showAccountPasswordRecovery("request");
          setAuthStatus(accountPasswordRecoveryStatus, friendlySupabaseError(error), "error");
        } else {
          setAuthStatus(loginStatus, friendlySupabaseError(error), "error");
        }
        viewMode = "login";
        window.history.replaceState({}, "", window.location.pathname + window.location.search + "#login");
        return false;
      }
    }

    function setKiddoInstallStatus(message, state = "notice") {
      [signupInstallStatus, parentInstallStatus].forEach((statusElement) => {
        if (!statusElement) return;
        statusElement.textContent = message;
        statusElement.classList.toggle("success", state === "success");
        statusElement.classList.toggle("error", state === "error");
      });
    }

    function updateKiddoInstallButtons(mode = "idle") {
      [downloadSignupButton, downloadKiddoSproutButton].forEach((button) => {
        if (!button) return;
        const idleLabel = button === downloadSignupButton
          ? translate("auth.install", {}, "Install App")
          : translate("auth.parent.install", {}, "Install KiddoSprout App");
        if (kiddoAppInstalled) {
          button.textContent = translate("auth.installed", {}, "Installed");
        } else if (mode === "opening") {
          button.textContent = translate("pwa.install.opening", {}, "Opening installer…");
        } else if (kiddoInstallPending) {
          button.textContent = translate("pwa.install.installingButton", {}, "Installing…");
        } else {
          button.textContent = idleLabel;
        }
        button.disabled = kiddoAppInstalled || kiddoInstallInFlight || kiddoInstallPending;
        if (kiddoInstallInFlight || kiddoInstallPending) button.setAttribute("aria-busy", "true");
        else button.removeAttribute("aria-busy");
      });
    }

    function clearKiddoInstallPendingTimer() {
      if (!kiddoInstallPendingTimer) return;
      window.clearTimeout(kiddoInstallPendingTimer);
      kiddoInstallPendingTimer = 0;
    }

    function scheduleKiddoInstallPendingRecovery() {
      clearKiddoInstallPendingTimer();
      kiddoInstallPendingTimer = window.setTimeout(() => {
        kiddoInstallPendingTimer = 0;
        if (!kiddoInstallPending || kiddoAppInstalled) return;
        if (window.matchMedia?.("(display-mode: standalone)").matches
            || window.navigator.standalone === true) {
          markKiddoSproutInstalled({ announce: true });
          return;
        }
        kiddoInstallPending = false;
        setKiddoInstallStatus(translate(
          "pwa.install.notFinished",
          {},
          "Installation did not finish. Use your browser's Install menu or try again."
        ));
        updateKiddoInstallButtons();
      }, KIDDO_INSTALL_PENDING_TIMEOUT_MS);
    }

    function markKiddoSproutInstalled({ announce = false } = {}) {
      clearKiddoInstallPendingTimer();
      kiddoAppInstalled = true;
      kiddoInstallPending = false;
      kiddoInstallInFlight = false;
      updateKiddoInstallButtons();
      if (announce) {
        setKiddoInstallStatus(
          translate("pwa.install.complete", {}, "KiddoSprout is installed."),
          "success"
        );
      }
    }

    async function installKiddoSproutApp(triggerButton = downloadKiddoSproutButton) {
      if (kiddoInstallInFlight || kiddoInstallPending) return;
      kiddoInstallInFlight = true;
      setKiddoInstallStatus(translate("pwa.install.opening", {}, "Opening installer…"));
      updateKiddoInstallButtons("opening");

      try {
        if (kiddoInstallPrompt) {
          const installPrompt = kiddoInstallPrompt;
          kiddoInstallPrompt = null;
          await installPrompt.prompt();
          const result = await installPrompt.userChoice;
          if (result?.outcome === "accepted") {
            if (kiddoAppInstalled) {
              markKiddoSproutInstalled({ announce: true });
            } else {
              kiddoInstallPending = true;
              scheduleKiddoInstallPendingRecovery();
              setKiddoInstallStatus(
                translate("pwa.install.installing", {}, "KiddoSprout is installing."),
                "success"
              );
              showToast(translate("pwa.install.installingToast", {}, "KiddoSprout app installing."));
            }
          } else {
            setKiddoInstallStatus(translate("pwa.install.cancelled", {}, "Install cancelled."));
            showToast(translate("pwa.install.cancelledToast", {}, "KiddoSprout install cancelled."));
          }
        } else if (kiddoAppInstalled
          || window.matchMedia?.("(display-mode: standalone)").matches
          || window.navigator.standalone === true) {
          markKiddoSproutInstalled({ announce: true });
          showToast(translate("pwa.install.alreadyInstalled", {}, "KiddoSprout is already installed."));
        } else {
          setKiddoInstallStatus(translate(
            "pwa.install.browserHelp",
            {},
            "If your browser offers app installation, use its site menu and choose Install or Add to Home Screen."
          ));
          showToast(translate("pwa.install.browserHelpToast", {}, "Check your browser's app installation menu."));
        }
      } catch (error) {
        clearKiddoInstallPendingTimer();
        kiddoInstallPrompt = null;
        kiddoInstallPending = false;
        setKiddoInstallStatus(
          translate("pwa.install.failed", {}, "The install window could not open. Reload this page, then try again."),
          "error"
        );
        showToast(translate("pwa.install.failedToast", {}, "The app installer could not open."));
      } finally {
        kiddoInstallInFlight = false;
        updateKiddoInstallButtons();
      }
    }

    function showKiddoSproutUpdateNotice(action = "activate") {
      // A colleague preview has no private account state to protect and does
      // not need an alarming server-error panel when a browser blocks a
      // background update check. Keep real ready-to-update notices visible.
      if (PUBLIC_DEMO_ONLY && action === "retry") {
        hideKiddoSproutUpdateNotice();
        return;
      }
      if (!pwaUpdateNotice || !pwaUpdateTitle || !pwaUpdateMessage || !pwaUpdateNowButton) {
        showToast(translate("pwa.update.readyToast", {}, "A KiddoSprout update is ready."));
        return;
      }
      const copy = action === "reload"
        ? {
            title: translate("pwa.update.appliedTitle", {}, "KiddoSprout was updated"),
            message: translate("pwa.update.applied", {}, "Reload when you are ready to use the newest version."),
            button: translate("pwa.update.reload", {}, "Reload Now")
          }
        : action === "retry"
          ? {
              title: translate("pwa.update.checkFailedTitle", {}, "Update check paused"),
              message: translate("pwa.update.checkFailed", {}, "KiddoSprout could not check for updates. Reconnect, then try again."),
              button: translate("pwa.update.retry", {}, "Try Again")
            }
          : {
              title: translate("pwa.update.title", {}, "KiddoSprout update ready"),
              message: translate("pwa.update.ready", {}, "Update and reload when you are ready to use the newest version."),
              button: translate("pwa.update.action", {}, "Update & Reload")
            };
      pwaUpdateNotice.dataset.action = action;
      pwaUpdateTitle.textContent = copy.title;
      pwaUpdateMessage.textContent = copy.message;
      pwaUpdateNowButton.textContent = copy.button;
      pwaUpdateNowButton.disabled = false;
      pwaUpdateNowButton.removeAttribute("aria-busy");
      pwaUpdateNotice.hidden = false;
    }

    function hideKiddoSproutUpdateNotice() {
      if (pwaUpdateNotice) pwaUpdateNotice.hidden = true;
    }

    function watchKiddoSproutWorker(worker) {
      if (!worker) return;
      if (observedKiddoSproutWorkers.has(worker)) return;
      observedKiddoSproutWorkers.add(worker);
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          kiddoServiceWorkerUpdateCheckFailed = false;
          showKiddoSproutUpdateNotice("activate");
        } else if (worker.state === "redundant" && !kiddoServiceWorkerRegistration?.waiting) {
          kiddoServiceWorkerUpdateCheckFailed = true;
          showKiddoSproutUpdateNotice("retry");
        }
      });
    }

    async function checkForKiddoSproutUpdate() {
      if (!kiddoServiceWorkerRegistration || kiddoServiceWorkerUpdateCheckInFlight) return;
      const now = Date.now();
      if (!kiddoServiceWorkerUpdateCheckFailed
          && now - kiddoServiceWorkerLastUpdateCheck < KIDDO_SERVICE_WORKER_UPDATE_INTERVAL_MS) return;
      kiddoServiceWorkerLastUpdateCheck = now;
      kiddoServiceWorkerUpdateCheckInFlight = true;
      try {
        await kiddoServiceWorkerRegistration.update();
        kiddoServiceWorkerUpdateCheckFailed = false;
        if (kiddoServiceWorkerRegistration.waiting) {
          showKiddoSproutUpdateNotice("activate");
        } else if (pwaUpdateNotice?.dataset.action === "retry") {
          hideKiddoSproutUpdateNotice();
        }
      } catch (error) {
        kiddoServiceWorkerUpdateCheckFailed = true;
        showKiddoSproutUpdateNotice(kiddoServiceWorkerRegistration.waiting ? "activate" : "retry");
      } finally {
        kiddoServiceWorkerUpdateCheckInFlight = false;
      }
    }

    async function ensureKiddoSproutServiceWorker() {
      if (kiddoServiceWorkerRegistration) {
        await checkForKiddoSproutUpdate();
        return;
      }
      if (kiddoServiceWorkerRegistrationInFlight) return;
      kiddoServiceWorkerRegistrationInFlight = true;
      try {
        const serviceWorkerUrl = new URL("service-worker.js", window.location.href);
        const serviceWorkerScope = new URL("./", serviceWorkerUrl).pathname;
        const registration = await navigator.serviceWorker.register(serviceWorkerUrl.pathname, {
          scope: serviceWorkerScope,
          updateViaCache: "none"
        });
        kiddoServiceWorkerRegistration = registration;
        kiddoServiceWorkerUpdateCheckFailed = false;
        if (registration.waiting && navigator.serviceWorker.controller) {
          showKiddoSproutUpdateNotice("activate");
        } else if (pwaUpdateNotice?.dataset.action === "retry") {
          hideKiddoSproutUpdateNotice();
        }
        watchKiddoSproutWorker(registration.installing);
        registration.addEventListener("updatefound", () => {
          watchKiddoSproutWorker(registration.installing);
        });
        await checkForKiddoSproutUpdate();
      } catch (error) {
        kiddoServiceWorkerUpdateCheckFailed = true;
        showKiddoSproutUpdateNotice("retry");
      } finally {
        kiddoServiceWorkerRegistrationInFlight = false;
      }
    }

    function handleKiddoSproutUpdateAction() {
      const action = pwaUpdateNotice?.dataset.action || "activate";
      if (action === "retry") {
        pwaUpdateNowButton.disabled = true;
        pwaUpdateNowButton.setAttribute("aria-busy", "true");
        void ensureKiddoSproutServiceWorker();
        return;
      }
      if (window.KiddoSproutFamilyCallActive === true) {
        showToast(translate("call.updateBlocked", {}, "End the family call before updating KiddoSprout."));
        return;
      }
      if (action === "reload" || kiddoServiceWorkerControllerChanged) {
        window.location.reload();
        return;
      }
      const waitingWorker = kiddoServiceWorkerRegistration?.waiting;
      if (!waitingWorker) {
        void checkForKiddoSproutUpdate();
        return;
      }
      kiddoServiceWorkerReloadRequested = true;
      pwaUpdateNowButton.disabled = true;
      pwaUpdateNowButton.setAttribute("aria-busy", "true");
      pwaUpdateNowButton.textContent = translate("pwa.update.updating", {}, "Updating…");
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => {
        if (kiddoServiceWorkerReloadHandled || !kiddoServiceWorkerReloadRequested) return;
        kiddoServiceWorkerReloadRequested = false;
        showKiddoSproutUpdateNotice(kiddoServiceWorkerControllerChanged ? "reload" : "activate");
      }, 10000);
    }

    async function sendRecoveryCode() {
      const recoveryButton = authButtonFor("recovery");
      if (recoveryRequestInFlight || recoveryResetInFlight) return;
      const email = recoveryEmail.value.trim().toLowerCase();

      if (!requireEmailDelivery(passcodeStatus)) return;
      if (!requireAccountService(passcodeStatus)) return;

      if (!email || !isValidEmailAddress(email)) {
        showAuthFieldError(passcodeStatus, recoveryEmail, "Enter the complete email that created this family account.");
        shakePasscodeBox();
        return;
      }
      const captchaToken = requireHumanCheck("recovery", passcodeStatus);
      if (!captchaToken) return;

      const requestGeneration = recoveryRequestGeneration + 1;
      recoveryRequestGeneration = requestGeneration;
      recoveryRequestInFlight = true;
      updateAuthActionButtons();
      setAuthStatus(passcodeStatus, "Sending a one-time code…", "notice");
      try {
        await kiddoSendRecoveryOtp(email, captchaToken);
        if (requestGeneration !== recoveryRequestGeneration
            || !parentGate.classList.contains("open")
            || forgotPanel.style.display === "none") return;
        recoveryCodeRequested = true;
        recoveryEmailRequested = email;
        recoveryEmail.readOnly = true;
        recoveryCode.value = "";
        setAuthStatus(passcodeStatus, "Code sent. Check your email and spam folder.", "success");
        showToast("One-time code sent.");
        recoveryCode.focus({ preventScroll: true });
        window.setTimeout(() => passcodeStatus.classList.remove("success"), 1200);
      } catch (error) {
        if (requestGeneration !== recoveryRequestGeneration) return;
        recoveryCodeRequested = false;
        recoveryEmailRequested = "";
        recoveryEmail.readOnly = false;
        setAuthStatus(passcodeStatus, friendlySupabaseError(error), "error");
        shakePasscodeBox();
        showToast(passcodeStatus.textContent);
      } finally {
        if (requestGeneration === recoveryRequestGeneration) {
          clearHumanCheckToken("recovery", "Complete the safety check again to request another code.");
          recoveryRequestInFlight = false;
          updateAuthActionButtons();
        }
      }
    }

    async function resetPasscodeWithCode() {
      const resetPasscodeButton = document.querySelector("#resetPasscode");
      if (resetPasscodeButton.disabled || recoveryRequestInFlight || recoveryResetInFlight) return;
      const newPasscode = recoveryPasscode.value.trim();
      const email = recoveryEmail.value.trim().toLowerCase();

      if (!recoveryCodeRequested) {
        setAuthStatus(passcodeStatus, "Send a one-time code first.", "error");
        document.querySelector("#sendRecoveryCode")?.focus({ preventScroll: true });
        shakePasscodeBox();
        showToast("Send a one-time code first.");
        return;
      }

      if (email !== recoveryEmailRequested) {
        showAuthFieldError(passcodeStatus, recoveryEmail, "Request a new code for this email.");
        recoveryCodeRequested = false;
        recoveryEmail.readOnly = false;
        return;
      }

      const token = recoveryCode.value.trim();
      if (!/^\d{6}$/.test(token)) {
        return showAuthFieldError(passcodeStatus, recoveryCode, "Enter the 6-digit code from your email.", "Enter the 6-digit email code.");
      }

      if (!/^\d{4,8}$/.test(newPasscode)) {
        return showAuthFieldError(passcodeStatus, recoveryPasscode, "New passcode must be 4–8 digits.", "Use 4–8 digits for the new passcode.");
      }

      setAuthStatus(passcodeStatus, "Checking the one-time code…", "notice");
      const requestGeneration = recoveryRequestGeneration;
      const recoveryFlowIsCurrent = () => requestGeneration === recoveryRequestGeneration
        && parentGate.classList.contains("open")
        && forgotPanel.style.display !== "none";
      const finishRecoveryReset = () => {
        if (requestGeneration !== recoveryRequestGeneration) return;
        recoveryResetInFlight = false;
        resetPasscodeButton.disabled = false;
        resetPasscodeButton.setAttribute("aria-disabled", "false");
        resetPasscodeButton.setAttribute("aria-busy", "false");
        updateAuthActionButtons();
      };
      recoveryResetInFlight = true;
      // Keep keyboard focus on the action while the request runs. The handler's
      // in-flight guard remains authoritative for repeat pointer/keyboard use.
      resetPasscodeButton.setAttribute("aria-disabled", "true");
      resetPasscodeButton.setAttribute("aria-busy", "true");
      updateAuthActionButtons();
      let session;
      let passcodeRecord;
      try {
        passcodeRecord = await createParentPasscodeRecord(newPasscode);
        if (!recoveryFlowIsCurrent()) return;
        session = await kiddoVerifyRecoveryOtp(email, token);
        if (!recoveryFlowIsCurrent()) return;
        if (!session?.access_token || session?.user?.email?.toLowerCase() !== email) {
          throw new Error("Incorrect or expired one-time code");
        }
        acceptKiddoSession(session);
        await hydrateFamilyStateForSession(session);
        if (!recoveryFlowIsCurrent()) return;
      } catch (error) {
        if (!recoveryFlowIsCurrent()) return;
        setAuthStatus(passcodeStatus, /secure pin storage/i.test(String(error?.message || ""))
          ? "Secure PIN storage is unavailable in this browser. Try a current browser outside private mode."
          : friendlySupabaseError(error), "error");
        shakePasscodeBox();
        showToast(passcodeStatus.textContent);
        finishRecoveryReset();
        return;
      }

      // Capture the verified owner's cloud values after hydration. If the new
      // write fails, never restore a stale pre-login PIN from another snapshot.
      const previousPasscodeRecord = state.parentPasscodeRecord;
      const previousLegacyPasscode = state.parentPasscode;
      state.parentPasscodeRecord = passcodeRecord;
      state.parentPasscode = "";
      if (!await saveState()) {
        state.parentPasscodeRecord = previousPasscodeRecord;
        state.parentPasscode = previousLegacyPasscode;
        clearRecoverySecrets();
        setAuthStatus(passcodeStatus, "Email confirmed, but secure family storage could not save the new PIN. Reconnect, then request a new code.", "error");
        shakePasscodeBox();
        showToast("The new parent PIN was not saved.");
        finishRecoveryReset();
        return;
      }
      clearRecoverySecrets();
      failedPasscodeAttempts = 0;
      lockoutUntil = 0;
      removeBrowserStorage(window.sessionStorage, "failedPasscodeAttempts");
      removeBrowserStorage(window.sessionStorage, "lockoutUntil");
      removeBrowserStorage(window.localStorage, "kiddoSproutFailedAttempts");
      removeBrowserStorage(window.localStorage, "kiddoSproutLockoutUntil");
      updatePasscodeLockout();
      passcodeInput.value = "";
      forgotPanel.style.display = "none";
      forgotPasswordButton.setAttribute("aria-expanded", "false");
      showPasscodeSuccess("PIN reset");
      showToast("Parent passcode reset.");
      passcodeInput.focus({ preventScroll: true });
      finishRecoveryReset();
    }

    function updatePasscodeLockout() {
      window.clearInterval(lockoutTimer);
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);

      if (remaining <= 0) {
        const justUnlocked = lockoutWasActive;
        lockoutUntil = 0;
        failedPasscodeAttempts = 0;
        removeBrowserStorage(window.sessionStorage, "lockoutUntil");
        removeBrowserStorage(window.sessionStorage, "failedPasscodeAttempts");
        removeBrowserStorage(window.localStorage, "kiddoSproutLockoutUntil");
        removeBrowserStorage(window.localStorage, "kiddoSproutFailedAttempts");
        passcodeInput.disabled = false;
        unlockParentButton.disabled = false;
        lockoutWasActive = false;
        if (passcodeLockoutCountdown) {
          passcodeLockoutCountdown.hidden = true;
          passcodeLockoutCountdown.textContent = "";
        }
        if (justUnlocked) {
          setAuthStatus(passcodeStatus, "Parent PIN is available again.", "success");
          if (parentGate.classList.contains("open")) passcodeInput.focus({ preventScroll: true });
        }
        return false;
      }

      passcodeInput.disabled = true;
      unlockParentButton.disabled = true;
      if (!lockoutWasActive) {
        setAuthStatus(passcodeStatus, "Too many incorrect PIN attempts. Parent login is paused briefly.", "error");
      }
      lockoutWasActive = true;
      if (passcodeLockoutCountdown) {
        passcodeLockoutCountdown.hidden = false;
        passcodeLockoutCountdown.textContent = "Try again in " + remaining + " seconds.";
      }
      lockoutTimer = window.setInterval(updatePasscodeLockout, 1000);
      return true;
    }

    function ensureChildAppState(child) {
      if (!isPlainFamilyRecord(child)) return false;
      if (!isPlainFamilyRecord(state.wellbeingGoals)) state.wellbeingGoals = { water: 4, eyeBreaks: 3 };
      state.wellbeingGoals.water = Math.max(1, Number(state.wellbeingGoals.water || 4));
      state.wellbeingGoals.eyeBreaks = Math.max(1, Number(state.wellbeingGoals.eyeBreaks || 3));
      if (!isPlainFamilyRecord(state.schedule)) state.schedule = {};
      state.schedule.schoolStart = normalizeScheduleTime(state.schedule.schoolStart, "08:45");
      state.schedule.schoolEnd = normalizeScheduleTime(state.schedule.schoolEnd, "15:15");
      state.schedule.bedtimeStart = normalizeScheduleTime(state.schedule.bedtimeStart, "20:30");
      state.schedule.bedtimeEnd = normalizeScheduleTime(state.schedule.bedtimeEnd, "07:00");
      state.parentNote = boundedFamilyText(state.parentNote, "", FAMILY_CONTENT_TEXT_LIMIT);
      const collections = normalizeFamilyCollections(state);
      state.safetyAlerts = collections.safetyAlerts;
      state.moodCheckins = collections.moodCheckins;
      state.problemReports = collections.problemReports;
      state.scanHistory = collections.scanHistory;
      state.familyRules = collections.familyRules;
      state.chores = collections.chores;
      state.trustedContacts = normalizeTrustedContacts(
        state.trustedContacts ?? DEFAULT_STATE.trustedContacts
      ).contacts;
      const normalizedChild = normalizeChildProfile(child);
      Object.keys(child).forEach((key) => { delete child[key]; });
      Object.assign(child, normalizedChild);
      return true;
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

    function normalizeTrustedContacts(value) {
      const entries = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(/\r?\n/)
          : [];
      const contacts = [];
      const seen = new Set();
      let adjusted = !Array.isArray(value) && typeof value !== "string";

      for (const entry of entries) {
        if (typeof entry !== "string") {
          adjusted = true;
          continue;
        }
        let contact = entry.replace(/\s+/gu, " ").trim();
        if (!contact) continue;
        if (contact.length > TRUSTED_CONTACT_NAME_LIMIT) {
          contact = contact.slice(0, TRUSTED_CONTACT_NAME_LIMIT).trim();
          adjusted = true;
        }
        const identity = contact.toLowerCase();
        if (seen.has(identity)) {
          adjusted = true;
          continue;
        }
        if (contacts.length >= TRUSTED_CONTACT_LIMIT) {
          adjusted = true;
          break;
        }
        seen.add(identity);
        contacts.push(contact);
      }
      return { contacts, adjusted };
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

      const candidates = [text];
      const compactColorName = text.replace(/[\s_-]+/g, "");
      if (compactColorName && compactColorName !== text) {
        candidates.push(compactColorName);
      }

      for (const candidate of candidates) {
        ctx.fillStyle = "#000000";
        ctx.fillStyle = candidate;
        if (ctx.fillStyle !== "#000000" || /^black$/i.test(candidate)) {
          return ctx.fillStyle;
        }
      }
      return "";
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
        requests: [],
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
        achievementChart: [],
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
      abandonFocusSession();
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
      abandonFocusSession();
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
      const childEntries = repairChildCollectionShape()
        .filter(([id, child]) => isSafeChildProfileEntry(id, child))
        .slice(0, CHILD_PROFILE_LIMIT);
      if (pendingRemoveChildId !== state.activeChild) {
        pendingRemoveChildId = "";
        removeChildButton.textContent = "Remove Selected Child";
        removeChildStatus.textContent = "";
      }
      renderChildEditor();
      if (!childEntries.length) {
        strip.innerHTML = `
          <div class="empty-profile-note">
            <strong>No child profiles yet</strong>
            <span>Add your first real child above. The child site stays locked until a profile exists.</span>
          </div>
        `;
        return;
      }
      strip.innerHTML = childEntries.map(([id, child]) => {
        if (!ensureChildAppState(child)) return "";
        return `
          <button class="profile-btn ${id === state.activeChild ? "active" : ""}" type="button" data-child="${escapeHtml(id)}" aria-pressed="${id === state.activeChild}">
            <span class="avatar" style="background: ${safeAvatarColor(child.avatarColor)};">${escapeHtml(avatarSymbol(child.avatarIcon, child.name))}</span>
            <span>
              <strong>${escapeHtml(child.name)}</strong>
              <span class="small">${escapeHtml(child.device)} · ${childAgeSummary(child)}${childSchoolSummary(child)}${child.pending} pending</span>
            </span>
          </button>
        `;
      }).join("");

      strip.querySelectorAll("[data-child]").forEach((button) => {
        button.addEventListener("click", () => {
          const childId = button.dataset.child;
          if (state.activeChild !== childId) abandonFocusSession();
          state.activeChild = childId;
          render();
          const selectedButton = [...strip.querySelectorAll("[data-child]")]
            .find((candidate) => candidate.dataset.child === childId);
          selectedButton?.focus({ preventScroll: true });
          queueSave();
          showToast("Switched to " + currentChild().name + "'s profile.");
        });
      });
    }

    function renderReport(child) {
      const values = Object.values(child.report).map((value) => Number(value) || 0);
      const max = Math.max(...values, 1);
      document.querySelector("#reportRows").innerHTML = Object.entries(child.report).map(([label, value]) => {
        const minutes = Math.max(0, Number(value) || 0);
        const width = Math.max(8, Math.round((minutes / max) * 100));
        const color = reportColors[label] || "#147d7f";
        return `
          <div class="bar-row">
            <span>${escapeHtml(label)}</span>
            <div class="track"><div class="fill" style="--w: ${width}%; --c: ${color};"></div></div>
            <strong>${minutes}m</strong>
          </div>
        `;
      }).join("");
    }

    function closeAchievementPasscodePrompt(options = {}) {
      if (!achievementLockPanel) return;
      achievementLockPanel.hidden = true;
      openAchievementLockButton.setAttribute("aria-expanded", "false");
      achievementPasscode.value = "";
      achievementPasscode.type = "password";
      viewAchievementPasscode.checked = false;
      achievementLockStatus.textContent = "";
      achievementLockedNote.hidden = achievementEditorUnlocked;
      if (options.restoreFocus === true && !openAchievementLockButton.hidden) {
        openAchievementLockButton.focus({ preventScroll: true });
      }
    }

    function updateAchievementLockout() {
      window.clearTimeout(achievementLockTimer);
      const seconds = Math.max(0, Math.ceil((achievementLockUntil - Date.now()) / 1000));
      if (seconds <= 0) {
        achievementLockUntil = 0;
        achievementPasscodeAttempts = 0;
        removeBrowserStorage(window.localStorage, "kiddoSproutAchievementLockUntil");
        removeBrowserStorage(window.localStorage, "kiddoSproutAchievementPasscodeAttempts");
        unlockAchievementEditorButton.disabled = false;
        achievementLockStatus.textContent = "";
        return;
      }
      unlockAchievementEditorButton.disabled = true;
      achievementLockStatus.textContent = `Too many tries. Wait ${seconds} second${seconds === 1 ? "" : "s"}.`;
      achievementLockTimer = window.setTimeout(updateAchievementLockout, 250);
    }

    function openAchievementPasscodePrompt() {
      if (!currentChild()) {
        achievementStatus.textContent = "A parent needs to add a child profile first.";
        return;
      }
      if (achievementEditorUnlocked) return;
      achievementLockPanel.hidden = false;
      achievementLockedNote.hidden = true;
      openAchievementLockButton.setAttribute("aria-expanded", "true");
      updateAchievementLockout();
      if (Date.now() >= achievementLockUntil) {
        achievementLockStatus.textContent = "";
        achievementPasscode.focus();
      }
    }

    async function unlockAchievementControls() {
      if (unlockAchievementEditorButton.disabled) return;
      if (Date.now() < achievementLockUntil) {
        updateAchievementLockout();
        return;
      }
      unlockAchievementEditorButton.disabled = true;
      achievementLockStatus.textContent = "Checking PIN…";
      let passcodeMatches = false;
      try {
        passcodeMatches = await verifyParentPasscode(achievementPasscode.value);
      } catch (error) {
        achievementLockStatus.textContent = "Secure PIN checking is unavailable in this browser.";
        unlockAchievementEditorButton.disabled = false;
        showToast(achievementLockStatus.textContent);
        return;
      }
      if (passcodeMatches) {
        achievementEditorUnlocked = true;
        achievementPasscodeAttempts = 0;
        achievementLockUntil = 0;
        removeBrowserStorage(window.localStorage, "kiddoSproutAchievementLockUntil");
        removeBrowserStorage(window.localStorage, "kiddoSproutAchievementPasscodeAttempts");
        window.clearTimeout(achievementLockTimer);
        closeAchievementPasscodePrompt();
        achievementEditor.hidden = false;
        achievementLockedNote.hidden = true;
        openAchievementLockButton.hidden = true;
        achievementStatus.textContent = "Parent controls unlocked for this visit.";
        renderAchievementChart(currentChild());
        achievementTitle.focus();
        showToast("Achievement controls unlocked.");
        return;
      }

      achievementPasscodeAttempts += 1;
      writeBrowserStorage(window.localStorage, "kiddoSproutAchievementPasscodeAttempts", achievementPasscodeAttempts);
      achievementPasscode.value = "";
      if (achievementPasscodeAttempts >= 3) {
        achievementLockUntil = Date.now() + 30000;
        writeBrowserStorage(window.localStorage, "kiddoSproutAchievementLockUntil", achievementLockUntil);
        updateAchievementLockout();
        showToast("Too many passcode attempts. Try again in 30 seconds.");
        return;
      }
      unlockAchievementEditorButton.disabled = false;
      const triesLeft = 3 - achievementPasscodeAttempts;
      achievementLockStatus.textContent = `That passcode is not right. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`;
      achievementPasscode.focus();
    }

    function lockAchievementControls(options = {}) {
      achievementEditorUnlocked = false;
      window.clearTimeout(achievementLockTimer);
      if (achievementEditor) achievementEditor.hidden = true;
      if (openAchievementLockButton) {
        openAchievementLockButton.hidden = false;
        openAchievementLockButton.setAttribute("aria-expanded", "false");
      }
      if (achievementLockedNote) achievementLockedNote.hidden = false;
      if (achievementLockPanel) achievementLockPanel.hidden = true;
      if (achievementPasscode) {
        achievementPasscode.value = "";
        achievementPasscode.type = "password";
      }
      if (viewAchievementPasscode) viewAchievementPasscode.checked = false;
      if (achievementLockStatus) achievementLockStatus.textContent = "";
      if (options.render !== false && state) renderAchievementChart(currentChild());
      if (options.restoreFocus === true && openAchievementLockButton && !openAchievementLockButton.hidden) {
        openAchievementLockButton.focus({ preventScroll: true });
      }
      if (!options.quiet) showToast("Achievement controls locked.");
    }

    function renderAchievementChart(child) {
      const subtitle = document.querySelector("#achievementChartSubtitle");
      const total = document.querySelector("#achievementTotal");
      const addButton = document.querySelector("#addAchievement");
      const formControls = [achievementTitle, achievementTarget, achievementReward, addButton];
      if (!child) {
        subtitle.textContent = "Add a child profile before growing an achievement garden.";
        total.textContent = "0 goals";
        formControls.forEach((control) => { if (control) control.disabled = true; });
        openAchievementLockButton.disabled = true;
        achievementEditor.hidden = true;
        achievementLockPanel.hidden = true;
        achievementChartList.innerHTML = `<div class="achievement-empty">A parent can add a child profile to start your first goal.</div>`;
        return;
      }

      ensureChildAppState(child);
      openAchievementLockButton.disabled = false;
      openAchievementLockButton.hidden = achievementEditorUnlocked;
      achievementEditor.hidden = !achievementEditorUnlocked;
      achievementLockedNote.hidden = achievementEditorUnlocked || !achievementLockPanel.hidden;
      formControls.forEach((control) => { if (control) control.disabled = !achievementEditorUnlocked; });
      const achievements = child.achievementChart;
      subtitle.textContent = achievementEditorUnlocked
        ? `Parent controls are ready for ${child.name}'s goals.`
        : `${child.name} can see every goal here. A parent passcode is needed to make changes.`;
      total.textContent = `${achievements.length} ${achievements.length === 1 ? "goal" : "goals"}`;
      achievementChartList.innerHTML = achievements.length
        ? achievements.map((achievement, index) => {
          const percentage = Math.round((achievement.progress / achievement.target) * 100);
          const complete = achievement.progress >= achievement.target;
          const starSlots = achievement.target <= 10 ? achievement.target : 5;
          const brightStars = achievement.target <= 10
            ? achievement.progress
            : Math.round((achievement.progress / achievement.target) * starSlots);
          const starTrail = Array.from({ length: starSlots }, (_, starIndex) => starIndex < brightStars ? "★" : "☆").join(" ");
          return `
            <article class="achievement-row ${complete ? "complete" : ""}">
              <div class="achievement-row-main">
                <div class="achievement-row-heading">
                  <strong>${complete ? '<span aria-hidden="true">🏆</span> ' : '<span aria-hidden="true">🌱</span> '}${escapeHtml(achievement.title)}</strong>
                  <span>${achievement.progress} / ${achievement.target} stars${complete ? " · You did it!" : ""}</span>
                </div>
                ${achievement.reward ? `<span class="achievement-reward">Family reward: ${escapeHtml(achievement.reward)}</span>` : ""}
                <span class="achievement-star-trail" aria-hidden="true">${starTrail}</span>
                <div class="track" role="progressbar" aria-label="${escapeHtml(achievement.title)}" aria-valuemin="0" aria-valuemax="${achievement.target}" aria-valuenow="${achievement.progress}">
                  <div class="fill" style="--w: ${percentage}%; --c: ${complete ? "#5d9b3a" : "#147d7f"};"></div>
                </div>
              </div>
              ${achievementEditorUnlocked ? `
                <div class="achievement-actions" role="group" aria-label="Parent controls for ${escapeHtml(achievement.title)}">
                  <button class="tiny" type="button" data-achievement-action="decrease" data-achievement-index="${index}" aria-label="Remove one star from ${escapeHtml(achievement.title)}">−</button>
                  <button class="approve" type="button" data-achievement-action="increase" data-achievement-index="${index}" aria-label="Add one star to ${escapeHtml(achievement.title)}">+1</button>
                  <button class="tiny" type="button" data-achievement-action="complete" data-achievement-index="${index}" aria-label="${complete ? "Completed" : "Complete"} ${escapeHtml(achievement.title)}">${complete ? "Completed" : "Complete"}</button>
                  <button class="tiny remove-achievement" type="button" data-achievement-action="remove" data-achievement-index="${index}" aria-label="Remove ${escapeHtml(achievement.title)}">Remove</button>
                </div>
              ` : ""}
            </article>
          `;
        }).join("")
        : `<div class="achievement-empty"><span aria-hidden="true">🌱✨</span><strong>Your garden is ready!</strong><span>Ask a grown-up to unlock it and plant your first goal.</span></div>`;
    }

    function addAchievementGoal() {
      if (!achievementEditorUnlocked) {
        achievementStatus.textContent = "A parent passcode is needed to add a goal.";
        openAchievementPasscodePrompt();
        return;
      }
      const child = currentChild();
      if (!child) {
        achievementStatus.textContent = "Add a child profile first.";
        return;
      }
      ensureChildAppState(child);
      const title = achievementTitle.value.trim();
      const rawTarget = Number(achievementTarget.value);
      const target = Number.isFinite(rawTarget) ? Math.min(100, Math.max(1, Math.round(rawTarget))) : 0;
      const reward = achievementReward.value.trim();
      if (!title) {
        achievementStatus.textContent = "Give the goal a name.";
        achievementTitle.focus();
        return;
      }
      if (!target) {
        achievementStatus.textContent = "Choose between 1 and 100 stars.";
        achievementTarget.focus();
        return;
      }
      if (child.achievementChart.length >= 20) {
        achievementStatus.textContent = "Finish or remove a goal before adding another.";
        return;
      }
      child.achievementChart.push({
        id: window.crypto?.randomUUID?.() || `goal-${Date.now()}-${child.achievementChart.length}`,
        title: title.slice(0, 80),
        target,
        progress: 0,
        reward: reward.slice(0, 80)
      });
      achievementTitle.value = "";
      achievementTarget.value = "5";
      achievementReward.value = "";
      achievementStatus.textContent = "New goal planted! Give a star whenever it is earned.";
      renderAchievementChart(child);
      queueSave();
      showToast("A new goal is growing!");
    }

    function updateAchievementGoal(action, index) {
      if (!achievementEditorUnlocked) {
        achievementStatus.textContent = "A parent passcode is needed to change stars.";
        openAchievementPasscodePrompt();
        return;
      }
      const child = currentChild();
      if (!child) return;
      ensureChildAppState(child);
      const achievement = child.achievementChart[index];
      if (!achievement) return;
      if (action === "increase") achievement.progress = Math.min(achievement.target, achievement.progress + 1);
      if (action === "decrease") achievement.progress = Math.max(0, achievement.progress - 1);
      if (action === "complete") achievement.progress = achievement.target;
      if (action === "remove") child.achievementChart.splice(index, 1);
      achievementStatus.textContent = action === "remove"
        ? "Goal removed."
        : achievement.progress >= achievement.target
          ? `${achievement.title} is complete.`
          : `${achievement.title}: ${achievement.progress} of ${achievement.target} stars.`;
      renderAchievementChart(child);
      queueSave();
      if (action !== "remove" && achievement.progress >= achievement.target) {
        celebrate();
        showToast("Achievement completed!");
      }
    }

    function renderSafetyAlerts() {
      const alerts = state.safetyAlerts || [];
      document.querySelector("#safetyAlerts").innerHTML = alerts.length
        ? alerts.map((alert) => `
          <div class="filter-item">
            <span>${escapeHtml(alert.child)}: ${escapeHtml(alert.message)}</span>
            <strong>${escapeHtml(alert.time)}</strong>
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
        button.addEventListener("click", () => reviewProblemReport(Number(button.dataset.reviewReport), button));
      });
      document.querySelectorAll("[data-follow-report]").forEach((button) => {
        button.addEventListener("click", () => followUpProblemReport(Number(button.dataset.followReport), button));
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
      const normalized = normalizeTrustedContacts(state.trustedContacts);
      const contacts = normalized.contacts;
      state.trustedContacts = contacts;
      const contactList = document.querySelector("#trustedContactsList");
      trustedContactsInput.value = contacts.join("\n");
      contactList.innerHTML = contacts.length
        ? contacts.map((contact) => `<div class="filter-item"><span>${escapeHtml(contact)}</span><strong>Trusted</strong></div>`).join("")
        : `<div class="filter-item"><span>No contacts set</span><strong>Ask</strong></div>`;
    }

    function renderMoodCheckins() {
      const moods = state.moodCheckins || [];
      document.querySelector("#moodCheckins").innerHTML = moods.length
        ? moods.map((mood) => `
          <div class="filter-item">
            <span>${escapeHtml(mood.child)}: ${escapeHtml(mood.mood)}</span>
            <strong>${escapeHtml(mood.time)}</strong>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No mood check-ins</span><strong>Clear</strong></div>`;
    }

    function renderFamilyRules() {
      const rules = state.familyRules || [];
      rulesInput.value = rules.join("\n");
      document.querySelector("#childRules").innerHTML = rules.length
        ? rules.map((rule) => `<div class="filter-item"><span>${escapeHtml(rule)}</span><strong>Rule</strong></div>`).join("")
        : `<div class="filter-item"><span>No rules set</span><strong>Open</strong></div>`;
    }

    function renderChores() {
      const chores = state.chores || [];
      choresInput.value = chores.map((chore) => chore.title).join("\n");
      document.querySelector("#childChores").innerHTML = chores.length
        ? chores.map((chore, index) => `
          <div class="filter-item">
            <span>${escapeHtml(chore.title)}</span>
            <button class="tiny" data-chore="${index}">Done</button>
          </div>
        `).join("")
        : `<div class="filter-item"><span>No chores set</span><strong>Open</strong></div>`;

      document.querySelectorAll("[data-chore]").forEach((button) => {
        button.addEventListener("click", () => submitChore(Number(button.dataset.chore), button));
      });
    }

    function renderFocus() {
      focusInput.value = state.focusGoal || "";
      document.querySelector("#childFocusGoal").textContent = state.focusGoal || "Focus for 15 minutes";
      document.querySelector("#focusClock").textContent = formatClock(focusSeconds);
    }

    function normalizeScheduleTime(value, fallback) {
      const text = String(value || "").trim();
      return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
    }

    function timeToMinutes(value) {
      const normalized = normalizeScheduleTime(value, "");
      if (!normalized) return null;
      const [hours, minutes] = normalized.split(":").map(Number);
      return hours * 60 + minutes;
    }

    function isNowInsideRange(start, end, now = new Date()) {
      const current = now.getHours() * 60 + now.getMinutes();
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
        return false;
      }
      if (startMinutes <= endMinutes) {
        return current >= startMinutes && current < endMinutes;
      }
      return current >= startMinutes || current < endMinutes;
    }

    function isBedtimeWindowActive(child, now = new Date()) {
      return Boolean(child?.bedtime) && isNowInsideRange(
        state.schedule?.bedtimeStart,
        state.schedule?.bedtimeEnd,
        now
      );
    }

    function renderBedtimeStatus(child, now = new Date()) {
      const enabled = Boolean(child?.bedtime);
      const active = enabled && isBedtimeWindowActive(child, now);
      const lockState = document.querySelector("#lockState");
      const deviceState = document.querySelector("#deviceState");
      const deviceSub = document.querySelector("#deviceSub");
      if (lockState) {
        const key = active ? "schedule.activeNow" : enabled ? "schedule.scheduled" : "schedule.off";
        const fallback = active ? "Active now" : enabled ? "Scheduled" : "Off";
        lockState.textContent = translate(key, {}, fallback);
      }
      if (deviceState) {
        const key = active ? "parent.deviceLocked" : enabled ? "parent.deviceActive" : "parent.bedtimeOff";
        const fallback = active ? "Bedtime window active" : enabled ? "Outside bedtime window" : "Bedtime schedule off";
        deviceState.textContent = translate(key, {}, fallback);
      }
      if (deviceSub) {
        const key = active ? "parent.deviceLockedHelp" : enabled ? "parent.deviceActiveHelp" : "parent.bedtimeOffHelp";
        const fallback = "This dashboard shows schedule status. Device-wide controls require the blocker companion.";
        deviceSub.textContent = translate(key, {}, fallback);
      }
      return active;
    }

    function renderParentNote() {
      const note = (state.parentNote || "").trim();
      document.querySelector("#parentNoteInput").value = note;
      document.querySelector("#childParentNote").textContent = note || "No parent note yet.";
    }

    function renderFamilySchedule(options = {}) {
      state.schedule ??= {};
      const schedule = state.schedule;
      schedule.schoolStart = normalizeScheduleTime(schedule.schoolStart, "08:45");
      schedule.schoolEnd = normalizeScheduleTime(schedule.schoolEnd, "15:15");
      schedule.bedtimeStart = normalizeScheduleTime(schedule.bedtimeStart, "20:30");
      schedule.bedtimeEnd = normalizeScheduleTime(schedule.bedtimeEnd, "07:00");
      if (options.syncInputs !== false) {
        document.querySelector("#schoolStartInput").value = schedule.schoolStart;
        document.querySelector("#schoolEndInput").value = schedule.schoolEnd;
        document.querySelector("#bedtimeStartInput").value = schedule.bedtimeStart;
        document.querySelector("#bedtimeEndInput").value = schedule.bedtimeEnd;
      }

      const now = options.now instanceof Date ? options.now : new Date();
      const child = currentChild();
      const schoolNow = isNowInsideRange(schedule.schoolStart, schedule.schoolEnd, now);
      const bedtimeEnabled = Boolean(child?.bedtime);
      const bedtimeNow = bedtimeEnabled && isNowInsideRange(schedule.bedtimeStart, schedule.bedtimeEnd, now);
      const scheduleNowKey = bedtimeNow ? "schedule.bedtimeHours" : schoolNow ? "schedule.schoolTime" : "schedule.freeTime";
      const scheduleNowFallback = bedtimeNow ? "Bedtime hours" : schoolNow ? "School time" : "Free time";
      document.querySelector("#scheduleNow").textContent = translate(scheduleNowKey, {}, scheduleNowFallback);
      const bedtimeSummary = document.querySelector("#bedtimeScheduleSummary");
      if (bedtimeSummary) {
        bedtimeSummary.textContent = translate("schedule.range", {
          start: schedule.bedtimeStart,
          end: schedule.bedtimeEnd
        }, `${schedule.bedtimeStart} to ${schedule.bedtimeEnd}`);
      }
      const schoolLabel = escapeHtml(translate("schedule.school", {}, "School"));
      const bedtimeLabel = escapeHtml(translate("schedule.bedtime", {}, "Bedtime"));
      const schoolHelp = escapeHtml(translate(
        schoolNow ? "schedule.schoolActiveHelp" : "schedule.schoolSaved",
        {},
        schoolNow ? "Focus and learning apps are best right now." : "School hours are saved."
      ));
      const bedtimeHelp = escapeHtml(translate(
        !bedtimeEnabled ? "schedule.bedtimeOffHelp" : bedtimeNow ? "schedule.bedtimeActiveHelp" : "schedule.bedtimeSaved",
        {},
        !bedtimeEnabled
          ? "Bedtime is off for this child profile."
          : bedtimeNow
            ? "The saved bedtime window is active now."
            : "Bedtime hours are saved."
      ));
      document.querySelector("#scheduleCards").innerHTML = `
        <article class="mini-card schedule-item">
          <span class="small">${schoolLabel}</span>
          <strong>${escapeHtml(schedule.schoolStart)} - ${escapeHtml(schedule.schoolEnd)}</strong>
          <p class="small">${schoolHelp}</p>
        </article>
        <article class="mini-card schedule-item">
          <span class="small">${bedtimeLabel}</span>
          <strong>${escapeHtml(schedule.bedtimeStart)} - ${escapeHtml(schedule.bedtimeEnd)}</strong>
          <p class="small">${bedtimeHelp}</p>
        </article>
      `;
    }

    function refreshTimeSensitiveDashboard(now = new Date()) {
      renderFamilySchedule({ syncInputs: false, now });
      const child = currentChild();
      if (child) renderBedtimeStatus(child, now);
    }

    function scheduleNextDashboardMinute() {
      const delay = 60000 - (Date.now() % 60000) + 25;
      window.setTimeout(() => {
        refreshTimeSensitiveDashboard();
        scheduleNextDashboardMinute();
      }, delay);
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
        const selected = button.dataset.avatarChoice === icon;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
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
        ["Reading Streak", Math.max(0, Number(streaks.reading) || 0), "Story pages and reading time"],
        ["Homework Streak", Math.max(0, Number(streaks.homework) || 0), "Focus sessions and plan work"],
        ["Exercise Streak", Math.max(0, Number(streaks.exercise) || 0), "Move breaks and active resets"],
        ["Chore Streak", Math.max(0, Number(streaks.chores) || 0), "Helpful tasks and home routines"]
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
          <button type="button" class="goal-chip ${done ? "done" : ""}" data-daily-win="${goal.id}" aria-pressed="${done}">
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
          <article class="plan-item ${done ? "done" : ""}" data-task-card="${task.id}" tabindex="-1" aria-labelledby="today-task-title-${task.id}">
            <span class="small">${task.report} · +${task.minutes}m</span>
            <h3 id="today-task-title-${task.id}">${task.title}</h3>
            <p class="small">${task.detail}</p>
            <button type="button" data-task="${task.id}"${done ? " disabled aria-disabled=\"true\"" : ""}>${done ? "Done" : "Complete"}</button>
          </article>
        `;
      }).join("");

      document.querySelectorAll("[data-task]:not(:disabled)").forEach((button) => {
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
        const groupLabel = translate("parent.appRule.group", { app: app.title }, `${app.title} access rule`);
        const allowLabel = translate("parent.appRule.allowed", {}, "Allow");
        const askLabel = translate("parent.appRule.request", {}, "Ask");
        const blockLabel = translate("parent.appRule.blocked", {}, "Block");
        return `
          <div class="filter-item app-access-item">
            <span>${escapeHtml(app.title)} <small>${escapeHtml(app.kind)}</small></span>
            <div class="choice-row" role="group" aria-label="${escapeHtml(groupLabel)}">
              <button type="button" class="tiny ${rule === "allowed" ? "active-rule" : ""}" data-app-rule="${id}" data-rule="allowed" aria-pressed="${rule === "allowed"}">${escapeHtml(allowLabel)}</button>
              <button type="button" class="tiny ${rule === "request" ? "active-rule" : ""}" data-app-rule="${id}" data-rule="request" aria-pressed="${rule === "request"}">${escapeHtml(askLabel)}</button>
              <button type="button" class="block ${rule === "blocked" ? "active-rule" : ""}" data-app-rule="${id}" data-rule="blocked" aria-pressed="${rule === "blocked"}">${escapeHtml(blockLabel)}</button>
            </div>
          </div>
        `;
      }).join("");

      document.querySelectorAll("[data-app-rule]").forEach((button) => {
        button.addEventListener("click", () => {
          const appId = button.dataset.appRule;
          const rule = button.dataset.rule;
          const app = APP_CATALOG[appId];
          setAppRule(child, appId, rule);
          renderControls(child);
          document.querySelector(`[data-app-rule="${appId}"][data-rule="${rule}"]`)?.focus({ preventScroll: true });
          broadcastExtensionBlockRules();
          queueSave();
          showToast(app.title + " is now set to " + appRuleLabel(rule) + ".");
        });
      });
    }

    function renderHubAccess(child) {
      normalizeAppRules(child);
      Object.entries(APP_CATALOG).forEach(([id, app]) => {
        const homeworkPaused = isAppPausedByHomework(child, id);
        const rule = effectiveAppRule(child, id);
        const label = document.querySelector(`[data-app-status-label="${id}"]`);
        if (label) {
          label.textContent = homeworkPaused
            ? translate("parent.appStatus.paused", {}, "Paused for Homework Mode")
            : rule === "allowed"
              ? translate("parent.appStatus.allowed", {}, "Approved app")
              : rule === "blocked"
                ? translate("parent.appStatus.blocked", {}, "Blocked by parent")
                : translate("parent.appStatus.request", {}, "Needs parent approval");
        }
        document.querySelectorAll(`[data-open-app="${id}"], [data-open-app-link="${id}"]`).forEach((control) => {
          control.classList.toggle("blocked-app", rule === "blocked");
          control.classList.toggle("request-app", rule === "request");
          const actionLabel = homeworkPaused
            ? translate("parent.appAction.paused", { app: app.title }, `${app.title} is paused while Homework Mode is on`)
            : rule === "allowed"
            ? translate("parent.appAction.open", { app: app.title }, `Open ${app.title}`)
            : rule === "blocked"
              ? translate("parent.appAction.blocked", { app: app.title }, `${app.title} is blocked by parent settings`)
              : translate("parent.appAction.request", { app: app.title }, `Ask a parent to open ${app.title}`);
          control.setAttribute("aria-label", actionLabel);
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
        "#parentHomeworkToggle",
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

    function renderPendingRequest(child) {
      const request = syncPendingRequests(child);
      document.querySelector("#appName").textContent = request
        ? child.currentRequest[0]
        : translate("parent.noRequest", {}, "No request yet");
      document.querySelector("#appMeta").textContent = request
        ? child.currentRequest[1]
        : translate("parent.noRequestHelp", {}, "Requests appear here after a child profile exists.");
      document.querySelector("#appInitial").textContent = request ? child.currentRequest[2] : "-";
      const approveButton = document.querySelector("#approveBtn");
      approveButton.disabled = !request;
      const approveKey = request?.[3] === "appDownload" ? "parent.review" : "parent.approve";
      approveButton.dataset.i18n = approveKey;
      approveButton.textContent = translate(approveKey, {}, request?.[3] === "appDownload" ? "Mark reviewed" : "Approve");
      const blockButton = document.querySelector("#blockBtn");
      blockButton.disabled = !request;
      const blocksAccess = request && (request[3] === "appAccess" || request[3] === "flyerAccess");
      const key = blocksAccess ? "parent.block" : "parent.decline";
      blockButton.dataset.i18n = key;
      blockButton.textContent = translate(key, {}, blocksAccess ? "Block" : "Decline");
      return request;
    }

    function renderNoChildState() {
      setChildControlsDisabled(true);
      document.querySelector("#childWelcome").textContent = translate("mode.noChild", {}, "Add a child profile");
      document.querySelector("#timeLeft").textContent = "—";
      document.querySelector("#pendingCount").textContent = "0";
      document.querySelector("#blockedHits").textContent = "0";
      document.querySelector("#limitRange").value = 30;
      decorateRange(document.querySelector("#limitRange"));
      document.querySelector("#limitValue").textContent = "—";
      document.querySelector("#lockState").textContent = translate("schedule.off", {}, "Off");
      document.querySelector("#bedtimeToggle").checked = false;
      parentHomeworkToggle.checked = false;
      parentHomeworkLabel.textContent = "Add a child profile before using Homework Mode.";
      flyerAllowedToggle.checked = false;
      flyerAllowedLabel.textContent = "Add a child profile before changing game access.";
      document.querySelector("#deviceState").textContent = translate("parent.noChild", {}, "No child selected");
      document.querySelector("#deviceSub").textContent = translate("parent.noChildHelp", {}, "Create a child profile before using controls.");
      document.querySelector("#appName").textContent = translate("parent.noRequest", {}, "No request yet");
      document.querySelector("#appMeta").textContent = translate("parent.noRequestHelp", {}, "Requests appear here after a child profile exists.");
      document.querySelector("#appInitial").textContent = "-";
      document.querySelector("#approveBtn").dataset.i18n = "parent.approve";
      document.querySelector("#approveBtn").textContent = translate("parent.approve", {}, "Approve");
      document.querySelector("#blockBtn").dataset.i18n = "parent.decline";
      document.querySelector("#blockBtn").textContent = translate("parent.decline", {}, "Decline");
      document.querySelector("#reportRows").innerHTML = `
        <div class="filter-item">
          <span>Add a child profile to start reports.</span>
          <strong>Waiting</strong>
        </div>
      `;
      renderAchievementChart(null);
      renderSafetyAlerts();
      renderProblemReports();
      renderScanHistory();
      renderTrustedContacts();
      renderMoodCheckins();
      renderFamilyRules();
      renderChores();
      renderFocus();
      renderParentNote();
      renderFamilySchedule({ syncInputs: false });
      broadcastExtensionBlockRules();
    }

    function renderControls(child) {
      setChildControlsDisabled(false);
      ensureChildAppState(child);
      document.querySelector("#childWelcome").textContent = translate("mode.childWelcome", { name: child.name }, child.name + "'s Child Mode");
      renderKidAvatarStudio(child);
      renderBadgeShelf(child);
      renderStreaks(child);
      renderHomeworkMode(child);
      renderDailyGoalBoard(child);
      renderKindnessQuest(child);
      renderDailySpark(child);
      renderReadingLog(child);
      renderHealthyBreaks(child);
      document.querySelector("#timeLeft").textContent = formatMinutes(child.dailyLimit);
      document.querySelector("#pendingCount").textContent = child.pending;
      document.querySelector("#blockedHits").textContent = child.blockedHits;
      document.querySelector("#limitRange").value = child.dailyLimit;
      decorateRange(document.querySelector("#limitRange"));
      document.querySelector("#limitValue").textContent = formatMinutes(child.dailyLimit);
      document.querySelector("#bedtimeToggle").checked = child.bedtime;
      const flyerRule = getAppRule(child, "flyer");
      flyerAllowedToggle.checked = flyerRule === "allowed";
      flyerAllowedLabel.textContent = isAppPausedByHomework(child, "flyer")
        ? "Paused while Homework Mode is on. The saved game setting will return afterwards."
        : flyerRule === "allowed"
        ? "Allowed for this child profile."
        : flyerRule === "blocked"
          ? "Blocked by parent settings."
          : "Parent approval required before play.";
      renderAppAccessRules(child);
      renderHubAccess(child);
      renderBedtimeStatus(child);
      renderPendingRequest(child);
      renderTodayPlan(child);
      renderReport(child);
      renderAchievementChart(child);
      renderSafetyAlerts();
      renderProblemReports();
      renderScanHistory();
      renderTrustedContacts();
      renderMoodCheckins();
      renderFamilyRules();
      renderChores();
      renderFocus();
      renderParentNote();
      renderFamilySchedule({ syncInputs: false });
      renderWellbeingSnapshot(child);
      broadcastExtensionBlockRules();
    }

    function render() {
      state.themeMode ??= "auto";
      state.languageMode = window.KiddoSproutLanguage?.normalize?.(state.languageMode) || "en-GB";
      applyLanguageMode(state.languageMode, { rearm: false });
      applyThemeMode(state.themeMode);
      passcodeSetting.value = "";
      setTranslatedText(
        passcodeSettingStatus,
        hasStoredParentPasscode() ? "settings.passcode.set" : "settings.passcode.notSet",
        hasStoredParentPasscode() ? "PIN set" : "Not set"
      );
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
      applyDemoAvailability();
      notifyFamilyCallContext();
    }

    function openApp(app, trigger = null) {
      const demoConnectedPages = {
        spending: "app_7.html",
        recipe: "recipe.html"
      };
      if (isDemoMode() && demoConnectedPages[app]) {
        window.location.href = demoConnectedPages[app];
        return;
      }
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        setMode("parent", { unlocked: true });
        return;
      }
      ensureChildAppState(child);
      const homeworkPaused = isAppPausedByHomework(child, app);
      const rule = effectiveAppRule(child, app);
      if (rule === "blocked") {
        const appTitle = APP_CATALOG[app]?.title || "This app";
        child.blockedHits += 1;
        renderControls(child);
        queueSave();
        showToast(homeworkPaused
          ? appTitle + " is paused while Homework Mode is on."
          : appTitle + " is blocked by parent settings.");
        return;
      }
      if (rule === "request") {
        return requestAppAccess(child, app, trigger);
      }
      const hubPages = {
        arcade: "games/",
        studio: "creator-studio.html",
        explore: "nature-explorer.html",
        move: "move-breaks.html",
        story: "story-theater.html",
        arcade: "games/index.html"
      };
      // The standalone hubs are safe, child-facing pages and understand both
      // real-family and tab-scoped demo state. Always open the complete hub so
      // the public colleague preview exercises the same navigation and content
      // as the signed-in app (especially Story Theater's series shelf).
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
      cancelPendingModeEntryFocus();
      closeSettingsMenu();
      if (!appModal.classList.contains("open")) {
        appModalTrigger = trigger?.focus
          ? trigger
          : document.activeElement?.focus
            ? document.activeElement
            : null;
      }
      appModal.removeAttribute("inert");
      appModal.classList.add("open");
      appModal.setAttribute("aria-hidden", "false");
      syncModalBackgroundInert();
      bindAppActions(app);
      if (app === "flyer") {
        setupFlyerGame();
      }
      // inert has already been removed and the dialog is visible. Focusing in
      // the same task keeps the modal usable even when animation frames are
      // throttled or paused by the browser.
      const closeAppButton = document.querySelector("#closeApp");
      appModal.getBoundingClientRect();
      closeAppButton?.focus({ preventScroll: true });
      window.setTimeout(() => {
        if (appModal.classList.contains("open")
            && !appModal.contains(document.activeElement)) {
          closeAppButton?.focus({ preventScroll: true });
        }
      }, 0);
    }

    function openLinkedApp(event) {
      const link = event.currentTarget;
      if (isDemoMode()) {
        if (link.hasAttribute("data-public-demo-preview")) return;
        event.preventDefault();
        showToast(demoBlockedMessage(link));
        return;
      }
      const appId = link.dataset.openAppLink;
      const child = currentChild();
      if (!child) {
        event.preventDefault();
        showToast("Add a child profile first.");
        setMode("parent", { unlocked: true });
        return;
      }
      ensureChildAppState(child);
      const homeworkPaused = isAppPausedByHomework(child, appId);
      const rule = effectiveAppRule(child, appId);
      if (rule === "allowed") {
        return;
      }
      event.preventDefault();
      const appTitleText = APP_CATALOG[appId]?.title || "This app";
      if (rule === "blocked") {
        child.blockedHits += 1;
        renderControls(child);
        queueSave();
        showToast(homeworkPaused
          ? appTitleText + " is paused while Homework Mode is on."
          : appTitleText + " is blocked by parent settings.");
        return;
      }
      return requestAppAccess(child, appId, link);
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
      if (!task) {
        showToast("That Today Plan task could not be found.");
        return;
      }
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
      document.querySelector(`[data-task-card="${taskId}"]`)?.focus({ preventScroll: true });
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

    function toggleHomeworkMode(event) {
      const child = currentChild();
      if (!child) {
        parentHomeworkToggle.checked = false;
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      child.homeworkMode = Boolean(event?.target?.checked);
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
      showToast(translate("settings.wellbeing.saved", {}, "Wellbeing goals saved."));
    }

    function saveTrustedContacts() {
      const normalized = normalizeTrustedContacts(trustedContactsInput.value);
      state.trustedContacts = normalized.contacts;
      renderTrustedContacts();
      queueSave();
      const key = normalized.contacts.length === 0
        ? "settings.contacts.cleared"
        : normalized.adjusted
          ? "settings.contacts.adjusted"
          : "settings.contacts.saved";
      const fallback = normalized.contacts.length === 0
        ? "Trusted contacts cleared."
        : normalized.adjusted
          ? "Contacts saved with safety limits: up to 20 unique contacts and 80 characters per name."
          : "Trusted contacts saved.";
      setTranslatedText(trustedContactsStatus, key, fallback);
      setAuthStatus(
        trustedContactsStatus,
        trustedContactsStatus.textContent,
        normalized.adjusted ? "notice" : "success"
      );
      showToast(trustedContactsStatus.textContent, { announce: false });
    }

    function removeFamilyActivityRow(collectionName, row) {
      if (!row) return;
      const rows = Array.isArray(state[collectionName]) ? state[collectionName] : [];
      const index = rows.indexOf(row);
      if (index >= 0) rows.splice(index, 1);
      state[collectionName] = rows;
    }

    function restoreClearedFamilyActivity(collectionName, previousRows) {
      const currentRows = Array.isArray(state[collectionName]) ? state[collectionName] : [];
      const currentSet = new Set(currentRows);
      state[collectionName] = [
        ...currentRows,
        ...previousRows.filter((row) => !currentSet.has(row))
      ];
    }

    async function submitProblemReport(control = null) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return false;
      }
      const problemInput = document.querySelector("#problemType");
      const typedProblem = problemInput.value.trim();
      const type = typedProblem ? typedProblem.slice(0, 48) : "Problem";
      const urgency = document.querySelector("#problemUrgency").value;
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return runCriticalSave({
        control,
        apply: () => {
          state.problemReports = Array.isArray(state.problemReports) ? state.problemReports : [];
          state.problemReports.unshift({
            childId: state.activeChild,
            child: child.name,
            type,
            urgency,
            note: typedProblem,
            time,
            status: "New"
          });
          const reportRow = state.problemReports[0];
          state.safetyAlerts = Array.isArray(state.safetyAlerts) ? state.safetyAlerts : [];
          state.safetyAlerts.unshift({
            childId: state.activeChild,
            child: child.name,
            message: type + " reported" + (urgency === "Needs help now" ? " - urgent" : ""),
            time
          });
          return { reportRow, alertRow: state.safetyAlerts[0] };
        },
        rollback: (rows) => {
          removeFamilyActivityRow("problemReports", rows?.reportRow);
          removeFamilyActivityRow("safetyAlerts", rows?.alertRow);
        },
        onSuccess: () => {
          if (problemInput.value.trim() === typedProblem) problemInput.value = "";
          celebrate();
        },
        render: () => renderControls(child),
        success: "Problem report sent to parent dashboard.",
        failure: "Problem report was not saved. Please try again."
      });
    }

    function clearProblemForm() {
      document.querySelector("#problemType").value = "";
      document.querySelector("#problemUrgency").value = "Needs help now";
      showToast("Problem report form cleared.");
    }

    async function reviewProblemReport(index, control = null) {
      const report = (state.problemReports || [])[index];
      if (!report) {
        return false;
      }
      const previousStatus = report.status;
      return runCriticalSave({
        control,
        apply: () => {
          report.status = "Reviewed";
          return report;
        },
        rollback: (changedReport) => {
          if (changedReport?.status === "Reviewed") changedReport.status = previousStatus;
        },
        render: renderProblemReports,
        success: "Problem report marked reviewed.",
        failure: "The reviewed status was not saved. Please try again."
      });
    }

    async function followUpProblemReport(index, control = null) {
      const report = (state.problemReports || [])[index];
      if (!report) {
        return false;
      }
      const previousStatus = report.status;
      const child = currentChild();
      return runCriticalSave({
        control,
        apply: () => {
          report.status = "Follow up";
          state.safetyAlerts = Array.isArray(state.safetyAlerts) ? state.safetyAlerts : [];
          state.safetyAlerts.unshift({
            childId: report.childId,
            child: report.child,
            message: "Parent follow-up needed: " + report.type,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          });
          return { report, alertRow: state.safetyAlerts[0] };
        },
        rollback: (change) => {
          if (change?.report?.status === "Follow up") change.report.status = previousStatus;
          removeFamilyActivityRow("safetyAlerts", change?.alertRow);
        },
        render: () => {
          if (child) renderControls(child);
          else renderNoChildState();
        },
        success: "Follow-up added to safety alerts.",
        failure: "The follow-up was not saved. Please try again."
      });
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
        childId: state.activeChild,
        label: (input.value.trim() || "Empty scan").slice(0, 48),
        result: scan.result,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      state.scanHistory = state.scanHistory.slice(0, 12);

      if (scan.result === "Blocked" || scan.result === "Needs Review") {
        child.blockedHits += 1;
        state.safetyAlerts = state.safetyAlerts || [];
        state.safetyAlerts.unshift({
          childId: state.activeChild,
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
      document.querySelector(`[data-daily-win="${goalId}"]`)?.focus({ preventScroll: true });
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
        childId: state.activeChild,
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
          ? child.creatorQueue.map((item) => `<div class="filter-item"><span>${escapeHtml(item)}</span><strong>Review</strong></div>`).join("")
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
            <a class="mini-link" href="recipe.html" data-demo-protected="Real recipe accounts are off" data-public-demo-preview data-demo-preview-title="Open the interactive tab-only FlavorNest practice book">Open Recipe Page</a>
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
            <canvas id="flyerCanvas" width="640" height="360" tabindex="0" aria-label="Sprout Flyer game area. Press Space to fly."></canvas>
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
        if (!enqueuePendingRequest(child, ["Creator Clip", "Video upload requested from " + child.name + "'s profile", "C", "creatorUpload"])) {
          showToast("The parent request list is full. Review a request before recording another clip.");
          return;
        }
        child.creatorQueue.push("Fact clip " + (child.creatorQueue.length + 1));
        showToast("Clip queued for parent review.");
      } else if (action === "clearQueue") {
        child.creatorQueue = [];
        removePendingRequests(child, (request) => request[3] === "creatorUpload");
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
          childId: state.activeChild,
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
      canvas.addEventListener("pointerdown", () => {
        canvas.focus({ preventScroll: true });
        flapFlyer();
      });
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
      if (
        event.code === "Space"
        && appModal.classList.contains("open")
        && flyerGame
        && event.target === flyerGame.canvas
      ) {
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
      const wasOpen = appModal.classList.contains("open");
      window.clearInterval(moveTimer);
      stopFlyerGame();
      appModal.classList.remove("open");
      appModal.setAttribute("aria-hidden", "true");
      appModal.setAttribute("inert", "");
      syncModalBackgroundInert();
      const returnTarget = appModalTrigger;
      appModalTrigger = null;
      closeTimer = window.setTimeout(() => {
        appBody.innerHTML = "";
      }, 230);
      if (wasOpen && returnTarget?.isConnected) {
        returnTarget.focus({ preventScroll: true });
      }
    }

    async function nextRequest(control = null) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        setMode("parent", { unlocked: true });
        return false;
      }
      ensureChildAppState(child);
      const previousRequestIndex = requestIndex;
      const nextRequestIndex = (requestIndex + 1) % requestNames.length;
      const [name, initial, type] = requestNames[nextRequestIndex];
      if (child.homeworkMode && (type === "Game app" || type === "Video app")) {
        showToast("Homework Mode is blocking game and video requests.");
        const saved = await sendSafetyAlert("Homework Mode blocked a " + type.toLowerCase() + " request", control);
        if (saved) requestIndex = nextRequestIndex;
        return saved;
      }
      const previousRequests = snapshotPendingRequestState(child);
      if (child.requests.length >= 100) {
        showToast("The parent request list is full. Review a request before adding another.");
        return false;
      }
      return runCriticalSave({
        control,
        apply: () => {
          requestIndex = nextRequestIndex;
          return enqueueTrackedPendingRequest(child, [
            name,
            `${type} requested from ${child.name}'s ${child.device}`,
            initial,
            "appDownload"
          ]);
        },
        rollback: (addedRequest) => {
          requestIndex = previousRequestIndex;
          rollbackEnqueuedPendingRequest(child, previousRequests, addedRequest);
        },
        onSuccess: () => celebrate(),
        render,
        success: "Request sent to parent dashboard.",
        failure: "The request was not saved. Please try again."
      });
    }

    function queueSafetyAlertRow(message, child) {
      state.safetyAlerts = Array.isArray(state.safetyAlerts) ? state.safetyAlerts : [];
      state.safetyAlerts.unshift({
        childId: state.activeChild,
        child: child.name,
        message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      return state.safetyAlerts[0];
    }

    async function sendSafetyAlert(message, control = null) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return false;
      }
      return runCriticalSave({
        control,
        apply: () => queueSafetyAlertRow(message, child),
        rollback: (alertRow) => removeFamilyActivityRow("safetyAlerts", alertRow),
        render: renderSafetyAlerts,
        success: "Sent to parent dashboard.",
        failure: "The alert was not saved. Please try again."
      });
    }

    async function handleHelpAction(action, control = null) {
      if (action === "needHelp") {
        return sendSafetyAlert("Needs help now", control);
      } else if (action === "extraTime") {
        const child = currentChild();
        if (!child) {
          showToast("Add a child profile first.");
          return false;
        }
        const previousRequests = snapshotPendingRequestState(child);
        if (child.requests.length >= 100) {
          showToast("The parent request list is full. Review a request before adding another.");
          return false;
        }
        return runCriticalSave({
          control,
          apply: () => enqueueTrackedPendingRequest(child, [
            "Extra Time",
            "Extra screen time requested from " + child.name + "'s profile",
            "+",
            "extraTime"
          ]),
          rollback: (addedRequest) => rollbackEnqueuedPendingRequest(child, previousRequests, addedRequest),
          onSuccess: () => celebrate(),
          render,
          success: "Extra time request sent.",
          failure: "The extra time request was not saved. Please try again."
        });
      } else if (action === "calmBreak") {
        addReportMinutes("Movement", 2);
        openApp("move");
        showToast("Calm break started.");
        celebrate();
      }
      return true;
    }

    async function sendMoodCheckin(mood, control = null) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return false;
      }
      return runCriticalSave({
        control,
        apply: () => {
          state.moodCheckins = Array.isArray(state.moodCheckins) ? state.moodCheckins : [];
          state.moodCheckins.unshift({
            childId: state.activeChild,
            child: child.name,
            mood,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          });
          const moodRow = state.moodCheckins[0];
          let alertRow = null;
          if (mood === "Need help") {
            alertRow = queueSafetyAlertRow("Mood check-in says they need help", child);
          }
          return { moodRow, alertRow };
        },
        rollback: (rows) => {
          removeFamilyActivityRow("moodCheckins", rows?.moodRow);
          if (rows?.alertRow) removeFamilyActivityRow("safetyAlerts", rows.alertRow);
        },
        onSuccess: () => {
          if (mood !== "Need help") celebrate();
        },
        render: () => {
          renderMoodCheckins();
          if (mood === "Need help") renderSafetyAlerts();
        },
        success: "Mood check-in sent.",
        failure: "The mood check-in was not saved. Please try again."
      });
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
      const child = currentChild();
      if (child) renderBedtimeStatus(child);
      queueSave();
      showToast(translate("settings.schedule.saved", {}, "Family schedule saved."));
    }

    function familyActivityForChild(rows, childId) {
      if (!isSafeChildProfileId(childId) || !Array.isArray(rows)) return [];
      return rows.filter((row) => isPlainFamilyRecord(row) && row.childId === childId);
    }

    function exportWeeklySummary() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      ensureChildAppState(child);
      const childId = state.activeChild;
      const summary = {
        app: "KiddoSprout",
        exportedAt: new Date().toISOString(),
        familyName: state.familyName,
        child: {
          id: childId,
          name: child.name,
          device: child.device,
          schoolYear: child.schoolYear || "",
          dailyLimit: child.dailyLimit,
          usageTracking: "This dashboard does not measure device-wide usage.",
          pendingRequests: child.pending,
          blockedHits: child.blockedHits,
          bedtimeScheduleEnabled: Boolean(child.bedtime),
          bedtimeWindowActive: isBedtimeWindowActive(child)
        },
        schedule: state.schedule,
        wellbeing: {
          dailyWins: child.dailyWins || {},
          waterCount: child.waterCount || 0,
          eyeBreaks: child.eyeBreaks || 0,
          readingLog: child.readingLog || [],
          kindnessPoints: child.kindnessPoints || 0,
          achievementChart: child.achievementChart || []
        },
        reports: {
          appMinutes: child.report || {},
          safetyAlerts: familyActivityForChild(state.safetyAlerts, childId),
          moodCheckins: familyActivityForChild(state.moodCheckins, childId),
          problemReports: familyActivityForChild(state.problemReports, childId),
          scanHistory: familyActivityForChild(state.scanHistory, childId)
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

    function stopFocusTimer() {
      window.clearInterval(focusTimer);
      focusTimer = null;
      focusDeadline = 0;
    }

    function abandonFocusSession() {
      stopFocusTimer();
      focusSeconds = 900;
    }

    function startFocusSession() {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      stopFocusTimer();
      focusDeadline = Date.now() + focusSeconds * 1000;
      focusTimer = window.setInterval(() => {
        focusSeconds = Math.max(0, Math.ceil((focusDeadline - Date.now()) / 1000));
        document.querySelector("#focusClock").textContent = formatClock(focusSeconds);
        if (focusSeconds === 0) {
          completeFocusSession();
        }
      }, 1000);
      showToast("Focus session started.");
    }

    function resetFocusSession() {
      abandonFocusSession();
      renderFocus();
      showToast("Focus session reset.");
    }

    async function completeFocusSession(control = null) {
      if (criticalSaveInFlight) {
        if (control) showToast("Please wait for the current save to finish.");
        return false;
      }
      stopFocusTimer();
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return false;
      }
      ensureChildAppState(child);
      const message = "Please check my focus work: " + (state.focusGoal || "Focus session");
      const previousRequests = snapshotPendingRequestState(child);
      if (child.requests.length >= 100) {
        focusSeconds = 900;
        renderFocus();
        showToast("Focus finished, but the parent request list is full. Ask a parent to review it.");
        return false;
      }
      return runCriticalSave({
        control,
        apply: () => enqueueTrackedPendingRequest(child, [
          "Parent Chat",
          `${child.name}: ${message}`,
          "P",
          "parentChat",
          message
        ]),
        rollback: (addedRequest) => rollbackEnqueuedPendingRequest(child, previousRequests, addedRequest),
        onSuccess: () => {
          focusSeconds = 900;
        },
        render: () => renderControls(child),
        success: "Message sent to parent for checking.",
        failure: "The focus message was not saved. Please try again."
      });
    }

    async function sendParentChat(control = null) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return false;
      }
      ensureChildAppState(child);
      const type = document.querySelector("#parentChatType").value;
      const chatInput = document.querySelector("#parentChatMessage");
      const note = chatInput.value.trim();
      const message = note ? type + ": " + note : type;
      const previousRequests = snapshotPendingRequestState(child);
      if (child.requests.length >= 100) {
        showToast("The parent request list is full. Your message was not sent yet.");
        return false;
      }
      return runCriticalSave({
        control,
        apply: () => enqueueTrackedPendingRequest(child, [
          "Parent Chat",
          `${child.name}: ${message}`,
          "P",
          "parentChat",
          message
        ]),
        rollback: (addedRequest) => rollbackEnqueuedPendingRequest(child, previousRequests, addedRequest),
        onSuccess: () => {
          if (chatInput.value.trim() === note) chatInput.value = "";
        },
        render,
        success: "Parent chat sent.",
        failure: "Parent chat was not saved. Please try again."
      });
    }

    function clearParentChat() {
      document.querySelector("#parentChatMessage").value = "";
      document.querySelector("#parentChatType").value = "Please check my homework";
      showToast("Parent chat cleared.");
    }

    async function submitChore(index, control = null) {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return false;
      }
      const chore = (state.chores || [])[index];
      if (!chore) {
        return false;
      }
      const previousRequests = snapshotPendingRequestState(child);
      if (child.requests.length >= 100) {
        showToast("The parent request list is full. This chore was not submitted yet.");
        return false;
      }
      return runCriticalSave({
        control,
        apply: () => enqueueTrackedPendingRequest(child, [
          chore.title,
          `${child.name} marked a helpful chore as done.`,
          "C",
          "choreComplete"
        ]),
        rollback: (addedRequest) => rollbackEnqueuedPendingRequest(child, previousRequests, addedRequest),
        render,
        success: "Chore sent for parent approval.",
        failure: "The chore was not saved for parent approval. Please try again."
      });
    }

    function resolveCreatorQueueRequest(child, request) {
      child.creatorQueue = Array.isArray(child.creatorQueue) ? child.creatorQueue : [];
      const requestedTitle = String(request[4] || "");
      const matchingIndex = requestedTitle
        ? child.creatorQueue.findIndex((title) => String(title) === requestedTitle)
        : 0;
      if (matchingIndex >= 0) child.creatorQueue.splice(matchingIndex, 1);
    }

    function snapshotRequestDecisionState(child) {
      ensureChildAppState(child);
      return {
        pendingRequests: snapshotPendingRequestState(child),
        creatorQueue: child.creatorQueue.slice(),
        dailyLimit: child.dailyLimit,
        report: { ...child.report },
        streaks: { ...child.streaks },
        appRules: { ...child.appRules },
        flyerAllowed: child.flyerAllowed
      };
    }

    function restoreRequestDecisionState(child, snapshot, request, decision) {
      restoreRemovedPendingRequest(child, snapshot.pendingRequests);
      const kind = request?.[3] || "appDownload";
      if (kind === "creatorUpload" || kind === "creatorReview") {
        child.creatorQueue = Array.isArray(child.creatorQueue) ? child.creatorQueue : [];
        const requestedTitle = String(request?.[4] || snapshot.creatorQueue[0] || "");
        const originalCount = snapshot.creatorQueue.filter((title) => String(title) === requestedTitle).length;
        const currentCount = child.creatorQueue.filter((title) => String(title) === requestedTitle).length;
        if (requestedTitle && currentCount < originalCount) {
          const originalIndex = snapshot.creatorQueue.findIndex((title) => String(title) === requestedTitle);
          child.creatorQueue.splice(Math.min(Math.max(0, originalIndex), child.creatorQueue.length), 0, requestedTitle);
        }
      }
      if (decision === "approve" && kind === "extraTime") {
        const approvedLimit = Math.min(300, Number(snapshot.dailyLimit) + 15);
        if (child.dailyLimit === approvedLimit) child.dailyLimit = snapshot.dailyLimit;
      } else if (decision === "approve" && kind === "choreComplete") {
        child.report.Stories = Math.max(0, Number(child.report.Stories || 0) - 2);
        child.streaks.chores = Math.max(0, Number(child.streaks.chores || 0) - 1);
      } else if (decision === "approve" && kind === "parentChat"
          && String(request?.[4] || "").toLowerCase().includes("homework")) {
        child.streaks.homework = Math.max(0, Number(child.streaks.homework || 0) - 1);
      }
      if (kind === "appAccess") {
        const appId = request?.[4];
        const appliedRule = decision === "approve" ? "allowed" : "blocked";
        if (appId && child.appRules[appId] === appliedRule) child.appRules[appId] = snapshot.appRules[appId];
      } else if (kind === "flyerAccess") {
        const appliedRule = decision === "approve" ? "allowed" : "blocked";
        if (child.appRules.flyer === appliedRule) {
          child.appRules.flyer = snapshot.appRules.flyer;
          child.flyerAllowed = snapshot.flyerAllowed;
        }
      }
    }

    function approveCurrentRequest(child) {
      ensureChildAppState(child);
      const request = syncPendingRequests(child);
      if (!request) return null;
      const kind = request[3] || "appDownload";
      if (kind === "creatorUpload" || kind === "creatorReview") {
        resolveCreatorQueueRequest(child, request);
      } else if (kind === "extraTime") {
        child.dailyLimit = Math.min(300, child.dailyLimit + 15);
      } else if (kind === "choreComplete") {
        child.report.Stories = (child.report.Stories || 0) + 2;
        child.streaks.chores += 1;
      } else if (kind === "parentChat") {
        if (String(request[4] || "").toLowerCase().includes("homework")) {
          child.streaks.homework += 1;
        }
      } else if (kind === "appAccess") {
        setAppRule(child, request[4], "allowed");
      } else if (kind === "flyerAccess") {
        setAppRule(child, "flyer", "allowed");
      }
      takePendingRequest(child);
      return request;
    }

    function declineCurrentRequest(child) {
      ensureChildAppState(child);
      const request = syncPendingRequests(child);
      if (!request) return null;
      const kind = request[3] || "appDownload";
      if (kind === "creatorUpload" || kind === "creatorReview") {
        resolveCreatorQueueRequest(child, request);
      } else if (kind === "appAccess") {
        setAppRule(child, request[4], "blocked");
      } else if (kind === "flyerAccess") {
        setAppRule(child, "flyer", "blocked");
      }
      takePendingRequest(child);
      return request;
    }

    document.addEventListener("click", (event) => {
      if (!isDemoMode()) return;
      const protectedTarget = event.target.closest?.("[data-demo-protected]");
      if (!protectedTarget) return;
      if (protectedTarget.hasAttribute("data-public-demo-preview")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast(demoBlockedMessage(protectedTarget));
    }, true);

    exploreDemoButton?.addEventListener("click", startDemoMode);
    resetDemoButton?.addEventListener("click", resetDemoMode);
    exitDemoButton?.addEventListener("click", exitDemoMode);

    const mobileSidebarQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 900px)")
      : null;

    function createFeatureFolderViewportController(folders) {
      const folderList = Array.from(folders || []);
      const openStates = {
        desktop: new Map(folderList.map((folder) => [folder, Boolean(folder.open)])),
        mobile: new Map(folderList.map((folder) => [folder, false]))
      };
      let currentMode = null;

      function rememberOpenStates(mode) {
        if (!mode) return;
        folderList.forEach((folder) => {
          openStates[mode].set(folder, Boolean(folder.open));
        });
      }

      function focusSummaryBeforeClosing(folder) {
        if (!folder.open || !folder.contains(document.activeElement)) return;
        const summary = folder.querySelector("summary");
        if (!summary || document.activeElement === summary) return;
        summary.focus({ preventScroll: true });
      }

      function sync(mediaQuery) {
        if (!mediaQuery) return;
        const nextMode = mediaQuery.matches ? "mobile" : "desktop";
        if (nextMode === currentMode) return;
        rememberOpenStates(currentMode);
        folderList.forEach((folder) => {
          const shouldOpen = Boolean(openStates[nextMode].get(folder));
          if (!shouldOpen) focusSummaryBeforeClosing(folder);
          folder.open = shouldOpen;
        });
        currentMode = nextMode;
      }

      return { sync };
    }

    function syncFeatureFoldersForViewport(mediaQuery = mobileSidebarQuery) {
      featureFolderViewportController.sync(mediaQuery);
    }

    const featureFolderViewportController = createFeatureFolderViewportController(featureFolders);

    if (mobileSidebarQuery) {
      syncFeatureFoldersForViewport();
      if (typeof mobileSidebarQuery.addEventListener === "function") {
        mobileSidebarQuery.addEventListener("change", syncFeatureFoldersForViewport);
      } else {
        mobileSidebarQuery.addListener?.(syncFeatureFoldersForViewport);
      }
    }

    function preferredScrollBehavior() {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
    }

    function scrollToJumpTarget(target) {
      const bannerHeight = isDemoMode() && demoBanner && !demoBanner.hidden
        ? demoBanner.getBoundingClientRect().height
        : 0;
      const topbar = document.querySelector(".topbar");
      const topbarHeight = !isDemoMode() && topbar
        ? topbar.getBoundingClientRect().height
        : 0;
      const offset = bannerHeight + topbarHeight + (bannerHeight || topbarHeight ? 24 : 0);
      const top = window.scrollY + target.getBoundingClientRect().top - offset;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: preferredScrollBehavior()
      });
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
          scrollToJumpTarget(target);
        }
        document.querySelectorAll(".nav button").forEach((item) => {
          const selected = item.dataset.jump === button.dataset.jump;
          item.classList.toggle("active", selected);
          if (selected) item.setAttribute("aria-current", "location");
          else item.removeAttribute("aria-current");
        });
      });
    });

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        tabButtons.forEach((item) => {
          const selected = item === button;
          item.classList.toggle("active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        const filter = button.dataset.filter;
        hubCards.forEach((card) => {
          card.hidden = filter !== "all" && card.dataset.kind !== filter;
        });
      });
    });

    document.querySelectorAll("[data-open-app]").forEach((button) => {
      button.addEventListener("click", () => openApp(button.dataset.openApp, button));
    });
    document.querySelectorAll("[data-open-app-link]").forEach((link) => {
      link.addEventListener("click", openLinkedApp);
    });
    document.querySelectorAll("[data-help-action]").forEach((button) => {
      button.addEventListener("click", () => handleHelpAction(button.dataset.helpAction, button));
    });
    document.querySelectorAll("[data-mood]").forEach((button) => {
      button.addEventListener("click", () => sendMoodCheckin(button.dataset.mood, button));
    });

    document.querySelector("#modeToggle").addEventListener("click", () => {
      const nextMode = viewMode === "child" ? "parent" : "child";
      setMode(nextMode);
      focusModeEntry(viewMode);
    });
    document.querySelector("#heroChildMode").addEventListener("click", openChildModeFromHero);
    document.querySelector("#childAskApp").addEventListener("click", (event) => nextRequest(event.currentTarget));
    document.querySelector("#unlockParent").addEventListener("click", unlockParent);
    document.querySelector("#backToChild").addEventListener("click", () => setMode("child"));
    document.querySelector("#openSignup").addEventListener("click", () => {
      setMode("signup");
      focusModeEntry(viewMode);
    });
    document.querySelector("#savePasscodeSetting").addEventListener("click", saveParentPasscode);
    document.querySelector("#saveSecondParent").addEventListener("click", saveSecondParent);
    [secondParentNameSetting, secondParentEmailSetting].forEach((input) => {
      input.addEventListener("input", clearSecondParentValidation);
    });
    settingsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const opening = !settingsMenu.classList.contains("open");
      setSettingsMenu(opening, { focus: opening });
    });
    settingsClose.addEventListener("click", () => closeSettingsMenu({ restoreFocus: true }));
    settingsMenu.addEventListener("click", (event) => event.stopPropagation());
    quickParentSettings.addEventListener("click", openParentSettingsFromMenu);
    logoutKiddoSproutButton?.addEventListener("click", logoutKiddoSprout);
    themeModeSetting.addEventListener("change", () => { void saveThemeMode(themeModeSetting.value); });
    quickThemeModeSetting.addEventListener("change", () => { void saveThemeMode(quickThemeModeSetting.value); });
    languageModeSetting?.addEventListener("change", () => { void saveLanguageMode(languageModeSetting.value); });
    quickLanguageModeSetting?.addEventListener("change", () => { void saveLanguageMode(quickLanguageModeSetting.value); });
    window.addEventListener("storage", syncPreferencesFromStorage);
    window.addEventListener("resize", fitSettingsMenuToViewport);
    window.visualViewport?.addEventListener?.("resize", fitSettingsMenuToViewport);
    document.querySelector("#saveRules").addEventListener("click", saveFamilyRules);
    document.querySelector("#saveChores").addEventListener("click", saveChores);
    document.querySelector("#saveFocus").addEventListener("click", saveFocusGoal);
    document.querySelector("#saveParentNote").addEventListener("click", saveParentNote);
    document.querySelector("#saveWellbeing").addEventListener("click", saveWellbeingGoals);
    document.querySelector("#saveTrustedContacts").addEventListener("click", saveTrustedContacts);
    trustedContactsInput.addEventListener("input", () => {
      setAuthStatus(trustedContactsStatus, "", "notice");
      trustedContactsStatus.removeAttribute("data-i18n");
    });
    document.querySelector("#saveSchedule").addEventListener("click", saveSchedule);
    document.querySelector("#addChild").addEventListener("click", addChildProfile);
    openAchievementLockButton.addEventListener("click", openAchievementPasscodePrompt);
    unlockAchievementEditorButton.addEventListener("click", unlockAchievementControls);
    cancelAchievementUnlockButton.addEventListener("click", () => closeAchievementPasscodePrompt({ restoreFocus: true }));
    lockAchievementEditorButton.addEventListener("click", () => lockAchievementControls({ restoreFocus: true }));
    viewAchievementPasscode.addEventListener("change", () => {
      achievementPasscode.type = viewAchievementPasscode.checked ? "text" : "password";
    });
    achievementPasscode.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        unlockAchievementControls();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeAchievementPasscodePrompt({ restoreFocus: true });
      }
    });
    document.querySelector("#addAchievement").addEventListener("click", addAchievementGoal);
    achievementChartList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-achievement-action]");
      if (!button) return;
      updateAchievementGoal(button.dataset.achievementAction, Number(button.dataset.achievementIndex));
    });
    [achievementTitle, achievementTarget, achievementReward].forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addAchievementGoal();
        }
      });
    });
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
    loginForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const updatingPassword = !accountPasswordRecoveryPanel.hidden && !accountPasswordUpdateFields.hidden;
      if (updatingPassword) updateAccountPasswordFromRecovery();
      else loginKiddoSprout();
    });
    window.addEventListener("beforeunload", (event) => {
      if (!accountPasswordUpdateInFlight) return;
      event.preventDefault();
      event.returnValue = "";
    });
    signupForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (googleOnboardingActive) finishGoogleSetup();
      else if (emailConfirmationPending) continueAfterEmailConfirmation();
      else createAccount();
    });
    googleLoginButton?.addEventListener("click", () => startGoogleOAuth("login"));
    googleSignupButton?.addEventListener("click", () => startGoogleOAuth("signup"));
    googleRecoveryButton?.addEventListener("click", () => startGoogleOAuth("login", googleRecoveryStatus));
    finishGoogleSetupButton?.addEventListener("click", finishGoogleSetup);
    ["login", "signup", "recovery"].forEach((kind) => {
      humanCheckElements(kind).start?.addEventListener("click", () => ensureHumanCheck(kind));
    });
    downloadSignupButton.addEventListener("click", () => installKiddoSproutApp(downloadSignupButton));
    downloadKiddoSproutButton.addEventListener("click", () => installKiddoSproutApp(downloadKiddoSproutButton));
    document.querySelector("#loginToSignup").addEventListener("click", () => {
      setMode("signup");
      focusModeEntry(viewMode);
    });
    document.querySelector("#signupToLogin").addEventListener("click", () => {
      setMode("login");
      focusModeEntry(viewMode);
    });
    forgotAccountPasswordButton?.addEventListener("click", () => {
      if (accountPasswordRecoveryPanel.hidden) {
        showAccountPasswordRecovery("request");
        setAuthStatus(accountPasswordRecoveryStatus, "", "notice");
        (loginEmail.value.trim() ? sendAccountPasswordRecoveryButton : loginEmail).focus({ preventScroll: true });
      } else {
        const closed = hideAccountPasswordRecovery({ revokeSession: true, clearTransaction: true });
        if (closed) forgotAccountPasswordButton.focus({ preventScroll: true });
      }
    });
    sendAccountPasswordRecoveryButton?.addEventListener("click", requestAccountPasswordRecovery);
    [cancelAccountPasswordRecoveryButton, cancelAccountPasswordUpdateButton].forEach((button) => {
      button?.addEventListener("click", () => {
        const closed = hideAccountPasswordRecovery({ revokeSession: true, clearTransaction: true });
        if (closed) forgotAccountPasswordButton.focus({ preventScroll: true });
      });
    });
    viewAccountPassword?.addEventListener("change", () => {
      const type = viewAccountPassword.checked ? "text" : "password";
      accountPasswordNew.type = type;
      accountPasswordConfirm.type = type;
    });
    [accountPasswordNew, accountPasswordConfirm].forEach((input) => {
      input?.addEventListener("input", () => clearAuthFieldError(input));
    });
    resendLoginEmailButton.addEventListener("click", () => resendKiddoSproutEmail("login"));
    resendSignupEmailButton.addEventListener("click", () => resendKiddoSproutEmail("signup"));
    checkEmailConfirmationButton.addEventListener("click", continueAfterEmailConfirmation);
    restartEmailSignupButton?.addEventListener("click", restartEmailSignup);
    document.querySelector("#signupToChild").addEventListener("click", () => {
      setMode("child");
      focusModeEntry(viewMode);
    });
    document.querySelector("#forgotPassword").addEventListener("click", () => {
      const opening = forgotPanel.style.display === "none";
      forgotPanel.style.display = opening ? "grid" : "none";
      forgotPasswordButton.setAttribute("aria-expanded", String(opening));
      passcodeStatus.textContent = "";
      if (!opening) clearRecoverySecrets({ cancelRequest: true });
      rearmHumanCheck("recovery");
      updateGoogleAuthPresentation();
      if (opening) {
        const recoveryStart = emailRecoveryFlow.hidden ? googleRecoveryButton : recoveryEmail;
        recoveryStart?.focus({ preventScroll: true });
      }
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
      signupPassword.type = viewSignupPassword.checked ? "text" : "password";
      signupPasswordConfirm.type = viewSignupPassword.checked ? "text" : "password";
      signupPasscode.type = viewSignupPassword.checked ? "text" : "password";
    });
    viewRecoveryPassword.addEventListener("change", () => {
      recoveryPasscode.type = viewRecoveryPassword.checked ? "text" : "password";
    });
    [
      loginEmail,
      loginPassword,
      signupFamily,
      signupParent,
      signupEmail,
      signupParentTwo,
      signupEmailTwo,
      signupPassword,
      signupPasswordConfirm,
      signupPasscode,
      recoveryEmail,
      recoveryCode,
      recoveryPasscode
    ].forEach((input) => input?.addEventListener("input", () => clearAuthFieldError(input)));
    [signupPasscode, signupPasswordConfirm].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (googleOnboardingActive) finishGoogleSetup();
        else createAccount();
      });
    });
    recoveryEmail.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || recoveryCodeRequested) return;
      event.preventDefault();
      sendRecoveryCode();
    });
    [recoveryCode, recoveryPasscode].forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        resetPasscodeWithCode();
      });
    });
    passcodeSetting.addEventListener("input", () => {
      passcodeSettingStatus.classList.remove("success");
      setTranslatedText(passcodeSettingStatus, "settings.passcode.unsaved", "Unsaved");
    });
    passcodeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        unlockParent();
      }
    });
    window.addEventListener("popstate", synchronizeModeRoute);
    window.addEventListener("hashchange", synchronizeModeRoute);
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
    document.querySelector("#sendParentChat").addEventListener("click", (event) => sendParentChat(event.currentTarget));
    document.querySelector("#clearParentChat").addEventListener("click", clearParentChat);
    document.querySelector("#parentChatMessage").addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        sendParentChat(document.querySelector("#sendParentChat"));
      }
    });
    document.querySelector("#submitProblemReport")?.addEventListener("click", (event) => submitProblemReport(event.currentTarget));
    document.querySelector("#clearProblemForm")?.addEventListener("click", clearProblemForm);
    document.querySelector("#startFocus").addEventListener("click", startFocusSession);
    document.querySelector("#resetFocus").addEventListener("click", resetFocusSession);
    document.querySelector("#completeFocus").addEventListener("click", (event) => completeFocusSession(event.currentTarget));
    document.querySelector("#closeApp").addEventListener("click", closeApp);
    appModal.addEventListener("click", (event) => {
      if (event.target === appModal) {
        closeApp();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && parentGate.classList.contains("open")) {
        event.preventDefault();
        setMode("child");
        return;
      }
      if (event.key === "Tab" && parentGate.classList.contains("open")) {
        const focusable = [...parentGate.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !parentGate.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !parentGate.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key === "Escape" && appModal.classList.contains("open")) {
        closeApp();
        return;
      }
      if (event.key !== "Tab" || !appModal.classList.contains("open")) return;
      const focusable = [...appModal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !appModal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !appModal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    });
    document.addEventListener("click", addButtonRipple);
    document.addEventListener("pointerdown", () => {
      settingsMenuOwnedFocusAtPointerDown = settingsMenu.classList.contains("open")
        && settingsMenu.contains(document.activeElement);
    });
    document.addEventListener("click", (event) => {
      const outsideTarget = event.target instanceof Element ? event.target : null;
      const focusableTarget = outsideTarget?.closest(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const restoreFocus = (settingsMenuOwnedFocusAtPointerDown || settingsMenu.contains(document.activeElement))
        && !focusableTarget;
      settingsMenuOwnedFocusAtPointerDown = false;
      closeSettingsMenu({ restoreFocus });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && settingsMenu.classList.contains("open")) {
        closeSettingsMenu({ restoreFocus: true });
      }
    });

    document.querySelector("#approveBtn").addEventListener("click", async (event) => {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      if (!syncPendingRequests(child)) {
        renderControls(child);
        showToast("There is no pending request to approve.");
        return;
      }
      const previousLimit = child.dailyLimit;
      const previousDecision = snapshotRequestDecisionState(child);
      await runCriticalSave({
        control: event.currentTarget,
        apply: () => approveCurrentRequest(child),
        rollback: (request) => restoreRequestDecisionState(child, previousDecision, request, "approve"),
        render,
        success: (request) => {
          if (request?.[3] === "appDownload") {
            return request[0] + " request marked reviewed for " + child.name + ". No app was installed or allowed by this dashboard.";
          }
          if (request?.[3] === "extraTime" && child.dailyLimit === previousLimit) {
            return "Extra Time request cleared; the daily allowance is already at 5 hours.";
          }
          return (request?.[0] || "Request") + " approved for " + child.name + ".";
        },
        failure: "Approval was not saved. The request is still waiting."
      });
    });

    document.querySelector("#blockBtn").addEventListener("click", async (event) => {
      const child = currentChild();
      if (!child) {
        showToast("Add a child profile first.");
        return;
      }
      if (!syncPendingRequests(child)) {
        renderControls(child);
        showToast("There is no pending request to block or decline.");
        return;
      }
      const previousDecision = snapshotRequestDecisionState(child);
      await runCriticalSave({
        control: event.currentTarget,
        apply: () => declineCurrentRequest(child),
        rollback: (request) => restoreRequestDecisionState(child, previousDecision, request, "decline"),
        render,
        success: (request) => {
          const blocksAccess = request?.[3] === "appAccess" || request?.[3] === "flyerAccess";
          return (request?.[0] || "Request") + (blocksAccess ? " blocked for " : " request declined for ") + child.name + ".";
        },
        failure: "The decision was not saved. The request is still waiting."
      });
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
      if (!child.bedtime) {
        showToast(child.name + "'s bedtime schedule is off.");
      } else if (isBedtimeWindowActive(child)) {
        showToast(child.name + "'s bedtime schedule is on and the saved window is active now.");
      } else {
        showToast(child.name + "'s bedtime schedule is on for " + state.schedule.bedtimeStart + " to " + state.schedule.bedtimeEnd + ".");
      }
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

    document.querySelector("#clearAlerts").addEventListener("click", async (event) => {
      const previousAlerts = Array.isArray(state.safetyAlerts) ? state.safetyAlerts.slice() : [];
      await runCriticalSave({
        control: event.currentTarget,
        apply: () => {
          state.safetyAlerts = [];
        },
        rollback: () => {
          restoreClearedFamilyActivity("safetyAlerts", previousAlerts);
        },
        render: renderSafetyAlerts,
        success: "Safety alerts cleared.",
        failure: "Safety alerts were not cleared. Please try again."
      });
    });

    document.querySelector("#clearMood").addEventListener("click", async (event) => {
      const previousMoods = Array.isArray(state.moodCheckins) ? state.moodCheckins.slice() : [];
      await runCriticalSave({
        control: event.currentTarget,
        apply: () => {
          state.moodCheckins = [];
        },
        rollback: () => {
          restoreClearedFamilyActivity("moodCheckins", previousMoods);
        },
        render: renderMoodCheckins,
        success: "Mood check-ins cleared.",
        failure: "Mood check-ins were not cleared. Please try again."
      });
    });

    document.querySelector("#clearProblemReports").addEventListener("click", async (event) => {
      const previousReports = Array.isArray(state.problemReports) ? state.problemReports.slice() : [];
      await runCriticalSave({
        control: event.currentTarget,
        apply: () => {
          state.problemReports = [];
        },
        rollback: () => {
          restoreClearedFamilyActivity("problemReports", previousReports);
        },
        render: renderProblemReports,
        success: "Problem reports cleared.",
        failure: "Problem reports were not cleared. Please try again."
      });
    });
    document.querySelector("#exportWeeklySummary").addEventListener("click", exportWeeklySummary);

    if (isDemoMode()) {
      state = normalizePrivateFamilyState(window.KiddoSproutDemo.read() || createDemoState());
      window.KiddoSproutDemo.write(state);
      parentUnlocked = true;
      viewMode = viewMode === "child" ? "child" : "parent";
    } else {
      try {
        legacyLocalFamilyState = JSON.parse(window.localStorage.getItem(FAMILY_STATE_KEY));
      } catch (error) {
        legacyLocalFamilyState = null;
      }
      state = normalizePrivateFamilyState(legacyLocalFamilyState || DEFAULT_STATE);
      const preferences = readSafeFamilyPreferences();
      state.themeMode = preferences.themeMode;
      state.languageMode = preferences.languageMode;
      persistSafeFamilyPreferences(state);
    }
    cleanSavedBranding(state);
    removeDemoChildren(state);
    applyDemoAvailability();
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      clearKiddoInstallPendingTimer();
      kiddoInstallPrompt = event;
      kiddoInstallInFlight = false;
      kiddoInstallPending = false;
      setKiddoInstallStatus("");
      updateKiddoInstallButtons();
    });
    window.addEventListener("appinstalled", () => {
      kiddoInstallPrompt = null;
      markKiddoSproutInstalled({ announce: true });
      showToast(translate("pwa.install.complete", {}, "KiddoSprout is installed."));
    });
    if ("serviceWorker" in navigator) {
      let hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadServiceWorkerController) {
          hadServiceWorkerController = true;
          return;
        }
        kiddoServiceWorkerControllerChanged = true;
        if (kiddoServiceWorkerReloadRequested && !kiddoServiceWorkerReloadHandled) {
          if (window.KiddoSproutFamilyCallActive === true) {
            kiddoServiceWorkerReloadRequested = false;
            showKiddoSproutUpdateNotice("reload");
            showToast(translate("call.updateBlocked", {}, "End the family call before reloading KiddoSprout."));
            return;
          }
          kiddoServiceWorkerReloadHandled = true;
          window.location.reload();
          return;
        }
        showKiddoSproutUpdateNotice("reload");
        hadServiceWorkerController = true;
      });
      pwaUpdateNowButton?.addEventListener("click", handleKiddoSproutUpdateAction);
      window.addEventListener("online", () => {
        void ensureKiddoSproutServiceWorker();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void ensureKiddoSproutServiceWorker();
        }
      });
      window.addEventListener("load", () => {
        void ensureKiddoSproutServiceWorker();
      });
    }
    state.parentAccountCreated ??= Boolean(state.parentEmail && state.parentName);
    state.parentPasscodeRecord ??= null;
    if (!state.parentAccountCreated) {
      state.parentEmail = "";
      state.parentAuthUserId = "";
      state.secondParentEmail = "";
    }
    state.themeMode ??= "auto";
    state.languageMode = window.KiddoSproutLanguage?.normalize?.(state.languageMode) || "en-GB";
    applyLanguageMode(state.languageMode, { rearm: false });
    applyThemeMode(state.themeMode);
    setGoogleAuthAvailability(false, GOOGLE_AUTH_CONFIGURED ? "Checking Google sign-in…" : "", { checked: false });
    function refreshAutomaticTheme() {
      if (state.themeMode === "auto") {
        applyThemeMode("auto");
      }
    }
    window.setInterval(refreshAutomaticTheme, 60000);
    window.addEventListener("pageshow", refreshAutomaticTheme);
    window.addEventListener("pageshow", refreshTimeSensitiveDashboard);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshAutomaticTheme();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshTimeSensitiveDashboard();
    });
    scheduleNextDashboardMinute();
    async function restoreValidatedKiddoSession() {
      if (isDemoMode()) return false;
      let session;
      try {
        session = await window.KiddoSproutSession?.validate?.();
      } catch (error) {
        loginSupabaseStatus.textContent = window.KiddoSproutSession?.isTemporaryError?.(error)
          ? "The account service is temporarily unavailable. Your saved sign-in is safe; reconnect and try again."
          : "Your saved sign-in could not be checked. Please try again.";
        viewMode = "login";
        return false;
      }
      if (isDemoMode()) return false;
      if (!session?.user?.email) {
        clearKiddoSession();
        return false;
      }
      try {
        acceptKiddoSession(session);
        await hydrateFamilyStateForSession(session);
      } catch (error) {
        setAuthStatus(loginStatus, friendlySupabaseError(error), "error");
        viewMode = "login";
        return false;
      }
      if (isGoogleAuthUser(session.user)) {
        const profile = session.user.user_metadata || {};
        const localFamilyReady = hasParentAccount()
          && String(state.parentAuthUserId || "") === String(session.user.id || "")
          && hasStoredParentPasscode();
        if (!localFamilyReady || profile.kiddosprout_onboarding_complete !== true) {
          beginGoogleOnboarding(session);
          return true;
        }
      }
      state.parentEmail ||= session.user.email;
      state.parentName ||= session.user.user_metadata?.parent_name || session.user.user_metadata?.name || "Parent";
      state.familyName ||= session.user.user_metadata?.family_name || "KiddoSprout Family";
      state.parentAccountCreated = true;
      if (viewMode === "login") viewMode = "parent";
      saveState();
      return true;
    }

    (async () => {
      if (isDemoMode()) {
        discardDemoKiddoAuthCallback();
        familyStateBootstrapping = false;
        setMode(viewMode, { unlocked: true, quiet: true, replaceHistory: true });
        return;
      }
      parentPasscodeMigrationPromise = migrateLegacyParentPasscode().catch((error) => {
        console.warn("KiddoSprout could not upgrade the saved parent PIN yet.", error);
        return false;
      });
      await parentPasscodeMigrationPromise;
      const callbackCompleted = await completeKiddoAuthCallback().catch(() => false);
      if (isDemoMode()) {
        familyStateBootstrapping = false;
        setMode(viewMode, { unlocked: true, quiet: true, replaceHistory: true });
        return;
      }
      if (!callbackCompleted) await restoreValidatedKiddoSession();
      familyStateBootstrapping = false;
      setMode(viewMode, { quiet: true, replaceHistory: true });
    })();
