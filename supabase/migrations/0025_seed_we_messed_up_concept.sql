-- paintgym: seed concept #50 — "We're Sorry / We Messed Up" (apology / humble-brag).
--
-- An ordinary image-model concept (templated prompt with {{vars}}). The brand
-- leads with a fake apology or humble confession ("we didn't expect to sell out",
-- "we built it for X but you use it for Y") that is actually social proof, then
-- ends with a make-good offer. Vulnerability disarms; selling out signals demand.
--
-- Variables supported in prompt_template:
--   {{product_name}}, {{client_name}}, {{description}}, {{features}},
--   {{ingredients}}, {{price}}, {{product_image_url}}, {{logo_url}}
--
-- Idempotent: inserted only if a default by that name is missing, so it is safe
-- to re-run on a database that already has it.

insert into public.concepts (name, description, prompt_template, sort_order, is_default, active)
select v.name, v.description, v.prompt_template, v.sort_order, true, true
from (values
  (
    'We''re Sorry / We Messed Up',
    'A fake-apology "we messed up" founder letter where the confession is secretly a humble brag (sold out, underestimated demand, built it for X but customers use it for Y), then a make-good offer. Vulnerability disarms and doubles as social proof.',
    'Static Meta ad for {{product_name}} by {{client_name}} in the ''we messed up'' apology format. A bold headline like ''WE MESSED UP...'' or ''WE''RE SORRY'' at the top. Below it, a short founder-style confession letter (3 to 4 short paragraphs) that leads with an honest admission but reveals it is actually a humble brag drawn from {{description}} (selling out, underestimating demand, or designing it for one use case when customers found a better one). The tone is vulnerable, personal, and slightly self-deprecating. End with a make-good offer or CTA. Product image featured: {{product_image_url}}. Colorful background, product visible, the text is the star. Brand: {{client_name}}, logo: {{logo_url}}. 4:5.',
    420
  )
) as v(name, description, prompt_template, sort_order)
where not exists (
  select 1 from public.concepts c
  where lower(c.name) = lower(v.name) and c.is_default = true
);
