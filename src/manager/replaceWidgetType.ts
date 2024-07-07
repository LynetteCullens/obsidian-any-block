import type { Editor } from 'obsidian';
import { EditorView, WidgetType } from "@codemirror/view";

import { ABProcessManager } from "../replace/abProcessorManager";
import type { MdSelectorRangeSpec } from "./abMdSelector";

export class ABReplaceWidget extends WidgetType {
  rangeSpec: MdSelectorRangeSpec;
  global_editor: Editor | null;
  div: HTMLDivElement;

  constructor(rangeSpec: MdSelectorRangeSpec, editor: Editor | null) {
    super();
    this.rangeSpec = rangeSpec;
    this.global_editor = editor;
  }

  /**
   * div.ab-replace.cm-embed-block.markdown-rendered.show-indentation-guide[type_header=`${}`]
   * div.drop-shadow.ab-note
   * div.ab-button.edit-block-button[aria-label="Edit this block"]
   */
  toDOM(view: EditorView): HTMLElement {
    // Root element
    this.div = document.createElement("div");
    this.div.setAttribute("type_header", this.rangeSpec.header);
    this.div.classList.add("ab-replace", "cm-embed-block");

    // Content replacement element
    let dom_note = document.createElement("div");
    dom_note.classList.add("ab-note", "drop-shadow");
    ABProcessManager.getInstance().autoABProcessor(dom_note, this.rangeSpec.header, this.rangeSpec.content);
    this.div.appendChild(dom_note);

    // Edit button
    if (this.global_editor) {
      let dom_edit = document.createElement("div");
      dom_edit.classList.add("ab-button", "edit-block-button");
      dom_edit.setAttribute("aria-label", "Edit this block - " + this.rangeSpec.header);
      dom_edit.innerHTML = ABReplaceWidget.str_icon_code2;
      dom_edit.onclick = () => { this.moveCursorToHead(); }
      this.div.appendChild(dom_edit);
    }

    return this.div;
  }

  private moveCursorToHead(): void {
    if (this.global_editor) {
      const editor: Editor = this.global_editor;
      let pos = this.getCursorPos(editor, this.rangeSpec.from_ch);
      if (pos) {
        editor.setCursor(pos);
        editor.replaceRange("OF", pos);
        editor.replaceRange("", pos, { line: pos.line, ch: pos.ch + 2 });
      }
    }
  }

  private getCursorPos(editor: Editor, total_ch: number): { line: number; ch: number } | null {
    let count_ch = 0;
    let list_text: string[] = editor.getValue().split("\n");
    for (let i = 0; i < list_text.length; i++) {
      if (count_ch + list_text[i].length >= total_ch) return { line: i, ch: total_ch - count_ch };
      count_ch += list_text[i].length + 1;
    }
    return null;
  }

  static str_icon_code2 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-darkreader-inline-stroke="" style="--darkreader-inline-stroke:currentColor;"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`;
}

interface TreeNode {
  text: string;
  children: TreeNode[];
}
