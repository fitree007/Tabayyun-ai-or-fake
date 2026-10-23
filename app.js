/**
 * Main Application Logic for "AI • จริง • บิดเบือน" Interactive Game
 */

/* ==========================================================================
   1. Modern Web Guidance: Top-Layer Exit & Light-Dismiss Fallbacks
   ========================================================================== */
let supportsDisplayTransition;
function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay();
}

async function closeTopLayer(element) {
  if (!element || !element.open) return;
  if (!supportsTopLayerExit()) {
    element.setAttribute('data-closing', '');
    const animations = element.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
    }
    if (!element.hasAttribute('data-closing')) return;
    element.removeAttribute('data-closing');
  }
  element.close();
}

function setupDialogEnhancements(dialog) {
  if (!dialog) return;

  // Route native cancel (Esc / closedby) through closeTopLayer
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTopLayer(dialog);
  });

  // Fallback for browsers without native <dialog closedby="any"> support
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      closeTopLayer(dialog);
    });
  }
}

/* ==========================================================================
   2. Button Metadata & Game State
   ========================================================================== */
const CHOICE_META = {
  ai: { id: 'ai', label: 'AI', subLabel: 'สร้างด้วย AI', icon: '' },
  real: { id: 'real', label: 'จริง', subLabel: 'ภาพ/วิดีโอจริง', icon: '' },
  manipulated: { id: 'manipulated', label: 'บิดเบือน', subLabel: 'ตัดต่อ / ดัดแปลง', icon: '' },
  left: { id: 'left', label: 'ฝั่งซ้าย คือ AI', subLabel: 'เลือกการ์ดซ้าย', icon: '' },
  right: { id: 'right', label: 'ฝั่งขวา คือ AI', subLabel: 'เลือกการ์ดขวา', icon: '' },
};

const SETTINGS_KEY = 'airt.settings.v1';

const state = {
  questions: [],
  currentIndex: 0,
  score: 0,
  streak: 0,
  answeredCount: 0,
  isAnswered: false,
  loupeEnabled: false,
  coverFit: false,
  sfxOn: true,
  sfxVolume: 0.7,
  videoSoundOn: true,
  videoVolume: 0.8,
  timerOption: 0, // 0 = off, 10 = 10s, 15 = 15s, 20 = 20s
  timerRemaining: 0,
  timerInterval: null,
  activeObjectUrls: [],
  resizeObservers: [],
  user: null, // signed-in staff member (online mode)
};

/* ==========================================================================
   3. DOM References
   ========================================================================== */
const els = {
  progressBadge: document.getElementById('progressBadge'),
  scoreValue: document.getElementById('scoreValue'),
  streakValue: document.getElementById('streakValue'),
  streakPill: document.getElementById('streakPill'),
  btnTimerToggle: document.getElementById('btnTimerToggle'),
  timerModeLabel: document.getElementById('timerModeLabel'),
  sfxToggle: document.getElementById('sfxToggle'),
  sfxVolume: document.getElementById('sfxVolume'),
  sfxVolumeOut: document.getElementById('sfxVolumeOut'),
  videoSoundToggle: document.getElementById('videoSoundToggle'),
  videoVolume: document.getElementById('videoVolume'),
  videoVolumeOut: document.getElementById('videoVolumeOut'),
  btnMuteAll: document.getElementById('btnMuteAll'),
  btnTestSound: document.getElementById('btnTestSound'),
  btnExportPack: document.getElementById('btnExportPack'),
  inputImportPack: document.getElementById('inputImportPack'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  btnOpenManager: document.getElementById('btnOpenManager'),
  btnEditCurrent: document.getElementById('btnEditCurrent'),
  btnDeleteInForm: document.getElementById('btnDeleteInForm'),
  loginDialog: document.getElementById('loginDialog'),
  btnCloseLogin: document.getElementById('btnCloseLogin'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginError: document.getElementById('loginError'),
  btnLoginSubmit: document.getElementById('btnLoginSubmit'),
  staffChip: document.getElementById('staffChip'),
  staffEmail: document.getElementById('staffEmail'),
  btnSignOut: document.getElementById('btnSignOut'),
  busyToast: document.getElementById('busyToast'),
  busyToastText: document.getElementById('busyToastText'),

  questionTitle: document.getElementById('questionTitle'),
  questionSubtitle: document.getElementById('questionSubtitle'),
  timerWrapper: document.getElementById('timerWrapper'),
  timerFill: document.getElementById('timerFill'),
  timerSeconds: document.getElementById('timerSeconds'),

  mediaStage: document.getElementById('mediaStage'),
  btnLoupeToggle: document.getElementById('btnLoupeToggle'),
  loupeStateText: document.getElementById('loupeStateText'),
  btnFitToggle: document.getElementById('btnFitToggle'),
  fitStateText: document.getElementById('fitStateText'),

  btnPrevQuestion: document.getElementById('btnPrevQuestion'),
  btnSkipQuestion: document.getElementById('btnSkipQuestion'),
  answerButtonsContainer: document.getElementById('answerButtonsContainer'),

  feedbackBanner: document.getElementById('feedbackBanner'),
  feedbackStatusText: document.getElementById('feedbackStatusText'),
  feedbackExplanationText: document.getElementById('feedbackExplanationText'),
  btnNextAfterAnswer: document.getElementById('btnNextAfterAnswer'),

  managerDialog: document.getElementById('managerDialog'),
  btnCloseManager: document.getElementById('btnCloseManager'),
  questionForm: document.getElementById('questionForm'),
  editQuestionId: document.getElementById('editQuestionId'),
  formSectionTitle: document.getElementById('formSectionTitle'),
  inputLayoutMode: document.getElementById('inputLayoutMode'),
  inputTitle: document.getElementById('inputTitle'),
  inputMediaFile: document.getElementById('inputMediaFile'),
  secondMediaGroup: document.getElementById('secondMediaGroup'),
  inputMediaFileB: document.getElementById('inputMediaFileB'),
  enabledButtonsGroup: document.getElementById('enabledButtonsGroup'),
  inputCorrectAnswer: document.getElementById('inputCorrectAnswer'),
  inputExplanation: document.getElementById('inputExplanation'),
  btnCancelEdit: document.getElementById('btnCancelEdit'),
  totalQuestionsCount: document.getElementById('totalQuestionsCount'),
  inputBatchFiles: document.getElementById('inputBatchFiles'),
  btnRestoreSamples: document.getElementById('btnRestoreSamples'),
  btnClearAllQuestions: document.getElementById('btnClearAllQuestions'),
  questionsListContainer: document.getElementById('questionsListContainer'),

  summaryDialog: document.getElementById('summaryDialog'),
  btnCloseSummary: document.getElementById('btnCloseSummary'),
  summaryTrophyIcon: document.getElementById('summaryTrophyIcon'),
  summaryHeadline: document.getElementById('summaryHeadline'),
  summarySubtext: document.getElementById('summarySubtext'),
  btnRestartGame: document.getElementById('btnRestartGame'),
  btnSummaryOpenManager: document.getElementById('btnSummaryOpenManager'),
};

/* ==========================================================================
   4. Initialization & Question Loading
   ========================================================================== */
const isRemote = () => window.APP_MODE === 'remote';
/** Local mode: anyone can edit. Online mode: only a signed-in staff member. */
const canEdit = () => !isRemote() || Boolean(state.user);

async function initApp() {
  setupDialogEnhancements(els.managerDialog);
  setupDialogEnhancements(els.summaryDialog);
  setupDialogEnhancements(els.loginDialog);
  loadSettings();
  bindEvents();
  syncSoundUI();

  window.onStoreBusy = (on, text) => {
    els.busyToast.hidden = !on;
    if (on) els.busyToastText.textContent = text || 'กำลังทำงาน…';
  };
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason && e.reason.message;
    if (msg) alert(msg);
  });

  if (isRemote()) {
    state.user = await window.authApi.getUser().catch(() => null);
    window.authApi.onChange((user) => {
      state.user = user;
      applyEditPermissions();
      if (!user && els.managerDialog.open) closeTopLayer(els.managerDialog);
    });
  }
  applyEditPermissions();

  let stored = [];
  try {
    stored = await window.questionStore.getAllQuestions();
    if ((!stored || stored.length === 0) && canEdit()) {
      const samples = window.getDefaultSampleQuestions();
      await window.questionStore.saveAllQuestions(samples);
      stored = await window.questionStore.getAllQuestions();
    }
  } catch (err) {
    alert(err.message || 'โหลดโจทย์ไม่สำเร็จ');
  }

  state.questions = stored || [];
  state.currentIndex = 0;
  renderCurrentQuestion(false);
  renderQuestionsManagerList();
}

/** Show/hide host-only controls depending on sign-in state (online mode). */
function applyEditPermissions() {
  const edit = canEdit();
  const label = els.btnOpenManager.querySelector('span');
  if (label) label.textContent = edit ? 'เพิ่มรูป/วิดีโอ' : 'เข้าสู่ระบบสตาฟ';
  els.btnEditCurrent.hidden = !edit;
  els.staffChip.hidden = !(isRemote() && state.user);
  els.staffEmail.textContent = state.user ? state.user.email : '';
}

function openLogin() {
  els.loginError.hidden = true;
  els.loginDialog.showModal();
  els.loginEmail.focus();
}

/** Opens the manager (or the login form first when online and signed out). */
function openManager() {
  if (!canEdit()) {
    openLogin();
    return false;
  }
  renderQuestionsManagerList();
  els.managerDialog.showModal();
  return true;
}

/* ==========================================================================
   4b. Sound settings (SFX + video audio), persisted per browser
   ========================================================================== */
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (typeof saved.sfxOn === 'boolean') state.sfxOn = saved.sfxOn;
    if (typeof saved.sfxVolume === 'number') state.sfxVolume = saved.sfxVolume;
    if (typeof saved.videoSoundOn === 'boolean') state.videoSoundOn = saved.videoSoundOn;
    if (typeof saved.videoVolume === 'number') state.videoVolume = saved.videoVolume;
    if (saved.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (_) {
    /* storage unavailable — keep defaults */
  }
}

function saveSettings() {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        sfxOn: state.sfxOn,
        sfxVolume: state.sfxVolume,
        videoSoundOn: state.videoSoundOn,
        videoVolume: state.videoVolume,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      })
    );
  } catch (_) {
    /* ignore */
  }
}

function syncSoundUI() {
  window.sfx.setEnabled(state.sfxOn);
  window.sfx.setVolume(state.sfxVolume);

  els.sfxToggle.checked = state.sfxOn;
  els.sfxVolume.value = Math.round(state.sfxVolume * 100);
  els.sfxVolumeOut.textContent = `${Math.round(state.sfxVolume * 100)}%`;
  els.videoSoundToggle.checked = state.videoSoundOn;
  els.videoVolume.value = Math.round(state.videoVolume * 100);
  els.videoVolumeOut.textContent = `${Math.round(state.videoVolume * 100)}%`;

  const allMuted = !state.sfxOn && !state.videoSoundOn;
  document.body.classList.toggle('all-muted', allMuted);
  els.btnMuteAll.textContent = allMuted ? 'เปิดเสียงทั้งหมด' : 'ปิดเสียงทั้งหมด';

  document.querySelectorAll('video.media-element').forEach(applyVideoAudio);
}

/** Apply the host's video-audio settings to a <video>. Compare mode stays muted. */
function applyVideoAudio(video) {
  const wantMuted = video.dataset.forceMuted === '1' || !state.videoSoundOn || state.videoVolume === 0;
  video._skipVolumeSync = performance.now() + 250; // ignore the volumechange events we cause
  video.muted = wantMuted;
  video.volume = state.videoVolume;
}

/** true / false when the clip's audio track can be determined, null when unknown */
function detectVideoHasAudio(video) {
  try {
    if (typeof video.mozHasAudio === 'boolean') return video.mozHasAudio;
    if (video.audioTracks && typeof video.audioTracks.length === 'number') {
      return video.audioTracks.length > 0;
    }
    const capture = video.captureStream || video.mozCaptureStream;
    if (capture) {
      const stream = capture.call(video);
      const n = stream.getAudioTracks().length;
      stream.getTracks().forEach((t) => t.stop());
      return n > 0;
    }
  } catch (_) {
    /* fall through */
  }
  return null;
}

function cleanupObjectUrlsAndObservers() {
  state.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.activeObjectUrls = [];
  state.resizeObservers.forEach((ro) => ro.disconnect());
  state.resizeObservers = [];
}

function resolveMediaSource(blobOrData, fallbackUrl) {
  if (blobOrData instanceof Blob) {
    const objUrl = URL.createObjectURL(blobOrData);
    state.activeObjectUrls.push(objUrl);
    return objUrl;
  }
  return fallbackUrl || '';
}

/* ==========================================================================
   5. Rendering the Active Question & Magnifying Loupe (interactive-content-reveal)
   ========================================================================== */
function renderCurrentQuestion(playRevealSfx = true) {
  stopTimer();
  cleanupObjectUrlsAndObservers();
  state.isAnswered = false;
  els.feedbackBanner.hidden = true;

  if (state.questions.length === 0) {
    els.progressBadge.textContent = '0 / 0';
    els.questionTitle.textContent = 'ยังไม่มีโจทย์คำถามในระบบ';
    els.questionSubtitle.textContent = 'กดปุ่ม "➕ อัปโหลดภาพ/วิดีโอ & ตั้งค่าโจทย์" ด้านบนขวาเพื่อเพิ่มไฟล์ภาพหรือวิดีโอของคุณได้เลย!';
    els.mediaStage.innerHTML = '';
    els.answerButtonsContainer.innerHTML = '';
    return;
  }

  if (state.currentIndex >= state.questions.length) {
    state.currentIndex = 0;
  }
  if (state.currentIndex < 0) {
    state.currentIndex = state.questions.length - 1;
  }

  const q = state.questions[state.currentIndex];
  els.progressBadge.textContent = `ข้อที่ ${state.currentIndex + 1} / ${state.questions.length}`;

  // Default smart titles if custom title wasn't specified
  const defaultTitle =
    q.layoutMode === 'compare'
      ? 'Which image is AI? (ฝั่งไหนคือ AI?)'
      : q.mediaType === 'video'
      ? 'คลิปวิดีโอนี้... AI, จริง หรือ บิดเบือน?'
      : 'ภาพนี้... AI, จริง หรือ บิดเบือน?';

  els.questionTitle.textContent = q.title || defaultTitle;
  els.questionSubtitle.textContent =
    q.subtitle ||
    (q.layoutMode === 'compare'
      ? 'มี 1 ฝั่งที่สร้างด้วย AI และอีก 1 ฝั่งเป็นของจริง คลิกที่ภาพหรือปุ่มด้านขวาเพื่อตอบ'
      : 'สังเกตรายละเอียดให้ดี แล้วกดปุ่มคำตอบด้านขวา');

  els.mediaStage.className = q.layoutMode === 'compare' ? 'media-stage mode-compare' : 'media-stage mode-single';

  // Build media card(s)
  els.mediaStage.innerHTML = '';
  const srcA = resolveMediaSource(q.mediaBlob, q.mediaUrl);
  const cardA = createMediaCardElement({
    mediaType: q.mediaType || 'image',
    src: srcA,
    badgeText: q.layoutMode === 'compare' ? 'ฝั่งซ้าย (A)' : q.mediaType === 'video' ? 'วิดีโอ' : 'ภาพนิ่ง',
    choiceKey: q.layoutMode === 'compare' ? 'left' : null,
    muteVideo: q.layoutMode === 'compare',
  });
  els.mediaStage.appendChild(cardA);

  if (q.layoutMode === 'compare') {
    const srcB = resolveMediaSource(q.mediaBlobB, q.mediaUrlB);
    const cardB = createMediaCardElement({
      mediaType: q.mediaTypeB || 'image',
      src: srcB,
      badgeText: 'ฝั่งขวา (B)',
      choiceKey: 'right',
      muteVideo: true,
    });
    els.mediaStage.appendChild(cardB);
  }

  renderAnswerButtons(q);

  if (playRevealSfx) {
    window.sfx.playQuestionReveal();
  }

  if (state.timerOption > 0) {
    startTimer(state.timerOption);
  }
}

function createMediaCardElement({ mediaType, src, badgeText, choiceKey, muteVideo = false }) {
  const card = document.createElement('div');
  card.className = 'media-card';
  if (state.loupeEnabled && mediaType === 'image') {
    card.classList.add('loupe-enabled');
  }
  if (choiceKey) {
    card.dataset.cardChoice = choiceKey;
  }

  // Top-left badge
  const badges = document.createElement('div');
  badges.className = 'card-badges';
  const badge = document.createElement('span');
  badge.className = 'card-badge';
  badge.textContent = badgeText;
  badges.appendChild(badge);
  card.appendChild(badges);

  if (mediaType === 'video') {
    const video = document.createElement('video');
    video.className = `media-element ${state.coverFit ? 'cover-fit' : ''}`;
    video.controls = true;
    video.controlsList = 'nodownload';
    video.playsInline = true;
    video.loop = true;
    video.preload = 'auto';
    if (muteVideo) video.dataset.forceMuted = '1';
    applyVideoAudio(video);
    video.src = src;
    card.appendChild(video);

    // Show whether this clip carries sound (host-only hint)
    const audioBadge = document.createElement('span');
    audioBadge.className = 'card-badge';
    audioBadge.hidden = true;
    badges.appendChild(audioBadge);
    video.addEventListener('loadedmetadata', () => {
      const hasAudio = detectVideoHasAudio(video);
      if (hasAudio === null) return;
      audioBadge.hidden = false;
      audioBadge.textContent = hasAudio ? 'มีเสียง' : 'ไม่มีเสียง';
      audioBadge.classList.toggle('audio-on', hasAudio);
    });

    // Keep the host's panel in sync when they use the video's own volume control
    video.addEventListener('volumechange', () => {
      if (performance.now() < (video._skipVolumeSync || 0)) return;
      if (video.dataset.forceMuted === '1') return;
      state.videoSoundOn = !video.muted && video.volume > 0;
      if (video.volume > 0) state.videoVolume = video.volume;
      syncSoundUI();
      saveSettings();
    });

    // Autoplay with sound can be blocked by the browser; fall back to muted + a one-tap hint
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        video._skipVolumeSync = performance.now() + 400;
        video.muted = true;
        video.play().catch(() => {});
        if (state.videoSoundOn && video.dataset.forceMuted !== '1') {
          const hint = document.createElement('button');
          hint.type = 'button';
          hint.className = 'unmute-hint';
          hint.textContent = 'แตะเพื่อเปิดเสียงวิดีโอ';
          hint.addEventListener('click', (ev) => {
            ev.stopPropagation();
            applyVideoAudio(video);
            video.play().catch(() => {});
            hint.remove();
          });
          card.appendChild(hint);
        }
      });
    }
  } else {
    const img = document.createElement('img');
    img.className = `media-element ${state.coverFit ? 'cover-fit' : ''}`;
    img.src = src;
    img.alt = 'โจทย์ภาพสำหรับทายว่าเป็น AI, จริง หรือ บิดเบือน';
    card.appendChild(img);

    // Interactive Content Reveal Zoom Layer (Sightengine 🔍 Magnifying Glass)
    const revealLayer = document.createElement('div');
    revealLayer.className = 'zoom-reveal-layer';

    const zoomImg = document.createElement('img');
    zoomImg.className = `zoom-reveal-img ${state.coverFit ? 'cover-fit' : ''}`;
    zoomImg.src = src;
    zoomImg.alt = '';
    zoomImg.setAttribute('aria-hidden', 'true');
    revealLayer.appendChild(zoomImg);

    const loupeRing = document.createElement('div');
    loupeRing.className = 'loupe-ring';
    loupeRing.setAttribute('aria-hidden', 'true');

    card.appendChild(revealLayer);
    card.appendChild(loupeRing);

    // Track pointer coordinates using ResizeObserver as guided in interactive-content-reveal
    let rect = card.getBoundingClientRect();
    const ro = new ResizeObserver(() => {
      rect = card.getBoundingClientRect();
    });
    ro.observe(card);
    state.resizeObservers.push(ro);

    card.addEventListener('pointermove', (e) => {
      if (!rect.width || !rect.height) {
        rect = card.getBoundingClientRect();
      }
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  }

  // In 2-media compare mode, clicking directly on one of the two cards submits that choice
  if (choiceKey) {
    card.addEventListener('click', (e) => {
      // Ignore if clicking native video controls
      if (e.target.tagName === 'VIDEO') return;
      if (!state.isAnswered) {
        submitAnswer(choiceKey);
      }
    });
  }

  return card;
}

/* ==========================================================================
   6. Rendering Customizable Answer Buttons (AI / จริง / บิดเบือน)
   ========================================================================== */
function renderAnswerButtons(q) {
  els.answerButtonsContainer.innerHTML = '';

  const buttonKeys =
    q.layoutMode === 'compare'
      ? ['left', 'right']
      : (q.enabledButtons && q.enabledButtons.length > 0
          ? q.enabledButtons
          : ['ai', 'real', 'manipulated']);

  buttonKeys.forEach((key, index) => {
    const meta = CHOICE_META[key];
    if (!meta) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-answer';
    btn.dataset.choice = key;

    btn.innerHTML = `
      <span class="key-hint">${index + 1}</span>
      <span class="answer-label">${meta.label}</span>
      <span class="answer-sub">${meta.subLabel}</span>
    `;

    btn.addEventListener('pointerenter', () => {
      if (!state.isAnswered) window.sfx.playTick(860);
    });

    btn.addEventListener('click', () => {
      if (!state.isAnswered) {
        submitAnswer(key);
      }
    });

    els.answerButtonsContainer.appendChild(btn);
  });
}

/* ==========================================================================
   7. Handling Player Answer & Exciting Sound Effects Reveal
   ========================================================================== */
function submitAnswer(selectedChoice) {
  if (state.isAnswered || state.questions.length === 0) return;
  state.isAnswered = true;
  stopTimer();

  const q = state.questions[state.currentIndex];
  const isCorrect = selectedChoice === q.correctAnswer;

  state.answeredCount += 1;
  if (isCorrect) {
    state.score += 1;
    state.streak += 1;
    window.sfx.playCorrect();
  } else {
    state.streak = 0;
    window.sfx.playWrong();
  }

  updateScoreHud();

  // Highlight Answer Buttons
  const allBtns = els.answerButtonsContainer.querySelectorAll('.btn-answer');
  allBtns.forEach((btn) => {
    btn.disabled = true;
    const choice = btn.dataset.choice;
    if (choice === q.correctAnswer) {
      btn.classList.add('is-correct-answer');
    } else if (choice === selectedChoice && !isCorrect) {
      btn.classList.add('is-wrong-picked');
    }
  });

  // Highlight Media Cards
  const allCards = els.mediaStage.querySelectorAll('.media-card');
  allCards.forEach((card) => {
    card.classList.add('locked');
    const cardChoice = card.dataset.cardChoice;

    if (q.layoutMode === 'compare') {
      if (cardChoice === q.correctAnswer) {
        card.classList.add('correct-choice');
        appendCardResultStamp(card, '✓ AI (คำตอบที่ถูก)', true);
      } else if (cardChoice === selectedChoice && !isCorrect) {
        card.classList.add('wrong-choice');
        appendCardResultStamp(card, '✕ ภาพจริง', false);
      }
    } else {
      card.classList.add(isCorrect ? 'correct-choice' : 'wrong-choice');
      const correctMeta = CHOICE_META[q.correctAnswer] || { icon: '✨', label: q.correctAnswer };
      appendCardResultStamp(
        card,
        `${isCorrect ? '✓ ถูกต้อง:' : '✕ เฉลยคือ:'} ${correctMeta.label}`,
        isCorrect
      );
    }
  });

  // Show Feedback & Explanation Banner
  const correctMeta = CHOICE_META[q.correctAnswer] || { icon: '', label: q.correctAnswer };
  els.feedbackBanner.hidden = false;
  els.feedbackBanner.className = `feedback-banner ${isCorrect ? 'correct' : 'wrong'}`;

  if (selectedChoice === 'timeout') {
    els.feedbackStatusText.textContent = `หมดเวลา! เฉลยคือ "${correctMeta.label}"`;
  } else if (isCorrect) {
    els.feedbackStatusText.textContent = `ถูกต้อง! คำตอบคือ "${correctMeta.label}"`;
  } else {
    els.feedbackStatusText.textContent = `ผิด! คำตอบที่ถูกคือ "${correctMeta.label}"`;
  }

  els.feedbackExplanationText.textContent =
    q.explanation ||
    `ข้อนี้เฉลยคือ "${correctMeta.label}" (${correctMeta.subLabel || ''}) กดปุ่มถัดไปเพื่อเล่นข้อต่อไปได้เลย!`;

  const isLast = state.currentIndex === state.questions.length - 1;
  els.btnNextAfterAnswer.textContent = isLast ? 'ดูสรุปคะแนน' : 'ข้อถัดไป';
}

function appendCardResultStamp(card, text, isPositive) {
  const existing = card.querySelector('.card-result-badge');
  if (existing) existing.remove();

  const stamp = document.createElement('div');
  stamp.className = `card-result-badge ${isPositive ? 'is-correct' : 'is-wrong'}`;
  stamp.textContent = text;
  card.appendChild(stamp);
}

function updateScoreHud() {
  els.scoreValue.textContent = `${state.score} / ${state.answeredCount}`;
  els.streakValue.textContent = state.streak;
  els.streakPill.classList.toggle('streak-active', state.streak >= 2);
}

function goToNextQuestionOrSummary() {
  if (state.questions.length === 0) return;
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    renderCurrentQuestion(true);
  } else {
    showGameSummary();
  }
}

function showGameSummary() {
  window.sfx.playApplauseVictory();
  const total = state.questions.length;
  const pct = total > 0 ? Math.round((state.score / total) * 100) : 0;

  els.summaryTrophyIcon.textContent = `${pct}%`;
  if (pct >= 80) {
    els.summaryHeadline.textContent = 'สุดยอดนักจับผิด AI!';
  } else if (pct >= 50) {
    els.summaryHeadline.textContent = 'สายตาเฉียบคมไม่เบา';
  } else {
    els.summaryHeadline.textContent = 'AI ยุคนี้เนียนจนเกือบแยกไม่ออก';
  }

  els.summarySubtext.textContent = `ตอบถูก ${state.score} จาก ${total} ข้อ`;
  els.summaryDialog.showModal();
}

/* ==========================================================================
   8. Countdown Timer with Tense Tick-Tock SFX
   ========================================================================== */
function startTimer(seconds) {
  stopTimer();
  state.timerRemaining = seconds;
  els.timerWrapper.hidden = false;
  updateTimerUI(seconds, seconds);

  state.timerInterval = setInterval(() => {
    state.timerRemaining -= 1;
    updateTimerUI(state.timerRemaining, seconds);

    if (state.timerRemaining > 0) {
      window.sfx.playTimerTick(state.timerRemaining <= 4);
    } else {
      stopTimer();
      submitAnswer('timeout');
    }
  }, 1000);
}

function updateTimerUI(remaining, total) {
  const pct = Math.max(0, (remaining / total) * 100);
  els.timerFill.style.width = `${pct}%`;
  els.timerSeconds.textContent = `${remaining}s`;
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  els.timerWrapper.hidden = true;
}

/* ==========================================================================
   9. Question Manager (Upload Images & Videos, Configure Buttons)
   ========================================================================== */
function updateFormModeUI() {
  const isCompare = els.inputLayoutMode.value === 'compare';
  els.secondMediaGroup.hidden = !isCompare;
  els.enabledButtonsGroup.hidden = isCompare;

  const currentCorrect = els.inputCorrectAnswer.value;
  if (isCompare) {
    els.inputCorrectAnswer.innerHTML = `
      <option value="left">ฝั่งซ้าย (A) คือ AI</option>
      <option value="right">ฝั่งขวา (B) คือ AI</option>
    `;
  } else {
    els.inputCorrectAnswer.innerHTML = `
      <option value="ai">AI (สร้างด้วย AI)</option>
      <option value="real">จริง (ภาพจริง / คลิปจริง)</option>
      <option value="manipulated">บิดเบือน (ตัดต่อ / ดัดแปลง)</option>
    `;
    if (['ai', 'real', 'manipulated'].includes(currentCorrect)) {
      els.inputCorrectAnswer.value = currentCorrect;
    }
  }
}

async function handleSaveQuestion(e) {
  e.preventDefault();

  const editId = els.editQuestionId.value;
  const existing = editId ? state.questions.find((q) => q.id === editId) : null;

  const layoutMode = els.inputLayoutMode.value;
  const fileA = els.inputMediaFile.files[0];
  const fileB = els.inputMediaFileB.files[0];

  if (!existing && !fileA) {
    alert('กรุณาเลือกไฟล์ ภาพ หรือ วิดีโอ อย่างน้อย 1 ไฟล์ครับ');
    return;
  }

  if (layoutMode === 'compare' && !existing && !fileB) {
    alert('สำหรับโหมดเปรียบเทียบ 2 สื่อ กรุณาเลือกไฟล์ฝั่งขวา (ไฟล์ที่ 2) ด้วยครับ');
    return;
  }

  const checkedBtns = Array.from(
    document.querySelectorAll('input[name="formEnabledBtn"]:checked')
  ).map((chk) => chk.value);

  const correctAnswer = els.inputCorrectAnswer.value;

  if (layoutMode === 'single') {
    if (checkedBtns.length === 0) {
      alert('กรุณาเลือกปุ่มคำตอบที่ต้องการให้แสดงอย่างน้อย 1 ปุ่มครับ');
      return;
    }
    // Automatically ensure the correct answer button is included in the visible buttons
    if (!checkedBtns.includes(correctAnswer)) {
      checkedBtns.push(correctAnswer);
    }
  }

  const mediaTypeA = fileA
    ? fileA.type.startsWith('video/')
      ? 'video'
      : 'image'
    : existing?.mediaType || 'image';

  const mediaTypeB = fileB
    ? fileB.type.startsWith('video/')
      ? 'video'
      : 'image'
    : existing?.mediaTypeB || 'image';

  const newQuestion = {
    id: existing ? existing.id : `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    order: existing ? existing.order : state.questions.length,
    title: els.inputTitle.value.trim(),
    subtitle: '',
    layoutMode,
    mediaType: mediaTypeA,
    mediaBlob: fileA || existing?.mediaBlob || null,
    mediaUrl: fileA ? '' : existing?.mediaUrl || '',
    mediaTypeB,
    mediaBlobB: fileB || existing?.mediaBlobB || null,
    mediaUrlB: fileB ? '' : existing?.mediaUrlB || '',
    enabledButtons: layoutMode === 'compare' ? ['left', 'right'] : checkedBtns,
    correctAnswer,
    explanation: els.inputExplanation.value.trim(),
  };

  await window.questionStore.saveQuestion(newQuestion);
  state.questions = await window.questionStore.getAllQuestions();

  resetQuestionForm();
  renderQuestionsManagerList();

  // Jump straight to the newly created/edited question
  const idx = state.questions.findIndex((item) => item.id === newQuestion.id);
  if (idx !== -1) {
    state.currentIndex = idx;
  }
  renderCurrentQuestion(true);
}

function resetQuestionForm() {
  els.questionForm.reset();
  els.editQuestionId.value = '';
  els.formSectionTitle.textContent = 'เพิ่มข้อคำถามใหม่';
  els.btnCancelEdit.hidden = true;
  els.btnDeleteInForm.hidden = true;
  updateFormModeUI();
}

function populateFormForEdit(question) {
  els.editQuestionId.value = question.id;
  els.formSectionTitle.textContent = `แก้ไขข้อคำถาม:${question.title || 'ไม่มีชื่อหัวข้อ'}`;
  els.inputLayoutMode.value = question.layoutMode || 'single';
  updateFormModeUI();

  els.inputTitle.value = question.title || '';
  els.inputCorrectAnswer.value = question.correctAnswer || 'ai';
  els.inputExplanation.value = question.explanation || '';

  const enabled = question.enabledButtons || ['ai', 'real', 'manipulated'];
  document.querySelectorAll('input[name="formEnabledBtn"]').forEach((chk) => {
    chk.checked = enabled.includes(chk.value);
  });

  els.btnCancelEdit.hidden = false;
  els.btnDeleteInForm.hidden = false;
  els.questionForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function renderQuestionsManagerList() {
  els.totalQuestionsCount.textContent = state.questions.length;
  els.questionsListContainer.innerHTML = '';

  state.questions.forEach((q, idx) => {
    const row = document.createElement('div');
    row.className = 'question-row';

    const previewUrl = resolveMediaSource(q.mediaBlob, q.mediaUrl);
    const correctMeta = CHOICE_META[q.correctAnswer] || { icon: '✨', label: q.correctAnswer };
    const btnLabels = (q.enabledButtons || ['ai', 'real', 'manipulated'])
      .map((k) => CHOICE_META[k]?.label || k)
      .join(' / ');

    row.innerHTML = `
      <div class="question-row-preview">
        <div class="thumb-box">
          ${
            q.mediaType === 'video'
              ? `<video src="${previewUrl}" muted playsinline></video>`
              : `<img src="${previewUrl}" alt="" />`
          }
        </div>
        <div class="question-row-info">
          <div class="question-row-title">
            ข้อที่ ${idx + 1}: ${q.title || (q.mediaType === 'video' ? 'โจทย์คลิปวิดีโอ' : 'โจทย์ภาพนิ่ง')}
          </div>
          <div class="question-row-meta">
            <span class="tag-mini">${q.mediaType === 'video' ? 'วิดีโอ' : 'ภาพ'}</span>
            <span class="tag-mini">ปุ่ม: ${btnLabels}</span>
            <span class="tag-mini tag-answer">เฉลย: ${correctMeta.label}</span>
          </div>
        </div>
      </div>
      <div class="question-row-actions">
        ${
          q.layoutMode === 'compare'
            ? ''
            : `<select class="form-select answer-select" data-action="answer" aria-label="เฉลยของข้อนี้" title="ตั้งเฉลยของข้อนี้">
                <option value="ai"${q.correctAnswer === 'ai' ? ' selected' : ''}>เฉลย: AI</option>
                <option value="real"${q.correctAnswer === 'real' ? ' selected' : ''}>เฉลย: จริง</option>
                <option value="manipulated"${q.correctAnswer === 'manipulated' ? ' selected' : ''}>เฉลย: บิดเบือน</option>
              </select>`
        }
        <button type="button" class="btn-nav" data-action="play" title="เล่นข้อนี้ทันที">เล่น</button>
        <button type="button" class="btn-nav" data-action="edit" title="แก้ไขปุ่ม/เฉลย">แก้ไข</button>
        <button type="button" class="btn-nav btn-danger" data-action="delete" title="ลบข้อนี้">ลบ</button>
      </div>
    `;

    const answerSelect = row.querySelector('[data-action="answer"]');
    if (answerSelect) {
      answerSelect.addEventListener('change', async () => {
        q.correctAnswer = answerSelect.value;
        if (!q.enabledButtons.includes(q.correctAnswer)) q.enabledButtons.push(q.correctAnswer);
        await window.questionStore.saveQuestion(q);
        renderQuestionsManagerList();
        if (state.questions[state.currentIndex]?.id === q.id) renderCurrentQuestion(false);
      });
    }

    row.querySelector('[data-action="play"]').addEventListener('click', () => {
      state.currentIndex = idx;
      renderCurrentQuestion(true);
      closeTopLayer(els.managerDialog);
    });

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      populateFormForEdit(q);
    });

    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      await window.questionStore.deleteQuestion(q.id);
      state.questions = await window.questionStore.getAllQuestions();
      if (state.currentIndex >= state.questions.length) {
        state.currentIndex = Math.max(0, state.questions.length - 1);
      }
      renderQuestionsManagerList();
      renderCurrentQuestion(false);
    });

    els.questionsListContainer.appendChild(row);
  });
}

/**
 * Batch quick upload multiple images/videos at once!
 * Detects answer automatically from filename if named with 'ai', 'real', 'จริง', 'บิดเบือน', 'fake'
 */
async function handleBatchFilesUpload(fileList) {
  if (!fileList || fileList.length === 0) return;
  const files = Array.from(fileList).filter(
    (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
  );
  if (files.length === 0) return;

  const baseOrder = state.questions.length;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isVideo = file.type.startsWith('video/');
    const lowerName = file.name.toLowerCase();

    let guessedAnswer = 'ai';
    if (lowerName.includes('real') || lowerName.includes('จริง') || lowerName.includes('true')) {
      guessedAnswer = 'real';
    } else if (
      lowerName.includes('manip') ||
      lowerName.includes('บิดเบือน') ||
      lowerName.includes('edit') ||
      lowerName.includes('ตัดต่อ')
    ) {
      guessedAnswer = 'manipulated';
    }

    const q = {
      id: `q-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      order: baseOrder + i,
      title: isVideo ? 'คลิปวิดีโอนี้... AI, จริง หรือ บิดเบือน?' : 'ภาพนี้... AI, จริง หรือ บิดเบือน?',
      subtitle: '',
      layoutMode: 'single',
      mediaType: isVideo ? 'video' : 'image',
      mediaBlob: file,
      mediaUrl: '',
      enabledButtons: ['ai', 'real', 'manipulated'],
      correctAnswer: guessedAnswer,
      explanation: `อัปโหลดจากไฟล์: ${file.name}`,
    };
    await window.questionStore.saveQuestion(q);
  }

  state.questions = await window.questionStore.getAllQuestions();
  state.currentIndex = baseOrder;
  renderQuestionsManagerList();
  renderCurrentQuestion(false);
  // Let the host confirm each file's answer right away (filename guess is only a default)
  if (!els.managerDialog.open) openManager();
  els.questionsListContainer.lastElementChild?.scrollIntoView({ block: 'end' });
}

/* ==========================================================================
   9b. Export / import a question pack (single JSON file, media embedded)
   ========================================================================== */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function exportQuestionPack() {
  if (state.questions.length === 0) {
    alert('ยังไม่มีโจทย์ให้ส่งออกครับ');
    return;
  }
  els.btnExportPack.disabled = true;
  try {
    const items = [];
    for (const q of state.questions) {
      const copy = { ...q };
      copy.mediaBlob = q.mediaBlob instanceof Blob ? await blobToDataUrl(q.mediaBlob) : null;
      copy.mediaBlobB = q.mediaBlobB instanceof Blob ? await blobToDataUrl(q.mediaBlobB) : null;
      items.push(copy);
    }
    const pack = { app: 'ai-real-or-true', version: 1, exportedAt: new Date().toISOString(), questions: items };
    const url = URL.createObjectURL(new Blob([JSON.stringify(pack)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ชุดโจทย์-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    alert('ส่งออกไม่สำเร็จ: ' + err.message);
  } finally {
    els.btnExportPack.disabled = false;
  }
}

async function importQuestionPack(file) {
  if (!file) return;
  try {
    const pack = JSON.parse(await file.text());
    if (pack.app !== 'ai-real-or-true' || !Array.isArray(pack.questions)) {
      throw new Error('ไฟล์นี้ไม่ใช่ชุดโจทย์ของเกมนี้');
    }
    const replace = confirm(
      `พบโจทย์ ${pack.questions.length} ข้อ\n\nกด OK = แทนที่โจทย์เดิมทั้งหมด\nกด Cancel = เพิ่มต่อท้ายโจทย์เดิม`
    );
    if (replace) await window.questionStore.clearAll();
    const base = replace ? 0 : state.questions.length;
    for (let i = 0; i < pack.questions.length; i++) {
      const q = pack.questions[i];
      q.id = `q-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      q.order = base + i;
      q.mediaBlob = q.mediaBlob ? await (await fetch(q.mediaBlob)).blob() : null;
      q.mediaBlobB = q.mediaBlobB ? await (await fetch(q.mediaBlobB)).blob() : null;
      await window.questionStore.saveQuestion(q);
    }
    state.questions = await window.questionStore.getAllQuestions();
    state.currentIndex = Math.min(base, state.questions.length - 1);
    renderQuestionsManagerList();
    renderCurrentQuestion(true);
  } catch (err) {
    alert('นำเข้าไม่สำเร็จ: ' + err.message);
  }
}

/* ==========================================================================
   10. Event Listeners & Keyboard Shortcuts
   ========================================================================== */
function bindEvents() {
  // Sightengine-style Magnifying Glass (🔍 OFF / ON) Toggle
  els.btnLoupeToggle.addEventListener('click', () => {
    state.loupeEnabled = !state.loupeEnabled;
    els.btnLoupeToggle.setAttribute('aria-pressed', String(state.loupeEnabled));
    els.loupeStateText.textContent = state.loupeEnabled ? 'ON' : 'OFF';
    window.sfx.playTick(state.loupeEnabled ? 1100 : 650);

    document.querySelectorAll('.media-card').forEach((card) => {
      const hasImage = card.querySelector('img.media-element');
      if (hasImage) {
        card.classList.toggle('loupe-enabled', state.loupeEnabled);
      }
    });
  });

  // Fit Mode Toggle (Cover vs Contain)
  els.btnFitToggle.addEventListener('click', () => {
    state.coverFit = !state.coverFit;
    els.btnFitToggle.setAttribute('aria-pressed', String(state.coverFit));
    els.fitStateText.textContent = state.coverFit ? 'เต็มกรอบ' : 'พอดีภาพ';
    window.sfx.playTick(800);

    document.querySelectorAll('.media-element, .zoom-reveal-img').forEach((el) => {
      el.classList.toggle('cover-fit', state.coverFit);
    });
  });

  // Navigation Prev / Skip / Next
  els.btnPrevQuestion.addEventListener('click', () => {
    if (state.questions.length === 0) return;
    state.currentIndex = (state.currentIndex - 1 + state.questions.length) % state.questions.length;
    renderCurrentQuestion(true);
  });

  els.btnSkipQuestion.addEventListener('click', () => {
    if (state.questions.length === 0) return;
    state.currentIndex = (state.currentIndex + 1) % state.questions.length;
    renderCurrentQuestion(true);
  });

  // Edit the question on screen (answer buttons shown, correct answer, media, delete all live in the form)
  els.btnEditCurrent.addEventListener('click', () => {
    const q = state.questions[state.currentIndex];
    if (!q || !openManager()) return;
    populateFormForEdit(q);
  });

  els.btnDeleteInForm.addEventListener('click', async () => {
    const id = els.editQuestionId.value;
    const idx = state.questions.findIndex((item) => item.id === id);
    const q = state.questions[idx];
    if (!q) return;
    if (!confirm(`ลบข้อที่ ${idx + 1}${q.title ? ` "${q.title}"` : ''} ออกจากชุดโจทย์ใช่หรือไม่?`)) return;
    await window.questionStore.deleteQuestion(q.id);
    state.questions = await window.questionStore.getAllQuestions();
    if (state.currentIndex >= state.questions.length) {
      state.currentIndex = Math.max(0, state.questions.length - 1);
    }
    resetQuestionForm();
    renderQuestionsManagerList();
    renderCurrentQuestion(false);
  });

  els.btnNextAfterAnswer.addEventListener('click', () => {
    goToNextQuestionOrSummary();
  });

  // Timer Toggle (Off -> 10s -> 15s -> 20s)
  const timerSteps = [0, 10, 15, 20];
  els.btnTimerToggle.addEventListener('click', () => {
    const idx = (timerSteps.indexOf(state.timerOption) + 1) % timerSteps.length;
    state.timerOption = timerSteps[idx];
    els.timerModeLabel.textContent = state.timerOption === 0 ? 'ปิด' : `${state.timerOption} วิ`;
    window.sfx.playTick(880);
    if (!state.isAnswered) {
      if (state.timerOption > 0) startTimer(state.timerOption);
      else stopTimer();
    }
  });

  // Sound settings: SFX on/off + volume, video audio on/off + volume
  els.sfxToggle.addEventListener('change', () => {
    state.sfxOn = els.sfxToggle.checked;
    syncSoundUI();
    saveSettings();
    if (state.sfxOn) window.sfx.playTick(1000);
  });

  els.sfxVolume.addEventListener('input', () => {
    state.sfxVolume = Number(els.sfxVolume.value) / 100;
    syncSoundUI();
  });
  els.sfxVolume.addEventListener('change', () => {
    saveSettings();
    window.sfx.playCorrect();
  });

  els.videoSoundToggle.addEventListener('change', () => {
    state.videoSoundOn = els.videoSoundToggle.checked;
    syncSoundUI();
    saveSettings();
  });

  els.videoVolume.addEventListener('input', () => {
    state.videoVolume = Number(els.videoVolume.value) / 100;
    if (state.videoVolume > 0) state.videoSoundOn = true;
    syncSoundUI();
  });
  els.videoVolume.addEventListener('change', saveSettings);

  const toggleMuteAll = () => {
    const allMuted = !state.sfxOn && !state.videoSoundOn;
    state.sfxOn = allMuted;
    state.videoSoundOn = allMuted;
    syncSoundUI();
    saveSettings();
  };
  els.btnMuteAll.addEventListener('click', toggleMuteAll);
  els.btnTestSound.addEventListener('click', () => window.sfx.playCorrect());

  // Dark / Light Theme Toggle
  els.btnThemeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    saveSettings();
    window.sfx.playTick(750);
  });

  // Share a question pack with other staff
  els.btnExportPack.addEventListener('click', exportQuestionPack);
  els.inputImportPack.addEventListener('change', (e) => {
    importQuestionPack(e.target.files[0]);
    e.target.value = '';
  });


  // Dialog Open/Close
  els.btnOpenManager.addEventListener('click', openManager);

  els.btnCloseLogin.addEventListener('click', () => closeTopLayer(els.loginDialog));
  els.btnSignOut.addEventListener('click', async () => {
    await window.authApi.signOut();
  });
  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.loginError.hidden = true;
    els.btnLoginSubmit.disabled = true;
    try {
      await window.authApi.signIn(els.loginEmail.value.trim(), els.loginPassword.value);
      els.loginPassword.value = '';
      await closeTopLayer(els.loginDialog);
      state.user = await window.authApi.getUser();
      applyEditPermissions();
      // Staff might have signed in to an empty database: offer the sample questions
      if (state.questions.length === 0) {
        try {
          await window.questionStore.saveAllQuestions(window.getDefaultSampleQuestions());
          state.questions = await window.questionStore.getAllQuestions();
          renderCurrentQuestion(false);
        } catch (_) {
          /* not staff, or offline — manager will show the reason on save */
        }
      }
      openManager();
    } catch (err) {
      els.loginError.textContent = err.message;
      els.loginError.hidden = false;
    } finally {
      els.btnLoginSubmit.disabled = false;
    }
  });

  els.btnCloseManager.addEventListener('click', () => {
    closeTopLayer(els.managerDialog);
  });

  els.btnCloseSummary.addEventListener('click', () => {
    closeTopLayer(els.summaryDialog);
  });

  els.btnRestartGame.addEventListener('click', () => {
    state.score = 0;
    state.streak = 0;
    state.answeredCount = 0;
    state.currentIndex = 0;
    updateScoreHud();
    closeTopLayer(els.summaryDialog);
    renderCurrentQuestion(true);
  });

  els.btnSummaryOpenManager.addEventListener('click', async () => {
    await closeTopLayer(els.summaryDialog);
    openManager();
  });

  // Question Manager Form Controls
  els.inputLayoutMode.addEventListener('change', updateFormModeUI);
  els.questionForm.addEventListener('submit', handleSaveQuestion);
  els.btnCancelEdit.addEventListener('click', resetQuestionForm);

  els.inputBatchFiles.addEventListener('change', (e) => {
    handleBatchFilesUpload(e.target.files);
    e.target.value = '';
  });

  els.btnRestoreSamples.addEventListener('click', async () => {
    const samples = window.getDefaultSampleQuestions();
    for (const s of samples) {
      await window.questionStore.saveQuestion(s);
    }
    state.questions = await window.questionStore.getAllQuestions();
    state.currentIndex = 0;
    renderQuestionsManagerList();
    renderCurrentQuestion(true);
  });

  els.btnClearAllQuestions.addEventListener('click', async () => {
    if (!confirm('ต้องการลบโจทย์คำถามทั้งหมดใช่หรือไม่?')) return;
    await window.questionStore.clearAll();
    state.questions = [];
    state.currentIndex = 0;
    renderQuestionsManagerList();
    renderCurrentQuestion(false);
  });

  // Drag & Drop files anywhere onto the Upload Card or Main Stage
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!canEdit()) return;
    if (e.dataTransfer?.files?.length > 0) {
      if (els.managerDialog.open) {
        els.inputMediaFile.files = e.dataTransfer.files;
      } else {
        handleBatchFilesUpload(e.dataTransfer.files);
      }
    }
  });

  // Keyboard Shortcuts for smooth hosting / playing
  window.addEventListener('keydown', (e) => {
    if (
      els.managerDialog.open ||
      els.summaryDialog.open ||
      els.loginDialog.open ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
    ) {
      return;
    }

    if (e.key.toLowerCase() === 'z') {
      els.btnLoupeToggle.click();
    } else if (e.key === '1' || e.key === '2' || e.key === '3') {
      const idx = parseInt(e.key, 10) - 1;
      const btns = els.answerButtonsContainer.querySelectorAll('.btn-answer:not(:disabled)');
      if (btns[idx]) btns[idx].click();
    } else if ((e.key === 'ArrowRight' || e.key === 'Enter') && state.isAnswered) {
      e.preventDefault();
      goToNextQuestionOrSummary();
    } else if (e.key.toLowerCase() === 'm') {
      els.btnMuteAll.click();
    } else if (e.key.toLowerCase() === 'd') {
      window.sfx.playDrumroll();
    } else if (e.key.toLowerCase() === 'h') {
      window.sfx.playHeartbeatSuspense();
    }
  });
}

document.addEventListener('DOMContentLoaded', initApp);
