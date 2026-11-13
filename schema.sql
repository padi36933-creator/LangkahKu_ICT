-- Lakukan eksekusi script ini di SQL Editor Supabase Anda

-- 1. TABEL PROFIL (Integrasi dengan auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('siswa', 'guru', 'admin')) DEFAULT 'siswa',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. TABEL KELAS
CREATE TABLE public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. TABEL ANGGOTA KELAS
CREATE TABLE public.class_members (
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

-- 4. TABEL KEGIATAN PEMBELAJARAN (Header)
CREATE TABLE public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 5. TABEL LANGKAH KEGIATAN (Detail)
CREATE TABLE public.activity_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT,
  tip TEXT,
  audio_path TEXT, -- Path ke Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 6. TABEL PENUGASAN (Assignment)
CREATE TABLE public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(activity_id, student_id)
);

-- 7. TABEL PROGRES SISWA (Per Langkah)
CREATE TABLE public.step_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.activity_steps(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('belum', 'sedang_dikerjakan', 'selesai', 'jeda', 'butuh_bantuan')) DEFAULT 'belum',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(assignment_id, step_id)
);

-- 8. TABEL PENILAIAN GURU (Assessment)
CREATE TABLE public.assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE UNIQUE,
  understanding_score INTEGER CHECK (understanding_score BETWEEN 1 AND 4),
  independence_score INTEGER CHECK (independence_score BETWEEN 1 AND 4),
  completion_score INTEGER CHECK (completion_score BETWEEN 1 AND 4),
  notes TEXT,
  assessed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- MATIKAN RLS SEMENTARA UNTUK PENGUJIAN AWAL PROTOTIPE
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments DISABLE ROW LEVEL SECURITY;

-- TRIGGER UNTUK OTOMATIS MEMBUAT PROFIL SAAT REGISTER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'siswa'); -- Default selalu siswa
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- BUCKET STORAGE UNTUK AUDIO GURU
-- Buka menu Storage di Supabase, buat bucket baru bernama "audio_instruksi"
-- Pastikan bucket tersebut "Public" agar mudah diakses oleh audio tag HTML siswa
