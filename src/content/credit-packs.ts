// Display credit packs shown on the pricing page. Kept in a plain (non-client)
// module so it can be imported by both the client pricing UI and server
// components (the pricing page metadata / Product JSON-LD).

export type Pack = {
  n: string;
  c: number;
  p: number;
  pop?: boolean;
  blurb: string;
  feats: string[];
};

export const CREDIT_PACKS: Pack[] = [
  {
    n: "Starter",
    c: 50,
    p: 39,
    blurb: "Test the waters",
    feats: ["50 ad credits", "All 49 frameworks", "4:5 high-res export"],
  },
  {
    n: "Plus",
    c: 110,
    p: 69,
    blurb: "For steady testing",
    feats: ["110 ad credits", "Competitor Spy", "Recreate-from-example"],
  },
  {
    n: "Pro",
    c: 300,
    p: 149,
    pop: true,
    blurb: "Most popular",
    feats: [
      "300 ad credits",
      "Brand kits",
      "Priority generation",
      "Version history",
    ],
  },
  {
    n: "Agency",
    c: 750,
    p: 299,
    blurb: "Volume for clients",
    feats: [
      "750 ad credits",
      "Multiple brands",
      "Team seats",
      "White-label export",
    ],
  },
];
