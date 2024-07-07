import { MarkdownRenderChild } from "obsidian";
import { ABProcessManager } from "../replace/abProcessorManager";

export class ReplaceRender extends MarkdownRenderChild {
  constructor(containerEl, header, content) {
    super(containerEl);
    this.header = header;
    this.content = content;
  }

  onload() {
    const div = this.containerEl.createDiv({
      cls: ["ab-replace", "cm-embed-block"],
    });
    div.setAttribute("type_header", this.header);

    // Main content part
    const dom_note = div.createDiv({
      cls: ["ab-note", "drop-shadow"],
    });
    let dom_replaceEl = dom_note.createDiv({
      cls: ["ab-replaceEl"],
    });
    ABProcessManager.getInstance().autoABProcessor(dom_replaceEl, this.header, this.content);
    this.containerEl.replaceWith(div);

    // Dropdown format part
    const dom_edit = div.createEl("select", {
      cls: ["ab-button", "edit-block-button"],
      attr: { "aria-label": "Edit this block - " + this.header },
    });
    const first_dom_option = dom_edit.createEl("option", {
      text: "Composite format: " + this.header,
      attr: { "value": this.header },
    });
    first_dom_option.selected = true;
    let header_name_flag = "";

    for (let item of ABProcessManager.getInstance().getProcessorOptions()) {
      const dom_option = dom_edit.createEl("option", {
        text: item.name,
        attr: { "value": item.id },
      });
      if (this.header == item.id) {
        header_name_flag = item.name;
      }
    }
    if (header_name_flag != "") {
      first_dom_option.setText(header_name_flag);
    }

    dom_edit.onchange = () => {
      const new_header = dom_edit.options[dom_edit.selectedIndex].value;
      const new_dom_replaceEl = dom_note.createDiv({
        cls: ["ab-replaceEl"],
      });
      ABProcessManager.getInstance().autoABProcessor(new_dom_replaceEl, new_header, this.content);
      dom_replaceEl.replaceWith(new_dom_replaceEl);
      dom_replaceEl = new_dom_replaceEl;
    };

    // Dropdown hide
    const button_show = () => { dom_edit.show(); };
    const button_hide = () => { dom_edit.hide(); };
    dom_edit.hide();
    dom_note.onmouseover = button_show;
    dom_note.onmouseout = button_hide;
    dom_edit.onmouseover = button_show;
    dom_edit.onmouseout = button_hide;
  }

  static str_icon_code2 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-darkreader-inline-stroke="" style="--darkreader-inline-stroke:currentColor;"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`;
}
