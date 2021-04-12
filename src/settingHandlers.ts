import {
  DropdownComponent,
  Setting,
  SliderComponent,
  TextComponent,
  debounce,
  ButtonComponent,
  setIcon,
} from "obsidian";
import { CSSSettingsManager } from "./SettingsManager";
import Pickr from "@simonwep/pickr";

const resetTooltip = "Restore default";

function sanitizeText(str: string): string {
  if (str === "") {
    return `""`;
  }

  return str.replace(/[;<>]/g, "");
}

function createDescription(description: string | undefined, def: string) {
  const fragment = createFragment();

  if (description) {
    fragment.appendChild(document.createTextNode(description));
  }

  if (def) {
    const small = createEl("small");
    small.appendChild(createEl("strong", { text: "Default: " }));
    small.appendChild(document.createTextNode(def));

    const div = createEl("div");

    div.appendChild(small);

    fragment.appendChild(div);
  }

  return fragment;
}

export type CleanupFunction = void | (() => void);

interface Meta {
  id: string;
  type: string;
  title: string;
  description?: string;
}

export interface Heading extends Meta {
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  collapsed?: boolean;
}

export function createHeading(opts: {
  config: Heading;
  containerEl: HTMLElement;
}) {
  new Setting(opts.containerEl)
    .setHeading()
    .setClass('style-settings-heading')
    .setName(opts.config.title)
    .setDesc(opts.config.description ? opts.config.description : "")
    .then((setting) => {
      if (opts.config.collapsed) setting.settingEl.addClass('is-collapsed');
      setting.settingEl.dataset.level = opts.config.level.toString();

      const iconContainer = createSpan({ cls: 'style-settings-collapse-indicator' })

      setIcon(iconContainer, 'right-triangle')

      setting.nameEl.prepend(iconContainer)

      setting.settingEl.addEventListener('click', (e) => {
        setting.settingEl.toggleClass('is-collapsed', !setting.settingEl.hasClass('is-collapsed'));
      })
    });
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
    .setDesc(config.description || "")
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

  if (typeof config.default !== "string") {
    return console.error(`Error: ${config.title} missing default value`);
  }

  new Setting(containerEl)
    .setName(config.title)
    .setDesc(createDescription(config.description, config.default))
    .addText((text) => {
      const value = settingsManager.getSetting(sectionId, config.id);
      const onChange = debounce(
        (value: string) => {
          settingsManager.setSetting(sectionId, config.id, sanitizeText(value));
        },
        250,
        true
      );

      text
        .setValue(value ? value.toString() : config.default)
        .onChange(onChange);

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
  format?: string;
}

export function createVariableNumber(opts: {
  sectionId: string;
  config: VariableNumber;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;
  let textComponent: TextComponent;

  if (typeof config.default !== "number") {
    return console.error(`Error: ${config.title} missing default value`);
  }

  new Setting(containerEl)
    .setName(config.title)
    .setDesc(createDescription(config.description, config.default.toString(10)))
    .addText((text) => {
      const value = settingsManager.getSetting(sectionId, config.id);
      const onChange = debounce(
        (value: string) => {
          const isFloat = /\./.test(value);
          settingsManager.setSetting(
            sectionId,
            config.id,
            isFloat ? parseFloat(value) : parseInt(value, 10)
          );
        },
        250,
        true
      );

      text
        .setValue(
          value !== undefined ? value.toString() : config.default.toString()
        )
        .onChange(onChange);

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
  format?: string;
}

export function createVariableNumberSlider(opts: {
  sectionId: string;
  config: VariableNumberSlider;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;
  let sliderComponent: SliderComponent;

  if (typeof config.default !== "number") {
    return console.error(`Error: ${config.title} missing default value`);
  }

  new Setting(containerEl)
    .setName(config.title)
    .setDesc(createDescription(config.description, config.default.toString(10)))
    .addSlider((slider) => {
      const value = settingsManager.getSetting(sectionId, config.id);
      const onChange = debounce(
        (value: number) => {
          settingsManager.setSetting(sectionId, config.id, value);
        },
        250,
        true
      );

      slider
        .setLimits(config.min, config.max, config.step)
        .setValue(value !== undefined ? (value as number) : config.default)
        .onChange(onChange);

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

  if (typeof config.default !== "string") {
    return console.error(`Error: ${config.title} missing default value`);
  }

  new Setting(containerEl)
    .setName(config.title)
    .setDesc(createDescription(config.description, config.default))
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

export type ColorFormat =
  | "hsl"
  | "hsl-values"
  | "hsl-split"
  | "rgb"
  | "rgb-values"
  | "rgb-split"
  | "hex";

export interface VariableColor extends Meta {
  default: string;
  format: ColorFormat;
  opacity?: boolean;
}

export function createVariableColor(opts: {
  sectionId: string;
  config: VariableColor;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;

  if (typeof config.default !== "string" || config.default[0] !== "#") {
    return console.error(
      `Error: ${config.title} missing default value, or value is not in hex format`
    );
  }

  const s = new Setting(containerEl)
    .setName(config.title)
    .setDesc(createDescription(config.description, config.default));

  const value = settingsManager.getSetting(sectionId, config.id);
  const colorPicker = createDiv({ cls: "picker" });

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
    lockOpacity: !config.opacity,
    default: value !== undefined ? (value as string) : config.default,
    position: "left-middle",
    components: {
      preview: true,
      hue: true,
      opacity: !!config.opacity,
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

  s.addExtraButton((b) => {
    b.setIcon("reset");
    b.onClick(() => {
      pickr.setColor(config.default);
      settingsManager.clearSetting(sectionId, config.id);
    });
    b.setTooltip(resetTooltip);
  });

  return () => pickr.destroyAndRemove();
}

export interface VariableThemedColor extends Meta {
  "default-light": string;
  "default-dark": string;
  format: ColorFormat;
  opacity?: boolean;
}

export function createVariableThemedColor(opts: {
  sectionId: string;
  config: VariableThemedColor;
  containerEl: HTMLElement;
  settingsManager: CSSSettingsManager;
}): CleanupFunction {
  const { sectionId, config, containerEl, settingsManager } = opts;

  if (
    typeof config["default-light"] !== "string" ||
    config["default-light"][0] !== "#"
  ) {
    return console.error(
      `Error: ${config.title} missing default light value, or value is not in hex format`
    );
  }

  if (
    typeof config["default-dark"] !== "string" ||
    config["default-dark"][0] !== "#"
  ) {
    return console.error(
      `Error: ${config.title} missing default dark value, or value is not in hex format`
    );
  }

  const desc = createFragment();

  if (config.description) {
    desc.appendChild(document.createTextNode(config.description));
  }

  const light = createEl("small");
  const dark = createEl("small");
  const p = createEl("p");

  light.appendChild(createEl("strong", { text: "Default (light): " }));
  light.appendChild(document.createTextNode(config["default-light"]));

  p.appendChild(light);
  p.appendChild(createEl("br"));

  dark.appendChild(createEl("strong", { text: "Default (dark): " }));
  dark.appendChild(document.createTextNode(config["default-dark"]));

  p.appendChild(dark);
  desc.appendChild(p);

  const s = new Setting(containerEl).setName(config.title).setDesc(desc);

  const idLight = `${config.id}@@light`;
  const idDark = `${config.id}@@dark`;

  const valueLight = settingsManager.getSetting(sectionId, idLight);
  const valueDark = settingsManager.getSetting(sectionId, idDark);
  const colorPickerLight = createDiv({ cls: "picker" });
  const colorPickerDark = createDiv({ cls: "picker" });

  const wrapper = createDiv({ cls: "themed-color-wrapper" });
  const wrapperLight = createDiv({ cls: "theme-light" });
  const buttonLight = createDiv({ cls: "pickr-reset" });
  const wrapperDark = createDiv({ cls: "theme-dark" });
  const buttonDark = createDiv({ cls: "pickr-reset" });

  wrapperLight.appendChild(colorPickerLight);
  wrapperLight.appendChild(buttonLight);
  wrapperDark.appendChild(colorPickerDark);
  wrapperDark.appendChild(buttonDark);
  wrapper.appendChild(wrapperLight);
  wrapper.appendChild(wrapperDark);
  s.controlEl.appendChild(wrapper);

  const swatchesLight: string[] = [];
  const swatchesDark: string[] = [];

  if (config["default-light"]) {
    swatchesLight.push(config["default-light"]);
  }

  if (valueLight !== undefined) {
    swatchesLight.push(valueLight as string);
  }

  if (config["default-dark"]) {
    swatchesLight.push(config["default-dark"]);
  }

  if (valueDark !== undefined) {
    swatchesDark.push(valueDark as string);
  }

  const onCancel = (instance: Pickr) => {
    instance.hide();
  };

  const pickrLight = Pickr.create({
    el: colorPickerLight,
    theme: "nano",
    swatches: swatchesLight,
    lockOpacity: !config.opacity,
    default:
      valueLight !== undefined
        ? (valueLight as string)
        : config["default-light"],
    position: "left-middle",
    components: {
      preview: true,
      hue: true,
      opacity: !!config.opacity,
      interaction: {
        input: true,
        cancel: true,
        save: true,
      },
    },
  })
    .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
      if (!color) return;

      settingsManager.setSetting(sectionId, idLight, color.toHEXA().toString());

      instance.hide();
      instance.addSwatch(color.toHEXA().toString());
    })
    .on("cancel", onCancel);

  const pickrDark = Pickr.create({
    el: colorPickerDark,
    theme: "nano",
    swatches: swatchesDark,
    lockOpacity: !config.opacity,
    default:
      valueDark !== undefined ? (valueDark as string) : config["default-dark"],
    position: "left-middle",
    components: {
      preview: true,
      hue: true,
      opacity: !!config.opacity,
      interaction: {
        input: true,
        cancel: true,
        save: true,
      },
    },
  })
    .on("save", (color: Pickr.HSVaColor, instance: Pickr) => {
      if (!color) return;

      settingsManager.setSetting(sectionId, idDark, color.toHEXA().toString());

      instance.hide();
      instance.addSwatch(color.toHEXA().toString());
    })
    .on("cancel", onCancel);

  new ButtonComponent(buttonLight)
    .setIcon("reset")
    .onClick(() => {
      pickrLight.setColor(config["default-light"]);
      settingsManager.clearSetting(sectionId, idLight);
    })
    .setTooltip(resetTooltip);

  new ButtonComponent(buttonDark)
    .setIcon("reset")
    .onClick(() => {
      pickrDark.setColor(config["default-dark"]);
      settingsManager.clearSetting(sectionId, idDark);
    })
    .setTooltip(resetTooltip);

  return () => {
    pickrLight.destroyAndRemove();
    pickrDark.destroyAndRemove();
  };
}

export type CSSSetting =
  | Heading
  | ClassToggle
  | VariableText
  | VariableNumber
  | VariableNumberSlider
  | VariableSelect
  | VariableColor
  | VariableThemedColor;

export interface ParsedCSSSettings {
  name: string;
  id: string;
  settings: Array<CSSSetting>;
}

export function createSettings(opts: {
  containerEl: HTMLElement;
  sectionId: string;
  settings: CSSSetting[];
  settingsManager: CSSSettingsManager;
}): CleanupFunction[] {
  const { containerEl, sectionId, settings, settingsManager } = opts;

  const containerStack: HTMLElement[] = [containerEl];
  const cleanup: CleanupFunction[] = [];

  let containerLevel = 0;

  function getTargetContainer(stack: HTMLElement[]) {
    if (!stack.length) return containerEl;
    return stack[stack.length - 1];
  }

  settings.forEach((setting) => {
    switch (setting.type) {
      case "heading": {
        const config = setting as Heading;

        let targetContainer = getTargetContainer(containerStack);

        console.log(containerLevel, containerStack)

        if (config.level > containerLevel) {
          createHeading({
            config,
            containerEl: targetContainer,
          });

          targetContainer.createDiv(
            { cls: "style-settings-container" },
            (container) => {
              containerStack.push(container);
            }
          );
        } else if (config.level === containerLevel) {
          containerStack.pop();
          targetContainer = getTargetContainer(containerStack);

          createHeading({
            config,
            containerEl: targetContainer,
          });

          targetContainer.createDiv(
            { cls: "style-settings-container" },
            (container) => {
              containerStack.push(container);
            }
          );
        } else {
          containerStack.pop();
          targetContainer = getTargetContainer(containerStack);

          createHeading({
            config,
            containerEl: targetContainer,
          });
        }

        containerLevel = config.level;

        break;
      }
      case "class-toggle": {
        createClassToggle({
          sectionId,
          config: setting as ClassToggle,
          containerEl: getTargetContainer(containerStack),
          settingsManager,
        });
        break;
      }
      case "variable-text": {
        createVariableText({
          sectionId,
          config: setting as VariableText,
          containerEl: getTargetContainer(containerStack),
          settingsManager,
        });
        break;
      }
      case "variable-number": {
        createVariableNumber({
          sectionId,
          config: setting as VariableNumber,
          containerEl: getTargetContainer(containerStack),
          settingsManager,
        });
        break;
      }
      case "variable-number-slider": {
        createVariableNumberSlider({
          sectionId,
          config: setting as VariableNumberSlider,
          containerEl: getTargetContainer(containerStack),
          settingsManager,
        });
        break;
      }
      case "variable-select": {
        createVariableSelect({
          sectionId,
          config: setting as VariableSelect,
          containerEl: getTargetContainer(containerStack),
          settingsManager,
        });
        break;
      }
      case "variable-color": {
        cleanup.push(
          createVariableColor({
            sectionId,
            config: setting as VariableColor,
            containerEl: getTargetContainer(containerStack),
            settingsManager,
          })
        );
        break;
      }
      case "variable-themed-color": {
        cleanup.push(
          createVariableThemedColor({
            sectionId,
            config: setting as VariableThemedColor,
            containerEl: getTargetContainer(containerStack),
            settingsManager,
          })
        );
        break;
      }
    }
  });

  return cleanup;
}
