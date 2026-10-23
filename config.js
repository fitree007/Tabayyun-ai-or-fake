/**
 * การตั้งค่าการเชื่อมต่อฐานข้อมูลออนไลน์ (Supabase)
 *
 * - เว้นว่างไว้ = เกมทำงานแบบ "ในเครื่อง" (เก็บโจทย์ในเบราว์เซอร์ ใช้งานได้เลย)
 * - ใส่ค่าทั้งสองช่อง = เกมจะเก็บโจทย์/รูป/วิดีโอบน Supabase ให้สตาฟทุกคนเห็นชุดเดียวกัน
 *
 * ค่า anon key ออกแบบมาให้เปิดเผยในหน้าเว็บได้ ความปลอดภัยอยู่ที่กฎ RLS ใน supabase/schema.sql
 * ห้ามใส่ service_role key ที่นี่เด็ดขาด
 */
window.APP_CONFIG = {
  supabaseUrl: 'https://oodnlfypkeqbcigdewdw.supabase.co',
  supabaseAnonKey: 'sb_publishable_jdxIB_txi0JH3TkI_tw-YA_B_3BsBph', // Publishable key (เปิดเผยได้)
  bucket: 'media',      // ชื่อ Storage bucket (ตรงกับ schema.sql)
  maxFileMB: 50,        // Supabase แผนฟรีจำกัดไฟล์ละ 50 MB
  // ลิมิตของแผนฟรีที่ใช้แสดงในหน้าจัดการโจทย์ (ถ้าอัปเกรดแผน แก้ตัวเลขตรงนี้)
  storageLimitMB: 1024, // พื้นที่เก็บไฟล์ 1 GB
  databaseLimitMB: 500, // ฐานข้อมูล 500 MB
  egressLimitGB: 5,     // ปริมาณดาวน์โหลดต่อเดือน 5 GB
  // ตัวเล่นคลิป Facebook (ใช้ให้กดเล่น/หยุดและปรับเสียงจากหน้าเว็บได้) — ปกติไม่ต้องแก้
  facebookSdkVersion: 'v22.0',
  facebookAppId: '',    // ไม่บังคับ
};
