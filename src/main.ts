import { App, Plugin, PluginSettingTab } from "obsidian";
import { CSSSettingsManager } from "./SettingsManager";
import {
  CleanupFunction,
  createHeading,
  createSetting,
  ParsedCSSSettings,
} from "./settingHandlers";
import { parse } from "yaml";

import "@simonwep/pickr/dist/themes/nano.min.css";
import "./pickerOverrides.css";

const settingRegExp = /^\/\*\s*@settings[\r\n]+?([\s\S]+?)\*\//;

export default class CSSSettingsPlugin extends Plugin {
  settingsManager: CSSSettingsManager;
  settingsTab: CSSSettingsTab;

  async onload() {
    this.settingsManager = new CSSSettingsManager(this);

    await this.settingsManager.load();

    this.settingsTab = new CSSSettingsTab(this.app, this);

    this.addSettingTab(this.settingsTab);

    this.app.workspace.on("css-change", () => {
      const styleSheets = document.styleSheets;
      const settingsList: ParsedCSSSettings[] = [];

      for (let i = 0, len = styleSheets.length; i < len; i++) {
        const sheet = styleSheets.item(i);
        const text = sheet.ownerNode.textContent.trim();
        const match = text.match(settingRegExp);

        if (match && match.length) {
          try {
            const str = match[1].trim();
            const settings = parse(str);

            if (settings.name && settings.id && settings.settings) {
              settingsList.push(settings as ParsedCSSSettings);
            }
          } catch (e) {
            console.error('Error parsing style settings: ', e);
          }
        }
      }

      this.settingsTab.generate(settingsList);
    });

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

  constructor(app: App, plugin: CSSSettingsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {}

  cleanup() {
    this.cleanupFns.forEach(fn => fn && fn())
  }

  generate(settings: ParsedCSSSettings[]) {
    let { containerEl, plugin } = this;

    containerEl.empty();
    this.cleanup();

    plugin.settingsManager.setConfig(settings);

    const cleanupFns: CleanupFunction[] = []

    settings.forEach((s) => {
      createHeading({
        config: {
          id: s.id,
          type: "heading",
          title: s.name,
          level: 1,
        },
        containerEl,
      });

      s.settings.forEach((setting) => {
        const cleanup = createSetting({
          containerEl,
          sectionId: s.id,
          setting,
          settingsManager: plugin.settingsManager,
        });

        if (typeof cleanup === 'function') {
          cleanupFns.push(cleanup)
        }
      });
    });

    this.cleanupFns = cleanupFns
  }
}
