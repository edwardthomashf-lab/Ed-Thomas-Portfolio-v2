import type { ImageMetadata } from 'astro';
import ford from '../assets/work/ford.jpg';
import hookAndFlanker from '../assets/work/hook-and-flanker.jpg';
import goodGoing from '../assets/work/good-going.jpg';
import stayingConnected from '../assets/work/staying-connected.jpg';

export interface Project {
  /** Stable id: used for the dialog id and the view-transition name. */
  id: string;
  title: string;
  /** Who the work is for. Client names are deliberately not shown. */
  kind: 'Employer' | 'Client';
  type: string;
  year: string;
  role: string;
  /** One line for the index card. */
  line: string;
  /** Two or three sentences for the overlay. */
  summary: string;
  results?: string;
  stack: string[];
  url: string;
  displayUrl: string;
  image: ImageMetadata;
  alt: string;
  /** Text mode replaces the screenshot with the project's own brand colours. */
  brand: { bg: string; fg: string };
}

export const projects: Project[] = [
  {
    id: 'ford',
    title: 'Ford Europe',
    kind: 'Employer',
    type: 'Design system',
    year: '2024 — Now',
    role: 'Library owner',
    line: 'The shared React & AEM components behind Ford’s European sites.',
    summary:
      'The shared design layer behind Ford’s European homepage and nameplate sites: around thirty reusable React and AEM components across three library repositories, themed through a Figma-to-CDN token pipeline. I own the libraries and review every React change that lands in them.',
    results: 'Accessibility scores observed rising from ~60–70 to ~90–100.',
    stack: ['React', 'TypeScript', 'SCSS', 'AEM', 'Design tokens', 'Storybook', 'Jest', 'axe-core'],
    url: 'https://www.ford.co.uk/',
    displayUrl: 'ford.co.uk',
    image: ford,
    alt: 'The Ford Puma Gen-E page on ford.co.uk, built on the shared component library.',
    brand: { bg: '#00142e', fg: '#9bc5f9' },
  },
  {
    id: 'hook-and-flanker',
    title: 'Hook & Flanker',
    kind: 'Client',
    type: 'Commerce platform',
    year: '2025 — Now',
    role: 'Design & build, ongoing',
    line: 'Rugby apparel storefront, teamwear configurator and dashboard.',
    summary:
      'A rugby apparel brand that had outgrown Shopify and Squarespace. I designed and built the replacement end to end: storefront, a custom teamwear configurator, checkout, and the operations dashboard the business runs on. First sales landed within three weeks of starting.',
    results: 'Client-reported: +131% click-through, 3.9% conversion, ~85% lower platform costs.',
    stack: ['TypeScript', 'Vite', 'SCSS', 'Netlify Functions', 'Stripe', 'Resend', 'Vitest', 'GitHub Actions'],
    url: 'https://hookandflanker.com/',
    displayUrl: 'hookandflanker.com',
    image: hookAndFlanker,
    alt: 'The Hook & Flanker homepage, introducing the Nations Collection.',
    brand: { bg: '#0b541b', fg: '#dcbf6a' }, // Pitch green, Team Shop gold (lifted for contrast)
  },
  {
    id: 'good-going',
    title: 'Good Going',
    kind: 'Client',
    type: 'Brand storefront',
    year: '2026',
    role: 'Design & build',
    line: 'A running brand for every pace, with a tokenised storefront.',
    summary:
      'A UK running brand for everyday runners: “Every pace counts.” A storefront driven by its own colour-token system, with shop, product and checkout flows, built as the first site on a reusable client-site pattern that shares one operations dashboard.',
    stack: ['JavaScript', 'CSS design tokens', 'Netlify Functions', 'Netlify Blobs', 'Stripe', 'axe-core', 'Web Vitals'],
    url: 'https://goodgoing.uk/',
    displayUrl: 'goodgoing.uk',
    image: goodGoing,
    alt: 'The Good Going homepage: “At your pace. Still counts.” beside illustrated running T-shirts.',
    brand: { bg: '#8c4f3f', fg: '#e9e9e6' }, // Burnt Umber, Cloud
  },
  {
    id: 'staying-connected',
    title: 'Staying Connected',
    kind: 'Client',
    type: 'Service platform',
    year: '2026',
    role: 'Design & build',
    line: 'Scheduled companionship calls, arranged around the person.',
    summary:
      'A telephone companionship service: regular, friendly calls arranged around the person receiving them, with family able to refer and help manage an account. Sign-up, scheduling, billing and email, designed to stay calm and readable for older users.',
    stack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Clerk', 'Drizzle', 'Postgres', 'Stripe', 'Playwright'],
    url: 'https://www.staying-connected.co.uk/',
    displayUrl: 'staying-connected.co.uk',
    image: stayingConnected,
    alt: 'The Staying Connected homepage: “A friendly phone call, at a time that suits you.”',
    brand: { bg: '#022344', fg: '#f4b98a' },
  },
];
