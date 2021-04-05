import CSSSettingsPlugin from "./main";
import {
  CSSSetting,
  ParsedCSSSettings,
  VariableColor,
  VariableThemedColor,
  VariableNumber,
  VariableNumberSlider,
  VariableSelect,
  VariableText,
  ColorFormat,
} from "./settingHandlers";
import chroma from "chroma-js";

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
  colorStr: string
): Array<{ key: string; value: string }> {
  switch (format) {
    case "hex":
      return [{ key, value: colorStr }];
    case "hsl":
      return [
        {
          key,
          value: chroma(colorStr).css("hsl"),
        },
      ];
    case "hsl-values": {
      const hsl = chroma(colorStr).hsl();
      return [
        {
          key,
          value: `${hsl[0]},${hsl[1] * 100}%,${hsl[2] * 100}%`,
        },
      ];
    }
    case "hsl-split": {
      const hsl = chroma(colorStr).hsl();
      return [
        {
          key: `${key}-h`,
          value: hsl[0].toString(),
        },
        {
          key: `${key}-s`,
          value: (hsl[1] * 100).toString() + "%",
        },
        {
          key: `${key}-l`,
          value: (hsl[2] * 100).toString() + "%",
        },
      ];
    }
    case "rgb":
      return [
        {
          key,
          value: chroma(colorStr).css(),
        },
      ];
    case "rgb-values": {
      const rgb = chroma(colorStr).rgb();
      return [
        {
          key,
          value: `${rgb[0]},${rgb[1]},${rgb[2]}`,
        },
      ];
    }
    case "rgb-split": {
      const rgb = chroma(colorStr).rgb();
      return [
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
      ];
    }
  }
}

function getCSSVariables(
  settings: CSSSettings,
  config: MappedSettings
): Array<{ key: string; value: string }> {
  const vars: Array<{ key: string; value: string }> = [];

  for (const key in settings) {
    const [sectionId, settingId, modifier] = key.split("@@");
    const section = config[sectionId];

    if (!section) continue;

    const setting = config[sectionId][settingId];

    if (!setting) continue;

    const value = settings[key];

    switch (setting.type) {
      case "variable-text":
      case "variable-number":
      case "variable-number-slider":
      case "variable-select":
        vars.push({
          key: setting.id,
          value:
            value !== undefined
              ? value.toString()
              : (setting as
                  | VariableText
                  | VariableNumber
                  | VariableNumberSlider
                  | VariableSelect).default.toString(),
        });
        continue;
      case "variable-color": {
        const color =
          value !== undefined
            ? value.toString()
            : (setting as VariableColor).default;

        vars.push(
          ...generateColorVariables(
            setting.id,
            (setting as VariableColor).format,
            color
          )
        );

        continue;
      }
      case "variable-themed-color": {
        const color =
          value !== undefined
            ? value.toString()
            : (setting as VariableThemedColor)[
                modifier === "light" ? "default-light" : "default-dark"
              ];

        vars.push(
          ...generateColorVariables(
            `${setting.id}-${modifier}`,
            (setting as VariableColor).format,
            color
          )
        );
      }
    }
  }

  return vars;
}

export class CSSSettingsManager {
  settings: CSSSettings;
  plugin: CSSSettingsPlugin;
  styleTag: HTMLStyleElement;
  config: MappedSettings = {};

  constructor(plugin: CSSSettingsPlugin) {
    this.plugin = plugin;
    this.settings = {};
    this.styleTag = document.createElement("style");
    this.styleTag.id = "css-settings-manager";

    document.getElementsByTagName("head")[0].appendChild(this.styleTag);
  }

  cleanup() {
    this.styleTag.remove();
  }

  async save() {
    await this.plugin.saveData(this.settings);
    this.setCSSVariables();
  }

  async load() {
    this.settings = Object.assign({}, await this.plugin.loadData());
  }

  setCSSVariables() {
    const vars = getCSSVariables(this.settings, this.config);

    this.styleTag.innerText = `
      body.css-settings-manager {
        ${vars.reduce((combined, current) => {
          return combined + `--${current.key}: ${current.value}; `;
        }, "")}
      }
    `
      .trim()
      .replace(/[\r\n\s]+/g, " ");
  }

  setConfig(settings: ParsedCSSSettings[]) {
    this.config = {};

    settings.forEach((s) => {
      this.config[s.id] = {};
      s.settings.forEach((setting) => {
        this.config[s.id][setting.id] = setting;
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

  setSetting(sectionId: string, settingId: string, value: SettingValue) {
    this.settings[`${sectionId}@@${settingId}`] = value;
    this.save();
  }

  clearSetting(sectionId: string, settingId: string) {
    delete this.settings[`${sectionId}@@${settingId}`];
    this.save();
  }
}
