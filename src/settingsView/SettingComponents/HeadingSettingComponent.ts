import { AbstractSettingComponent } from './AbstractSettingComponent';
import { setIcon, Setting } from 'obsidian';
import { getDescription, getTitle } from '../../Utils';
import { CSSSetting, Heading, Meta } from '../../SettingHandlers';
import { SettingType } from './types';
import { CSSSettingsManager } from 'src/SettingsManager';
import { ClassToggleSettingComponent } from './ClassToggleSettingComponent';
import { ClassMultiToggleSettingComponent } from './ClassMultiToggleSettingComponent';
import { VariableTextSettingComponent } from './VariableTextSettingComponent';
import { VariableNumberSettingComponent } from './VariableNumberSettingComponent';
import { VariableNumberSliderSettingComponent } from './VariableNumberSliderSettingComponent';
import { VariableSelectSettingComponent } from './VariableSelectSettingComponent';
import { VariableColorSettingComponent } from './VariableColorSettingComponent';
import { VariableThemedColorSettingComponent } from './VariableThemedColorSettingComponent';
import { InfoTextSettingComponent } from './InfoTextSettingComponent';

export function createSettingComponent(
	sectionId: string,
	sectionName: string,
	setting: CSSSetting,
	settingsManager: CSSSettingsManager,
	isView: boolean
): AbstractSettingComponent | undefined {
	if (setting.type === SettingType.HEADING) {
		return new HeadingSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.INFO_TEXT) {
		return new InfoTextSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.CLASS_TOGGLE) {
		return new ClassToggleSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.CLASS_SELECT) {
		return new ClassMultiToggleSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.VARIABLE_TEXT) {
		return new VariableTextSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.VARIABLE_NUMBER) {
		return new VariableNumberSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.VARIABLE_NUMBER_SLIDER) {
		return new VariableNumberSliderSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.VARIABLE_SELECT) {
		return new VariableSelectSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.VARIABLE_COLOR) {
		return new VariableColorSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else if (setting.type === SettingType.VARIABLE_THEMED_COLOR) {
		return new VariableThemedColorSettingComponent(
			sectionId,
			sectionName,
			setting,
			settingsManager,
			isView
		);
	} else {
		return undefined;
	}
}

export class HeadingSettingComponent extends AbstractSettingComponent {
	setting: Heading;
	childEl: HTMLElement | undefined;
	settingEl: Setting;
	parent: HeadingSettingComponent;
	children: AbstractSettingComponent[];
	filteredChildren: AbstractSettingComponent[];
	filterMode: boolean;
	filterResultCount: number;

	onInit() {
		this.children = [];
		this.filteredChildren = [];
		this.filterMode = false;
		this.filterResultCount = 0;
	}

	render(containerEl: HTMLElement): void {
		const title = getTitle(this.setting);
		const description = getDescription(this.setting);

		this.settingEl = new Setting(containerEl);
		this.settingEl.setHeading();
		this.settingEl.setClass('style-settings-heading');
		this.settingEl.setName(title);
		this.settingEl.setDesc(description ?? '');

		this.settingEl.settingEl.dataset.level = this.setting.level.toString();
		this.settingEl.settingEl.dataset.id = this.setting.id;

		const iconContainer = createSpan({
			cls: 'style-settings-collapse-indicator',
		});

		setIcon(iconContainer, 'right-triangle');

		this.settingEl.nameEl.prepend(iconContainer);

		if (this.filterMode) {
			this.settingEl.nameEl.createSpan({
				cls: 'style-settings-filter-result-count',
				text: `${this.filterResultCount} Results`,
			});
		}

		this.settingEl.settingEl.addEventListener('click', () => {
			this.toggleVisible();
		});

		this.addResetButton();

		this.addExportButton();

		this.childEl = containerEl.createDiv({ cls: 'style-settings-container' });

		this.setCollapsed(this.setting.collapsed);
	}

	destroy(): void {
		if (!this.setting.collapsed) {
			this.destroyChildren();
		}
		this.settingEl?.settingEl.remove();
	}

	filter(filterString: string): number {
		this.filteredChildren = [];
		this.filterResultCount = 0;

		for (const child of this.children) {
			if (child.setting.type === SettingType.HEADING) {
				const childResultCount = (child as HeadingSettingComponent).filter(
					filterString
				);
				if (childResultCount > 0) {
					this.filterResultCount += childResultCount;
					this.filteredChildren.push(child);
				}
			} else {
				if (child.decisiveMatch(filterString)) {
					this.filteredChildren.push(child);
					this.filterResultCount += 1;
				}
			}
		}

		this.filterMode = true;
		this.setting.collapsed = false;

		return this.filterResultCount;
	}

	clearFilter(): void {
		this.filteredChildren = [];

		for (const child of this.children) {
			if (child.setting.type === SettingType.HEADING) {
				(child as HeadingSettingComponent).clearFilter();
			}
		}

		this.filterMode = false;
		this.setting.collapsed = true;
	}

	private renderChildren() {
		this.destroyChildren();
		if (this.filterMode) {
			for (const child of this.filteredChildren) {
				child.render(this.childEl);
			}
		} else {
			for (const child of this.children) {
				child.render(this.childEl);
			}
		}
	}

	private destroyChildren() {
		for (const child of this.children) {
			child.destroy();
		}
		this.childEl?.empty();
	}

	private toggleVisible() {
		this.setCollapsed(!this.setting.collapsed);
	}

	private setCollapsed(collapsed: boolean) {
		this.setting.collapsed = collapsed;

		this.settingEl.settingEl.toggleClass('is-collapsed', collapsed);

		if (collapsed) {
			this.destroyChildren();
		} else {
			this.renderChildren();
		}
	}

	private addResetButton() {
		if (this.setting.resetFn) {
			this.settingEl.addExtraButton((b) => {
				b.setIcon('reset')
					.setTooltip('Reset all settings to default')
					.onClick(this.setting.resetFn);
			});
		}
	}

	private addExportButton() {
		this.settingEl.addExtraButton((b) => {
			b.setIcon('install');
			b.setTooltip('Export settings');
			b.extraSettingsEl.onClickEvent((e) => {
				e.stopPropagation();
				let title = getTitle(this.setting);
				title =
					this.sectionName === title ? title : `${this.sectionName} > ${title}`;
				this.settingsManager.export(
					title,
					this.settingsManager.getSettings(
						this.sectionId,
						this.getAllChildrenIds()
					)
				);
			});
		});
	}

	addChild(child: CSSSetting): AbstractSettingComponent {
		const newSettingComponent = createSettingComponent(
			this.sectionId,
			this.sectionName,
			child,
			this.settingsManager,
			this.isView
		);
		if (!newSettingComponent) {
			return undefined;
		}

		if (newSettingComponent.setting.type === SettingType.HEADING) {
			(newSettingComponent as HeadingSettingComponent).parent = this;
		}
		this.children.push(newSettingComponent);
		return newSettingComponent;
	}

	getAllChildrenIds(): string[] {
		const children: string[] = [];
		for (const child of this.children) {
			children.push(child.setting.id);
			if (child.setting.type === 'heading') {
				children.push(
					...(child as HeadingSettingComponent).getAllChildrenIds()
				);
			}
		}
		return children;
	}
}

export function buildSettingComponentTree(opts: {
	isView: boolean;
	sectionId: string;
	sectionName: string;
	settings: Meta[];
	settingsManager: CSSSettingsManager;
}): HeadingSettingComponent {
	const { isView, sectionId, settings, settingsManager, sectionName } = opts;

	const root: HeadingSettingComponent = new HeadingSettingComponent(
		sectionId,
		sectionName,
		settings[0],
		settingsManager,
		isView
	);

	let currentHeading: HeadingSettingComponent = root;

	for (const setting of settings.splice(1)) {
		if (setting.type === 'heading') {
			const newHeading: Heading = setting as Heading;

			if (newHeading.level < currentHeading.setting.level) {
				while (newHeading.level < currentHeading.setting.level) {
					currentHeading = currentHeading.parent;
				}

				currentHeading = currentHeading.parent.addChild(
					newHeading
				) as HeadingSettingComponent;
			} else if (newHeading.level === currentHeading.setting.level) {
				currentHeading = currentHeading.parent.addChild(
					newHeading
				) as HeadingSettingComponent;
			} else {
				currentHeading = currentHeading.addChild(
					newHeading
				) as HeadingSettingComponent;
			}
		} else {
			currentHeading.addChild(setting);
		}
	}

	return root;
}
