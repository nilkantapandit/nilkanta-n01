/**
 * Physical control map: GLB node name → control id. Raycast hits are resolved by walking
 * up from the hit mesh to the first ancestor whose name is in this map.
 */
export type ControlId =
  | "display" | "wheel" | "wheel-center" | "touchpad"
  | "btn-cancel" | "btn-menu" | "btn-power" | "btn-fullscreen" | "btn-confirm"
  | "back" | "switch" | "link-led" | "logo";

export const CONTROL_NODES: Record<string, ControlId> = {
  N01_Display_Module: "display",
  N01_Display_Bezel: "display",
  N01_Display_UI: "display",
  N01_Nav_Wheel: "wheel",
  N01_Nav_Center_Button: "wheel-center",
  N01_Touchpad_Glass: "touchpad",
  N01_Touchpad_Indicator: "touchpad",
  N01_Btn_Cancel: "btn-cancel",
  N01_Btn_Menu: "btn-menu",
  N01_Btn_Power: "btn-power",
  N01_Btn_Fullscreen: "btn-fullscreen",
  N01_Btn_Confirm: "btn-confirm",
  N01_Back_Button: "back",
  N01_Power_Mode_Switch: "switch",
  N01_Eth_Indicator_LEDs: "link-led",
  N01_Brand_Nilkanta_Front: "logo",
};

export const CONTROL_LABELS: Record<ControlId, string> = {
  display: "Screen — operate the N-01",
  wheel: "Nav wheel — click a side or scroll to move",
  "wheel-center": "Centre — select",
  touchpad: "Touch surface — swipe · tap · long-press",
  "btn-cancel": "Cancel — back / exit screen",
  "btn-menu": "Menu — main menu",
  "btn-power": "Power — boot / shut down",
  "btn-fullscreen": "Fullscreen — immersive mode",
  "btn-confirm": "Confirm — select",
  back: "Back",
  switch: "Mode switch — FIELD COMMS ↔ SECURE",
  "link-led": "Status indicators",
  logo: "NILKANTA",
};

/** Meshes that stay raycastable as occluders so clicks can't pass through the body. */
export const OCCLUDER_NODES = new Set([
  "N01_Main_Chassis", "N01_Rear_Cover", "N01_Corner_Guard_TL", "N01_Corner_Guard_TR", "N01_Corner_Guard_BL",
  "N01_Corner_Guard_BR", "N01_Carry_Loop", "N01_Battery_Cover", "N01_DPad_Trim", "N01_Nav_Wheel_Ring", "N01_Eth_Indicator_Panel",
]);

/** Heavy text meshes that should never be raycast (they are covered by their control's other parts). */
export const NO_RAYCAST_NODES = new Set(["N01_Display_UI"]);
