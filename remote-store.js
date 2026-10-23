/**
 * Online storage (Supabase) — drop-in replacement for the local IndexedDB store.
 * Active only when config.js has a Supabase URL + anon key AND supabase-js loaded.
 * Exposes: window.APP_MODE ('remote' | 'local'), window.authApi, window.questionStore
 */
(function () {
  const cfg = window.APP_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

  window.APP_MODE = 'local';
  window.authApi = null;

  if (!configured) return;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('[remote-store] supabase-js ไม่โหลด (ออฟไลน์?) — ใช้โหมดในเครื่องแทน');
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const bucket = cfg.bucket || 'media';
  const maxMB = cfg.maxFileMB || 50;

  const EXT_BY_TYPE = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  };

  function busy(on, text) {
    if (typeof window.onStoreBusy === 'function') window.onStoreBusy(on, text);
  }

  function extOf(blob) {
    const fromName = blob.name && blob.name.includes('.') ? blob.name.split('.').pop().toLowerCase() : '';
    return fromName.replace(/[^a-z0-9]/g, '') || EXT_BY_TYPE[blob.type] || 'bin';
  }

  async function uploadMedia(id, slot, blob) {
    if (blob.size > maxMB * 1024 * 1024) {
      throw new Error(
        `ไฟล์ใหญ่เกิน ${maxMB} MB (ไฟล์นี้ ${(blob.size / 1048576).toFixed(1)} MB) — ลองย่อวิดีโอเป็น 720p ก่อนอัปโหลด`
      );
    }
    const path = `${id}/${slot}-${Date.now()}.${extOf(blob)}`;
    const { error } = await client.storage.from(bucket).upload(path, blob, {
      contentType: blob.type || undefined,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new Error('อัปโหลดไฟล์ไม่สำเร็จ: ' + error.message);
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, path };
  }

  async function removePaths(paths) {
    const list = paths.filter(Boolean);
    if (list.length) await client.storage.from(bucket).remove(list);
  }

  /** Generic JSON-row + media-file store; one instance per table (questions, learn_items). */
  class RemoteStore {
    constructor(table, pathPrefix = '') {
      this.table = table;
      this.pathPrefix = pathPrefix;
    }

    async getAllQuestions() {
      const { data, error } = await client
        .from(this.table)
        .select('id, sort_order, data')
        .order('sort_order', { ascending: true });
      if (error) throw new Error('โหลดโจทย์ไม่สำเร็จ: ' + error.message);
      return data.map((r) => ({ ...r.data, id: r.id, order: r.sort_order }));
    }

    async saveQuestion(q) {
      const hasUpload = q.mediaBlob instanceof Blob || q.mediaBlobB instanceof Blob;
      busy(true, hasUpload ? 'กำลังอัปโหลดไฟล์…' : 'กำลังบันทึก…');
      try {
        const { data: oldRow } = await client.from(this.table).select('data').eq('id', q.id).maybeSingle();
        const old = (oldRow && oldRow.data) || {};

        const out = { ...q };
        delete out.mediaBlob;
        delete out.mediaBlobB;
        delete out.order;
        delete out.id;

        const newPaths = [];
        for (const slot of ['', 'B']) {
          const blobKey = 'mediaBlob' + slot;
          const urlKey = 'mediaUrl' + slot;
          const pathKey = 'mediaPath' + slot;
          if (q[blobKey] instanceof Blob) {
            const up = await uploadMedia(this.pathPrefix + q.id, slot || 'A', q[blobKey]);
            out[urlKey] = up.url;
            out[pathKey] = up.path;
            newPaths.push(up.path);
          } else if (out[urlKey] && out[urlKey] === old[urlKey] && old[pathKey]) {
            out[pathKey] = old[pathKey]; // unchanged file, keep its storage path
            newPaths.push(old[pathKey]);
          } else {
            delete out[pathKey];
          }
        }

        const { error } = await client.from(this.table).upsert({
          id: q.id,
          sort_order: q.order ?? 0,
          data: out,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          await removePaths(newPaths.filter((p) => p !== old.mediaPath && p !== old.mediaPathB));
          throw new Error('บันทึกโจทย์ไม่สำเร็จ (ต้องเข้าสู่ระบบด้วยอีเมลสตาฟ): ' + error.message);
        }

        await removePaths([old.mediaPath, old.mediaPathB].filter((p) => p && !newPaths.includes(p)));
        return { ...out, id: q.id, order: q.order ?? 0 };
      } finally {
        busy(false);
      }
    }

    async saveAllQuestions(questions) {
      for (let i = 0; i < questions.length; i++) {
        questions[i].order = i;
        await this.saveQuestion(questions[i]);
      }
    }

    async deleteQuestion(id) {
      busy(true, 'กำลังลบ…');
      try {
        const { data: row } = await client.from(this.table).select('data').eq('id', id).maybeSingle();
        const { error } = await client.from(this.table).delete().eq('id', id);
        if (error) throw new Error('ลบไม่สำเร็จ (ต้องเข้าสู่ระบบด้วยอีเมลสตาฟ): ' + error.message);
        if (row && row.data) await removePaths([row.data.mediaPath, row.data.mediaPathB]);
      } finally {
        busy(false);
      }
    }

    async clearAll() {
      busy(true, 'กำลังลบทั้งหมด…');
      try {
        const { data: rows } = await client.from(this.table).select('id, data');
        const { error } = await client.from(this.table).delete().neq('id', '');
        if (error) throw new Error('ลบไม่สำเร็จ (ต้องเข้าสู่ระบบด้วยอีเมลสตาฟ): ' + error.message);
        const paths = [];
        (rows || []).forEach((r) => paths.push(r.data && r.data.mediaPath, r.data && r.data.mediaPathB));
        await removePaths(paths);
      } finally {
        busy(false);
      }
    }
  }

  window.authApi = {
    async getUser() {
      const { data } = await client.auth.getSession();
      return data.session ? data.session.user : null;
    },
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return data.user;
    },
    async signOut() {
      await client.auth.signOut();
    },
    onChange(cb) {
      client.auth.onAuthStateChange((_event, session) => cb(session ? session.user : null));
    },
  };

  window.questionStore = new RemoteStore('questions');
  window.learnStore = new RemoteStore('learn_items', 'learn/');
  window.APP_MODE = 'remote';
})();
