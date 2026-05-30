const SEED_PROJECTS = [
  {
    id: "etherflow",
    code: "CF-7742",
    name: "EtherFlow",
    description:
      "A seamless DeFi dashboard for multi-chain asset management. Failed after 14 months due to critical lack of product-market fit in a saturated retail market.",
    causeOfDeath: "NO_PMF",
    techCategory: "WEB3",
    techStack: ["REACT", "SOLIDITY", "GRAPHQL"],
    deceasedDate: "OCT 2023",
    upvotes: 142,
    views: 890,
    autopsyFailures: [
      { cause: "SCALABILITY_COLLAPSE", title: "Database Deadlock", description: "Graph DB saturation triggered 99% CPU deadlock.", severity: "error" },
      { cause: "MARKET_REJECTION", title: "Retail PMF Gap", description: "No traction in saturated DeFi retail segment.", severity: "warning" },
    ],
    reanimationPhases: [
      { title: "Stripping the Fat", description: "Remove multi-chain bloat; ship single-chain MVP.", progress: 3 },
      { title: "The Phoenix Pivot", description: "Pivot to dev tooling for DeFi integrators.", progress: 1 },
      { title: "Alpha Re-Ignition", description: "Locked: community quorum required.", progress: 0, locked: true },
    ],
    financialBreakdown: [
      { label: "Cloud Infrastructure", amount: "$450k", percent: 75 },
      { label: "Smart Contract Audits", amount: "$200k", percent: 50 },
    ],
  },
  {
    id: "synthetix-ai",
    code: "CF-9012",
    name: "Synthetix.AI",
    description:
      "Automated content generation for niche technical blogs. Solo founder burnout after constant pivot requests from non-technical investors.",
    causeOfDeath: "BURNOUT",
    techCategory: "AI/ML",
    techStack: ["PYTHON", "PYTORCH", "FASTAPI"],
    deceasedDate: "JAN 2024",
    upvotes: 256,
    views: 1204,
    autopsyFailures: [
      { cause: "BURNOUT", title: "Founder Flatline", description: "Solo maintainer exit after investor pivot pressure.", severity: "error" },
    ],
    reanimationPhases: [
      { title: "Open Source Core", description: "Release inference pipeline as OSS.", progress: 2 },
      { title: "Niche Newsletter API", description: "B2B API for technical newsletters only.", progress: 1 },
    ],
  },
  {
    id: "peermesh",
    code: "CF-1105",
    name: "PeerMesh",
    description:
      "Decentralized mesh networking for remote communities. Founder disagreement over IP ownership led to a total project halt during Beta.",
    causeOfDeath: "TEAM_SPLIT",
    techCategory: "NETWORK",
    techStack: ["RUST", "GO", "WASM"],
    deceasedDate: "MAR 2024",
    upvotes: 89,
    views: 445,
    autopsyFailures: [
      { cause: "TEAM_SPLIT", title: "IP Schism", description: "Co-founders split over mesh protocol ownership.", severity: "error" },
    ],
    reanimationPhases: [{ title: "License Clarity", description: "Resolve IP before any fork.", progress: 0 }],
  },
  {
    id: "cartvault",
    code: "CF-8821",
    name: "CartVault",
    description:
      "Privacy-first e-commerce loyalty wrapper. Burn rate exceeded growth after Series A talks collapsed during the 2023 downturn.",
    causeOfDeath: "NO_FUNDING",
    techCategory: "E-COMMERCE",
    techStack: ["NEXTJS", "SUPABASE", "STRIPE"],
    deceasedDate: "FEB 2024",
    upvotes: 178,
    views: 672,
    autopsyFailures: [
      { cause: "NO_FUNDING", title: "Runway Hemorrhage", description: "Series A collapsed; 4 months runway left.", severity: "error" },
    ],
    reanimationPhases: [{ title: "Bootstrap Mode", description: "Strip to loyalty API only.", progress: 1 }],
  },
  {
    id: "algomancer",
    code: "CF-4432",
    name: "AlgoMancer",
    description:
      "Gamified trading simulator for high-frequency strategies. Over-engineered backend with a UI too complex for casual traders.",
    causeOfDeath: "NO_PMF",
    techCategory: "AI/ML",
    techStack: ["C++", "KAFKA", "DOCKER"],
    deceasedDate: "DEC 2023",
    upvotes: 312,
    views: 1560,
    autopsyFailures: [
      { cause: "NO_PMF", title: "Complexity Overload", description: "Casual traders bounced in onboarding.", severity: "warning" },
    ],
    reanimationPhases: [{ title: "Paper Trading Only", description: "Remove live trading; education focus.", progress: 2 }],
  },
  {
    id: "neuralnet-social",
    code: "NS-2041-FF",
    name: "NeuralNet Social",
    description:
      "AI-driven social intelligence platform. Database deadlock and invasive mood-mapping caused 84% churn after week one.",
    causeOfDeath: "NO_PMF",
    techCategory: "AI/ML",
    techStack: ["PYTHON", "NEO4J", "REACT"],
    deceasedDate: "OCT 202X",
    founder: 'Alex "Void" Chen',
    valuationLoss: "-$1.2M",
    upvotes: 1024,
    views: 4200,
    autopsyFailures: [
      {
        cause: "SCALABILITY_COLLAPSE",
        title: "Database Deadlock",
        description:
          'The graph database reached critical saturation within 48 hours. Recursive query chains for "Social Intelligence" scores triggered a 99% CPU deadlock.',
        severity: "error",
      },
      {
        cause: "MARKET_REJECTION",
        title: "Uncanny Valley UI",
        description:
          'Users found the AI-driven "Emotion Prediction" feature invasive. 84% churn after the first Mood Mapping notification.',
        severity: "warning",
      },
    ],
    reanimationPhases: [
      {
        title: "Stripping the Fat",
        description: "Remove all predictive AI layers. Rebuild as raw data-visualization for developer networks.",
        progress: 3,
      },
      {
        title: "The Phoenix Pivot",
        description: "Transition to decentralized hosting (P2P) to eliminate infrastructure cost sinkhole.",
        progress: 1,
      },
      {
        title: "Alpha Re-Ignition",
        description: "Locked: Requires community quorum for activation. Estimated costs: TBD.",
        progress: 0,
        locked: true,
      },
    ],
    financialBreakdown: [
      { label: "Cloud Infrastructure", amount: "$450k", percent: 75 },
      { label: "AI Model Training", amount: "$600k", percent: 90 },
    ],
  },
];

const SEED_COMMENTS = {
  "neuralnet-social": [
    { author: "@kernel_panic", text: "Saw the database logs. It wasn't the queries, it was lazy GC in the middleware.", hoursAgo: 2 },
    { author: "@void_pointer_00", text: "Classic over-engineering the 'why' and ignoring the 'how'. Sad burial.", hoursAgo: 4 },
    { author: "@stack_overflowed", text: "Can we get the source on a public repo? I'd take a crack at reanimating Phase 1.", hoursAgo: 5 },
  ],
};

const DEATH_TOLL_BASE = 42069;
