// The five production workflows from the AI Ad System 2.0 guide. Each renders
// as a vertical stepper on the /video page. A step can carry an optional
// `prompt` (a reusable template the user can copy) and `tool` chips.

export interface WorkflowStep {
  title: string;
  body: string;
  tool?: string;
  // A copyable prompt or master template tied to this step.
  prompt?: string;
}

export interface WorkflowSpec {
  id: string;
  name: string;
  method: string;
  summary: string;
  steps: WorkflowStep[];
}

export const SCRIPT_PROMPT_TEMPLATE =
  "You are an expert direct response advertiser specializing in ecom video ads. " +
  "Write 5 different ad hook options for this product that grab attention in under 4 seconds. " +
  "For each hook, write a complete 15-30 second script broken down scene by scene. " +
  "The script should sound like a real person talking to a friend about a product they love, not like an advertisement. " +
  "Lead with the emotional pain point, then show the transformation. " +
  "Include specific details about the product benefits. " +
  "Target audience: [audience]. Product: [product details].";

export const WORKFLOWS: WorkflowSpec[] = [
  {
    id: "full-ugc",
    name: "Full UGC Video Ad",
    method: "Arcads Method",
    summary:
      "End to end UGC ad: write the script, build the first frame, generate the talking head, add B-roll, and assemble in CapCut.",
    steps: [
      {
        title: "Write the script",
        body:
          "Claude writes 5 different ad hook options with 15-30 second scripts broken down scene by scene. Use the Script Generator below, or paste this template into Claude with your audience and product details filled in.",
        prompt: SCRIPT_PROMPT_TEMPLATE,
      },
      {
        title: "Create the first frame",
        body:
          "In Arcads, use the first frame feature to generate the opening image: your chosen avatar holding or using the product, framed like a selfie video. Match the avatar to your audience. Keep the product label readable. This frame sets the look for the whole talking head.",
        tool: "Arcads",
      },
      {
        title: "Generate the talking head video",
        body:
          "Paste your script into Arcads and pick the avatar and voice. Generate the talking head clip. Review for lip-sync and pacing, then regenerate any line that feels off. Most ads need 2 or 3 passes to land.",
        tool: "Arcads",
      },
      {
        title: "Generate B-roll",
        body:
          "Claude writes video prompts for the supporting shots: product on a table, close-up of the texture or label, and a lifestyle moment of someone using it. Generate each clip in Veo 3 or Kling. Use the Scene Prompt Generator below to draft these.",
        tool: "Veo 3 / Kling",
      },
      {
        title: "Assemble in CapCut",
        body:
          "Drop the talking head and B-roll on a 9:16 timeline. Cut on the beat, add captions, layer in trending music low under the voice, and end on a clean CTA card. Export at 1080p and upload to Meta.",
        tool: "CapCut",
      },
    ],
  },
  {
    id: "claymation",
    name: "Claymation Ad",
    method: "Claude + Higgsfield MCP",
    summary:
      "Drive Seedance or Kling through the Higgsfield MCP to render a stop-motion clay ad from a product photo.",
    steps: [
      {
        title: "Connect Claude to Higgsfield MCP",
        body:
          "Wire up the Higgsfield MCP so Claude can call Seedance and Kling directly. Check the connection panel below for status.",
        tool: "Higgsfield MCP",
      },
      {
        title: "Upload product photo as reference",
        body:
          "Give Claude a clean product photo on a plain background. This anchors the clay version of your product so the model keeps the label and silhouette recognizable.",
      },
      {
        title: "Paste the master prompt",
        body:
          "Paste the claymation master prompt with its scene breakdown. Fill in your product and setting where marked.",
        prompt:
          "Create a stop-motion claymation advertisement for [product]. Clay characters with visible fingerprint textures, miniature handcrafted sets, soft practical lighting, shallow depth of field. Scene breakdown: 0-3s establishing shot of the miniature world with the product hero in frame. 3-8s close-up on the clay character discovering and reacting to the product. 8-12s miniature scene showing the product in playful use. 12-15s CTA card sculpted in clay with the brand name. Warm, tactile, handmade feel throughout.",
        tool: "Seedance / Kling",
      },
      {
        title: "Claude executes via Higgsfield MCP",
        body:
          "Claude calls the model through the MCP and returns the rendered clips. Each beat comes back as its own asset you can review.",
        tool: "Higgsfield MCP",
      },
      {
        title: "Iterate with natural language feedback",
        body:
          "Refine in plain language: make the clay shinier, slow the camera move, push the product closer. Claude re-runs the relevant beat until it lands.",
      },
      {
        title: "Download and polish in CapCut",
        body:
          "Stitch the beats on a 9:16 timeline. Add captions, a stop-motion friendly music bed, and the CTA. Export at 1080p.",
        tool: "CapCut",
      },
    ],
  },
  {
    id: "cartoon",
    name: "Cartoon / Illustration Ad",
    method: "Claude + Higgsfield MCP",
    summary:
      "Render a Pixar-style or graphic-novel ad through Seedance via the Higgsfield MCP, then polish in CapCut.",
    steps: [
      {
        title: "Connect Claude to Higgsfield MCP",
        body:
          "Wire up the Higgsfield MCP so Claude can call Seedance directly. Check the connection panel below for status.",
        tool: "Higgsfield MCP",
      },
      {
        title: "Upload product photo and style reference",
        body:
          "Provide a clean product photo plus a style reference image that captures the look you want (a Pixar still, a children's book page, a graphic novel panel). The reference steers the render.",
      },
      {
        title: "Paste the master prompt",
        body:
          "Paste the cartoon master prompt with its scene breakdown. Fill in your product and character where marked.",
        prompt:
          "Create a Pixar-style 3D animated advertisement for [product]. Expressive character, warm cinematic lighting, soft rounded shapes, vibrant but tasteful color palette. Scene breakdown: 0-3s discovery, the character notices the product and lights up. 3-8s transformation, the product changes the character's day for the better. 8-12s benefits, quick playful shots of the product solving the problem. 12-15s CTA card with the brand name in a friendly animated title. Charming, optimistic, family-friendly tone.",
        tool: "Seedance",
      },
      {
        title: "Iterate style variations",
        body:
          "Generate a few looks off the same script: the Pixar 3D version and a 2D graphic novel version with bold ink lines and flat color. Testing two distinct styles tells you which the audience responds to.",
      },
      {
        title: "Download and finish in CapCut",
        body:
          "Bring the clips into CapCut on a 9:16 timeline, add captions and music, and export at 1080p.",
        tool: "CapCut",
      },
    ],
  },
  {
    id: "lofi",
    name: "Ugly Lo-Fi Ad",
    method: "Fast Authentic Method",
    summary:
      "The highest-CTR Meta format. Write a raw script, generate handheld footage, then rough it up in CapCut so it reads as a real phone video.",
    steps: [
      {
        title: "Write a raw conversational script",
        body:
          "Keep it under 20 seconds. Strong hook, then problem, then solution, then a line of social proof, then the CTA. Write how a friend actually talks, not how an ad sounds. Use the Script Generator below and pick the Lo-Fi format.",
      },
      {
        title: "Generate base footage via Higgsfield MCP",
        body:
          "Generate the handheld base clip with the lo-fi prompt. Swap in your person, product, and setting.",
        prompt:
          "generate lo-fi handheld phone footage style video of [person] demonstrating [product] in an everyday setting. Shaky cam, natural room lighting, imperfect focus, casual energy. Raw UGC aesthetic.",
        tool: "Higgsfield MCP",
      },
      {
        title: "Import into CapCut at 9:16",
        body:
          "Drop the clip on a 9:16 timeline and add the grit: a touch of camera shake, a film grain filter, a slight vignette, and a warm desaturated color grade. The goal is to make it look unpolished on purpose.",
        tool: "CapCut",
      },
      {
        title: "Cut it casual",
        body:
          "Quick cuts, fast zoom-ins, casual text overlays in a trending font, a few emojis. Record a casual voiceover on your phone or use ElevenLabs for a natural read.",
        tool: "ElevenLabs",
      },
      {
        title: "Export and upload",
        body:
          "Export 9:16 at 1080p and upload directly to Meta. Lo-fi ads often beat polished ones on the feed, so test it against your best produced creative.",
      },
    ],
  },
  {
    id: "volume-test",
    name: "Fast Volume Ad Testing",
    method: "Creatify Method",
    summary:
      "Spin up many variations fast from a product URL and curated reference clips, then let a Meta CBO campaign find the winner.",
    steps: [
      {
        title: "Paste product URL into Creatify",
        body:
          "Drop your product URL into Creatify. It pulls the images, copy, and pricing it needs to assemble ad variations automatically.",
        tool: "Creatify",
      },
      {
        title: "Curate reference assets",
        body:
          "Pull high-performing videos in your niche from the TikTok Creative Center and the Meta Ad Library. These give Creatify proven hooks, pacing, and scene structures to model.",
      },
      {
        title: "Generate the variations",
        body:
          "Creatify assembles multiple variations with different hooks, scenes, and CTAs from your inputs. Aim for a batch you can test in a single campaign.",
        tool: "Creatify",
      },
      {
        title: "Test in a Meta CBO campaign",
        body:
          "Load every variation into one Meta CBO campaign at 50 dollars per day and let the budget flow to the winners. Kill the losers, scale the winner, and feed what you learn back into the next batch.",
        tool: "Meta Ads",
      },
    ],
  },
  {
    id: "cinematic",
    name: "Cinematic Product Demo Ad",
    method: "Veo 3 / Kling Method",
    summary:
      "B-roll style product film: plan the beats, render each shot in Veo 3 or Kling, then grade and cut in CapCut for a premium look.",
    steps: [
      {
        title: "Plan the shot list",
        body:
          "Claude breaks the product story into cinematic beats: an establishing shot, a hero close-up, the product in use, and a payoff. Use the Script Studio below with the Cinematic format to draft the beats and scene descriptions.",
      },
      {
        title: "Generate B-roll clips",
        body:
          "Render one clip per beat in Veo 3 or Kling through the Higgsfield MCP. Use the Scene Prompt Generator to turn each beat into a rich, camera-aware prompt. Generate a couple of takes per beat so you have options in the edit.",
        tool: "Veo 3 / Kling",
      },
      {
        title: "Capture the hero product shot",
        body:
          "Get one clean hero close-up with shallow depth of field and soft, directional light. This is the shot that sells the build quality, so give it extra takes.",
      },
      {
        title: "Add lifestyle scenes",
        body:
          "Render the product in its real setting with a person interacting naturally. Lifestyle context makes the demo feel aspirational rather than clinical.",
      },
      {
        title: "Assemble in CapCut",
        body:
          "Sequence the clips on a 9:16 timeline, apply a consistent color grade, lay in a cinematic music bed, add restrained captions, and close on a clean CTA. Export at 1080p.",
        tool: "CapCut",
      },
    ],
  },
];

export function getWorkflow(id: string): WorkflowSpec | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}

// External tools the section will eventually call. Rendered as connection
// placeholder cards. Status is hardcoded "not connected" until APIs land.
export interface IntegrationSpec {
  key: string;
  name: string;
  blurb: string;
  icon: string;
}

export const INTEGRATIONS: IntegrationSpec[] = [
  {
    key: "higgsfield",
    name: "Higgsfield MCP",
    blurb: "Drives Seedance and Kling for clay, cartoon, and lo-fi renders.",
    icon: "layers",
  },
  {
    key: "arcads",
    name: "Arcads",
    blurb: "AI UGC avatars and first-frame talking head video.",
    icon: "user",
  },
  {
    key: "creatify",
    name: "Creatify",
    blurb: "Fast volume variations straight from a product URL.",
    icon: "bolt",
  },
  {
    key: "heygen",
    name: "HeyGen",
    blurb: "Avatar talking head video and voice cloning.",
    icon: "target",
  },
  {
    key: "elevenlabs",
    name: "ElevenLabs",
    blurb: "Natural AI voiceover for lo-fi and B-roll ads.",
    icon: "sparkle",
  },
];
