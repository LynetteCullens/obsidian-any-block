import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { StateField, StateEffect, EditorState, Transaction, Range } from "@codemirror/state";
import { MarkdownView, View, Editor, EditorPosition } from 'obsidian';
import type AnyBlockPlugin from '../main';
import { ConfDecoration } from "src/config/abSettingTab";
import { autoMdSelector, MdSelectorRangeSpec } from "./abMdSelector";
import { ABDecorationManager } from "./abDecorationManager";
import { ABReplaceWidget } from "./replaceWidgetType";

// Logical overview
// mermaid
// - State Manager: Used for setting states
//   - Range Manager (full text construction) interface SpecKeyword: Multiple range managers for a document
//     - Decoration Manager (takes range manager) / Replace Manager: Multiple ranges within a child range manager, each range can use different decorations

// Workflow:
// - Select Range

// Editor modes
enum Editor_mode {
    NONE,
    SOURCE,
    SOURCE_LIVE,
    PREVIEW
}

/** State Manager
 * Enables state field decoration functionality
 * Disposable use
 */
export class ABStateManager {
    plugin_this: AnyBlockPlugin;
    replace_this = this;
    view: View;
    editor: Editor;
    editorView: EditorView;
    editorState: EditorState;

    // Used to prevent frequent refreshes, true->true/false->false, minor refresh, false->true/true->false, major refresh
    is_prev_cursor_in: boolean;
    prev_decoration_mode: ConfDecoration;
    prev_editor_mode: Editor_mode;

    get cursor(): EditorPosition { return this.editor.getCursor(); }
    get state(): any { return this.view.getState(); }
    get mdText(): string { return this.editor.getValue(); }

    constructor(plugin_this: AnyBlockPlugin) {
        this.plugin_this = plugin_this;
        // Opening a document triggers this, so return false for documents opened in the background
        if (this.init()) this.setStateEffects();
    }

    /** Set common variables */
    private init() {
        const view: View | null = this.plugin_this.app.workspace.getActiveViewOfType(MarkdownView); // Returns null if not focused (active)
        if (!view) return false;
        this.view = view;
        // @ts-ignore Here it will say View has no editor property
        this.editor = this.view.editor;
        // @ts-ignore Here it will say Editor has no cm property
        this.editorView = this.editor.cm;
        this.editorState = this.editorView.state;

        this.is_prev_cursor_in = true;
        this.prev_decoration_mode = ConfDecoration.none;
        this.prev_editor_mode = Editor_mode.NONE;
        return true;
    }

    /** Set initial state fields and dispatch */
    private setStateEffects() {
        let stateEffects: StateEffect<unknown>[] = [];

        /** Modify StateEffect1 - Add StateField, CSS style
         * When EditorState does not have (underscore) StateField, add this (underscore) state field to EditorEffect
         *    (Dispatch EditorEffect to EditorView at the end of the function).
         * This means it will only execute the first time, triggering only then
         */
        if (!this.editorState.field(this.decorationField, false)) {
            stateEffects.push(StateEffect.appendConfig.of(
                [this.decorationField]
            ));
            stateEffects.push(StateEffect.appendConfig.of(
                [ABDecorationManager.decoration_theme()]
            ));
        }

        /** Dispatch */
        this.editorView.dispatch({ effects: stateEffects });
        return true;
    }

    /** A class member. StateField, manages the state with Decoration */
    private decorationField = StateField.define<DecorationSet>({
        create: (editorState) => { return Decoration.none; },
        // create seems not to matter, update can trigger regardless
        // The main function of the function is to modify the range of decorationSet and indirectly modify the management range of StateField
        update: (decorationSet, tr) => {
            return this.updateStateField(decorationSet, tr);
        },
        provide: f => EditorView.decorations.from(f)
    });

    // private
    private updateStateField(decorationSet: DecorationSet, tr: Transaction) {
        // If no changes, ignore (except when clicking the edit block button)
        // if(tr.changes.empty) return decorationSet

        // Get - Editor Mode, Decoration Options, Selector Options
        let editor_mode: Editor_mode = this.getEditorMode();
        let decoration_mode: ConfDecoration;
        if (editor_mode == Editor_mode.SOURCE) {
            decoration_mode = this.plugin_this.settings.decoration_source;
        }
        else if (editor_mode == Editor_mode.SOURCE_LIVE) {
            decoration_mode = this.plugin_this.settings.decoration_live;
        }
        else {
            decoration_mode = this.plugin_this.settings.decoration_render;
        }

        // Decoration adjustment (delete, add, modify), prepare for debounce (not debounced)
        // let refreshStrong = this.refreshStrong2.bind(this)

        return this.refreshStrong2(decorationSet, tr, decoration_mode, editor_mode);
    }

    /** Get editor mode */
    private getEditorMode(): Editor_mode {
        let editor_dom: Element | null;
        /** @warning Cannot use editor_dom = document
         * Then editor_dom = editor_dom?.getElementsByClassName("workspace-tabs mod-top mod-active")[0];
         * If you use document, you don't know why it always has attributes like is-live-preview, always think it is real-time mode
         */
        // The type "WorkspaceLeaf" does not have the property "containerEl"
        // Cannot use getActiveViewOfType(MarkdownView) here, it seems that one cannot judge whether the editor mode is source or real-time
        // @ts-ignore
        editor_dom = this.plugin_this.app.workspace.activeLeaf.containerEl;
        if (!editor_dom) {
            console.warn("Cannot get dom to know the editor mode");
            return Editor_mode.NONE;
        }
        editor_dom = editor_dom?.getElementsByClassName("workspace-leaf-content")[0];
        let str = editor_dom?.getAttribute("data-mode");
        if (str == "source") {
            editor_dom = editor_dom?.getElementsByClassName("markdown-source-view")[0];
            if (editor_dom?.classList.contains('is-live-preview')) return Editor_mode.SOURCE_LIVE;
            else return Editor_mode.SOURCE;
        }
        else if (str == "preview") {
            return Editor_mode.PREVIEW; // But actually it will not be judged, because real-time will not trigger the update method
        }
        else {
            /*console.warn("Cannot get editor mode, bugs may occur");*/
            return Editor_mode.NONE;
        } // Click the editor and then click other layout positions, will happen
    }

    /** Get the cursor position in the entire text */
    private getCursorCh() {
        let cursor_from_ch = 0;
        let cursor_to_ch = 0;
        let list_text: string[] = this.editor.getValue().split("\n");
        for (let i = 0; i <= this.editor.getCursor("to").line; i++) {
            if (this.editor.getCursor("from").line == i) { cursor_from_ch = cursor_to_ch + this.editor.getCursor("from").ch; }
            if (this.editor.getCursor("to").line == i) { cursor_to_ch = cursor_to_ch + this.editor.getCursor("to").ch; break; }
            cursor_to_ch += list_text[i].length + 1;
        }
        return {
            from: cursor_from_ch,
            to: cursor_to_ch
        };
    }

    /** Decoration adjustment (delete, add, modify), prepare for debounce
     * Minor refresh: position mapping (refreshed each time)
     * Major refresh: delete all elements and recreate them (avoid frequent major refreshes)
     */
    private refreshStrong2(decorationSet: DecorationSet, tr: Transaction, decoration_mode: ConfDecoration, editor_mode: Editor_mode) {
        let is_current_cursor_in = false;

        // Decoration adjustment - Do not check, just clear all
        if (decoration_mode == ConfDecoration.none) {
            if (decoration_mode != this.prev_decoration_mode) {
                decorationSet = decorationSet.update({
                    filter: (from, to, value) => { return false; }
                });
                this.is_prev_cursor_in = true;
                this.prev_decoration_mode = decoration_mode;
                this.prev_editor_mode = editor_mode;
                return decorationSet;
            }
            else {
                return decorationSet;
            }
        }

        // Decoration adjustment - Check
        let list_add_decoration: Range<Decoration>[] = [];
        const list_rangeSpec: MdSelectorRangeSpec[] = autoMdSelector(this.mdText);
        for (let rangeSpec of list_rangeSpec) {
            let decoration: Decoration;
            // Check cursor position
            const cursorSpec = this.getCursorCh();
            if (cursorSpec.from >= rangeSpec.from_ch && cursorSpec.from <= rangeSpec.to_ch
                || cursorSpec.to >= rangeSpec.from_ch && cursorSpec.to <= rangeSpec.to_ch) {
                decoration = Decoration.mark({ class: "ab-line-yellow" });
                is_current_cursor_in = true;
            }
            else {
                decoration = Decoration.replace({ widget: new ABReplaceWidget(
                    rangeSpec, this.editor
                ) });
            }
            list_add_decoration.push(decoration.range(rangeSpec.from_ch, rangeSpec.to_ch));
        }

        /*const list_abRangeManager:ABMdSelector[] = get_selectors(this.plugin_this.settings).map(c => {
          return new c(this.mdText, this.plugin_this.settings)
        })
        if(decoration_mode==ConfDecoration.inline){       // Line decoration
          for (let abManager of list_abRangeManager){     // Iterate over multiple range managers
            let listRangeSpec: MdSelectorRangeSpec[] = abManager.specKeywords
            for(let rangeSpec of listRangeSpec){          // Iterate over multiple range collections in each range manager
              const decoration: Decoration = Decoration.mark({class: "ab-line-brace"})
              list_add_decoration.push(decoration.range(rangeSpec.from_ch, rangeSpec.to_ch))
            }
          }
        }
        else{                                             // Block decoration
          const cursorSpec = this.getCursorCh()
          for (let abManager of list_abRangeManager){     // Iterate over multiple range managers
            let listRangeSpec: MdSelectorRangeSpec[] = abManager.specKeywords
            for(let rangeSpec of listRangeSpec){          // Iterate over multiple range collections in each range manager
              let decoration: Decoration
              // Check cursor position
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
          )?"Major refresh":"No refresh"
          ,is_current_cursor_in,this.is_prev_cursor_in
          ,decoration_mode,this.prev_decoration_mode
          ,editor_mode,this.prev_editor_mode
        )*/
        if (is_current_cursor_in != this.is_prev_cursor_in
            || decoration_mode != this.prev_decoration_mode
            || editor_mode != this.prev_editor_mode
        ) {
            this.is_prev_cursor_in = is_current_cursor_in;
            this.prev_decoration_mode = decoration_mode;
            this.prev_editor_mode = editor_mode;

            // Decoration adjustment - Delete
            /** @bug mdText here is mdText before modification, cursor position is also delayed */
            decorationSet = decorationSet.update({            // Decrease, delete all
                filter: (from, to, value) => { return false; }
            });
            // Decoration adjustment - Add
            // A bit of nonsense here, but because of the overlapping range, directly passing the list will report an error:
            // Ranges must be added sorted by `from` position and `startSide`
            for (let item of list_add_decoration) {
                decorationSet = decorationSet.update({
                    add: [item]
                });
            }
        }

        // Decoration adjustment - Modify (mapping)
        decorationSet = decorationSet.map(tr.changes);
        return decorationSet;
    }

    /** Debouncer (reusable) */
    /*debouncedFn = this.debounce(this.refreshStrong2, 1000, false)
    private debounce(
      method:any,       // Debouncing method
      wait:number,      // Wait
      immediate:boolean // Whether to execute immediately
    ) {
      let timeout:NodeJS.Timeout|null
      // The debounced function is the return value
      // Use Async/Await to handle asynchronous, if the function is executed asynchronously, wait for setTimeout to complete, get the return value of the original function and return it
      // args are the parameters passed in when the return function is called, passed to method
      let debounced = function(...args: any[]) {
        return new Promise (resolve => {
          // Used to record the original function execution result
          let result
          // Set the method execution result when the timeout is set to null
          // This ensures that it will not be triggered again within wait milliseconds after immediate execution
          // Both conditions for immediate execution, one is that immediate is true, and the other is that timeout is not assigned or set to null
          if (immediate) {
            if (!timeout) {
              timeout = setTimeout(() => {
                timeout = null
              }, wait)
            }
            // If both conditions above are met, execute immediately and record the execution result
            result = method.apply(this, args)
            resolve(result)
          } else {
            // If immediate is false, wait for the function to execute and record the execution result
            // And set the Promise status to fullfilled, so that the function continues to execute
            timeout = setTimeout(() => {
              // args is an array, so use fn.apply
              // Can also be written as method.call(context, ...args)
              result = method.apply(this, args)
              resolve(result)
            }, wait)
          }
        })
      }
    
      // Add cancel method to the returned debounced function
      // debounced.cancel = function() {
      //  clearTimeout(timeout)
      //  timeout = null
      // }
    
      return debounced
    }*/
}
