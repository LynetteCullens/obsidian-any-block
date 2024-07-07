import {EditorView, Decoration, type DecorationSet} from "@codemirror/view"
import {StateField, StateEffect, EditorState, Transaction, Range} from "@codemirror/state"
import  {MarkdownView, type View, type Editor, type EditorPosition} from 'obsidian';

import type AnyBlockPlugin from '../main'
import { ConfDecoration } from "src/config/abSettingTab"
import { autoMdSelector, type MdSelectorRangeSpec} from "./abMdSelector"
import { ABDecorationManager } from "./abDecorationManager"
import { ABReplaceWidget } from "./replaceWidgetType"

/** Overall logic outline
 * mermaid
 * - State Manager : Used to set the state
 *   - Range Manager (constructed from full text) interface SpecKeyword : A document has multiple range managers
 *     - Decoration Manager (passed in range manager) / Replacement Manager : A sub-range manager has multiple ranges, each range can use different decorations
 * 
 * Process:
 * - Select range
 */

// Get - Mode
enum Editor_mode{
  NONE,
  SOURCE,
  SOURCE_LIVE,
  PREVIEW
}

/** State manager
 * Enable state field decoration functionality
 * One-time use
 */
export class ABStateManager{
  plugin_this: AnyBlockPlugin
  replace_this=this
  view: View
  editor: Editor
  editorView: EditorView
  editorState: EditorState

  // Used to prevent frequent refreshes, true->true/false->false, not much refresh, false->true/true->false, big refresh
  is_prev_cursor_in:boolean
  prev_decoration_mode:ConfDecoration
  prev_editor_mode:Editor_mode

  get cursor(): EditorPosition {return this.editor.getCursor();}
  get state(): any {return this.view.getState()}
  get mdText(): string {return this.editor.getValue()}

  constructor(plugin_this: AnyBlockPlugin){
    this.plugin_this=plugin_this
    // Because opening a document will trigger, the document opened in the background will return false
    if (this.init()) this.setStateEffects()
  }

  /** Set common variables */
  private init() {
    const view: View|null = this.plugin_this.app.workspace.getActiveViewOfType(MarkdownView); // Unfocused (active) will return null
    if (!view) return false
    this.view = view
    // @ts-ignore Here it will say that View does not have an editor property
    this.editor = this.view.editor
    // @ts-ignore Here it will say that Editor does not have a cm property
    this.editorView = this.editor.cm
    this.editorState = this.editorView.state

    this.is_prev_cursor_in = true
    this.prev_decoration_mode = ConfDecoration.none
    this.prev_editor_mode = Editor_mode.NONE
    return true
  }

  /** Set the initial state field and dispatch */
  private setStateEffects() {
    let stateEffects: StateEffect<unknown>[] = []
  
    /** Modify StateEffect1 - Join StateField, css style
     * When EditorState does not have (underscore) StateField, the (underscore) state field is added to EditorEffect
     *    (Then the EditorEffect is dispatched to EditorView at the end of the function).
     * That is to say, it will only be executed for the first time, which will trigger
     */
    if (!this.editorState.field(this.decorationField, false)) {
      stateEffects.push(StateEffect.appendConfig.of(
        [this.decorationField] 
      ))
      stateEffects.push(StateEffect.appendConfig.of(
        [ABDecorationManager.decoration_theme()] 
      ))
    }
  
    /** Dispatch */
    this.editorView.dispatch({effects: stateEffects})
    return true
  }

  /** A class member. StateField, which manages Decoration */
  private decorationField = StateField.define<DecorationSet>({
    create: (editorState)=>{return Decoration.none},
    // create seems to be fine, update can always be triggered
    // The fundamental function of the function is to modify the range of decorationSet, indirectly modifying the management range of StateField
    update: (decorationSet, tr)=>{
      return this.updateStateField(decorationSet, tr)
    },
    provide: f => EditorView.decorations.from(f)
  })

  // private
  private updateStateField (decorationSet:DecorationSet, tr:Transaction){    
    // If there is no modification, ignore it (except for clicking the edit block button)
    // if(tr.changes.empty) return decorationSet

    // Get - editor mode, decoration options, selector options
    let editor_mode: Editor_mode = this.getEditorMode()
    let decoration_mode:ConfDecoration
    if(editor_mode==Editor_mode.SOURCE) {
      decoration_mode = this.plugin_this.settings.decoration_source
    }
    else if(editor_mode==Editor_mode.SOURCE_LIVE) {
      decoration_mode = this.plugin_this.settings.decoration_live
    }
    else {
      decoration_mode = this.plugin_this.settings.decoration_render
    }

    // Decoration adjustment (deletion, addition, modification), wrapped to prepare for debouncing (not debounced)
    // let refreshStrong = this.refreshStrong2.bind(this)
    
    return this.refreshStrong2(decorationSet, tr, decoration_mode, editor_mode)
  }

  /** Get editor mode */
  private getEditorMode(): Editor_mode {
    let editor_dom: Element | null
    /** @warning Cannot use editor_dom = document
     * Then editor_dom = editor_dom?.getElementsByClassName("workspace-tabs mod-top mod-active")[0];
     * Using document, I don't know why there is always an attribute is-live-preview, it always thinks it is real-time mode 
     */
    // Type 'WorkspaceLeaf' does not have a property 'containerEl'
    // Here you cannot use getActiveViewOfType(MarkdownView), it seems that it cannot determine whether the editor mode is source or real-time
    // @ts-ignore
    editor_dom = this.plugin_this.app.workspace.activeLeaf.containerEl
    if (!editor_dom) {
      console.warn("Unable to get the dom to determine the editor mode"); 
      return Editor_mode.NONE; 
    }
    editor_dom = editor_dom?.getElementsByClassName("workspace-leaf-content")[0]
    let str = editor_dom?.getAttribute("data-mode")
    if (str=="source") {
      editor_dom = editor_dom?.getElementsByClassName("markdown-source-view")[0]
      if(editor_dom?.classList.contains('is-live-preview')) return Editor_mode.SOURCE_LIVE
      else return Editor_mode.SOURCE
    }
    else if (str=="preview"){
      return Editor_mode.PREVIEW  // But it won't actually be judged, because real-time does not trigger the update method
    }
    else {
      /*console.warn("Unable to get the editor mode, there may be bugs");*/ 
      return Editor_mode.NONE;
    } // Click the editor and then click other layout locations, it will happen
  }

  /** Get the character number of the cursor in the entire text */
  private getCursorCh() {
    let cursor_from_ch = 0
    let cursor_to_ch = 0
    let list_text: string[] = this.editor.getValue().split("\n")
    for (let i=0; i<=this.editor.getCursor("to").line; i++){
      if (this.editor.getCursor("from").line == i) {cursor_from_ch = cursor_to_ch+this.editor.getCursor("from").ch}
      if (this.editor.getCursor("to").line == i) {cursor_to_ch = cursor_to_ch+this.editor.getCursor("to").ch; break;}
      cursor_to_ch += list_text[i].length+1
    }
    return {
      from: cursor_from_ch, 
      to: cursor_to_ch
    }
  }

  /** Decoration adjustment (deletion, addition, modification), wrapped to prepare for debouncing 
   * Small refresh: Position mapping (refreshes every time)
   * Big refresh: Delete all elements and recreate them (avoid frequent large refreshes)
   * _
   * Conditions for large refresh:
   *   - When the mouse enters or leaves the range
   *   - When the decoration type changes
   *   - When switching edit modes
   */
  private refreshStrong2(decorationSet:DecorationSet, tr:Transaction, decoration_mode:ConfDecoration, editor_mode:Editor_mode){
    let is_current_cursor_in = false

    // Decoration adjustment - Don't check, just clear it all
    if (decoration_mode==ConfDecoration.none) {
      if (decoration_mode!=this.prev_decoration_mode){
        decorationSet = decorationSet.update({
          filter: (from, to, value)=>{return false}
        })
        this.is_prev_cursor_in = true
        this.prev_decoration_mode = decoration_mode
        this.prev_editor_mode = editor_mode
        return decorationSet
      }
      else {
        return decorationSet
      }
    }

    // Decoration adjustment - Check
    let list_add_decoration:Range<Decoration>[] = []
    const list_rangeSpec:MdSelectorRangeSpec[] = autoMdSelector(this.mdText)
    for (let rangeSpec of list_rangeSpec){
      let decoration: Decoration
      // Judge the cursor position
      const cursorSpec = this.getCursorCh()
      if (cursorSpec.from>=rangeSpec.from_ch && cursorSpec.from<=rangeSpec.to_ch 
          || cursorSpec.to>=rangeSpec.from_ch && cursorSpec.to<=rangeSpec.to_ch) {
        decoration = Decoration.mark({class: "ab-line-yellow"})
        is_current_cursor_in = true
      }
      else{
        decoration = Decoration.replace({widget: new ABReplaceWidget(
          rangeSpec, this.editor
        )})
      }
      list_add_decoration.push(decoration.range(rangeSpec.from_ch, rangeSpec.to_ch))
    }
    
    /*const list_abRangeManager:ABMdSelector[] = get_selectors(this.plugin_this.settings).map(c => {
      return new c(this.mdText, this.plugin_this.settings)
    })
    if(decoration_mode==ConfDecoration.inline){       // Line decoration
      for (let abManager of list_abRangeManager){     // Iterate through multiple range managers
        let listRangeSpec: MdSelectorRangeSpec[] = abManager.specKeywords
        for(let rangeSpec of listRangeSpec){          // Iterate through multiple range sets in each range manager
          const decoration: Decoration = Decoration.mark({class: "ab-line-brace"})
          list_add_decoration.push(decoration.range(rangeSpec.from_ch, rangeSpec.to_ch))
        }
      }
    }
    else{                                             // Block decoration
      const cursorSpec = this.getCursorCh()
      for (let abManager of list_abRangeManager){     // Iterate through multiple range managers
        let listRangeSpec: MdSelectorRangeSpec[] = abManager.specKeywords
        for(let rangeSpec of listRangeSpec){          // Iterate through multiple range sets in each range manager
          let decoration: Decoration
          // Judge the cursor position
          if (cursorSpec.from>=rangeSpec.from_ch && cursorSpec.from<=rangeSpec.to_ch 
              || cursorSpec.to>=rangeSpec.from_ch && cursorSpec.to<=rangeSpec.to_ch) {
            decoration = Decoration.mark({class: "ab-line-yellow"})
            is_current_cursor_in = true
          }
          else{
            decoration = Decoration.replace({widget: new ABReplaceWidget(
              rangeSpec, this.editor
            )})
          }
          list_add_decoration.push(decoration.range(rangeSpec.from_ch, rangeSpec.to_ch))
        }
      }
    }*/

    /*console.log("State comparison", 
      (is_current_cursor_in!=this.is_prev_cursor_in
        ||decoration_mode!=this.prev_decoration_mode
        ||editor_mode!=this.prev_editor_mode
      )?"Big refresh":"No refresh"
      ,is_current_cursor_in,this.is_prev_cursor_in
      ,decoration_mode,this.prev_decoration_mode
      ,editor_mode,this.prev_editor_mode
    )*/
    if (is_current_cursor_in!=this.is_prev_cursor_in
      ||decoration_mode!=this.prev_decoration_mode
      ||editor_mode!=this.prev_editor_mode
    ){
      this.is_prev_cursor_in = is_current_cursor_in
      this.prev_decoration_mode = decoration_mode
      this.prev_editor_mode = editor_mode

      // Decoration adjustment - Deletion
      /** @bug The mdText here is the unmodified mdText, and the cursor position will also be delayed for a beat */
      decorationSet = decorationSet.update({            // Reduce, delete all
        filter: (from, to, value)=>{return false}
      })
      // Decoration adjustment - Addition
      // This is a bit of a fart in the ass, but it seems that due to range overlap, directly passing the list will cause an error:
      // Ranges must be added sorted by `from` position and `startSide`
      for(let item of list_add_decoration){
        decorationSet = decorationSet.update({
          add: [item]
        })
      }
    }

    // Decoration adjustment - Change (mapping)
    decorationSet = decorationSet.map(tr.changes)
    return decorationSet
  }

  /** Debouncer (reusable) */
  /*debouncedFn = this.debounce(this.refreshStrong2, 1000, false)
  private debounce(
    method:any,       // Debouncing method
    wait:number,      // Waiting
    immediate:boolean // Whether to execute immediately
  ) {
    let timeout:NodeJS.Timeout|null
    // debounced function is the return value
    // Use Async/Await to handle asynchronous operations. If the function executes asynchronously, wait for setTimeout to finish, get the return value of the original function and return it
    // args is the parameters passed in when the return function is called, passed to method
    let debounced = function(...args: any[]) {
      return new Promise (resolve => {
        // Used to record the execution result of the original function
        let result
        // Set the direction of this when method is executed to the direction of this when the function returned by debounce is called
        let context = this
        // If a timer exists, clear it
        if (timeout) {
          clearTimeout(timeout)
        }
        // Immediate execution requires two conditions, one is that immediate is true, and the other is that timeout has not been assigned a value or has been set to null
        if (immediate) {
          // If the timer does not exist, execute immediately and set a timer to set the timer to null after wait milliseconds
          // This ensures that after immediate execution, it will not be triggered again within wait milliseconds
          let callNow = !timeout
          timeout = setTimeout(() => {
            timeout = null
          }, wait)
          // If both of the above conditions are met, execute immediately and record the execution result
          if (callNow) {
            result = method.apply(context, args)
            resolve(result)
          }
        } else {
          // If immediate is false, wait for the function to execute and record the execution result
          // And set the Promise status to fullfilled, so that the function can continue to execute
          timeout = setTimeout(() => {
            // args is an array, so use fn.apply
            // Can also be written as method.call(context, ...args)
            result = method.apply(context, args)
            resolve(result)
          }, wait)
        }
      })
    }
  
    // Add cancel method to the returned debounced function
    //debounced.cancel = function() {
    //  clearTimeout(timeout)
    //  timeout = null
    //}
  
    return debounced
  }*/
}
