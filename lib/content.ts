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
  bio: "I'm a DevOps engineer who builds and runs the plumbing behind client projects: AWS infrastructure, Docker images and GitHub Actions pipelines that ship to EKS, and Cloudflare in front of it all. I also handle the messy side of production: security incident response, forensic clean-ups, host migrations and cost investigations, written up in reports clients can act on. I started as an IT intern in 2024, and in my spare time I design hardware like the N-01 you're holding." as string | null,
  /** "At a glance" rows on the ABOUT page. */
  glance: [
    ["Role", "DevOps Engineer · Viacon Marketing & Technologies"],
    ["In IT since", "2024 (intern → associate → engineer)"],
    ["Focus", "Cloud infrastructure · CI/CD · edge security · incident response"],
    ["Stack", "AWS (EC2, EKS) · Docker · GitHub Actions · Cloudflare · Linux · Bash"],
  ] as [string, string][],
  /** What I do — CV-style highlights (no qualifications, by request). */
  whatIDo: [
    "Run AWS infrastructure (EC2) for dedicated client projects; build and push Docker images to container registries (with exposure to Amazon EKS) so dev teams can deploy on their own",
    "Build CI/CD pipelines with GitHub Actions, DockerHub and EKS — automated, auditable deployments with rollback",
    "Own the edge on Cloudflare — DNS, traffic routing, CDN, DDoS rules, SSL/TLS and security headers (CSP, X-Frame-Options, SRI, Permissions-Policy)",
    "Lead security incident response — SEO spam, malicious directories, poisoned .htaccess, obfuscated backdoors; forensic Bash over SSH and written investigation reports",
    "Migrate sites between hosts with minimal downtime and track down cloud cost drivers (e.g. EC2 egress)",
  ],
  offTheClock: [
    "Designing the NILKANTA N-01 cyberdeck in Blender",
    "Building this site — Next.js, React Three Fiber, Three.js",
  ],
  /** Facts shown under "about" even before the bio is written. */
  aboutFacts: [
    "DevOps Engineer at Viacon Marketing & Technologies (since Nov 2025)",
    "Background in DevOps, cloud infrastructure and IT operations",
    "Day-to-day: AWS (EC2 / EKS), Docker, GitHub Actions CI/CD, Cloudflare and security incident response",
    "Designer of the NILKANTA N-01 cyberdeck concept shown on this site",
  ],
  /** TODO(nilkanta): location / timezone line, e.g. "Kolkata, India · IST" — only if you want it public. */
  location: null as string | null,

  skills: [
    { group: "Cloud & containers", items: ["AWS — EC2, cost analysis (egress)", "Docker images & registries (DockerHub)", "Amazon EKS (exposure)", "Docker Compose"] },
    { group: "CI/CD", items: ["GitHub Actions → DockerHub → EKS", "Automated, auditable deploys with rollback"] },
    { group: "Edge & security", items: ["Cloudflare — DNS, routing, CDN, DDoS rules, SSL/TLS", "Security headers — CSP, X-Frame-Options, SRI, Permissions-Policy", "Incident response & forensics (Bash over SSH)"] },
    { group: "Web operations", items: ["Host migrations (GoDaddy → Kinsta, Migrate Guru)", "Gravity Forms ↔ HubSpot, Cookiebot, GTM, reCAPTCHA", "WordPress maintenance & monthly reports"] },
    { group: "3D & design", items: ["Blender modelling (N-01 concept)"] },
  ],
  toolbox: ["AWS EC2", "Amazon EKS", "Docker", "DockerHub", "GitHub Actions", "Cloudflare", "Linux", "Bash", "SSH", "Nginx", "Python / Flask", "Kinsta", "WordPress"] as string[] | null,

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
        "Manage AWS cloud infrastructure, including EC2 instances, for dedicated client projects; build and push Docker images to container registries (with exposure to Amazon EKS) so development teams can deploy independently.",
        "Build and maintain CI/CD pipelines using GitHub Actions integrated with DockerHub and EKS for automated, auditable deployments with rollback.",
        "Manage DNS, traffic routing and security policies through Cloudflare, including CDN configuration, DDoS protection rules, SSL/TLS and security headers (CSP, X-Frame-Options, SRI, Permissions-Policy).",
        "Lead WordPress security incident response for client sites: identified SEO spam, malicious directories, poisoned .htaccess files and obfuscated backdoors; collected evidence with forensic Bash scripts over SSH and produced forensic investigation reports.",
        "Migrate client websites between hosts (GoDaddy to Kinsta, server-to-server with Migrate Guru) with minimal downtime, coordinating with client IT teams and resolving post-migration issues.",
        "Replaced HubSpot embedded forms with Gravity Forms synced to HubSpot and configured Cookiebot consent, Google Tag Manager and reCAPTCHA so forms stay usable regardless of visitor cookie choices.",
        "Diagnosed AWS cost drivers for a client EC2 workload, identifying data-transfer-out egress as the main expense and recommending remediation.",
        "Deliver monthly maintenance reports and client-facing technical documents (hosting comparisons, upgrade proposals); keep servers, plugins, images and dependencies patched.",
      ],
    },
    {
      title: "DevOps, Cloud Infrastructure & IT Associate", org: "Sourcedesk Global", period: "Aug 2024 – Oct 2025",
      notes: ["DevOps, cloud infrastructure and IT operations"], // TODO(nilkanta): add CV bullet points for this role
    },
    { title: "IT Intern", org: "Sourcedesk Global", period: "Mar 2024 – Jul 2024" },
  ] as Role[],

  security: [
    "Incident response: SEO spam, malicious directories, poisoned .htaccess files and obfuscated backdoors found and removed",
    "Forensic evidence collection with Bash scripts over SSH, written up as investigation reports",
    "Edge security on Cloudflare: DDoS rules, SSL/TLS, CSP, X-Frame-Options, SRI, Permissions-Policy",
    "Patching: servers, plugins, images and dependencies kept up to date",
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
