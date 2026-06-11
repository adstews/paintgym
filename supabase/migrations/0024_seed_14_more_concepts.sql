-- paintgym: seed 14 more default concepts (bringing the library to 49).
--
-- Eleven are ordinary image-model concepts (templated prompt with {{vars}}).
-- Three are HTML-rendered "screenshot" concepts (Discussion Thread, In-App Proof
-- Shot, Social Proof Mashup) that follow the same pattern as the existing eight:
-- Claude writes the structured on-screen text (render_content) and we screenshot
-- a React component server-side, so they cost 0 image-generation credits. Their
-- render components live in src/lib/html-render/ and resolve by concept name.
--
-- Variables supported in image-model prompt_template:
--   {{product_name}}, {{client_name}}, {{description}}, {{features}},
--   {{ingredients}}, {{price}}, {{product_image_url}}, {{logo_url}}
--
-- Idempotent: each concept is inserted only if a default by that name is missing,
-- so this is safe to re-run on a database that already has some of them.

insert into public.concepts (name, description, prompt_template, sort_order, is_default, active)
select v.name, v.description, v.prompt_template, v.sort_order, true, true
from (values
  (
    'Anti-Ad',
    'Deliberately ugly, no-design creative that opens like an honest founder note. Raw, unpolished pattern-interrupt that reads as authentic.',
    'Static Meta ad for {{product_name}} by {{client_name}} that deliberately rejects design. A plain white background with raw black text, or messy handwriting-style scrawl, like a founder typed an honest unfiltered note. Opens with an anti-marketing line in the spirit of "this is not an ad" or "my marketing team is going to hate this". The copy is a candid, personal case for the product drawn from {{description}}. No logo prominence, no polish, no stock-photo gloss. Tiny product image only if it helps: {{product_image_url}}. 4:5. Reads as authentic and human, the opposite of an ad.',
    280
  ),
  (
    'Checkerboard (4-Panel Grid)',
    'A 2x2 grid showing four product uses, angles, or benefits in one frame. Each quadrant is its own micro-ad.',
    'Static Meta ad for {{product_name}} as a clean 2x2 grid: four distinct panels, each showing a different use case, angle, or benefit drawn from {{features}} and {{description}}. Each quadrant has its own short caption and uses the product image where relevant: {{product_image_url}}. Brand: {{client_name}}, logo subtle: {{logo_url}}. 4:5. The four frames read together as one complete story. Crisp gridlines, consistent lighting across panels, premium DTC look.',
    290
  ),
  (
    'Discussion Thread',
    'A community discussion thread (Facebook Group / forum style) where the product comes up naturally as the answer. Rendered as a pixel-perfect screenshot, no image-generation cost.',
    'A community discussion thread in a relevant Facebook Group or forum: a group name, a member''s question-style post about a relatable problem, and a few replies where the product is recommended as the genuine answer, with believable names, reactions, and timestamps.',
    300
  ),
  (
    'Starter Pack Grid',
    'The "starter pack" meme format applied to the ideal customer, with the product featured among lifestyle items.',
    'Static Meta ad for {{product_name}} in the "starter pack" meme format: a titled grid of 4 to 6 labeled items that define the target customer''s identity (drawn from {{description}}), with the product featured prominently as one of the essential items using {{product_image_url}}. Headline reads like "The [persona] starter pack". Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Fun, relatable, shareable, flat-lay style with clean labels.',
    310
  ),
  (
    'Street Interview Snapshot',
    'A still frame from a person-on-the-street reaction with a bold pull-quote overlay. Spontaneous and unscripted.',
    'Static Meta ad for {{product_name}} styled as a still frame from a person-on-the-street interview. A candid, real-looking person reacting positively, with a bold pull-quote overlay of their reaction drawn from {{description}}. Lower-third caption bar like a street interview clip. Product visible or held: {{product_image_url}}. Brand: {{client_name}}, logo small: {{logo_url}}. 4:5. Spontaneous, unscripted, documentary feel, natural daylight.',
    320
  ),
  (
    'In-App Proof Shot',
    'A screenshot of real-looking in-app data (sales dashboard, analytics, results tracker) proving the product''s results. Rendered as a pixel-perfect screenshot, no image-generation cost.',
    'A clean in-app dashboard screenshot (sales, analytics, or a results tracker) showing impressive but believable metrics tied to the product: a hero number with a positive trend, a simple chart, and a few supporting stats with labels.',
    330
  ),
  (
    'Three-Stat Scoreboard',
    'Three bold stats arranged like a sports scoreboard, building a cumulative case from multiple proof points.',
    'Static Meta ad for {{product_name}} laid out like a sports scoreboard or dashboard: three large statistics front and center pulled from {{features}} or {{description}}, each with a short label beneath. The three stats together build an overwhelming, cumulative case. Product image compact alongside: {{product_image_url}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Bold numerals, high contrast, confident editorial typography.',
    340
  ),
  (
    'Listicle Ad',
    'A numbered list as the entire ad, with a BuzzFeed-style headline and short punchy reasons to buy.',
    'Static Meta ad for {{product_name}} built as a numbered listicle: a compelling BuzzFeed-style headline at the top (e.g. "7 reasons this replaced my entire routine") and 5 to 7 numbered points, each one short, punchy reason to buy drawn from {{features}} and {{description}}. Small product image: {{product_image_url}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Clean scannable typography that reads easily in the feed.',
    350
  ),
  (
    'Social Proof Mashup',
    'A collage of mini-screenshots from multiple platforms (tweet, review, comment, email) all praising the product in one frame. Rendered as a pixel-perfect screenshot, no image-generation cost.',
    'A collage of three to five mini social-proof cards from different platforms (a tweet, a five-star review, a TikTok or Instagram comment, an email) all praising the product, each with a believable author, short quote, and platform styling.',
    360
  ),
  (
    'Educational Explainer',
    'A clean infographic-style static that teaches something genuinely useful with the product woven in. Value-first.',
    'Static Meta ad for {{product_name}} as an infographic-style educational explainer that teaches the viewer something genuinely useful about the product''s category (drawn from {{description}}), with the product woven in naturally as the solution using {{product_image_url}}. Clean labeled diagram or numbered steps. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Value-first, informative, premium infographic design, restrained palette.',
    370
  ),
  (
    'Product-in-Motion Hero',
    'Splash shot, action freeze-frame, or dynamic product photography that implies movement and energy.',
    'Static Meta ad for {{product_name}} by {{client_name}} as a dynamic, high-energy hero shot with implied motion: splashing liquid, flying ingredients, mid-pour, mid-bite, or an action freeze-frame, built around {{description}}. The product ({{product_image_url}}) is the hero and the movement creates visual drama that stops the scroll. Logo subtle: {{logo_url}}. 4:5. Photoreal, crisp motion, dramatic studio lighting.',
    380
  ),
  (
    'Hand-Holding-Product (POV Shot)',
    'First-person perspective of someone holding or using the product. Makes ownership feel immediate.',
    'Static Meta ad for {{product_name}} as a first-person POV shot: a hand holding or using the product as if the viewer is the one using it, in a real-world setting drawn from {{description}}. The product ({{product_image_url}}) fills the frame, natural lighting. Brand: {{client_name}}, logo small: {{logo_url}}. 4:5. Immediate, tangible, makes ownership feel real.',
    390
  ),
  (
    'Behind-the-Scenes / Process Proof',
    'Shows how the product is made, packed, or sourced. Transparency that builds trust and justifies premium positioning.',
    'Static Meta ad for {{product_name}} as a behind-the-scenes look at how it is made, packed, or sourced: a factory floor, hands pouring ingredients, quality inspection, or a packaging line, grounded in {{description}}. Product present: {{product_image_url}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Raw and real, showing the care and craft that justify premium positioning. Documentary lighting, honest texture.',
    400
  ),
  (
    'Cultural Reference Ad',
    'Ties the product to a trending cultural moment, show, or meme format without using copyrighted material.',
    'Static Meta ad for {{product_name}} that ties to a trending cultural moment, show, or meme format without using any copyrighted material or recognizable IP. The cultural reference is the hook and the product is the payoff, connected through {{description}}. Product image: {{product_image_url}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Bold, timely, personality-driven, original art only.',
    410
  )
) as v(name, description, prompt_template, sort_order)
where not exists (
  select 1 from public.concepts c
  where lower(c.name) = lower(v.name) and c.is_default = true
);
