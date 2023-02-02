export const SettingType = {
	HEADING: 'heading',
	INFO_TEXT: 'info-text',
	CLASS_TOGGLE: 'class-toggle',
	CLASS_SELECT: 'class-select',
	VARIABLE_TEXT: 'variable-text',
	VARIABLE_NUMBER: 'variable-number',
	VARIABLE_NUMBER_SLIDER: 'variable-number-slider',
	VARIABLE_SELECT: 'variable-select',
	VARIABLE_COLOR: 'variable-color',
	VARIABLE_THEMED_COLOR: 'variable-themed-color',
	COLOR_GRADIENT: 'color-gradient',
} as const;

export type SettingType = (typeof SettingType)[keyof typeof SettingType];
