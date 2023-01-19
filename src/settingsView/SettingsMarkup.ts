import {App, ButtonComponent, Setting, TextComponent} from "obsidian";
import {buildSettingComponentTree, CSSSetting, Meta, ParsedCSSSettings} from "../SettingHandlers";
import CSSSettingsPlugin from "../main";
import {ErrorList, getTitle} from "../Utils";
import {HeadingSettingComponent} from "./SettingComponents/HeadingSettingComponent";
import * as fuzzysort from "fuzzysort";

export class SettingsMarkup {
	app: App;
	plugin: CSSSettingsPlugin;
	settingsComponentTrees: HeadingSettingComponent[] = [];
	filterString: string = "";
	settings: ParsedCSSSettings[] = [];
	errorList: ErrorList = [];
	containerEl: HTMLElement;
	settingsContainerEl: HTMLElement;
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
		for (const settingsComponentTree of this.settingsComponentTrees) {
			settingsComponentTree.destroy();
		}
		this.settingsContainerEl?.empty();
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

			const searchComponent = new TextComponent(setting.nameEl);
			searchComponent.setValue(this.filterString);
			searchComponent.onChange((value: string) => {
				this.filterString = value;
			});

			const searchButton = new ButtonComponent(setting.nameEl);
			searchButton.setButtonText("Search");
			searchButton.onClick(() => {
				this.filter();
			});

			const clearFilterButton = new ButtonComponent(setting.nameEl);
			clearFilterButton.setButtonText("Clear");
			clearFilterButton.onClick(() => {
				this.clearFilter();
			});
		});

		console.log(this.settings);

		this.settingsContainerEl = containerEl.createDiv();

		this.settingsComponentTrees = [];

		for (const s of settings) {
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

			const settingsComponentTree = buildSettingComponentTree({
				isView: this.isView,
				sectionId: s.id,
				sectionName: s.name,
				settings: options,
				settingsManager: plugin.settingsManager,
			});

			settingsComponentTree.render(this.settingsContainerEl);

			console.log(settingsComponentTree);

			this.settingsComponentTrees.push(settingsComponentTree);
		}
	}

	filter() {
		this.cleanup();

		for (const settingsComponentTree of this.settingsComponentTrees) {
			settingsComponentTree.filter((setting: Meta) => this.filterFunction(setting));
			settingsComponentTree.render(this.settingsContainerEl);
		}
	}

	clearFilter() {
		this.cleanup();

		for (const settingsComponentTree of this.settingsComponentTrees) {
			settingsComponentTree.clearFilter();
			settingsComponentTree.render(this.settingsContainerEl);
		}
	}

	filterFunction(setting: Meta): boolean {
		if (!this.filterString) {
			return true;
		}
		return fuzzysort.single(this.filterString, getTitle(setting))?.score > -10000;
	}
}