import { CSSSettingsManager } from '../../SettingsManager';
import { CSSSetting } from '../../SettingHandlers';
import { getDescription, getTitle } from '../../Utils';
import fuzzysort from 'fuzzysort';

export abstract class AbstractSettingComponent {
	sectionId: string;
	sectionName: string;
	setting: CSSSetting;
	settingsManager: CSSSettingsManager;
	isView: boolean;

	constructor(
		sectionId: string,
		sectionName: string,
		setting: CSSSetting,
		settingsManager: CSSSettingsManager,
		isView: boolean
	) {
		this.sectionId = sectionId;
		this.sectionName = sectionName;
		this.setting = setting;
		this.settingsManager = settingsManager;
		this.isView = isView;

		this.onInit();
	}

	onInit(): void {}

	/**
	 * Matches the Component against `str`. A perfect match returns 0, no match returns negative infinity.
	 *
	 * @param str the string to match this Component against.
	 */
	match(str: string): number {
		if (!str) {
			return Number.NEGATIVE_INFINITY;
		}

		return Math.max(
			fuzzysort.single(str, getTitle(this.setting))?.score ??
				Number.NEGATIVE_INFINITY,
			fuzzysort.single(str, getDescription(this.setting))?.score ??
				Number.NEGATIVE_INFINITY
		);
	}

	/**
	 * Matches the Component against `str`. A match returns true, no match  or a bad match returns false.
	 *
	 * @param str the string to match this Component against.
	 */
	decisiveMatch(str: string): boolean {
		return this.match(str) > -100000;
	}

	/**
	 * Renders the Component and all it's children into `containerEl`.
	 *
	 * @param containerEl
	 */
	abstract render(containerEl: HTMLElement): void;

	/**
	 * Destroys the component and all it's children.
	 */
	abstract destroy(): void;
}
