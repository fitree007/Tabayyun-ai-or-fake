-- =====================================================================
-- AI • จริง • บิดเบือน — โครงสร้างฐานข้อมูล Supabase
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
-- =====================================================================

-- 1) ตารางโจทย์ (ข้อมูลทั้งข้อเก็บใน data แบบ JSON, ไฟล์สื่อเก็บใน Storage)
create table if not exists public.questions (
  id          text primary key,
  sort_order  integer not null default 0,
  data        jsonb   not null,
  updated_at  timestamptz not null default now()
);

-- 2) รายชื่ออีเมลสตาฟที่แก้ไขโจทย์ได้ (ใครไม่อยู่ในรายชื่อ แก้ไม่ได้ แม้สมัครบัญชีได้)
create table if not exists public.staff (
  email text primary key
);
alter table public.staff enable row level security;  -- ไม่มี policy = เบราว์เซอร์อ่าน/เขียนตรง ๆ ไม่ได้

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 3) สิทธิ์ตาราง questions: ทุกคนอ่านได้, เฉพาะสตาฟเขียนได้
alter table public.questions enable row level security;

drop policy if exists "questions public read" on public.questions;
create policy "questions public read"
  on public.questions for select
  using (true);

drop policy if exists "questions staff write" on public.questions;
create policy "questions staff write"
  on public.questions for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 3.1) สิทธิ์เข้าถึงผ่าน Data API (จำเป็นเมื่อปิด "Automatically expose new tables")
--      ผู้เล่นทั่วไป (anon) อ่านโจทย์ได้อย่างเดียว, สตาฟที่ล็อกอิน (authenticated) เขียนได้ภายใต้กฎ RLS ด้านบน
--      ตาราง staff ไม่เปิดสิทธิ์ให้เบราว์เซอร์เลย
grant usage on schema public to anon, authenticated;
grant select on public.questions to anon, authenticated;
grant insert, update, delete on public.questions to authenticated;
grant execute on function public.is_staff() to authenticated;

-- 4) ที่เก็บไฟล์รูป/วิดีโอ (bucket สาธารณะ จำกัดไฟล์ละ 50 MB)
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "media public read" on storage.objects;
create policy "media public read"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media staff insert" on storage.objects;
create policy "media staff insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "media staff update" on storage.objects;
create policy "media staff update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_staff());

drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_staff());

-- 5) เพิ่มอีเมลสตาฟ (แก้เป็นอีเมลจริงของคุณและสตาฟ แล้วรันบรรทัดนี้)
-- insert into public.staff (email) values ('you@example.com'), ('staff1@example.com');
