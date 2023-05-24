import { App, PluginSettingTab } from 'obsidian';
import { SettingsMarkup } from './SettingsMarkup';
import CSSSettingsPlugin from '../main';
import { ErrorList } from 'src/Utils';
import { ParsedCSSSettings } from 'src/SettingHandlers';

export class CSSSettingsTab extends PluginSettingTab {
	settingsMarkup: SettingsMarkup;
	plugin: CSSSettingsPlugin;
	settings: ParsedCSSSettings[];
	errorList: ErrorList;

	constructor(app: App, plugin: CSSSettingsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	setSettings(settings: ParsedCSSSettings[], errorList: ErrorList) {
		this.settings = settings;
		this.errorList = errorList;
		if (this.settingsMarkup) {
			this.settingsMarkup.setSettings(settings, errorList);
		}
	}

	display(): void {
		this.settingsMarkup = this.plugin.addChild(
			new SettingsMarkup(this.app, this.plugin, this.containerEl)
		);
		if (this.settings) {
			this.settingsMarkup.setSettings(this.settings, this.errorList);
		}
	}

	hide(): void {
		this.plugin.removeChild(this.settingsMarkup);
		this.settingsMarkup = null;
	}
}
