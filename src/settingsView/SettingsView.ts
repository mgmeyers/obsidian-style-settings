import { ItemView, WorkspaceLeaf } from 'obsidian';
import { SettingsMarkup } from './SettingsMarkup';
import CSSSettingsPlugin from '../main';

export const viewType = 'style-settings';

export class SettingsView extends ItemView {
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
		return 'gear';
	}

	getDisplayText() {
		return 'Style Settings';
	}

	async onOpen() {
		return this.settingsMarkup.display();
	}

	async onClose() {
		return this.settingsMarkup.cleanup();
	}
}
