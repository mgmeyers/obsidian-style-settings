import '@simonwep/pickr/dist/themes/nano.min.css';
import './css/pickerOverrides.css';
import './css/settings.css';

import { Command, Plugin } from 'obsidian';
import { CSSSettingsManager } from './SettingsManager';
import { ClassToggle, ParsedCSSSettings } from './SettingHandlers';
import yaml from 'js-yaml';
import detectIndent from 'detect-indent';

import { CSSSettingsTab } from './settingsView/CSSSettingsTab';
import { SettingsView, viewType } from './settingsView/SettingsView';
import {
	ErrorList,
	getDescription,
	getTitle,
	nameRegExp,
	settingRegExp,
	SettingsSeachResource,
} from './Utils';
import { SettingType } from './settingsView/SettingComponents/types';

export default class CSSSettingsPlugin extends Plugin {
	settingsManager: CSSSettingsManager;
	settingsTab: CSSSettingsTab;
	settingsList: ParsedCSSSettings[] = [];
	errorList: ErrorList = [];
	commandList: Command[] = [];
	lightEl: HTMLElement;
	darkEl: HTMLElement;

	async onload() {
		this.settingsManager = new CSSSettingsManager(this);

		await this.settingsManager.load();

		this.settingsTab = new CSSSettingsTab(this.app, this);

		this.addSettingTab(this.settingsTab);

		this.registerView(viewType, (leaf) => new SettingsView(this, leaf));

		this.addCommand({
			id: 'show-style-settings-leaf',
			name: 'Show style settings view',
			callback: () => {
				this.activateView();
			},
		});

		this.registerEvent(
			(this.app.workspace as any).on('css-change', (data?: { source: string }) => {
				if (data?.source !== 'style-settings') {
					this.parseCSS();
				}
			})
		);

		this.registerEvent(
			(this.app.workspace as any).on('parse-style-settings', () => {
				this.parseCSS();
			})
		);

		this.lightEl = document.body.createDiv('theme-light style-settings-ref');
		this.darkEl = document.body.createDiv('theme-dark style-settings-ref');

		document.body.classList.add('css-settings-manager');

		this.parseCSS();

		this.app.workspace.onLayoutReady(() => {
			if (this.settingsList) {
				this.app.workspace.getLeavesOfType(viewType).forEach((leaf) => {
					(leaf.view as SettingsView).setSettings(
						this.settingsList,
						this.errorList
					);
				});
			}
		});
	}

	getCSSVar(id: string) {
		const light = getComputedStyle(this.lightEl).getPropertyValue(`--${id}`);
		const dark = getComputedStyle(this.darkEl).getPropertyValue(`--${id}`);
		const current = getComputedStyle(document.body).getPropertyValue(`--${id}`);
		return { light, dark, current };
	}

	debounceTimer = 0;

	parseCSS() {
		clearTimeout(this.debounceTimer);
		this.debounceTimer = activeWindow.setTimeout(() => {
			this.settingsList = [];
			this.errorList = [];

			// remove registered theme commands (sadly undocumented API)
			for (const command of this.commandList) {
				// @ts-ignore
				this.app.commands.removeCommand(command.id);
			}

			this.commandList = [];
			this.settingsManager.removeClasses();

			const styleSheets = document.styleSheets;

			for (let i = 0, len = styleSheets.length; i < len; i++) {
				const sheet = styleSheets.item(i);
				this.parseCSSStyleSheet(sheet);
			}

			// compatability with Settings Search Plugin
			this.registerSettingsToSettingsSearch();

			this.settingsTab.setSettings(this.settingsList, this.errorList);
			this.app.workspace.getLeavesOfType(viewType).forEach((leaf) => {
				(leaf.view as SettingsView).setSettings(
					this.settingsList,
					this.errorList
				);
			});
			this.settingsManager.setConfig(this.settingsList);
			this.settingsManager.initClasses();
			this.registerSettingCommands();
		}, 100);
	}

	/**
	 * Registers the current settings to the settings search plugin.
	 * It also unregisters the old settings.
	 *
	 * @private
	 */
	private registerSettingsToSettingsSearch() {
		const onSettingsSearchLoaded = () => {
			if ((window as any).SettingsSearch) {
				const settingsSearch: any = (window as any).SettingsSearch;

				settingsSearch.removeTabResources('obsidian-style-settings');

				for (const parsedCSSSetting of this.settingsList) {
					settingsSearch.addResources(
						...parsedCSSSetting.settings.map((x) => {
							const settingsSearchResource: SettingsSeachResource = {
								tab: 'obsidian-style-settings',
								name: 'Style Settings',
								text: getTitle(x) ?? '',
								desc: getDescription(x) ?? '',
							};
							return settingsSearchResource;
						})
					);
				}
			}
		};

		// @ts-ignore TODO: expand obsidian types, so that the ts-ignore is not needed
		if (this.app.plugins.plugins['settings-search']?.loaded) {
			onSettingsSearchLoaded();
		} else {
			// @ts-ignore
			this.app.workspace.on('settings-search-loaded', () => {
				onSettingsSearchLoaded();
			});
		}
	}

	/**
	 * Remove any settings from settings search if settings search is loaded.
	 *
	 * @private
	 */
	private unregisterSettingsFromSettingsSearch() {
		// @ts-ignore TODO: expand obsidian types, so that the ts-ignore is not needed
		if (this.app.plugins.plugins['settings-search']?.loaded) {
			// @ts-ignore
			window.SettingsSearch.removeTabResources('obsidian-style-settings');
		}
	}

	/**
	 * Parses the settings from a css style sheet.
	 * Adds the parsed settings to `settingsList` and any errors to `errorList`.
	 *
	 * @param sheet the stylesheet to parse
	 * @private
	 */
	private parseCSSStyleSheet(sheet: CSSStyleSheet): void {
		const text: string = sheet.ownerNode.textContent.trim();

		let match: RegExpExecArray = settingRegExp.exec(text);

		if (match && match.length) {
			do {
				const nameMatch: RegExpMatchArray = text.match(nameRegExp);
				const name: string | undefined = nameMatch ? nameMatch[1] : undefined;

				try {
					const str = match[1].trim();
					const settings = this.parseCSSSettings(str, name);

					if (
						settings &&
						typeof settings === 'object' &&
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

	/**
	 * Parse css settings from a string.
	 *
	 * @param str the stringified settings to parse
	 * @param name the name of the file
	 * @private
	 */
	private parseCSSSettings(
		str: string,
		name: string
	): ParsedCSSSettings | undefined {
		const indent = detectIndent(str);

		const settings: ParsedCSSSettings = yaml.load(
			str.replace(/\t/g, indent.type === 'space' ? indent.indent : '    '),
			{
				filename: name,
			}
		) as ParsedCSSSettings;

		if (!settings.settings) return undefined;

		settings.settings = settings.settings.filter((setting) => setting);
		return settings;
	}

	private registerSettingCommands(): void {
		for (const section of this.settingsList) {
			for (const setting of section.settings) {
				if (
					setting.type === SettingType.CLASS_TOGGLE &&
					(setting as ClassToggle).addCommand
				) {
					this.addClassToggleCommand(section, setting as ClassToggle);
				}
			}
		}
	}

	private addClassToggleCommand(
		section: ParsedCSSSettings,
		setting: ClassToggle
	): void {
		this.commandList.push(
			this.addCommand({
				id: `style-settings-class-toggle-${section.id}-${setting.id}`,
				name: `Toggle ${setting.title}`,
				callback: () => {
					const value = !(this.settingsManager.getSetting(
						section.id,
						setting.id
					) as boolean);
					this.settingsManager.setSetting(section.id, setting.id, value);
					this.settingsTab.settingsMarkup.rerender();
					for (const leaf of this.app.workspace.getLeavesOfType(viewType)) {
						(leaf.view as SettingsView).settingsMarkup.rerender();
					}
				},
			})
		);
	}

	onunload() {
		this.lightEl.remove();
		this.darkEl.remove();

		this.lightEl = null;
		this.darkEl = null;

		document.body.classList.remove('css-settings-manager');

		this.settingsManager.cleanup();
		this.deactivateView();
		this.unregisterSettingsFromSettingsSearch();
	}

	deactivateView() {
		this.app.workspace.detachLeavesOfType(viewType);
	}

	async activateView() {
		this.deactivateView();
		const leaf = this.app.workspace.getLeaf('tab');

		await leaf.setViewState({
			type: viewType,
			active: true,
		});

		(leaf.view as SettingsView).setSettings(this.settingsList, this.errorList);
	}
}
