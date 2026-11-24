/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  NILKANTA — website content (single source of truth for the terminal)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Only real, confirmed facts are filled in. Anything still to be written is
 *  `null` and marked TODO(nilkanta) — the terminal shows it as "coming soon",
 *  so nothing fabricated ever appears on the site.
 *
 *  To update the site: edit the values below and save. No other file needs to change.
 */

export type Link = { label: string; href: string };
export type Role = { title: string; org: string; period: string; notes?: string[] };
export type Project = { name: string; summary: string; tags: string[]; href?: string };

export const content = {
  handle: "nilkanta",
  name: "Nilkanta",
  fullName: "Nilkanta Pandit",
  headline: "DevOps Engineer",
  /** Shown next to the mascot. */
  mascotLine: "chill, I'm here",
  currentOrg: "Viacon Marketing & Technologies",

  /** First-person bio. Written from confirmed facts — TODO(nilkanta): rewrite in your own words if you like. */
  bio: "I'm a DevOps engineer who keeps servers and websites running fast, secure and boring. I started as an IT intern in 2024, moved into cloud infrastructure and DevOps, and today I look after client websites at Viacon — WordPress and WooCommerce operations, Cloudflare security, forms and integrations, and the monthly reports clients actually read. I automate the repetitive parts with Bash, Python, Docker and GitHub Actions, and in my spare time I design hardware like the N-01 you're holding." as string | null,
  /** "At a glance" rows on the ABOUT page. */
  glance: [
    ["Role", "DevOps Engineer · Viacon Marketing & Technologies"],
    ["In IT since", "2024 (intern → associate → engineer)"],
    ["Focus", "DevOps · web operations · website security"],
    ["Stack", "Linux · Docker · GitHub Actions · Nginx · Cloudflare · WordPress"],
  ] as [string, string][],
  /** What I do — CV-style highlights (no qualifications, by request). */
  whatIDo: [
    "Keep client websites healthy — WordPress / WooCommerce maintenance, staging sites and hosting moves (incl. managed hosts like Kinsta)",
    "Harden security — Content-Security-Policy and security headers through Cloudflare; clean-up of compromised sites",
    "Wire up forms & integrations — Gravity Forms lead routing, HubSpot → Gravity Forms migrations, cookie-consent (Cookiebot) fixes, multilingual sites (WPML)",
    "Automate — Bash server-setup scripts, a Flask maintenance-report generator, Dockerised apps built by GitHub Actions CI",
    "Write it up — proposals, hosting comparisons, incident and technical reports for clients",
  ],
  offTheClock: [
    "Designing the NILKANTA N-01 cyberdeck in Blender",
    "Building this site — Next.js, React Three Fiber, Three.js",
  ],
  /** Facts shown under "about" even before the bio is written. */
  aboutFacts: [
    "DevOps Engineer at Viacon Marketing & Technologies (since Nov 2025)",
    "Background in DevOps, cloud infrastructure and IT operations",
    "Day-to-day: WordPress site management, website security remediation, technical reports",
    "Designer of the NILKANTA N-01 cyberdeck concept shown on this site",
  ],
  /** TODO(nilkanta): location / timezone line, e.g. "Kolkata, India · IST" — only if you want it public. */
  location: null as string | null,

  skills: [
    { group: "DevOps & infrastructure", items: ["Containers — Docker, Docker Compose", "CI with GitHub Actions", "Linux server setup — Nginx, Bash automation", "Cloud infrastructure & IT operations"] },
    { group: "Web operations", items: ["WordPress site management & maintenance", "Website security remediation & security headers", "Automated client maintenance reports"] },
    { group: "3D & design", items: ["Blender modelling (N-01 concept)"] },
  ],
  toolbox: ["Linux", "Bash", "Docker", "Docker Compose", "GitHub Actions", "Nginx", "Python / Flask", "WordPress", "Cloudflare"] as string[] | null,

  projects: [
    {
      name: "NILKANTA N-01",
      summary: "Rugged portable Linux cyberdeck concept — industrial design, Blender model and this interactive Three.js website.",
      tags: ["concept", "blender", "three.js", "next.js"],
      href: "https://github.com/nilkantapandit/nilkanta-n01",
    },
    {
      name: "wordpress-setup",
      summary: "Bash scripts that automate WordPress server setup — new-site install, Nginx configuration and domain swaps.",
      tags: ["bash", "wordpress", "nginx", "linux"],
      href: "https://github.com/nilkantapandit/wordpress-setup",
    },
    {
      name: "Maintenance report generator",
      summary: "Flask app that builds the monthly website maintenance reports (.docx) for client sites.",
      tags: ["python", "flask", "automation"],
    },
    {
      name: "my-node-app",
      summary: "Node.js service containerised with a Dockerfile and built by a GitHub Actions Docker CI workflow.",
      tags: ["node.js", "docker", "github-actions", "ci"],
      href: "https://github.com/nilkantapandit/my-node-app",
    },
    {
      name: "my-docker-app",
      summary: "Frontend + backend services wired together with Docker Compose.",
      tags: ["docker", "docker-compose"],
      href: "https://github.com/nilkantapandit/my-docker-app",
    },
    {
      name: "webperf",
      summary: "Python web app — routes / services / database layers with a templated UI and one-click Windows setup.",
      tags: ["python", "web-app"],
      href: "https://github.com/nilkantapandit/webperf",
    },
  ] as Project[],
  moreProjectsPending: false,

  experience: [
    {
      title: "DevOps Engineer", org: "Viacon Marketing & Technologies", period: "Nov 2025 – present",
      notes: [
        "Run and maintain a portfolio of client WordPress / WooCommerce websites, including staging sites and managed hosting (Kinsta)",
        "Security remediation: CSP / security-header hardening behind Cloudflare, clean-up of compromised sites, incident write-ups",
        "Forms and integrations: Gravity Forms lead routing, HubSpot → Gravity Forms migrations, Cookiebot consent fixes, WPML multilingual sites",
        "Built my own Flask app that generates the monthly client maintenance reports (.docx)",
        "Client-facing deliverables: proposals, hosting comparisons, technical reports, site handovers",
      ],
    },
    {
      title: "DevOps, Cloud Infrastructure & IT Associate", org: "Sourcedesk Global", period: "Aug 2024 – Oct 2025",
      notes: ["DevOps, cloud infrastructure and IT operations"], // TODO(nilkanta): add CV bullet points for this role
    },
    { title: "IT Intern", org: "Sourcedesk Global", period: "Mar 2024 – Jul 2024" },
  ] as Role[],

  security: [
    "Website security-header hardening (Content-Security-Policy and related headers) behind Cloudflare",
    "Clean-up and remediation of compromised WordPress sites",
    "Security findings written up as client-facing technical reports",
  ],

  art: [
    "Industrial design and 3D modelling of the NILKANTA N-01 (Blender)",
  ],
  /** TODO(nilkanta): other art / design work you want to show. */
  artMore: null as string[] | null,

  /** TODO(nilkanta): gaming — favourite games, platforms, anything you want shared. */
  gaming: null as string[] | null,

  contact: {
    links: [{ label: "GitHub", href: "https://github.com/nilkantapandit" }] as Link[],
    phone: "+91 82404 56397" as string | null,
    email: "nilkantapandit@gmail.com" as string | null,
    linkedin: "https://www.linkedin.com/in/nilkanta-pandit-88a9b1290" as string | null,
  },
};

export const COMING_SOON = "[ coming soon ]";
