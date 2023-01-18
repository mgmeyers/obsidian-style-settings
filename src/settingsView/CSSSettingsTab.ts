import {App, PluginSettingTab} from "obsidian";
import {SettingsMarkup} from "./SettingsMarkup";
import CSSSettingsPlugin from "../main";

export class CSSSettingsTab extends PluginSettingTab {
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