/**
 * Everything the page says about Edward lives here, so copy changes never
 * touch markup. Trimmed from the v1 portfolio's `src/content/*.ts`.
 */
export const site = {
  name: 'Edward Thomas',
  firstName: 'Edward',
  lastName: 'Thomas',
  title: 'Edward Thomas — Senior Frontend Engineer',
  description:
    'Senior Frontend Engineer focused on design systems, reusable React component libraries and accessible frontend applications. Based in Chelmsford, open to roles across London and Essex.',
  role: 'Senior Frontend Engineer',
  focus: 'Design systems & accessibility',
  tagline: 'I work on the layer other people build on top of.',
  lede:
    'Senior Frontend Engineer focused on design systems, reusable React component libraries and accessible frontend applications.',
  location: 'Chelmsford, UK',
  coordinates: '51.74° N, 0.47° E',
  timeZone: 'Europe/London',
  canonicalUrl: 'https://edwardthomas.dev',
  email: 'edwardandrewthomas1@gmail.com',
  githubUrl: 'https://github.com/edwardthomashf-lab',
  linkedinUrl: 'https://www.linkedin.com/in/edwardandrewthomas/',
  cvUrl: '/edward-thomas-cv.pdf',
  folio: 'Folio ’26',
} as const;

/** The hero's facts row: four short label/value pairs. */
export const facts = [
  { label: 'Currently', value: 'Senior Frontend Software Developer, Ford Motor Company' },
  { label: 'Focus', value: 'Design systems, React component libraries, WCAG 2.2' },
  { label: 'Based', value: 'Chelmsford, Essex. Hybrid across London & Essex' },
  { label: 'Status', value: 'Open to permanent frontend roles', live: true },
] as const;

export type CapabilityCategory = 'frontend' | 'systems' | 'quality' | 'delivery';

/** The filters above the capabilities marquee, in the order groups appear on each line. */
export const capabilityCategories: { id: CapabilityCategory; label: string }[] = [
  { id: 'frontend', label: 'Frontend' },
  { id: 'systems', label: 'Design systems' },
  { id: 'quality', label: 'Accessibility & quality' },
  { id: 'delivery', label: 'Delivery & AI' },
];

/** A chip that sits inline in the About statement: a live, tiny artefact of the work. */
export type Chip = 'portrait' | 'component' | 'tokens' | 'check' | 'ford' | 'clients';
export type Segment = string | { chip: Chip };

export const about = {
  /**
   * One long sentence, inked in word by word as you scroll, with small
   * artefacts dropped in where the words name them (after Cristiana Araújo's
   * inline-image statement).
   */
  statement: [
    'I’m Edward',
    { chip: 'portrait' },
    ', a frontend engineer who builds the layer underneath the product: the components',
    { chip: 'component' },
    'other developers build with, the design tokens',
    { chip: 'tokens' },
    'that keep a brand consistent, and the checks',
    { chip: 'check' },
    'that keep it all accessible. At Ford',
    { chip: 'ford' },
    'by day, and for clients',
    { chip: 'clients' },
    'who need the whole platform.',
  ] as Segment[],
  stats: [
    { value: 10, suffix: '+', label: 'Years at Ford, across four disciplines' },
    { value: 30, prefix: '~', label: 'Reusable React & AEM components in the library' },
    { value: 3, label: 'Shared library repositories I own and review' },
    { value: 2, label: 'Apprentices mentored to take the work on' },
  ],
  experienceNote: 'Ten years, four disciplines. First Class degree, earned through a degree apprenticeship.',
  experience: [
    {
      period: '2025 — Now',
      role: 'Senior Frontend Software Developer',
      org: 'Ford Motor Company',
      line: 'Owns Ford Europe’s React component libraries',
      summary:
        'Own the React libraries behind Ford’s European sites and sign off every React change. Champion tokenisation across teams and mentor two apprentices.',
      tech: ['React', 'TypeScript', 'SCSS', 'AEM', 'Design tokens', 'Storybook'],
    },
    {
      period: '2024 — 2025',
      role: 'Frontend Software Developer',
      org: 'Ford Motor Company',
      line: 'Theming, the token pipeline and three internal tools',
      summary:
        'Built the SCSS theming architecture, the Figma-to-CDN token pipeline, and three tools the team uses daily: Alpaca, SnapShot and the SDLC pipeline.',
      tech: ['TypeScript', 'AEM', 'Jest', 'axe-core', 'Visual regression'],
    },
    {
      period: '2020 — 2023',
      role: 'Project Manager / IT Lead',
      org: 'Ford Motor Company',
      line: 'IT delivery across the vehicle test labs',
      summary:
        'Ran IT and infrastructure delivery across the vehicle test labs, including a building management rollout across sixteen sub-plants.',
      tech: ['Delivery', 'Infrastructure', 'Stakeholders'],
    },
    {
      period: '2018 — 2020',
      role: 'Backend Java Developer',
      org: 'Ford Motor Company',
      line: 'Production Java, and a First Class degree',
      summary:
        'Production Java and campaign automation: why I can read the platform from the API in, not just the component out.',
      tech: ['Java', 'Spring', 'SQL'],
    },
    {
      period: '2016 — 2018',
      role: 'Operations Analyst',
      org: 'Ford Motor Company',
      line: 'Joined at eighteen, on a degree apprenticeship',
      summary: 'Operations analysis and reporting: a first look at how the business actually runs.',
      tech: ['Analysis', 'Reporting'],
    },
  ],
  principles: [
    'Quality is an engineering problem, not a QA stage.',
    'Write the decision down before writing the code.',
    'Agents assist. People approve.',
    'Leave the layer easier to build on than you found it.',
  ],
  /**
   * Four marquee lines. Every line holds a small group from each category,
   * always in the same order, so selecting a category can slide each line to
   * put its group in the middle of the screen: all six matches visible at once.
   */
  capabilities: [
    [
      { name: 'TypeScript', cat: 'frontend' },
      { name: 'React', cat: 'frontend' },
      { name: 'Design tokens', cat: 'systems' },
      { name: 'Figma', cat: 'systems' },
      { name: 'WCAG 2.2', cat: 'quality' },
      { name: 'Netlify', cat: 'delivery' },
    ],
    [
      { name: 'Next.js', cat: 'frontend' },
      { name: 'Component APIs', cat: 'systems' },
      { name: 'AEM', cat: 'systems' },
      { name: 'ARIA', cat: 'quality' },
      { name: 'Playwright', cat: 'quality' },
      { name: 'Stripe', cat: 'delivery' },
    ],
    [
      { name: 'Astro', cat: 'frontend' },
      { name: 'Storybook', cat: 'systems' },
      { name: 'axe-core', cat: 'quality' },
      { name: 'Jest & Vitest', cat: 'quality' },
      { name: 'CI/CD', cat: 'delivery' },
      { name: 'Jira', cat: 'delivery' },
    ],
    [
      { name: 'SCSS & modern CSS', cat: 'frontend' },
      { name: 'Web Components', cat: 'frontend' },
      { name: 'Theming', cat: 'systems' },
      { name: 'Visual regression', cat: 'quality' },
      { name: 'Node.js', cat: 'delivery' },
      { name: 'AI-assisted delivery', cat: 'delivery' },
    ],
  ] as { name: string; cat: CapabilityCategory }[][],
};

export const contact = {
  heading: 'Let’s talk.',
  line: 'A role, a project, or a conversation about the work.',
} as const;
