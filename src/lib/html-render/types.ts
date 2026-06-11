import { z } from "zod";

// The eight concepts we render as pixel-perfect HTML/CSS and screenshot
// server-side instead of paying an image model. Detection is by concept NAME
// (normalized) because concept ids are per-database uuids.
export type HtmlRenderType =
  | "imessage"
  | "notes"
  | "reddit"
  | "tweet"
  | "tiktok"
  | "instagram_story"
  | "claude"
  | "chatgpt"
  | "discussion"
  | "inapp_proof"
  | "social_mashup";

// Normalized concept-name -> render type. Several aliases per type so small DB
// naming drift ("Reddit" vs "Reddit Thread", "ChatGPT" vs "ChatGPT Chat") still
// resolves. Keys are lowercased + stripped of non-alphanumerics.
const NAME_ALIASES: Record<string, HtmlRenderType> = {
  imessage: "imessage",
  notes: "notes",
  notesapp: "notes",
  reddit: "reddit",
  redditthread: "reddit",
  redditpost: "reddit",
  tweet: "tweet",
  twitter: "tweet",
  twitterx: "tweet",
  xpost: "tweet",
  tiktok: "tiktok",
  tiktokcomment: "tiktok",
  tiktokcommentui: "tiktok",
  tiktokcomments: "tiktok",
  instagramstory: "instagram_story",
  instagramstoryscreenshot: "instagram_story",
  igstory: "instagram_story",
  claudechat: "claude",
  claudeaichat: "claude",
  claude: "claude",
  chatgpt: "chatgpt",
  chatgptchat: "chatgpt",
  chatgptconversation: "chatgpt",
  discussion: "discussion",
  discussionthread: "discussion",
  forumthread: "discussion",
  facebookgroup: "discussion",
  facebookgrouppost: "discussion",
  communitythread: "discussion",
  inappproof: "inapp_proof",
  inappproofshot: "inapp_proof",
  proofshot: "inapp_proof",
  dashboardscreenshot: "inapp_proof",
  inappdashboard: "inapp_proof",
  socialmashup: "social_mashup",
  socialproofmashup: "social_mashup",
  proofmashup: "social_mashup",
  socialproofcollage: "social_mashup",
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function htmlRenderTypeForConcept(
  conceptName: string | null | undefined,
): HtmlRenderType | null {
  if (!conceptName) return null;
  return NAME_ALIASES[normalize(conceptName)] ?? null;
}

// A short human label per render type, used in prompts and UI copy.
export const HTML_RENDER_LABEL: Record<HtmlRenderType, string> = {
  imessage: "iMessage conversation",
  notes: "Apple Notes screenshot",
  reddit: "Reddit thread",
  tweet: "Tweet",
  tiktok: "TikTok comment section",
  instagram_story: "Instagram Story",
  claude: "Claude chat",
  chatgpt: "ChatGPT chat",
  discussion: "community discussion thread",
  inapp_proof: "in-app results screenshot",
  social_mashup: "social proof collage",
};

// ---------------------------------------------------------------------------
// Per-type content schemas. Claude fills these with believable on-screen text;
// the renderer consumes the validated object. Engagement counts are strings so
// Claude can produce realistic formatting ("1.2K", "847").
// ---------------------------------------------------------------------------

export const imessageContent = z.object({
  contact_name: z.string().min(1).max(40),
  messages: z
    .array(
      z.object({
        from: z.enum(["them", "me"]),
        text: z.string().min(1).max(300),
      }),
    )
    .min(2)
    .max(8),
});

export const notesContent = z.object({
  title: z.string().min(1).max(60),
  date: z.string().min(1).max(40),
  lines: z
    .array(
      z.object({
        text: z.string().min(1).max(160),
        bullet: z.boolean().optional(),
      }),
    )
    .min(2)
    .max(9),
});

// The Reddit concept renders as a single mobile post-detail screen (blue app
// header, subreddit row + Join, serif title, body, action bar). No comment
// threads. post_body is the multi-paragraph story (blank line between
// paragraphs); a short lowercase "EDIT:" final paragraph is encouraged.
export const redditContent = z.object({
  subreddit: z.string().min(1).max(40),
  post_title: z.string().min(1).max(160),
  post_author: z.string().min(1).max(40),
  posted: z.string().min(1).max(30),
  upvotes: z.string().min(1).max(12),
  comments_count: z.string().min(1).max(12),
  post_body: z.string().min(1).max(900),
});

export const tweetContent = z.object({
  name: z.string().min(1).max(40),
  handle: z.string().min(1).max(30),
  verified: z.boolean().optional(),
  time: z.string().min(1).max(30),
  text: z.string().min(1).max(280),
  replies: z.string().min(1).max(12),
  retweets: z.string().min(1).max(12),
  likes: z.string().min(1).max(12),
  views: z.string().max(12).optional(),
});

export const tiktokContent = z.object({
  username: z.string().min(1).max(40),
  caption: z.string().min(1).max(200),
  likes: z.string().min(1).max(12),
  comments_count: z.string().min(1).max(12),
  shares: z.string().min(1).max(12),
  comments: z
    .array(
      z.object({
        username: z.string().min(1).max(40),
        text: z.string().min(1).max(200),
        likes: z.string().min(1).max(12),
      }),
    )
    .min(3)
    .max(4),
});

export const instagramStoryContent = z.object({
  username: z.string().min(1).max(40),
  time_ago: z.string().min(1).max(20),
  overlay_lines: z.array(z.string().min(1).max(120)).min(1).max(4),
  sticker: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("poll"),
        question: z.string().min(1).max(80),
        option_a: z.string().min(1).max(30),
        option_b: z.string().min(1).max(30),
      }),
      z.object({
        type: z.literal("question"),
        prompt: z.string().min(1).max(80),
      }),
      z.object({
        type: z.literal("rating"),
        prompt: z.string().min(1).max(80),
      }),
    ])
    .optional(),
});

const chatMessages = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      // Plain text. "\n" splits paragraphs; lines starting with "- " render as
      // a bullet list; **bold** spans are honored.
      text: z.string().min(1).max(900),
    }),
  )
  .min(2)
  .max(4);

export const claudeContent = z.object({ messages: chatMessages });
export const chatgptContent = z.object({ messages: chatMessages });

// A community discussion (Facebook Group / forum style): an OP question and a
// few replies where the product surfaces as the genuine answer. The first reply
// is rendered as the accepted/top answer.
export const discussionContent = z.object({
  group_name: z.string().min(1).max(60),
  op_name: z.string().min(1).max(40),
  op_time: z.string().min(1).max(20),
  post_text: z.string().min(1).max(400),
  replies: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        text: z.string().min(1).max(300),
        likes: z.string().min(1).max(12),
        time: z.string().min(1).max(20),
      }),
    )
    .min(2)
    .max(4),
});

// A believable in-app dashboard (sales / analytics / results tracker): one hero
// metric with a positive trend, a simple bar chart, and a few supporting stats.
// chart values are relative bar heights (0-100); the renderer scales them.
export const inappProofContent = z.object({
  app_name: z.string().min(1).max(30),
  screen_label: z.string().min(1).max(50),
  hero_value: z.string().min(1).max(20),
  hero_label: z.string().min(1).max(50),
  hero_delta: z.string().max(20).optional(),
  chart: z.array(z.number().min(0).max(100)).min(4).max(12).optional(),
  stats: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        value: z.string().min(1).max(20),
      }),
    )
    .min(2)
    .max(4),
});

// A collage of mini social-proof cards from different platforms, all praising
// the product. Each card is styled lightly to its platform.
export const socialMashupContent = z.object({
  items: z
    .array(
      z.object({
        platform: z.enum([
          "tweet",
          "tiktok",
          "instagram",
          "review",
          "email",
          "facebook",
        ]),
        author: z.string().min(1).max(40),
        handle: z.string().max(40).optional(),
        text: z.string().min(1).max(220),
        stars: z.number().int().min(1).max(5).optional(),
        likes: z.string().max(12).optional(),
      }),
    )
    .min(3)
    .max(5),
});

export const RENDER_SCHEMAS: Record<HtmlRenderType, z.ZodTypeAny> = {
  imessage: imessageContent,
  notes: notesContent,
  reddit: redditContent,
  tweet: tweetContent,
  tiktok: tiktokContent,
  instagram_story: instagramStoryContent,
  claude: claudeContent,
  chatgpt: chatgptContent,
  discussion: discussionContent,
  inapp_proof: inappProofContent,
  social_mashup: socialMashupContent,
};

export type ImessageContent = z.infer<typeof imessageContent>;
export type NotesContent = z.infer<typeof notesContent>;
export type RedditContent = z.infer<typeof redditContent>;
export type TweetContent = z.infer<typeof tweetContent>;
export type TiktokContent = z.infer<typeof tiktokContent>;
export type InstagramStoryContent = z.infer<typeof instagramStoryContent>;
export type ChatContent = z.infer<typeof claudeContent>;
export type DiscussionContent = z.infer<typeof discussionContent>;
export type InappProofContent = z.infer<typeof inappProofContent>;
export type SocialMashupContent = z.infer<typeof socialMashupContent>;

export type RenderContent =
  | ImessageContent
  | NotesContent
  | RedditContent
  | TweetContent
  | TiktokContent
  | InstagramStoryContent
  | ChatContent
  | DiscussionContent
  | InappProofContent
  | SocialMashupContent;
