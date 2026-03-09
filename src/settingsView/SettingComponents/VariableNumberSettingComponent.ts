import { resetTooltip, VariableNumber } from '../../SettingHandlers';
import { createDescription, getDescription, getTitle } from '../../Utils';
import { t } from '../../lang/helpers';
import { AbstractSettingComponent } from './AbstractSettingComponent';
import { debounce, Setting, TextComponent } from 'obsidian';

export class VariableNumberSettingComponent extends AbstractSettingComponent {
	settingEl: Setting;
	textComponent: TextComponent;
	setting: VariableNumber;

	render(): void {
		if (!this.containerEl) return;
		const title = getTitle(this.setting);
		const description = getDescription(this.setting);

		if (typeof this.setting.default !== 'number') {
			return console.error(
				`${t('Error:')} ${title} ${t('missing default value')}`
			);
		}

		this.settingEl = new Setting(this.containerEl);
		this.settingEl.setName(title);
		this.settingEl.setDesc(
			createDescription(description, this.setting.default.toString(10))
		);

		this.settingEl.addText((text) => {
			const value = this.settingsManager.getSetting(
				this.sectionId,
				this.setting.id
			);

			const onChange = debounce(
				(value: string) => {
					const trimmedValue = value.trim(); // remove white space

					const numericValue = parseFloat(trimmedValue); // Use parsefoat to handle integers and decimals

					// CRUCIAL PART: Only save numbers by validating input before saving. Without this, users are able to input
					// and save non-numeric values for CSS variables which only accept numbers as values. 
					// This causes the associated settings to permanently break, and is irreversible, except for resetting all settings!
					if (!isNaN(numericValue) && isFinite(numericValue)) {
						this.settingsManager.setSetting(
							this.sectionId,
							this.setting.id,
							numericValue
						);
					} else {
						console.warn(`Style Settings: Invalid number input ignored for ${this.setting.id}: ${value}`);
						const lastValidValue = this.settingsManager.getSetting(this.sectionId, this.setting.id);
						text.setValue(lastValidValue !== undefined ? lastValidValue.toString() : this.setting.default.toString());
					}
				},
				250,
				true
			);

			text.setValue(
				value !== undefined ? value.toString() : this.setting.default.toString()
			);

			text.onChange(onChange);

			this.textComponent = text;
		});

		this.settingEl.addExtraButton((b) => {
			b.setIcon('reset');
			b.onClick(() => {
				this.textComponent.setValue(this.setting.default.toString());
				this.settingsManager.clearSetting(this.sectionId, this.setting.id);
			});
			b.setTooltip(resetTooltip);
		});

		this.settingEl.settingEl.dataset.id = this.setting.id;
	}

	destroy(): void {
		this.settingEl?.settingEl.remove();
	}


}