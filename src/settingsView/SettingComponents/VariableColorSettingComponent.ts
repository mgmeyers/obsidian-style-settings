import { AbstractSettingComponent } from './AbstractSettingComponent';
import { Setting } from 'obsidian';
import { resetTooltip, VariableColor } from '../../SettingHandlers';
import {
	createDescription,
	getDescription,
	getPickrSettings,
	getTitle,
	isValidDefaultColor,
	onPickrCancel,
} from '../../Utils';
import { t } from '../../lang/helpers';
import Pickr from '@simonwep/pickr';

export class VariableColorSettingComponent extends AbstractSettingComponent {
	settingEl: Setting;
	setting: VariableColor;
	pickr: Pickr;

	render(): void {
		const title = getTitle(this.setting);
		const description = getDescription(this.setting);

		if (
			typeof this.setting.default !== 'string' ||
			!isValidDefaultColor(this.setting.default)
		) {
			this.setting.default = this.settingsManager.plugin
				.getCSSVar(this.setting.id)
				.current?.trim();
		}

		if (
			typeof this.setting.default !== 'string' ||
			!isValidDefaultColor(this.setting.default)
		) {
			return console.error(
				`${t('Error:')} ${title} ${t(
					'missing default value, or value is not in a valid color format'
				)}`
			);
		}

		const value = this.settingsManager.getSetting(
			this.sectionId,
			this.setting.id
		);
		const swatches: string[] = [];

		if (this.setting.default) {
			swatches.push(this.setting.default);
		}

		if (value !== undefined) {
			swatches.push(value as string);
		}

		this.settingEl = new Setting(this.containerEl);
		this.settingEl.setName(title);
		this.settingEl.setDesc(
			createDescription(description, this.setting.default)
		);

		// fix, so that the color is correctly shown before the color picker has been opened
		const defaultColor =
			value !== undefined ? (value as string) : this.setting.default;
		this.containerEl.style.setProperty('--pcr-color', defaultColor);

		this.pickr = Pickr.create(
			getPickrSettings({
				isView: this.isView,
				el: this.settingEl.controlEl.createDiv({ cls: 'picker' }),
				containerEl: this.containerEl,
				swatches: swatches,
				opacity: this.setting.opacity,
				defaultColor: defaultColor,
			})
		);

		this.pickr.on('save', (color: Pickr.HSVaColor, instance: Pickr) => {
			if (!color) return;

			this.settingsManager.setSetting(
				this.sectionId,
				this.setting.id,
				color.toHEXA().toString()
			);

			instance.hide();
			instance.addSwatch(color.toHEXA().toString());
		});

		this.pickr.on('show', () => {
			const { result } = (this.pickr.getRoot() as any).interaction;
			activeWindow.requestAnimationFrame(() => {
				activeWindow.requestAnimationFrame(() => result.select());
			});
		});

		this.pickr.on('cancel', onPickrCancel);

		this.settingEl.addExtraButton((b) => {
			b.setIcon('reset');
			b.onClick(() => {
				this.pickr.setColor(this.setting.default);
				this.settingsManager.clearSetting(this.sectionId, this.setting.id);
			});
			b.setTooltip(resetTooltip);
		});

		this.settingEl.settingEl.dataset.id = this.setting.id;
	}

	destroy(): void {
		this.pickr?.destroyAndRemove();
		this.pickr = undefined;
		this.settingEl?.settingEl.remove();
	}
}
