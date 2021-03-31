import CSSSettingsPlugin from "./main";
import {
  CSSSetting,
  ParsedCSSSettings,
  VariableColor,
  VariableNumber,
  VariableNumberSlider,
  VariableSelect,
  VariableText,
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

function getCSSVariables(
  settings: CSSSettings,
  config: MappedSettings
): Array<{ key: string; value: string }> {
  const vars: Array<{ key: string; value: string }> = [];

  for (const key in settings) {
    const [sectionId, settingId] = key.split("@@");
    const section = config[sectionId]

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
        const colorStr =
          value !== undefined
            ? value.toString()
            : (setting as VariableColor).default;

        switch ((setting as VariableColor).format) {
          case "hex":
            vars.push({ key: setting.id, value: colorStr });
            continue;
          case "hsl":
            vars.push({
              key: setting.id,
              value: chroma(colorStr).css("hsl"),
            });
            continue;
          case "hsl-values": {
            const hsl = chroma(colorStr).hsl();
            vars.push({
              key: setting.id,
              value: `${hsl[0]},${hsl[1] * 100}%,${hsl[2] * 100}%`,
            });
            continue;
          }
          case "hsl-split": {
            const hsl = chroma(colorStr).hsl();
            vars.push(
              {
                key: `${setting.id}-h`,
                value: hsl[0].toString(),
              },
              {
                key: `${setting.id}-s`,
                value: (hsl[1] * 100).toString() + '%',
              },
              {
                key: `${setting.id}-l`,
                value: (hsl[2] * 100).toString() + '%',
              }
            );
            continue;
          }
          case "rgb":
            vars.push({
              key: setting.id,
              value: chroma(colorStr).css(),
            });
            continue;
          case "rgb-values": {
            const rgb = chroma(colorStr).rgb();
            vars.push({
              key: setting.id,
              value: `${rgb[0]},${rgb[1]},${rgb[2]}`,
            });
            continue;
          }
          case "rgb-split": {
            const rgb = chroma(colorStr).rgb();
            vars.push(
              {
                key: `${setting.id}-r`,
                value: rgb[0].toString(),
              },
              {
                key: `${setting.id}-g`,
                value: rgb[1].toString(),
              },
              {
                key: `${setting.id}-b`,
                value: rgb[2].toString(),
              }
            );
            continue;
          }
        }
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
    this.styleTag.remove()
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
      const [sectionId, settingId] = key.split('@@');

      if (this.config[sectionId] && !this.config[sectionId][settingId]) {
        delete this.settings[key]
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
