/**
 * YouTube / Facebook link helpers shared by the game (app.js) and the learn tab (learn.js).
 */
(function () {
  /** Returns the 11-character YouTube video id, or '' when the link isn't a YouTube video. */
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

  /** Accepts Facebook reel / video / share links; returns a normalised https://www.facebook.com/... URL or ''. */
  function parseFacebookUrl(raw) {
    const text = (raw || '').trim();
    if (!text) return '';
    try {
      const u = new URL(text);
      const host = u.hostname.toLowerCase();
      if (host === 'fb.watch') return u.pathname.length > 1 ? `https://fb.watch${u.pathname}` : '';
      if (!/(^|\.)facebook\.com$/.test(host)) return '';
      const path = u.pathname;
      const looksLikeVideo =
        /^\/reel\/\d+/.test(path) ||
        /^\/share\/(r|v)\/[\w-]+/.test(path) ||
        /\/videos\/(?:[\w.-]+\/)?\d+/.test(path) ||
        ((path === '/watch' || path === '/watch/') && u.searchParams.get('v'));
      if (!looksLikeVideo) return '';
      const keep = path.startsWith('/watch') ? `?v=${encodeURIComponent(u.searchParams.get('v'))}` : '';
      return `https://www.facebook.com${path.replace(/\/+$/, '')}${keep}`;
    } catch (_) {
      return '';
    }
  }

  const isVerticalFacebook = (url) => /\/reel\/|\/share\/r\//.test(url || '');

  /** enablejsapi lets the page set the player's volume / mute to match the sound panel. */
  function youtubeEmbedUrl(id, { autoplay = false } = {}) {
    return (
      `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&enablejsapi=1` +
      `&origin=${encodeURIComponent(location.origin)}${autoplay ? '&autoplay=1' : ''}`
    );
  }

  function facebookEmbedUrl(url, { autoplay = false } = {}) {
    return (
      'https://www.facebook.com/plugins/video.php?href=' +
      encodeURIComponent(url) +
      `&show_text=false${autoplay ? '&autoplay=true' : ''}&width=${isVerticalFacebook(url) ? 320 : 560}`
    );
  }

  const youtubeThumb = (id, size = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${size}.jpg`;

  /** Put plain text into `el`, turning http(s) links into clickable links that open in a new tab.
      Built from DOM nodes (never innerHTML), so text typed by staff can't inject markup. */
  function setTextWithLinks(el, text) {
    el.textContent = '';
    const source = String(text || '');
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    let last = 0;
    let match;
    while ((match = urlPattern.exec(source))) {
      let url = match[0];
      const trailing = url.match(/[.,;:!?)\]]+$/); // "ดูที่ https://x.com/a." -> link without the dot
      if (trailing) url = url.slice(0, -trailing[0].length);
      if (match.index > last) el.append(source.slice(last, match.index));
      const a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      el.append(a);
      last = match.index + url.length;
      urlPattern.lastIndex = last;
    }
    if (last < source.length) el.append(source.slice(last));
  }

  window.mediaLinks = {
    parseYouTubeId,
    parseFacebookUrl,
    isVerticalFacebook,
    youtubeEmbedUrl,
    facebookEmbedUrl,
    youtubeThumb,
    setTextWithLinks,
  };
})();
