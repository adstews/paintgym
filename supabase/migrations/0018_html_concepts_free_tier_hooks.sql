-- paintgym: HTML-rendered concepts, free-brief tier, and the hook bank.
--
-- 1. New signups start with 0 credits. Briefs are free (Claude writes them with
--    no credit check); image generation requires purchased credits. The briefs
--    are the free sample that sells the credit packs.
-- 2. Eight "screenshot" concepts (iMessage, Notes App, Reddit, Tweet, TikTok,
--    Instagram Story, Claude Chat, ChatGPT Chat) are rendered as pixel-perfect
--    HTML/CSS and screenshotted server-side instead of going to an image model.
--    Claude writes the structured on-screen text and we store it on the brief as
--    render_content (jsonb). These renders cost 0 credits (render cost ~ $0).
-- 3. A hook bank: 20 proven opening-line templates a user can pick before Claude
--    writes a brief, so the first 3 seconds lead with a known winner.

-- ===========================================================================
-- 1. Free tier — new signups get 0 credits (was 5).
--    Existing balances are untouched; only the column default changes so the
--    auth trigger / ensureProfile insert lands a new user on 0.
-- ===========================================================================
alter table public.user_profiles
  alter column credit_balance set default 0;

-- ===========================================================================
-- 2. briefs.render_content — structured screen content for HTML-rendered
--    concepts (null for ordinary image-model briefs).
-- ===========================================================================
alter table public.briefs
  add column if not exists render_content jsonb;

-- Make sure the eight HTML-rendered concepts exist as default concepts. Insert
-- each only if a default by that name is missing, so this is safe to run on a
-- database that already added some of them through the admin UI.
insert into public.concepts (name, description, prompt_template, sort_order, is_default, active)
select v.name, v.description, v.prompt_template, v.sort_order, true, true
from (values
  ('iMessage',
   'A realistic iMessage conversation where a friend recommends the product. Rendered as a pixel-perfect screenshot, no image-generation cost.',
   'A realistic iMessage thread: gray received bubbles and blue sent bubbles, a friend enthusiastically recommending the product to someone with a relatable problem. Casual, believable texting.',
   200),
  ('Notes App',
   'An iPhone Notes-app screenshot styled as a candid list about the product. Rendered as pixel-perfect HTML, no image-generation cost.',
   'An Apple Notes screenshot: a title, a date, and a short list of honest reasons the product is worth it, written like a real person''s personal note.',
   210),
  ('Reddit Thread',
   'A Reddit post with replies where the product comes up organically as the answer. Rendered as a pixel-perfect screenshot, no image-generation cost.',
   'A Reddit thread: an upvoted question/post in a relevant subreddit and a few top comments where the product is recommended as the clear answer, with believable usernames and vote counts.',
   220),
  ('Tweet',
   'A Twitter/X post praising the product, with engagement metrics. Rendered as a pixel-perfect screenshot, no image-generation cost.',
   'A single tweet from a believable account praising the product, with display name, handle, the post text, and reply/retweet/like/view counts.',
   230),
  ('TikTok Comment',
   'A TikTok comment-section overlay where commenters rave about the product. Rendered as a pixel-perfect screenshot, no image-generation cost.',
   'A TikTok comment overlay on a dark video frame: a caption, the right-side action rail, and three or four comments hyping the product with likes.',
   240),
  ('Instagram Story',
   'An Instagram Story screenshot with text overlays and a sticker. Rendered as a pixel-perfect screenshot, no image-generation cost.',
   'An Instagram Story: the top progress bar, profile pic and username, a text overlay reacting to the product, and one interactive sticker (poll, question, or rating).',
   250),
  ('Claude Chat',
   'A Claude AI chat where the assistant explains why the product is a good pick. Rendered as a pixel-perfect screenshot, no image-generation cost.',
   'A Claude app conversation: a user question and Claude''s clean, well-formatted answer making the case for the product.',
   260),
  ('ChatGPT Chat',
   'A ChatGPT conversation where the assistant recommends the product. Rendered as a pixel-perfect screenshot, no image-generation cost.',
   'A ChatGPT conversation: a user question and the assistant''s answer recommending the product, with the familiar ChatGPT message layout.',
   270)
) as v(name, description, prompt_template, sort_order)
where not exists (
  select 1 from public.concepts c
  where lower(c.name) = lower(v.name) and c.is_default = true
);

-- ===========================================================================
-- 3. hooks — the hook bank. concept_id null means the hook is universal
--    (works across every concept). category is the proven angle.
-- ===========================================================================
create table if not exists public.hooks (
  id            uuid primary key default gen_random_uuid(),
  concept_id    uuid references public.concepts(id) on delete cascade,
  hook_template text not null,
  category      text not null
                  check (category in (
                    'curiosity','fomo','social_proof','pain_point',
                    'transformation','controversy','authority')),
  why_it_works  text not null,
  sort_order    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists hooks_sort_order_idx on public.hooks(sort_order);
create index if not exists hooks_concept_id_idx on public.hooks(concept_id);

alter table public.hooks enable row level security;
-- Hooks are a shared, non-sensitive library: any signed-in user can read the
-- active ones. Writes are admin-only (service role bypasses RLS).
drop policy if exists "hooks_read_active" on public.hooks;
create policy "hooks_read_active" on public.hooks
  for select using (is_active = true);

-- Seed the 20 universal hooks. [bracketed] tokens are filled with product
-- details when a hook is selected.
insert into public.hooks (hook_template, category, why_it_works, sort_order)
select * from (values
  ('I tried every [product category] on the market and [product] is the only one that actually [result]',
   'social_proof', 'Frames the product as the survivor of an exhaustive search, which reads as earned credibility rather than a claim.', 10),
  ('Stop scrolling if you [pain point]',
   'pain_point', 'A pattern interrupt that self-selects the exact person who needs the product.', 20),
  ('Nobody talks about this but [surprising fact about product/industry]',
   'curiosity', 'Promises insider knowledge, which creates an open loop the viewer wants closed.', 30),
  ('I was today years old when I found out [product benefit]',
   'curiosity', 'A familiar meme format that makes a benefit feel like a fresh discovery.', 40),
  ('POV: you finally found a [product category] that actually works',
   'transformation', 'Puts the viewer inside the moment of relief, making the outcome feel personal.', 50),
  ('The [product category] industry doesn''t want you to know this',
   'controversy', 'Positions the brand as the honest insider against a faceless industry.', 60),
  ('I''ve been using [product] for [time period] and here''s what happened',
   'social_proof', 'A testimonial framing that promises a real, time-tested result.', 70),
  ('[Number] people bought this in the last [time period]. Here''s why.',
   'fomo', 'Hard social proof plus an open loop on the reason, driving both trust and curiosity.', 80),
  ('If you''re still using [old solution], I feel bad for you',
   'controversy', 'A mild provocation that makes the old way feel embarrassing and the new way obvious.', 90),
  ('My [friend/doctor/trainer] told me about [product] and I haven''t looked back',
   'authority', 'Borrows trust from a credible third party the viewer already respects.', 100),
  ('Here''s why [product] has [number] five-star reviews',
   'social_proof', 'Leads with quantified proof, then promises to justify it.', 110),
  ('You''re going to wish you knew about this sooner',
   'fomo', 'Implies the viewer is already behind, which sparks urgency to catch up.', 120),
  ('This is what [price] gets you',
   'curiosity', 'Anchors on price and forces the viewer to keep watching to judge the value.', 130),
  ('Before and after [time period] of using [product]',
   'transformation', 'The before/after frame is the most proven visual proof of a result.', 140),
  ('Unpopular opinion: [bold claim about product category]',
   'controversy', 'Signals a contrarian take, which the feed rewards with attention and debate.', 150),
  ('The difference between [cheap alternative] and [product] is [specific detail]',
   'pain_point', 'Makes a concrete comparison that justifies paying more.', 160),
  ('I almost didn''t buy [product] but then I saw [specific proof point]',
   'transformation', 'A relatable hesitation followed by the exact proof that flipped the decision.', 170),
  ('If [product] doesn''t [promise], I''ll [consequence]',
   'authority', 'A confident guarantee that signals the brand is sure of its own product.', 180),
  ('Things I wish I knew before buying a [product category]',
   'pain_point', 'Promises to save the viewer from mistakes, positioning the product as the smart choice.', 190),
  ('This [product] replaced [multiple products] in my routine',
   'pain_point', 'Frames the product as a simplifier that removes cost and clutter.', 200)
) as v(hook_template, category, why_it_works, sort_order)
where not exists (select 1 from public.hooks);
