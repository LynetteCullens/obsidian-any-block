import { MarkdownRenderer, MarkdownRenderChild, } from 'obsidian'
import mermaid from "mermaid"
import {getID} from "src/utils/utils"
import { ABReg } from 'src/config/abReg'

import GeneratorBranchTable from "src/svelte/GeneratorBranchTable.svelte"
import GeneratorListTable from "src/svelte/GeneratorListTable.svelte"
import GeneratorTab from "src/svelte/GeneratorTab.svelte"

// Common list data, one element equals one list item
interface ListItem {
  content: string;        // Content
  level: number;          // Level
}[]
export type List_ListItem = ListItem[]
// Common table data, one element equals one cell item
interface TableItem extends ListItem{
  tableRow: number,       // Number of rows spanned
  tableLine: number       // Corresponding first line sequence
}
export type List_TableItem = TableItem[]

export class ListProcess{

  /** Title to list */
  static title2list(text: string, div: HTMLDivElement) {
    let list_itemInfo = this.title2data(text)
    list_itemInfo = this.data2strict(list_itemInfo)
    return this.data2list(list_itemInfo)
  }

  /** List to table */
  static list2table(text: string, div: HTMLDivElement, modeT=false) {
    let list_itemInfo = this.list2data(text)
    return this.data2table(list_itemInfo, div, modeT)
  }

  /** List to list */
  /*static list2l(text: string, div: HTMLDivElement) {
    let list_itemInfo = this.list2data(text, true)
    return this.data2list(list_itemInfo)
  }*/

  /** List to list table */
  static list2lt(text: string, div: HTMLDivElement, modeT=false) {
    let list_itemInfo = this.list2data(text, true)
    return this.uldata2ultable(list_itemInfo, div, modeT)
  }

  /** List to folder tree */
  static list2folder(text: string, div: HTMLDivElement, modeT=false) {
    let list_itemInfo = this.list2data(text, true)
    return this.uldata2ultable(list_itemInfo, div, modeT, true)
  }

  /** List to two-dimensional table */
  static list2ut(text: string, div: HTMLDivElement, modeT=false) {
    //【old】
    /*let list_itemInfo = this.old_ulist2data(text)
    return this.data2table(list_itemInfo, div)*/
    //【new】
    let data = this.list2data(text)
    data = this.data_mL_2_2L(data)
    data = this.data_2L_2_mL1B(data)
    return this.data2table(data, div, modeT)
  }

  /** First-level list to timeline */
  static list2timeline(text: string, div: HTMLDivElement, modeT=false) {
    let data = this.list2data(text)
    data = this.data_mL_2_2L(data)
    return this.data2table(data, div, modeT)
  }

  /** First-level list to tab bar */
  static list2tab(text: string, div: HTMLDivElement, modeT=false) {
    let data = this.list2data(text)
    data = this.data_mL_2_2L1B(data)
    return this.data2tab(data, div, modeT)
  }

  /** List to mermaid flowchart */
  static list2mermaid(text: string, div: HTMLDivElement) {
    let list_itemInfo = this.list2data(text)
    return this.data2mermaid(list_itemInfo, div)
  }

  /** List to mermaid mind map */
  static list2mindmap(text: string, div: HTMLDivElement) {
    let list_itemInfo = this.list2data(text)
    return this.data2mindmap(list_itemInfo, div)
  }

  /** Remove inline from list */
  static listXinline(text: string){
    const data = this.list2data(text)
    return this.data2list(data)
  }

  /** Convert list text to list data 
   *  @bug Cannot cross indentation, fix abnormal indentation later
   *  @bug Inline line break ` | ` may have bugs
   *  @param modeT: Keep indentation mode
   *  @param modeG: Recognize symbol ` | ` (this option is currently unavailable, 0 for not recognizing, 1 for recognizing as next level, 2 for recognizing as the same level, used when converting ultable)
   */
  private static list2data(text: string, modeT=false, modeG=true){
    if (modeT) return this.ullist2data(text)

    /** Inline compensation list. Only keep items where comp>0 */
    let list_inline_comp:{
      level:number,
      inline_comp:number
    }[] = []
    /** Update the status of list_level_inline and return the compensation value of this item 
     * Process: Trace back to the left first, then add yourself in
     */
    function update_inline_comp(
      level:number, 
      inline_comp:number
    ): number{
      // Completely skip if you don't use the ` | ` command
      if (list_inline_comp.length==0 && inline_comp==0) return 0

      // Trace back to the left (when on the left) until you are on the right of the compensation list
      while(list_inline_comp.length && list_inline_comp[list_inline_comp.length-1].level>=level){
        list_inline_comp.pop()
      }
      if (list_inline_comp.length==0 && inline_comp==0) return 0 // Exit early

      // Calculate the total compensation value (excluding yourself)
      let total_comp
      if (list_inline_comp.length==0) total_comp = 0
      else total_comp = list_inline_comp[list_inline_comp.length-1].inline_comp

      // Add yourself in
      if (inline_comp>0) list_inline_comp.push({
        level: level, 
        inline_comp: inline_comp+total_comp
      })

      return total_comp
    }

    // Convert list text to list data
    let list_itemInfo:List_ListItem = []

    const list_text = text.split("\n")
    for (let line of list_text) {                                             // Each line
      const m_line = line.match(ABReg.reg_list_noprefix)
      if (m_line) {
        let list_inline: string[] = m_line[4].split("| ") // Inline line break
        /** @bug  Tab length is 1, not 4 */
        let level_inline: number = m_line[1].length
        let inline_comp = update_inline_comp(level_inline, list_inline.length-1)
                                                                              // Do not keep indentation (normal tree table)
        for (let index=0; index<list_inline.length; index++){
          list_itemInfo.push({
            content: list_inline[index],
            level: level_inline+index+inline_comp
          })
        }
      }
      else{                                                                   // Inline line break
        let itemInfo = list_itemInfo.pop()
        if(itemInfo){
          list_itemInfo.push({
            content: itemInfo.content+"\n"+line.trim(),
            level: itemInfo.level
          })
        }
      }
    }
    return list_itemInfo
  }

  // Convert heading outline to list data (@todo The level of the main text +10, need to subtract)
  private static title2data(text: string){
    let list_itemInfo:List_ListItem = []

    const list_text = text.split("\n")
    let mul_mode:string = ""      // Multi-line mode, para or list or title or empty
    for (let line of list_text) {
      const match_heading = line.match(ABReg.reg_heading_noprefix)
      const match_list = line.match(ABReg.reg_list_noprefix)
      if (match_heading && !match_heading[1]){                // 1. Heading level (only recognize at the root)
        removeTailBlank()
        list_itemInfo.push({
          content: match_heading[4],
          level: match_heading[1].length-10
        })
        mul_mode = "title"
      }
      else if (match_list && !match_list[1]){                 // 2. List level (only recognize at the root)
        removeTailBlank()
        list_itemInfo.push({
          content: match_list[4],
          level: match_list[1].length+1//+10
        })
        mul_mode = "list"
      }
      else if (/^\S/.test(line) && mul_mode=="list"){         // 3. Indentation and at list level
        list_itemInfo[list_itemInfo.length-1].content = list_itemInfo[list_itemInfo.length-1].content+"\n"+line
      }
      else {                                                  // 4. Main text level
        if (mul_mode=="para") {
          list_itemInfo[list_itemInfo.length-1].content = list_itemInfo[list_itemInfo.length-1].content+"\n"+line
        }
        else if(/^\s*$/.test(line)){
          continue
        }
        else{
          list_itemInfo.push({
            content: line,
            level: 0//+10
          })
          mul_mode = "para"
        }
      }
    }
    removeTailBlank()
    return list_itemInfo

    function removeTailBlank(){
      if (mul_mode=="para"||mul_mode=="list"){
        list_itemInfo[list_itemInfo.length-1].content = list_itemInfo[list_itemInfo.length-1].content.replace(/\s*$/, "")
      }
    }
  }

  // This type of list only has two levels
  private static old_ulist2data(text: string){
    // Convert list text to list data
    let list_itemInfo:List_ListItem = []

    let level1 = -1
    let level2 = -1
    const list_text = text.split("\n")
    for (let line of list_text) {                                             // Each line
      const m_line = line.match(ABReg.reg_list_noprefix)
      if (m_line) {
        let level_inline: number = m_line[1].length
        let this_level: number                                    // There are three possibilities in total: 1, 2, 3, 3 represents other levels
        if (level1<0) {level1=level_inline; this_level = 1}       // Level 1 not configured
        else if (level1>=level_inline) this_level = 1             // Is level 1
        else if (level2<0) {level2=level_inline; this_level = 2}  // Level 2 not configured
        else if (level2>=level_inline) this_level = 2             // Is level 2
        else {                                                    // Inline line break
          let itemInfo = list_itemInfo.pop()
          if(itemInfo){
            list_itemInfo.push({
              content: itemInfo.content+"\n"+line.trim(),
              level: itemInfo.level
            })
          }
          continue
        }
        list_itemInfo.push({
          content: m_line[4],
          level: this_level
        })
      }
      else{                                                                   // Inline line break
        let itemInfo = list_itemInfo.pop()
        if(itemInfo){
          list_itemInfo.push({
            content: itemInfo.content+"\n"+line.trim(),
            level: itemInfo.level
          })
        }
      }
    }

    // Convert two-level tree to one-pronged tree
    let count_level_2 = 0
    for (let item of list_itemInfo){
      if (item.level==2){
        item.level += count_level_2
        count_level_2++
      }
      else {
        count_level_2 = 0
      }
    }
    
    return list_itemInfo
  }

  /** Convert list text to list table data
   * Can only implement cross-column through "|" symbol
   * So this does not have merged cells
   * 
   * The level of the first column is always 0
   */
  private static ullist2data(text: string){
    let list_itemInfo:List_ListItem = []
    
    const list_text = text.split("\n")
    for (let line of list_text) {                                             // Each line
      const m_line = line.match(ABReg.reg_list_noprefix)
      if (m_line) {
        let list_inline: string[] = m_line[4].split("| ") // Inline line break
        let level_inline: number = m_line[1].length
                                                                              // Keep indentation (list table)
        for (let inline_i=0; inline_i<list_inline.length; inline_i++){
          if(inline_i==0) {                                                   // level is inline indentation
            for (let i=0; i<level_inline; i++) list_inline[inline_i] = "  " + list_inline[inline_i]
            list_itemInfo.push({
              content: list_inline[inline_i],
              level: 0
            })
          }
          else{                                 // level is the number of table columns
            list_itemInfo.push({
              content: list_inline[inline_i],
              level: level_inline+inline_i
            })
          }
        }
      }
      else{                                                                   // Inline line break
        let itemInfo = list_itemInfo.pop()
        if(itemInfo){
          list_itemInfo.push({
            content: itemInfo.content+"\n"+line.trim(),
            level: itemInfo.level
          })
        }
      }
    }
    return list_itemInfo
  }

  /** Make list data strict */
  private static data2strict(
    list_itemInfo: List_ListItem
  ){
    let list_prev_level:number[] = [-999]
    let list_itemInfo2:{content:string, level:number}[] = []
    for (let itemInfo of list_itemInfo){
      // Find the position in list_prev_level and save it in new_level
      let new_level = 0
      for (let i=0; i<list_prev_level.length; i++){
        if (list_prev_level[i]<itemInfo.level) continue // Shift to the right
        else if(list_prev_level[i]==itemInfo.level){    // Stop and discard the old data on the right
          list_prev_level=list_prev_level.slice(0,i+1)
          new_level = i
          break
        }
        else {                                          // Between the two, then treat this level as the one on the right, and discard the old data on the right
          list_prev_level=list_prev_level.slice(0,i)
          list_prev_level.push(itemInfo.level)
          new_level = i
          break
        }
      }
      if (new_level == 0) { // End of loop call
        list_prev_level.push(itemInfo.level)
        new_level = list_prev_level.length-1
      }
      // Update the list data. Deep copy is needed here instead of directly modifying the original array, which is convenient for debugging and avoiding errors
      list_itemInfo2.push({
        content: itemInfo.content,
        level: (new_level-1)*2 // Remember to calculate the level and subtract the placeholder element with sequence 0
      })
    }
    return list_itemInfo2
  }

  /** Convert multi-level tree to two-level one-pronged tree
   * example:
   * - 1
   *  - 2
   *   - 3
   *  - 2
   * to:
   * - 1
   *  - 2\n   - 3\n  - 2
   */
  private static data_mL_2_2L1B(
    list_itemInfo: List_ListItem
  ){
    let list_itemInfo2: List_ListItem = []
    let level1 = -1
    let level2 = -1
    let flag_leve2 = false  // Indicates that level 2 has been triggered, and it will be reset when level 1 is encountered
    for (let itemInfo of list_itemInfo) {
      if (level1<0) {                                             // Level 1 not configured
        level1=0//itemInfo.level;
      }
      if (level1>=itemInfo.level){                                // Is level 1
        list_itemInfo2.push({
          content: itemInfo.content.trim(),
          level: level1
        })
        flag_leve2 = false
        continue
      }
      if (level2<0) {                                             // Level 2 not configured
        level2=1//itemInfo.level;
      }
      if (true){                                                  // Is level 2/level 2+/level 2-
        if (!flag_leve2){                                           // New
          list_itemInfo2.push({
            content: itemInfo.content.trim(),
            level: level2
          })
          flag_leve2 = true
          continue
        }
        else {                                                      // Inline line break
          let old_itemInfo = list_itemInfo2.pop()
          if(old_itemInfo){
            let new_content = itemInfo.content.trim()
            if (itemInfo.level>level2) new_content = "- "+new_content
            for (let i=0; i<(itemInfo.level-level2); i++) new_content = " "+new_content;
            new_content = old_itemInfo.content+"\n"+new_content
            list_itemInfo2.push({
              content: new_content,
              level: level2
            })
          }
        }
      }
    }
    return list_itemInfo2
  }

  /** Convert multi-level tree to two-level tree
   * example:
   * - 1
   *  - 2
   *   - 3
   *  - 2
   * to:
   * - 1
   *  - 2\n   - 3
   *  - 2
   */
  private static data_mL_2_2L(
    list_itemInfo: List_ListItem
  ){
    let list_itemInfo2: List_ListItem = []
    let level1 = -1
    let level2 = -1
    for (let itemInfo of list_itemInfo) {
      if (level1<0) {                                             // Level 1 not configured
        level1=0//itemInfo.level;
      }
      if (level1>=itemInfo.level){                                // Is level 1
        list_itemInfo2.push({
          content: itemInfo.content.trim(),
          level: level1
        })
        continue
      }
      if (level2<0) {                                             // Level 2 not configured
        level2=1//itemInfo.level;
      }
      if (level2>=itemInfo.level){                                // Is level 2/level 2-
        list_itemInfo2.push({
          content: itemInfo.content.trim(),
          level: level2
        })
        continue
      }
      else{                                                       // level 2+, Inline line break                                                     // 
        let old_itemInfo = list_itemInfo2.pop()
        if(old_itemInfo){
          let new_content = itemInfo.content.trim()
          if (itemInfo.level>level2) new_content = "- "+new_content
          for (let i=0; i<(itemInfo.level-level2); i++) new_content = " "+new_content;
          new_content = old_itemInfo.content+"\n"+new_content
          list_itemInfo2.push({
            content: new_content,
            level: level2
          })
        }
      }
    }
    return list_itemInfo2

    /*
    let list_itemInfo2: {content: string;level: number;}[] = []
    let level1 = -1
    let level2 = -1
    for (let itemInfo of list_itemInfo) {
      let this_level: number                                      // There are three possibilities in total: 0, 1, (1+)表
      if (level1<0) {level1=itemInfo.level; this_level = level1}  // Level 1 not configured
      else if (level1>=itemInfo.level) this_level = level1        // Is level 1
      else if (level2<0) {level2=itemInfo.level; this_level = level2}  // Level 2 not configured
      else if (level2>=itemInfo.level) this_level = level2             // Is level 2
      else { // (level2<itemInfo.level)                           // Still level 2, but perform inline line break, and add list symbols and indentation back
        let old_itemInfo = list_itemInfo2.pop()
        if(old_itemInfo){
          let new_content = "- "+itemInfo.content.trim()
          for (let i=0; i<(itemInfo.level-level2); i++) new_content = " "+new_content;
          new_content = old_itemInfo.content+"\n"+new_content
          list_itemInfo2.push({
            content: new_content,
            level: level2
          })
        }
        continue
      }
      list_itemInfo2.push({
        content: itemInfo.content.trim(),
        level: level2
      })
    }
    console.log("前后数据", list_itemInfo, list_itemInfo2)
    return list_itemInfo2*/
  }

  /** Convert two-level tree to multi-level one-pronged tree 
   * example:
   * - 1
   *  - 2
   *  - 3
   * to:
   * - 1
   *  - 2
   *   - 3
   */
  private static data_2L_2_mL1B(
    list_itemInfo: List_ListItem
  ){
    let list_itemInfo2:List_ListItem = []
    let count_level_2 = 0
    for (let item of list_itemInfo){
      if (item.level!=0){                     // In the second level, increase the level one by one
        // item.level += count_level_2
        list_itemInfo2.push({
          content: item.content,
          level: item.level+count_level_2
        })
        count_level_2++
      }
      else {                                  // In the first level
        list_itemInfo2.push({
          content: item.content,
          level: item.level
        })
        count_level_2 = 0
      }
    }
    return list_itemInfo2
  }

  /** Convert list data to table */
  private static data2table(
    list_itemInfo: List_ListItem, 
    div: HTMLDivElement,
    modeT: boolean        // Whether to transpose
  ){
    // Assemble into table data (list is depth-first)
    let list_tableInfo:List_TableItem = []
    let prev_line = -1   // And store the sequence of the next line!
    let prev_level = 999 // Level of the previous line
    for (let i=0; i<list_itemInfo.length; i++){
      let item = list_itemInfo[i]
      
      // Get the number of rows spanned
      let tableRow = 1
      let row_level = list_itemInfo[i].level
      for (let j=i+1; j<list_itemInfo.length; j++) {
        if (list_itemInfo[j].level > row_level){                  // On the right, do not wrap
          row_level = list_itemInfo[j].level
        }
        else if (list_itemInfo[j].level > list_itemInfo[i].level){// Wrap but don't wrap the item line
          row_level = list_itemInfo[j].level
          tableRow++
        }
        else break                                                // Wrap item line
      }

      // Get the row number. Divide into wrapping (create a new row) and not wrapping, the first row always creates a new row
      // if here means that it should be wrapped
      if (item.level <= prev_level) {
        prev_line++
      }
      prev_level = item.level

      // Fill in
      list_tableInfo.push({
        content: item.content,  // Content
        level: item.level,      // Level
        tableRow: tableRow,     // Number of rows spanned
        tableLine: prev_line    // Corresponding first line sequence
      })
    }
    new GeneratorBranchTable({
      target: div,
      props: {
        list_tableInfo: list_tableInfo,
        modeT: modeT,
        prev_line: prev_line
      }
    })
    return div
  }

  /** Convert list table data to list table
   * Note that the list data passed in should conform to:
   * The level of the first column is 0, and there is no branching
   */
  private static uldata2ultable(
    list_itemInfo: List_ListItem, 
    div: HTMLDivElement,
    modeT: boolean,
    is_folder=false
  ){
    // Assemble into table data (list is depth-first)
    let tr_line_level = [] // Table row level (unique to tree table)
    let list_tableInfo:List_TableItem = []
    let prev_line = -1   // And store the sequence of the next line!
    let prev_level = 999 // Level of the previous line
    for (let i=0; i<list_itemInfo.length; i++){
      let item = list_itemInfo[i]
      let item_type:string = ""

      // Get the row number. Divide into wrapping (create a new row) and not wrapping, the first row always creates a new row
      // if here means that it should be wrapped
      if (item.level <= prev_level) {
        prev_line++
        if (item.level==0) {
          /** @可优化 The previous one is to convert the list level to spaces, and now it is to remove spaces and convert back to the list level. This is limited by the Item format */
          const matchs = item.content.match(/^(( )*)/)
          if (!matchs) return div
          if (!matchs[1]) tr_line_level.push(0)
          else tr_line_level.push(Math.round(matchs[1].length/6))
          item.content = item.content.replace(/^(( )*)/, "")
          
          // Determine the file format from the string prefix
          if(is_folder){
            const matchs = item.content.match(/^(=|~) /)
            // No type/file type that does not display icons
            if (!matchs){}
            // Folder
            else if (matchs[1]=="= "){
              item_type = "folder"
              item.content = item.content.replace(/^\= /, "")
            }
            // Decide based on the suffix name
            else if(matchs[1]="~ "){
              const m_line = item.content.match(/^\~(.*)\.(.*)/)
              if(!m_line) {}
              else {
                item_type = m_line[2]
              }
              item.content = item.content.replace(/^\~ /, "")
            }
          }
        }
        else {
          tr_line_level.push(0)
          console.warn("Data error: Cross-row data in list table")
        }
      }
      prev_level = item.level

      // Fill in
      list_tableInfo.push({
        content: item.content,
        level: item.level,
        tableRow: 1,
        tableLine: prev_line
      })
    }

    new GeneratorListTable({
      target: div,
      props: {
        list_tableInfo: list_tableInfo,
        modeT: modeT,
        prev_line: prev_line,
        tr_line_level: tr_line_level,
        is_folder: is_folder
      }
    })
    return div
  }

  /** Convert list data to list (it looks like farting in the ass, but sometimes debugging will need it)
   * There is another clever use: list2data + data2list = listXinline
   */
  private static data2list(
    list_itemInfo: List_ListItem
  ){
    let list_newcontent:string[] = []
    // Content processing in each level
    for (let item of list_itemInfo){
      // Convert level to indentation, and convert "\n" (use <br> like mindmap syntax here, need to convert line break to indentation)
      let str_indent = ""
      for(let i=0; i<item.level; i++) str_indent+= " "
      let list_content = item.content.split("\n")
      for (let i=0; i<list_content.length; i++) {
        if(i==0) list_newcontent.push(str_indent+"- "+list_content[i])
        else list_newcontent.push(str_indent+"  "+list_content[i])
      }
    }
    const newcontent = list_newcontent.join("\n")
    return newcontent
  }

  /** Convert list data to tab bar */
  private static data2tab(
    list_itemInfo: List_ListItem, 
    div: HTMLDivElement,
    modeT: boolean
  ){
    new GeneratorTab({
      target: div,
      props: {
        list_itemInfo: list_itemInfo,
        modeT: modeT
      }
    })
    return div
  }

  /** Convert list data to mermaid flowchart
   * ~~@bug Old version bug (mermaid not built-in) will flash~~ 
   * Then note that mermaid (item) cannot have spaces, or illegal characters. I have dealt with spaces, I don't care about characters for now. Forget it, I'll still not deal with spaces
   */
  private static data2mermaid(
    list_itemInfo: List_ListItem, 
    div: HTMLDivElement
  ){
    const html_mode = false    // @todo No settings to switch this switch yet

    let list_line_content:string[] = ["graph LR"]
    // let list_line_content:string[] = html_mode?['<pre class="mermaid">', "graph LR"]:["```mermaid", "graph LR"]
    let prev_line_content = ""
    let prev_level = 999
    for (let i=0; i<list_itemInfo.length; i++){
      if (list_itemInfo[i].level>prev_level){ // Normal addition of arrows to the right
        prev_line_content = prev_line_content+" --> "+list_itemInfo[i].content//.replace(/ /g, "_")
      } else {                                // Wrap, and...
        list_line_content.push(prev_line_content)
        prev_line_content = ""

        for (let j=i; j>=0; j--){             // Back up to the previous one that is larger than itself
          if(list_itemInfo[j].level<list_itemInfo[i].level) {
            prev_line_content = list_itemInfo[j].content//.replace(/ /g, "_")
            break
          }
        }
        if (prev_line_content) prev_line_content=prev_line_content+" --> "  // If there is a larger one
        prev_line_content=prev_line_content+list_itemInfo[i].content//.replace(/ /g, "_")
      }
      prev_level = list_itemInfo[i].level
    }
    list_line_content.push(prev_line_content)
    // list_line_content.push(html_mode?"</pre>":"```")

    let text = list_line_content.join("\n")

    //const child = new MarkdownRenderChild(div);
    // div.addClass("markdown-rendered")
    //MarkdownRenderer.renderMarkdown(text, div, "", child);
    
    mermaid.mermaidAPI.renderAsync("ab-mermaid-"+getID(), text, (svgCode:string)=>{
      div.innerHTML = svgCode
    })
    
    return div
  }

  /** Convert list data to mermaid mind map */
  private static data2mindmap(
    list_itemInfo: List_ListItem, 
    div: HTMLDivElement
  ){
    let list_newcontent:string[] = []
    for (let item of list_itemInfo){
      // Convert level to indentation, and convert "\n" to <br/>
      let str_indent = ""
      for(let i=0; i<item.level; i++) str_indent+= " "
      list_newcontent.push(str_indent+item.content.replace("\n","<br/>"))
    }
    const newcontent = "mindmap\n"+list_newcontent.join("\n")
    mermaid.mermaidAPI.renderAsync("ab-mermaid-"+getID(), newcontent, (svgCode:string)=>{
      div.innerHTML = svgCode
    })
    return div
  }

  /** Convert list data to timeline */
  /*private static data2timeline(
    list_itemInfo: List_ListInfo, 
    div: HTMLDivElement
  ){
    
  }*/
}
