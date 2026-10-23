# วิธีตั้งค่าให้สตาฟใช้ผ่านลิงก์เว็บ (GitHub + Vercel + Supabase)

เกมนี้เป็นเว็บไฟล์ล้วน ไม่ต้อง build ทำงานได้ 2 โหมด:

| โหมด | เมื่อไหร่ | โจทย์เก็บที่ไหน |
|---|---|---|
| ในเครื่อง | `config.js` ว่าง | เบราว์เซอร์ของแต่ละเครื่อง (ใช้ทดสอบ) |
| ออนไลน์ | ใส่ค่า Supabase ใน `config.js` | Supabase — สตาฟทุกคนเห็นโจทย์ชุดเดียวกัน |

ทำตามลำดับนี้ (ใช้เวลาประมาณ 15–20 นาที)

## 1) สร้างโปรเจกต์ Supabase (ฐานข้อมูล + ที่เก็บไฟล์)

1. สมัคร/เข้าสู่ระบบที่ <https://supabase.com> → **New project** (ตั้งชื่อ, ตั้งรหัสฐานข้อมูล, เลือก Region ใกล้ไทย เช่น Singapore)
2. เมนู **SQL Editor → New query** → เปิดไฟล์ `supabase/schema.sql` คัดลอกทั้งหมดไปวาง → **Run**
3. เพิ่มอีเมลสตาฟที่มีสิทธิ์แก้ไขโจทย์ ในช่อง SQL Editor รัน:
   ```sql
   insert into public.staff (email) values ('อีเมลของคุณ@gmail.com'), ('สตาฟ1@gmail.com');
   ```
4. เมนู **Authentication → Users → Add user → Create new user**
   สร้างบัญชีให้แต่ละคนตามอีเมลข้างบน (ตั้งรหัสผ่าน, ติ๊ก *Auto Confirm User*)
5. (แนะนำ) **Authentication → Sign In / Providers → Email** ปิด *Allow new users to sign up*
   (แม้ไม่ปิด คนที่ไม่อยู่ในตาราง `staff` ก็แก้โจทย์ไม่ได้)
6. เมนู **Project Settings → API** จดค่า 2 อย่าง:
   - **Project URL** (เช่น `https://abcdxyz.supabase.co`)
   - **anon public** key
   > ห้ามใช้/แชร์ `service_role` key

## 2) ใส่ค่าลงใน `config.js`

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://abcdxyz.supabase.co',
  supabaseAnonKey: 'ค่า anon public key',
  bucket: 'media',
  maxFileMB: 50,
};
```
anon key เปิดเผยในหน้าเว็บได้ตามการออกแบบของ Supabase ความปลอดภัยอยู่ที่กฎใน `schema.sql`

## 3) เก็บโค้ดไว้ใน GitHub

สร้าง repository ว่าง ๆ บน GitHub (เช่นชื่อ `ai-real-or-true`) แล้วรันในโฟลเดอร์โปรเจกต์:

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/ชื่อผู้ใช้/ai-real-or-true.git
git push -u origin main
```

## 4) Deploy ด้วย Vercel

1. เข้า <https://vercel.com> → **Add New → Project** → เลือก repository `ai-real-or-true` (Import)
2. **Framework Preset = Other**, ปล่อยช่อง Build/Output ว่างไว้ → **Deploy**
3. ได้ลิงก์ `https://ชื่อ.vercel.app` ส่งให้สตาฟได้เลย
4. ต่อไปแก้โค้ดแล้ว `git push` Vercel จะ deploy ใหม่เองอัตโนมัติ

## วิธีใช้งานจริง

- **ผู้เล่น/คนดูจอ**: เปิดลิงก์แล้วเล่นได้เลย ไม่ต้องล็อกอิน
- **สตาฟ**: กดปุ่ม "เข้าสู่ระบบสตาฟ" → ล็อกอิน → เพิ่ม/แก้/ลบรูปและวิดีโอได้ (คนอื่นเห็นเมื่อรีเฟรชหน้า)
- เครื่องที่ฉายจอ: เปิดลิงก์ล่วงหน้า กดอนุญาตเสียง 1 ครั้งก่อนเริ่ม

## ข้อควรรู้

- **ขนาดไฟล์**: แผนฟรีของ Supabase รับไฟล์ละไม่เกิน 50 MB และที่เก็บรวม 1 GB
  ย่อวิดีโอเป็น MP4 (H.264) 720p สั้น ๆ จะโหลดเร็วและเล่นได้ทุกเครื่อง
- **เฉลยไม่ถูกซ่อนจากคนที่เปิดเครื่องมือนักพัฒนา**: ข้อมูลโจทย์รวมเฉลยถูกส่งมาที่เบราว์เซอร์ ถ้าผู้เล่นเล่นบนมือถือตัวเองและเปิด DevTools เป็นก็เห็นได้ เหมาะกับกิจกรรมที่ผู้เล่นดูจอฉายร่วมกัน ถ้าต้องการซ่อนเฉลยจริง ๆ ต้องทำฝั่งเซิร์ฟเวอร์เพิ่ม
- **โปรเจกต์ Supabase แผนฟรีจะถูกพัก** ถ้าไม่มีการใช้งานนานราว 1 สัปดาห์ ก่อนวันงานให้เปิดเว็บทดสอบสักครั้ง
- ส่งออก/นำเข้าชุดโจทย์ (ปุ่มในหน้าจัดการ) ใช้สำรองข้อมูลได้
