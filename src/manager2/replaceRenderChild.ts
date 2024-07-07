import { MarkdownRenderChild } from "obsidian";
import { ABProcessManager } from "../replace/abProcessorManager"

export class ReplaceRender extends MarkdownRenderChild {
  content: string;
  header: string;

  // override. This only adds a text parameter, everything else remains the same
  constructor(containerEl: HTMLElement, header: string, content: string) {
    super(containerEl);
    this.header = header;
    this.content = content;
  }

  /**
   *  div
   *      div.ab-replace.cm-embed-block.markdown-rendered.show-indentation-guide[type_header=`${}`]
   *          div.drop-shadow.ab-note
   *              .ab-replaceEl (replaced when the drop-down box is selected)
   *          div.edit-block-button[aria-label="Edit this block"]
   * 
   *  this.containerEl
   *      div
   *          dom_note
   *              subEl (replaced when the drop-down box is selected)
   *          dom_edit
   */
  onload() {
    const div:HTMLDivElement = this.containerEl.createDiv({
      cls: ["ab-replace", "cm-embed-block"]
    });
    div.setAttribute("type_header", this.header)

    // Main body
    const dom_note = div.createDiv({
      cls: ["ab-note", "drop-shadow"]
    })
    let dom_replaceEl = dom_note.createDiv({
      cls: ["ab-replaceEl"]
    })
    ABProcessManager.getInstance().autoABProcessor(dom_replaceEl, this.header, this.content)
    this.containerEl.replaceWith(div);
    
    // Drop-down box formatting section
    const dom_edit = div.createEl("select", {
      cls: ["ab-button", "edit-block-button"], 
      attr: {"aria-label": "Edit this block - "+this.header}
    });
    const first_dom_option = dom_edit.createEl("option",{ // This needs to be in the first place
      text:"Compound Format:"+this.header,
      attr:{"value":this.header},
    })
    first_dom_option.selected=true
    let header_name_flag = ""   // Whether the currently entered processor is a standard processor, if so, hide the first option and use the standard one
    for (let item of ABProcessManager.getInstance().getProcessorOptions()){
      const dom_option = dom_edit.createEl("option",{
        text:item.name,
        attr:{"value":item.id},
      })
      if (this.header==item.id) {
        header_name_flag = item.name
        // dom_option.selected=true
      }
    }
    if (header_name_flag!=""){ // You can choose one way to handle it here: destroy/hide/do nothing, keep two options with the same rules
      // first_dom_option.setAttribute("style", "display:none") 
      // dom_edit.removeChild(first_dom_option)
      first_dom_option.setText(header_name_flag)
    }
    dom_edit.onchange = ()=>{
      const new_header = dom_edit.options[dom_edit.selectedIndex].value
      const new_dom_replaceEl = dom_note.createDiv({
        cls: ["ab-replaceEl"]
      })
      ABProcessManager.getInstance().autoABProcessor(new_dom_replaceEl, new_header, this.content)
      dom_replaceEl.replaceWith(new_dom_replaceEl);
      dom_replaceEl = new_dom_replaceEl
    }

    // Drop-down box hiding
    const button_show = ()=>{dom_edit.show()}
    const button_hide  = ()=>{dom_edit.hide()}
    dom_edit.hide()
    dom_note.onmouseover = button_show
    dom_note.onmouseout = button_hide
    dom_edit.onmouseover = button_show
    dom_edit.onmouseout = button_hide
  }

  static str_icon_code2 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-darkreader-inline-stroke="" style="--darkreader-inline-stroke:currentColor;"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`
}
