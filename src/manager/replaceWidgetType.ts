import type {Editor, EditorPosition} from 'obsidian';
import {EditorView, WidgetType} from "@codemirror/view"

import {ABProcessManager} from "../replace/abProcessorManager"
import type {MdSelectorRangeSpec} from "./abMdSelector"

export class ABReplaceWidget extends WidgetType {
  rangeSpec: MdSelectorRangeSpec
  global_editor: Editor|null
  div: HTMLDivElement

  constructor(rangeSpec: MdSelectorRangeSpec, editor: Editor|null){
    super()
    this.rangeSpec = rangeSpec
    this.global_editor = editor
  }

  /**
   *  div.ab-replace.cm-embed-block.markdown-rendered.show-indentation-guide[type_header=`${}`]
   *      div.drop-shadow.ab-note
   *      div.ab-button.edit-block-button[aria-label="Edit this block"]
   */
  toDOM(view: EditorView): HTMLElement {
    // Root element
    this.div = document.createElement("div");
    this.div.setAttribute("type_header", this.rangeSpec.header)
    this.div.addClasses(["ab-replace", "cm-embed-block"]) // , "markdown-rendered", "show-indentation-guide"

    // Content replacement element
    let dom_note = this.div.createEl("div", {cls: ["ab-note", "drop-shadow"]});
    ABProcessManager.getInstance().autoABProcessor(dom_note, this.rangeSpec.header, this.rangeSpec.content)

    // Edit button
    if (this.global_editor){
      let dom_edit = this.div.createEl("div", {
        cls: ["ab-button", "edit-block-button"], // cm-embed-block and edit-block-button are built-in js styles? Used for floating display
        attr: {"aria-label": "Edit this block - "+this.rangeSpec.header}
      });
      dom_edit.innerHTML = ABReplaceWidget.str_icon_code2
    
      // Indirectly cancel the display of the block by controlling the cursor movement
      // this.div.ondblclick = ()=>{this.moveCursorToHead()}
      dom_edit.onclick = ()=>{this.moveCursorToHead()}
    }
    
    return this.div;
  }

  private moveCursorToHead(): void{
      /** @warning Note that you should never use the view parameter given by the toDOM method here
       * const editor: Editor = view.editor // @ts-ignore
       * Otherwise the editor is undefined
       */
      if (this.global_editor){
        const editor: Editor = this.global_editor
        let pos = this.getCursorPos(editor, this.rangeSpec.from_ch)
        if (pos) {
          editor.setCursor(pos)
          // Round-trip modification, indirectly re-rendering the State
          editor.replaceRange("OF", pos)
          editor.replaceRange("", pos, {line:pos.line, ch:pos.ch+2})
        }
      }
  }

  private getCursorPos(editor:Editor, total_ch:number): EditorPosition|null{
    let count_ch = 0
    let list_text: string[] = editor.getValue().split("\n")
    for (let i=0; i<list_text.length; i++){
      if (count_ch+list_text[i].length >= total_ch) return {line:i, ch:total_ch-count_ch}
      count_ch = count_ch + list_text[i].length + 1
    }
    return null
  }

  // Iteration
  createTable(div: Element){

  }

  static str_icon_code2 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-darkreader-inline-stroke="" style="--darkreader-inline-stroke:currentColor;"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`
}

interface TreeNode{
    text: string
    children: TreeNode[]
}

/*`
<div class="drop-shadow ab-note">
  <p>${this.text.split("\n").join("<br/>")}</p>
</div>
<div class="edit-block-button" aria-label="Edit this block">
  ${str_icon_code2}
</div>
`*/

/**const div = document.createDiv({
  cls: ["ab-replace"]
})/
/*const editButton = div.createEl("img", {
  cls: ["ab-switchButton"],
  //text: str_icon_code2,
  title: "Edit this block",
  // attr: {"src": "code-2"}////////////////
})*/
/*const adText = div.createDiv({
  text: "👉" + this.text
})*/
// div.innerText = "👉" + this.text;
