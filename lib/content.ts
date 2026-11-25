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
  headline: "DevOps Engineer · Cloud Infrastructure · Web Security",
  /** Shown next to the mascot. */
  mascotLine: "chill, I'm here",
  currentOrg: "Viacon Marketing & Technologies",

  /** First-person bio. Written from confirmed facts — TODO(nilkanta): rewrite in your own words if you like. */
  bio: "I'm a DevOps and cloud infrastructure engineer with 2.5+ years of hands-on work for agency clients: AWS and DigitalOcean servers, Docker images and GitHub Actions pipelines that ship to EKS, Linux administration, and zero-downtime site migrations. I also handle the messy side of production — WordPress security incidents, malware clean-ups, Cloudflare security headers and cookie-consent compliance — and use AI-assisted workflows to automate reports, audits and documentation. In my spare time I design hardware like the N-01 you're holding." as string | null,
  /** "At a glance" rows on the ABOUT page. */
  glance: [
    ["Role", "DevOps Engineer · Viacon Marketing & Technologies"],
    ["Experience", "2.5+ years (since Mar 2024)"],
    ["Focus", "Cloud infrastructure · CI/CD · edge security · incident response"],
    ["Stack", "AWS · DigitalOcean · Docker · GitHub Actions · Cloudflare · Linux · Bash"],
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
  location: "Kolkata, West Bengal · IST" as string | null,

  skills: [
    { group: "Cloud & hosting", items: ["AWS — EC2, S3, CloudFront, Amazon EKS (exposure), cost analysis", "DigitalOcean Droplets", "Kinsta · GoDaddy · WP Engine · SiteGround · WHC.ca · Hostinger"] },
    { group: "DevOps & CI/CD", items: ["GitHub Actions", "Docker · DockerHub", "Git", "Bash scripting · cron automation", "SSH key management"] },
    { group: "Linux & servers", items: ["Ubuntu Linux", "WHM / cPanel", "Nginx / Apache (.htaccess)", "Firewall hardening · unattended security updates", "DNS management"] },
    { group: "Networking & CDN", items: ["Cloudflare — DNS, CDN, WAF / DDoS rules, SSL/TLS", "DNS propagation", "CCNA networking fundamentals"] },
    { group: "Web security", items: ["WordPress incident response", "Malware / SEO-spam cleanup · backdoor removal", "CVE triage", "Security headers — CSP, X-Frame-Options, SRI, Permissions-Policy", "Burp Suite vulnerability scanning"] },
    { group: "WordPress & CMS", items: ["WordPress administration · WooCommerce", "Gravity Forms · WPML · WPCode", "Migrate Guru · staging → production", "Plugin and core updates"] },
    { group: "Integrations & compliance", items: ["HubSpot forms · Mailchimp", "WooCommerce REST API · Shiprocket", "Google Tag Manager · reCAPTCHA", "Cookiebot (GDPR / CCPA consent)"] },
    { group: "Scripting & tools", items: ["Python (Flask)", "Frappe Framework · MariaDB · Redis", "Node.js document automation", "LibreOffice"] },
    { group: "Monitoring & IT assets", items: ["MeshCentral", "Snipe-IT", "Microsoft Teams alerts via Power Automate webhooks"] },
    { group: "AI & prompt engineering", items: ["ChatGPT · Claude · DeepSeek", "Prompts for automation, audits, research and documentation"] },
    { group: "3D & design", items: ["Blender modelling (N-01 concept)"] },
  ],
  toolbox: ["AWS (EC2 · S3 · CloudFront · EKS)", "DigitalOcean", "Docker", "GitHub Actions", "Cloudflare", "Ubuntu Linux", "Bash", "Nginx / Apache", "WHM / cPanel", "Python / Flask", "Frappe", "WordPress", "Burp Suite", "MeshCentral", "Snipe-IT"] as string[] | null,

  projects: [
    {
      name: "NILKANTA N-01",
      summary: "Rugged portable Linux cyberdeck concept — industrial design, Blender model and this interactive Three.js website.",
      tags: ["concept", "blender", "three.js", "next.js"],
      href: "https://github.com/nilkantapandit/nilkanta-n01",
    },
    {
      name: "Actyvate.ai — chatbot on AWS",
      summary: "Set up the AWS EC2 server environment, CI/CD pipeline and infrastructure for production hosting of chatbot workflows; frontend on Amazon S3 + CloudFront with automatic cache invalidation.",
      tags: ["aws", "ec2", "s3", "cloudfront", "ci/cd"],
    },
    {
      name: "Gwebpro.com — Node.js deployment",
      summary: "Provisioned a DigitalOcean Droplet, dockerized the Node.js application and automated deployments through GitHub Actions and DockerHub.",
      tags: ["digitalocean", "docker", "github-actions", "node.js"],
    },
    {
      name: "Website health monitoring",
      summary: "Cron-scheduled URL monitor on AWS EC2 (Ubuntu) with retry/timeout logic, lock files against overlapping runs and Microsoft Teams alerts via Power Automate; hardened with SSH-only firewall rules and unattended updates.",
      tags: ["aws", "bash", "cron", "monitoring"],
    },
    {
      name: "wordpress-setup",
      summary: "Bash scripts that automate WordPress server setup — new-site install, Nginx configuration and domain swaps.",
      tags: ["bash", "wordpress", "nginx", "linux"],
      href: "https://github.com/nilkantapandit/wordpress-setup",
    },
    {
      name: "Maintenance report generator",
      summary: "Internal Flask web app that generates branded monthly maintenance reports (.docx) for client websites, cutting manual reporting; Docker deployment with database-backed history planned.",
      tags: ["python", "flask", "automation"],
    },
    {
      name: "Field-service marketplace backend (in progress)",
      summary: "Modular backend for on-demand equipment repair: service-request lifecycle, technician dispatch, equipment custody tracking, estimates, advance payments and a partner earnings ledger.",
      tags: ["frappe", "mariadb", "redis", "docker"],
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
      notes: [
        "Designed and implemented CI/CD pipelines using GitHub Actions for Node.js and Python applications on AWS EC2 and DigitalOcean.",
        "Configured Docker environments and managed DockerHub integrations for reliable, repeatable deployments.",
        "Managed AWS EC2, DigitalOcean Droplets and managed hosting providers including WHC.ca and SiteGround.",
        "Handled DNS management, WHM/cPanel administration and end-to-end cloud migrations with minimal downtime.",
        "Deployed MeshCentral for secure device monitoring and remote management, and Snipe-IT for IT asset lifecycle tracking.",
        "Conducted vulnerability scanning with Burp Suite and worked with developers on remediation.",
        "Crafted AI prompts to speed up technical research, documentation and automation workflows.",
      ],
    },
    {
      title: "IT Intern", org: "Sourcedesk Global", period: "Mar 2024 – Jul 2024",
      notes: [
        "Assisted with server setup, infrastructure migrations and day-to-day system administration.",
        "Gained hands-on experience with Docker, Linux servers and Git-based workflows.",
        "Supported LAN setup and remote employee device management.",
      ],
    },
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
