/**
 * TerminalCommandRegistry — structured, extensible command table for the N-01 terminal.
 *
 * Add a command anywhere with:
 *   registerCommand({ name: "hello", description: "Say hi", run: () => [out("hi")] })
 * and import that module once (see lib/terminal/commands.ts).
 */
import { useDevice } from "@/lib/store";

export type LineKind = "in" | "out" | "dim" | "accent" | "err" | "sys" | "head" | "link" | "pre";
export type Line = { kind: LineKind; text: string; href?: string };

export type TerminalContext = {
  args: string[];
  raw: string;
  print: (lines: Line[]) => void;
  clear: () => void;
  close: () => void;
  device: ReturnType<typeof useDevice.getState>;
};

export type Command = {
  name: string;
  description: string;
  /** Hidden commands (easter eggs) are not listed in help/autocomplete. */
  hidden?: boolean;
  /** Shown in the physical-controls navigation menu (wheel / touchpad / Menu key). */
  menu?: boolean;
  aliases?: string[];
  run: (ctx: TerminalContext) => Line[] | void | Promise<Line[] | void>;
};

const registry = new Map<string, Command>();
const aliasMap = new Map<string, string>();

export function registerCommand(cmd: Command) {
  registry.set(cmd.name, cmd);
  cmd.aliases?.forEach((a) => aliasMap.set(a, cmd.name));
}

export function getCommand(name: string): Command | undefined {
  return registry.get(name) ?? registry.get(aliasMap.get(name) ?? "");
}

export function listCommands(includeHidden = false): Command[] {
  return [...registry.values()].filter((c) => includeHidden || !c.hidden);
}

export function menuCommands(): Command[] {
  return listCommands().filter((c) => c.menu);
}

/** Visible command names that start with `prefix` (used for autocomplete). */
export function complete(prefix: string): string[] {
  const p = prefix.trim().toLowerCase();
  if (!p) return [];
  return listCommands().map((c) => c.name).filter((n) => n.startsWith(p) && n !== p).sort();
}

/* small line helpers */
export const out = (text: string): Line => ({ kind: "out", text });
export const dim = (text: string): Line => ({ kind: "dim", text });
export const accent = (text: string): Line => ({ kind: "accent", text });
export const head = (text: string): Line => ({ kind: "head", text });
export const err = (text: string): Line => ({ kind: "err", text });
export const sys = (text: string): Line => ({ kind: "sys", text });
export const pre = (text: string): Line => ({ kind: "pre", text });
export const link = (text: string, href: string): Line => ({ kind: "link", text, href });
export const blank = (): Line => ({ kind: "out", text: "" });

/** Parse and run one input line. Supports `sudo <cmd>` as its own namespace (easter eggs). */
export async function runCommand(raw: string, ctx: Omit<TerminalContext, "args" | "raw">): Promise<Line[]> {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\s+/);
  let name = parts[0].toLowerCase();
  let args = parts.slice(1);
  if (name === "sudo" && args.length) {
    name = `sudo ${args[0].toLowerCase()}`;
    args = args.slice(1);
  }
  const cmd = getCommand(name);
  if (!cmd) {
    if (name.startsWith("sudo ")) return [err(`sudo: ${name.slice(5)}: command not found`), dim("nice try though.")];
    const near = complete(name.slice(0, 2));
    return [err(`nsh: command not found: ${parts[0]}`), dim(near.length ? `did you mean: ${near.slice(0, 3).join(", ")}?` : "type 'help' for the list of commands")];
  }
  const res = await cmd.run({ ...ctx, args, raw: trimmed });
  return res ?? [];
}
