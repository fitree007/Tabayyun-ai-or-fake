/**
 * "สาระน่ารู้" tab — a gallery of educational clips / images about AI.
 * Items: uploaded video, uploaded image, or a YouTube link.
 * Storage comes from window.learnStore (IndexedDB locally, Supabase when configured).
 * Relies on globals from app.js: canEdit, openLogin, applyVideoAudio, state, syncSoundUI,
 * saveSettings, setupDialogEnhancements, closeTopLayer.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = {
    gameView: document.querySelector('.game-main'),
    learnView: $('learnView'),
    tabs: document.querySelectorAll('.view-tab'),
    grid: $('learnGrid'),
    empty: $('learnEmpty'),
    count: $('learnCount'),
    btnAdd: $('btnAddLearn'),
    viewer: $('learnViewer'),
    viewerTitle: $('learnViewerTitle'),
    viewerMedia: $('learnViewerMedia'),
    viewerDesc: $('learnViewerDesc'),
    viewerPos: $('learnViewerPos'),
    btnPrev: $('btnLearnPrev'),
    btnNext: $('btnLearnNext'),
    btnCloseViewer: $('btnCloseLearnViewer'),
    formDialog: $('learnFormDialog'),
    formTitle: $('learnFormTitle'),
    form: $('learnForm'),
    editId: $('learnEditId'),
    inTitle: $('learnInputTitle'),
    inDesc: $('learnInputDesc'),
    inSource: $('learnInputSource'),
    fileGroup: $('learnFileGroup'),
    inFile: $('learnInputFile'),
    fileReq: $('learnFileReq'),
    fileHint: $('learnFileHint'),
    ytGroup: $('learnYoutubeGroup'),
    inYoutube: $('learnInputYoutube'),
    formError: $('learnFormError'),
    btnDelete: $('btnLearnDelete'),
    btnSave: $('btnLearnSave'),
    btnCloseForm: $('btnCloseLearnForm'),
  };

  const KIND_LABEL = { video: 'วิดีโอ', image: 'รูปภาพ', youtube: 'YouTube' };
  const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  let items = [];
  let loadError = '';
  let thumbUrls = [];
  let viewerUrl = null;
  let viewerIndex = -1;

  /* ---------- helpers ---------- */
  function parseYouTubeId(raw) {
    const text = (raw || '').trim();
    if (!text) return '';
    try {
      const u = new URL(text);
      const host = u.hostname.replace(/^www\.|^m\./, '');
      let id = '';
      if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
      else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
        else {
          const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
          if (m) id = m[1];
        }
      }
      return /^[\w-]{11}$/.test(id) ? id : '';
    } catch (_) {
      return '';
    }
  }

  function blobUrl(blob, bucket) {
    const url = URL.createObjectURL(blob);
    bucket.push(url);
    return url;
  }

  function sourceOf(item, bucket) {
    return item.mediaBlob instanceof Blob ? blobUrl(item.mediaBlob, bucket) : item.mediaUrl || '';
  }

  function updateAddButton() {
    const label = el.btnAdd.querySelector('span');
    el.btnAdd.hidden = false;
    if (label) label.textContent = canEdit() ? 'เพิ่มสาระน่ารู้' : 'เข้าสู่ระบบสตาฟ';
  }

  /* ---------- view switching ---------- */
  function showView(name) {
    const learn = name === 'learn';
    document.body.dataset.view = name;
    el.tabs.forEach((tab) => {
      const active = tab.dataset.view === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    el.gameView.hidden = learn;
    el.learnView.hidden = !learn;

    if (learn) {
      document.querySelectorAll('#mediaStage video').forEach((v) => v.pause());
      loadAndRender();
    } else {
      document.querySelectorAll('#mediaStage video').forEach((v) => v.play().catch(() => {}));
    }
    try {
      history.replaceState(null, '', learn ? '#learn' : location.pathname + location.search);
    } catch (_) {
      /* ignore */
    }
  }

  /* ---------- load + render ---------- */
  async function loadAndRender() {
    updateAddButton();
    try {
      items = await window.learnStore.getAllQuestions();
      loadError = '';
    } catch (err) {
      items = [];
      loadError = /learn_items/.test(err.message || '')
        ? 'ยังไม่ได้สร้างตารางสาระน่ารู้ในฐานข้อมูล — ให้สตาฟรันไฟล์ supabase/schema.sql ใหม่ใน Supabase SQL Editor'
        : err.message || 'โหลดไม่สำเร็จ';
    }
    render();
  }

  function render() {
    thumbUrls.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls = [];
    el.grid.innerHTML = '';
    updateAddButton();

    items.forEach((item, i) => el.grid.appendChild(buildCard(item, i)));

    el.count.textContent = items.length ? `${items.length} รายการ` : '';
    el.empty.hidden = items.length > 0;
    if (!items.length) {
      el.empty.textContent = loadError
        ? `โหลดสาระน่ารู้ไม่สำเร็จ: ${loadError}`
        : canEdit()
        ? 'ยังไม่มีสาระน่ารู้ กดปุ่ม "เพิ่มสาระน่ารู้" ด้านบนเพื่อเริ่มต้น'
        : 'ยังไม่มีสาระน่ารู้ในตอนนี้';
    }
  }

  function buildCard(item, index) {
    const card = document.createElement('div');
    card.className = 'learn-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `ดู: ${item.title}`);

    const thumb = document.createElement('div');
    thumb.className = 'learn-thumb';

    if (item.kind === 'youtube') {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = '';
      img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
      thumb.appendChild(img);
    } else if (item.kind === 'video') {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('aria-hidden', 'true');
      video.src = sourceOf(item, thumbUrls) + '#t=0.1';
      thumb.appendChild(video);
      // hover preview (muted)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        card.addEventListener('mouseenter', () => video.play().catch(() => {}));
        card.addEventListener('mouseleave', () => {
          video.pause();
          video.currentTime = 0.1;
        });
      }
    } else {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = '';
      img.src = sourceOf(item, thumbUrls);
      thumb.appendChild(img);
    }

    if (item.kind !== 'image') {
      const play = document.createElement('div');
      play.className = 'learn-play';
      play.innerHTML = `<span>${PLAY_SVG}</span>`;
      thumb.appendChild(play);
    }

    const kind = document.createElement('span');
    kind.className = 'learn-kind';
    kind.textContent = KIND_LABEL[item.kind] || 'สื่อ';
    thumb.appendChild(kind);
    card.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'learn-card-body';
    const title = document.createElement('div');
    title.className = 'learn-card-title';
    title.textContent = item.title;
    body.appendChild(title);
    if (item.description) {
      const desc = document.createElement('div');
      desc.className = 'learn-card-desc';
      desc.textContent = item.description;
      body.appendChild(desc);
    }
    card.appendChild(body);

    if (canEdit()) {
      const actions = document.createElement('div');
      actions.className = 'learn-card-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'แก้ไข';
      edit.addEventListener('click', (e) => {
        e.stopPropagation();
        openForm(item);
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'is-danger';
      del.textContent = 'ลบ';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteItem(item);
      });
      actions.append(edit, del);
      card.appendChild(actions);
    }

    card.addEventListener('click', () => openViewer(index));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openViewer(index);
      }
    });
    return card;
  }

  /* ---------- viewer ---------- */
  function clearViewerMedia() {
    el.viewerMedia.innerHTML = '';
    if (viewerUrl) {
      URL.revokeObjectURL(viewerUrl);
      viewerUrl = null;
    }
  }

  function openViewer(index) {
    if (!items.length) return;
    viewerIndex = (index + items.length) % items.length;
    const item = items[viewerIndex];

    clearViewerMedia();
    el.viewerTitle.textContent = item.title;
    el.viewerDesc.textContent = item.description || '';
    el.viewerPos.textContent = `${viewerIndex + 1} / ${items.length}`;
    el.btnPrev.disabled = el.btnNext.disabled = items.length < 2;

    if (item.kind === 'youtube') {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`;
      frame.title = item.title;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      el.viewerMedia.appendChild(frame);
    } else {
      const holder = [];
      const src = item.mediaBlob instanceof Blob ? blobUrl(item.mediaBlob, holder) : item.mediaUrl || '';
      viewerUrl = holder[0] || null;

      if (item.kind === 'video') {
        const video = document.createElement('video');
        video.className = 'media-element'; // so the sound panel (syncSoundUI) controls it too
        video.controls = true;
        video.controlsList = 'nodownload';
        video.playsInline = true;
        video.autoplay = true;
        applyVideoAudio(video);
        video.src = src;
        // keep the sound panel in sync with the video's own volume control
        video.addEventListener('volumechange', () => {
          if (performance.now() < (video._skipVolumeSync || 0)) return;
          state.videoSoundOn = !video.muted && video.volume > 0;
          if (video.volume > 0) state.videoVolume = video.volume;
          syncSoundUI();
          saveSettings();
        });
        el.viewerMedia.appendChild(video);
        const p = video.play();
        if (p && p.catch) {
          p.catch(() => {
            video._skipVolumeSync = performance.now() + 400;
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      } else {
        const img = document.createElement('img');
        img.src = src;
        img.alt = item.title;
        el.viewerMedia.appendChild(img);
      }
    }

    if (!el.viewer.open) el.viewer.showModal();
  }

  /* ---------- add / edit form (staff) ---------- */
  function syncSourceFields() {
    const yt = el.inSource.value === 'youtube';
    el.fileGroup.hidden = yt;
    el.ytGroup.hidden = !yt;
  }

  function openForm(item) {
    el.form.reset();
    el.formError.hidden = true;
    el.editId.value = item ? item.id : '';
    el.formTitle.textContent = item ? 'แก้ไขสาระน่ารู้' : 'เพิ่มสาระน่ารู้';
    el.btnDelete.hidden = !item;
    el.fileReq.hidden = Boolean(item);
    el.fileHint.textContent = item
      ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนไฟล์'
      : 'รองรับ JPG, PNG, WEBP, GIF, MP4, WEBM, MOV';
    if (item) {
      el.inTitle.value = item.title || '';
      el.inDesc.value = item.description || '';
      el.inSource.value = item.kind === 'youtube' ? 'youtube' : 'file';
      if (item.kind === 'youtube') el.inYoutube.value = `https://youtu.be/${item.youtubeId}`;
    }
    syncSourceFields();
    el.formDialog.showModal();
    el.inTitle.focus();
  }

  function formFail(message) {
    el.formError.textContent = message;
    el.formError.hidden = false;
  }

  async function onSubmit(e) {
    e.preventDefault();
    el.formError.hidden = true;

    const existing = el.editId.value ? items.find((it) => it.id === el.editId.value) : null;
    const title = el.inTitle.value.trim();
    if (!title) return formFail('กรุณาใส่ชื่อเรื่อง');

    const source = el.inSource.value;
    let kind;
    let youtubeId = '';
    let file = null;

    if (source === 'youtube') {
      youtubeId = parseYouTubeId(el.inYoutube.value);
      if (!youtubeId) return formFail('ลิงก์ YouTube ไม่ถูกต้อง (ลองคัดลอกลิงก์จากแถบที่อยู่หรือปุ่มแชร์ของ YouTube)');
      kind = 'youtube';
    } else {
      file = el.inFile.files[0] || null;
      if (file && !(file.type.startsWith('video/') || file.type.startsWith('image/'))) {
        return formFail('รองรับเฉพาะไฟล์วิดีโอหรือรูปภาพ');
      }
      const keepsOldFile = existing && existing.kind !== 'youtube';
      if (!file && !keepsOldFile) return formFail('กรุณาเลือกไฟล์วิดีโอหรือรูป');
      kind = file ? (file.type.startsWith('video/') ? 'video' : 'image') : existing.kind;
    }

    const keep = source === 'file' && !file && existing;
    const nextOrder = items.reduce((max, it) => Math.max(max, it.order ?? 0), -1) + 1;
    const item = {
      id: existing ? existing.id : `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order: existing ? existing.order : nextOrder,
      title,
      description: el.inDesc.value.trim(),
      kind,
      youtubeId,
      mediaBlob: file || (keep ? existing.mediaBlob || null : null),
      mediaUrl: file ? '' : keep ? existing.mediaUrl || '' : '',
      mediaBlobB: null,
      mediaUrlB: '',
    };

    el.btnSave.disabled = true;
    try {
      await window.learnStore.saveQuestion(item);
      await closeTopLayer(el.formDialog);
      await loadAndRender();
    } catch (err) {
      formFail(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      el.btnSave.disabled = false;
    }
  }

  async function deleteItem(item) {
    if (!confirm(`ลบ "${item.title}" ออกจากสาระน่ารู้ใช่หรือไม่?`)) return;
    try {
      await window.learnStore.deleteQuestion(item.id);
      if (el.formDialog.open) await closeTopLayer(el.formDialog);
      await loadAndRender();
    } catch (err) {
      alert(err.message || 'ลบไม่สำเร็จ');
    }
  }

  /* ---------- wiring ---------- */
  function init() {
    setupDialogEnhancements(el.viewer);
    setupDialogEnhancements(el.formDialog);

    el.tabs.forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));

    el.btnAdd.addEventListener('click', () => (canEdit() ? openForm(null) : openLogin()));
    el.inSource.addEventListener('change', syncSourceFields);
    el.form.addEventListener('submit', onSubmit);
    el.btnDelete.addEventListener('click', () => {
      const item = items.find((it) => it.id === el.editId.value);
      if (item) deleteItem(item);
    });
    el.btnCloseForm.addEventListener('click', () => closeTopLayer(el.formDialog));

    el.btnCloseViewer.addEventListener('click', () => closeTopLayer(el.viewer));
    el.viewer.addEventListener('close', clearViewerMedia);
    // belt-and-braces: never leave a playing clip behind a closed dialog
    new MutationObserver(() => {
      if (!el.viewer.open) clearViewerMedia();
    }).observe(el.viewer, { attributes: true, attributeFilter: ['open'] });
    el.btnPrev.addEventListener('click', () => openViewer(viewerIndex - 1));
    el.btnNext.addEventListener('click', () => openViewer(viewerIndex + 1));
    el.viewer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') openViewer(viewerIndex - 1);
      else if (e.key === 'ArrowRight') openViewer(viewerIndex + 1);
    });

    // app.js calls this when the staff sign in/out
    window.onEditPermissionsChanged = () => {
      updateAddButton();
      if (!el.learnView.hidden) render();
    };

    updateAddButton();
    if (location.hash === '#learn') showView('learn');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
