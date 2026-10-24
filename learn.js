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
    btnSignOut: $('btnLearnSignOut'),
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
    fbGroup: $('learnFacebookGroup'),
    inFacebook: $('learnInputFacebook'),
    inCover: $('learnInputCover'),
    coverHint: $('learnCoverHint'),
    viewerOpen: $('learnViewerOpen'),
    formError: $('learnFormError'),
    btnDelete: $('btnLearnDelete'),
    btnSave: $('btnLearnSave'),
    btnCloseForm: $('btnCloseLearnForm'),
  };

  const KIND_LABEL = { video: 'วิดีโอ', image: 'รูปภาพ', youtube: 'YouTube', facebook: 'Facebook' };
  const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const FB_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7H16l.6-4h-3.1V8.9c0-.6.3-.9.5-.9z"/></svg>';

  let items = [];
  let loadError = '';
  let thumbUrls = [];
  let viewerUrl = null;
  let viewerIndex = -1;

  /* ---------- helpers ---------- */
  const { parseYouTubeId, parseFacebookUrl, isVerticalFacebook, youtubeEmbedUrl, facebookEmbedUrl, youtubeThumb } =
    window.mediaLinks;

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
    el.btnSignOut.hidden = !(window.APP_MODE === 'remote' && state.user);
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
      document.querySelectorAll('#mediaStage video').forEach((v) => {
        v.dataset.resumeOnReturn = v.paused ? '' : '1'; // only resume what the host had playing
        v.pause();
      });
      loadAndRender();
    } else {
      document.querySelectorAll('#mediaStage video').forEach((v) => {
        if (v.dataset.resumeOnReturn === '1') v.play().catch(() => {});
        v.dataset.resumeOnReturn = '';
      });
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
      img.src = youtubeThumb(item.youtubeId);
      thumb.appendChild(img);
    } else if (item.kind === 'facebook') {
      const cover = sourceOf(item, thumbUrls);
      if (cover) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.alt = '';
        img.src = cover;
        thumb.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'learn-fb-placeholder';
        ph.innerHTML = `${FB_SVG}<span>${isVerticalFacebook(item.facebookUrl) ? 'Facebook Reel' : 'Facebook Video'}</span>`;
        thumb.appendChild(ph);
      }
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
    window.mediaLinks.setTextWithLinks(el.viewerDesc, item.description || '');
    el.viewerPos.textContent = `${viewerIndex + 1} / ${items.length}`;
    el.btnPrev.disabled = el.btnNext.disabled = items.length < 2;
    el.viewerMedia.classList.toggle('is-vertical', item.kind === 'facebook' && isVerticalFacebook(item.facebookUrl));

    // Always offer the original page: some Facebook clips can't be embedded by their owner's settings
    const openUrl =
      item.kind === 'facebook' ? item.facebookUrl : item.kind === 'youtube' ? `https://www.youtube.com/watch?v=${item.youtubeId}` : '';
    el.viewerOpen.hidden = !openUrl;
    if (openUrl) {
      el.viewerOpen.href = openUrl;
      el.viewerOpen.textContent = item.kind === 'facebook' ? 'เปิดใน Facebook ↗' : 'เปิดใน YouTube ↗';
    }

    if (item.kind === 'facebook') {
      const frame = document.createElement('iframe');
      frame.src = facebookEmbedUrl(item.facebookUrl, { autoplay: true });
      frame.title = item.title;
      frame.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
      frame.allowFullscreen = true;
      frame.scrolling = 'no';
      el.viewerMedia.appendChild(frame);
    } else if (item.kind === 'youtube') {
      const frame = document.createElement('iframe');
      frame.src = youtubeEmbedUrl(item.youtubeId, { autoplay: true });
      frame.title = item.title;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      watchEmbedAudio(frame); // volume / mute from the sound panel (app.js)
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
    const source = el.inSource.value;
    el.fileGroup.hidden = source !== 'file';
    el.ytGroup.hidden = source !== 'youtube';
    el.fbGroup.hidden = source !== 'facebook';
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
      el.inSource.value = item.kind === 'youtube' || item.kind === 'facebook' ? item.kind : 'file';
      if (item.kind === 'youtube') el.inYoutube.value = `https://youtu.be/${item.youtubeId}`;
      if (item.kind === 'facebook') el.inFacebook.value = item.facebookUrl || '';
    }
    el.coverHint.textContent =
      item && item.kind === 'facebook' && (item.mediaBlob || item.mediaUrl)
        ? 'มีภาพปกอยู่แล้ว — เลือกไฟล์ใหม่เฉพาะเมื่อต้องการเปลี่ยน'
        : 'Facebook ไม่ให้ดึงภาพปกอัตโนมัติ ใส่ภาพหน้าจอจากคลิปได้ ถ้าไม่ใส่จะแสดงการ์ดสีฟ้าแทน';
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
    let facebookUrl = '';
    let newBlob = null; // uploaded file (file source) or cover image (Facebook source)
    let keepOld = false; // keep the existing item's stored media

    if (source === 'youtube') {
      youtubeId = parseYouTubeId(el.inYoutube.value);
      if (!youtubeId) return formFail('ลิงก์ YouTube ไม่ถูกต้อง (ลองคัดลอกลิงก์จากแถบที่อยู่หรือปุ่มแชร์ของ YouTube)');
      kind = 'youtube';
    } else if (source === 'facebook') {
      facebookUrl = parseFacebookUrl(el.inFacebook.value);
      if (!facebookUrl) {
        return formFail('ลิงก์ Facebook ไม่ถูกต้อง — ต้องเป็นลิงก์ Reel หรือวิดีโอ เช่น facebook.com/reel/ตัวเลข');
      }
      newBlob = el.inCover.files[0] || null;
      if (newBlob && !newBlob.type.startsWith('image/')) return formFail('ภาพปกต้องเป็นไฟล์รูปภาพ');
      keepOld = !newBlob && Boolean(existing) && existing.kind === 'facebook';
      kind = 'facebook';
    } else {
      newBlob = el.inFile.files[0] || null;
      if (newBlob && !(newBlob.type.startsWith('video/') || newBlob.type.startsWith('image/'))) {
        return formFail('รองรับเฉพาะไฟล์วิดีโอหรือรูปภาพ');
      }
      keepOld = !newBlob && Boolean(existing) && (existing.kind === 'video' || existing.kind === 'image');
      if (!newBlob && !keepOld) return formFail('กรุณาเลือกไฟล์วิดีโอหรือรูป');
      kind = newBlob ? (newBlob.type.startsWith('video/') ? 'video' : 'image') : existing.kind;
    }

    const nextOrder = items.reduce((max, it) => Math.max(max, it.order ?? 0), -1) + 1;
    const item = {
      id: existing ? existing.id : `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order: existing ? existing.order : nextOrder,
      title,
      description: el.inDesc.value.trim(),
      kind,
      youtubeId,
      facebookUrl,
      mediaBlob: newBlob || (keepOld ? existing.mediaBlob || null : null),
      mediaUrl: newBlob ? '' : keepOld ? existing.mediaUrl || '' : '',
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
    el.btnSignOut.addEventListener('click', () => window.authApi && window.authApi.signOut());
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
