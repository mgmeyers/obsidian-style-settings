import { App, Plugin, PluginSettingTab } from "obsidian";
import { CSSSettingsManager } from "./SettingsManager";
import {
  CleanupFunction,
  createHeading,
  createSettings,
  CSSSetting,
  ParsedCSSSettings,
} from "./settingHandlers";
import { parse } from "yaml";

import "@simonwep/pickr/dist/themes/nano.min.css";
import "./pickerOverrides.css";
import "./settings.css";

const settingRegExp = /\/\*\s*@settings[\r\n]+?([\s\S]+?)\*\//g;

export default class CSSSettingsPlugin extends Plugin {
  settingsManager: CSSSettingsManager;
  settingsTab: CSSSettingsTab;

  async onload() {
    this.settingsManager = new CSSSettingsManager(this);

    await this.settingsManager.load();

    this.settingsTab = new CSSSettingsTab(this.app, this);

    this.addSettingTab(this.settingsTab);

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        const styleSheets = document.styleSheets;
        const settingsList: ParsedCSSSettings[] = [];

        for (let i = 0, len = styleSheets.length; i < len; i++) {
          const sheet = styleSheets.item(i);
          const text = sheet.ownerNode.textContent.trim();
          let match = settingRegExp.exec(text);

          if (match && match.length) {
            try {
              do {
                const str = match[1].trim().replace(/\t/g, "  ");
                const settings = parse(str);

                if (settings.name && settings.id && settings.settings) {
                  settingsList.push(settings as ParsedCSSSettings);
                }
              } while ((match = settingRegExp.exec(text)) !== null);
            } catch (e) {
              console.error("Error parsing style settings: ", e);
            }
          }
        }

        this.settingsTab.setSettings(settingsList);
      })
    );

    this.app.workspace.trigger("css-change");

    document.body.classList.add("css-settings-manager");
  }

  onunload() {
    this.settingsManager.cleanup();
    this.settingsTab.cleanup();
    document.body.classList.remove("css-settings-manager");
  }
}

class CSSSettingsTab extends PluginSettingTab {
  plugin: CSSSettingsPlugin;
  cleanupFns: CleanupFunction[] = [];
  settings: ParsedCSSSettings[] = [];

  constructor(app: App, plugin: CSSSettingsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.generate(this.settings);
  }

  cleanup() {
    this.cleanupFns.forEach((fn) => fn && fn());
  }

  setSettings(settings: ParsedCSSSettings[]) {
    this.settings = settings;
    this.plugin.settingsManager.setConfig(settings);

    if (this.containerEl.parentNode) {
      this.generate(settings);
    }
  }

  generate(settings: ParsedCSSSettings[]) {
    let { containerEl, plugin } = this;

    containerEl.empty();
    this.cleanup();

    const cleanupFns: CleanupFunction[] = [];

    settings.forEach((s) => {
      const options: CSSSetting[] = [
        {
          id: s.id,
          type: "heading",
          title: s.name,
          level: 0,
          collapsed: true,
          resetFn: () => {
            plugin.settingsManager.clearSection(s.id);
            this.generate(this.settings)
          },
        },
        ...s.settings,
      ];

      const cleanup = createSettings({
        containerEl,
        sectionId: s.id,
        settings: options,
        settingsManager: plugin.settingsManager,
      });

      if (cleanup.length) cleanupFns.push(...cleanup);
    });

    this.cleanupFns = cleanupFns;
  }
}
