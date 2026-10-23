/**
 * IndexedDB Storage & Demo Question Generator for "AI / จริง / บิดเบือน" Game
 * Supports large Image & Video Blobs persistently in the browser.
 */
const DB_NAME = 'AIRealManipulatedGameDB';
const DB_VERSION = 1;
const STORE_QUESTIONS = 'questions';

class QuestionStore {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
          const store = db.createObjectStore(STORE_QUESTIONS, { keyPath: 'id' });
          store.createIndex('order', 'order', { unique: false });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllQuestions() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_QUESTIONS, 'readonly');
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        resolve(items);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async saveQuestion(question) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_QUESTIONS, 'readwrite');
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.put(question);
      req.onsuccess = () => resolve(question);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async saveAllQuestions(questions) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_QUESTIONS, 'readwrite');
      const store = tx.objectStore(STORE_QUESTIONS);
      questions.forEach((q, idx) => {
        q.order = idx;
        store.put(q);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteQuestion(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_QUESTIONS, 'readwrite');
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async clearAll() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_QUESTIONS, 'readwrite');
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }
}

/**
 * Generates crisp high-res canvas Data URLs for initial sample questions
 * so the game works offline out-of-the-box before uploading custom images/videos.
 */
function createSampleCanvasImage(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  if (type === 'sunset-dog-ai') {
    // Golden sunset beach scene with subtle AI artifacts (floating reflection & extra paw toe)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 460);
    skyGrad.addColorStop(0, '#dbeafe');
    skyGrad.addColorStop(0.55, '#fde68a');
    skyGrad.addColorStop(1, '#fca5a5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1200, 460);

    // Sun glow
    const sunGrad = ctx.createRadialGradient(920, 260, 10, 920, 260, 220);
    sunGrad.addColorStop(0, 'rgba(255, 251, 235, 1)');
    sunGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.6)');
    sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 1200, 460);

    // Ocean & Wet sand mirror lagoon
    const seaGrad = ctx.createLinearGradient(0, 380, 0, 560);
    seaGrad.addColorStop(0, '#64748b');
    seaGrad.addColorStop(0.5, '#cbd5e1');
    seaGrad.addColorStop(1, '#fed7aa');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 380, 1200, 220);

    // Dry sand foreground
    const sandGrad = ctx.createLinearGradient(0, 540, 0, 800);
    sandGrad.addColorStop(0, '#d6c7b2');
    sandGrad.addColorStop(1, '#a89984');
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.moveTo(0, 560);
    ctx.bezierCurveTo(350, 510, 750, 610, 1200, 540);
    ctx.lineTo(1200, 800);
    ctx.lineTo(0, 800);
    ctx.closePath();
    ctx.fill();

    // Stylized Golden Retriever silhouette + fur lighting
    ctx.save();
    ctx.translate(600, 520);
    // Body
    const furGrad = ctx.createLinearGradient(-120, -220, 120, 200);
    furGrad.addColorStop(0, '#f59e0b');
    furGrad.addColorStop(0.5, '#d97706');
    furGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = furGrad;
    ctx.beginPath();
    ctx.ellipse(0, 60, 115, 165, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(10, -135, 78, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(42, -120, 42, 30, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Nose & Eyes
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(74, -128, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-5, -155, 8, 0, Math.PI * 2);
    ctx.arc(38, -158, 8, 0, Math.PI * 2);
    ctx.fill();

    // AI Artifact clue (visible when zooming with 🔍): warped collar tag & 6 toes on front paw
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('AI-GLITCH-6-TOES', -75, 215);
    for (let t = 0; t < 6; t++) {
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(-55 + t * 14, 232, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Badge watermark for demo clarity
    drawCornerHint(ctx, 'ภาพตัวอย่างที่ 1 • ลองเปิดแว่นขยาย 🔍 ส่องดูที่อุ้งเท้าด้านล่าง');
  } else if (type === 'cyber-street-ai') {
    // Neon night street food stall with AI garbled sign text
    const bg = ctx.createLinearGradient(0, 0, 0, 800);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.6, '#1e1b4b');
    bg.addColorStop(1, '#111827');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 800);

    // Bokeh neon lights
    const colors = ['#f43f5e', '#38bdf8', '#fbbf24', '#a855f7', '#10b981'];
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.18 + (i % 5) * 0.06;
      ctx.beginPath();
      ctx.arc((i * 173) % 1200, 80 + ((i * 97) % 420), 25 + (i % 4) * 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Street stall frame
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(260, 180, 680, 440);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(260, 180, 680, 440);

    // Neon Signboard with AI-like garbled pseudo-Thai/English characters
    ctx.fillStyle = '#be123c';
    ctx.fillRect(300, 210, 600, 110);
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = 4;
    ctx.strokeRect(300, 210, 600, 110);

    ctx.fillStyle = '#fff1f2';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ก๋วยเตี๋ยว R A M Ǝ И ฿999̷', 600, 280);

    // Chef silhouette with 3 hands (classic AI tell!)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(600, 410, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.fillRect(520, 465, 160, 150);

    // Counter
    ctx.fillStyle = '#78350f';
    ctx.fillRect(220, 580, 760, 120);

    drawCornerHint(ctx, 'ภาพตัวอย่าง • สังเกตตัวอักษรบนป้ายไฟนีออน (ลองใช้แว่นขยาย 🔍)');
  } else if (type === 'manipulated-news') {
    // Manipulated / Doctored photo example ("บิดเบือน")
    const bg = ctx.createLinearGradient(0, 0, 0, 800);
    bg.addColorStop(0, '#0284c7');
    bg.addColorStop(0.55, '#bae6fd');
    bg.addColorStop(0.55, '#475569');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 800);

    // Sun on the LEFT casting shadows to the RIGHT
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(180, 130, 65, 0, Math.PI * 2);
    ctx.fill();

    // Real building on left with shadow going RIGHT
    ctx.fillStyle = '#334155';
    ctx.fillRect(280, 260, 200, 220);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(480, 480);
    ctx.lineTo(640, 480);
    ctx.lineTo(580, 530);
    ctx.lineTo(280, 480);
    ctx.fill();

    // Pasted / Doctored UFO / Giant Object on right with shadow going LEFT (wrong shadow direction!)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(670, 560, 130, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(820, 320, 140, 45, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.strokeRect(660, 250, 320, 140);
    ctx.setLineDash([]);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ขอบตัดแปะ + ทิศทางเงาย้อนแย้งกับดวงอาทิตย์', 820, 230);

    drawCornerHint(ctx, 'ภาพตัวอย่าง • เปรียบเทียบทิศทางแสงอาทิตย์กับเงาของวัตถุด้านขวา');
  } else {
    // Real nature photograph simulation (crisp geometry & natural proportions)
    const sky = ctx.createLinearGradient(0, 0, 0, 440);
    sky.addColorStop(0, '#38bdf8');
    sky.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1200, 440);

    // Crisp beach & dog with leash (inspired by right image in Sightengine)
    const sand = ctx.createLinearGradient(0, 420, 0, 800);
    sand.addColorStop(0, '#e7d8c5');
    sand.addColorStop(1, '#c2ab8e');
    ctx.fillStyle = sand;
    ctx.fillRect(0, 420, 1200, 380);

    // Waves
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.lineTo(750, 420);
    ctx.lineTo(420, 580);
    ctx.lineTo(0, 580);
    ctx.closePath();
    ctx.fill();

    // Border Terrier Dog in center
    ctx.save();
    ctx.translate(600, 500);
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.ellipse(0, 90, 110, 175, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -110, 88, 0, Math.PI * 2);
    ctx.fill();

    // Happy Pink Tongue
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(0, -52, 22, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose & Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -98, 18, 0, Math.PI * 2);
    ctx.arc(-34, -135, 10, 0, Math.PI * 2);
    ctx.arc(34, -135, 10, 0, Math.PI * 2);
    ctx.fill();

    // Leather collar & leash with realistic metal clasp
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(-65, -20);
    ctx.quadraticCurveTo(0, 5, 65, -20);
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(-15, 10, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(-15, 24);
    ctx.lineTo(-95, 300);
    ctx.stroke();
    ctx.restore();

    drawCornerHint(ctx, 'ภาพตัวอย่าง • รายละเอียดสายจูง ตะขอโลหะ และสัดส่วนถูกต้องตามธรรมชาติ');
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

function drawCornerHint(ctx, text) {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.beginPath();
  ctx.roundRect(28, 725, 1144, 50, 12);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '500 20px "Noto Sans Thai", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 600, 757);
  ctx.restore();
}

function getDefaultSampleQuestions() {
  return [
    {
      id: 'sample-1',
      order: 0,
      title: 'ภาพนี้คือ AI, ภาพจริง หรือ บิดเบือน?',
      subtitle: 'ลองสังเกตแสงสี ป้ายไฟนีออน และตัวอักษรในภาพให้ดี (เปิดแว่นขยาย 🔍 ด้านล่างซ้ายเพื่อส่องซูมได้!)',
      layoutMode: 'single',
      mediaType: 'image',
      mediaUrl: createSampleCanvasImage('cyber-street-ai'),
      enabledButtons: ['ai', 'real', 'manipulated'],
      correctAnswer: 'ai',
      explanation: 'เฉลย: สร้างด้วย AI! จุดสังเกตคือตัวอักษรบนป้ายไฟนีออนมีการหลอมรวมกันและเพี้ยน (R A M Ǝ И) ซึ่งเป็นเอกลักษณ์ที่พบบ่อยในภาพจาก AI'
    },
    {
      id: 'sample-2',
      order: 1,
      title: 'ภาพข่าวนี้เป็น "ภาพจริง" หรือ "บิดเบือน (ตัดต่อ)"?',
      subtitle: 'ข้อนี้กำหนดให้แสดงเฉพาะปุ่ม "จริง" และ "บิดเบือน" (คุณสามารถเลือกปุ่มที่จะให้ปรากฏในแต่ละข้อได้ตามต้องการ)',
      layoutMode: 'single',
      mediaType: 'image',
      mediaUrl: createSampleCanvasImage('manipulated-news'),
      enabledButtons: ['real', 'manipulated'],
      correctAnswer: 'manipulated',
      explanation: 'เฉลย: บิดเบือน (ตัดต่อ)! ดวงอาทิตย์อยู่ด้านซ้ายทำให้เงาตึกทอดไปทางขวา แต่วัตถุด้านขวากลับมีเงาทอดไปทางซ้ายและมีรอยขอบตัดแปะ'
    },
    {
      id: 'sample-3',
      order: 2,
      title: 'Which image is AI? (ภาพไหนสร้างด้วย AI?)',
      subtitle: 'โหมดเปรียบเทียบ 2 ภาพสไตล์ Sightengine! มี 1 ภาพที่สร้างด้วย AI และอีก 1 ภาพเป็นของจริง',
      layoutMode: 'compare',
      mediaType: 'image',
      mediaUrl: createSampleCanvasImage('sunset-dog-ai'),
      mediaTypeB: 'image',
      mediaUrlB: createSampleCanvasImage('real-dog-beach'),
      enabledButtons: ['left', 'right'],
      correctAnswer: 'left',
      explanation: 'เฉลย: ภาพซ้ายคือ AI! หากใช้แว่นขยาย 🔍 ส่องดูที่อุ้งเท้าของสุนัขฝั่งซ้ายจะพบนิ้วเท้าเกินมา 6 นิ้ว และเงาสะท้อนน้ำทะเลผิดธรรมชาติ'
    }
  ];
}

window.questionStore = new QuestionStore();
window.getDefaultSampleQuestions = getDefaultSampleQuestions;
