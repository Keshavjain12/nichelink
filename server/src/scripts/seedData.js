/**
 * Realistic demo content for local development and live demos. Every person, company and
 * community here is fictional.
 */

export const DEMO_ACCOUNTS = Object.freeze({
  admin: 'admin@nichelink.demo',
  pro: 'pro@nichelink.demo',
  free: 'free@nichelink.demo',
});

export const USERS = [
  {
    key: 'priya',
    name: 'Priya Raman',
    username: 'priya_raman',
    email: DEMO_ACCOUNTS.admin,
    admin: true,
    headline: 'Community Lead at NicheLink · ex-Developer Relations',
    bio: 'I run community operations and moderation at NicheLink. Previously led developer relations for a payments API. Happy to talk community design, docs and DX.',
    location: 'Bengaluru, India',
    skills: ['Community Building', 'Developer Relations', 'Technical Writing', 'Node.js'],
    interests: ['documentation', 'saas', 'remote-work'],
  },
  {
    key: 'daniel',
    name: 'Daniel Okafor',
    username: 'daniel_okafor',
    email: DEMO_ACCOUNTS.pro,
    plan: 'pro',
    headline: 'Founding Engineer at Ledgerly · Building billing infra for B2B SaaS',
    bio: 'Full-stack engineer obsessed with multi-tenant SaaS, Stripe integrations and boring, reliable backends. Remote since 2019, currently in Lisbon.',
    location: 'Lisbon, Portugal',
    website: 'https://example.com/daniel',
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Stripe', 'React'],
    interests: ['saas', 'startups', 'distributed-systems'],
  },
  {
    key: 'sofia',
    name: 'Sofia Marquez',
    username: 'sofia_writes',
    email: DEMO_ACCOUNTS.free,
    headline: 'Technical Writer · API documentation & docs-as-code',
    bio: 'I turn complex APIs into docs developers actually enjoy reading. Exploring the jump from agency work to an in-house docs team.',
    location: 'Mexico City, Mexico',
    skills: ['Technical Writing', 'OpenAPI', 'Markdown', 'Docusaurus'],
    interests: ['documentation', 'api-docs', 'remote-work'],
  },
  {
    key: 'meilin',
    name: 'Mei Lin Zhang',
    username: 'meilin_ml',
    plan: 'pro',
    headline: 'Senior ML Engineer · LLM evaluation & retrieval systems',
    bio: 'Building evaluation pipelines for retrieval-augmented generation. Previously computer vision at a robotics startup.',
    location: 'Singapore',
    skills: ['Python', 'PyTorch', 'LLM', 'RAG', 'Evals'],
    interests: ['llm', 'machine-learning', 'evals'],
  },
  {
    key: 'arjun',
    name: 'Arjun Mehta',
    username: 'arjun_devops',
    headline: 'Platform Engineer · Kubernetes, Terraform, paved roads',
    bio: 'Making deploys boring for 200 engineers. Terraform module hoarder. Currently learning Rust on weekends.',
    location: 'Pune, India',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'GitHub Actions'],
    interests: ['kubernetes', 'ci-cd', 'observability'],
  },
  {
    key: 'hannah',
    name: 'Hannah Fischer',
    username: 'hannah_docs',
    plan: 'pro',
    headline: 'Head of Documentation at Quanta Cloud',
    bio: 'Leading a distributed team of six technical writers. Docs-as-code evangelist and conference speaker.',
    location: 'Berlin, Germany',
    skills: ['Technical Writing', 'Information Architecture', 'Docs-as-Code', 'Vale'],
    interests: ['documentation', 'writing', 'leadership'],
  },
  {
    key: 'tomas',
    name: 'Tomás Alvarez',
    username: 'tomas_nomad',
    headline: 'Product Designer · 31 countries and counting',
    bio: 'Freelance product designer working with early-stage startups from wherever the Wi-Fi is decent.',
    location: 'Currently: Medellín, Colombia',
    skills: ['Figma', 'Design Systems', 'UX Research'],
    interests: ['travel', 'coworking', 'design-systems'],
  },
  {
    key: 'amara',
    name: 'Amara Nwosu',
    username: 'amara_frontend',
    plan: 'pro',
    headline: 'Staff Frontend Engineer · Design systems & accessibility',
    bio: 'Leading our design-system team. I care a lot about accessible components and fast first paints.',
    location: 'Lagos, Nigeria',
    skills: ['React', 'TypeScript', 'Accessibility', 'CSS'],
    interests: ['react', 'accessibility', 'performance', 'leadership'],
  },
  {
    key: 'lukas',
    name: 'Lukas Novak',
    username: 'lukas_go',
    headline: 'Backend Engineer · Go & event-driven systems',
    bio: 'Writing Go services that process a few billion events a month. Kafka survivor.',
    location: 'Prague, Czechia',
    skills: ['Go', 'Kafka', 'PostgreSQL', 'gRPC'],
    interests: ['go', 'distributed-systems', 'postgresql'],
  },
  {
    key: 'chloe',
    name: 'Chloé Dubois',
    username: 'chloe_pm',
    plan: 'pro',
    headline: 'Senior Product Manager · Async-first B2B teams',
    bio: 'PM for a fully remote analytics product. Writing about discovery, roadmaps and running teams across 9 time zones.',
    location: 'Montréal, Canada',
    skills: ['Product Strategy', 'User Research', 'SQL', 'Roadmapping'],
    interests: ['product-management', 'async', 'discovery'],
  },
  {
    key: 'kenji',
    name: 'Kenji Watanabe',
    username: 'kenji_builds',
    plan: 'pro',
    headline: 'Solo founder · Formpilot (bootstrapped SaaS, $18k MRR)',
    bio: 'Bootstrapping a form-automation SaaS. Sharing numbers, mistakes and pricing experiments in public.',
    location: 'Osaka, Japan',
    skills: ['Ruby on Rails', 'Marketing', 'Stripe', 'SEO'],
    interests: ['startups', 'saas', 'growth'],
  },
  {
    key: 'olivia',
    name: 'Olivia Bennett',
    username: 'olivia_bennett',
    headline: 'Developer Advocate · Former support engineer',
    bio: 'Moved from support into developer advocacy. Interested in docs, tutorials and community programs.',
    location: 'Manchester, UK',
    skills: ['JavaScript', 'Public Speaking', 'Technical Writing'],
    interests: ['documentation', 'saas', 'remote-work'],
  },
  {
    key: 'rafael',
    name: 'Rafael Costa',
    username: 'rafael_sre',
    plan: 'pro',
    headline: 'Principal SRE · Incident response & reliability culture',
    bio: 'Fifteen years of pagers. Now helping teams adopt SLOs without drowning in dashboards.',
    location: 'São Paulo, Brazil',
    skills: ['SRE', 'Kubernetes', 'Prometheus', 'Go', 'Incident Management'],
    interests: ['observability', 'kubernetes', 'leadership', 'architecture'],
  },
  {
    key: 'nadia',
    name: 'Nadia Haddad',
    username: 'nadia_data',
    headline: 'Data Scientist transitioning into ML engineering',
    bio: 'Three years of analytics, now shipping my first models to production. Asking lots of questions.',
    location: 'Amman, Jordan',
    skills: ['Python', 'SQL', 'scikit-learn'],
    interests: ['machine-learning', 'llm', 'python'],
  },
  {
    key: 'ethan',
    name: 'Ethan Brooks',
    username: 'ethan_brooks',
    headline: 'Full-stack developer · Freelance',
    bio: 'Freelance full-stack developer building MVPs for agencies.',
    location: 'Austin, USA',
    skills: ['React', 'Node.js', 'MongoDB'],
    interests: ['react', 'node-js', 'saas'],
  },
];

export const COMMUNITIES = [
  {
    key: 'saas',
    name: 'SaaS Developers',
    slug: 'saas-developers',
    icon: '🚀',
    accentColor: '#4f46e5',
    category: 'Engineering',
    accessType: 'public',
    isFeatured: true,
    tagline:
      'Multi-tenancy, billing, auth and everything else nobody tells you about shipping SaaS',
    description:
      'A home for engineers building and scaling software-as-a-service products. Share architecture decisions, billing war stories, pricing experiments and the tooling that keeps small teams shipping.',
    tags: ['saas', 'stripe', 'multi-tenancy', 'node-js', 'react'],
    rules: [
      {
        title: 'Share context',
        description: 'Mention team size, stack and constraints so advice is useful.',
      },
      {
        title: 'No drive-by self-promotion',
        description: 'Launch posts are welcome when you share lessons, not just links.',
      },
    ],
  },
  {
    key: 'ai',
    name: 'AI Engineers',
    slug: 'ai-engineers',
    icon: '🤖',
    accentColor: '#7c3aed',
    category: 'AI & Data',
    accessType: 'public',
    isFeatured: true,
    tagline: 'Shipping LLM features to production — evals, retrieval, cost and latency',
    description:
      'Practitioners building with large language models and classic ML. We focus on what works in production: evaluation, retrieval quality, guardrails, observability and unit economics.',
    tags: ['llm', 'rag', 'python', 'evals', 'machine-learning'],
    rules: [
      {
        title: 'Show your evals',
        description: 'Claims about quality should come with how you measured it.',
      },
      { title: 'No hype threads', description: 'Keep it technical and grounded in real systems.' },
    ],
  },
  {
    key: 'pm',
    name: 'Remote Product Managers',
    slug: 'remote-product-managers',
    icon: '🧭',
    accentColor: '#0891b2',
    category: 'Product',
    accessType: 'public',
    tagline: 'Discovery, roadmaps and decision-making for distributed product teams',
    description:
      'For product managers leading teams across time zones. Async rituals, writing culture, stakeholder management and discovery practices that survive distance.',
    tags: ['product-management', 'roadmaps', 'async', 'discovery'],
    rules: [
      { title: 'Be specific', description: 'Templates and examples beat abstract frameworks.' },
    ],
  },
  {
    key: 'writers',
    name: 'Technical Writers',
    slug: 'technical-writers',
    icon: '✍️',
    accentColor: '#d97706',
    category: 'Writing',
    accessType: 'public',
    tagline: 'Docs-as-code, API references and the craft of explaining complex things',
    description:
      'Documentation engineers, technical writers and developer advocates sharing tooling, information architecture, style guides and career advice.',
    tags: ['documentation', 'docs-as-code', 'api-docs', 'writing'],
    rules: [
      {
        title: 'Portfolio reviews in the weekly thread',
        description: 'Keeps the board focused on discussions.',
      },
    ],
  },
  {
    key: 'nomads',
    name: 'Digital Nomads',
    slug: 'digital-nomads',
    icon: '🌍',
    accentColor: '#059669',
    category: 'Lifestyle',
    accessType: 'public',
    isFeatured: true,
    tagline: 'Working remotely from anywhere — visas, coworking, taxes and staying productive',
    description:
      'Remote professionals who travel while they work. Swap notes on nomad visas, reliable coworking spaces, health insurance and keeping a routine on the road.',
    tags: ['travel', 'remote-work', 'visas', 'coworking'],
    rules: [
      {
        title: 'Not legal or tax advice',
        description: 'Share experiences, and always verify with a professional.',
      },
    ],
  },
  {
    key: 'devops',
    name: 'DevOps Engineers',
    slug: 'devops-engineers',
    icon: '⚙️',
    accentColor: '#dc2626',
    category: 'Engineering',
    accessType: 'public',
    tagline: 'CI/CD, infrastructure as code, Kubernetes and on-call sanity',
    description:
      'Platform, DevOps and SRE practitioners discussing pipelines, infrastructure as code, observability and incident response.',
    tags: ['kubernetes', 'terraform', 'ci-cd', 'observability', 'aws'],
    rules: [
      { title: 'Redact secrets', description: 'Double-check configs and logs before posting.' },
    ],
  },
  {
    key: 'frontend',
    name: 'Frontend Engineers',
    slug: 'frontend-engineers',
    icon: '🎨',
    accentColor: '#db2777',
    category: 'Engineering',
    accessType: 'public',
    tagline: 'React, TypeScript, CSS, accessibility and web performance',
    description:
      'Frontend and design-system engineers sharing patterns, performance wins and accessibility practices.',
    tags: ['react', 'typescript', 'css', 'accessibility', 'performance'],
    rules: [
      {
        title: 'Include a reproduction',
        description: 'For bugs, link a minimal sandbox when possible.',
      },
    ],
  },
  {
    key: 'backend',
    name: 'Backend Engineers',
    slug: 'backend-engineers',
    icon: '🗄️',
    accentColor: '#2563eb',
    category: 'Engineering',
    accessType: 'public',
    tagline: 'APIs, databases and distributed systems that stay up',
    description:
      'Server-side engineers discussing API design, data modelling, queues, caching and scaling.',
    tags: ['node-js', 'go', 'postgresql', 'mongodb', 'distributed-systems'],
    rules: [
      {
        title: 'Numbers welcome',
        description: 'Share load, latency and data sizes when discussing performance.',
      },
    ],
  },
  {
    key: 'founders',
    name: 'Founders Circle',
    slug: 'founders-circle',
    icon: '💎',
    accentColor: '#9333ea',
    category: 'Business',
    accessType: 'pro',
    isFeatured: true,
    tagline: 'Private board for bootstrapped and funded founders sharing real numbers',
    description:
      'An invite-quality space for founders to share revenue, pricing, fundraising and hiring details they would never post publicly. Pro members only.',
    tags: ['startups', 'fundraising', 'saas', 'growth'],
    rules: [
      {
        title: 'What is shared here stays here',
        description: 'Do not screenshot or repost member numbers.',
      },
      {
        title: 'Give before you ask',
        description: 'Share your own metrics when asking for benchmarks.',
      },
    ],
  },
  {
    key: 'staff',
    name: 'Staff+ Engineering',
    slug: 'staff-plus-engineering',
    icon: '🧠',
    accentColor: '#0f766e',
    category: 'Engineering',
    accessType: 'pro',
    tagline: 'Technical leadership beyond senior: strategy, influence and architecture',
    description:
      'Staff, principal and distinguished engineers discussing technical strategy, architecture reviews, sponsorship and navigating the IC leadership track. Pro members only.',
    tags: ['leadership', 'architecture', 'career', 'mentoring'],
    rules: [
      {
        title: 'Assume good intent',
        description: 'Many of these problems are organisational, not technical.',
      },
    ],
  },
];

/** Community membership: owner is always Priya (admin); moderators listed first. */
export const MEMBERSHIPS = {
  saas: {
    moderators: ['daniel'],
    members: ['sofia', 'kenji', 'olivia', 'ethan', 'chloe', 'lukas', 'amara'],
  },
  ai: { moderators: ['meilin'], members: ['nadia', 'daniel', 'rafael', 'ethan', 'arjun'] },
  pm: { moderators: ['chloe'], members: ['tomas', 'kenji', 'olivia'] },
  writers: { moderators: ['hannah'], members: ['sofia', 'olivia', 'meilin'] },
  nomads: { moderators: [], members: ['tomas', 'daniel', 'sofia', 'lukas', 'chloe'] },
  devops: { moderators: ['rafael'], members: ['arjun', 'lukas', 'daniel'] },
  frontend: { moderators: ['amara'], members: ['ethan', 'tomas', 'olivia'] },
  backend: { moderators: [], members: ['lukas', 'daniel', 'rafael', 'ethan', 'arjun'] },
  founders: { moderators: ['kenji'], members: ['daniel', 'chloe'] },
  staff: { moderators: ['rafael'], members: ['amara', 'hannah', 'meilin'] },
};

const p = (...paragraphs) =>
  paragraphs.map((text) => (text.startsWith('<') ? text : `<p>${text}</p>`)).join('');

export const POSTS = [
  {
    key: 'billing-rewrite',
    community: 'saas',
    author: 'daniel',
    hoursAgo: 5,
    title: 'We rewrote our billing on Stripe Billing — 5 things I wish we knew before starting',
    tags: ['stripe', 'billing', 'saas'],
    content: p(
      'Six months ago our homegrown invoicing hit its limits: proration bugs, dunning emails sent twice and no clean way to offer annual plans. We migrated 1,400 paying customers to Stripe Billing. Here is what surprised us.',
      '<h3>1. Webhooks are your source of truth, not the redirect</h3>',
      'The checkout success page is a UX nicety. Entitlements must follow <code>customer.subscription.*</code> events, and your handler must be idempotent because Stripe will retry.',
      '<h3>2. Re-fetch the subscription inside the handler</h3>',
      'Events can arrive out of order. We stopped trusting the payload and now call <code>subscriptions.retrieve</code> before applying state. An entire class of bugs disappeared.',
      '<ul><li>3. Model plans as data, not code branches.</li><li>4. Keep a grace period for <code>past_due</code> — card retries recover ~38% of failures for us.</li><li>5. Migrate in cohorts and email customers a week ahead.</li></ul>',
      'Happy to answer questions about the migration script or how we handled grandfathered prices.',
    ),
  },
  {
    key: 'tenant-isolation',
    community: 'saas',
    author: 'amara',
    hoursAgo: 30,
    title: 'Row-level security vs. schema-per-tenant: what did you pick and do you regret it?',
    tags: ['multi-tenancy', 'postgresql'],
    content: p(
      'We are about to move from a single shared schema with <code>tenant_id</code> columns to something with stronger isolation, mostly because two enterprise prospects asked for it in security reviews.',
      'Options on the table: Postgres row-level security policies, schema-per-tenant, or database-per-tenant for the largest accounts only. I would love to hear from anyone who has run any of these past ~500 tenants. Migrations and connection pooling are my biggest worries.',
    ),
  },
  {
    key: 'pricing-page',
    community: 'saas',
    author: 'kenji',
    hoursAgo: 52,
    title: 'Removing our free plan increased trial-to-paid conversion from 4% to 11%',
    tags: ['pricing', 'growth'],
    content: p(
      'Counter-intuitive result from a 60-day experiment on Formpilot. We replaced the forever-free tier with a 14-day trial (no card required) and a cheaper starter plan.',
      'Signups dropped 35%, but trial-to-paid went from 4% to 11% and support volume fell by a third. The free users were mostly tyre-kickers who never activated.',
      'Caveat: we are B2B with a clear ROI story. I would not copy this blindly for a consumer or PLG product with network effects.',
    ),
  },
  {
    key: 'rag-evals',
    community: 'ai',
    author: 'meilin',
    hoursAgo: 8,
    title: 'Our RAG evaluation stack after a year in production (and what we threw away)',
    tags: ['rag', 'evals', 'llm'],
    content: p(
      'A year ago we evaluated our retrieval assistant with a spreadsheet of 40 questions. Today every pull request runs ~1,200 graded cases in eleven minutes. The setup:',
      '<ol><li><strong>Retrieval metrics first.</strong> Recall@k on a labelled set catches most regressions before generation is even involved.</li><li><strong>Model-graded answers with rubrics.</strong> Pairwise comparisons against the production baseline were far more stable than absolute 1–10 scores.</li><li><strong>A small human-reviewed golden set.</strong> 150 cases re-labelled monthly to keep the grader honest.</li></ol>',
      'What we threw away: generic "faithfulness" scores that did not correlate with user complaints, and dashboards nobody opened. Ask me anything about the tooling.',
    ),
  },
  {
    key: 'chunking',
    community: 'ai',
    author: 'nadia',
    hoursAgo: 26,
    title: 'Beginner question: how do you choose chunk size for technical documentation?',
    tags: ['rag', 'python'],
    content: p(
      'I am building my first retrieval prototype over our internal API docs (about 900 pages). Fixed 500-token chunks work okay for prose but break tables and code samples in half.',
      'Do people chunk by headings, by semantic similarity, or something else? Any rules of thumb for overlap would help a lot.',
    ),
  },
  {
    key: 'llm-costs',
    community: 'ai',
    author: 'daniel',
    hoursAgo: 75,
    title: 'Cutting LLM costs 62% with prompt caching and a smaller routing model',
    tags: ['llm', 'cost'],
    content: p(
      'Our support-draft feature was costing more than the seat price of some customers. Two changes fixed it:',
      '<ul><li>Static system instructions and product docs moved to a cached prefix. Cache hit rate sits around 85%.</li><li>A small classifier routes easy tickets to a cheaper model. Only 20% of requests now reach the largest model.</li></ul>',
      'Quality held steady on our eval set (win rate 49% vs. the old pipeline, i.e. no measurable difference). Latency improved as a bonus.',
    ),
  },
  {
    key: 'async-roadmap',
    community: 'pm',
    author: 'chloe',
    hoursAgo: 12,
    title: 'Template: the async roadmap review that replaced our 2-hour quarterly meeting',
    tags: ['roadmaps', 'async'],
    content: p(
      'Our team spans Vancouver to Warsaw. The quarterly roadmap meeting was painful for everyone and decisions still happened in DMs afterwards. We replaced it with a one-week async review.',
      '<h3>The structure</h3><ol><li>Monday: PM publishes a written proposal — problem, evidence, bets, explicit non-goals.</li><li>Tuesday–Thursday: comments only, each tagged <em>question</em>, <em>concern</em> or <em>blocker</em>.</li><li>Friday: a 30-minute call only to resolve blockers, recorded for everyone else.</li></ol>',
      'Decision quality went up because quieter engineers now weigh in. Happy to share the full doc template in the comments.',
    ),
  },
  {
    key: 'discovery-interviews',
    community: 'pm',
    author: 'chloe',
    hoursAgo: 98,
    title: 'Running customer discovery interviews across 9 time zones without burning out',
    tags: ['discovery', 'user-research'],
    content: p(
      'Batching interviews into two "research days" per sprint, rotating early and late slots between PMs, and using a shared synthesis board has kept us at ~8 interviews a month without anyone taking 6am calls every week.',
    ),
  },
  {
    key: 'docs-as-code',
    community: 'writers',
    author: 'hannah',
    hoursAgo: 18,
    title: 'Moving 2,000 pages from a wiki to docs-as-code: our 90-day plan',
    tags: ['docs-as-code', 'documentation'],
    content: p(
      'We finally migrated our product documentation from a wiki into the main repository. Writers now review pull requests alongside engineers and docs ship with features instead of weeks later.',
      '<h3>What made it work</h3><ul><li>An automated converter for 80% of pages, humans for the rest.</li><li>Vale style rules in CI so reviews focus on clarity, not commas.</li><li>Preview deployments for every pull request — the single biggest win for reviewer engagement.</li></ul>',
      'Biggest mistake: we underestimated redirects. Keep a mapping file from day one.',
    ),
  },
  {
    key: 'openapi-examples',
    community: 'writers',
    author: 'hannah',
    hoursAgo: 60,
    title: 'Your OpenAPI reference is not documentation — until it has realistic examples',
    tags: ['api-docs', 'openapi'],
    content: p(
      'Generated references answer "what fields exist" but not "what should I send for my use case". We added task-oriented example payloads to every endpoint and support tickets about request formatting dropped noticeably.',
      'If you only have time for one improvement this quarter: write examples with real-looking data, including the error responses.',
    ),
  },
  {
    key: 'nomad-visas',
    community: 'nomads',
    author: 'daniel',
    hoursAgo: 40,
    title:
      'Portugal digital nomad visa: my timeline, costs and what the consulate actually asked for',
    tags: ['visas', 'portugal'],
    content: p(
      'Got my D8 visa last month after a four-month process. Sharing the details because the official pages are vague.',
      '<ul><li>Proof of remote income for the last three months (employment contract plus payslips).</li><li>Twelve months of accommodation proof — a signed rental contract was accepted.</li><li>Criminal record certificate with apostille, travel insurance and a Portuguese tax number.</li></ul>',
      'Not legal advice, requirements change often. Verify everything with the consulate.',
    ),
  },
  {
    key: 'coworking-medellin',
    community: 'nomads',
    author: 'chloe',
    hoursAgo: 120,
    title: 'Reliable coworking spaces with backup internet in Medellín?',
    tags: ['coworking', 'colombia'],
    content: p(
      'Heading to Medellín for six weeks in November. I run customer calls daily, so backup connectivity matters more than aesthetics. Recommendations for El Poblado or Laureles very welcome!',
    ),
  },
  {
    key: 'k8s-cost',
    community: 'devops',
    author: 'rafael',
    hoursAgo: 15,
    title: 'Post-mortem: a single misconfigured HPA scaled us to 400 pods at 3am',
    tags: ['kubernetes', 'incident-response'],
    content: p(
      'Blameless write-up of last Tuesday. A CPU-based HorizontalPodAutoscaler combined with a slow readiness probe created a feedback loop: new pods reported unready, load stayed on the old pods, CPU stayed high, and the autoscaler kept adding replicas.',
      '<h3>What we changed</h3><ol><li>Scale on request rate from Prometheus instead of CPU for this service.</li><li>Added <code>maxReplicas</code> guardrails per environment and an alert when replicas exceed 3× baseline.</li><li>Fixed the readiness probe to check dependencies asynchronously.</li></ol>',
      'Total impact: 41 minutes of elevated latency and an uncomfortable cloud bill.',
    ),
  },
  {
    key: 'terraform-modules',
    community: 'devops',
    author: 'rafael',
    hoursAgo: 88,
    title: 'How we version internal Terraform modules without breaking 60 teams',
    tags: ['terraform', 'platform-engineering'],
    content: p(
      'Semantic versioning, a changelog that platform users actually read, and automated upgrade pull requests via Renovate. Breaking changes ship behind a new major version with a migration guide and a six-week overlap.',
    ),
  },
  {
    key: 'a11y-combobox',
    community: 'frontend',
    author: 'amara',
    hoursAgo: 22,
    title: 'Building an accessible combobox is harder than it looks — our checklist',
    tags: ['accessibility', 'react'],
    content: p(
      'We rebuilt the search combobox in our design system after an audit flagged it. The checklist we now use for any listbox-style component:',
      '<ul><li>Focus stays in the input; the active option is announced with <code>aria-activedescendant</code>.</li><li>Arrow keys, Home/End, Enter and Escape all behave as the ARIA practices guide describes.</li><li>Result counts are announced politely after typing pauses, not on every keystroke.</li><li>It works at 400% zoom and with Windows High Contrast.</li></ul>',
      'Test with at least one real screen reader. Automated tools caught about a third of our issues.',
    ),
  },
  {
    key: 'react-performance',
    community: 'frontend',
    author: 'amara',
    hoursAgo: 140,
    title: 'We shaved 1.4s off LCP by deleting code, not adding it',
    tags: ['performance', 'react'],
    content: p(
      'Our marketing site shipped the entire dashboard bundle. Route-based code splitting, removing a date library in favour of <code>Intl</code> and self-hosting fonts took largest contentful paint from 3.1s to 1.7s on a mid-range phone.',
    ),
  },
  {
    key: 'idempotency',
    community: 'backend',
    author: 'daniel',
    hoursAgo: 34,
    title: 'Idempotency keys for payment APIs: storage, TTLs and the race conditions we hit',
    tags: ['api-design', 'distributed-systems'],
    content: p(
      'Clients retry. Load balancers retry. Your own job queue retries. If an endpoint moves money it needs idempotency keys.',
      'We store key → request hash → response in Postgres with a unique constraint and a 24-hour TTL. The subtle bug: two concurrent requests with the same key both passed the "exists?" check. The fix was to insert first and let the unique constraint arbitrate, returning <code>409</code> to the loser until the first request completes.',
    ),
  },
  {
    key: 'outbox',
    community: 'backend',
    author: 'rafael',
    hoursAgo: 110,
    title: 'The transactional outbox pattern saved us from dual-write bugs',
    tags: ['event-driven', 'postgresql'],
    content: p(
      'Writing to the database and publishing to Kafka in the same request will eventually disagree. Writing events to an outbox table in the same transaction and relaying them asynchronously gave us at-least-once delivery with far fewer 3am surprises.',
    ),
  },
  {
    key: 'founder-numbers',
    community: 'founders',
    author: 'kenji',
    hoursAgo: 20,
    title: 'Formpilot month 26: $18.2k MRR, 3.1% churn, and why I am not raising',
    tags: ['bootstrapping', 'metrics'],
    content: p(
      'Sharing the full numbers with this group since you all shared yours last quarter.',
      '<ul><li>MRR: $18,240 (+6.8% month over month)</li><li>Logo churn: 3.1%, revenue churn: 1.4% thanks to expansion</li><li>CAC payback: 4 months, mostly SEO and integrations marketplace listings</li></ul>',
      'Two funds reached out. For now the business pays me and one contractor, grows steadily, and I get to take August off. Raising would change the game I am playing. Curious how others decided.',
    ),
  },
  {
    key: 'founder-hiring',
    community: 'founders',
    author: 'daniel',
    hoursAgo: 65,
    title: 'First engineering hire at $40k MRR: contractor-to-hire worked better than recruiters',
    tags: ['hiring', 'startups'],
    content: p(
      'We paid for a paid four-week project before making an offer. Both sides learned more than any interview loop would have shown.',
    ),
  },
  {
    key: 'staff-strategy',
    community: 'staff',
    author: 'rafael',
    hoursAgo: 28,
    title: 'Writing a technical strategy nobody asked for (and getting it adopted)',
    tags: ['strategy', 'leadership'],
    content: p(
      'Our org had six teams building six different job schedulers. Nobody owned the problem. I spent a month writing a strategy doc: current state with real incident data, three options, a recommendation, and explicitly what we would stop doing.',
      'It got adopted because I pre-wired it with every tech lead one-on-one before publishing, and because the "what we stop doing" section made the trade-offs honest.',
    ),
  },
  {
    key: 'staff-design-reviews',
    community: 'staff',
    author: 'amara',
    hoursAgo: 90,
    title: 'Design reviews that do not become gatekeeping',
    tags: ['architecture', 'mentoring'],
    content: p(
      'We changed our architecture review from an approval gate into a consulting session the author can book. Review requests went up 3×, and the quality of designs arriving at review improved.',
    ),
  },
  {
    key: 'spammy',
    community: 'saas',
    author: 'priya',
    hoursAgo: 3,
    title: 'Weekly thread: share what you shipped this week 🚢',
    tags: ['weekly-thread'],
    content: p(
      'Launched a feature, fixed a gnarly bug or finally deleted that legacy service? Share it below — small wins count. Please keep self-promotion to one link per comment.',
    ),
  },
];

/** Comment threads: `replies` nest. Authors must be Pro members or the admin. */
export const COMMENTS = {
  'billing-rewrite': [
    {
      author: 'kenji',
      content:
        'Point 2 is gold. We had a customer downgraded by a stale `updated` event that arrived after the upgrade. How long did the cohort migration take end to end?',
      replies: [
        {
          author: 'daniel',
          content:
            'About five weeks for 1,400 customers — four cohorts, starting with our friendliest accounts. The script itself was the easy part; support emails were the long tail.',
          replies: [
            { author: 'kenji', content: 'Makes sense. Stealing the friendly-accounts-first idea.' },
          ],
        },
      ],
    },
    {
      author: 'amara',
      content: 'Did you keep your own invoice PDFs or switch to Stripe-hosted invoices?',
      replies: [
        {
          author: 'daniel',
          content: 'Switched to hosted invoices with our branding. One less thing to maintain.',
        },
      ],
    },
  ],
  'rag-evals': [
    {
      author: 'daniel',
      content:
        'How do you keep the model grader from drifting when you upgrade the grading model itself?',
      replies: [
        {
          author: 'meilin',
          content:
            'We pin the grader version and re-run the golden set whenever we change it. If agreement with human labels drops below 90% we do not ship the grader upgrade.',
        },
      ],
    },
    {
      author: 'rafael',
      content: 'Eleven minutes per PR is impressive. Are the cases sharded across workers?',
    },
  ],
  chunking: [
    {
      author: 'meilin',
      content:
        'For docs, chunk by heading hierarchy first and keep code blocks and tables intact even if they exceed your target size. Prepend the page title and section path to every chunk — it helps retrieval a lot.',
      replies: [
        {
          author: 'hannah',
          content:
            'From the docs side: this is also why consistent heading structure matters so much!',
        },
      ],
    },
  ],
  'async-roadmap': [
    {
      author: 'kenji',
      content:
        'Tagging comments as question / concern / blocker is such a simple idea. Would love the template.',
      replies: [
        { author: 'chloe', content: 'Adding a link to the template in the post body later today!' },
      ],
    },
  ],
  'docs-as-code': [
    {
      author: 'amara',
      content:
        'Preview deployments changed everything for our design-system docs too. Which static site generator did you land on?',
      replies: [
        {
          author: 'hannah',
          content: 'Docusaurus, mainly for versioning and the search integration.',
        },
      ],
    },
  ],
  'k8s-cost': [
    {
      author: 'daniel',
      content:
        'Thanks for writing this up publicly. Did you consider KEDA for request-based scaling?',
      replies: [
        {
          author: 'rafael',
          content: 'Yes — KEDA with the Prometheus scaler is exactly what we moved to.',
        },
      ],
    },
  ],
  'founder-numbers': [
    {
      author: 'daniel',
      content:
        'Revenue churn under 2% at that stage is excellent. What drives the expansion revenue?',
    },
    {
      author: 'chloe',
      content: 'Respect for choosing the August-off option. That is the real metric.',
    },
  ],
  idempotency: [
    {
      author: 'rafael',
      content:
        'Insert-first-and-let-the-constraint-arbitrate is the pattern more people need to know.',
    },
  ],
};

/** Likes: post key → member keys (Free members can like). */
export const REACTIONS = {
  'billing-rewrite': ['kenji', 'amara', 'sofia', 'olivia', 'ethan', 'lukas', 'chloe', 'meilin'],
  'tenant-isolation': ['daniel', 'lukas', 'ethan'],
  'pricing-page': ['daniel', 'chloe', 'olivia', 'ethan'],
  'rag-evals': ['nadia', 'daniel', 'rafael', 'arjun', 'ethan', 'hannah'],
  chunking: ['meilin', 'sofia'],
  'llm-costs': ['meilin', 'nadia', 'kenji'],
  'async-roadmap': ['kenji', 'tomas', 'olivia', 'daniel', 'priya'],
  'docs-as-code': ['sofia', 'olivia', 'amara', 'meilin'],
  'openapi-examples': ['sofia', 'daniel'],
  'nomad-visas': ['tomas', 'sofia', 'lukas', 'chloe'],
  'k8s-cost': ['arjun', 'lukas', 'daniel', 'meilin'],
  'a11y-combobox': ['ethan', 'tomas', 'olivia', 'hannah'],
  idempotency: ['lukas', 'rafael', 'kenji', 'arjun'],
  'founder-numbers': ['daniel', 'chloe'],
  'staff-strategy': ['amara', 'hannah', 'meilin'],
};

export const PROJECTS = [
  {
    author: 'daniel',
    daysAgo: 1,
    title: 'Open-source Stripe webhook testing toolkit',
    summary: 'CLI + fixtures to replay realistic subscription lifecycles locally',
    description:
      'Testing subscription edge cases (failed renewals, proration, out-of-order events) is painful. I am building an open-source CLI that generates signed, realistic webhook sequences and replays them against a local server. Looking for a TypeScript contributor who enjoys developer tooling, and someone to help write the docs.',
    requiredSkills: ['TypeScript', 'Node.js', 'Stripe', 'Technical Writing'],
    projectType: 'open-source',
    commitment: 'few-hours-week',
    compensation: 'volunteer',
    remote: true,
  },
  {
    author: 'meilin',
    daysAgo: 3,
    title: 'RAG evaluation dataset for developer documentation',
    summary: 'Curating an open benchmark of real developer questions',
    description:
      'Most public RAG benchmarks use Wikipedia-style content. I want to publish an open dataset of real developer questions over API documentation, with human-graded answers. Looking for technical writers to help label and ML engineers to build the baseline harness.',
    requiredSkills: ['Python', 'LLM', 'Technical Writing', 'Evals'],
    projectType: 'open-source',
    commitment: 'few-hours-week',
    compensation: 'volunteer',
    remote: true,
  },
  {
    author: 'kenji',
    daysAgo: 2,
    title: 'Part-time growth marketer for bootstrapped form-automation SaaS',
    summary: 'SEO-led growth, 15–20 hours per week',
    description:
      'Formpilot is profitable and growing ~7% month over month. I need a part-time growth marketer who has grown a B2B SaaS through SEO and integration marketplaces. Paid hourly with a revenue-share bonus tied to trial signups.',
    requiredSkills: ['SEO', 'Content Marketing', 'Analytics'],
    projectType: 'contract',
    commitment: 'part-time',
    compensation: 'paid',
    remote: true,
  },
  {
    author: 'amara',
    daysAgo: 5,
    title: 'Accessible React component library for civic-tech projects',
    summary: 'Design-system components that meet WCAG 2.2 AA out of the box',
    description:
      'Civic-tech volunteers keep rebuilding the same inaccessible forms. I am starting a small, well-tested React component library focused on forms, tables and navigation with strict accessibility testing. Looking for React developers and a designer.',
    requiredSkills: ['React', 'Accessibility', 'TypeScript', 'Figma'],
    projectType: 'open-source',
    commitment: 'few-hours-week',
    compensation: 'volunteer',
    remote: true,
  },
  {
    author: 'rafael',
    daysAgo: 6,
    title: 'SLO adoption workshop kit for small engineering teams',
    summary: 'Co-author a free workshop and templates',
    description:
      'Looking for one or two SREs or platform engineers to co-author a half-day workshop kit: slides, a sample service, Prometheus rules and a facilitator guide for teams adopting their first SLOs.',
    requiredSkills: ['SRE', 'Prometheus', 'Kubernetes'],
    projectType: 'side-project',
    commitment: 'few-hours-week',
    compensation: 'volunteer',
    remote: true,
  },
  {
    author: 'chloe',
    daysAgo: 8,
    title: 'Founding engineer for async standup tool (pre-seed)',
    summary: 'Equity-heavy role, full-stack TypeScript',
    description:
      'We have 12 paying design partners for an async standup and decision-log tool for remote teams. Looking for a founding full-stack engineer comfortable with TypeScript, Postgres and shipping fast. Meaningful equity plus a modest salary once we close our pre-seed.',
    requiredSkills: ['TypeScript', 'React', 'PostgreSQL', 'Node.js'],
    projectType: 'startup',
    commitment: 'full-time',
    compensation: 'equity',
    remote: true,
  },
];

export const CONVERSATIONS = [
  {
    members: ['sofia', 'daniel'],
    messages: [
      {
        from: 'sofia',
        hoursAgo: 50,
        body: 'Hi Daniel! I loved your billing migration post. I am a technical writer — would your team ever need help documenting the billing API?',
      },
      {
        from: 'daniel',
        hoursAgo: 49,
        body: 'Hey Sofia, thanks! Honestly yes. Our API reference is generated but has zero examples. Do you do contract work?',
      },
      {
        from: 'sofia',
        hoursAgo: 48,
        body: 'I do! I can send over a couple of samples from previous API docs projects.',
      },
      {
        from: 'daniel',
        hoursAgo: 2,
        body: 'Perfect. Also check out my Stripe webhook toolkit project on Project Match — we need docs help there too 🙂',
      },
    ],
  },
  {
    members: ['daniel', 'meilin'],
    messages: [
      {
        from: 'meilin',
        hoursAgo: 30,
        body: 'Your prompt caching numbers match what we saw. Did you cache the retrieved docs as well or only the system prompt?',
      },
      {
        from: 'daniel',
        hoursAgo: 29,
        body: 'Only the static product docs. Retrieved chunks change too often to hit the cache.',
      },
      {
        from: 'meilin',
        hoursAgo: 28,
        body: 'Makes sense. Want to compare eval setups over a call next week?',
      },
    ],
  },
  {
    members: ['priya', 'daniel'],
    messages: [
      {
        from: 'priya',
        hoursAgo: 20,
        body: 'Hi Daniel, thanks for moderating SaaS Developers! Could you pin the weekly shipping thread?',
      },
      {
        from: 'daniel',
        hoursAgo: 19,
        body: 'Will do. Also flagging that a few new accounts are posting affiliate links — I reported one.',
      },
    ],
  },
];
