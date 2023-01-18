import {CSSSettingsManager} from "../../SettingsManager";
import {CSSSetting} from "../../settingHandlers";

export abstract class AbstractSettingComponent {
	sectionId: string;
	sectionName: string;
	setting: CSSSetting;
	settingsManager: CSSSettingsManager;
	isView: boolean;


	constructor(sectionId: string, sectionName: string, setting: CSSSetting, settingsManager: CSSSettingsManager, isView: boolean) {
		this.sectionId = sectionId;
		this.sectionName = sectionName;
		this.setting = setting;
		this.settingsManager = settingsManager;
		this.isView = isView;

		this.onInit();
	}

	onInit(): void {

	}

	abstract render(containerEl: HTMLElement): void;

	abstract destroy(): void;
}