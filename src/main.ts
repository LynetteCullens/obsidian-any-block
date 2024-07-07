import { Plugin } from "obsidian";
import { ABCodeblockManager } from "./manager3/abCodeblockManager";
import { ABStateManager } from "./manager/abStateManager";
import { ABPosthtmlManager } from "./manager2/abPosthtmlManager";
import type { ABSettingInterface } from "./config/abSettingTab"
import { ABSettingTab, AB_SETTINGS } from "./config/abSettingTab"


export default class AnyBlockPlugin extends Plugin {
  settings: ABSettingInterface

	async onload() {
    await this.loadSettings();
    this.addSettingTab(new ABSettingTab(this.app, this));

    // Code block
    this.registerMarkdownCodeBlockProcessor("ab", ABCodeblockManager.processor);
    
    // Non-rendering mode cm extension - StateField
    // Runs when the plugin is just started and every time a file is opened
    this.app.workspace.onLayoutReady(()=>{
      new ABStateManager(this)
    })
    this.registerEvent(
      this.app.workspace.on('file-open', (fileObj) => {
        new ABStateManager(this)
      })
    );

    // Render mode Post processor
    const htmlProcessor = ABPosthtmlManager.processor.bind(this)
    this.registerMarkdownPostProcessor(htmlProcessor);
  }

  async loadSettings() {
		this.settings = Object.assign({}, AB_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}

  onunload() {
  }
}
