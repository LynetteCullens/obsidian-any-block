import { App, PluginSettingTab, Setting, Modal } from "obsidian";
import type AnyBlockPlugin from "../main";
import { ABProcessManager } from "src/replace/abProcessorManager";
import type { ABProcessorSpecUser } from "src/replace/abProcessorInterface";
import {} from "src/replace/textProcessor"; // Load all processors and selectors
import {} from "src/replace/listProcessor"; // ^
import {} from "src/replace/decoProcessor"; // ^
import {} from "src/replace/exProcessor"; // ^
import {} from "src/manager/abMdBaseSelector"; // ^
import { generateSelectorInfoTable } from "src/manager/abMdSelector"; // ^

/** Setting Interface */
export interface ABSettingInterface {
  select_list: ConfSelect;
  select_quote: ConfSelect;
  select_code: ConfSelect;
  select_heading: ConfSelect;
  select_brace: ConfSelect;
  //is_range_html: boolean
  //is_range_brace: boolean
  decoration_source: ConfDecoration;
  decoration_live: ConfDecoration;
  decoration_render: ConfDecoration;
  is_neg_level: boolean;
  user_processor: ABProcessorSpecUser[];
}

export enum ConfSelect {
  no = "no",
  ifhead = "ifhead",
  yes = "yes",
}

export enum ConfDecoration {
  none = "none",
  inline = "inline",
  block = "block",
}

/** Default Settings */
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
  user_processor: [],
};

/** Settings Tab */
export class ABSettingTab extends PluginSettingTab {
  plugin: AnyBlockPlugin;
  processorPanel: HTMLElement;
  selectorPanel: HTMLElement;

  constructor(app: App, plugin: AnyBlockPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    for (let item of plugin.settings.user_processor) {
      ABProcessManager.getInstance().registerABProcessor(item);
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    let settings = this.plugin.settings;

    containerEl.createEl("h2", { text: "Range Manager" });

    this.selectorPanel = generateSelectorInfoTable(containerEl);

    containerEl.createEl("h2", { text: "View All Registered Commands" });

    new Setting(containerEl)
      .setName("Add New Registered Command")
      .setDesc(
        "@todo: To delete or modify after adding, please open the data.json folder"
      )
      .addButton((component) => {
        component
          .setIcon("plus-circle")
          .onClick((e) => {
            new ABProcessorModal(this.app, async (result) => {
              ABProcessManager.getInstance().registerABProcessor(result);
              settings.user_processor.push(result);
              await this.plugin.saveSettings();
              this.processorPanel.remove();
              this.processorPanel =
                ABProcessManager.getInstance().generateProcessorInfoTable(
                  containerEl
                );
            }).open();
          });
      });

    this.processorPanel =
      ABProcessManager.getInstance().generateProcessorInfoTable(containerEl);
  }
}

class ABProcessorModal extends Modal {
  args: ABProcessorSpecUser;
  onSubmit: (args: ABProcessorSpecUser) => void;

  constructor(app: App, onSubmit: (args: ABProcessorSpecUser) => void) {
    super(app);
    this.args = {
      id: "",
      name: "",
      match: "",
      process_alias: "",
    };
    this.onSubmit = onSubmit;
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText("Custom Processor");

    new Setting(contentEl)
      .setName("Processor Unique ID")
      .setDesc("Must not conflict with other processors")
      .addText((text) => {
        text.onChange((value) => {
          this.args.id = value;
        });
      });

    new Setting(contentEl)
      .setName("Processor Name")
      .addText((text) => {
        text.onChange((value) => {
          this.args.name = value;
        });
      });

    new Setting(contentEl)
      .setName("Processor Matching Name")
      .setDesc("Use / to denote regex")
      .addText((text) => {
        text.onChange((value) => {
          this.args.match = value;
        });
      });

    new Setting(contentEl)
      .setName("Processor Replacement")
      .setDesc("Use / to denote regex")
      .addText((text) => {
        text.onChange((value) => {
          this.args.process_alias = value;
        });
      });

    new Setting(contentEl).addButton((btn) => {
      btn
        .setButtonText("Submit")
        .setCta()
        .onClick(() => {
          if (
            this.args.id &&
            this.args.name &&
            this.args.match &&
            this.args.process_alias
          ) {
            this.close();
            this.onSubmit(this.args);
          }
        });
    });
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
