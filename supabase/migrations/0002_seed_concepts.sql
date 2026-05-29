-- paintgym: seed 17 default concepts.
-- Variables supported in prompt_template:
--   {{product_name}}, {{client_name}}, {{description}}, {{features}},
--   {{ingredients}}, {{price}}, {{product_image_url}}, {{logo_url}}

insert into public.concepts (name, description, prompt_template, sort_order, is_default)
values
  (
    'One Core Idea',
    'Single hero claim that distills the product into one striking visual idea.',
    'Static Meta/Instagram ad for {{product_name}} by {{client_name}}. One core idea — distill the product into a single striking visual claim drawn from: {{description}}. The hero product is centered on a clean editorial backdrop with confident typography. Use the product image: {{product_image_url}}. Place the logo subtly: {{logo_url}}. 4:5 aspect ratio. Photoreal, sharp, premium DTC look. No clutter, no extra copy.',
    10, true
  ),
  (
    'Three Main Benefits',
    'Three-up benefit layout showing the top reasons to buy.',
    'Static Meta ad for {{product_name}} highlighting three main benefits derived from: {{features}}. Three icon-led benefit blocks arranged in a clean grid above the hero product image: {{product_image_url}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Editorial type, generous whitespace, high contrast color blocking. Benefits read as short noun phrases, not full sentences.',
    20, true
  ),
  (
    'Bold Claim',
    'Oversized typographic claim that dominates the canvas.',
    'Static Meta ad for {{product_name}} by {{client_name}}. A single bold, oversized typographic claim derived from: {{description}}. Type fills most of the canvas; product image ({{product_image_url}}) sits small and confident in a lower corner. Logo: {{logo_url}}. 4:5. Punchy color palette, modern condensed sans-serif, no decorative noise.',
    30, true
  ),
  (
    'Us vs Them',
    'Side-by-side us-versus-them comparison highlighting category advantages.',
    'Static Meta ad: {{product_name}} from {{client_name}} versus a generic competitor. Split-screen layout: left side competitor (muted, dull), right side {{product_name}} (bright, confident) using {{product_image_url}}. Pull three contrast points from: {{features}}. Logo: {{logo_url}}. 4:5. Clear hierarchy, neutral check/x marks, no real competitor names or trademarks.',
    40, true
  ),
  (
    'Comparison Chart',
    'Feature comparison chart with check marks against category alternatives.',
    'Static Meta ad showing a clean comparison chart for {{product_name}}. Rows are feature attributes from: {{features}}. Columns: {{product_name}} versus three anonymized alternatives. Check marks for {{product_name}}, x marks for others. Product image: {{product_image_url}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Editorial table styling, premium typography, soft neutral background.',
    50, true
  ),
  (
    'Before & After',
    'Visible transformation story showing the result the product delivers.',
    'Static Meta ad for {{product_name}}. Before and after transformation split: left side shows the problem state implied by {{description}}, right side shows the resolved state delivered by the product ({{product_image_url}}). Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Photoreal, true-to-life lighting, honest documentary feel. Small label tags read Before and After.',
    60, true
  ),
  (
    'Old vs New',
    'Category reframe positioning the product as the modern replacement.',
    'Static Meta ad reframing the category: old way versus new way of solving the problem from {{description}}. Left half shows the dated approach (washed out, dusty palette). Right half shows the new way: {{product_name}} ({{product_image_url}}). Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Clean editorial divide, headline reads Old vs New.',
    70, true
  ),
  (
    'Social Proof / 5 Star Reviews',
    'Layered customer review quotes radiating around the hero product.',
    'Static Meta ad for {{product_name}}. Layered customer review cards with five-star ratings surrounding the hero product image: {{product_image_url}}. Three short quote snippets inspired by: {{description}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Soft drop shadows, warm neutral background, premium DTC feel. Stars are gold, type is editorial sans-serif.',
    80, true
  ),
  (
    'Price Drop',
    'Promo creative highlighting a discount or price anchor.',
    'Static Meta ad for {{product_name}} featuring a price drop callout. Original price {{price}} struck through next to a prominent new price tag. Hero product image: {{product_image_url}}. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Confident promotional layout, clear discount badge, editorial typography. Tasteful, not loud or gaudy.',
    90, true
  ),
  (
    'Stat-Based',
    'Single hero statistic that anchors the entire visual.',
    'Static Meta ad for {{product_name}} anchored by a single oversized hero statistic pulled from: {{description}} or {{features}}. The number dominates the canvas with a short clarifying line of supporting copy. Product image ({{product_image_url}}) sits compact below or beside the stat. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Editorial, high contrast, premium.',
    100, true
  ),
  (
    'Press Screenshot',
    'Mock editorial press feature that lends third-party credibility.',
    'Static Meta ad styled as a mock editorial press feature about {{product_name}} by {{client_name}}. Clean magazine layout with a fake (clearly stylized, non-trademarked) press logo at top, a confident headline summarizing {{description}}, body copy, and a hero product photo: {{product_image_url}}. Logo: {{logo_url}}. 4:5. Looks editorial, not advertorial.',
    110, true
  ),
  (
    'Platform Native',
    'Mimics native social platform UI to feel like organic content.',
    'Static Meta ad for {{product_name}} that mimics native Instagram organic post UI: post header with stylized handle, square hero image of the product ({{product_image_url}}), like and comment row, caption that reads like a real recommendation drawn from {{description}}. Brand: {{client_name}}, logo only in profile avatar position: {{logo_url}}. 4:5. Photoreal product, casual phone-camera feel.',
    120, true
  ),
  (
    'Comedic / Satire',
    'Light humor or satire that punches up a category truth.',
    'Static Meta ad for {{product_name}} with light comedic energy. Punch up a category truth implied by {{description}} with a single visual gag or absurd juxtaposition involving the product ({{product_image_url}}). Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Confident comedic timing in image composition, witty but not mean, copy reads as a single dry headline.',
    130, true
  ),
  (
    'Notes App',
    'Stylized iOS-Notes UI sharing a personal recommendation.',
    'Static Meta ad styled as a screenshot of the iOS Notes app. Title line names {{product_name}}, body reads like a personal recommendation drawn from {{description}} and {{features}}, ends with a quick mention of {{client_name}}. The note feels handwritten in tone but typed in the Notes monospace. Beneath or beside the notes card, small product thumbnail: {{product_image_url}}. Logo: {{logo_url}}. 4:5.',
    140, true
  ),
  (
    'Sticky Notes',
    'Hand-written sticky notes collage around the hero product.',
    'Static Meta ad for {{product_name}}. A collage of hand-written sticky notes (yellow, pink, blue) tacked around the hero product image ({{product_image_url}}). Each note carries a short benefit pulled from {{features}} in casual handwriting. Brand: {{client_name}}, logo: {{logo_url}}. 4:5. Tactile, warm, slightly playful, premium paper textures.',
    150, true
  ),
  (
    'Meme Based',
    'Static meme-format ad using a recognizable meme structure.',
    'Static Meta ad for {{product_name}} built around a recognizable meme structure (two-panel reaction or expanding-brain style — original art, not copyrighted stills). Punchline ties back to {{description}}. Product appears in the resolved panel using {{product_image_url}}. Brand: {{client_name}}, logo small: {{logo_url}}. 4:5. Confident meme layout, sharp typography, no watermarks.',
    160, true
  ),
  (
    'Low-Fi',
    'Phone-camera lo-fi aesthetic that reads as authentic UGC.',
    'Static Meta ad for {{product_name}} shot in a lo-fi UGC aesthetic — looks like an iPhone photo on a kitchen counter or messy desk. Slight motion blur, natural lighting, genuine context. Product front and center using {{product_image_url}}. Brand: {{client_name}}, logo barely visible: {{logo_url}}. Optional handwritten arrow or scribble pointing at the product with a 2-word reaction. 4:5. Authentic, not staged.',
    170, true
  );
