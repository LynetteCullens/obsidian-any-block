import html2md from 'html-to-md'
import type {
  MarkdownPostProcessorContext,
  MarkdownSectionInformation
} from "obsidian"

import {ABReg} from "src/config/abReg"
import {ConfDecoration, ConfSelect} from "src/config/abSettingTab"
import type AnyBlockPlugin from "../main"
import {ReplaceRender} from "./replaceRenderChild"
import {ABProcessManager} from "src/replace/abProcessorManager"
import { match } from 'assert'

/** Html Processor
 * Possible call locations:
 *   1. Global html will be divided into multiple blocks and will be called once for each block
 *      Multiple line breaks will split blocks, and different block types will also split (even if there is no empty line between them)
 *   2. When rendering locally, it will also be called once for each rendering item (MarkdownRenderer.renderMarkdown method, I feel that the tableextend plugin is also for this reason)
 *      .markdown-rendered content will also be called once (that is, the .ab-note.drop-shadow element in this plugin)
 *   3. It will also be called once when using createEl in the root node (.replaceEl)
  *  4. The state will be cached. If you switch back to edit mode without changes and switch back, it will not be called again.
 * 
 * Overall Logic
 * - Post processor, with the function of restoring to md
 *   - ~~Html selector~~
 *   - Renderer
 * 
 */
export class ABPosthtmlManager{
  static processor(
    this: AnyBlockPlugin,
    el: HTMLElement, 
    ctx: MarkdownPostProcessorContext
  ) {
    // If not enabled in the settings, just turn it off
    if (this.settings.decoration_render==ConfDecoration.none) return

    // Get the source md corresponding to el
    const mdSrc = getSourceMarkdown(el, ctx)
    
    // 1. Call caused by RenderMarkdown (need nested search)
    if (!mdSrc) {
      if (!el.classList.contains("markdown-rendered")) return
      findABBlock_recurve(el)
      // And fix the image error caused by RenderMarkdown
      // fixing_img(el)
    }
    // 2. Block-by-block call in html render mode (need to search across blocks)
    else{
      for (const subEl of el.children) {                          // This is usually only one layer if it is a block, multiple layers should be the case of p-br
        findABBlock_cross(subEl as HTMLElement, ctx)
      }

      // End, enable global selector
      if (mdSrc.to_line==mdSrc.content.split("\n").length){
        findABBlock_global(el, ctx)
        return
      }
      else if (el.classList.contains("mod-footer")){
        findABBlock_global(el, ctx)
        return
      }
    }
  }
}

/** Find ab block - Recursive version 
 * Features
 *  1. Recursive call
 */
function findABBlock_recurve(targetEl: HTMLElement){
  /** @fail The original idea did not work……Here I originally intended to use it to recursively find nested ab blocks,
   * But it seems that it does not work, ctx.getSectionInfo cannot get the start and end positions of the nested el
   * Judge whether there is a header and replace the element */
  /*if(replaceABBlock(targetEl, ctx)) return
  else if(!(targetEl instanceof HTMLPreElement)) {
    for (let targetEl2 of targetEl.children){
      findABBlock(targetEl2 as HTMLElement, ctx)
    }
  }*/

  // replaceABBlock(targetEl, ctx)
  console.log("Ready to re-render", targetEl)
  for(let i=0; i<targetEl.children.length; i++){  // start form 0, because it can be recursive, this layer may not need a header
    const contentEl = targetEl.children[i] as HTMLDivElement
    let headerEl
    headerEl = i==0?null:targetEl.children[i-1] as HTMLElement|null
    
    // Find the main body
    
    /** @todo (The header of the head and tail selector is special, handled separately) */
    /*if (subEl instanceof HTMLParagraphElement){
      const m_headtail = subEl.getText().match(ABReg.reg_headtail)
      if (!m_headtail) return
      
    } */

    if (!(contentEl instanceof HTMLUListElement
      || contentEl instanceof HTMLQuoteElement
      || contentEl instanceof HTMLPreElement
      || contentEl instanceof HTMLTableElement
    )) continue
    
    // Find the header
    console.log("Finding the header")
    if(i==0 || !(headerEl instanceof HTMLParagraphElement)) {
      console.log("No header")
      if(contentEl instanceof HTMLUListElement
        || contentEl instanceof HTMLQuoteElement
      ) findABBlock_recurve(contentEl);
      continue
    }
    const header_match = headerEl.getText().match(ABReg.reg_header)
    if (!header_match) {
      if(contentEl instanceof HTMLUListElement
        || contentEl instanceof HTMLQuoteElement
      ) findABBlock_recurve(contentEl);
      continue
    }
    const header_str = header_match[4]

    // Render
    //const newEl = targetEl.createDiv({cls: "ab-re-rendered"})
    const newEl = document.createElement("div")
    newEl.addClass("ab-re-rendered")
    headerEl.parentNode?.insertBefore(newEl, headerEl.nextSibling)
    ABProcessManager.getInstance().autoABProcessor(newEl, header_str, html2md(contentEl.innerHTML))

    contentEl.hide()
    headerEl.hide()
  }
}

/** Find ab block - Cross-block version
 * Features:
 *  1. Find across AB optimized blocks
 *  2. Only for AB blocks at the root, use MarkdownRenderChild for rendering
 *  3. Only find AB blocks at the root？？？ (Yes, this feature is currently invalid)
 */
function findABBlock_cross(targetEl: HTMLElement, ctx: MarkdownPostProcessorContext){
  if (targetEl instanceof HTMLUListElement
    || targetEl instanceof HTMLQuoteElement
    || targetEl instanceof HTMLPreElement
    || targetEl instanceof HTMLTableElement
  ) {
    replaceABBlock(targetEl, ctx)
  }
}

/** Attempt to convert el
 * Judge whether there is a header and replace the element
 */
function replaceABBlock(targetEl: HTMLElement, ctx: MarkdownPostProcessorContext){
  const range = getSourceMarkdown(targetEl, ctx)
  if (!range || !range.header) return false

  // Syntactic sugar
  if (range.selector=="list"){
    if (range.header.indexOf("2")==0) range.header="list"+range.header
  }

  ctx.addChild(new ReplaceRender(targetEl, range.header, range.content));
}

/** Find AB block - Global selector version, render only once in the same document
 * Failed experience 1:
 *      if (pEl.getAttribute("ab-title-flag")=="true")
 *      pEl.setAttribute("ab-title-flag", "true") // fThis seems to be cleared
 * Failed experience 2:
 *      Later I found that after reaching heading with header, the elements behind pEl.children have not been rendered yet, so naturally it is impossible to determine when to end
 * Failed experience 3:
 *      Finally, I thought of using mod-footer as an end flag, and then enable the global selector
 *      But it seems that not all mod-footer and mod-header will go here, sometimes they go, sometimes they don't, which is annoying. The caching mechanism is also annoying
 *      By the way, I used display:none before, it seems that there are no bugs, but that is high-performance consumption running multiple times, not running globally once... maybe there will be fewer bugs
 * Failed experience 4:
 *      Use the end of getSourceMarkdown to determine whether it is feasible. It seems to be possible, and it is more stable than using mod-footer as a flag
 *      But then I found that there would be bugs if there were spaces at the end, and spaces at the end need to be removed (do not remove the spaces at the beginning, which will be misaligned)
 *      Then there is another pitfall: it seems that some can select pertent, but some cannot. Using document to filter directly will be more stable
 * After modifying based on experience 4, it finally succeeded
 * 
 * Remarks
 * page/pEl is the entire document
 * div/cEl is the root div of the document, the type is always div
 * content/sub/(cEl.children) is something that may be p table and so on
 */
function findABBlock_global(
  el: HTMLElement, 
  ctx: MarkdownPostProcessorContext
){
  // const pEl = el.parentElement    // You cannot get parentElement here
  const pageEl = document.querySelectorAll(".workspace-leaf.mod-active .markdown-preview-section")[0]
  if (!pageEl) return
  let prev_header = ""                // Header information
  let prev_el:HTMLElement|null = null // Select the first heading, which is used to replace it with the repalce block
  let prev_from_line:number = 0       // Start line
  let prev_heading_level:number = 0   // Level of the previous heading
  for (let i=0; i<pageEl.children.length; i++){
    const divEl = pageEl.children[i] as HTMLElement
    if (divEl.classList.contains("mod-header") 
      || divEl.classList.contains("markdown-preview-pusher")) continue
    if (divEl.classList.contains("mod-footer")) break
    // Find the locally processed selector and...
    (()=>{
      if (!divEl.children[0]) return
      const subEl:any = divEl.children[0]
      if (!(subEl instanceof HTMLElement) || !subEl.classList.contains("ab-replace")) return
      // Hide the header block of the local selector
      const divEl_last = pageEl.children[i-1] as HTMLElement
      if (divEl_last.children.length != 1) return
      const subEl_last = divEl_last.children[0]
      if (subEl_last
        && subEl_last instanceof HTMLParagraphElement
        && ABReg.reg_header.test(subEl_last.getText())
      ){
        divEl_last.setAttribute("style", "display: none")
      }
    })()
    if (prev_heading_level == 0) {      // Find the start flag
      if (!divEl.children[0] || !(divEl.children[0] instanceof HTMLHeadingElement)) continue
      const mdSrc = getSourceMarkdown(divEl, ctx)
      if (!mdSrc) continue
      if (mdSrc.header=="") continue
      const match = mdSrc.content.match(ABReg.reg_heading)
      if (!match) continue
      prev_heading_level = match[1].length
      prev_header = mdSrc.header
      prev_from_line = mdSrc.from_line
      prev_el = divEl.children[0] // This is the heading level
      // Hide the header block of the global selector
      const divEl_last = pageEl.children[i-1] as HTMLElement
        if (divEl_last.children.length == 1){
        const contentEl_last = divEl_last.children[0]
        if (contentEl_last
          && contentEl_last instanceof HTMLParagraphElement
          && ABReg.reg_header.test(contentEl_last.getText())
        ){
          divEl_last.setAttribute("style", "display: none")
        }
      }
    }
    else {                            // Find the end flag
      if (!divEl.children[0]){  // .mod-footer will trigger this layer
        divEl.setAttribute("style", "display: none")
        continue
      }
      if (!(divEl.children[0] instanceof HTMLHeadingElement)){
        divEl.setAttribute("style", "display: none")
        continue
      }
      const mdSrc = getSourceMarkdown(divEl, ctx)
      if (!mdSrc) {
        divEl.setAttribute("style", "display: none")
        continue
      }
      const match = mdSrc.content.match(ABReg.reg_heading)
      if (!match){
        divEl.setAttribute("style", "display: none")
        continue
      }
      if (match[1].length >= prev_heading_level){  // 【改】Optional same level
        divEl.setAttribute("style", "display: none")
        continue
      }

      // Render
      const cEl_last = pageEl.children[i-1] as HTMLElement   // Go back to the previous one
      const mdSrc_last = getSourceMarkdown(cEl_last, ctx)
      if (!mdSrc_last) {
        console.warn("An unexpected situation occurred at the end of the heading selector")
        return
      }
      
      const header = prev_header??"md"
      const content = mdSrc_last.content.split("\n")
        .slice(prev_from_line, mdSrc_last.to_line).join("\n");
      if(prev_el) ctx.addChild(new ReplaceRender(prev_el, header, content));

      prev_header = ""
      prev_from_line = 0
      prev_heading_level = 0
      prev_el = null
      i-- /** Go back one step, @bug The header line of the next heading will be hidden by the previous one */
    }
  }
  if (prev_heading_level > 0){ /** End of loop call (@attention Note: There is a .mod-footer, so you cannot use the last one!)*/
    const i = pageEl.children.length-1
    // Render
    const cEl_last = pageEl.children[i-1] as HTMLElement /** @bug There may be bugs, here we directly guess using the second to last */
    const mdSrc_last = getSourceMarkdown(cEl_last, ctx)
    if (!mdSrc_last) {
      console.warn("An unexpected situation occurred at the end of the heading selector")
      return
    }
    const header = prev_header??"md"
    const content = mdSrc_last.content.trim().split("\n")
      .slice(prev_from_line, mdSrc_last.to_line).join("\n");
    if(prev_el) ctx.addChild(new ReplaceRender(prev_el, header, content));
  }
}

interface HTMLSelectorRangeSpec {
  from_line: number,// Replacement range
  to_line: number,  // .
  header: string,   // Header information
  selector: string, // Selector (range selection method)
  content: string,  // Content information (trailing spaces removed)
  prefix: string,
}
/** Restore html back to md format
 * Called by processTextSection
 * @returns Three results
 *  1. Failed to get info: return null
 *  2. Get info successfully, meet ab block condition: return HTMLSelectorRangeSpec
 *  3. Get info successfully, do not meet ab block:  Return HTMLSelectorRangeSpec, but header is ""
 */
function getSourceMarkdown(
  sectionEl: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): HTMLSelectorRangeSpec|null {
  let info = ctx.getSectionInfo(sectionEl);     // info: MarkdownSectionInformation | null
  if (info) {
    let range:HTMLSelectorRangeSpec = {
      from_line: 0,
      to_line: 1,
      header: "",
      selector: "none",
      content: "",
      prefix: ""
    }

    // Basic information
    const { text, lineStart, lineEnd } = info;  // Respectively: Full document, start line of div, end line of div (end line is included, +1 is not included)
    const list_text = text.replace(/(\s*$)/g,"").split("\n")
    const list_content = list_text.slice(lineStart, lineEnd + 1)   // @attension Remove trailing spaces otherwise is_end cannot be judged, spaces at the beginning cannot be removed otherwise it will be misaligned
    range.from_line = lineStart
    range.to_line = lineEnd+1
    range.content = list_content.join("\n");

    // Find type, find prefix
    if (sectionEl instanceof HTMLUListElement) {
      range.selector = "list"
      const match = list_content[0].match(ABReg.reg_list)
      if (!match) return range
      else range.prefix = match[1]
    }
    else if (sectionEl instanceof HTMLQuoteElement) {
      range.selector = "quote"
      const match = list_content[0].match(ABReg.reg_quote)
      if (!match) return range
      else range.prefix = match[1]
    }
    else if (sectionEl instanceof HTMLPreElement) {
      range.selector = "code"
      const match = list_content[0].match(ABReg.reg_code)
      if (!match) return range
      else range.prefix = match[1]
    }
    else if (sectionEl instanceof HTMLHeadingElement) {
      range.selector = "heading"
      const match = list_content[0].match(ABReg.reg_heading)
      if (!match) return range
      else range.prefix = match[1]
    }
    else if (sectionEl instanceof HTMLTableElement) {
      range.selector = "heading"
      const match = list_content[0].match(ABReg.reg_table)
      if (!match) return range
      else range.prefix = match[1]
    }

    // Find the header header
    /** @todo Need to rewrite, on the one hand, the header may be in the previous two lines */
    if (lineStart==0) return range
    if (list_text[lineStart-1].indexOf(range.prefix)!=0) return range
    const match_header = list_text[lineStart-1].replace(range.prefix, "").match(ABReg.reg_header)
    if (!match_header) return range
    
    // (Must be the last step, judge whether it is an ab block by the presence or absence of header)
    range.header = match_header[4]
    return range
  }
  // console.warn("Failed to get MarkdownSectionInformation, there may be bugs") // It will actually return void, there should be no bugs
  return null
};
