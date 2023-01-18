import {AbstractSettingComponent} from "./AbstractSettingComponent";
import {CSSSetting} from "../../settingHandlers";
import {CSSSettingsManager} from "../../SettingsManager";
import {HeadingSettingComponent} from "./HeadingSettingComponent";
import {ClassToggleSettingComponent} from "./ClassToggleSettingComponent";
import {ClassMultiToggleSettingComponent} from "./ClassMultiToggleSettingComponent";
import {VariableTextSettingComponent} from "./VariableTextSettingComponent";
import {VariableNumberSettingComponent} from "./VariableNumberSettingComponent";
import {VariableNumberSliderSettingComponent} from "./VariableNumberSliderSettingComponent";
import {VariableSelectSettingComponent} from "./VariableSelectSettingComponent";
import {VariableColorSettingComponent} from "./VariableColorSettingComponent";
import {VariableThemedColorSettingComponent} from "./VariableThemedColorSettingComponent";

export const SettingType = {
	HEADING: "heading",
	CLASS_TOGGLE: "class-toggle",
	CLASS_SELECT: "class-select",
	VARIABLE_TEXT: "variable-text",
	VARIABLE_NUMBER: "variable-number",
	VARIABLE_NUMBER_SLIDER: "variable-number-slider",
	VARIABLE_SELECT: "variable-select",
	VARIABLE_COLOR: "variable-color",
	VARIABLE_THEMED_COLOR: "variable-themed-color",
	COLOR_GRADIENT: "color-gradient",
} as const;
export type SettingType = typeof SettingType[keyof typeof SettingType];

export class SettingComponentFactory {
	static createSettingComponent(sectionId: string, sectionName: string, setting: CSSSetting, settingsManager: CSSSettingsManager, isView: boolean): AbstractSettingComponent | undefined {
		if (setting.type === SettingType.HEADING) {
			return new HeadingSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.CLASS_TOGGLE) {
			return new ClassToggleSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.CLASS_SELECT) {
			return new ClassMultiToggleSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.VARIABLE_TEXT) {
			return new VariableTextSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.VARIABLE_NUMBER) {
			return new VariableNumberSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.VARIABLE_NUMBER_SLIDER) {
			return new VariableNumberSliderSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.VARIABLE_SELECT) {
			return new VariableSelectSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.VARIABLE_COLOR) {
			return new VariableColorSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else if (setting.type === SettingType.VARIABLE_THEMED_COLOR) {
			return new VariableThemedColorSettingComponent(sectionId, sectionName, setting, settingsManager, isView);
		} else {
			return undefined;
		}
	}
}