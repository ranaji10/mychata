CREATE TABLE public.accounts (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('FAMILY','INSTITUTIONAL')), name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.properties (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE, name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', photo_url TEXT, house_rules_text TEXT, auto_confirm BOOLEAN NOT NULL DEFAULT true, handover_items JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.members (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT, role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER','ADMIN','MEMBER')), branch TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_members" ON public.members FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.bookings (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE, requester_name TEXT NOT NULL, requester_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, guests INT NOT NULL DEFAULT 1, note TEXT, status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','PENDING')), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.institutional_requests (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE, requester_name TEXT NOT NULL, requester_email TEXT NOT NULL, requester_phone TEXT, affiliation TEXT, start_date DATE NOT NULL, end_date DATE NOT NULL, guests INT NOT NULL DEFAULT 1, note TEXT, status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','DECLINED')), decline_reason TEXT, has_conflict BOOLEAN NOT NULL DEFAULT false, conflict_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutional_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutional_requests TO authenticated;
GRANT ALL ON public.institutional_requests TO service_role;
ALTER TABLE public.institutional_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_requests" ON public.institutional_requests FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.tasks (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'repair', photo_url TEXT, urgency TEXT NOT NULL DEFAULT 'LOW' CHECK (urgency IN ('LOW','HIGH','URGENT')), assignee_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','DONE')), due_date DATE, done_note TEXT, created_by TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.expenses (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE, amount NUMERIC NOT NULL, category TEXT NOT NULL DEFAULT 'other', receipt_photo_url TEXT, split_method TEXT NOT NULL DEFAULT 'EQUAL' CHECK (split_method IN ('EQUAL','CUSTOM','BY_BRANCH')), paid_by_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.expense_splits (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE, member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE, amount_owed NUMERIC NOT NULL, paid_back BOOLEAN NOT NULL DEFAULT false, paid_back_confirmed_by UUID REFERENCES public.members(id) ON DELETE SET NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_splits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_splits TO authenticated;
GRANT ALL ON public.expense_splits TO service_role;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_splits" ON public.expense_splits FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.handovers (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE, booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL, member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, checklist_state JSONB NOT NULL DEFAULT '{}', note TEXT, photo_url TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handovers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handovers TO authenticated;
GRANT ALL ON public.handovers TO service_role;
ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_handovers" ON public.handovers FOR ALL USING (true) WITH CHECK (true);

-- Seed: accounts
INSERT INTO public.accounts (id, type, name) VALUES
  ('a0000000-0000-4000-8000-000000000001','FAMILY','Rodina Novákových'),
  ('a0000000-0000-4000-8000-000000000002','INSTITUTIONAL','Vysoká škola podhorní');

-- Seed: properties
INSERT INTO public.properties (id, account_id, name, address, auto_confirm, handover_items, house_rules_text) VALUES
  ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Chata U Lípy','Horní Bečva 42, Beskydy', true, '["Zamknout všechna okna","Uzavřít hlavní přívod vody","Vynést odpadky","Doplnit dříví u krbu","Vypnout topení a elektřinu mimo lednici","Zamknout hlavní vchod a vrátit klíč do schránky"]', 'Nocleh po 22:00 pouze po domluvě. Domácí mazlíčci po předchozí domluvě.'),
  ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002','Chata Hvězda','Janské Lázně 15, Krkonoše', false, '["Zamknout všechna okna","Uzavřít hlavní přívod vody","Vynést odpadky","Setřít a zamést společné prostory","Doplnit dříví","Zamknout hlavní vchod a vrátit klíč do schránky"]', 'Kapacita max. 16 osob. Zákaz kouření v celém objektu.');

-- Seed: members (family)
INSERT INTO public.members (id, account_id, name, email, role, branch) VALUES
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Petra Nováková','petra.novakova@example.cz','ADMIN','Novákovi'),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Jaroslav Novák','jaroslav.novak@example.cz','OWNER','Novákovi'),
  ('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','Tomáš Kříž','tomas.kriz@example.cz','MEMBER','Křížovi'),
  ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','Jana Křížová','jana.krizova@example.cz','MEMBER','Křížovi');

-- Seed: members (institutional)
INSERT INTO public.members (id, account_id, name, email, role, branch) VALUES
  ('c0000000-0000-4000-8000-000000000010','a0000000-0000-4000-8000-000000000002','Aleš Dvořák','ales.dvorak@example.cz','ADMIN','');

-- Seed: family bookings
INSERT INTO public.bookings (id, property_id, requester_name, requester_member_id, start_date, end_date, guests, note, status) VALUES
  ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Tomáš Kříž','c0000000-0000-4000-8000-000000000003','2026-09-11','2026-09-14',4,'Víkend s dětmi','CONFIRMED'),
  ('d0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Petra Nováková','c0000000-0000-4000-8000-000000000001','2026-10-02','2026-10-05',6,'Rodinná oslava','CONFIRMED'),
  ('d0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','Jana Křížová','c0000000-0000-4000-8000-000000000004','2026-10-09','2026-10-12',3,null,'CONFIRMED'),
  ('d0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','Tomáš Kříž','c0000000-0000-4000-8000-000000000003','2026-10-16','2026-10-19',2,'Podzimní houbaření','PENDING');

-- Seed: institutional requests
INSERT INTO public.institutional_requests (id, property_id, requester_name, requester_email, requester_phone, affiliation, start_date, end_date, guests, note, status, decline_reason, has_conflict, conflict_note) VALUES
  ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','Jan Dvořák','jan.dvorak@student.example.cz','777111222','Student 3. ročníku, č. indexu 2024-118','2026-09-20','2026-09-23',6,'Víkendový výlet s kamarády','PENDING',null,true,'Překrývá se s žádostí Marie Černá (22.–25.09.2026)'),
  ('e0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','Marie Černá','marie.cerna@student.example.cz',null,'Absolventka','2026-09-22','2026-09-25',4,null,'PENDING',null,true,'Překrývá se s žádostí Jan Dvořák (20.–23.09.2026)'),
  ('e0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','Petr Horák','petr.horak@staff.example.cz','777333444','Zaměstnanec – knihovna','2026-10-02','2026-10-04',3,'Rodinný pobyt','PENDING',null,false,null),
  ('e0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000002','Klub horolezců UK','horolezci@klub.example.cz',null,'Studentský klub','2026-10-09','2026-10-12',12,'Podzimní soustředění','APPROVED',null,false,null),
  ('e0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000002','Eva Králová','eva.kralova@example.cz',null,'Externí zájemce','2026-08-14','2026-08-16',8,null,'DECLINED','Nesplňuje podmínky (pouze členové a zaměstnanci)',false,null);

-- Seed: institutional booking from the approved request
INSERT INTO public.bookings (id, property_id, requester_name, requester_member_id, start_date, end_date, guests, note, status) VALUES
  ('d0000000-0000-4000-8000-000000000010','b0000000-0000-4000-8000-000000000002','Klub horolezců UK',null,'2026-10-09','2026-10-12',12,'Podzimní soustředění','CONFIRMED');

-- Seed: family tasks
INSERT INTO public.tasks (id, property_id, title, category, urgency, assignee_member_id, status, due_date, done_note, created_by) VALUES
  ('f0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Servis kotlíku na dřevo','repair','HIGH','c0000000-0000-4000-8000-000000000003','IN_PROGRESS','2026-09-01',null,'Petra Nováková'),
  ('f0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Doplnit zásobu dřeva na zimu','seasonal','LOW','c0000000-0000-4000-8000-000000000002','OPEN','2026-09-20',null,'Petra Nováková'),
  ('f0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','Vyčistit okapy od jehličí','seasonal','LOW',null,'OPEN','2026-09-25',null,'Jana Křížová'),
  ('f0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','Vyměnit prasklé žárovky na chodbě','repair','LOW','c0000000-0000-4000-8000-000000000003','DONE','2026-08-15','Vyměněno, koupeno 6 náhradních','Petra Nováková');

-- Seed: institutional tasks
INSERT INTO public.tasks (id, property_id, title, category, urgency, assignee_member_id, status, due_date, done_note, created_by) VALUES
  ('f0000000-0000-4000-8000-000000000010','b0000000-0000-4000-8000-000000000002','Opravit protékající kohoutek v koupelně','repair','URGENT',null,'OPEN','2026-09-05',null,'Aleš Dvořák'),
  ('f0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000002','Objednat plyn do bomby','seasonal','HIGH',null,'IN_PROGRESS','2026-09-30',null,'Aleš Dvořák');

-- Seed: family expenses
INSERT INTO public.expenses (id, property_id, amount, category, split_method, paid_by_member_id, created_at) VALUES
  ('01100000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',2400,'utilities','EQUAL','c0000000-0000-4000-8000-000000000001','2026-09-01 10:00:00+00'),
  ('01100000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001',8500,'repairs','EQUAL','c0000000-0000-4000-8000-000000000002','2026-08-20 10:00:00+00'),
  ('01100000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001',3200,'supplies','EQUAL','c0000000-0000-4000-8000-000000000003','2026-08-10 10:00:00+00');

-- Seed: expense splits (equal over 4 members)
INSERT INTO public.expense_splits (expense_id, member_id, amount_owed, paid_back) VALUES
  ('01100000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',600,true),
  ('01100000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002',600,true),
  ('01100000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003',600,false),
  ('01100000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004',600,false),
  ('01100000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001',2125,false),
  ('01100000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002',2125,true),
  ('01100000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003',2125,false),
  ('01100000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000004',2125,true),
  ('01100000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001',800,true),
  ('01100000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000002',800,false),
  ('01100000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003',800,true),
  ('01100000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004',800,false);

-- Seed: one past handover (family)
INSERT INTO public.handovers (id, property_id, booking_id, member_id, checklist_state, note, submitted_at) VALUES
  ('01200000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','{"Zamknout všechna okna":{"state":"checked"},"Uzavřít hlavní přívod vody":{"state":"checked"},"Vynést odpadky":{"state":"checked"},"Doplnit dříví u krbu":{"state":"checked"},"Vypnout topení a elektřinu mimo lednici":{"state":"na","reason":"Bylo horko, topení se nepoužívalo"},"Zamknout hlavní vchod a vrátit klíč do schránky":{"state":"checked"}}','Vše v pořádku, akorát dochází sůl v kuchyni.','2026-09-14 11:30:00+00');