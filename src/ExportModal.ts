import { App, Modal, Setting, TextAreaComponent } from 'obsidian';
import CSSSettingsPlugin from './main';
import { SettingValue } from './SettingsManager';

export class ExportModal extends Modal {
	plugin: CSSSettingsPlugin;
	section: string;
	config: Record<string, SettingValue>;

	constructor(
		app: App,
		plugin: CSSSettingsPlugin,
		section: string,
		config: Record<string, SettingValue>
	) {
		super(app);
		this.plugin = plugin;
		this.config = config;
		this.section = section;
	}

	onOpen() {
		const { contentEl, modalEl } = this;

		modalEl.addClass('modal-style-settings');

		new Setting(contentEl)
			.setName(`Export settings for: ${this.section}`)
			.then((setting) => {
				const output = JSON.stringify(this.config, null, 2);

				// Build a copy to clipboard link
				setting.controlEl.createEl(
					'a',
					{
						cls: 'style-settings-copy',
						text: 'Copy to clipboard',
						href: '#',
					},
					(copyButton) => {
						new TextAreaComponent(contentEl)
							.setValue(output)
							.then((textarea) => {
								copyButton.addEventListener('click', (e) => {
									e.preventDefault();

									// Select the textarea contents and copy them to the clipboard
									textarea.inputEl.select();
									textarea.inputEl.setSelectionRange(0, 99999);
									document.execCommand('copy');

									copyButton.addClass('success');

									setTimeout(() => {
										// If the button is still in the dom, remove the success class
										if (copyButton.parentNode) {
											copyButton.removeClass('success');
										}
									}, 2000);
								});
							});
					}
				);

				// Build a download link
				setting.controlEl.createEl('a', {
					cls: 'style-settings-download',
					text: 'Download',
					attr: {
						download: 'style-settings.json',
						href: `data:application/json;charset=utf-8,${encodeURIComponent(
							output
						)}`,
					},
				});
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
