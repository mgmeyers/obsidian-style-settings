import {lang, t} from "./lang/helpers";
import {Meta, WithDescription, WithTitle} from "./SettingHandlers";
import Pickr from "@simonwep/pickr";

export const settingRegExp = /\/\*\s*@settings[\r\n]+?([\s\S]+?)\*\//g;
export const nameRegExp = /^name:\s*(.+)$/m;
export type ErrorList = Array<{ name: string; error: string }>;

export function getTitle<T extends Meta>(config: T): string {
	if (lang) {
		return config[`title.${lang}` as keyof WithTitle] || config.title;
	}

	return config.title;
}

export function getDescription<T extends Meta>(config: T): string {
	if (lang) {
		return (
			config[`description.${lang}` as keyof WithDescription] ||
			config.description
		);
	}

	return config.description;
}

export function isValidDefaultColor(color: string) {
	return /^(#|rgb|hsl)/.test(color);
}

export function getPickrSettings(opts: {
	isView: boolean;
	el: HTMLElement;
	containerEl: HTMLElement;
	swatches: string[];
	opacity: boolean | undefined;
	defaultColor: string;
}): Pickr.Options {
	const {el, isView, containerEl, swatches, opacity, defaultColor} = opts;

	return {
		el,
		container: isView ? document.body : containerEl,
		theme: "nano",
		swatches,
		lockOpacity: !opacity,
		default: defaultColor,
		position: "left-middle",
		components: {
			preview: true,
			hue: true,
			opacity: !!opacity,
			interaction: {
				hex: true,
				rgba: true,
				hsla: true,
				input: true,
				cancel: true,
				save: true,
			},
		},
	};
}

export function onPickrCancel(instance: Pickr) {
	instance.hide();
}

export function sanitizeText(str: string): string {
	if (str === "") {
		return `""`;
	}

	return str.replace(/[;<>]/g, "");
}

export function createDescription(
	description: string | undefined,
	def: string,
	defLabel?: string,
) {
	const fragment = createFragment();

	if (description) {
		fragment.appendChild(document.createTextNode(description));
	}

	if (def) {
		const small = createEl("small");
		small.appendChild(createEl("strong", {text: `${t("Default:")} `}));
		small.appendChild(document.createTextNode(defLabel || def));

		const div = createEl("div");

		div.appendChild(small);

		fragment.appendChild(div);
	}

	return fragment;
}