import {
  DropdownComponent,
  Setting,
  SliderComponent,
  TextComponent,
} from "obsidian";
import { CSSSettingsManager } from "./SettingsManager";
import Pickr from "@simonwep/pickr";

const resetTooltip = "Revert to default"

function sanitizeText(str: string): string {
  if (str === '') {
    return `""`
  }

  return str.replace(/[;<>]/g, '')
}

export type CleanupFunction = void | (() => void)

interface Meta {
  id: string;
  type: string;
  title: string;
  description?: string;
}

export interface Heading extends Meta {
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export function createHeading(opts: {
  config: Heading;
  containerEl: HTMLElement;
}) {
  const level = `h${opts.config.level}` as
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6";

  opts.containerEl.createEl(level, { text: opts.config.title });

  if (opts.config.description) {
    opts.containerEl.createEl("p", { text: opts.config.description });
  }
}

export interface ClassToggle extends Meta {}

export function createClassToggle(opts: {
  sectionId: string;
  config: ClassToggle;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;

  new Setting(containerEl)
    .setName(config.title)
    .setDesc((config.description || ""))
    .addToggle((toggle) => {
      const value = settingsManager.getSetting(sectionId, config.id);

      if (value) {
        document.body.classList.add(config.id);
      }

      toggle.setValue((value as boolean) || false).onChange((value) => {
        settingsManager.setSetting(sectionId, config.id, value);

        if (value) {
          document.body.classList.add(config.id);
        } else {
          document.body.classList.remove(config.id);
        }
      });
    });
}

export interface VariableText extends Meta {
  default: string;
}

export function createVariableText(opts: {
  sectionId: string;
  config: VariableText;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;
  let textComponent: TextComponent;

  new Setting(containerEl)
    .setName(config.title)
    .setDesc((config.description || "") + ` (default: ${sanitizeText(config.default)})`)
    .addText((text) => {
      const value = settingsManager.getSetting(sectionId, config.id);
      let debounceTimer = 0;

      text
        .setValue(value ? value.toString() : config.default)
        .onChange((value) => {
          clearTimeout(debounceTimer);

          debounceTimer = window.setTimeout(() => {
            settingsManager.setSetting(sectionId, config.id, sanitizeText(value));
          }, 50);
        });

      textComponent = text;
    })
    .addExtraButton((b) => {
      b.setIcon("reset");
      b.onClick(() => {
        textComponent.setValue(config.default);
        settingsManager.clearSetting(sectionId, config.id);
      });
      b.setTooltip(resetTooltip);
    });
}

export interface VariableNumber extends Meta {
  default: number;
}

export function createVariableNumber(opts: {
  sectionId: string;
  config: VariableNumber;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;
  let textComponent: TextComponent;

  new Setting(containerEl)
    .setName(config.title)
    .setDesc((config.description || "") + ` (default: ${config.default})`)
    .addText((text) => {
      const value = settingsManager.getSetting(sectionId, config.id);
      let debounceTimer = 0;

      text
        .setValue(
          value !== undefined ? value.toString() : config.default.toString()
        )
        .onChange((value) => {
          clearTimeout(debounceTimer);

          debounceTimer = window.setTimeout(() => {
            const isFloat = /\./.test(value);
            settingsManager.setSetting(
              sectionId,
              config.id,
              isFloat ? parseFloat(value) : parseInt(value, 10)
            );
          }, 50);
        });

      textComponent = text;
    })
    .addExtraButton((b) => {
      b.setIcon("reset");
      b.onClick(() => {
        textComponent.setValue(config.default.toString());
        settingsManager.clearSetting(sectionId, config.id);
      });
      b.setTooltip(resetTooltip);
    });
}

export interface VariableNumberSlider extends Meta {
  default: number;
  min: number;
  max: number;
  step: number;
}

export function createVariableNumberSlider(opts: {
  sectionId: string;
  config: VariableNumberSlider;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;
  let sliderComponent: SliderComponent;

  new Setting(containerEl)
    .setName(config.title)
    .setDesc((config.description || "") + ` (default: ${config.default})`)
    .addSlider((slider) => {
      const value = settingsManager.getSetting(sectionId, config.id);
      let debounceTimer = 0;

      slider
        .setLimits(config.min, config.max, config.step)
        .setValue(value !== undefined ? (value as number) : config.default)
        .onChange((value) => {
          clearTimeout(debounceTimer);

          debounceTimer = window.setTimeout(() => {
            settingsManager.setSetting(sectionId, config.id, value);
          }, 50);
        });

      sliderComponent = slider;
    })
    .addExtraButton((b) => {
      b.setIcon("reset");
      b.onClick(() => {
        sliderComponent.setValue(config.default);
        settingsManager.clearSetting(sectionId, config.id);
      });
      b.setTooltip(resetTooltip);
    });
}

export interface VariableSelect extends Meta {
  default: string;
  options: string[];
}

export function createVariableSelect(opts: {
  sectionId: string;
  config: VariableSelect;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;
  let dropdownComponent: DropdownComponent;

  new Setting(containerEl)
    .setName(config.title)
    .setDesc((config.description || "") + ` (default: ${config.default})`)
    .addDropdown((dropdown) => {
      const value = settingsManager.getSetting(sectionId, config.id);

      config.options.forEach((o) => dropdown.addOption(o, o));

      dropdown
        .setValue(value !== undefined ? (value as string) : config.default)
        .onChange((value) => {
          settingsManager.setSetting(sectionId, config.id, value);
        });

      dropdownComponent = dropdown;
    })
    .addExtraButton((b) => {
      b.setIcon("reset");
      b.onClick(() => {
        dropdownComponent.setValue(config.default);
        settingsManager.clearSetting(sectionId, config.id);
      });
      b.setTooltip(resetTooltip);
    });
}

export interface VariableColor extends Meta {
  default: string;
  format:
    | "hsl"
    | "hsl-values"
    | "hsl-split"
    | "rgb"
    | "rgb-values"
    | "rgb-split"
    | "hex";
  var: string;
}

export function createVariableColor(opts: {
  sectionId: string;
  config: VariableColor;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;

  const s = new Setting(containerEl)
    .setName(config.title)
    .setDesc((config.description || "") + ` (default: ${config.default})`);

  const value = settingsManager.getSetting(sectionId, config.id);
  const colorPicker = document.createElement("div");

  colorPicker.className = "pickr";

  s.controlEl.append(colorPicker);

  const swatches: string[] = [];

  if (config.default) {
    swatches.push(config.default);
  }

  if (value !== undefined) {
    swatches.push(value as string);
  }

  const pickr = Pickr.create({
    el: colorPicker,
    theme: "nano",
    swatches,
    lockOpacity: true,
    default: value !== undefined ? (value as string) : config.default,
    position: "left-middle",
    components: {
      preview: true,
      hue: true,
      interaction: {
        input: true,
        cancel: true,
        save: true,
      },
    },
  })
    .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
      if (!color) return;

      settingsManager.setSetting(
        sectionId,
        config.id,
        color.toHEXA().toString()
      );

      instance.hide();
      instance.addSwatch(color.toHEXA().toString());
    })
    .on("cancel", (instance: Pickr) => {
      instance.hide();
    });

    s
    .addExtraButton((b) => {
      b.setIcon("reset");
      b.onClick(() => {
        pickr.setColor(config.default)
        settingsManager.clearSetting(sectionId, config.id);
      });
      b.setTooltip(resetTooltip);
    });

    return () => pickr.destroyAndRemove()
}

export type CSSSetting =
  | Heading
  | ClassToggle
  | VariableText
  | VariableNumber
  | VariableNumberSlider
  | VariableSelect
  | VariableColor;

export interface ParsedCSSSettings {
  name: string;
  id: string;
  settings: Array<CSSSetting>;
}

export function createSetting(opts: {
  containerEl: HTMLElement;
  sectionId: string;
  setting: CSSSetting;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { containerEl, sectionId, setting, settingsManager } = opts;

  switch (setting.type) {
    case "heading":
      return createHeading({
        config: setting as Heading,
        containerEl,
      });
    case "class-toggle":
      return createClassToggle({
        sectionId,
        config: setting as ClassToggle,
        containerEl,
        settingsManager,
      });
    case "variable-text":
      return createVariableText({
        sectionId,
        config: setting as VariableText,
        containerEl,
        settingsManager,
      });
    case "variable-number":
      return createVariableNumber({
        sectionId,
        config: setting as VariableNumber,
        containerEl,
        settingsManager,
      });
    case "variable-number-slider":
      return createVariableNumberSlider({
        sectionId,
        config: setting as VariableNumberSlider,
        containerEl,
        settingsManager,
      });
    case "variable-select":
      return createVariableSelect({
        sectionId,
        config: setting as VariableSelect,
        containerEl,
        settingsManager,
      });
    case "variable-color":
      return createVariableColor({
        sectionId,
        config: setting as VariableColor,
        containerEl,
        settingsManager,
      });
  }
}
