import {EditorView, Decoration} from "@codemirror/view"
import type {Extension} from "@codemirror/state"

import type { ABStateManager } from './abStateManager';
import type { MdSelectorRangeSpec } from "./abMdSelector"
import { ABReplaceWidget } from "./replaceWidgetType"

interface CursorSpec{
  from:number, 
  to:number
}
/** @todo: Currently, this file and class are useless and can be basically optimized. */
/** Decoration manager
 * Returns a Decoration
 * The role of r_this is mainly to decorate the block so that it can set the cursor position back
 */
export class ABDecorationManager{
  rangeSpec: MdSelectorRangeSpec
  cursorSpec: CursorSpec
  decoration: Decoration
  isBlock: boolean
  r_this: ABStateManager

  constructor(r_this: ABStateManager, rangeSpec: MdSelectorRangeSpec, cursorSpec:CursorSpec){
    this.rangeSpec = rangeSpec
    this.cursorSpec = cursorSpec
    this.r_this = r_this

    let from = rangeSpec.from_ch
    let to = rangeSpec.to_ch
    let cfrom = cursorSpec.from
    let cto = cursorSpec.to
    // If the cursor position is inside the block, then do not enable the block, only use highlighting
    if (cfrom>=from && cfrom<=to || cto>=from && cto<=to) {
      this.isBlock = false
    }
    else {
      this.isBlock = true
    }

    this.decoration = this.initDecorationSet()
  }

  initDecorationSet(): Decoration{
    if (!this.isBlock) {
      return Decoration.mark({class: "ab-line-brace"})
    }
    else{ // text:string, item:SpecKeyword, editor:Editor
      return Decoration.replace({widget: new ABReplaceWidget(
        this.rangeSpec, this.r_this.editor
      )})
    }
  }

  static decoration_theme():Extension{
    return [
      EditorView.baseTheme({
        ".ab-line-brace": { textDecoration: "underline 1px red" }
      }),
      EditorView.baseTheme({
        ".ab-line-list": { textDecoration: "underline 1px cyan" }
      }),
      EditorView.baseTheme({
        ".ab-line-yellow": { textDecoration: "underline 1px yellow" }
      }),
      EditorView.baseTheme({
        ".ab-line-blue": { textDecoration: "underline 1px blue" }
      })
    ]
  }
  
}
