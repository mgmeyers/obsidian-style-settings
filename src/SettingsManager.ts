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
  AltFormatList,
} from "./settingHandlers";
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
      return [
        {
          key,
          value: `${hsl[0]},${hsl[1] * 100}%,${hsl[2] * 100}%${alpha}`,
        },
        ...alts,
      ];
    }
    case "hsl-split": {
      const hsl = parsedColor.hsl();
      const out = [
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

function getCSSVariables(
  settings: CSSSettings,
  config: MappedSettings
): [VariableKV, VariableKV, VariableKV] {
  const vars: VariableKV = [];
  const themedLight: VariableKV = [];
  const themedDark: VariableKV = [];

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
        const format = (setting as VariableNumber | VariableNumberSlider)
          .format;
        const val =
          value !== undefined
            ? value
            : (setting as VariableNumber | VariableNumberSlider).default;
        vars.push({
          key: setting.id,
          value: `${val}${format || ""}`,
        });
        continue;
      case "variable-text":
      case "variable-select":
        vars.push({
          key: setting.id,
          value:
            value !== undefined
              ? value.toString()
              : (setting as VariableText | VariableSelect).default.toString(),
        });
        continue;
      case "variable-color": {
        const colorSetting = setting as VariableColor;
        const color =
          value !== undefined ? value.toString() : colorSetting.default;

        vars.push(
          ...generateColorVariables(
            setting.id,
            colorSetting.format,
            color,
            colorSetting.opacity,
            colorSetting["alt-format"]
          )
        );

        continue;
      }
      case "variable-themed-color": {
        const colorSetting = setting as VariableThemedColor;
        const color =
          value !== undefined
            ? value.toString()
            : colorSetting[
                modifier === "light" ? "default-light" : "default-dark"
              ];

        (modifier === "light" ? themedLight : themedDark).push(
          ...generateColorVariables(
            setting.id,
            colorSetting.format,
            color,
            colorSetting.opacity,
            colorSetting["alt-format"]
          )
        );
      }
    }
  }

  return [vars, themedLight, themedDark];
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
    Object.keys(this.config).forEach(section => {
      const config = this.config[section];

      Object.keys(config).forEach(settingId => {
        const setting = config[settingId];

        if (setting.type === 'class-toggle') {
          if (this.getSetting(section, settingId)) {
            document.body.classList.add(setting.id);
          }
        }
      })
    })
  }

  removeClasses() {
    Object.keys(this.config).forEach(section => {
      const config = this.config[section];

      Object.keys(config).forEach(settingId => {
        const setting = config[settingId];

        if (setting.type === 'class-toggle') {
          if (this.getSetting(section, settingId)) {
            document.body.classList.remove(setting.id);
          }
        }
      })
    })
  }

  setCSSVariables() {
    const [vars, themedLight, themedDark] = getCSSVariables(
      this.settings,
      this.config
    );

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

  clearSetting(
    sectionId: string,
    settingId: string
  ) {
    delete this.settings[`${sectionId}@@${settingId}`];
    this.save();
  }

  clearSection(sectionId: string) {
    Object.keys(this.settings).forEach((key) => {
      const [section] = key.split("@@");
      if (section === sectionId) {
        delete this.settings[key]
      }
    });
    this.save();
  }
}
