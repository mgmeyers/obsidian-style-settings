import { App, Plugin, PluginSettingTab } from "obsidian";
import { CSSSettingsManager } from "./SettingsManager";
import {
  CleanupFunction,
  createSettings,
  CSSSetting,
  ParsedCSSSettings,
} from "./settingHandlers";
import yaml from "js-yaml";
import detectIndent from "detect-indent";

import "@simonwep/pickr/dist/themes/nano.min.css";
import "./pickerOverrides.css";
import "./settings.css";

const settingRegExp = /\/\*\s*@settings[\r\n]+?([\s\S]+?)\*\//g;
const nameRegExp = /^name:\s*(.+)$/m;

type ErrorList = Array<{ name: string; error: string }>;

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
        const errorList: ErrorList = [];

        for (let i = 0, len = styleSheets.length; i < len; i++) {
          const sheet = styleSheets.item(i);
          const text = sheet.ownerNode.textContent.trim();

          let match = settingRegExp.exec(text);

          if (match && match.length) {
            do {
              const nameMatch = text.match(nameRegExp);
              const name: string | undefined = nameMatch
                ? nameMatch[1]
                : undefined;

              try {
                const str = match[1].trim();

                const indent = detectIndent(str);

                const settings = yaml.load(
                  str.replace(
                    /\t/g,
                    indent.type === "space" ? indent.indent : "    "
                  ),
                  {
                    filename: name,
                  }
                ) as ParsedCSSSettings;

                if (
                  typeof settings === "object" &&
                  settings.name &&
                  settings.id &&
                  settings.settings
                ) {
                  settingsList.push(settings);
                }
              } catch (e) {
                errorList.push({ name, error: `${e}` });
              }
            } while ((match = settingRegExp.exec(text)) !== null);
          }
        }

        this.settingsTab.setSettings(settingsList, errorList);
        this.settingsManager.initClasses();
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
  errorList: ErrorList = [];

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

  setSettings(settings: ParsedCSSSettings[], errorList: ErrorList) {
    this.settings = settings;
    this.errorList = errorList;

    this.plugin.settingsManager.setConfig(settings);

    if (this.containerEl.parentNode) {
      this.generate(settings);
    }
  }

  displayErrors() {
    let { containerEl, errorList } = this;

    errorList.forEach((err) => {
      containerEl.createDiv({ cls: "style-settings-error" }, (wrapper) => {
        wrapper.createDiv({
          cls: "style-settings-error-name",
          text: `Error: ${err.name}`,
        });
        wrapper.createDiv({
          cls: "style-settings-error-desc",
          text: err.error,
        });
      });
    });
  }

  displayEmpty() {
    let { containerEl } = this;

    containerEl.createDiv({ cls: "style-settings-empty" }, (wrapper) => {
      wrapper.createDiv({
        cls: "style-settings-empty-name",
        text: "No style settings found",
      });
      wrapper.createDiv({ cls: "style-settings-empty-desc" }).appendChild(
        createFragment((frag) => {
          frag.appendText(
            "Style settings configured by theme and plugin authors will show up here. You can also create your own configuration by creating a CSS snippet in your vault. "
          );
          frag.createEl("a", {
            text: "Click here for details and examples.",
            href:
              "https://github.com/mgmeyers/obsidian-style-settings#obsidian-style-settings-plugin",
          });
        })
      );
    });
  }

  generate(settings: ParsedCSSSettings[]) {
    let { containerEl, plugin } = this;

    containerEl.empty();

    this.cleanup();
    this.displayErrors();

    if (settings.length === 0) {
      return this.displayEmpty();
    }

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
            this.generate(this.settings);
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
