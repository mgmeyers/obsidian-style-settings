import {
  App,
  ItemView,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from "obsidian";
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
  settingsList: ParsedCSSSettings[] = [];
  errorList: ErrorList = [];

  async onload() {
    this.settingsManager = new CSSSettingsManager(this);

    await this.settingsManager.load();

    this.settingsTab = new CSSSettingsTab(this.app, this);

    this.addSettingTab(this.settingsTab);

    this.registerView(viewType, (leaf) => new SettingsView(this, leaf));

    this.addCommand({
      id: "show-style-settings-leaf",
      name: "Show style settings view",
      callback: () => {
        this.activateView();
      },
    });

    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.parseCSS();
      })
    );

    this.registerEvent(
      (this.app.workspace as any).on("parse-style-settings", () => {
        this.parseCSS();
      })
    );

    document.body.classList.add("css-settings-manager");

    this.parseCSS();
  }

  debounceTimer = 0;

  parseCSS() {
    clearTimeout(this.debounceTimer);

    this.settingsList = [];
    this.errorList = [];

    this.debounceTimer = window.setTimeout(() => {
      const styleSheets = document.styleSheets;

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

              if (!settings.settings) continue;

              settings.settings = settings.settings.filter(
                (setting) => setting
              );

              if (
                typeof settings === "object" &&
                settings.name &&
                settings.id &&
                settings.settings &&
                settings.settings.length
              ) {
                this.settingsList.push(settings);
              }
            } catch (e) {
              this.errorList.push({ name, error: `${e}` });
            }
          } while ((match = settingRegExp.exec(text)) !== null);
        }
      }

      this.settingsTab.settingsMarkup.setSettings(
        this.settingsList,
        this.errorList
      );
      this.app.workspace.getLeavesOfType(viewType).forEach((leaf) => {
        (leaf.view as SettingsView).settingsMarkup.setSettings(
          this.settingsList,
          this.errorList
        );
      });
      this.settingsManager.initClasses();
    }, 100);
  }

  onunload() {
    document.body.classList.remove("css-settings-manager");
    this.settingsManager.cleanup();
    this.settingsTab.settingsMarkup.cleanup();
    this.deactivateView();
  }

  deactivateView() {
    this.app.workspace.detachLeavesOfType(viewType);
  }

  async activateView() {
    this.deactivateView();
    const leaf = this.app.workspace.createLeafBySplit(
      this.app.workspace.activeLeaf,
      "vertical"
    );

    await leaf.setViewState({
      type: viewType,
    });

    (leaf.view as SettingsView).settingsMarkup.setSettings(
      this.settingsList,
      this.errorList
    );
  }
}

class SettingsMarkup {
  app: App;
  plugin: CSSSettingsPlugin;
  cleanupFns: CleanupFunction[] = [];
  settings: ParsedCSSSettings[] = [];
  errorList: ErrorList = [];
  containerEl: HTMLElement;
  isView: boolean;

  constructor(
    app: App,
    plugin: CSSSettingsPlugin,
    containerEl: HTMLElement,
    isView?: boolean
  ) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = containerEl;
    this.isView = !!isView;
  }

  display(): void {
    this.generate(this.settings);
  }

  cleanup() {
    Array.from(this.cleanupFns).forEach((fn) => {
      fn && fn();
      this.cleanupFns.remove(fn);
    });
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
            href: "https://github.com/mgmeyers/obsidian-style-settings#obsidian-style-settings-plugin",
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

    new Setting(containerEl).then((setting) => {
      // Build and import link to open the import modal
      setting.controlEl.createEl(
        "a",
        {
          cls: "style-settings-import",
          text: "Import",
          href: "#",
        },
        (el) => {
          el.addEventListener("click", (e) => {
            e.preventDefault();
            this.plugin.settingsManager.import();
          });
        }
      );

      // Build and export link to open the export modal
      setting.controlEl.createEl(
        "a",
        {
          cls: "style-settings-export",
          text: "Export",
          href: "#",
        },
        (el) => {
          el.addEventListener("click", (e) => {
            e.preventDefault();
            this.plugin.settingsManager.export(
              "All settings",
              this.plugin.settingsManager.settings
            );
          });
        }
      );
    });

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
        isView: this.isView,
        sectionId: s.id,
        sectionName: s.name,
        settings: options,
        settingsManager: plugin.settingsManager,
      });

      if (cleanup.length) cleanupFns.push(...cleanup);
    });

    this.cleanupFns = cleanupFns;
  }
}

class CSSSettingsTab extends PluginSettingTab {
  settingsMarkup: SettingsMarkup;

  constructor(app: App, plugin: CSSSettingsPlugin) {
    super(app, plugin);
    this.settingsMarkup = new SettingsMarkup(app, plugin, this.containerEl);
  }

  display(): void {
    this.settingsMarkup.display();
  }

  hide(): void {
    this.settingsMarkup.cleanup();
  }
}

const viewType = "style-settings";

class SettingsView extends ItemView {
  settingsMarkup: SettingsMarkup;
  plugin: CSSSettingsPlugin;

  constructor(plugin: CSSSettingsPlugin, leaf: WorkspaceLeaf) {
    super(leaf);
    this.plugin = plugin;
    this.settingsMarkup = new SettingsMarkup(
      plugin.app,
      plugin,
      this.contentEl,
      true
    );
  }

  getViewType() {
    return viewType;
  }

  getIcon() {
    return "gear";
  }

  getDisplayText() {
    return "Style Settings";
  }

  async onOpen() {
    return this.settingsMarkup.display();
  }

  async onClose() {
    return this.settingsMarkup.cleanup();
  }
}
