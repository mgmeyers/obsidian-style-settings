import {App, Setting} from "obsidian";
import {CleanupFunction, CSSSetting, ParsedCSSSettings} from "../settingHandlers";
import CSSSettingsPlugin from "../main";
import {parseSettings} from "../settingParser";
import {ErrorList} from "../Utils";

export class SettingsMarkup {
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
		isView?: boolean,
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
		let {containerEl, errorList} = this;

		errorList.forEach((err) => {
			containerEl.createDiv({cls: "style-settings-error"}, (wrapper) => {
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
		let {containerEl} = this;

		containerEl.createDiv({cls: "style-settings-empty"}, (wrapper) => {
			wrapper.createDiv({
				cls: "style-settings-empty-name",
				text: "No style settings found",
			});
			wrapper.createDiv({cls: "style-settings-empty-desc"}).appendChild(
				createFragment((frag) => {
					frag.appendText(
						"Style settings configured by theme and plugin authors will show up here. You can also create your own configuration by creating a CSS snippet in your vault. ",
					);
					frag.createEl("a", {
						text: "Click here for details and examples.",
						href: "https://github.com/mgmeyers/obsidian-style-settings#obsidian-style-settings-plugin",
					});
				}),
			);
		});
	}

	generate(settings: ParsedCSSSettings[]) {
		let {containerEl, plugin} = this;

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
				},
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
							this.plugin.settingsManager.settings,
						);
					});
				},
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

			// const cleanup = createSettings({
			// 	containerEl,
			// 	isView: this.isView,
			// 	sectionId: s.id,
			// 	sectionName: s.name,
			// 	settings: options,
			// 	settingsManager: plugin.settingsManager,
			// });

			const tree = parseSettings({
				isView: this.isView,
				sectionId: s.id,
				sectionName: s.name,
				settings: options,
				settingsManager: plugin.settingsManager,
			});

			tree.render(containerEl);

			console.log(tree);


			const cleanup: CleanupFunction[] = [];

			if (cleanup.length) cleanupFns.push(...cleanup);
		});

		this.cleanupFns = cleanupFns;
	}
}