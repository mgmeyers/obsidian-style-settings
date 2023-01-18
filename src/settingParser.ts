import {CSSSettingsManager} from "./SettingsManager";
import {Heading, Meta} from "./settingHandlers";
import {HeadingSettingComponent} from "./settingsView/SettingComponents/HeadingSettingComponent";

export function parseSettings(opts: {
	isView: boolean;
	sectionId: string;
	sectionName: string;
	settings: Meta[];
	settingsManager: CSSSettingsManager;
}): HeadingSettingComponent {
	const {
		isView,
		sectionId,
		settings,
		settingsManager,
		sectionName,
	} = opts;

	const root: HeadingSettingComponent = new HeadingSettingComponent(sectionId, sectionName, settings[0], settingsManager, isView);

	console.log(settings);

	let currentHeading: HeadingSettingComponent = root;

	for (let setting of settings.splice(1)) {
		if (setting.type === "heading") {
			const newHeading: Heading = setting as Heading;

			// console.log(newHeading);

			if (newHeading.level < currentHeading.setting.level) {
				while (newHeading.level < currentHeading.setting.level) {
					currentHeading = currentHeading.parent;
				}

				currentHeading = currentHeading.parent.addChild(newHeading) as HeadingSettingComponent;
			} else if (newHeading.level === currentHeading.setting.level) {
				currentHeading = currentHeading.parent.addChild(newHeading) as HeadingSettingComponent;
			} else {
				currentHeading = currentHeading.addChild(newHeading) as HeadingSettingComponent;
			}

		} else {
			currentHeading.addChild(setting);
		}
	}


	return root;
}