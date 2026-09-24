ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_language text NOT NULL DEFAULT 'cs';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title_cs text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description_cs text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description_en text;

UPDATE public.tasks
SET source_language = CASE WHEN title = 'Buy living room bulbs' THEN 'en' ELSE 'cs' END,
    title_cs = CASE title
      WHEN 'Buy living room bulbs' THEN 'Koupit žárovky do obývacího pokoje'
      ELSE title
    END,
    title_en = CASE title
      WHEN 'Vyčistit okapy od jehličí' THEN 'Clear pine needles from the gutters'
      WHEN 'Vyměnit prasklé žárovky na chodbě' THEN 'Replace broken hallway light bulbs'
      WHEN 'Doplnit zásobu dřeva na zimu' THEN 'Restock firewood for winter'
      WHEN 'Objednat plyn do bomby' THEN 'Order gas for the cylinder'
      WHEN 'Servis kotlíku na dřevo' THEN 'Service the wood-burning boiler'
      WHEN 'Opravit protékající kohoutek v koupelně' THEN 'Repair the leaking bathroom tap'
      ELSE title
    END
WHERE title_cs IS NULL OR title_en IS NULL;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_source_language_check CHECK (source_language IN ('cs', 'en')) NOT VALID;