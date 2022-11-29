import {
  AltFormatList,
  CSSSetting,
  ClassMultiToggle,
  ClassToggle,
  ColorFormat,
  ParsedCSSSettings,
  VariableColor,
  VariableNumber,
  VariableNumberSlider,
  VariableSelect,
  VariableText,
  VariableThemedColor,
  ColorGradient,
} from "./settingHandlers";
import { App, ButtonComponent, Modal, Setting, TextAreaComponent } from "obsidian";

import CSSSettingsPlugin from "./main";
import chroma from "chroma-js";

type VariableKV = Array<{ key: string; value: string }>;

export type SettingValue = number | string | boolean;

export interface CSSSettings {
  [key: string]: SettingValue;
}

export interface MappedSettings {
  [sectionId: string]: {
    [settingId: string]: CSSSetting;
  };
}

function generateColorVariables(
  key: string,
  format: ColorFormat,
  colorStr: string,
  opacity: boolean | undefined,
  altFormats: AltFormatList = []
): VariableKV {
  const parsedColor = chroma(colorStr);
  const alts = altFormats.reduce<VariableKV>((a, alt) => {
    a.push(...generateColorVariables(alt.id, alt.format, colorStr, opacity));
    return a;
  }, []);

  switch (format) {
    case "hex":
      return [{ key, value: colorStr }, ...alts];
    case "hsl":
      return [
        {
          key,
          value: parsedColor.css("hsl"),
        },
        ...alts,
      ];
    case "hsl-values": {
      const hsl = parsedColor.hsl();
      const alpha = opacity ? `,${parsedColor.alpha()}` : "";
      const h = isNaN(hsl[0]) ? 0 : hsl[0];

      return [
        {
          key,
          value: `${h},${hsl[1] * 100}%,${hsl[2] * 100}%${alpha}`,
        },
        ...alts,
      ];
    }
    case "hsl-split": {
      const hsl = parsedColor.hsl();
      const h = isNaN(hsl[0]) ? 0 : hsl[0];
      const out = [
        {
          key: `${key}-h`,
          value: h.toString(),
        },
        {
          key: `${key}-s`,
          value: (hsl[1] * 100).toString() + "%",
        },
        {
          key: `${key}-l`,
          value: (hsl[2] * 100).toString() + "%",
        },
        ...alts,
      ];

      if (opacity)
        out.push({
          key: `${key}-a`,
          value: parsedColor.alpha().toString(),
        });

      return out;
    }
    case "hsl-split-decimal": {
      const hsl = parsedColor.hsl();
      const h = isNaN(hsl[0]) ? 0 : hsl[0];
      const out = [
        {
          key: `${key}-h`,
          value: h.toString(),
        },
        {
          key: `${key}-s`,
          value: hsl[1].toString(),
        },
        {
          key: `${key}-l`,
          value: hsl[2].toString(),
        },
        ...alts,
      ];

      if (opacity)
        out.push({
          key: `${key}-a`,
          value: parsedColor.alpha().toString(),
        });

      return out;
    }
    case "rgb":
      return [
        {
          key,
          value: parsedColor.css(),
        },
        ...alts,
      ];
    case "rgb-values": {
      const rgb = parsedColor.rgb();
      const alpha = opacity ? `,${parsedColor.alpha()}` : "";
      return [
        {
          key,
          value: `${rgb[0]},${rgb[1]},${rgb[2]}${alpha}`,
        },
        ...alts,
      ];
    }
    case "rgb-split": {
      const rgb = parsedColor.rgb();
      const out = [
        {
          key: `${key}-r`,
          value: rgb[0].toString(),
        },
        {
          key: `${key}-g`,
          value: rgb[1].toString(),
        },
        {
          key: `${key}-b`,
          value: rgb[2].toString(),
        },
        ...alts,
      ];

      if (opacity)
        out.push({
          key: `${key}-a`,
          value: parsedColor.alpha().toString(),
        });

      return out;
    }
  }
}

function pushColors(
  arr: VariableKV,
  id: string,
  from: string,
  to: string,
  format: "hsl" | "rgb" | "hex",
  step: number,
  pad: number
) {
  const scale = chroma.scale([from.trim(), to.trim()]).domain([0, 100]);
  for (let i = 0; i <= 100; i++) {
    if (i % step === 0) {
      const c = scale(i);
      arr.push(...generateColorVariables(`${id}-${i.toString().padStart(pad, "0")}`, format, c.css(), c.alpha() !== 1));
    }
  }
}

function getCSSVariables(
  settings: CSSSettings,
  config: MappedSettings,
  gradients: Record<string, ColorGradient[]>,
  settingsManager: CSSSettingsManager
): [VariableKV, VariableKV, VariableKV] {
  const vars: VariableKV = [];
  const themedLight: VariableKV = [];
  const themedDark: VariableKV = [];

  const gradientCandidates: Record<string, string> = {};
  const gradientCandidatesLight: Record<string, string> = {};
  const gradientCandidatesDark: Record<string, string> = {};

  const seenGradientSections: Set<string> = new Set();

  for (const key in settings) {
    const [sectionId, settingId, modifier] = key.split("@@");
    const section = config[sectionId];

    if (!section) continue;

    const setting = config[sectionId][settingId];

    if (!setting) continue;

    const value = settings[key];

    switch (setting.type) {
      case "variable-number":
      case "variable-number-slider":
        const format = (setting as VariableNumber | VariableNumberSlider).format;
        const val = value !== undefined ? value : (setting as VariableNumber | VariableNumberSlider).default;
        vars.push({
          key: setting.id,
          value: `${val}${format || ""}`,
        });
        continue;
      case "variable-text":
      case "variable-select":
        const format_text = setting as VariableText | VariableSelect;
        let text = value !== undefined ? value.toString() : format_text.default.toString();
        if (format_text.quotes) {
          if (text !== `""`) {
            text = `'${text}'`;
          } else {
            text = ``;
          }
        }
        vars.push({
          key: setting.id,
          value: text,
        });
        continue;
      case "variable-color": {
        if (!seenGradientSections.has(sectionId)) seenGradientSections.add(sectionId);

        const colorSetting = setting as VariableColor;
        const color = value !== undefined ? value.toString() : colorSetting.default;

        vars.push(
          ...generateColorVariables(
            setting.id,
            colorSetting.format,
            color,
            colorSetting.opacity,
            colorSetting["alt-format"]
          )
        );

        generateColorVariables(setting.id, "rgb", color, colorSetting.opacity).forEach((kv) => {
          gradientCandidates[kv.key] = kv.value;
        });

        continue;
      }
      case "variable-themed-color": {
        if (!seenGradientSections.has(sectionId)) seenGradientSections.add(sectionId);

        const colorSetting = setting as VariableThemedColor;
        const color =
          value !== undefined
            ? value.toString()
            : colorSetting[modifier === "light" ? "default-light" : "default-dark"];

        (modifier === "light" ? themedLight : themedDark).push(
          ...generateColorVariables(
            setting.id,
            colorSetting.format,
            color,
            colorSetting.opacity,
            colorSetting["alt-format"]
          )
        );

        generateColorVariables(setting.id, "rgb", color, colorSetting.opacity).forEach((kv) => {
          if (modifier === "light") {
            gradientCandidatesLight[kv.key] = kv.value;
          } else {
            gradientCandidatesDark[kv.key] = kv.value;
          }
        });
        continue;
      }
    }
  }

  seenGradientSections.forEach((sectionId) => {
    const g = gradients[sectionId];
    if (!g) return;

    g.forEach((def) => {
      const { from, to, format, step, id, pad = 0 } = def;

      if (gradientCandidatesLight[from]) {
        const fromColor = gradientCandidatesLight[from];
        const toColor = gradientCandidatesLight[to] || settingsManager.plugin.getCSSVar(to).light?.trim();

        if (toColor) {
          pushColors(themedLight, id, fromColor, toColor, format, step, pad);
        }
      }

      if (gradientCandidatesDark[from]) {
        const fromColor = gradientCandidatesDark[from];
        const toColor = gradientCandidatesDark[to] || settingsManager.plugin.getCSSVar(to).dark?.trim();

        if (toColor) {
          pushColors(themedDark, id, fromColor, toColor, format, step, pad);
        }
      }

      if (gradientCandidates[from]) {
        const fromColor = gradientCandidates[from];
        const toColor = gradientCandidates[to] || settingsManager.plugin.getCSSVar(to).current?.trim();

        if (toColor) {
          pushColors(vars, id, fromColor, toColor, format, step, pad);
        }
      }
    });
  });

  return [vars, themedLight, themedDark];
}

export class CSSSettingsManager {
  settings: CSSSettings;
  plugin: CSSSettingsPlugin;
  styleTag: HTMLStyleElement;
  config: MappedSettings = {};
  gradients: Record<string, ColorGradient[]> = {};

  constructor(plugin: CSSSettingsPlugin) {
    this.plugin = plugin;
    this.settings = {};
    this.styleTag = document.createElement("style");
    this.styleTag.id = "css-settings-manager";

    document.getElementsByTagName("head")[0].appendChild(this.styleTag);
  }

  cleanup() {
    this.styleTag.remove();
    this.removeClasses();
  }

  async save() {
    await this.plugin.saveData(this.settings);
    this.setCSSVariables();
  }

  async load() {
    this.settings = Object.assign({}, await this.plugin.loadData());
  }

  initClasses() {
    Object.keys(this.config).forEach((section) => {
      const config = this.config[section];

      Object.keys(config).forEach((settingId) => {
        const setting = config[settingId];

        if (setting.type === "class-toggle") {
          const classToggle = setting as ClassToggle;
          let value = this.getSetting(section, settingId) as boolean | undefined;
          if (value === true || (value === undefined && classToggle.default === true)) {
            document.body.classList.add(setting.id);
          }
        } else if (setting.type === "class-select") {
          const multiToggle = setting as ClassMultiToggle;
          let value = this.getSetting(section, settingId) as string | undefined;

          if (value === undefined && !!multiToggle.default) {
            value = multiToggle.default;
          } else if (value === undefined) {
            value = "none";
          }

          if (value !== "none") {
            document.body.classList.add(value);
          }
        }
      });
    });
  }

  removeClasses() {
    Object.keys(this.config).forEach((section) => {
      const config = this.config[section];

      Object.keys(config).forEach((settingId) => {
        const setting = config[settingId];

        if (setting.type === "class-toggle") {
          if (this.getSetting(section, settingId)) {
            document.body.classList.remove(setting.id);
          }
        }
      });
    });
  }

  setCSSVariables() {
    const [vars, themedLight, themedDark] = getCSSVariables(this.settings, this.config, this.gradients, this);

    this.styleTag.innerText = `
      body.css-settings-manager {
        ${vars.reduce((combined, current) => {
          return combined + `--${current.key}: ${current.value}; `;
        }, "")}
      }

      body.theme-light.css-settings-manager {
        ${themedLight.reduce((combined, current) => {
          return combined + `--${current.key}: ${current.value}; `;
        }, "")}
      }

      body.theme-dark.css-settings-manager {
        ${themedDark.reduce((combined, current) => {
          return combined + `--${current.key}: ${current.value}; `;
        }, "")}
      }
    `
      .trim()
      .replace(/[\r\n\s]+/g, " ");
  }

  setConfig(settings: ParsedCSSSettings[]) {
    this.config = {};
    this.gradients = {};

    settings.forEach((s) => {
      this.config[s.id] = {};
      s.settings.forEach((setting) => {
        this.config[s.id][setting.id] = setting;

        if (setting.type === "color-gradient") {
          if (!this.gradients[s.id]) this.gradients[s.id] = [];
          this.gradients[s.id].push(setting as ColorGradient);
        }
      });
    });

    let pruned = false;

    for (const key in this.settings) {
      const [sectionId, settingId] = key.split("@@");

      if (this.config[sectionId] && !this.config[sectionId][settingId]) {
        delete this.settings[key];
        pruned = true;
      }
    }

    if (pruned) {
      this.save();
    } else {
      this.setCSSVariables();
    }
  }

  getSetting(sectionId: string, settingId: string): SettingValue | undefined {
    return this.settings[`${sectionId}@@${settingId}`];
  }

  getSettings(sectionId: string, ids: string[]) {
    return ids.reduce<Record<string, SettingValue>>((settings, id) => {
      const fullId = `${sectionId}@@${id}`;
      const alts = ["dark", "light"];

      if (this.settings[fullId]) {
        settings[fullId] = this.settings[fullId];
      }

      alts.forEach((alt) => {
        const id = `${fullId}@@${alt}`;

        if (this.settings[id]) {
          settings[id] = this.settings[id];
        }
      });

      return settings;
    }, {});
  }

  setSetting(sectionId: string, settingId: string, value: SettingValue) {
    this.settings[`${sectionId}@@${settingId}`] = value;
    this.save();
  }

  setSettings(settings: Record<string, SettingValue>) {
    Object.keys(settings).forEach((id) => {
      this.settings[id] = settings[id];
    });

    return this.save();
  }

  clearSetting(sectionId: string, settingId: string) {
    delete this.settings[`${sectionId}@@${settingId}`];
    this.save();
  }

  clearSection(sectionId: string) {
    Object.keys(this.settings).forEach((key) => {
      const [section] = key.split("@@");
      if (section === sectionId) {
        delete this.settings[key];
      }
    });
    this.save();
  }

  export(section: string, config: Record<string, SettingValue>) {
    new ExportModal(this.plugin.app, this.plugin, section, config).open();
  }

  import() {
    new ImportModal(this.plugin.app, this.plugin).open();
  }
}

export class ExportModal extends Modal {
  plugin: CSSSettingsPlugin;
  section: string;
  config: Record<string, SettingValue>;

  constructor(app: App, plugin: CSSSettingsPlugin, section: string, config: Record<string, SettingValue>) {
    super(app);
    this.plugin = plugin;
    this.config = config;
    this.section = section;
  }

  onOpen() {
    let { contentEl, modalEl } = this;

    modalEl.addClass("modal-style-settings");

    new Setting(contentEl).setName(`Export settings for: ${this.section}`).then((setting) => {
      const output = JSON.stringify(this.config, null, 2);

      // Build a copy to clipboard link
      setting.controlEl.createEl(
        "a",
        {
          cls: "style-settings-copy",
          text: "Copy to clipboard",
          href: "#",
        },
        (copyButton) => {
          new TextAreaComponent(contentEl).setValue(output).then((textarea) => {
            copyButton.addEventListener("click", (e) => {
              e.preventDefault();

              // Select the textarea contents and copy them to the clipboard
              textarea.inputEl.select();
              textarea.inputEl.setSelectionRange(0, 99999);
              document.execCommand("copy");

              copyButton.addClass("success");

              setTimeout(() => {
                // If the button is still in the dom, remove the success class
                if (copyButton.parentNode) {
                  copyButton.removeClass("success");
                }
              }, 2000);
            });
          });
        }
      );

      // Build a download link
      setting.controlEl.createEl("a", {
        cls: "style-settings-download",
        text: "Download",
        attr: {
          download: "style-settings.json",
          href: `data:application/json;charset=utf-8,${encodeURIComponent(output)}`,
        },
      });
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

export class ImportModal extends Modal {
  plugin: CSSSettingsPlugin;

  constructor(app: App, plugin: CSSSettingsPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    let { contentEl, modalEl } = this;

    modalEl.addClass("modal-style-settings");

    new Setting(contentEl)
      .setName("Import style setting")
      .setDesc("Import an entire or partial configuration. Warning: this may override existing settings");

    new Setting(contentEl).then((setting) => {
      // Build an error message container
      const errorSpan = createSpan({
        cls: "style-settings-import-error",
        text: "Error importing config",
      });

      setting.nameEl.appendChild(errorSpan);

      // Attempt to parse the imported data and close if successful
      const importAndClose = async (str: string) => {
        if (str) {
          try {
            const importedSettings = JSON.parse(str) as Record<string, SettingValue>;

            await this.plugin.settingsManager.setSettings(importedSettings);

            this.plugin.settingsTab.display();
            this.close();
          } catch (e) {
            errorSpan.addClass("active");
            errorSpan.setText(`Error importing style settings: ${e}`);
          }
        } else {
          errorSpan.addClass("active");
          errorSpan.setText(`Error importing style settings: config is empty`);
        }
      };

      // Build a file input
      setting.controlEl.createEl(
        "input",
        {
          cls: "style-settings-import-input",
          attr: {
            id: "style-settings-import-input",
            name: "style-settings-import-input",
            type: "file",
            accept: ".json",
          },
        },
        (importInput) => {
          // Set up a FileReader so we can parse the file contents
          importInput.addEventListener("change", (e) => {
            const reader = new FileReader();

            reader.onload = async (e: ProgressEvent<FileReader>) => {
              await importAndClose(e.target.result.toString().trim());
            };

            reader.readAsText((e.target as HTMLInputElement).files[0]);
          });
        }
      );

      // Build a label we will style as a link
      setting.controlEl.createEl("label", {
        cls: "style-settings-import-label",
        text: "Import from file",
        attr: {
          for: "style-settings-import-input",
        },
      });

      new TextAreaComponent(contentEl).setPlaceholder("Paste config here...").then((ta) => {
        new ButtonComponent(contentEl).setButtonText("Save").onClick(async () => {
          await importAndClose(ta.getValue().trim());
        });
      });
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
