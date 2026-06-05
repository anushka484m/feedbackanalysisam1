
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'manager', 'viewer');
CREATE TYPE public.feedback_source AS ENUM ('email','social_media','call','voice_note','video','chat','other','whatsapp','survey');
CREATE TYPE public.sentiment_label AS ENUM ('Positive','Negative','Neutral');
CREATE TYPE public.urgency_level AS ENUM ('critical','high','medium','low');
CREATE TYPE public.intent_type AS ENUM ('complaint','praise','suggestion','inquiry','feature_request','other');
CREATE TYPE public.processing_status AS ENUM ('pending','processing','completed','error');

-- ============ ORGANIZATIONS ============
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  display_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, org_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin','analyst','manager')
  )
$$;

-- ============ FEEDBACK ENTRIES ============
CREATE TABLE public.feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  original_text text NOT NULL,
  translated_text text,
  language text,
  source public.feedback_source NOT NULL DEFAULT 'other',
  region text,
  file_name text,
  status public.processing_status NOT NULL DEFAULT 'pending',
  is_duplicate boolean DEFAULT false,
  -- analysis
  sentiment public.sentiment_label,
  sentiment_score numeric,
  topic text,
  keywords text[],
  intent public.intent_type,
  urgency public.urgency_level,
  entities jsonb,
  -- meta
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_org ON public.feedback_entries(org_id);
CREATE INDEX idx_feedback_sentiment ON public.feedback_entries(org_id, sentiment_score);
CREATE INDEX idx_feedback_topic ON public.feedback_entries(org_id, topic);
CREATE INDEX idx_feedback_timestamp ON public.feedback_entries(org_id, timestamp DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_entries TO authenticated;
GRANT ALL ON public.feedback_entries TO service_role;
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- ============ ANALYSIS RUNS ============
CREATE TABLE public.analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entry_count integer NOT NULL DEFAULT 0,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_org ON public.analysis_runs(org_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.analysis_runs TO authenticated;
GRANT ALL ON public.analysis_runs TO service_role;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

-- ============ ALERTS ============
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES public.feedback_entries(id) ON DELETE CASCADE,
  reason text NOT NULL,
  severity public.urgency_level NOT NULL DEFAULT 'high',
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_org ON public.alerts(org_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org ON public.audit_logs(org_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- organizations
CREATE POLICY "Members can view their org" ON public.organizations
  FOR SELECT TO authenticated USING (id = public.current_org_id());
CREATE POLICY "Admins can update their org" ON public.organizations
  FOR UPDATE TO authenticated USING (id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Auth users can create orgs" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (true);

-- profiles
CREATE POLICY "Users can view profiles in their org" ON public.profiles
  FOR SELECT TO authenticated USING (org_id = public.current_org_id() OR id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles
CREATE POLICY "Users see roles in their org" ON public.user_roles
  FOR SELECT TO authenticated USING (org_id = public.current_org_id() OR user_id = auth.uid());

-- feedback_entries
CREATE POLICY "Org members can read feedback" ON public.feedback_entries
  FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "Writers can insert feedback" ON public.feedback_entries
  FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id() AND public.can_write());
CREATE POLICY "Writers can update feedback" ON public.feedback_entries
  FOR UPDATE TO authenticated USING (org_id = public.current_org_id() AND public.can_write());
CREATE POLICY "Admins can delete feedback" ON public.feedback_entries
  FOR DELETE TO authenticated USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

-- analysis_runs
CREATE POLICY "Org members can read analysis" ON public.analysis_runs
  FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "Writers can save analysis" ON public.analysis_runs
  FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id() AND public.can_write());
CREATE POLICY "Admins can delete analysis" ON public.analysis_runs
  FOR DELETE TO authenticated USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

-- alerts
CREATE POLICY "Org members can read alerts" ON public.alerts
  FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "Writers can insert alerts" ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id() AND public.can_write());
CREATE POLICY "Writers can update alerts" ON public.alerts
  FOR UPDATE TO authenticated USING (org_id = public.current_org_id() AND public.can_write());
CREATE POLICY "Admins can delete alerts" ON public.alerts
  FOR DELETE TO authenticated USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));

-- audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Members can write audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id() AND actor_id = auth.uid());

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON public.feedback_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create org + profile + admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_org_id uuid;
DECLARE display text;
BEGIN
  display := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1));
  INSERT INTO public.organizations(name) VALUES (display || '''s Workspace') RETURNING id INTO new_org_id;
  INSERT INTO public.profiles(id, org_id, display_name, email) VALUES (NEW.id, new_org_id, display, NEW.email);
  INSERT INTO public.user_roles(user_id, org_id, role) VALUES (NEW.id, new_org_id, 'admin');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
