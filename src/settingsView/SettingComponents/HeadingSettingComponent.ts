import {AbstractSettingComponent} from "./AbstractSettingComponent";
import {setIcon, Setting} from "obsidian";
import {getDescription, getTitle} from "../../Utils";
import {CSSSetting, Heading} from "../../settingHandlers";
import {SettingComponentFactory, SettingType} from "./SettingComponentFactory";

export class HeadingSettingComponent extends AbstractSettingComponent {
	setting: Heading;
	childEl: HTMLElement | undefined;
	settingEl: Setting;
	parent: HeadingSettingComponent;
	children: AbstractSettingComponent[];

	onInit() {
		this.children = [];
	}

	render(containerEl: HTMLElement): void {
		const title = getTitle(this.setting);
		const description = getDescription(this.setting);

		this.settingEl = new Setting(containerEl);
		this.settingEl.setHeading();
		this.settingEl.setClass("style-settings-heading");
		this.settingEl.setName(title);
		this.settingEl.setDesc(description ?? "");

		this.settingEl.settingEl.dataset.level = this.setting.level.toString();
		this.settingEl.settingEl.dataset.id = this.setting.id;

		const iconContainer = createSpan({
			cls: "style-settings-collapse-indicator",
		});

		setIcon(iconContainer, "right-triangle");

		this.settingEl.nameEl.prepend(iconContainer);

		this.settingEl.settingEl.addEventListener("click", (e) => {
			this.toggleVisible();
		});

		this.addResetButton();

		this.addExportButton();

		this.childEl = containerEl.createDiv({cls: "style-settings-container"});

		this.setCollapsed(this.setting.collapsed);
	}

	destroy(): void {
		for (const child of this.children) {
			child.destroy();
		}
		this.childEl.empty();
		this.settingEl.settingEl.remove();
	}

	private toggleVisible() {
		this.setCollapsed(!this.setting.collapsed);
	}

	private setCollapsed(collapsed: boolean) {
		this.setting.collapsed = collapsed;

		this.settingEl.settingEl.toggleClass("is-collapsed", collapsed);

		if (collapsed) {
			this.childEl?.empty();
		} else {
			for (const child of this.children) {
				child.render(this.childEl);
			}
		}
	}

	private addResetButton() {
		if (this.setting.resetFn) {
			this.settingEl.addExtraButton((b) => {
				b.setIcon("reset")
					.setTooltip("Reset all settings to default")
					.onClick(this.setting.resetFn);
			});
		}
	}

	private addExportButton() {
		this.settingEl.addExtraButton((b) => {
			b.setIcon("install");
			b.setTooltip("Export settings");
			b.extraSettingsEl.onClickEvent((e) => {
				e.stopPropagation();
				let title = getTitle(this.setting);
				title = this.sectionName === title ? title : `${this.sectionName} > ${title}`;
				this.settingsManager.export(title, this.settingsManager.getSettings(this.sectionId, this.getAllChildrenIds()));
			});
		});
	}

	addChild(child: CSSSetting): AbstractSettingComponent {
		const newSettingComponent = SettingComponentFactory.createSettingComponent(this.sectionId, this.sectionName, child, this.settingsManager, this.isView);
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
			if (child.setting.type === "heading") {
				children.push(...(child as HeadingSettingComponent).getAllChildrenIds());
			}
		}
		return children;
	}

}