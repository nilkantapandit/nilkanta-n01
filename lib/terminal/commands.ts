/**
 * Built-in N-01 terminal commands. Content comes from lib/content.ts — edit that file
 * to change what the site says; edit this file to change how commands behave.
 */
import { content, COMING_SOON } from "@/lib/content";
import { accent, blank, dim, err, head, link, out, pre, registerCommand, listCommands, runCommand, sys, type Line, type TerminalContext } from "./registry";
import { BANNER } from "./banner";

const startedAt = Date.now();
const section = (title: string): Line[] => [head(title), dim("─".repeat(Math.min(48, title.length + 18)))];
const soon = (what: string): Line[] => [dim(`${what}: ${COMING_SOON}`)];

registerCommand({
  name: "help",
  description: "List available commands",
  menu: true,
  aliases: ["?", "commands"],
  run: () => {
    const cmds = listCommands();
    const w = Math.max(...cmds.map((c) => c.name.length)) + 2;
    return [
      ...section("AVAILABLE COMMANDS"),
      ...cmds.map((c) => out(`  ${c.name.padEnd(w)}${c.description}`)),
      blank(),
      dim("tab: autocomplete · ↑/↓: history · esc: close · ctrl+l: clear"),
      dim("physical controls: wheel / touchpad move the menu, centre / confirm runs it"),
      dim("not every command is listed. curiosity is a feature."),
    ];
  },
});

registerCommand({
  name: "whoami",
  description: "Who runs this machine",
  menu: true,
  run: () => [accent(content.handle), out(`${content.name} — ${content.headline} at ${content.currentOrg}`)],
});

/** CV-style "about me" (shared by the terminal and the ABOUT screen app). */
export function aboutLines(): Line[] {
  return [
    accent(`${content.fullName} — ${content.headline}`),
    dim(content.currentOrg),
    blank(),
    ...(content.bio ? [out(content.bio), blank()] : soon("bio")),
    ...section("AT A GLANCE"),
    ...content.glance.map(([k, v]) => out(`${k.padEnd(12)}${v}`)),
    blank(),
    ...section("WHAT I DO"),
    ...content.whatIDo.map((w) => out(`▸ ${w}`)),
    blank(),
    ...section("CERTIFICATIONS"),
    ...content.certifications.map((c) => out(`▸ ${c.name} — ${c.year}`)),
    blank(),
    ...section("OFF THE CLOCK"),
    ...content.offTheClock.map((w) => out(`▸ ${w}`)),
    ...(content.location ? [blank(), dim(content.location)] : []),
    blank(),
    dim("more: experience · skills · certs · projects · contact"),
  ];
}

registerCommand({
  name: "about",
  description: "About Nilkanta (CV-style)",
  menu: true,
  aliases: ["cv", "resume", "me"],
  run: () => [...section("ABOUT ME"), ...aboutLines()],
});

registerCommand({
  name: "skills",
  description: "Skills and focus areas",
  menu: true,
  run: () => [
    ...section("SKILLS"),
    ...content.skills.flatMap((g) => [accent(g.group), ...g.items.map((i) => out(`  ▸ ${i}`))]),
    blank(),
    ...(content.toolbox ? [accent("Toolbox"), out(`  ${content.toolbox.join(" · ")}`)] : soon("toolbox")),
  ],
});

registerCommand({
  name: "projects",
  description: "Selected projects",
  menu: true,
  run: () => [
    ...section("PROJECTS"),
    ...content.projects.flatMap((p) => [
      accent(p.name),
      out(`  ${p.summary}`),
      dim(`  [${p.tags.join("] [")}]`),
      ...(p.href ? [link(`  ${p.href}`, p.href)] : []),
      blank(),
    ]),
    ...(content.moreProjectsPending ? soon("more projects") : []),
  ],
});

registerCommand({
  name: "certs",
  description: "Certifications",
  aliases: ["certifications", "certificates"],
  run: () => [...section("CERTIFICATIONS"), ...content.certifications.flatMap((c) => [out(`▸ ${c.name} (${c.year})`), dim(`  ${c.by}`)])],
});

registerCommand({
  name: "experience",
  description: "Work history",
  menu: true,
  aliases: ["exp", "work"],
  run: () => [
    ...section("EXPERIENCE"),
    ...content.experience.flatMap((r) => [accent(`${r.title}`), out(`  ${r.org}`), dim(`  ${r.period}`), ...(r.notes ?? []).map((n) => out(`  • ${n}`)), blank()]),
  ],
});

registerCommand({
  name: "security",
  description: "Security work + SECURE mode note",
  menu: true,
  run: (ctx) => [
    ...section("SECURITY"),
    ...content.security.map((s) => out(`• ${s}`)),
    blank(),
    dim(`device mode: ${ctx.device.mode === "secure" ? "SECURE" : "FIELD COMMS"} — the on-site modes are visual simulations,`),
    dim("no real radio transmission or encryption takes place."),
  ],
});

registerCommand({
  name: "art",
  description: "Design & 3D work",
  menu: true,
  run: () => [...section("ART & DESIGN"), ...content.art.map((a) => out(`• ${a}`)), ...(content.artMore ? content.artMore.map((a) => out(`• ${a}`)) : [blank(), ...soon("more work")])],
});

registerCommand({
  name: "gaming",
  description: "Games and play",
  menu: true,
  run: () => [...section("GAMING"), ...(content.gaming ? content.gaming.map((g) => out(`• ${g}`)) : soon("gaming")), blank(), dim("psst… some keys on this site do more than they say.")],
});

registerCommand({
  name: "contact",
  description: "How to reach Nilkanta",
  menu: true,
  run: () => [
    ...section("CONTACT"),
    ...content.contact.links.map((l) => link(`${l.label.padEnd(10)}${l.href}`, l.href)),
    content.contact.phone ? link(`${"Phone".padEnd(10)}${content.contact.phone}`, `tel:${content.contact.phone.replace(/\s/g, "")}`) : dim(`${"Phone".padEnd(10)}${COMING_SOON}`),
    content.contact.email ? link(`${"Email".padEnd(10)}${content.contact.email}`, `mailto:${content.contact.email}`) : dim(`${"Email".padEnd(10)}${COMING_SOON}`),
    content.contact.linkedin ? link(`${"LinkedIn".padEnd(10)}${content.contact.linkedin}`, content.contact.linkedin) : dim(`${"LinkedIn".padEnd(10)}${COMING_SOON}`),
  ],
});

const ART = [
  "  _   _   ",
  " | \\ | |  ",
  " |  \\| |  ",
  " | . ` |  ",
  " | |\\  |  ",
  " |_| \\_|  ",
  "   N-01   ",
];
registerCommand({
  name: "neofetch",
  description: "System summary",
  menu: true,
  run: (ctx) => {
    const up = Math.floor((Date.now() - startedAt) / 1000);
    const info = [
      `${content.handle}@n01`,
      "─────────────",
      "Host     NILKANTA N-01 (concept)",
      "OS       N-01 web shell (browser simulation)",
      'Display  4.0" 480×320 IPS (concept spec)',
      "Ports    2× Ethernet · HDMI · USB-C · USB-A · 3.5 mm",
      `Mode     ${ctx.device.mode === "secure" ? "SECURE" : "FIELD COMMS"} (simulated)`,
      `Uptime   ${Math.floor(up / 60)}m ${up % 60}s (this page)`,
      "Shell    nsh 0.1 · TypeScript",
      "Render   three.js r187 · react-three-fiber 9",
      "Theme    amber CRT",
    ];
    const rows = Math.max(ART.length, info.length);
    return Array.from({ length: rows }, (_, i) => pre(`${(ART[i] ?? " ".repeat(10)).padEnd(12)}${info[i] ?? ""}`));
  },
});

registerCommand({ name: "clear", description: "Clear the screen", aliases: ["cls"], run: (ctx) => ctx.clear() });
registerCommand({ name: "exit", description: "Close the terminal", aliases: ["quit", "q"], run: (ctx) => ctx.close() });
registerCommand({
  name: "shutdown",
  description: "Power the N-01 off (nothing is saved)",
  aliases: ["poweroff", "halt"],
  run: (ctx) => {
    window.setTimeout(() => ctx.device.requestPowerOff(ctx.raw), 450);
    return [sys("Broadcast message from nilkanta@n01:"), out("The system will power off now. Goodbye.")];
  },
});
registerCommand({
  name: "sudo poweroff", description: "", hidden: true, aliases: ["sudo shutdown", "sudo halt"],
  run: (ctx) => { window.setTimeout(() => ctx.device.requestPowerOff(ctx.raw), 450); return [sys("[sudo] password for visitor: ********"), out("Powering off. Goodbye.")]; },
});


/* ---------------- shell basics ---------------- */
const pad = (s: string | number, n: number) => String(s).padEnd(n);
const fmtUp = (sec: number) => (sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.floor(sec / 60)}m` : `${Math.floor(sec / 3600)}h`);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Welcome block printed when the terminal first opens (banner + status lines). */
export function welcomeLines(mode: "field" | "secure"): Line[] {
  const n = listCommands().length;
  return [
    ...BANNER.map((l) => pre(l)),
    blank(),
    sys(`       =[ nsh 0.1 · NILKANTA N-01 web shell (browser simulation) ]`),
    out(`+ -- --=[ ${n} commands · ${listCommands().filter((c) => c.menu).length} apps · some hidden ]`),
    out(`+ -- --=[ mode: ${mode === "secure" ? "SECURE_MODE" : "FIELD_COMMS"} · type 'help' to begin ]`),
    blank(),
  ];
}

registerCommand({
  name: "ps",
  description: "Running services (pm2-style table)",
  aliases: ["pm2", "top"],
  run: (ctx) => {
    const up = fmtUp(Math.floor((Date.now() - startedAt) / 1000));
    const field = ctx.device.mode === "field";
    const rows: [string, string, string][] = [
      ["nsh", "online", up],
      ["screen-os", ctx.device.screenPhase === "online" ? "online" : ctx.device.screenPhase, up],
      ["render-loop", "online", up],
      ["radio.service", field ? "online" : "stopped", field ? up : "0"],
      ["securityd", field ? "stopped" : "online", field ? "0" : up],
      ["ambient-graph", reducedMotion() ? "static" : "online", up],
      ["pointer-fx", "online", up],
    ];
    const line = "+----+-----------------+--------+---+-----------+--------+";
    return [
      dim(line),
      accent("| id | name            | mode   | ↺ | status    | uptime |"),
      dim(line),
      ...rows.map(([n, st, u], i) =>
        (st === "online" ? out : dim)(`| ${pad(i, 2)} | ${pad(n, 15)} | fork   | 0 | ${pad(st, 9)} | ${pad(u, 6)} |`)),
      dim(line),
      dim("simulated: site subsystems, not real processes"),
    ];
  },
});

registerCommand({
  name: "history",
  description: "Commands typed this session",
  run: (ctx) => {
    const h = ctx.device.terminal.hist;
    return h.length ? h.map((c, i) => out(`${String(i + 1).padStart(4)}  ${c}`)) : [dim("history is empty")];
  },
});

const FILES = [
  ["drwxr-xr-x", "projects/"],
  ["-rw-r--r--", "about.txt"],
  ["-rw-r--r--", "skills.txt"],
  ["-rw-r--r--", "experience.log"],
  ["-rw-r--r--", "contact.txt"],
  ["-rwxr-xr-x", "arcade*"],
];
const DOTFILES = [["-rw-------", ".secrets"], ["-rw-------", ".bash_history"]];
registerCommand({
  name: "ls",
  description: "List files in ~",
  aliases: ["dir", "ll"],
  run: (ctx) => {
    const all = ctx.args.some((a) => a.startsWith("-") && a.includes("a"));
    const long = ctx.raw.startsWith("ll") || ctx.args.some((a) => a.startsWith("-") && a.includes("l"));
    const list = all ? [...DOTFILES, ...FILES] : FILES;
    if (!long) return [out(list.map(([, n]) => n).join("   "))];
    return [dim(`total ${list.length}`), ...list.map(([perm, n]) => out(`${perm}  nilkanta  ${n}`))];
  },
});

const CAT: Record<string, string> = { "about.txt": "about", "skills.txt": "skills", "experience.log": "experience", "contact.txt": "contact" };
registerCommand({
  name: "cat",
  description: "Print a file (try: ls)",
  run: async (ctx: TerminalContext) => {
    const f = (ctx.args[0] ?? "").replace(/^~\//, "");
    if (!f) return [err("usage: cat <file>")];
    if (CAT[f]) return runCommand(CAT[f], ctx);
    if (f === "projects" || f === "projects/") return [err("cat: projects: Is a directory"), dim("try: projects")];
    if (f === "arcade" || f === "arcade*") return [err("cat: arcade: binary file — try running it instead")];
    if (f === ".secrets") return [sys("# .secrets"), out("vault: locked"), out("hint: the answer is the colour of every control on this device."), dim("usage: sudo unlock <word>")];
    if (f === ".bash_history") return [
      out("git commit -m \"final fix\""), out("git commit -m \"final fix 2\""), out("git commit -m \"actually final\""),
      out("sudo !!"), out("vim deploy.sh"), out(":q!"), out(":wq!!!"), out("history | grep 'how to exit vim'"),
    ];
    return [err(`cat: ${f}: No such file or directory`)];
  },
});

registerCommand({ name: "pwd", description: "Print working directory", run: () => [out("/home/nilkanta")] });
registerCommand({ name: "date", description: "Current date and time", run: () => [out(new Date().toString())] });
registerCommand({ name: "echo", description: "Print text", run: (ctx) => [out(ctx.args.join(" "))] });
registerCommand({
  name: "uname",
  description: "System information",
  run: (ctx) => [out(ctx.args.includes("-a") ? "N01-web nsh-0.1 browser-simulation three.js-r187 react-three-fiber-9 n01" : "N01-web")],
});

registerCommand({
  name: "mode",
  description: "Show or set the operating mode (mode --set secure|field-comms)",
  run: (ctx) => {
    const i = ctx.args.indexOf("--set");
    if (i < 0) return [out(`current mode: ${ctx.device.mode === "secure" ? "SECURE_MODE" : "FIELD_COMMS"} (simulated)`), dim("usage: mode --set secure | field-comms")];
    const v = (ctx.args[i + 1] ?? "").toLowerCase();
    const target = v === "secure" || v === "secure_mode" ? "secure" : v === "field-comms" || v === "field" || v === "field_comms" ? "field" : null;
    if (!target) return [err(`mode: unknown mode '${v}'`), dim("usage: mode --set secure | field-comms")];
    if (target === ctx.device.mode) return [dim(`mode already ${target === "secure" ? "SECURE_MODE" : "FIELD_COMMS"}`)];
    ctx.device.setMode(target);
    return [];
  },
});

/* ---------------- more easter eggs (hidden) ---------------- */
registerCommand({
  name: "sudo rm",
  description: "",
  hidden: true,
  run: (ctx) => [
    sys("[sudo] password for visitor: ********"),
    out(`rm ${ctx.args.join(" ")}`),
    err("rm: refusing to remove '/': the N-01 is a museum piece"),
    dim("--no-preserve-root is not accepted here either. nice try."),
  ],
});
registerCommand({
  name: "msfconsole",
  description: "",
  hidden: true,
  run: () => [
    pre("      .:okOOOkdc'           'cdkOOOko:."),
    pre("      =[ nsh-msf 0.0 (parody console)          ]"),
    pre("+ -- --=[ 0 exploits - 0 payloads - 1 ethics policy ]"),
    blank(),
    out("msf6 > use exploit/none"),
    err("[-] No exploits on this machine."),
    dim("The security work here is the defensive kind: headers, hardening, remediation."),
    dim("try: security"),
  ],
});
registerCommand({
  name: "nmap",
  description: "",
  hidden: true,
  run: () => [
    out("Starting nmap-ish 0.1 (simulated) against n01.local"),
    accent("PORT      STATE  SERVICE"),
    out("eth0      open   ethernet"),
    out("eth1      open   ethernet"),
    out("hdmi      open   video-out"),
    out("usb-c     open   power/data"),
    out("usb-a     open   peripherals"),
    out("audio     open   3.5mm"),
    dim("6 physical ports — scan these in 3D: the white markers are callouts."),
  ],
});
registerCommand({ name: "vim", description: "", hidden: true, aliases: ["vi"], run: () => [out("~"), out("~"), out("~"), sys("-- INSERT --"), dim("you are now trapped in vim. type :q! … just kidding, you're back.")] });
registerCommand({ name: "nano", description: "", hidden: true, run: () => [out("nano: a sensible choice. nothing to edit here though.")] });
registerCommand({ name: "emacs", description: "", hidden: true, run: () => [out("emacs: great operating system, lacking only a decent editor."), dim("(it's a very old joke. it still works.)")] });
registerCommand({
  name: "cowsay",
  description: "",
  hidden: true,
  run: (ctx) => {
    const msg = ctx.args.join(" ") || "moo. deploy on fridays at your own risk.";
    const bar = "-".repeat(msg.length + 2);
    return [pre(` ${"_".repeat(msg.length + 2)}`), pre(`< ${msg} >`), pre(` ${bar}`), pre("        \\   ^__^"), pre("         \\  (oo)\\_______"), pre("            (__)\\       )\\/\\"), pre("                ||----w |"), pre("                ||     ||")];
  },
});
const FORTUNES = [
  "It works on my machine. Ship the machine.",
  "There are two hard things: cache invalidation, naming things, and off-by-one errors.",
  "The cloud is just someone else's computer. The N-01 is just this one.",
  "A 'quick fix' is a long-term commitment with a short name.",
  "Uptime is a feeling. Monitoring is a fact.",
  "Never deploy on a Friday. Never say never.",
];
registerCommand({ name: "fortune", description: "", hidden: true, run: () => [out(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])] });
registerCommand({ name: "doom", description: "", hidden: true, run: () => [out("can it run DOOM? not yet."), dim("the arcade runs snake though — and some old cheat codes still work on this site.")] });
registerCommand({ name: "hack", description: "", hidden: true, aliases: ["hollywood"], run: () => [out("ACCESS GRANTED"), dim("(that's not how any of this works. try: msfconsole)")] });

/* ---------------- easter eggs (hidden from help & autocomplete) ---------------- */
registerCommand({
  name: "sudo hire-me",
  description: "",
  hidden: true,
  run: (ctx) => {
    setTimeout(() => ctx.device.openOverlay("hire"), 350);
    return [sys("[sudo] password for visitor: ********"), accent("access granted — opening priority channel…")];
  },
});
registerCommand({
  name: "sudo matrix",
  description: "",
  hidden: true,
  run: (ctx) => {
    setTimeout(() => ctx.device.openOverlay("matrix"), 300);
    return [sys("wake up, visitor…"), dim("(click or press esc to exit)")];
  },
});
registerCommand({
  name: "sudo coffee",
  description: "",
  hidden: true,
  run: () => [
    sys("[sudo] brewing…"),
    err("E418: I'm a teapot. Hardware has no coffee module."),
    dim("Suggested workaround: `apt install patience` and try again after the next sprint."),
  ],
});
const UNLOCK_WORD = "orange";
registerCommand({
  name: "sudo unlock",
  description: "",
  hidden: true,
  run: (ctx) => {
    const guess = ctx.args.join(" ").toLowerCase();
    if (!guess) {
      return [
        sys("SECURE VAULT · locked"),
        out("Clue: every control on this device shares one colour. Its name, in hex:"),
        accent("  4f 52 41 4e 47 45"),
        dim("Answer with:  sudo unlock <word>"),
      ];
    }
    if (guess === UNLOCK_WORD) {
      ctx.device.showToast("VAULT UNLOCKED · maker's note found");
      return [accent("✔ vault unlocked"), out("Maker's note: thanks for poking around. The N-01 started as a sketch"), out("and became this site one component at a time. Say hi — try `contact`.")];
    }
    return [err("✖ access denied"), dim("hint: decode the hex as ASCII")];
  },
});


/* ------------------------------------------------------------------ DevOps cheat sheets */
const DOCS: { key: string; title: string; href: string }[] = [
  { key: "actions", title: "GitHub Actions — workflow syntax (.github/workflows/*.yml)", href: "https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax" },
  { key: "gitlab", title: "GitLab CI/CD — .gitlab-ci.yml syntax reference", href: "https://docs.gitlab.com/ci/yaml/" },
  { key: "compose", title: "Docker Compose — compose.yaml file reference", href: "https://docs.docker.com/reference/compose-file/" },
  { key: "dockerfile", title: "Dockerfile reference", href: "https://docs.docker.com/reference/dockerfile/" },
  { key: "docker", title: "docker CLI reference", href: "https://docs.docker.com/reference/cli/docker/" },
  { key: "k8s", title: "Kubernetes — objects & YAML manifests", href: "https://kubernetes.io/docs/concepts/overview/working-with-objects/" },
  { key: "kubectl", title: "kubectl quick reference", href: "https://kubernetes.io/docs/reference/kubectl/quick-reference/" },
  { key: "terraform", title: "Terraform — configuration language", href: "https://developer.hashicorp.com/terraform/language" },
  { key: "tfcli", title: "Terraform CLI commands", href: "https://developer.hashicorp.com/terraform/cli/commands" },
];

const rows = (r: [string, string][]): Line[] => r.flatMap(([c, d]) => [out(`  $ ${c}`), dim(`      # ${d}`)]);
const docLinks = (keys: string[]): Line[] => [blank(), accent("docs"), ...keys.map((k) => { const i = DOCS.findIndex((d) => d.key === k); const d = DOCS[i]; return link(`  [${i + 1}] ${d.title}`, d.href); }), dim("  open <n> — opens that page in a new tab")];

const CHEATS: Record<string, { title: string; lines: () => Line[] }> = {
  docker: { title: "DOCKER", lines: () => [
    ...rows([
      ["docker ps -a", "all containers (running + stopped)"],
      ["docker images", "local images"],
      ["docker build -t app:1.0 .", "build from ./Dockerfile"],
      ["docker run -d -p 8080:80 --name web nginx", "run detached, host 8080 → 80"],
      ["docker logs -f web", "follow logs"],
      ["docker exec -it web sh", "shell inside the container"],
      ["docker stop web && docker rm web", "stop and remove"],
      ["docker system prune -a", "remove unused data (careful)"],
      ["docker compose up -d", "start the compose stack"],
      ["docker compose logs -f", "stack logs"],
      ["docker compose down", "stop and remove the stack"],
    ]),
    ...docLinks(["docker", "dockerfile", "compose"]),
  ] },
  kubectl: { title: "KUBERNETES (kubectl)", lines: () => [
    ...rows([
      ["kubectl get pods -A", "pods in every namespace"],
      ["kubectl get deploy,svc -n <ns>", "deployments + services"],
      ["kubectl describe pod <pod>", "events, why it's not starting"],
      ["kubectl logs -f <pod> [-c <ctr>]", "follow container logs"],
      ["kubectl exec -it <pod> -- sh", "shell into a pod"],
      ["kubectl apply -f app.yaml", "create / update from a manifest"],
      ["kubectl delete -f app.yaml", "delete what the manifest made"],
      ["kubectl rollout status deploy/<d>", "watch a rollout"],
      ["kubectl rollout undo deploy/<d>", "roll back"],
      ["kubectl scale deploy/<d> --replicas=3", "scale"],
      ["kubectl port-forward svc/<s> 8080:80", "reach a service locally"],
      ["kubectl config use-context <ctx>", "switch cluster"],
    ]),
    ...docLinks(["kubectl", "k8s"]),
  ] },
  terraform: { title: "TERRAFORM", lines: () => [
    ...rows([
      ["terraform init", "download providers, set up backend"],
      ["terraform fmt -recursive", "format .tf files"],
      ["terraform validate", "check the configuration"],
      ["terraform plan -out tfplan", "preview changes, save the plan"],
      ["terraform apply tfplan", "apply exactly that plan"],
      ["terraform destroy", "tear everything down (careful)"],
      ["terraform state list", "resources in state"],
      ["terraform output", "show outputs"],
      ["terraform workspace new <name>", "separate state per env"],
      ["terraform import <addr> <id>", "adopt an existing resource"],
    ]),
    ...docLinks(["terraform", "tfcli"]),
  ] },
  yaml: { title: "YAML — CI WORKFLOWS & MANIFESTS", lines: () => [
    dim("  GitHub Actions: save as .github/workflows/ci.yml"),
    ...[
      "name: ci",
      "on: [push, pull_request]",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v7",
      "      - run: docker build -t app:${{ github.sha }} .",
    ].map((l) => pre(`    ${l}`)),
    blank(),
    dim("  rules: 2-space indent, no tabs · '-' starts a list item · key: value"),
    ...docLinks(["actions", "gitlab", "compose", "k8s"]),
  ] },
};
const TOPIC_ALIAS: Record<string, string> = { k8s: "kubectl", kubernetes: "kubectl", kube: "kubectl", tf: "terraform", compose: "docker", yml: "yaml", workflow: "yaml", workflows: "yaml", actions: "yaml", ci: "yaml" };

registerCommand({
  name: "cheat",
  description: "Cheat sheets: docker · kubectl · terraform · yaml",
  aliases: ["cheatsheet", "tldr"],
  run: (ctx) => {
    const t = (ctx.args[0] ?? "").toLowerCase();
    const key = CHEATS[t] ? t : TOPIC_ALIAS[t];
    if (!key) return [
      ...section("CHEAT SHEETS"),
      ...Object.entries(CHEATS).map(([k, c]) => out(`  cheat ${k.padEnd(11)}${c.title.toLowerCase()}`)),
      blank(),
      dim("official docs for all of them: docs"),
    ];
    return [...section(`CHEAT · ${CHEATS[key].title}`), ...CHEATS[key].lines()];
  },
});

registerCommand({
  name: "docs",
  description: "Official docs: workflows, compose, k8s, terraform",
  run: () => [
    ...section("OFFICIAL DOCUMENTATION"),
    ...DOCS.map((d, i) => link(`  [${i + 1}] ${d.title}`, d.href)),
    blank(),
    dim("open <n> — opens that page in a new tab"),
  ],
});

registerCommand({
  name: "open",
  description: "Open a docs link: open <n>",
  run: (ctx) => {
    const a = (ctx.args[0] ?? "").toLowerCase();
    const d = DOCS[Number(a) - 1] ?? DOCS.find((x) => x.key === a);
    if (!d) return [err("usage: open <n> — see: docs"), dim(DOCS.map((x, i) => `${i + 1}:${x.key}`).join("  "))];
    if (typeof window !== "undefined") window.open(d.href, "_blank", "noopener");
    return [sys(`opening ${d.href}`)];
  },
});
