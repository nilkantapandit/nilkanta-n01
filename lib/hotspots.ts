/**
 * Technical callout definitions for the N-01.
 *
 * Every hotspot is anchored to a real node in public/models/nilkanta-n01.glb (validated
 * against the exported node list). `offset` is in the node's local frame, in metres
 * (the GLB's native unit), so markers follow the device as it rotates and sways.
 *
 * Model frame (glTF): front = +Z, top = +Y, right = +X.
 * Specs come only from the official N-01 concept blueprint — nothing is invented.
 */
export type Hotspot = {
  id: string;
  /** Exact GLB node name the marker is attached to. */
  node: string;
  /** Local offset from the node origin (metres). */
  offset: [number, number, number];
  /** Outward surface normal in the model frame — used to hide markers facing away. */
  normal: [number, number, number];
  /** Preferred screen-space direction for the leader line / card (pixels). */
  card: [number, number];
  title: string;
  subtitle: string;
  lines: string[];
  /** Optional interaction hint shown at the bottom of the card. */
  action?: string;
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: "eth0",
    node: "N01_Ethernet_Port_ETH0",
    offset: [0, 0.0005, 0],
    normal: [-1, 0, 0],
    card: [-150, -90],
    title: "ETH0",
    subtitle: "Ethernet port · left panel (upper)",
    lines: ["RJ45 network jack", "Link / activity LEDs beside the port", "Mirrored on the front ETH0 indicator"],
  },
  {
    id: "eth1",
    node: "N01_Ethernet_Port_ETH1",
    offset: [0, -0.0005, 0],
    normal: [-1, 0, 0],
    card: [-150, 80],
    title: "ETH1",
    subtitle: "Ethernet port · left panel (lower)",
    lines: ["Second RJ45 network jack", "Link / activity LEDs beside the port", "Mirrored on the front ETH1 indicator"],
  },
  {
    id: "hdmi",
    node: "N01_HDMI_Port",
    offset: [0, 0.0005, 0],
    normal: [0, 1, 0],
    card: [-170, -110],
    title: "HDMI",
    subtitle: "Video output · top panel",
    lines: ["Full-size HDMI Type-A receptacle", "External display output"],
  },
  {
    id: "usbc",
    node: "N01_USB_C_Port_Top",
    offset: [0, 0.0005, 0],
    normal: [0, 1, 0],
    card: [-20, -150],
    title: "USB-C",
    subtitle: "Reversible port · top panel",
    lines: ["USB Type-C receptacle", "Centred between HDMI and USB-A"],
  },
  {
    id: "usba",
    node: "N01_USB_A_Port_Top",
    offset: [0, 0.0005, 0],
    normal: [0, 1, 0],
    card: [150, -120],
    title: "USB-A",
    subtitle: "Peripheral port · top panel",
    lines: ["USB Type-A receptacle", "Blue USB 3.x-style insert"],
  },
  {
    id: "audio",
    node: "N01_Audio_Jack",
    offset: [0.0004, 0, 0],
    normal: [1, 0, 0],
    card: [150, 90],
    title: "AUDIO",
    subtitle: "3.5 mm jack · right panel",
    lines: ["Headphone / headset socket", "Recessed opening with metal rim"],
  },
  {
    id: "display",
    node: "N01_Display_Module",
    offset: [0.0478, 0.0345, 0],
    normal: [0, 0, 1],
    card: [130, -140],
    title: "DISPLAY",
    subtitle: "Main screen · amber terminal UI",
    lines: ['4.0" IPS · 480 × 320 (concept spec)', "Runs the N-01 interface: apps and terminal"],
    action: "Click the screen to operate the device",
  },
  {
    id: "wheel",
    node: "N01_Nav_Wheel",
    offset: [0.0136, 0.0136, 0],
    normal: [0, 0, 1],
    card: [140, -110],
    title: "NAV WHEEL",
    subtitle: "Navigation control · right wing",
    lines: ["Four-direction wheel", "Centre button confirms"],
    action: "Click a side or scroll over it to move · centre to select",
  },
  {
    id: "touchpad",
    node: "N01_Touchpad_Glass",
    offset: [-0.0136, 0.0136, 0],
    normal: [0, 0, 1],
    card: [-150, -110],
    title: "TOUCH SURFACE",
    subtitle: "Capacitive glass · left wing (concept)",
    lines: ["Flat, recessed touch surface", "Fingerprint-style marking · contactless symbol"],
    action: "Swipe · tap · long-press",
  },
  {
    id: "buttons",
    node: "N01_Btn_Power",
    offset: [0.0065, -0.0047, 0],
    normal: [0, 0, 1],
    card: [0, 130],
    title: "FUNCTION KEYS",
    subtitle: "Five keys below the display",
    lines: ["Cancel · Menu · Power · Fullscreen · Confirm", "Orange status bar above each key"],
    action: "Each key is live on this page",
  },
  {
    id: "switch",
    node: "N01_Power_Mode_Switch",
    offset: [0.0095, 0.0002, 0],
    normal: [0, 1, 0],
    card: [-120, -140],
    title: "MODE SWITCH",
    subtitle: "Two-position slider · top edge",
    lines: ["FIELD COMMS ↔ SECURE", "Website modes are visual simulations"],
    action: "Click to switch mode",
  },
  {
    id: "loop",
    node: "N01_Carry_Loop",
    offset: [0, 0.012, 0],
    normal: [0, 1, 0],
    card: [140, -120],
    title: "CARRY LOOP",
    subtitle: "Modular loop · top-right corner",
    lines: ["Reinforced carry / tether point", "Orange-illuminated inner edge"],
  },
];
