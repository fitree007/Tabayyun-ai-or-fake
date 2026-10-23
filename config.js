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
};
