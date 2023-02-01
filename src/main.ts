import { Plugin } from 'obsidian';
import { CSSSettingsManager } from './SettingsManager';
import { ParsedCSSSettings } from './SettingHandlers';
import yaml from 'js-yaml';
import detectIndent from 'detect-indent';

import '@simonwep/pickr/dist/themes/nano.min.css';
import './css/pickerOverrides.css';
import './css/settings.css';
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

export default class CSSSettingsPlugin extends Plugin {
	settingsManager: CSSSettingsManager;
	settingsTab: CSSSettingsTab;
	settingsList: ParsedCSSSettings[] = [];
	errorList: ErrorList = [];
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
			this.app.workspace.on('css-change', () => {
				this.parseCSS();
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

		this.settingsList = [];
		this.errorList = [];

		this.debounceTimer = window.setTimeout(() => {
			const styleSheets = document.styleSheets;

			for (let i = 0, len = styleSheets.length; i < len; i++) {
				const sheet = styleSheets.item(i);
				this.parseCSSStyleSheet(sheet);
			}

			// compatability with Settings Search Plugin
			this.registerSettingsToSettingsSearch();

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

	onunload() {
		this.lightEl.remove();
		this.darkEl.remove();

		this.lightEl = null;
		this.darkEl = null;

		document.body.classList.remove('css-settings-manager');

		this.settingsManager.cleanup();
		this.settingsTab.settingsMarkup.cleanup();
		this.deactivateView();

		this.unregisterSettingsFromSettingsSearch();
	}

	deactivateView() {
		this.app.workspace.detachLeavesOfType(viewType);
	}

	async activateView() {
		this.deactivateView();
		const leaf = this.app.workspace.createLeafBySplit(
			this.app.workspace.activeLeaf,
			'vertical'
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
