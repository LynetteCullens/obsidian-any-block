import {App, PluginSettingTab, Setting, Modal} from "obsidian"
import type AnyBlockPlugin from "../main"
import {ABProcessManager} from "src/replace/abProcessorManager"
import type {ABProcessorSpecUser} from "src/replace/abProcessorInterface"
import {} from "src/replace/textProcessor"    // Load all processors and selectors
import {} from "src/replace/listProcessor"    // ^
import {} from "src/replace/decoProcessor"    // ^
import {} from "src/replace/exProcessor"      // ^
import {} from "src/manager/abMdBaseSelector" // ^
import {generateSelectorInfoTable} from "src/manager/abMdSelector"  // ^

/** Setting value interface */
export interface ABSettingInterface {
  select_list: ConfSelect
  select_quote: ConfSelect
  select_code: ConfSelect
  select_heading: ConfSelect
  select_brace: ConfSelect
  //is_range_html: boolean
  //is_range_brace: boolean
  decoration_source: ConfDecoration
  decoration_live: ConfDecoration
  decoration_render: ConfDecoration
  is_neg_level: boolean,
  user_processor: ABProcessorSpecUser[]
}
export enum ConfSelect{
  no = "no",
  ifhead = "ifhead",
  yes = "yes"
}
export enum ConfDecoration{
  none = "none",
  inline = "inline",
  block = "block"
}

/** Setting value default item */
export const AB_SETTINGS: ABSettingInterface = {
  select_list: ConfSelect.ifhead,
  select_quote: ConfSelect.ifhead,
  select_code: ConfSelect.ifhead,
  select_heading: ConfSelect.ifhead,
  select_brace: ConfSelect.yes,
  decoration_source: ConfDecoration.none,
  decoration_live: ConfDecoration.block,
  decoration_render: ConfDecoration.block,
  is_neg_level: false,
  user_processor: []
}

/** Setting value panel */
export class ABSettingTab extends PluginSettingTab {
	plugin: AnyBlockPlugin
  processorPanel: HTMLElement
  selectorPanel: HTMLElement

	constructor(app: App, plugin: AnyBlockPlugin) {
		super(app, plugin);
		this.plugin = plugin;
    for (let item of plugin.settings.user_processor){
      ABProcessManager.getInstance().registerABProcessor(item)
    }
	}

	display(): void {
		const {containerEl} = this;
    containerEl.empty();
    let settings = this.plugin.settings

		containerEl.createEl('h2', {text: 'Range Manager'});

    this.selectorPanel = generateSelectorInfoTable(containerEl)

    /*containerEl.createEl('h2', {text: 'Decoration Manager'});

    new Setting(containerEl)
      .setName('Enable in source mode')
      .setDesc('Recommended: Do not enable')
			.addDropdown((component)=>{
        component
        .addOption(ConfDecoration.none, "Do not enable")
        .addOption(ConfDecoration.inline, "Only enable line decoration")
        .addOption(ConfDecoration.block, "Enable block decoration")
        .setValue(settings.decoration_source)
        .onChange(async v=>{
          // @ts-ignore This enumeration must contain the value of v
          settings.decoration_source = ConfDecoration[v]  
          await this.plugin.saveSettings();    
        })
      })

    new Setting(containerEl)
      .setName('Enable in live mode')
      .setDesc('Recommended: Enable block decoration/line decoration')
			.addDropdown((component)=>{
        component
        .addOption(ConfDecoration.none, "Do not enable")
        .addOption(ConfDecoration.inline, "Only enable line decoration")
        .addOption(ConfDecoration.block, "Enable block decoration")
        .setValue(settings.decoration_live)
        .onChange(async v=>{
          // @ts-ignore This enumeration must contain the value of v
          settings.decoration_live = ConfDecoration[v]
          await this.plugin.saveSettings(); 
        })
      })

    new Setting(containerEl)
      .setName('Enable in render mode')
      .setDesc('Recommended: Enable block decoration')
			.addDropdown((component)=>{
        component
        .addOption(ConfDecoration.none, "Do not enable")
        .addOption(ConfDecoration.block, "Enable block decoration")
        .setValue(settings.decoration_render)
        .onChange(async v=>{
          // @ts-ignore This enumeration must contain the value of v
          settings.decoration_render = ConfDecoration[v]    
          await this.plugin.saveSettings(); 
        })
      })*/

    containerEl.createEl('h2', {text: 'View all registered instructions'});

    new Setting(containerEl)
      .setName('Add new registered instructions')
      .setDesc('@todo: After adding, if you need to delete or modify, please open the data.json folder')
      .addButton(component => {
        component
        .setIcon("plus-circle")
        .onClick(e => {
          new ABProcessorModal(this.app, async (result)=>{
            ABProcessManager.getInstance().registerABProcessor(result)
            settings.user_processor.push(result)
            await this.plugin.saveSettings();
            this.processorPanel.remove()
            this.processorPanel = ABProcessManager.getInstance().generateProcessorInfoTable(containerEl)
          }).open()
        })
      })
    this.processorPanel = ABProcessManager.getInstance().generateProcessorInfoTable(containerEl)
	}
}

class ABProcessorModal extends Modal {
  args: ABProcessorSpecUser
  onSubmit: (args: ABProcessorSpecUser)=>void

  constructor(
    app: App, 
    onSubmit: (args: ABProcessorSpecUser)=>void
  ) {
    super(app);
    this.args = {
      id: "",
      name: "",
      match: "",
      process_alias: ""
    }
    this.onSubmit = onSubmit
  }

  onOpen() {	// onOpen() method is called when the dialog is opened, it is responsible for creating the content in the dialog. For more information, see HTML elements.
    let { contentEl } = this;
    contentEl.setText("Custom Processor");
    new Setting(contentEl)
      .setName("Processor unique id")
      .setDesc("It is OK as long as it does not conflict with other processors")
      .addText((text)=>{
        text.onChange((value) => {
          this.args.id = value
        })
      })

    new Setting(contentEl)
      .setName("Registrar name")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.name = value
      })
    })

    new Setting(contentEl)
      .setName("Registrar matching name")
      .setDesc("Enclose it in / to indicate a regular expression")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.match = value
      })
    })

    new Setting(contentEl)
      .setName("Registrar replacement")
      .setDesc("Enclose it in / to indicate a regular expression")
      .addText((text)=>{
        text.onChange((value) => {
        this.args.process_alias = value
      })
    })

    new Setting(contentEl)
      .addButton(btn => {
        btn
        .setButtonText("Submit")
        .setCta() // I don't know what this means
        .onClick(() => {
          if(this.args.id && this.args.name && this.args.match && this.args.process_alias){
            this.close();
            this.onSubmit(this.args);
          }
        })
      })
  }

  onClose() {	// onClose() method is called when the dialog is closed, it is responsible for cleaning up the resources occupied by the dialog.
    let { contentEl } = this;
    contentEl.empty();
  }
}
