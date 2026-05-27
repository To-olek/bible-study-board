(() => {
  const STORAGE_KEY = "bible-study-board-state-v3";
  const SESSION_KEY = "bible-study-board-session-v1";
  const LAST_USER_KEY = "bible-study-board-last-user-v1";
  const AUTH_SESSION_KEY = "bible-study-board-auth-session-v1";
  const USERS_KEY = "bible-study-board-users-v1";
  const FIREBASE_BOARD_COLLECTION = "userBoards";
  const FIREBASE_SDK_VERSION = "12.13.0";
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCI4tHyGeqt1-SZhoV7v7PlyN7eBk48luw",
    authDomain: "bible-study-board.firebaseapp.com",
    projectId: "bible-study-board",
    storageBucket: "bible-study-board.firebasestorage.app",
    messagingSenderId: "839849807005",
    appId: "1:839849807005:web:6aaa52cd984738186c1874",
  };
  const IMAGE_DB_NAME = "bible-study-board-images-v1";
  const IMAGE_STORE_NAME = "images";
  const WORLD_SIZE = 32000;
  const MIN_ZOOM = 0.12;
  const MAX_ZOOM = 4;

  const palette = {
    ink: "#202328",
    blue: "#2f64d6",
    green: "#2f8f65",
    gold: "#c28d2c",
    red: "#b84a4a",
    gray: "#69717d",
    paper: "#fffdf7",
  };
  const EMOJI_OPTIONS = [
    { emoji: "😀", name: "grinning" },
    { emoji: "🙂", name: "smile" },
    { emoji: "😌", name: "relieved" },
    { emoji: "😐", name: "neutral" },
    { emoji: "🤍", name: "white heart" },
    { emoji: "🙏", name: "prayer" },
    { emoji: "✨", name: "sparkles" },
    { emoji: "🔥", name: "fire" },
    { emoji: "🌿", name: "leaf" },
    { emoji: "🌈", name: "rainbow" },
    { emoji: "🌊", name: "water" },
    { emoji: "☁️", name: "cloud" },
    { emoji: "🕊️", name: "dove" },
    { emoji: "👑", name: "crown" },
    { emoji: "🪔", name: "lamp" },
    { emoji: "⭐", name: "star" },
    { emoji: "📖", name: "book" },
    { emoji: "✍️", name: "writing hand" },
    { emoji: "🧭", name: "compass" },
    { emoji: "🏛️", name: "temple" },
    { emoji: "⛰️", name: "mountain" },
    { emoji: "🌳", name: "tree" },
    { emoji: "🍞", name: "bread" },
    { emoji: "🍇", name: "grapes" },
    { emoji: "🐑", name: "sheep" },
    { emoji: "🦁", name: "lion" },
    { emoji: "🕯️", name: "candle" },
    { emoji: "🪶", name: "feather" },
    { emoji: "⚓", name: "anchor" },
    { emoji: "🪄", name: "wand" },
  ];
  const LINK_ARROW_LENGTH = 26;
  const LINK_ARROW_HALF = 9;

  const els = {};
  let state;
  let currentBoardId = "home";
  let selectedNodes = new Set();
  let selectedLinkId = null;
  let tool = "select";
  let viewport = { x: 0, y: 0, zoom: 1 };
  let dragMoved = false;
  let spaceDown = false;
  let pendingConnection = null;
  let suppressNextHandleClick = false;
  let bibleRenderToken = 0;
  let highlightedVerse = null;
  let selectedVerseKeys = new Set();
  let savedInspectorRange = null;
  let savedInspectorNodeId = null;
  let savedInspectorEditorId = null;
  let savedInspectorFormat = null;
  const loadedPackPromises = new Map();
  let imageDbPromise = null;
  let pendingLinkRefreshFrame = 0;
  let historyPast = [];
  let historyFuture = [];
  let lastHistorySnapshot = "";
  let restoringHistory = false;
  let currentUser = "";
  let currentUserUid = "";
  let firebaseReady = false;
  let authSession = null;
  let remoteSaveTimer = 0;
  let authBootPromise = null;
  let remoteSavePromise = Promise.resolve();
  let applyingRemoteState = false;
  let imageBootPromise = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cache();
    window.BIBLE_PACKS ||= {};
    state = createSeedState();
    fillFontSizeOptions();
    bind();
    if (window.lucide?.createIcons) window.lucide.createIcons();
    fillLanguages();
    const lastUser = localStorage.getItem(LAST_USER_KEY);
    if (lastUser && els.loginName) els.loginName.value = lastUser;
    if (els.loginPassword && !els.loginPassword.value) els.loginPassword.value = "Login";
    if (setupFirebase()) {
      void bootstrapFirebaseAuth();
      return;
    }
    currentUser = sessionStorage.getItem(SESSION_KEY) || "";
    ensureDemoAuthSeed();
    state = loadState();
    initHistory();
    if (currentUser) showApp();
    else showLogin();
  }

  function cache() {
    [
      "loginView", "appView", "loginForm", "loginName", "loginPassword", "loginError", "registerButton",
      "breadcrumb", "boardTitle", "backButton", "homeButton", "logoutButton", "helpButton", "shortcutHelp", "boardFrame", "world", "frameLayer", "linkLayer", "nodeLayer", "linkOverlay",
      "marquee", "modeHint", "handTool", "selectTool", "cardTool", "textTool",
      "frameTool", "emojiTool", "emojiPicker", "emojiSearch", "emojiGrid",
      "folderTool", "imageTool", "bibleToggle", "zoomOutButton", "zoomLabel",
      "zoomInButton", "fitButton", "biblePanel", "closeBibleButton", "languageSelect",
      "translationSelect", "bookSelect", "chapterSelect", "bibleSearch", "bibleStatus",
      "bibleFontSize", "bibleFontSizeValue",
      "chapterActions", "passageList", "inspector", "inspectorTitle", "singleInspector", "multiInspector",
      "multiCount", "nodeTitleInput", "nodeTextInput", "boldButton", "italicButton",
      "underlineButton", "fontSizeInput", "fillInput", "textColorInput", "lineColorInput",
      "nodeTextField", "mediaRow", "uploadImageButton", "removeImageButton", "openFolderButton", "openBibleHereButton",
      "multiFillInput", "multiLineInput", "deleteButton", "imageFileInput", "importFileInput",
      "linkInspector", "linkLabelInput", "linkColorInput",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bind() {
    els.loginForm.addEventListener("submit", login);
    els.registerButton?.addEventListener("click", registerAccount);
    els.logoutButton.addEventListener("click", () => {
      clearAuthSession();
      showLogin();
    });

    els.backButton.addEventListener("click", goBack);
    els.homeButton.addEventListener("click", () => openBoard("home"));
    els.helpButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleShortcutHelp();
    });
    els.importFileInput.addEventListener("change", importState);

    [
      ["hand", els.handTool],
      ["select", els.selectTool],
      ["card", els.cardTool],
      ["text", els.textTool],
      ["frame", els.frameTool],
      ["folder", els.folderTool],
    ].forEach(([name, button]) => button.addEventListener("click", () => setTool(name)));

    els.emojiTool.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleEmojiPicker();
    });

    els.imageTool.addEventListener("click", () => {
      setTool("select");
      openImagePicker();
    });
    els.bibleToggle.addEventListener("click", () => {
      setBiblePanel(els.biblePanel.hidden);
    });
    els.closeBibleButton.addEventListener("click", () => {
      setBiblePanel(false);
    });

    els.zoomOutButton.addEventListener("click", () => zoomFromCenter(viewport.zoom / 1.18));
    els.zoomInButton.addEventListener("click", () => zoomFromCenter(viewport.zoom * 1.18));
    els.fitButton.addEventListener("click", fitBoard);

    els.boardFrame.addEventListener("pointerdown", onBoardPointerDown);
    els.boardFrame.addEventListener("wheel", onWheel, { passive: false });
    els.boardFrame.addEventListener("contextmenu", (event) => event.preventDefault());
    els.boardFrame.addEventListener("dragover", (event) => event.preventDefault());
    els.boardFrame.addEventListener("drop", dropPassage);

    els.languageSelect.addEventListener("change", onLanguageChange);
    els.translationSelect.addEventListener("change", onTranslationChange);
    els.bookSelect.addEventListener("change", onBookChange);
    els.chapterSelect.addEventListener("change", onChapterChange);
    els.bibleSearch.addEventListener("input", () => renderBible());
    els.bibleFontSize.addEventListener("input", () => {
      state.settings.bibleFontSize = clamp(Number(els.bibleFontSize.value) || 22, 10, 36);
      saveState();
      applyBibleTextSize();
    });

    els.nodeTitleInput.dataset.placeholder = "Untitled";
    els.nodeTitleInput.addEventListener("input", () => syncInspectorEditorRichText(els.nodeTitleInput));
    els.nodeTitleInput.addEventListener("blur", () => syncInspectorEditorRichText(els.nodeTitleInput));
    els.nodeTitleInput.addEventListener("paste", pastePlainText);
    els.nodeTitleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
    els.nodeTextInput.dataset.placeholder = "Add notes, context, or a passage.";
    els.nodeTextInput.addEventListener("input", () => syncInspectorEditorRichText(els.nodeTextInput));
    els.nodeTextInput.addEventListener("blur", () => syncInspectorEditorRichText(els.nodeTextInput));
    els.nodeTextInput.addEventListener("paste", pastePlainText);
    els.fontSizeInput.addEventListener("change", () => handleFontSizeInput(Number(els.fontSizeInput.value), true));
    els.fillInput.addEventListener("input", () => updateSingleStyle("fill", els.fillInput.value));
    els.textColorInput.addEventListener("input", () => {
      if (!applyInlineTextCommand("foreColor", els.textColorInput.value)) updateSingleStyle("textColor", els.textColorInput.value);
    });
    els.lineColorInput.addEventListener("input", () => updateSingleStyle("lineColor", els.lineColorInput.value));
    [els.boldButton, els.italicButton, els.underlineButton].forEach((button) => {
      button.addEventListener("mousedown", (event) => event.preventDefault());
    });
    els.boldButton.addEventListener("click", () => {
      if (!applyInlineTextCommand("bold")) toggleSingleStyle("bold");
    });
    els.italicButton.addEventListener("click", () => {
      if (!applyInlineTextCommand("italic")) toggleSingleStyle("italic");
    });
    els.underlineButton.addEventListener("click", () => {
      if (!applyInlineTextCommand("underline")) toggleSingleStyle("underline");
    });
    els.uploadImageButton.addEventListener("click", openImagePicker);
    els.removeImageButton.addEventListener("click", removeSelectedImage);
    els.imageFileInput.addEventListener("change", uploadImage);
    els.openFolderButton.addEventListener("click", openSelectedFolder);
    els.openBibleHereButton.addEventListener("click", openSelectedVerseInBible);
    els.multiFillInput.addEventListener("input", () => updateManyStyles("fill", els.multiFillInput.value));
    els.multiLineInput.addEventListener("input", () => updateManyStyles("lineColor", els.multiLineInput.value));
    els.deleteButton.addEventListener("click", deleteSelected);
    els.linkLabelInput.addEventListener("input", updateSelectedLink);
    els.linkColorInput.addEventListener("input", updateSelectedLink);
    setupColorSwatches();
    buildEmojiPicker();
    document.addEventListener("selectionchange", rememberInspectorSelection);
    document.addEventListener("click", closeEmojiPicker);
    document.addEventListener("click", closeShortcutHelp);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", () => {
      applyViewport();
      renderInspector();
    });
  }

  function setupColorSwatches() {
    const paletteColors = ["#ffffff", "#fffdf7", "#fef3c7", "#fee2e2", "#dbeafe", "#dcfce7", "#e9d5ff", "#202328", "#69717d", "#2f64d6", "#2f8f65", "#c28d2c", "#b84a4a"];
    document.querySelectorAll(".color-swatches").forEach((holder) => {
      const target = document.getElementById(holder.dataset.target);
      if (!target) return;
      if (holder._paletteElement) holder._paletteElement.remove();
      holder.innerHTML = "";
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "color-trigger";
      trigger.setAttribute("aria-label", "Choose color");
      const chip = document.createElement("span");
      chip.className = "color-chip";
      trigger.appendChild(chip);
      holder.appendChild(trigger);

      const palette = document.createElement("div");
      palette.className = "color-palette";
      palette.addEventListener("click", (event) => event.stopPropagation());
      paletteColors.forEach((color) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "swatch";
        button.style.background = color;
        button.dataset.color = color.toLowerCase();
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          target.value = color;
          target.dispatchEvent(new Event("input", { bubbles: true }));
          closeColorSwatch(holder);
        });
        palette.appendChild(button);
      });
      document.body.appendChild(palette);
      holder._paletteElement = palette;
      syncColorSwatchHolder(holder, target.value);
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = !holder.classList.contains("open");
        closeAllColorSwatches();
        if (!willOpen) return;
        holder.classList.add("open");
        palette.classList.add("open");
        positionColorPalette(holder);
      });
      target.addEventListener("input", () => syncColorSwatchHolder(holder, target.value));
    });
    document.addEventListener("click", closeAllColorSwatches);
    window.addEventListener("resize", () => {
      document.querySelectorAll(".color-swatches.open").forEach((holder) => positionColorPalette(holder));
    });
    document.addEventListener("scroll", () => {
      document.querySelectorAll(".color-swatches.open").forEach((holder) => positionColorPalette(holder));
    }, true);
  }

  function closeColorSwatch(holder) {
    holder?.classList.remove("open");
    holder?._paletteElement?.classList.remove("open");
  }

  function closeAllColorSwatches() {
    document.querySelectorAll(".color-swatches.open").forEach((holder) => closeColorSwatch(holder));
  }

  function positionColorPalette(holder) {
    const palette = holder._paletteElement;
    if (!palette) return;
    const holderRect = holder.getBoundingClientRect();
    const paletteWidth = palette.offsetWidth || 252;
    const paletteHeight = palette.offsetHeight || 160;
    const viewportPadding = 12;
    const preferLeft = holderRect.left + paletteWidth > window.innerWidth - viewportPadding;
    let left = preferLeft ? holderRect.right - paletteWidth : holderRect.left;
    left = clamp(left, viewportPadding, Math.max(viewportPadding, window.innerWidth - paletteWidth - viewportPadding));
    const openUpFits = holderRect.top - paletteHeight - 8 >= viewportPadding;
    let top = openUpFits ? holderRect.top - paletteHeight - 8 : holderRect.bottom + 8;
    top = clamp(top, viewportPadding, Math.max(viewportPadding, window.innerHeight - paletteHeight - viewportPadding));
    palette.style.left = `${left}px`;
    palette.style.top = `${top}px`;
  }

  function syncColorSwatchHolder(holder, value) {
    const normalized = String(value || "").toLowerCase();
    const chip = holder.querySelector(".color-chip");
    if (chip) chip.style.background = normalized || "#ffffff";
    const palette = holder._paletteElement;
    palette?.querySelectorAll(".swatch").forEach((button) => {
      button.classList.toggle("active", button.dataset.color === normalized);
    });
  }

  function syncColorSwatchesFor(targetIds) {
    targetIds.forEach((targetId) => {
      const target = document.getElementById(targetId);
      const holder = document.querySelector(`.color-swatches[data-target="${targetId}"]`);
      if (target && holder) syncColorSwatchHolder(holder, target.value);
    });
  }

  function buildEmojiPicker() {
    if (!els.emojiGrid || els.emojiGrid.childElementCount) return;
    if (els.emojiPicker) els.emojiPicker.addEventListener("click", (event) => event.stopPropagation());
    if (els.emojiSearch) els.emojiSearch.addEventListener("input", renderEmojiPickerChoices);
    renderEmojiPickerChoices();
  }

  function renderEmojiPickerChoices() {
    if (!els.emojiGrid) return;
    const query = normalizeSearch(els.emojiSearch?.value || "");
    const choices = query
      ? EMOJI_OPTIONS.filter((item) => normalizeSearch(`${item.name} ${item.emoji}`).includes(query))
      : EMOJI_OPTIONS;
    els.emojiGrid.innerHTML = "";
    choices.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "emoji-choice";
      button.textContent = item.emoji;
      button.title = item.name;
      button.addEventListener("click", () => {
        createEmojiAt(screenCenter(), item.emoji);
        closeEmojiPicker();
      });
      els.emojiGrid.appendChild(button);
    });
  }

  function toggleEmojiPicker() {
    if (!els.emojiPicker) return;
    const willOpen = els.emojiPicker.hidden;
    closeEmojiPicker();
    if (!willOpen) return;
    els.emojiPicker.hidden = false;
    renderEmojiPickerChoices();
    els.emojiSearch?.focus({ preventScroll: true });
  }

  function closeEmojiPicker() {
    if (!els.emojiPicker) return;
    els.emojiPicker.hidden = true;
    if (els.emojiSearch) els.emojiSearch.value = "";
  }

  function toggleShortcutHelp(force) {
    if (!els.shortcutHelp) return;
    const shouldOpen = typeof force === "boolean" ? force : els.shortcutHelp.hidden;
    els.shortcutHelp.hidden = !shouldOpen;
  }

  function closeShortcutHelp(event) {
    if (!els.shortcutHelp || els.shortcutHelp.hidden) return;
    if (event?.target?.closest?.("#shortcutHelp, #helpButton")) return;
    els.shortcutHelp.hidden = true;
  }

  function isStickyType(value) {
    const type = typeof value === "string" ? value : value?.type;
    return type === "text" || type === "sticky";
  }

  function isFrameType(value) {
    const type = typeof value === "string" ? value : value?.type;
    return type === "frame";
  }

  function isEmojiType(value) {
    const type = typeof value === "string" ? value : value?.type;
    return type === "emoji";
  }

  function nodeTypeLabel(node) {
    if (isFrameType(node)) return "Frame";
    if (isEmojiType(node)) return "Emoji";
    if (isStickyType(node)) return "Sticky";
    if (node.type === "folder") return "Folder";
    if (node.type === "verse") return "Verse";
    return "Block";
  }

  function defaultNodeWidth(type) {
    if (isStickyType(type)) return 150;
    if (isFrameType(type)) return 440;
    if (isEmojiType(type)) return 56;
    return 280;
  }

  function defaultNodeHeight(type) {
    if (isStickyType(type)) return 96;
    if (isFrameType(type)) return 280;
    if (isEmojiType(type)) return 56;
    return 130;
  }

  function normalizeColorValue(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    if (/^#[0-9a-f]{3}$/i.test(raw)) return `#${raw.slice(1).split("").map((char) => char + char).join("")}`;
    const rgbMatch = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgbMatch) return raw;
    return `#${rgbMatch.slice(1, 4).map((part) => clamp(Number(part) || 0, 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }

  function colorWithAlpha(value, alpha = 1) {
    const normalized = normalizeColorValue(value);
    const hexMatch = String(normalized || "").match(/^#([0-9a-f]{6})$/i);
    if (!hexMatch) return value;
    const hex = hexMatch[1];
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
  }


  function setInlineStyleButtonState(button, active) {
    if (!button) return;
    button.classList.toggle("active", Boolean(active));
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function liveInspectorSelection() {
    const node = selectedNode();
    if (!node || !els.nodeTextInput) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const anchor = selection.anchorNode;
    if (!(anchor instanceof Node)) return null;
    const root = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
    const editor = root?.closest?.("#nodeTitleInput.rich-editor, #nodeTextInput.rich-editor");
    if (!editor || editor.dataset.nodeId !== node.id) return null;
    return { node, editor, selection, range: selection.getRangeAt(0) };
  }

  function readInspectorTextFormat(node, range) {
    const fallback = {
      fontSize: clamp(Number(node?.style?.fontSize) || 14, 10, 48),
      bold: Boolean(node?.style?.bold),
      italic: Boolean(node?.style?.italic),
      underline: Boolean(node?.style?.underline),
      textColor: normalizeColorValue(node?.style?.textColor || palette.ink) || palette.ink,
    };
    if (!range) return fallback;
    let probe = range.startContainer;
    if (!(probe instanceof Node)) return fallback;
    probe = probe.nodeType === Node.TEXT_NODE ? probe.parentElement : probe;
    if (!(probe instanceof Element)) return fallback;
    const target = probe.closest("#nodeTitleInput.rich-editor, #nodeTextInput.rich-editor, span, strong, em, u, b, i") || probe;
    if (!(target instanceof Element)) return fallback;
    const computed = window.getComputedStyle(target);
    const weightRaw = String(computed.fontWeight || "");
    const weightNumber = Number.parseInt(weightRaw, 10);
    return {
      fontSize: clamp(Math.round(parseFloat(computed.fontSize) || fallback.fontSize), 10, 48),
      bold: Number.isFinite(weightNumber) ? weightNumber >= 600 : /bold/i.test(weightRaw),
      italic: /italic|oblique/i.test(String(computed.fontStyle || "")),
      underline: String(computed.textDecorationLine || computed.textDecoration || "").includes("underline"),
      textColor: normalizeColorValue(computed.color) || fallback.textColor,
    };
  }

  function activeInspectorTextFormat(node) {
    const live = liveInspectorSelection();
    if (live) {
      const format = readInspectorTextFormat(node, live.range);
      savedInspectorFormat = format;
      if (!live.range.collapsed) {
        savedInspectorRange = live.range.cloneRange();
        savedInspectorNodeId = node.id;
        savedInspectorEditorId = live.editor.id || "nodeTextInput";
      }
      return format;
    }
    if (savedInspectorNodeId === node.id && savedInspectorFormat) return savedInspectorFormat;
    return readInspectorTextFormat(node, null);
  }

  function syncInspectorTextControls(node) {
    if (!node) return;
    const format = activeInspectorTextFormat(node);
    els.fontSizeInput.value = format.fontSize;
    els.fillInput.value = node.style.fill || palette.paper;
    els.textColorInput.value = format.textColor || palette.ink;
    els.lineColorInput.value = node.style.lineColor || palette.blue;
    setInlineStyleButtonState(els.boldButton, format.bold);
    setInlineStyleButtonState(els.italicButton, format.italic);
    setInlineStyleButtonState(els.underlineButton, format.underline);
    syncColorSwatchesFor(["fillInput", "textColorInput", "lineColorInput"]);
  }

  function normalizeUsername(value) {
    return String(value || "").trim().toLowerCase();
  }

  function sanitizeLoginSlug(value) {
    return normalizeUsername(value)
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  function usernameToEmail(username) {
    const slug = sanitizeLoginSlug(username);
    return `${slug || "user"}@bible-study-board.local`;
  }

  function normalizeAuthPassword(password) {
    const value = String(password || "");
    return value.length >= 6 ? value : value.padEnd(6, "!");
  }

  function setupFirebase() {
    firebaseReady = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
    return firebaseReady;
  }

  function bootstrapFirebaseAuth() {
    if (!firebaseReady) return Promise.resolve();
    if (authBootPromise) return authBootPromise;
    authBootPromise = (async () => {
      clearTimeout(remoteSaveTimer);
      const restored = restoreAuthSession();
      if (!restored) {
        state = createSeedState();
        initHistory();
        showLogin();
        return;
      }
      try {
        migrateLocalCacheToUid();
        const remoteState = await loadRemoteStateForCurrentUser();
        if (remoteState) state = remoteState;
        else {
          state = loadState();
          await persistRemoteState(true);
        }
        localStorage.setItem(storageKeyForUser(), JSON.stringify(compactStateForStorage(state)));
        initHistory();
        showApp();
      } catch (error) {
        console.warn("Could not restore the signed-in Firebase session.", error);
        clearAuthSession();
        state = createSeedState();
        initHistory();
        showLogin();
      }
    });
    return authBootPromise;
  }

  function deriveUsernameFromUser(user) {
    if (!user) return "";
    if (user.displayName) return user.displayName;
    const email = String(user.email || "");
    if (email.endsWith("@bible-study-board.local")) return email.replace(/@bible-study-board\.local$/i, "");
    return email;
  }

  function restoreAuthSession() {
    if (!firebaseReady) return null;
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.idToken || !parsed?.uid) return null;
      authSession = parsed;
      currentUserUid = parsed.uid;
      currentUser = parsed.username || parsed.displayName || parsed.email?.replace(/@bible-study-board\.local$/i, "") || "";
      if (currentUser) localStorage.setItem(LAST_USER_KEY, currentUser);
      return parsed;
    } catch {
      return null;
    }
  }

  function persistAuthSession(session) {
    authSession = {
      ...session,
      username: session.username || deriveUsernameFromUser(session),
      expiresAt: Number(session.expiresAt || 0),
    };
    currentUserUid = authSession.uid || "";
    currentUser = authSession.username || "";
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSession));
    if (currentUser) localStorage.setItem(LAST_USER_KEY, currentUser);
  }

  function clearAuthSession() {
    clearTimeout(remoteSaveTimer);
    authSession = null;
    currentUserUid = "";
    currentUser = "";
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function firebaseAuthEndpoint(method) {
    return `https://identitytoolkit.googleapis.com/v1/${method}?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`;
  }

  function firebaseTokenRefreshEndpoint() {
    return `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`;
  }

  function firestoreDocumentEndpoint(userId) {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_CONFIG.projectId)}/databases/(default)/documents/${FIREBASE_BOARD_COLLECTION}/${encodeURIComponent(userId)}`;
  }

  async function firebaseAuthRequest(method, payload, contentType = "application/json") {
    const response = await fetch(firebaseAuthEndpoint(method), {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: contentType === "application/json" ? JSON.stringify(payload) : payload,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = mapFirebaseRestError(data?.error?.message);
      throw { code, rawCode: data?.error?.message || "", data };
    }
    return data;
  }

  function mapFirebaseRestError(message) {
    const code = String(message || "").toUpperCase();
    if (code.includes("EMAIL_EXISTS")) return "auth/email-already-in-use";
    if (code.includes("WEAK_PASSWORD")) return "auth/weak-password";
    if (code.includes("INVALID_PASSWORD") || code.includes("EMAIL_NOT_FOUND") || code.includes("INVALID_LOGIN_CREDENTIALS") || code.includes("INVALID_EMAIL")) return "auth/invalid-credential";
    if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) return "auth/too-many-requests";
    if (code.includes("TOKEN_EXPIRED") || code.includes("INVALID_ID_TOKEN") || code.includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN")) return "auth/session-expired";
    return code ? `auth/${code.toLowerCase()}` : "auth/unknown";
  }

  async function signInWithFirebaseRest(username, password) {
    const email = usernameToEmail(username);
    const data = await firebaseAuthRequest("accounts:signInWithPassword", {
      email,
      password: normalizeAuthPassword(password),
      returnSecureToken: true,
    });
    persistAuthSession({
      uid: data.localId,
      email: data.email,
      username,
      displayName: data.displayName || username,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000,
    });
    return data;
  }

  async function registerWithFirebaseRest(username, password) {
    const email = usernameToEmail(username);
    const data = await firebaseAuthRequest("accounts:signUp", {
      email,
      password: normalizeAuthPassword(password),
      returnSecureToken: true,
    });
    let displayName = username;
    try {
      const profile = await firebaseAuthRequest("accounts:update", {
        idToken: data.idToken,
        displayName: username,
        returnSecureToken: true,
      });
      displayName = profile.displayName || username;
      data.idToken = profile.idToken || data.idToken;
      data.refreshToken = profile.refreshToken || data.refreshToken;
      data.expiresIn = profile.expiresIn || data.expiresIn;
    } catch (error) {
      console.warn("Could not update Firebase profile display name.", error);
    }
    persistAuthSession({
      uid: data.localId,
      email: data.email,
      username,
      displayName,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000,
    });
    return data;
  }

  async function ensureValidIdToken() {
    if (!authSession?.idToken) return "";
    if (authSession.expiresAt && authSession.expiresAt - Date.now() > 60_000) return authSession.idToken;
    if (!authSession.refreshToken) {
      clearAuthSession();
      throw { code: "auth/session-expired" };
    }
    const payload = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: authSession.refreshToken,
    });
    const response = await fetch(firebaseTokenRefreshEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      clearAuthSession();
      throw { code: mapFirebaseRestError(data?.error?.message || data?.error || "TOKEN_EXPIRED") };
    }
    persistAuthSession({
      uid: data.user_id || authSession.uid,
      email: authSession.email || `${sanitizeLoginSlug(authSession.username || currentUser) || "user"}@bible-study-board.local`,
      username: authSession.username || currentUser || "Login",
      displayName: authSession.displayName || currentUser || "Login",
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    });
    return authSession.idToken;
  }

  async function authorizedFirestoreRequest(url, options = {}) {
    const token = await ensureValidIdToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 401 || response.status === 403) {
      clearAuthSession();
      throw { code: "auth/session-expired", response };
    }
    return response;
  }

  function firestoreFieldsFromBoardState(source) {
    return {
      uid: { stringValue: currentUserUid },
      username: { stringValue: currentUser || "" },
      updatedAt: { timestampValue: new Date().toISOString() },
      stateJson: { stringValue: JSON.stringify(fullStateForRemoteStorage(source)) },
    };
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function ensureDemoAuthSeed() {
    const users = loadUsers();
    if (!users.login) {
      users.login = {
        username: "Login",
        password: "Login",
        createdAt: new Date().toISOString(),
      };
      saveUsers(users);
    }
  }

  function storageKeyForUser(username = currentUser) {
    if (currentUserUid) return `${STORAGE_KEY}:uid:${currentUserUid}`;
    const normalized = normalizeUsername(username);
    return normalized ? `${STORAGE_KEY}:${normalized}` : STORAGE_KEY;
  }

  function legacyStorageKeyForUser(username = currentUser) {
    const normalized = normalizeUsername(username);
    return normalized ? `${STORAGE_KEY}:${normalized}` : STORAGE_KEY;
  }

  function migrateLocalCacheToUid() {
    if (!currentUserUid || !currentUser) return;
    const nextKey = storageKeyForUser(currentUser);
    const legacyKey = legacyStorageKeyForUser(currentUser);
    if (nextKey === legacyKey) return;
    const existing = localStorage.getItem(nextKey);
    const legacy = localStorage.getItem(legacyKey);
    if (!existing && legacy) localStorage.setItem(nextKey, legacy);
  }

  async function loadRemoteStateForCurrentUser() {
    if (!firebaseReady || !currentUserUid) return null;
    try {
      const response = await authorizedFirestoreRequest(firestoreDocumentEndpoint(currentUserUid), { method: "GET" });
      if (response.status === 404) return null;
      const doc = await response.json();
      const rawState = doc?.fields?.stateJson?.stringValue;
      if (!rawState) return null;
      applyingRemoteState = true;
      return normalize(JSON.parse(rawState));
    } catch (error) {
      console.warn("Could not load the remote board state.", error);
      return null;
    } finally {
      applyingRemoteState = false;
    }
  }

  function fullStateForRemoteStorage(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function queueRemoteSave() {
    if (!firebaseReady || !currentUserUid || applyingRemoteState) return;
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer = window.setTimeout(() => {
      void persistRemoteState();
    }, 900);
  }

  async function persistRemoteState(force = false) {
    if (!firebaseReady || !currentUserUid || !state) return false;
    if (!force && applyingRemoteState) return false;
    remoteSavePromise = remoteSavePromise
      .catch(() => null)
      .then(async () => {
        await authorizedFirestoreRequest(firestoreDocumentEndpoint(currentUserUid), {
          method: "PATCH",
          body: JSON.stringify({ fields: firestoreFieldsFromBoardState(state) }),
        });
      })
      .catch((error) => {
        console.warn("Could not save the remote board state.", error);
        return null;
      });
    await remoteSavePromise;
    return true;
  }

  function login(event) {
    event?.preventDefault?.();
    const username = els.loginName.value.trim();
    const password = els.loginPassword.value;
    if (firebaseReady) {
      if (!username || !password) {
        els.loginError.textContent = "Enter login and password.";
        return;
      }
      els.loginError.textContent = "";
      signInWithFirebaseRest(username, password)
        .then(async () => {
          migrateLocalCacheToUid();
          const remoteState = await loadRemoteStateForCurrentUser();
          if (remoteState) state = remoteState;
          else {
            state = loadState();
            await persistRemoteState(true);
          }
          localStorage.setItem(storageKeyForUser(), JSON.stringify(compactStateForStorage(state)));
          initHistory();
          showApp();
        })
        .catch((error) => {
          els.loginError.textContent = mapFirebaseAuthError(error, "Wrong login or password.");
        });
      return;
    }
    const normalized = normalizeUsername(username);
    const users = loadUsers();
    const account = users[normalized];
    if (!normalized || !password) {
      els.loginError.textContent = "Enter login and password.";
      return;
    }
    if (!account || account.password !== password) {
      els.loginError.textContent = "Wrong login or password.";
      return;
    }
    currentUser = account.username || username;
    sessionStorage.setItem(SESSION_KEY, currentUser);
    localStorage.setItem(LAST_USER_KEY, currentUser);
    els.loginError.textContent = "";
    state = loadState();
    initHistory();
    showApp();
  }

  function registerAccount() {
    const username = els.loginName.value.trim();
    const password = els.loginPassword.value;
    if (firebaseReady) {
      if (!username || !password) {
        els.loginError.textContent = "Enter login and password to register.";
        return;
      }
      els.loginError.textContent = "";
      registerWithFirebaseRest(username, password)
        .then(async () => {
          state = loadState();
          await persistRemoteState(true);
          localStorage.setItem(storageKeyForUser(), JSON.stringify(compactStateForStorage(state)));
          initHistory();
          showApp();
        })
        .catch((error) => {
          els.loginError.textContent = mapFirebaseAuthError(error, "Could not create this account.");
        });
      return;
    }
    const normalized = normalizeUsername(username);
    const users = loadUsers();
    if (!normalized || !password) {
      els.loginError.textContent = "Enter login and password to register.";
      return;
    }
    if (users[normalized]) {
      els.loginError.textContent = "This login already exists.";
      return;
    }
    users[normalized] = {
      username,
      password,
      createdAt: new Date().toISOString(),
    };
    saveUsers(users);
    currentUser = username;
    sessionStorage.setItem(SESSION_KEY, currentUser);
    localStorage.setItem(LAST_USER_KEY, currentUser);
    els.loginError.textContent = "";
    state = loadState();
    initHistory();
    showApp();
  }

  function showLogin() {
    els.loginView.hidden = false;
    els.appView.hidden = true;
    els.loginError.textContent = "";
  }

  function showApp() {
    els.loginView.hidden = true;
    els.appView.hidden = false;
    els.appView.classList.toggle("bible-open", !els.biblePanel.hidden);
    renderAll();
    void bootImageStorage();
    requestAnimationFrame(() => {
      if (!currentBoard().viewport) fitBoard();
      else applyViewport();
      scheduleLinkRefresh();
    });
  }

  function mapFirebaseAuthError(error, fallback) {
    const code = String(error?.code || "");
    if (code === "auth/email-already-in-use") return "This login already exists.";
    if (code === "auth/weak-password") return "Password is too short.";
    if (code === "auth/invalid-email" || code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-login-credentials") return "Wrong login or password.";
    if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
    return fallback;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(storageKeyForUser());
      return raw ? normalize(JSON.parse(raw)) : createSeedState();
    } catch {
      return createSeedState();
    }
  }

  function initHistory() {
    historyPast = [];
    historyFuture = [];
    lastHistorySnapshot = JSON.stringify(compactStateForStorage(state));
  }

  function normalize(next) {
    next.settings ||= {};
    next.settings.bibleFontSize = clamp(Number(next.settings.bibleFontSize) || 22, 10, 36);
    next.boards = Array.isArray(next.boards) ? next.boards : [];
    if (!next.boards.some((board) => board.id === "home")) next.boards.unshift(createHomeBoard());
    next.boards.forEach((board) => {
      board.id ||= id("board");
      board.name ||= "Untitled board";
      board.parentId ||= null;
      board.nodes = Array.isArray(board.nodes) ? board.nodes : [];
      board.links = Array.isArray(board.links) ? board.links : [];
      if (board.viewport) {
        board.viewport.x = finite(board.viewport.x, 0);
        board.viewport.y = finite(board.viewport.y, 0);
        board.viewport.zoom = clamp(finite(board.viewport.zoom, 1), MIN_ZOOM, MAX_ZOOM);
      }
      board.nodes.forEach(normalizeNode);
      ensureBoardZOrder(board);
      board.links.forEach((link) => {
        link.id ||= id("link");
        link.from ||= "";
        link.to ||= "";
        link.label ||= "";
        link.color ||= palette.blue;
      });
    });
    const firstPack = getManifest()[0];
    next.settings.biblePackId ||= firstPack?.id || "";
    next.settings.bibleLanguage ||= firstPack?.languageCode || firstPack?.language || "";
    next.settings.bookId ||= "GEN";
    next.settings.chapter ||= 1;
    return next;
  }

  function normalizeNode(node) {
    node.id ||= id("node");
    if (node.type === "text") node.type = "sticky";
    node.type ||= "card";
    node.title ||= isStickyType(node) || isEmojiType(node) ? "" : isFrameType(node) ? "Frame" : "Untitled";
    node.text ||= "";
    node.titleHtml ||= plainTextToHtml(node.title);
    node.textHtml ||= plainTextToHtml(node.text);
    node.image ||= "";
    node.imageAssetId ||= "";
    node.hostNodeId ||= "";
    node.hostDx = finite(node.hostDx, 0);
    node.hostDy = finite(node.hostDy, 0);
    node.ref ||= "";
    node.boardId ||= "";
    node.x = finite(node.x, 0);
    node.y = finite(node.y, 0);
    node.w = finite(node.w, defaultNodeWidth(node.type));
    node.h = finite(node.h, defaultNodeHeight(node.type));
    if (isStickyType(node) && (
      (node.w === 240 && node.h === 120)
      || (node.w === 180 && node.h === 180)
      || (node.w === 220 && node.h === 140)
      || (node.w === 220 && node.h === 220)
    )) {
      node.w = 150;
      node.h = 96;
    }
    node.style ||= {};
    node.style.fill ||= isStickyType(node)
      ? "#fff6bf"
      : isFrameType(node)
        ? "#f5f9ff"
        : node.type === "folder"
          ? "#fff6df"
          : isEmojiType(node)
            ? "transparent"
            : palette.paper;
    node.style.textColor ||= palette.ink;
    node.style.lineColor ||= isStickyType(node)
      ? "#d7c76c"
      : isFrameType(node)
        ? "#7ea5ff"
        : node.type === "folder"
          ? palette.gold
          : isEmojiType(node)
            ? "transparent"
            : palette.blue;
    node.style.fontSize = finite(node.style.fontSize, 14);
    node.z = finite(node.z, 0);
    if (node.type === "verse" && node.bible?.packId && node.ref) {
      node.ref = withTranslationAbbreviation(node.ref, node.bible.packId);
    }
  }

  function ensureBoardZOrder(board) {
    const sorted = [...board.nodes].sort((a, b) => finite(a.z, 0) - finite(b.z, 0));
    let frameCounter = 0;
    let contentCounter = 1000;
    sorted.forEach((node) => {
      if (isFrameType(node)) node.z = ++frameCounter;
      else node.z = ++contentCounter;
    });
    board.frameZCounter = frameCounter;
    board.zCounter = contentCounter;
  }

  function bringNodeToFront(nodeId, save = true) {
    const board = currentBoard();
    const node = board.nodes.find((item) => item.id === nodeId);
    if (!node) return;
    ensureBoardZOrder(board);
    if (isFrameType(node)) {
      board.frameZCounter = Math.max(finite(board.frameZCounter, 0), 0) + 1;
      node.z = board.frameZCounter;
    } else {
      board.zCounter = Math.max(finite(board.zCounter, 1000), 1000) + 1;
      node.z = board.zCounter;
    }
    const element = getNodeElement(nodeId);
    if (element) element.style.zIndex = String(node.z);
    if (save) saveState();
  }

  function getNodeElement(nodeId) {
    const selector = `[data-id="${cssEscape(nodeId)}"]`;
    return els.nodeLayer?.querySelector?.(selector) || els.frameLayer?.querySelector?.(selector) || null;
  }

  function allNodeElements() {
    return [
      ...(els.frameLayer ? Array.from(els.frameLayer.querySelectorAll(".jam-node")) : []),
      ...(els.nodeLayer ? Array.from(els.nodeLayer.querySelectorAll(".jam-node")) : []),
    ];
  }

  function saveState() {
    const board = currentBoard();
    if (board) board.viewport = { ...viewport };
    const snapshot = compactStateForStorage(state);
    const serialized = JSON.stringify(snapshot);
    if (!restoringHistory && serialized !== lastHistorySnapshot) {
      if (lastHistorySnapshot) historyPast.push(lastHistorySnapshot);
      if (historyPast.length > 120) historyPast.shift();
      historyFuture = [];
      lastHistorySnapshot = serialized;
    }
    try {
      localStorage.setItem(storageKeyForUser(), serialized);
      queueRemoteSave();
      return true;
    } catch (error) {
      if (!isQuotaExceededError(error)) throw error;
      try {
        localStorage.setItem(storageKeyForUser(), serialized);
      } catch (fallbackError) {
        console.warn("Could not persist the current board snapshot locally.", fallbackError);
      }
      queueRemoteSave();
      console.warn("Could not fully persist the current board snapshot locally.");
      return false;
    }
  }

  function compactStateForStorage(source) {
    const clone = JSON.parse(JSON.stringify(source));
    clone.boards?.forEach((board) => {
      board.nodes?.forEach((node) => {
        if (node.imageAssetId && typeof node.image === "string" && node.image.startsWith("data:")) node.image = "";
      });
    });
    return clone;
  }

  async function bootImageStorage() {
    if (imageBootPromise) return imageBootPromise;
    imageBootPromise = (async () => {
      await migrateEmbeddedImages();
      const changed = await hydrateStateImages();
      if (changed) renderAll();
    })().finally(() => {
      imageBootPromise = null;
    });
    return imageBootPromise;
  }

  function openImageDb() {
    if (imageDbPromise) return imageDbPromise;
    imageDbPromise = new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(IMAGE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) db.createObjectStore(IMAGE_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn("Could not open local image storage.", request.error);
        resolve(null);
      };
    });
    return imageDbPromise;
  }

  async function putImageAsset(assetId, value) {
    const db = await openImageDb();
    if (!db) return false;
    return new Promise((resolve) => {
      const transaction = db.transaction(IMAGE_STORE_NAME, "readwrite");
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.put(value, assetId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn("Could not store image locally.", request.error);
        resolve(false);
      };
    });
  }

  async function getImageAsset(assetId) {
    if (!assetId) return "";
    const db = await openImageDb();
    if (!db) return "";
    return new Promise((resolve) => {
      const transaction = db.transaction(IMAGE_STORE_NAME, "readonly");
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.get(assetId);
      request.onsuccess = () => resolve(String(request.result || ""));
      request.onerror = () => {
        console.warn("Could not read stored image.", request.error);
        resolve("");
      };
    });
  }

  async function deleteImageAsset(assetId) {
    if (!assetId) return;
    const db = await openImageDb();
    if (!db) return;
    await new Promise((resolve) => {
      const transaction = db.transaction(IMAGE_STORE_NAME, "readwrite");
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.delete(assetId);
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.warn("Could not delete stored image.", request.error);
        resolve();
      };
    });
  }

  async function migrateEmbeddedImages() {
    let changed = false;
    for (const board of state.boards) {
      for (const node of board.nodes) {
        if (typeof node.image !== "string" || !node.image.startsWith("data:")) continue;
        const assetId = node.imageAssetId || id("image");
        const stored = await putImageAsset(assetId, node.image);
        if (stored) node.imageAssetId = assetId;
        if (stored) changed = true;
      }
    }
    if (changed) saveState();
  }

  async function hydrateStateImages() {
    let changed = false;
    for (const board of state.boards) {
      for (const node of board.nodes) {
        if (node.image) continue;
        if (!node.imageAssetId) continue;
        const stored = await getImageAsset(node.imageAssetId);
        if (!stored) continue;
        node.image = stored;
        changed = true;
      }
    }
    return changed;
  }

  function isQuotaExceededError(error) {
    return Boolean(error && (
      error.name === "QuotaExceededError"
      || error.name === "NS_ERROR_DOM_QUOTA_REACHED"
      || error.code === 22
      || error.code === 1014
    ));
  }

  function openImagePicker() {
    if (!els.imageFileInput) return;
    els.imageFileInput.value = "";
    try {
      if (typeof els.imageFileInput.showPicker === "function") {
        els.imageFileInput.showPicker();
        return;
      }
    } catch {
      // Fall back to click below.
    }
    els.imageFileInput.click();
  }

  function renderAll() {
    renderBoard();
    renderInspector();
    if (!els.biblePanel.hidden) renderBible();
  }

  function currentBoard() {
    return state.boards.find((board) => board.id === currentBoardId) || state.boards[0];
  }

  function openBoard(boardId) {
    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return;
    currentBoard().viewport = { ...viewport };
    currentBoardId = board.id;
    selectedNodes = new Set();
    selectedLinkId = null;
    viewport = board.viewport || { x: 0, y: 0, zoom: 1 };
    renderAll();
    requestAnimationFrame(() => {
      if (!board.viewport) fitBoard();
      else applyViewport();
      scheduleLinkRefresh();
    });
  }

  function goBack() {
    const parentId = currentBoard().parentId;
    if (parentId) openBoard(parentId);
    else openBoard("home");
  }

  function renderBoard() {
    const board = currentBoard();
    syncAttachedEmojiPositions();
    els.boardTitle.textContent = board.name;
    els.breadcrumb.textContent = board.id === "home" ? "Home" : pathForBoard(board).join(" / ");
    els.backButton.disabled = board.id === "home";
    els.linkLayer.innerHTML = "";
    if (els.linkOverlay) els.linkOverlay.innerHTML = "";
    ensureLinkDefs();
    if (els.frameLayer) els.frameLayer.innerHTML = "";
    els.nodeLayer.innerHTML = "";
    board.links.forEach(renderLink);
    board.links.forEach(renderLinkLabel);
    board.nodes.forEach(renderNode);
    if (syncRenderedNodeHeights()) renderLinksOnly();
    applyViewport();
    scheduleLinkRefresh();
    updateToolUI();
    applyBibleTextSize();
  }

  function scheduleLinkRefresh() {
    if (pendingLinkRefreshFrame) cancelAnimationFrame(pendingLinkRefreshFrame);
    pendingLinkRefreshFrame = requestAnimationFrame(() => {
      pendingLinkRefreshFrame = 0;
      if (syncRenderedNodeHeights()) renderLinksOnly();
      else renderLinksOnly();
    });
  }

  function applyBibleTextSize() {
    const size = clamp(Number(state.settings.bibleFontSize) || 22, 10, 36);
    els.bibleFontSize.value = String(size);
    if (els.bibleFontSizeValue) els.bibleFontSizeValue.value = `${size}px`;
    document.documentElement.style.setProperty("--bible-font-size", `${size}px`);
  }

  function renderNode(node) {
    const stickyMode = isStickyType(node);
    const frameMode = isFrameType(node);
    const emojiMode = isEmojiType(node);
    const verseMode = node.type === "verse";
    const card = document.createElement("article");
    card.className = "jam-node";
    card.classList.toggle("sticky-node", stickyMode);
    card.classList.toggle("folder-node", node.type === "folder");
    card.classList.toggle("verse-node", verseMode);
    card.classList.toggle("frame-node", frameMode);
    card.classList.toggle("emoji-node", emojiMode);
    card.classList.toggle("connect-source", pendingConnection === node.id);
    card.classList.toggle("selected", selectedNodes.size === 1 && selectedNodes.has(node.id));
    card.classList.toggle("multi-selected", selectedNodes.size > 1 && selectedNodes.has(node.id));
    card.dataset.id = node.id;
    card.style.left = `${node.x}px`;
    card.style.top = `${node.y}px`;
    card.style.width = `${node.w}px`;
    card.style.minHeight = `${node.h}px`;
    if (emojiMode) card.style.height = `${node.h}px`;
    card.style.zIndex = String(node.z || 1);
    card.style.setProperty("--node-fill", frameMode ? colorWithAlpha(node.style.fill, 0.5) : node.style.fill);
    card.style.setProperty("--node-line", node.style.lineColor);
    card.style.setProperty("--node-text", node.style.textColor);

    const meta = document.createElement("div");
    meta.className = "node-meta";
    const label = nodeTypeLabel(node);
    meta.innerHTML = verseMode
      ? `<span>${label}</span>`
      : `<span>${label}</span><span>${escapeHtml(node.ref || "")}</span>`;

    const title = document.createElement("h3");
    title.className = "node-title";
    title.contentEditable = "false";
    title.spellcheck = true;
    title.tabIndex = 0;
    title.innerHTML = node.titleHtml || plainTextToHtml(node.title);
    applyTextStyle(title, node.style);

    const body = document.createElement("p");
    body.className = "node-body";
    body.contentEditable = "false";
    body.spellcheck = true;
    body.tabIndex = 0;
    body.innerHTML = node.textHtml || plainTextToHtml(node.text);
    applyTextStyle(body, node.style);
    if (emojiMode) {
      body.style.fontSize = "48px";
      body.style.width = "100%";
      body.style.minHeight = `${node.h}px`;
      body.style.height = `${node.h}px`;
    }

    if (!stickyMode && !frameMode && !emojiMode) card.append(meta);
    if (!stickyMode && !emojiMode && !verseMode) card.append(title);
    if (!frameMode && !emojiMode && node.image) {
      const image = document.createElement("img");
      image.className = "node-image";
      image.alt = node.title;
      image.draggable = false;
      image.addEventListener("pointerdown", (event) => event.preventDefault());
      image.addEventListener("dragstart", (event) => event.preventDefault());
      image.addEventListener("load", () => {
        if (syncNodeHeightFromElement(node, card)) saveState();
      });
      image.src = node.image;
      card.appendChild(image);
    }
    if (!frameMode) card.append(body);
    const connectHandle = document.createElement("button");
    connectHandle.className = "connect-handle";
    connectHandle.type = "button";
    connectHandle.title = "Drag to connect";
    connectHandle.textContent = "+";
    connectHandle.addEventListener("pointerdown", (event) => startConnection(event, node));
    if (!frameMode && !emojiMode) card.appendChild(connectHandle);

    if (node.ref) {
      const ref = document.createElement("button");
      ref.className = "node-ref";
      ref.type = "button";
      ref.textContent = node.ref;
      ref.addEventListener("pointerdown", (event) => event.stopPropagation());
      ref.addEventListener("click", (event) => {
        if (isHandPanningMode()) return;
        event.stopPropagation();
        selectOnly(node.id);
      });
      ref.addEventListener("dblclick", (event) => {
        if (isHandPanningMode()) return;
        event.preventDefault();
        event.stopPropagation();
        if (node.bible) openBibleLocation(node.bible);
      });
      card.appendChild(ref);
    }

    if (node.type === "folder") {
      const open = document.createElement("button");
      open.className = "open-chip";
      open.type = "button";
      open.textContent = "Open board";
      open.addEventListener("pointerdown", (event) => event.stopPropagation());
      open.addEventListener("click", (event) => {
        if (isHandPanningMode()) return;
        event.stopPropagation();
        openBoard(node.boardId);
      });
      card.appendChild(open);
    }

    if (frameMode) {
      title.classList.add("frame-title");
      if (frameMode) card.appendChild(title);
      ["n", "e", "s", "w", "ne", "nw", "se", "sw"].forEach((dir) => {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = `frame-resize-handle frame-resize-${dir}`;
        handle.dataset.dir = dir;
        handle.title = "Resize frame";
        handle.addEventListener("pointerdown", (event) => startFrameResize(event, node, dir));
        card.appendChild(handle);
      });
    }

    [title, body].forEach((editable) => {
      editable.addEventListener("pointerdown", (event) => {
        if (isHandPanningMode()) return;
        if (editable.contentEditable === "true") {
          event.stopPropagation();
          return;
        }
        event.preventDefault();
      });
      editable.addEventListener("dblclick", (event) => {
        if (isHandPanningMode()) return;
        event.preventDefault();
        event.stopPropagation();
        enableInlineEdit(node, editable);
      });
      editable.addEventListener("input", () => {
        storeEditableContent(node, editable);
        saveState();
        renderInspector();
      });
      editable.addEventListener("blur", () => disableInlineEdit(node, editable));
      editable.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          disableInlineEdit(node, editable);
          return;
        }
        if (editable === title && event.key === "Enter") {
          event.preventDefault();
          disableInlineEdit(node, editable);
        }
      });
      editable.addEventListener("paste", pastePlainText);
    });

    card.addEventListener("pointerdown", (event) => startNodeDrag(event, node));
    card.addEventListener("click", (event) => {
      if (isHandPanningMode()) return;
      event.stopPropagation();
      if (dragMoved) return;
      if (completePendingConnection(node.id)) return;
      updateSelectionUI();
    });
    card.addEventListener("dblclick", (event) => {
      if (isHandPanningMode()) return;
      event.stopPropagation();
      if (event.target.closest(".node-title, .node-body")) return;
      if (node.type === "folder") openBoard(node.boardId);
      else if (!frameMode) enableInlineEdit(node, body);
    });
    (frameMode ? els.frameLayer : els.nodeLayer).appendChild(card);
    if (!frameMode && !emojiMode && !stickyMode) syncNodeHeightFromElement(node, card, false);
  }

  function syncRenderedNodeHeights() {
    let changed = false;
    currentBoard().nodes.forEach((node) => {
      if (isFrameType(node) || isEmojiType(node) || isStickyType(node)) return;
      const element = els.nodeLayer.querySelector(`[data-id="${cssEscape(node.id)}"]`);
      if (element && syncNodeHeightFromElement(node, element, false)) changed = true;
    });
    return changed;
  }

  function baseNodeMinHeight(node) {
    if (isStickyType(node)) return 96;
    if (isFrameType(node)) return 280;
    if (isEmojiType(node)) return 96;
    return node.type === "verse" ? 150 : 130;
  }

  function syncNodeHeightFromElement(node, element, rerender = true) {
    const baseHeight = baseNodeMinHeight(node);
    element.style.minHeight = `${baseHeight}px`;
    const measuredHeight = Math.max(baseHeight, Math.ceil(element.getBoundingClientRect().height / Math.max(viewport.zoom || 1, 0.0001)));
    if (Math.abs(measuredHeight - node.h) < 1) {
      element.style.minHeight = `${node.h}px`;
      return false;
    }
    node.h = measuredHeight;
    element.style.minHeight = `${node.h}px`;
    if (rerender) renderLinksOnly();
    return true;
  }

  function renderLink(link) {
    const geometry = linkGeometry(link);
    if (!geometry) return;
    const selected = selectedLinkId === link.id;
    if (selected) {
      const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      glow.setAttribute("class", "link-path-glow");
      glow.setAttribute("d", geometry.path);
      els.linkLayer.appendChild(glow);
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.__linkId = link.id;
    path.setAttribute("class", `link-path ${selected ? "selected" : ""}`);
    path.setAttribute("d", geometry.path);
    path.setAttribute("stroke", link.color || palette.blue);
    path.addEventListener("pointerdown", (event) => {
      if (isHandPanningMode()) return;
      event.stopPropagation();
    });
    path.addEventListener("click", (event) => {
      if (isHandPanningMode()) return;
      event.stopPropagation();
      selectedNodes = new Set();
      selectedLinkId = link.id;
      updateSelectionUI();
    });
    els.linkLayer.appendChild(path);

    const overlayHost = els.linkLayer;

    const cap = document.createElementNS("http://www.w3.org/2000/svg", "path");
    cap.setAttribute("class", "link-cap");
    cap.setAttribute("d", geometry.overlayPath);
    cap.setAttribute("stroke", link.color || palette.blue);
    overlayHost.appendChild(cap);

    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrow.setAttribute("class", "link-arrow");
    arrow.setAttribute("d", geometry.arrowPath);
    arrow.setAttribute("fill", link.color || palette.blue);
    overlayHost.appendChild(arrow);

  }

  function renderLinkLabel(link) {
    if (!link.label) return;
    const geometry = linkGeometry(link);
    if (!geometry) return;
    const selected = selectedLinkId === link.id;
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("class", `link-label ${selected ? "selected" : ""}`);
    label.setAttribute("x", String(geometry.labelPoint.x));
    label.setAttribute("y", String(geometry.labelPoint.y));
    label.textContent = link.label;
    els.linkLayer.appendChild(label);
  }

  function linkGeometry(link) {
    const board = currentBoard();
    const from = board.nodes.find((node) => node.id === link.from);
    const to = board.nodes.find((node) => node.id === link.to);
    if (!from || !to) return null;
    const offset = pairedLinkOffset(link);
    const fromCenter = nodeCenter(from);
    const toCenter = nodeCenter(to);
    const normal = stablePairNormal(fromCenter, toCenter);
    const shiftedFromCenter = {
      x: fromCenter.x + normal.x * offset,
      y: fromCenter.y + normal.y * offset,
    };
    const shiftedToCenter = {
      x: toCenter.x + normal.x * offset,
      y: toCenter.y + normal.y * offset,
    };
    const start = nodeEdgePoint(from, shiftedToCenter, edgePaddingForNode(from), shiftedFromCenter);
    const end = nodeEdgePoint(to, shiftedFromCenter, edgePaddingForNode(to), shiftedToCenter);
    const arrowSide = normalizeArrowSide(end, to);
    const curve = curvedLinkGeometry(start, end, normal, offset, arrowSide);
    const arrow = buildArrowGeometry(curve.tip, curve.direction, curve.arrowLength, curve.arrowHalf, arrowSide);
    const labelPoint = cubicPoint(start, curve.controlA, curve.controlB, arrow.shaftPoint, 0.5);
    return {
      path: `M ${start.x} ${start.y} C ${curve.controlA.x} ${curve.controlA.y}, ${curve.controlB.x} ${curve.controlB.y}, ${arrow.shaftPoint.x} ${arrow.shaftPoint.y}`,
      overlayPath: cubicTailPath(start, curve.controlA, curve.controlB, arrow.shaftPoint, curve.overlayStartT),
      arrowPath: arrow.path,
      labelPoint: {
        x: labelPoint.x + normal.x * 10,
        y: labelPoint.y + normal.y * 10,
      },
    };
  }

  function normalizeArrowSide(edgePoint, node) {
    const leftDist = Math.abs(edgePoint.x - node.x);
    const rightDist = Math.abs(edgePoint.x - (node.x + node.w));
    const topDist = Math.abs(edgePoint.y - node.y);
    const bottomDist = Math.abs(edgePoint.y - (node.y + node.h));
    const min = Math.min(leftDist, rightDist, topDist, bottomDist);
    if (min === topDist) return "top";
    if (min === bottomDist) return "bottom";
    if (min === leftDist) return "left";
    return "right";
  }

  function edgePaddingForNode(node) {
    return node.type === "folder" ? 2 : 0;
  }

  function pairedLinkOffset(link) {
    const siblings = currentBoard().links
      .filter((item) => (item.from === link.from && item.to === link.to)
        || (item.from === link.to && item.to === link.from))
      .sort((a, b) => {
        const aDir = `${a.from}->${a.to}`;
        const bDir = `${b.from}->${b.to}`;
        if (aDir === bDir) return a.id.localeCompare(b.id);
        return aDir.localeCompare(bDir);
      });
    if (siblings.length <= 1) return 0;
    const center = (siblings.length - 1) / 2;
    const index = siblings.findIndex((item) => item.id === link.id);
    return (index - center) * 36;
  }

  function setTool(nextTool) {
    tool = nextTool;
    updateToolUI();
    closeShortcutHelp();
  }

  function isHandPanningMode() {
    return tool === "hand" || spaceDown;
  }

  function updateToolUI() {
    [
      ["select", els.selectTool],
      ["hand", els.handTool],
      ["frame", els.frameTool],
      ["card", els.cardTool],
      ["text", els.textTool],
      ["folder", els.folderTool],
    ].forEach(([name, button]) => button.classList.toggle("active", tool === name));
    els.boardFrame.classList.toggle("hand-mode", tool === "hand");
  }

  function onBoardPointerDown(event) {
    if (event.target !== els.boardFrame && event.target !== els.world && event.target !== els.nodeLayer && event.target !== els.linkLayer) return;
    els.boardFrame.focus();
    selectedLinkId = null;
    if (pendingConnection) {
      pendingConnection = null;
      updateSelectionUI();
    }
    if (event.button === 1 || isHandPanningMode()) {
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    const point = screenToWorld(event.clientX, event.clientY);
    if (tool === "card") {
      createNodeAt(point, "card");
      setTool("select");
      return;
    }
    if (tool === "text") {
      createNodeAt(point, "sticky");
      setTool("select");
      return;
    }
    if (tool === "frame") {
      startFrameDraw(event);
      return;
    }
    if (tool === "folder") {
      createFolderAt(point);
      setTool("select");
      return;
    }
    startMarquee(event);
  }

  function startNodeDrag(event, node) {
    if (event.button === 2) {
      startConnection(event, node);
      return;
    }
    if (event.button !== 0) return;
    event.stopPropagation();
    els.boardFrame.focus();
    if (isHandPanningMode()) {
      startPan(event);
      return;
    }
    if (event.target.closest("button, input, textarea, select")) return;
    if (event.target.closest("[contenteditable='true']")) return;
    bringNodeToFront(node.id, false);
    if (!isEmojiType(node)) attachedEmojiNodeIds([node.id]).forEach((emojiId) => bringNodeToFront(emojiId, false));
    dragMoved = false;

    if (event.shiftKey || event.metaKey) {
      if (selectedNodes.has(node.id)) selectedNodes.delete(node.id);
      else selectedNodes.add(node.id);
      selectedLinkId = null;
      saveState();
      updateSelectionUI();
      return;
    }

    if (!isFrameType(node)) {
      selectedNodes = new Set(
        [...selectedNodes].filter((nodeId) => {
          const item = currentBoard().nodes.find((candidate) => candidate.id === nodeId);
          return item && !isFrameType(item);
        }),
      );
    }

    if (!selectedNodes.has(node.id)) {
      selectedNodes = new Set([node.id]);
      selectedLinkId = null;
      updateSelectionUI();
    }

    if (isFrameType(node) && !event.target.closest(".frame-title")) return;
    if (isEmojiType(node)) detachEmojiFromNode(node);

    const baseMovingIds = isFrameType(node)
      ? [node.id, ...frameContainedNodeIds(node.id)]
      : [...selectedNodes].filter((nodeId) => {
        const item = currentBoard().nodes.find((candidate) => candidate.id === nodeId);
        return item && !isFrameType(item);
      });
    const movingIds = [...new Set([...baseMovingIds, ...attachedEmojiNodeIds(baseMovingIds)])];
    const starts = new Map();
    movingIds.forEach((nodeId) => {
      const item = currentBoard().nodes.find((candidate) => candidate.id === nodeId);
      if (item) starts.set(nodeId, { x: item.x, y: item.y });
    });

    const origin = { x: event.clientX, y: event.clientY };
    const move = (moveEvent) => {
      const dx = (moveEvent.clientX - origin.x) / viewport.zoom;
      const dy = (moveEvent.clientY - origin.y) / viewport.zoom;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
      starts.forEach((start, nodeId) => {
        const item = currentBoard().nodes.find((candidate) => candidate.id === nodeId);
        const element = getNodeElement(nodeId);
        if (!item || !element) return;
        item.x = start.x + dx;
        item.y = start.y + dy;
        element.style.left = `${item.x}px`;
        element.style.top = `${item.y}px`;
      });
      renderLinksOnly();
    };
    const up = (upEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (isEmojiType(node)) {
        const host = findEmojiHostNode(node);
        if (host) attachEmojiToNode(node, host);
      }
      saveState();
      setTimeout(() => {
        dragMoved = false;
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function frameContainedNodeIds(frameId) {
    const frame = currentBoard().nodes.find((node) => node.id === frameId);
    if (!frame) return [];
    return currentBoard().nodes
      .filter((node) => node.id !== frameId && !isFrameType(node))
      .filter((node) => {
        const center = nodeCenter(node);
        return center.x >= frame.x
          && center.x <= frame.x + frame.w
          && center.y >= frame.y
          && center.y <= frame.y + frame.h;
      })
      .map((node) => node.id);
  }

  function attachedEmojiNodeIds(nodeIds) {
    const sourceIds = new Set(nodeIds);
    return currentBoard().nodes
      .filter((node) => isEmojiType(node) && node.hostNodeId && sourceIds.has(node.hostNodeId))
      .map((node) => node.id);
  }

  function syncAttachedEmojiPositions() {
    currentBoard().nodes.forEach((node) => {
      if (!isEmojiType(node) || !node.hostNodeId) return;
      const host = currentBoard().nodes.find((item) => item.id === node.hostNodeId);
      if (!host || isEmojiType(host) || isFrameType(host)) {
        node.hostNodeId = "";
        return;
      }
      node.x = host.x + node.hostDx;
      node.y = host.y + node.hostDy;
    });
  }

  function attachEmojiToNode(emojiNode, hostNode) {
    if (!emojiNode || !hostNode || !isEmojiType(emojiNode) || isEmojiType(hostNode) || isFrameType(hostNode)) return;
    emojiNode.hostNodeId = hostNode.id;
    emojiNode.hostDx = emojiNode.x - hostNode.x;
    emojiNode.hostDy = emojiNode.y - hostNode.y;
  }

  function detachEmojiFromNode(emojiNode) {
    if (!emojiNode || !isEmojiType(emojiNode)) return;
    emojiNode.hostNodeId = "";
    emojiNode.hostDx = 0;
    emojiNode.hostDy = 0;
  }

  function rectIntersectionArea(a, b) {
    const width = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const height = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return width * height;
  }

  function findEmojiHostNode(emojiNode) {
    let best = null;
    let bestArea = 0;
    currentBoard().nodes.forEach((node) => {
      if (node.id === emojiNode.id || isEmojiType(node) || isFrameType(node)) return;
      const area = rectIntersectionArea(emojiNode, node);
      if (area > bestArea) {
        bestArea = area;
        best = node;
      }
    });
    return bestArea > 0 ? best : null;
  }

  function startFrameResize(event, node, dir) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    els.boardFrame.focus();
    selectedNodes = new Set([node.id]);
    selectedLinkId = null;
    updateSelectionUI();
    const origin = { x: event.clientX, y: event.clientY };
    const start = { x: node.x, y: node.y, w: node.w, h: node.h };
    const minWidth = isEmojiType(node) ? 72 : 120;
    const minHeight = isEmojiType(node) ? 72 : 96;
    const element = getNodeElement(node.id);
    const move = (moveEvent) => {
      const dx = (moveEvent.clientX - origin.x) / viewport.zoom;
      const dy = (moveEvent.clientY - origin.y) / viewport.zoom;
      let nextX = start.x;
      let nextY = start.y;
      let nextW = start.w;
      let nextH = start.h;
      if (dir.includes("e")) nextW = Math.max(minWidth, start.w + dx);
      if (dir.includes("s")) nextH = Math.max(minHeight, start.h + dy);
      if (dir.includes("w")) {
        nextW = Math.max(minWidth, start.w - dx);
        nextX = start.x + (start.w - nextW);
      }
      if (dir.includes("n")) {
        nextH = Math.max(minHeight, start.h - dy);
        nextY = start.y + (start.h - nextH);
      }
      node.x = nextX;
      node.y = nextY;
      node.w = nextW;
      node.h = nextH;
      if (element) {
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
        element.style.width = `${node.w}px`;
        element.style.minHeight = `${node.h}px`;
        if (isEmojiType(node)) {
          element.style.height = `${node.h}px`;
          const emojiBody = element.querySelector(".node-body");
          if (emojiBody) {
            const emojiSize = Math.max(40, Math.round(Math.min(node.w, node.h) * 0.82));
            emojiBody.style.fontSize = `${emojiSize}px`;
            emojiBody.style.minHeight = `${node.h}px`;
            emojiBody.style.height = `${node.h}px`;
          }
        }
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      saveState();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function startConnection(event, sourceNode) {
    if (isHandPanningMode()) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    selectedNodes = new Set([sourceNode.id]);
    selectedLinkId = null;
    pendingConnection = null;
    updateSelectionUI();

    const start = nodeCenter(sourceNode);
    const origin = { x: event.clientX, y: event.clientY };
    let connectionMoved = false;
    let hoverTargetId = null;
    const temp = document.createElementNS("http://www.w3.org/2000/svg", "path");
    temp.setAttribute("class", "temp-link");
    els.linkLayer.appendChild(temp);
    const move = (moveEvent) => {
      if (Math.abs(moveEvent.clientX - origin.x) + Math.abs(moveEvent.clientY - origin.y) > 4) {
        connectionMoved = true;
      }
      const point = screenToWorld(moveEvent.clientX, moveEvent.clientY);
      const startPoint = nodeEdgePoint(sourceNode, point, 10);
      temp.setAttribute("d", `M ${startPoint.x} ${startPoint.y} L ${point.x} ${point.y}`);
      const stack = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
      const hit = stack.map((el) => el.closest?.(".jam-node")).find((el) => el && el.dataset.id !== sourceNode.id) || null;
      if (hit?.dataset.id) hoverTargetId = hit.dataset.id;
      else {
        const worldPoint = screenToWorld(moveEvent.clientX, moveEvent.clientY);
        hoverTargetId = nearestNodeId(worldPoint.x, worldPoint.y, sourceNode.id, 80);
      }
      els.nodeLayer.querySelectorAll(".jam-node").forEach((el) => el.classList.toggle("connect-target", !!hoverTargetId && el.dataset.id === hoverTargetId));
    };
    const up = (upEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      temp.remove();
      const stack = document.elementsFromPoint(upEvent.clientX, upEvent.clientY);
      const targetElement = stack.map((el) => el.closest?.(".jam-node")).find((el) => el && el.dataset.id !== sourceNode.id) || null;
      let targetId = hoverTargetId || targetElement?.dataset.id || null;
      if (!targetId) {
        const worldPoint = screenToWorld(upEvent.clientX, upEvent.clientY);
        targetId = nearestNodeId(worldPoint.x, worldPoint.y, sourceNode.id, 100);
      }
      els.nodeLayer.querySelectorAll(".jam-node").forEach((el) => el.classList.remove("connect-target"));
      if (targetId && targetId !== sourceNode.id) addLink(sourceNode.id, targetId);
      else {
        selectedNodes = new Set([sourceNode.id]);
        updateSelectionUI();
        updateToolUI();
      }
    };
    move(event);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function nearestNodeId(x, y, excludeId, maxDistance) {
    let best = null;
    let bestDist = maxDistance;
    currentBoard().nodes.forEach((node) => {
      if (node.id === excludeId) return;
      const c = nodeCenter(node);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = node.id;
      }
    });
    return best;
  }

  function addLink(from, to) {
    const board = currentBoard();
    const exists = board.links.some((link) => link.from === from && link.to === to);
    if (!exists) {
      const source = board.nodes.find((node) => node.id === from);
      board.links.push({
        id: id("link"),
        from,
        to,
        label: "",
        color: source?.style?.lineColor || palette.blue,
      });
    }
    saveState();
    renderAll();
  }

  function beginClickConnection() {}

  function completePendingConnection() { return false; }

  function startFrameDraw(event) {
    const frame = els.boardFrame.getBoundingClientRect();
    const start = { x: event.clientX - frame.left, y: event.clientY - frame.top };
    let moved = false;
    els.marquee.hidden = false;
    drawMarquee(start.x, start.y, 0, 0);
    els.boardFrame.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      const current = { x: moveEvent.clientX - frame.left, y: moveEvent.clientY - frame.top };
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);
      if (width + height > 6) moved = true;
      drawMarquee(left, top, width, height);
    };

    const up = (upEvent) => {
      els.boardFrame.releasePointerCapture(upEvent.pointerId);
      els.boardFrame.removeEventListener("pointermove", move);
      els.boardFrame.removeEventListener("pointerup", up);
      els.marquee.hidden = true;
      const end = { x: upEvent.clientX - frame.left, y: upEvent.clientY - frame.top };
      const left = Math.min(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      if (!moved || width < 24 || height < 24) {
        setTool("select");
        return;
      }
      const worldA = screenToWorld(frame.left + left, frame.top + top);
      const worldB = screenToWorld(frame.left + left + width, frame.top + top + height);
      createFrameFromBounds(worldA, worldB);
      setTool("select");
    };

    els.boardFrame.addEventListener("pointermove", move);
    els.boardFrame.addEventListener("pointerup", up);
  }

  function startMarquee(event) {
    const frame = els.boardFrame.getBoundingClientRect();
    const start = { x: event.clientX - frame.left, y: event.clientY - frame.top };
    const baseSelection = new Set(selectedNodes);
    let moved = false;
    els.marquee.hidden = false;
    drawMarquee(start.x, start.y, 0, 0);
    els.boardFrame.setPointerCapture(event.pointerId);

    const move = (moveEvent) => {
      const current = { x: moveEvent.clientX - frame.left, y: moveEvent.clientY - frame.top };
      const left = Math.min(start.x, current.x);
      const top = Math.min(start.y, current.y);
      const width = Math.abs(current.x - start.x);
      const height = Math.abs(current.y - start.y);
      if (width + height > 4) moved = true;
      drawMarquee(left, top, width, height);
      const worldA = screenToWorld(frame.left + left, frame.top + top);
      const worldB = screenToWorld(frame.left + left + width, frame.top + top + height);
      const selected = new Set(event.shiftKey || event.metaKey ? baseSelection : []);
      currentBoard().nodes.forEach((node) => {
        if (isFrameType(node)) return;
        const nodeRight = node.x + node.w;
        const nodeBottom = node.y + node.h;
        if (node.x <= worldB.x && nodeRight >= worldA.x && node.y <= worldB.y && nodeBottom >= worldA.y) {
          selected.add(node.id);
        }
      });
      selectedNodes = selected;
      selectedLinkId = null;
      updateSelectionUI();
    };

    const up = (upEvent) => {
      els.boardFrame.releasePointerCapture(upEvent.pointerId);
      els.boardFrame.removeEventListener("pointermove", move);
      els.boardFrame.removeEventListener("pointerup", up);
      els.marquee.hidden = true;
      if (!moved) {
        selectedNodes = new Set();
        selectedLinkId = null;
        updateSelectionUI();
      }
    };

    els.boardFrame.addEventListener("pointermove", move);
    els.boardFrame.addEventListener("pointerup", up);
  }

  function drawMarquee(left, top, width, height) {
    Object.assign(els.marquee.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  function startPan(event) {
    event.preventDefault();
    els.boardFrame.classList.add("is-panning");
    const start = { x: event.clientX, y: event.clientY, vx: viewport.x, vy: viewport.y };
    els.boardFrame.setPointerCapture(event.pointerId);
    const move = (moveEvent) => {
      viewport.x = start.vx + (moveEvent.clientX - start.x);
      viewport.y = start.vy + (moveEvent.clientY - start.y);
      applyViewport();
    };
    const up = (upEvent) => {
      els.boardFrame.classList.remove("is-panning");
      els.boardFrame.releasePointerCapture(upEvent.pointerId);
      els.boardFrame.removeEventListener("pointermove", move);
      els.boardFrame.removeEventListener("pointerup", up);
      saveState();
    };
    els.boardFrame.addEventListener("pointermove", move);
    els.boardFrame.addEventListener("pointerup", up);
  }

  function onWheel(event) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const nextZoom = viewport.zoom * Math.pow(1.0018, -event.deltaY);
      zoomAt(event.clientX, event.clientY, nextZoom);
      return;
    }
    viewport.x -= event.deltaX;
    viewport.y -= event.deltaY;
    applyViewport();
    saveState();
  }

  function zoomFromCenter(nextZoom) {
    const rect = els.boardFrame.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoom);
  }

  function zoomAt(clientX, clientY, nextZoom) {
    const rect = els.boardFrame.getBoundingClientRect();
    const before = screenToWorld(clientX, clientY);
    viewport.zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    viewport.x = clientX - rect.left - before.x * viewport.zoom;
    viewport.y = clientY - rect.top - before.y * viewport.zoom;
    applyViewport();
    saveState();
  }

  function fitBoard() {
    const board = currentBoard();
    const rect = els.boardFrame.getBoundingClientRect();
    if (!board.nodes.length) {
      viewport = { x: rect.width / 2, y: rect.height / 2, zoom: 1 };
      applyViewport();
      saveState();
      return;
    }
    const bounds = board.nodes.reduce((box, node) => ({
      left: Math.min(box.left, node.x),
      top: Math.min(box.top, node.y),
      right: Math.max(box.right, node.x + node.w),
      bottom: Math.max(box.bottom, node.y + node.h),
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const zoom = clamp(Math.min((rect.width - 180) / width, (rect.height - 180) / height, 1), MIN_ZOOM, MAX_ZOOM);
    viewport.zoom = zoom;
    viewport.x = rect.width / 2 - (bounds.left + width / 2) * zoom;
    viewport.y = rect.height / 2 - (bounds.top + height / 2) * zoom;
    applyViewport();
    saveState();
  }

  function applyViewport() {
    const tx = Math.round(viewport.x);
    const ty = Math.round(viewport.y);
    els.world.style.transform = `translate(${tx}px, ${ty}px) scale(${viewport.zoom})`;
    const grid = 28 * viewport.zoom;
    els.boardFrame.style.backgroundSize = `${grid}px ${grid}px`;
    els.boardFrame.style.backgroundPosition = `${tx % grid}px ${ty % grid}px`;
    els.zoomLabel.textContent = `${Math.round(viewport.zoom * 100)}%`;
  }

  function screenToWorld(clientX, clientY) {
    const rect = els.boardFrame.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    };
  }

  function screenCenter() {
    const rect = els.boardFrame.getBoundingClientRect();
    return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function createNodeAt(point, type, extra = {}) {
    const sticky = isStickyType(type);
    const frame = isFrameType(type);
    const emoji = isEmojiType(type);
    const node = makeNode({
      type,
      title: frame ? "Frame" : sticky || emoji ? "" : "New block",
      text: emoji ? "🙂" : sticky ? "New sticky note" : frame ? "" : "Add notes, context, or a passage.",
      x: point.x - defaultNodeWidth(type) / 2,
      y: point.y - defaultNodeHeight(type) / 2,
      w: defaultNodeWidth(type),
      h: defaultNodeHeight(type),
      style: {
        fill: sticky ? "#fff6bf" : frame ? "#f5f9ff" : emoji ? "transparent" : palette.paper,
        lineColor: sticky ? "#d7c76c" : frame ? "#7ea5ff" : emoji ? "transparent" : palette.blue,
      },
      ...extra,
    });
    currentBoard().nodes.push(node);
    bringNodeToFront(node.id, false);
    selectedNodes = new Set([node.id]);
    selectedLinkId = null;
    saveState();
    renderAll();
    return node;
  }

  function createFolderAt(point, name = "New folder") {
    const boardId = id("board");
    state.boards.push({
      id: boardId,
      name,
      parentId: currentBoardId,
      nodes: [],
      links: [],
    });
    const node = createNodeAt(point, "folder", {
      title: name,
      text: "Double-click or press Open board to enter this folder.",
      boardId,
      w: 280,
      h: 140,
      style: { fill: "#fff6df", lineColor: palette.gold },
    });
    saveState();
    return node;
  }

  function createFrameAt(point, name = "Frame") {
    return createNodeAt(point, "frame", {
      title: name,
      text: "",
      w: 440,
      h: 280,
      style: {
        fill: "#f5f9ff",
        lineColor: "#7ea5ff",
      },
    });
  }

  function createFrameFromBounds(a, b, name = "Frame") {
    const left = Math.min(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const width = Math.max(24, Math.abs(b.x - a.x));
    const height = Math.max(24, Math.abs(b.y - a.y));
    const center = { x: left + width / 2, y: top + height / 2 };
    return createNodeAt(center, "frame", {
      title: name,
      text: "",
      x: left,
      y: top,
      w: width,
      h: height,
      style: {
        fill: "#f5f9ff",
        lineColor: "#7ea5ff",
      },
    });
  }

  function createEmojiAt(point, emoji = "🙂") {
    return createNodeAt(point, "emoji", {
      title: "",
      text: emoji,
      w: 56,
      h: 56,
      style: {
        fill: "transparent",
        lineColor: "transparent",
      },
    });
  }

  function createVerseNode(point, passage) {
    const title = passage.bareRef || `${passage.book} ${passage.chapter}:${passage.verse}`;
    return createNodeAt(point, "verse", {
      title,
      text: passage.text,
      ref: withTranslationAbbreviation(title, passage.packId),
      bible: {
        packId: passage.packId,
        bookId: passage.bookId,
        chapter: passage.chapter,
        verse: passage.verse,
      },
      w: 310,
      h: 150,
      style: { fill: "#ffffff", lineColor: palette.green },
    });
  }

  function passageKey(passage) {
    return `${passage.bookId}:${passage.chapter}:${passage.verse}`;
  }

  function selectedPassagesFrom(verses) {
    return verses.filter((passage) => selectedVerseKeys.has(passageKey(passage)));
  }

  function verseBundle(passages) {
    const bundle = Array.isArray(passages) ? passages.filter(Boolean) : [passages].filter(Boolean);
    if (!bundle.length) return null;
    const first = bundle[0];
    const last = bundle.at(-1);
    const sameBook = bundle.every((passage) => passage.bookId === first.bookId);
    const sameChapter = sameBook && bundle.every((passage) => passage.chapter === first.chapter);
    const bareRef = sameChapter
      ? `${first.book} ${first.chapter}:${first.verse}${bundle.length > 1 ? `-${last.verse}` : ""}`
      : `${first.book} ${first.chapter}:${first.verse} - ${last.book} ${last.chapter}:${last.verse}`;
    return {
      title: sameChapter ? `${first.book} ${first.chapter}` : bareRef,
      ref: withTranslationAbbreviation(bareRef, first.packId),
      text: bundle.length === 1
        ? first.text
        : bundle.map((passage) => `${passage.verse}. ${passage.text}`).join("\n"),
      bible: {
        packId: first.packId,
        bookId: first.bookId,
        chapter: first.chapter,
        verse: first.verse,
      },
      passages: bundle,
    };
  }

  function createVerseBundleNode(point, passages) {
    const bundle = verseBundle(passages);
    if (!bundle) return null;
    if (bundle.passages.length === 1) return createVerseNode(point, bundle.passages[0]);
    return createNodeAt(point, "verse", {
      title: bundle.title,
      text: bundle.text,
      ref: bundle.ref,
      bible: bundle.bible,
      w: bundle.passages.length > 1 ? 390 : 310,
      h: bundle.passages.length > 1 ? Math.min(280, 150 + (bundle.passages.length - 1) * 14) : 150,
      style: { fill: "#ffffff", lineColor: palette.green },
    });
  }

  function selectOnly(nodeId) {
    if (savedInspectorNodeId && savedInspectorNodeId !== nodeId) clearInspectorSelectionMemory();
    bringNodeToFront(nodeId, true);
    selectedNodes = new Set([nodeId]);
    selectedLinkId = null;
    updateSelectionUI();
  }

  function updateSelectionUI() {
    allNodeElements().forEach((element) => {
      const selected = selectedNodes.has(element.dataset.id);
      element.classList.toggle("selected", selectedNodes.size === 1 && selected);
      element.classList.toggle("multi-selected", selectedNodes.size > 1 && selected);
      element.classList.toggle("connect-source", pendingConnection === element.dataset.id);
    });
    els.linkLayer.querySelectorAll(".link-path").forEach((element) => {
      element.classList.toggle("selected", selectedLinkId && element.__linkId === selectedLinkId);
    });
    renderLinksOnly();
    renderInspector();
    updateToolUI();
  }

  function renderLinksOnly() {
    els.linkLayer.innerHTML = "";
    if (els.linkOverlay) els.linkOverlay.innerHTML = "";
    currentBoard().links.forEach(renderLink);
    currentBoard().links.forEach(renderLinkLabel);
  }

  function ensureLinkDefs() {
    return undefined;
  }

  function renderInspector() {
    const selected = [...selectedNodes].map((nodeId) => currentBoard().nodes.find((node) => node.id === nodeId)).filter(Boolean);
    if (!selected.length && !selectedLinkId) {
      els.inspector.hidden = true;
      return;
    }
    els.inspector.hidden = false;
    els.singleInspector.hidden = selected.length !== 1;
    els.multiInspector.hidden = selected.length <= 1;
    els.linkInspector.hidden = true;
    els.deleteButton.hidden = false;
    els.inspector.classList.remove("compact-verse");
    els.inspector.classList.remove("compact-note");

    if (selectedLinkId) {
      els.inspectorTitle.textContent = "Connection";
      els.singleInspector.hidden = true;
      els.multiInspector.hidden = true;
      els.linkInspector.hidden = false;
      const link = currentBoard().links.find((item) => item.id === selectedLinkId);
      if (link) {
        els.linkLabelInput.value = link.label || "";
        els.linkColorInput.value = link.color || palette.blue;
        syncColorSwatchesFor(["linkColorInput"]);
      }
      return;
    }

    if (selected.length === 1) {
      const node = selected[0];
      if (savedInspectorNodeId && savedInspectorNodeId !== node.id) clearInspectorSelectionMemory();
      const verseMode = node.type === "verse";
      const stickyMode = isStickyType(node);
      const frameMode = isFrameType(node);
      const emojiMode = isEmojiType(node);
      const titleField = els.nodeTitleInput.closest("label");
      const titleLabel = titleField?.querySelector("span");
      const textLabel = els.nodeTextField?.querySelector("span");
      els.inspectorTitle.textContent = nodeTypeLabel(node);
      els.inspector.classList.toggle("compact-verse", verseMode);
      els.inspector.classList.toggle("compact-note", stickyMode);
      els.nodeTitleInput.dataset.nodeId = node.id;
      const nextTitleHtml = node.titleHtml || plainTextToHtml(node.title);
      if (els.nodeTitleInput.innerHTML !== nextTitleHtml) els.nodeTitleInput.innerHTML = nextTitleHtml;
      applyTextStyle(els.nodeTitleInput, node.style);
      els.nodeTextInput.dataset.nodeId = node.id;
      const nextInspectorHtml = node.textHtml || plainTextToHtml(node.text);
      if (els.nodeTextInput.innerHTML !== nextInspectorHtml) els.nodeTextInput.innerHTML = nextInspectorHtml;
      applyTextStyle(els.nodeTextInput, node.style);
      syncInspectorTextControls(node);
      if (titleField) titleField.hidden = stickyMode || emojiMode || verseMode;
      if (titleLabel) titleLabel.textContent = frameMode ? "Frame name" : "Title";
      if (textLabel) textLabel.textContent = emojiMode ? "Emoji" : stickyMode ? "Note" : "Text";
      els.nodeTextField.hidden = frameMode;
      els.boldButton.hidden = verseMode || frameMode || emojiMode;
      els.italicButton.hidden = verseMode || frameMode || emojiMode;
      els.underlineButton.hidden = verseMode || frameMode || emojiMode;
      els.uploadImageButton.hidden = verseMode || frameMode || emojiMode;
      els.removeImageButton.hidden = !node.image || verseMode || frameMode || emojiMode;
      els.mediaRow.classList.toggle("compact-actions", verseMode);
      els.openFolderButton.hidden = node.type !== "folder";
      els.openBibleHereButton.hidden = !node.bible;
      return;
    }

    els.inspectorTitle.textContent = "Selection";
    els.multiCount.textContent = `${selected.length} blocks selected`;
    syncColorSwatchesFor(["multiFillInput", "multiLineInput"]);
  }

  function updateSingleNode(field, value) {
    const node = selectedNode();
    if (!node) return;
    if (field === "image") node[field] = String(value).trim();
    else if (field === "title") {
      node.title = value;
      node.titleHtml = plainTextToHtml(value);
    } else if (field === "text") {
      node.text = value;
      node.textHtml = plainTextToHtml(value);
    } else {
      node[field] = value;
    }
    saveState();
    renderBoard();
    renderInspector();
  }

  function updateSingleStyle(field, value) {
    const node = selectedNode();
    if (!node) return;
    if (field === "fontSize") {
      const next = normalizeFontSize(node, value);
      node.style[field] = next;
    } else {
      node.style[field] = value;
    }
    saveState();
    renderBoard();
    renderInspector();
  }

  function normalizeFontSize(node, value) {
    const next = clamp(Number(value) || 14, 10, 48);
    const baseHeight = baseNodeMinHeight(node);
    const growth = node.type === "verse" ? 6 : isEmojiType(node) ? 1 : 3;
    node.h = Math.max(node.h, Math.round(baseHeight + Math.max(0, next - 14) * growth));
    return next;
  }

  function handleFontSizeInput(value, commit) {
    if (applyInlineFontSize(value, true)) return;
    if (commit) {
      updateSingleStyle("fontSize", value);
      return;
    }
    previewSelectedFontSize(value);
  }

  function previewSelectedFontSize(value) {
    const node = selectedNode();
    if (!node) return;
    const next = normalizeFontSize(node, value);
    const element = els.nodeLayer.querySelector(`[data-id="${cssEscape(node.id)}"]`);
    if (!element) return;
    element.style.minHeight = `${node.h}px`;
    element.querySelectorAll(".node-title, .node-body").forEach((textEl) => {
      textEl.style.fontSize = `${next}px`;
    });
  }

  function toggleSingleStyle(field) {
    const node = selectedNode();
    if (!node) return;
    node.style[field] = !node.style[field];
    saveState();
    renderBoard();
    renderInspector();
  }

  function syncInspectorEditorRichText(editable) {
    const node = selectedNode();
    if (!node || !editable) return;
    storeEditableContent(node, editable);
    rememberInspectorSelection();
    saveState();
    renderBoard();
  }

  function rememberInspectorSelection() {
    const node = selectedNode();
    const live = liveInspectorSelection();
    if (live) {
      savedInspectorFormat = readInspectorTextFormat(live.node, live.range);
      if (!live.range.collapsed) {
        savedInspectorRange = live.range.cloneRange();
        savedInspectorNodeId = live.node.id;
        savedInspectorEditorId = live.editor.id || "nodeTextInput";
      }
    }
    if (node && !selectedLinkId && selectedNodes.size === 1 && !els.singleInspector.hidden) {
      syncInspectorTextControls(node);
    }
  }

  function hasSavedInspectorSelection() {
    const node = selectedNode();
    return Boolean(node && savedInspectorRange && savedInspectorNodeId === node.id);
  }

  function clearInspectorSelectionMemory() {
    savedInspectorRange = null;
    savedInspectorNodeId = null;
    savedInspectorEditorId = null;
    savedInspectorFormat = null;
  }

  function restoreInspectorSelection() {
    const node = selectedNode();
    const editable = savedInspectorEditorId === "nodeTitleInput" ? els.nodeTitleInput : els.nodeTextInput;
    if (!node || !savedInspectorRange || savedInspectorNodeId !== node.id || !editable) return null;
    try {
      const selection = window.getSelection();
      editable.focus({ preventScroll: true });
      selection?.removeAllRanges();
      selection?.addRange(savedInspectorRange.cloneRange());
      return { selection, editable, node };
    } catch {
      clearInspectorSelectionMemory();
      return null;
    }
  }

  function updateManyStyles(field, value) {
    selectedNodes.forEach((nodeId) => {
      const node = currentBoard().nodes.find((item) => item.id === nodeId);
      if (node) node.style[field] = value;
    });
    saveState();
    renderBoard();
    renderInspector();
  }

  function selectedNode() {
    if (selectedNodes.size !== 1) return null;
    const [nodeId] = selectedNodes;
    return currentBoard().nodes.find((node) => node.id === nodeId) || null;
  }

  function updateSelectedLink() {
    if (!selectedLinkId) return;
    const link = currentBoard().links.find((item) => item.id === selectedLinkId);
    if (!link) return;
    link.label = els.linkLabelInput.value;
    link.color = els.linkColorInput.value;
    saveState();
    renderLinksOnly();
  }

  function openSelectedFolder() {
    const node = selectedNode();
    if (node?.type === "folder" && node.boardId) openBoard(node.boardId);
  }

  function openSelectedVerseInBible() {
    const node = selectedNode();
    if (node?.bible) openBibleLocation(node.bible);
  }

  async function removeSelectedImage() {
    const node = selectedNode();
    if (!node?.image) return;
    const assetId = node.imageAssetId;
    node.image = "";
    node.imageAssetId = "";
    node.h = baseNodeMinHeight(node);
    if (assetId) await deleteImageAsset(assetId);
    saveState();
    renderAll();
  }

  function deleteSelected() {
    const board = currentBoard();
    if (selectedLinkId) {
      board.links = board.links.filter((link) => link.id !== selectedLinkId);
      selectedLinkId = null;
      saveState();
      renderAll();
      return;
    }
    if (!selectedNodes.size) return;
    const ids = new Set(selectedNodes);
    board.nodes = board.nodes.filter((node) => !ids.has(node.id));
    board.links = board.links.filter((link) => !ids.has(link.from) && !ids.has(link.to));
    selectedNodes = new Set();
    saveState();
    renderAll();
  }

  function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file || !String(file.type || "").startsWith("image/")) {
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result || "");
      const node = selectedNode();
      if (node) {
        node.image = imageData;
        const assetId = node.imageAssetId || id("image");
        const stored = await putImageAsset(assetId, imageData);
        node.imageAssetId = stored ? assetId : "";
        node.w = Math.max(node.w, 320);
        node.h = Math.max(node.h, 240);
        try {
          saveState();
        } catch (error) {
          console.warn("Image was loaded but could not be fully persisted.", error);
        }
        renderAll();
      } else {
        const created = createNodeAt(screenCenter(), "card", {
          title: file.name.replace(/\.[^.]+$/, "") || "Image",
          text: "",
          image: imageData,
          w: 320,
          h: 180,
        });
        if (created) {
          const assetId = created.imageAssetId || id("image");
          const stored = await putImageAsset(assetId, imageData);
          created.imageAssetId = stored ? assetId : "";
          saveState();
          renderAll();
        }
      }
      event.target.value = "";
    };
    reader.onerror = () => {
      console.warn("Could not read this image file.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function dropPassage(event) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-bible-passage");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      const passages = Array.isArray(payload?.passages)
        ? payload.passages
        : payload?.bookId ? [payload] : [];
      if (!passages.length) return;
      createVerseBundleNode(screenToWorld(event.clientX, event.clientY), passages);
    } catch {
      // Ignore invalid drag payloads.
    }
  }

  function onKeyDown(event) {
    if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const key = event.key.toLowerCase();
    const mod = event.metaKey || event.ctrlKey;
    if (event.code === "Space") {
      spaceDown = true;
      els.boardFrame.classList.add("hand-mode");
      event.preventDefault();
    }
    if (mod && key === "z") {
      event.preventDefault();
      if (event.shiftKey) redoState();
      else undoState();
      return;
    }
    if (mod && key === "y") {
      event.preventDefault();
      redoState();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") deleteSelected();
    if (mod && key === "a") {
      event.preventDefault();
      selectedNodes = new Set(currentBoard().nodes.map((node) => node.id));
      selectedLinkId = null;
      updateSelectionUI();
      return;
    }
    if (event.key === "Escape") {
      closeShortcutHelp();
      closeEmojiPicker();
      selectedNodes = new Set();
      selectedLinkId = null;
      updateSelectionUI();
      setTool("select");
      return;
    }
    if (mod && event.key === "0") {
      event.preventDefault();
      fitBoard();
      return;
    }
    if (key === "l" && selectedNodes.size === 2) {
      event.preventDefault();
      const [from, to] = [...selectedNodes];
      addLink(from, to);
      return;
    }
    if (event.key === "?") {
      event.preventDefault();
      toggleShortcutHelp();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomFromCenter(viewport.zoom * 1.18);
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      zoomFromCenter(viewport.zoom / 1.18);
      return;
    }
    if (mod) return;
    if (key === "h") {
      event.preventDefault();
      setTool("hand");
      return;
    }
    if (key === "v") {
      event.preventDefault();
      setTool("select");
      return;
    }
    if (key === "n") {
      event.preventDefault();
      createNodeAt(screenCenter(), "card");
      setTool("select");
      return;
    }
    if (key === "t") {
      event.preventDefault();
      createNodeAt(screenCenter(), "sticky");
      setTool("select");
      return;
    }
    if (key === "f") {
      event.preventDefault();
      setTool("frame");
      return;
    }
    if (key === "o") {
      event.preventDefault();
      createFolderAt(screenCenter());
      setTool("select");
      return;
    }
    if (key === "e") {
      event.preventDefault();
      toggleEmojiPicker();
      return;
    }
    if (key === "i") {
      event.preventDefault();
      setTool("select");
      openImagePicker();
      return;
    }
    if (key === "b") {
      event.preventDefault();
      setBiblePanel(els.biblePanel.hidden);
    }
  }

  function onKeyUp(event) {
    if (event.code === "Space") {
      spaceDown = false;
      els.boardFrame.classList.toggle("hand-mode", tool === "hand");
    }
  }

  function restoreStateSnapshot(serialized) {
    restoringHistory = true;
    try {
      state = normalize(JSON.parse(serialized));
      if (!state.boards.some((board) => board.id === currentBoardId)) currentBoardId = "home";
      selectedNodes = new Set();
      selectedLinkId = null;
      lastHistorySnapshot = serialized;
      const board = currentBoard();
      viewport = board?.viewport ? { ...board.viewport } : { x: 0, y: 0, zoom: 1 };
      localStorage.setItem(storageKeyForUser(), serialized);
      renderAll();
      void bootImageStorage();
      queueRemoteSave();
    } finally {
      restoringHistory = false;
    }
  }

  function undoState() {
    if (!historyPast.length) return;
    const current = JSON.stringify(compactStateForStorage(state));
    const previous = historyPast.pop();
    historyFuture.push(current);
    if (historyFuture.length > 120) historyFuture.shift();
    restoreStateSnapshot(previous);
  }

  function redoState() {
    if (!historyFuture.length) return;
    const current = JSON.stringify(compactStateForStorage(state));
    const next = historyFuture.pop();
    historyPast.push(current);
    if (historyPast.length > 120) historyPast.shift();
    restoreStateSnapshot(next);
  }

  function exportState() {
    saveState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "bible-study-board.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importState(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = normalize(JSON.parse(String(reader.result)));
        currentBoardId = state.boards[0]?.id || "home";
        selectedNodes = new Set();
        selectedLinkId = null;
        initHistory();
        saveState();
        renderAll();
      } catch {
        alert("Could not import this JSON file.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function resetDemo() {
    if (!confirm("Reset the local board demo?")) return;
    localStorage.removeItem(storageKeyForUser());
    state = createSeedState();
    currentBoardId = "home";
    selectedNodes = new Set();
    selectedLinkId = null;
    initHistory();
    saveState();
    renderAll();
    requestAnimationFrame(fitBoard);
  }

  function fillLanguages() {
    const manifest = getManifest();
    const languages = [...new Map(manifest.map((pack) => [pack.languageCode || pack.language, {
      code: pack.languageCode || pack.language,
      name: pack.language,
    }])).values()];
    els.languageSelect.innerHTML = "";
    languages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.name;
      els.languageSelect.appendChild(option);
    });
    if (languages.length) {
      els.languageSelect.value = state.settings.bibleLanguage || languages[0].code;
      if (!els.languageSelect.value) els.languageSelect.value = languages[0].code;
    }
    fillTranslations();
  }

  function fillTranslations() {
    const language = els.languageSelect.value;
    const packs = getManifest().filter((pack) => (pack.languageCode || pack.language) === language);
    els.translationSelect.innerHTML = "";
    packs.forEach((pack) => {
      const option = document.createElement("option");
      option.value = pack.id;
      option.textContent = pack.translation;
      els.translationSelect.appendChild(option);
    });
    if (!packs.some((pack) => pack.id === state.settings.biblePackId)) {
      state.settings.biblePackId = packs[0]?.id || "";
    }
    els.translationSelect.value = state.settings.biblePackId;
  }

  function onLanguageChange() {
    state.settings.bibleLanguage = els.languageSelect.value;
    const pack = getManifest().find((item) => (item.languageCode || item.language) === els.languageSelect.value);
    state.settings.biblePackId = pack?.id || "";
    state.settings.bookId = "GEN";
    state.settings.chapter = 1;
    highlightedVerse = null;
    fillTranslations();
    saveState();
    renderBible();
  }

  function onTranslationChange() {
    state.settings.biblePackId = els.translationSelect.value;
    state.settings.bookId = "GEN";
    state.settings.chapter = 1;
    highlightedVerse = null;
    saveState();
    renderBible();
  }

  function onBookChange() {
    state.settings.bookId = els.bookSelect.value;
    state.settings.chapter = 1;
    selectedVerseKeys = new Set();
    highlightedVerse = null;
    saveState();
    renderBible();
  }

  function onChapterChange() {
    state.settings.chapter = Number(els.chapterSelect.value) || 1;
    selectedVerseKeys = new Set();
    highlightedVerse = null;
    saveState();
    renderBible();
  }

  async function renderBible() {
    const token = ++bibleRenderToken;
    const packId = state.settings.biblePackId || getManifest()[0]?.id;
    if (!packId) {
      els.bibleStatus.textContent = "Bible data is not built yet.";
      els.passageList.innerHTML = "";
      return;
    }
    els.bibleStatus.textContent = "Loading translation...";
    try {
      const pack = await loadPack(packId);
      if (token !== bibleRenderToken) return;
      renderBookControls(pack);
      const query = els.bibleSearch.value.trim();
      const verses = query ? searchVerses(pack, query) : chapterVerses(pack);
      els.bibleStatus.textContent = query
        ? `${verses.length} result${verses.length === 1 ? "" : "s"} shown`
        : `${currentBook(pack)?.name || ""} ${state.settings.chapter}`;
      renderPassages(pack, verses);
    } catch (error) {
      els.bibleStatus.textContent = `Could not load this translation: ${error.message}`;
      els.passageList.innerHTML = "";
    }
  }

  function renderBookControls(pack) {
    if (els.bookSelect.dataset.packId !== pack.id) {
      els.bookSelect.innerHTML = "";
      pack.books.forEach((book) => {
        const option = document.createElement("option");
        option.value = book.id;
        option.textContent = book.name;
        els.bookSelect.appendChild(option);
      });
      els.bookSelect.dataset.packId = pack.id;
    }
    if (!pack.books.some((book) => book.id === state.settings.bookId)) {
      state.settings.bookId = pack.books[0]?.id || "GEN";
    }
    els.bookSelect.value = state.settings.bookId;

    const book = currentBook(pack);
    const chapterCount = book?.chapters?.length || 1;
    if (Number(els.chapterSelect.dataset.count) !== chapterCount) {
      els.chapterSelect.innerHTML = "";
      for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
        const option = document.createElement("option");
        option.value = String(chapter);
        option.textContent = String(chapter);
        els.chapterSelect.appendChild(option);
      }
      els.chapterSelect.dataset.count = String(chapterCount);
    }
    state.settings.chapter = clamp(Number(state.settings.chapter) || 1, 1, chapterCount);
    els.chapterSelect.value = String(state.settings.chapter);
  }

  function renderPassages(pack, verses) {
    const queryMode = Boolean(els.bibleSearch.value.trim());
    els.passageList.innerHTML = "";
    els.chapterActions.innerHTML = "";
    els.chapterActions.hidden = true;
    if (!queryMode && verses.length) {
      const selected = selectedPassagesFrom(verses);
      const reader = document.createElement("article");
      reader.className = "chapter-reader";
      verses.forEach((passage) => {
        const key = passageKey(passage);
        const verse = document.createElement("span");
        verse.className = "verse-line";
        verse.classList.toggle("picked", selectedVerseKeys.has(key));
        if (highlightedVerse
          && highlightedVerse.packId === pack.id
          && highlightedVerse.bookId === passage.bookId
          && highlightedVerse.chapter === passage.chapter
          && highlightedVerse.verse === passage.verse) verse.classList.add("active");
        verse.dataset.key = key;
        verse.draggable = true;
        verse.innerHTML = `<sup class="verse-num">${passage.verse}</sup>${escapeHtml(passage.text)}`;
        verse.addEventListener("dragstart", (event) => {
          const selection = selectedPassagesFrom(verses);
          const passages = selection.length > 1 && selectedVerseKeys.has(key) ? selection : [passage];
          event.dataTransfer.setData("application/x-bible-passage", JSON.stringify({ passages }));
          event.dataTransfer.effectAllowed = "copy";
          if (passages.length > 1) {
            reader.querySelectorAll(".verse-line").forEach((line) => {
              line.classList.toggle("drag-bundle", selectedVerseKeys.has(line.dataset.key));
            });
          }
        });
        verse.addEventListener("dragend", () => {
          reader.querySelectorAll(".verse-line.drag-bundle").forEach((line) => line.classList.remove("drag-bundle"));
        });
        verse.addEventListener("click", () => {
          if (selectedVerseKeys.has(key)) selectedVerseKeys.delete(key);
          else selectedVerseKeys.add(key);
          renderPassages(pack, verses);
        });
        verse.addEventListener("dblclick", () => createVerseNode(screenCenter(), passage));
        reader.appendChild(verse);
      });
      els.passageList.appendChild(reader);
    } else {
      const fragment = document.createDocumentFragment();
      verses.forEach((passage) => {
        const item = document.createElement("article");
        item.className = "passage search";
        item.draggable = true;
        item.innerHTML = `<header><strong>${escapeHtml(passage.ref)}</strong></header><p>${escapeHtml(passage.text)}</p>`;
        item.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("application/x-bible-passage", JSON.stringify({ passages: [passage] }));
          event.dataTransfer.effectAllowed = "copy";
        });
        item.addEventListener("dblclick", () => createVerseNode(screenCenter(), passage));
        fragment.appendChild(item);
      });
      els.passageList.appendChild(fragment);
    }
    if (highlightedVerse) {
      requestAnimationFrame(() => els.passageList.querySelector(".active")?.scrollIntoView({ block: "center" }));
    }
  }

  function chapterVerses(pack) {
    const book = currentBook(pack);
    if (!book) return [];
    const chapterIndex = (Number(state.settings.chapter) || 1) - 1;
    const chapter = book.chapters[chapterIndex] || [];
    return chapter.map((text, index) => makePassage(pack, book, chapterIndex + 1, index + 1, text));
  }

  function searchVerses(pack, query) {
    const ref = parseReference(pack, query);
    if (ref) {
      state.settings.bookId = ref.book.id;
      state.settings.chapter = ref.chapter;
      const chapter = ref.book.chapters[ref.chapter - 1] || [];
      const verseStart = ref.verse || 1;
      const verseEnd = ref.verse ? ref.verse : chapter.length;
      return chapter
        .slice(verseStart - 1, verseEnd)
        .map((text, index) => makePassage(pack, ref.book, ref.chapter, verseStart + index, text));
    }
    const needle = normalizeSearch(query);
    const results = [];
    pack.books.forEach((book) => {
      book.chapters.forEach((chapter, chapterIndex) => {
        chapter.forEach((text, verseIndex) => {
          if (normalizeSearch(`${book.name} ${chapterIndex + 1}:${verseIndex + 1} ${text}`).includes(needle)) {
            results.push(makePassage(pack, book, chapterIndex + 1, verseIndex + 1, text));
          }
        });
      });
    });
    return results.slice(0, 220);
  }

  function parseReference(pack, query) {
    const clean = query.trim().replace(/\s+/g, " ");
    const match = clean.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (!match) return null;
    const bookNeedle = normalizeSearch(match[1]);
    const book = pack.books.find((candidate) => normalizeSearch(candidate.name).startsWith(bookNeedle)
      || normalizeSearch(candidate.id).startsWith(bookNeedle));
    if (!book) return null;
    const chapter = Number(match[2]);
    const verse = match[3] ? Number(match[3]) : null;
    if (!book.chapters[chapter - 1]) return null;
    return { book, chapter, verse };
  }

  function makePassage(pack, book, chapter, verse, text) {
    const bareRef = `${book.name} ${chapter}:${verse}`;
    return {
      packId: pack.id,
      bookId: book.id,
      book: book.name,
      chapter,
      verse,
      bareRef,
      ref: withTranslationAbbreviation(bareRef, pack.id),
      text,
    };
  }

  function currentBook(pack) {
    return pack.books.find((book) => book.id === state.settings.bookId) || pack.books[0];
  }

  function openBibleLocation(location) {
    setBiblePanel(true, false);
    const manifestItem = getManifest().find((pack) => pack.id === location.packId);
    if (manifestItem) {
      state.settings.bibleLanguage = manifestItem.languageCode || manifestItem.language;
      els.languageSelect.value = state.settings.bibleLanguage;
      fillTranslations();
      state.settings.biblePackId = location.packId;
      els.translationSelect.value = location.packId;
    }
    state.settings.bookId = location.bookId;
    state.settings.chapter = location.chapter;
    highlightedVerse = { ...location };
    els.bibleSearch.value = "";
    saveState();
    renderBible();
  }

  function setBiblePanel(open, render = true) {
    els.biblePanel.hidden = !open;
    els.appView.classList.toggle("bible-open", open);
    if (open && render) renderBible();
    renderInspector();
  }

  async function loadPack(packId) {
    if (window.BIBLE_PACKS?.[packId]) return window.BIBLE_PACKS[packId];
    if (loadedPackPromises.has(packId)) return loadedPackPromises.get(packId);
    const manifestItem = getManifest().find((pack) => pack.id === packId);
    if (!manifestItem) throw new Error("missing manifest entry");
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `./bibles/${manifestItem.file || `${packId}.js`}?v=20260524bx`;
      script.onload = () => {
        const pack = window.BIBLE_PACKS?.[packId];
        if (pack) resolve(pack);
        else reject(new Error("pack did not register"));
      };
      script.onerror = () => reject(new Error("file missing"));
      document.body.appendChild(script);
    });
    loadedPackPromises.set(packId, promise);
    return promise;
  }

  function getManifest() {
    return Array.isArray(window.BIBLE_MANIFEST) ? window.BIBLE_MANIFEST : [];
  }

  function fillFontSizeOptions() {
    if (!els.fontSizeInput) return;
    els.fontSizeInput.innerHTML = "";
    [12, 14, 16, 18, 20, 24, 28, 32, 40, 48].forEach((size) => {
      const option = document.createElement("option");
      option.value = String(size);
      option.textContent = String(size);
      els.fontSizeInput.appendChild(option);
    });
  }

  function translationAbbreviation(packId) {
    const known = {
      "eng-web": "WEB",
      russyn: "СИН",
      "eng-asv": "ASV",
      engbsb: "BSB",
      engnet: "NET",
      "eng-kjv": "KJV",
      "spa-rv1909": "RV1909",
      spablm: "SFB",
      "fra-lsg1910": "LSG",
      fra_fob: "OST",
      "deu-luther1912": "LUT",
      deuelo: "ELB",
      "ita-riveduta1927": "RIV",
      ita1885: "DIO",
      "ukr-kulish": "КУЛ",
      ukr1996: "BJU",
      ukrfb: "УВБ",
      "cmn-cu89s": "CUV",
      cmnswcb: "WCB",
      porbrbsl: "WPB",
      porbr2018: "BLV",
      "lat-vulgate": "VUL",
      ces1613: "BKR",
    };
    if (known[packId]) return known[packId];
    const pack = getManifest().find((item) => item.id === packId);
    if (!pack?.translation) return "";
    const match = pack.translation.match(/\b[A-Z0-9]{2,8}\b/g);
    if (match?.length) return match[0];
    return pack.translation
      .split(/[\s,()-]+/)
      .filter(Boolean)
      .slice(0, 4)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  function withTranslationAbbreviation(ref, packId) {
    const base = String(ref || "").replace(/\s+\([^)]+\)\s*$/, "").trim();
    const abbr = translationAbbreviation(packId);
    return abbr ? `${base} (${abbr})` : base;
  }

  function createSeedState() {
    const boards = [];
    const home = createHomeBoard();
    boards.push(home);

    const genesis = createBoard("board-genesis-family", "Genesis Family Tree", "home");
    addFamilyLine(genesis, [
      "Adam", "Seth", "Enosh", "Kenan", "Mahalalel", "Jared", "Enoch", "Methuselah", "Lamech", "Noah",
    ], -760, -120);
    genesis.nodes.push(makeNode({ id: "eve", title: "Eve", text: "Mother of all living.", x: -760, y: -330, style: { lineColor: palette.green } }));
    genesis.nodes.push(makeNode({ id: "cain", title: "Cain", text: "Son of Adam and Eve.", x: -520, y: -330, style: { lineColor: palette.red } }));
    genesis.nodes.push(makeNode({ id: "abel", title: "Abel", text: "Son of Adam and Eve.", x: -280, y: -330, style: { lineColor: palette.gold } }));
    genesis.nodes.push(makeNode({ id: "shem", title: "Shem", text: "Son of Noah.", x: 1120, y: -330, style: { lineColor: palette.blue } }));
    genesis.nodes.push(makeNode({ id: "ham", title: "Ham", text: "Son of Noah.", x: 1360, y: -330, style: { lineColor: palette.gold } }));
    genesis.nodes.push(makeNode({ id: "japheth", title: "Japheth", text: "Son of Noah.", x: 1600, y: -330, style: { lineColor: palette.green } }));
    genesis.links.push(link("adam", "eve"), link("adam", "cain"), link("adam", "abel"), link("noah", "shem"), link("noah", "ham"), link("noah", "japheth"));
    boards.push(genesis);

    const patriarchs = createBoard("board-patriarchs", "Abraham to Israel", "home");
    const people = [
      ["terah", "Terah", -680, -220],
      ["abraham", "Abraham", -420, -220],
      ["sarah", "Sarah", -420, -420],
      ["hagar", "Hagar", -160, -420],
      ["ishmael", "Ishmael", -160, -220],
      ["isaac", "Isaac", -140, 20],
      ["rebekah", "Rebekah", -140, 220],
      ["jacob", "Jacob / Israel", 150, 20],
      ["esau", "Esau", 150, 220],
      ["leah", "Leah", 430, -220],
      ["rachel", "Rachel", 430, 20],
      ["sons", "Twelve sons of Israel", 720, -90],
    ];
    people.forEach(([nodeId, title, x, y]) => patriarchs.nodes.push(makeNode({ id: nodeId, title, text: "", x, y })));
    patriarchs.links.push(
      link("terah", "abraham"),
      link("abraham", "isaac"),
      link("sarah", "isaac"),
      link("hagar", "ishmael"),
      link("isaac", "jacob"),
      link("isaac", "esau"),
      link("rebekah", "jacob"),
      link("jacob", "sons"),
      link("leah", "sons"),
      link("rachel", "sons"),
    );
    boards.push(patriarchs);

    const jesus = createBoard("board-jesus-genealogy", "Jesus Genealogy - Matthew 1", "home");
    addFamilyLine(jesus, [
      "Abraham", "Isaac", "Jacob", "Judah", "Perez", "Hezron", "Ram", "Amminadab", "Nahshon", "Salmon",
      "Boaz", "Obed", "Jesse", "David", "Solomon", "Rehoboam", "Abijah", "Asa", "Jehoshaphat", "Joram",
      "Uzziah", "Jotham", "Ahaz", "Hezekiah", "Manasseh", "Amon", "Josiah", "Jeconiah", "Shealtiel",
      "Zerubbabel", "Abiud", "Eliakim", "Azor", "Zadok", "Achim", "Eliud", "Eleazar", "Matthan",
      "Jacob", "Joseph", "Jesus",
    ], -1200, -240, 220, 150);
    boards.push(jesus);

    const meetings = createBoard("board-meetings", "Meetings and Covenants", "home");
    [
      ["God and Noah", "Genesis 6-9: covenant and preservation.", -650, -260, palette.blue],
      ["Abraham and Melchizedek", "Genesis 14: priest-king of Salem blesses Abram.", -330, -80, palette.gold],
      ["Moses and Pharaoh", "Exodus: deliverance conflict before the exodus.", 10, -260, palette.red],
      ["Ruth and Boaz", "Ruth: redemption, kindness, and David's line.", 330, -80, palette.green],
      ["David and Jonathan", "1 Samuel: covenant friendship.", 650, -260, palette.blue],
      ["Jesus and Nicodemus", "John 3: new birth and God's love.", -330, 210, palette.green],
      ["Jesus and the Samaritan woman", "John 4: living water offered across barriers.", 10, 390, palette.gold],
      ["Paul and Ananias", "Acts 9: calling, healing, and mission.", 360, 210, palette.red],
    ].forEach(([title, text, x, y, color], index) => {
      meetings.nodes.push(makeNode({ id: `meeting-${index}`, title, text, x, y, w: 285, style: { lineColor: color } }));
    });
    meetings.links.push(link("meeting-0", "meeting-1"), link("meeting-1", "meeting-3"), link("meeting-3", "meeting-4"), link("meeting-5", "meeting-6"), link("meeting-5", "meeting-7"));
    boards.push(meetings);

    home.nodes.push(
      folderNode("Genesis Family Tree", "Adam to Noah, with first family branches.", "board-genesis-family", -520, -180),
      folderNode("Abraham to Israel", "Patriarchs, spouses, and the tribes.", "board-patriarchs", -160, 80),
      folderNode("Jesus Genealogy", "Matthew 1 line from Abraham to Christ.", "board-jesus-genealogy", 220, -180),
      folderNode("Meetings and Covenants", "Important encounters you can expand.", "board-meetings", 600, 80),
      makeNode({
        title: "Drag Bible verses here",
        text: "Open Bible from the bottom bar, choose any book and chapter, then drag a verse onto the board.",
        x: -190,
        y: -360,
        w: 380,
        style: { fill: "#ffffff", lineColor: palette.green },
      }),
    );
    home.links.push(link(home.nodes[0].id, home.nodes[1].id), link(home.nodes[1].id, home.nodes[2].id), link(home.nodes[2].id, home.nodes[3].id));

    return normalize({
      settings: {
        bibleLanguage: getManifest()[0]?.languageCode || "eng",
        biblePackId: getManifest()[0]?.id || "eng-web",
        bookId: "GEN",
        chapter: 1,
        bibleFontSize: 22,
      },
      boards,
    });
  }

  function createHomeBoard() {
    return { id: "home", name: "Home", parentId: null, nodes: [], links: [] };
  }

  function createBoard(idValue, name, parentId) {
    return { id: idValue, name, parentId, nodes: [], links: [] };
  }

  function addFamilyLine(board, names, x, y, stepX = 240, stepY = 165) {
    names.forEach((name, index) => {
      const row = Math.floor(index / 10);
      const column = index % 10;
      const nodeId = slug(name, index);
      board.nodes.push(makeNode({
        id: nodeId,
        title: name,
        text: row === 0 ? "Genealogy line." : "",
        x: x + column * stepX,
        y: y + row * stepY,
        w: 200,
        style: { lineColor: index % 3 === 0 ? palette.blue : index % 3 === 1 ? palette.green : palette.gold },
      }));
      if (index > 0) board.links.push(link(slug(names[index - 1], index - 1), nodeId));
    });
  }

  function folderNode(title, text, boardId, x, y) {
    return makeNode({
      type: "folder",
      title,
      text,
      boardId,
      x,
      y,
      w: 310,
      h: 140,
      style: { fill: "#fff6df", lineColor: palette.gold },
    });
  }

  function makeNode(input = {}) {
    const node = {
      id: input.id || id("node"),
      type: input.type || "card",
      title: input.title || "Untitled",
      text: input.text || "",
      image: input.image || "",
      ref: input.ref || "",
      bible: input.bible || null,
      boardId: input.boardId || "",
      x: finite(input.x, 0),
      y: finite(input.y, 0),
      w: finite(input.w, 280),
      h: finite(input.h, 130),
      style: {
        fill: palette.paper,
        textColor: palette.ink,
        lineColor: palette.blue,
        fontSize: 14,
        ...(input.style || {}),
      },
    };
    normalizeNode(node);
    return node;
  }

  function link(from, to, label = "") {
    return { id: id("link"), from, to, label, color: palette.blue };
  }

  function nodeCenter(node) {
    return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
  }

  function nodeEdgePoint(node, toward, padding = 0, centerOverride = null) {
    const centerX = node.x + node.w / 2;
    const centerY = node.y + node.h / 2;
    const originX = centerOverride?.x ?? centerX;
    const originY = centerOverride?.y ?? centerY;
    const dx = toward.x - originX;
    const dy = toward.y - originY;
    if (!dx && !dy) return { x: centerX, y: centerY, side: "right" };
    const halfWidth = node.w / 2 + padding;
    const halfHeight = node.h / 2 + padding;
    const bounds = {
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: centerY - halfHeight,
      bottom: centerY + halfHeight,
    };
    const hits = [];
    if (dx) {
      const leftT = (bounds.left - originX) / dx;
      const leftY = originY + dy * leftT;
      if (leftT >= 0 && leftY >= bounds.top && leftY <= bounds.bottom) {
        hits.push({ t: leftT, x: bounds.left, y: leftY, side: "left" });
      }
      const rightT = (bounds.right - originX) / dx;
      const rightY = originY + dy * rightT;
      if (rightT >= 0 && rightY >= bounds.top && rightY <= bounds.bottom) {
        hits.push({ t: rightT, x: bounds.right, y: rightY, side: "right" });
      }
    }
    if (dy) {
      const topT = (bounds.top - originY) / dy;
      const topX = originX + dx * topT;
      if (topT >= 0 && topX >= bounds.left && topX <= bounds.right) {
        hits.push({ t: topT, x: topX, y: bounds.top, side: "top" });
      }
      const bottomT = (bounds.bottom - originY) / dy;
      const bottomX = originX + dx * bottomT;
      if (bottomT >= 0 && bottomX >= bounds.left && bottomX <= bounds.right) {
        hits.push({ t: bottomT, x: bottomX, y: bounds.bottom, side: "bottom" });
      }
    }
    if (hits.length) {
      const preferredSide = Math.abs(toward.x - centerX) >= Math.abs(toward.y - centerY)
        ? (toward.x >= centerX ? "right" : "left")
        : (toward.y >= centerY ? "bottom" : "top");
      hits.sort((a, b) => a.t - b.t);
      const minT = hits[0].t;
      const hit = hits.find((candidate) => Math.abs(candidate.t - minT) < 0.02 && candidate.side === preferredSide) || hits[0];
      return { x: hit.x, y: hit.y, side: hit.side };
    }
    const ratioX = Math.abs(toward.x - centerX) / halfWidth;
    const ratioY = Math.abs(toward.y - centerY) / halfHeight;
    const scale = 1 / Math.max(ratioX, ratioY);
    const side = ratioX >= ratioY
      ? (toward.x >= centerX ? "right" : "left")
      : (toward.y >= centerY ? "bottom" : "top");
    return {
      x: centerX + (toward.x - centerX) * scale,
      y: centerY + (toward.y - centerY) * scale,
      side,
    };
  }

  function connectionPath(x1, y1, x2, y2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  function connectionNormal(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: -dy / length,
      y: dx / length,
    };
  }

  function stablePairNormal(a, b) {
    if (a.x < b.x - 1) return connectionNormal(a, b);
    if (a.x > b.x + 1) return connectionNormal(b, a);
    if (a.y <= b.y) return connectionNormal(a, b);
    return connectionNormal(b, a);
  }

  function curvedLinkGeometry(start, end, normal, offset = 0, endSideOverride = null) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy) || 1;
    const arrowLength = Math.min(LINK_ARROW_LENGTH, Math.max(14, distance * 0.2));
    const arrowHalf = Math.min(LINK_ARROW_HALF, Math.max(6, arrowLength * 0.34));
    const startVector = sideVector(start.side);
    const endVector = sideVector(endSideOverride || end.side);
    const bend = Math.min(Math.max(distance * 0.28, 42), 168);
    const spread = Math.min(54, Math.abs(offset) * 0.55);
    const controlA = {
      x: start.x + (startVector.x * bend) + (normal.x * spread),
      y: start.y + (startVector.y * bend) + (normal.y * spread),
    };
    const shaftEnd = {
      x: end.x + endVector.x * arrowLength,
      y: end.y + endVector.y * arrowLength,
    };
    const controlB = {
      x: shaftEnd.x + (endVector.x * bend),
      y: shaftEnd.y + (endVector.y * bend),
    };
    const tip = {
      x: end.x,
      y: end.y,
    };
    const overlayStartT = distance > 360 ? 0.86 : distance > 180 ? 0.8 : 0.74;
    return {
      controlA,
      controlB,
      direction: {
        x: -endVector.x,
        y: -endVector.y,
      },
      tip,
      arrowLength,
      arrowHalf,
      shaftEnd,
      overlayStartT,
    };
  }

  function buildArrowGeometry(tip, direction, length = LINK_ARROW_LENGTH, halfWidth = LINK_ARROW_HALF, side = "right") {
    const sideNormal = sideVector(side);
    const dirX = sideNormal.x || (sideNormal.y ? 0 : (direction.x || 1));
    const dirY = sideNormal.y || (sideNormal.x ? 0 : (direction.y || 0));
    const inwardX = -dirX;
    const inwardY = -dirY;
    const baseX = tip.x - inwardX * length;
    const baseY = tip.y - inwardY * length;
    const tangentX = -inwardY;
    const tangentY = inwardX;
    const left = {
      x: baseX + tangentX * halfWidth,
      y: baseY + tangentY * halfWidth,
    };
    const right = {
      x: baseX - tangentX * halfWidth,
      y: baseY - tangentY * halfWidth,
    };
    const tipPoint = { x: tip.x, y: tip.y };
    const shaftPoint = {
      x: baseX,
      y: baseY,
    };
    return {
      path: `M ${tipPoint.x} ${tipPoint.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z`,
      shaftPoint,
    };
  }

  function sideVector(side) {
    switch (side) {
      case "left": return { x: -1, y: 0 };
      case "right": return { x: 1, y: 0 };
      case "top": return { x: 0, y: -1 };
      case "bottom": return { x: 0, y: 1 };
      default: return { x: 1, y: 0 };
    }
  }

  function cubicPoint(start, controlA, controlB, end, t) {
    const mt = 1 - t;
    return {
      x: (mt * mt * mt * start.x)
        + (3 * mt * mt * t * controlA.x)
        + (3 * mt * t * t * controlB.x)
        + (t * t * t * end.x),
      y: (mt * mt * mt * start.y)
        + (3 * mt * mt * t * controlA.y)
        + (3 * mt * t * t * controlB.y)
        + (t * t * t * end.y),
    };
  }

  function cubicTailPath(start, controlA, controlB, end, t) {
    const p01 = lerpPoint(start, controlA, t);
    const p12 = lerpPoint(controlA, controlB, t);
    const p23 = lerpPoint(controlB, end, t);
    const p012 = lerpPoint(p01, p12, t);
    const p123 = lerpPoint(p12, p23, t);
    const p0123 = lerpPoint(p012, p123, t);
    return `M ${p0123.x} ${p0123.y} C ${p123.x} ${p123.y}, ${p23.x} ${p23.y}, ${end.x} ${end.y}`;
  }

  function lerpPoint(a, b, t) {
    return {
      x: a.x + ((b.x - a.x) * t),
      y: a.y + ((b.y - a.y) * t),
    };
  }

  function pathForBoard(board) {
    const names = [];
    let cursor = board;
    while (cursor) {
      names.unshift(cursor.name);
      cursor = cursor.parentId ? state.boards.find((item) => item.id === cursor.parentId) : null;
    }
    return names;
  }

  function applyTextStyle(element, style) {
    element.style.fontSize = `${style.fontSize || 14}px`;
    element.style.fontWeight = style.bold ? "800" : "400";
    element.style.fontStyle = style.italic ? "italic" : "normal";
    element.style.textDecoration = style.underline ? "underline" : "none";
    element.style.color = style.textColor || palette.ink;
  }

  function liveEditableSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const anchor = selection.anchorNode;
      if (anchor instanceof Node) {
        const editableRoot = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
        const editable = editableRoot?.closest?.(".node-title, .node-body, .rich-editor");
        if (editable && editable.contentEditable === "true") {
          const nodeId = editable.closest(".jam-node")?.dataset.id || editable.dataset.nodeId;
          const node = nodeId ? currentBoard().nodes.find((item) => item.id === nodeId) : selectedNode();
          if (node) return { selection, editable, node };
        }
      }
    }
    return null;
  }

  function savedInspectorSelection() {
    const node = selectedNode();
    const editable = savedInspectorEditorId === "nodeTitleInput" ? els.nodeTitleInput : els.nodeTextInput;
    if (!node || !savedInspectorRange || savedInspectorNodeId !== node.id || !editable) return null;
    return {
      editable,
      node,
      range: savedInspectorRange.cloneRange(),
      source: "inspector-memory",
    };
  }

  function currentEditableSelection() {
    return liveEditableSelection() || restoreInspectorSelection();
  }

  function applyStyleMap(style, patch) {
    Object.entries(patch).forEach(([key, value]) => {
      style[key] = value;
    });
  }

  function cascadeSelectionPatch(root, patch) {
    applyStyleMap(root.style, patch);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let current = walker.nextNode();
    while (current) {
      if (current instanceof HTMLElement || current instanceof SVGElement) applyStyleMap(current.style, patch);
      current = walker.nextNode();
    }
  }

  function applySelectionPatch(current, patch) {
    const range = current.range || (current.selection?.rangeCount ? current.selection.getRangeAt(0) : null);
    if (!range || range.collapsed) return false;
    const fragment = range.extractContents();
    const wrapper = document.createElement("span");
    wrapper.appendChild(fragment);
    cascadeSelectionPatch(wrapper, patch);
    range.insertNode(wrapper);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    if (current.selection) {
      current.selection.removeAllRanges();
      current.selection.addRange(nextRange);
    }
    savedInspectorRange = nextRange.cloneRange();
    savedInspectorNodeId = current.node.id;
    savedInspectorEditorId = current.editable.id || "nodeTextInput";
    savedInspectorFormat = readInspectorTextFormat(current.node, nextRange);
    return true;
  }

  function applyInlineTextCommand(command, value = null) {
    const current = currentEditableSelection();
    if (!current) return false;
    const { editable, node } = current;
    editable.focus({ preventScroll: true });
    let applied = false;
    if (command === "foreColor" && value) {
      applied = applySelectionPatch(current, { color: value });
    } else if (command === "bold") {
      const format = readInspectorTextFormat(node, current.range || current.selection?.getRangeAt(0));
      applied = applySelectionPatch(current, { fontWeight: format.bold ? "400" : "800" });
    } else if (command === "italic") {
      const format = readInspectorTextFormat(node, current.range || current.selection?.getRangeAt(0));
      applied = applySelectionPatch(current, { fontStyle: format.italic ? "normal" : "italic" });
    } else if (command === "underline") {
      const format = readInspectorTextFormat(node, current.range || current.selection?.getRangeAt(0));
      applied = applySelectionPatch(current, { textDecoration: format.underline ? "none" : "underline" });
    } else {
      return false;
    }
    if (!applied) return false;
    storeEditableContent(node, editable);
    saveState();
    renderBoard();
    syncInspectorTextControls(node);
    return true;
  }

  function applyInlineFontSize(value, allowSavedSelection = true) {
    const current = allowSavedSelection ? currentEditableSelection() : liveEditableSelection();
    if (!current) return false;
    const { editable, node } = current;
    const size = normalizeFontSize(node, value);
    editable.focus({ preventScroll: true });
    if (!applySelectionPatch(current, { fontSize: `${size}px` })) return false;
    storeEditableContent(node, editable);
    saveState();
    renderBoard();
    syncInspectorTextControls(node);
    return true;
  }

  function enableInlineEdit(node, editable) {
    document.querySelectorAll(".node-title[contenteditable='true'], .node-body[contenteditable='true']").forEach((element) => {
      if (element !== editable) {
        const parentId = element.closest(".jam-node")?.dataset.id;
        const parentNode = parentId ? currentBoard().nodes.find((item) => item.id === parentId) : null;
        disableInlineEdit(parentNode, element);
      }
    });
    selectOnly(node.id);
    editable.contentEditable = "true";
    editable.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function disableInlineEdit(node, editable) {
    if (!editable || editable.contentEditable !== "true") return;
    editable.contentEditable = "false";
    if (!node) return;
    storeEditableContent(node, editable);
    saveState();
    renderInspector();
  }

  function pastePlainText(event) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  function storeEditableContent(node, editable) {
    if (!node || !editable) return;
    if (editable.classList.contains("node-title") || editable.id === "nodeTitleInput") {
      node.title = editable.innerText.trim() || "Untitled";
      node.titleHtml = editable.innerHTML || plainTextToHtml(node.title);
      return;
    }
    node.text = editable.innerText;
    node.textHtml = editable.innerHTML || plainTextToHtml(node.text);
  }

  function plainTextToHtml(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }

  function normalizeSearch(value) {
    return String(value).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function slug(name, index) {
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "node"}-${index}`;
  }

  function id(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
  }

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }
})();
