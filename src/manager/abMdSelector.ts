/** MD Selector
 * Old scheme
 *  - Each selector selects the entire text once
 *  - Disadvantages: Selection areas of different selectors may overlap
 *    Logic is unclear
 *    The previous layer needs to get the selector list and then traverse it in the previous layer
 * New scheme (v1.4.0)
 *  - Each line matches all selectors once
 *  - Advantages: Selection areas of different selectors will not overlap, the number of judgments remains unchanged, and the entire text is only traversed once
 *    Logic is clearer
 *    Internal handling of the selector list, better encapsulation
 *  - Design
 *    Similar interface to abProceesor
 */

/** Similar to automatic processors, but does not require so much
 * 
 * Automatic Selector (only md version, html logic is different, it distinguishes between local and global selectors):
 *  - Automatic selection (using list)
 *  - Selector registration interface and function (one version)
 *  - Has return type interface
 * 
 * Automatic Processor:
 *  - Automatic processing (using list)
 *  - Processor registration interface and function (three versions)
 *  - No return type interface
 *  - Information overview table
 */
export function autoMdSelector(
  mdText: string = "",      // Full text
  // setting: ABSettingInterface,
):MdSelectorRangeSpec[]{
  let list_mdSelectorRangeSpec:MdSelectorRangeSpec[] = []
  let list_text:string[] = mdText.split("\n")

  /** Line number - total_ch mapping table
   * The length of this table is the line number+1
   * map_line_ch[i] = the position at the beginning of line i in the sequence
   * map_line_ch[i+1]-1 = the position at the end of line i in the sequence
   */
  // Create line-ch mapping table
  let map_line_ch: number[] = [0]
  let count_ch = 0
  for (let line of list_text){
    count_ch = count_ch + line.length + 1
    map_line_ch.push(count_ch)
  }
  // Traverse the entire text as multiple AB block selection ranges
  for (let i=0; i<list_text.length; i++){
    const line = list_text[i]
    for (let selecotr of list_mdSelector){
      if (selecotr.match.test(line)) {
        let sim:MdSelectorRangeSpecSimp|null = selecotr.selector(list_text, i)
        if (!sim) continue
        // Syntactic sugar
        if (sim.selector=="list") if (sim.header.indexOf("2")==0) sim.header="list"+sim.header
        if (sim.selector=="title") {
          if (sim.header.indexOf("2")==0) sim.header="title"+sim.header
          else if(sim.header.indexOf("list")==0) sim.header="title2list|"+sim.header
        }
        // Line to ch
        list_mdSelectorRangeSpec.push({
          from_ch: map_line_ch[sim.from_line],
          to_ch: map_line_ch[sim.to_line]-1,
          header: sim.header, 
          selector: sim.selector,
          content: sim.content,
          prefix: sim.prefix,
        })
        i = sim.to_line-1
        break
      }
    }
  }
  return list_mdSelectorRangeSpec
}

/** Selector overview table - All information */
export function generateSelectorInfoTable(el: HTMLElement){
  const table_p = el.createEl("div",{
    cls: ["ab-setting","md-table-fig1"]
  })
  const table = table_p.createEl("table",{
    cls: ["ab-setting","md-table-fig2"]
  })
  {
    const thead = table.createEl("thead")
    const tr = thead.createEl("tr")
    tr.createEl("td", {text: "Selector Name"})
    tr.createEl("td", {text: "First Line Regular Expression"})
    tr.createEl("td", {text: "Is Enabled"})
  }
  const tbody = table.createEl("tbody")
  for (let item of list_mdSelector){
    const tr = tbody.createEl("tr")
    tr.createEl("td", {text: item.name})
    tr.createEl("td", {text: String(item.match)})
    tr.createEl("td", {text: item.is_disable?"Disabled":"Enabled"})
  }
  return table_p
}

/** Selector range - Strict version */
export interface MdSelectorRangeSpec {
  from_ch: number,  // Replacement range
  to_ch: number,    // .
  header: string,   // Header information
  selector: string, // Selector (range selection method)
  content: string,  // Content information
  prefix: string,
}
/** Selector range - Simple version */
export interface MdSelectorRangeSpecSimp {
  from_line: number,// Replacement range
  to_line: number,  // .
  header: string,   // Header information
  selector: string, // Selector (range selection method)
  levelFlag: string,// (Used to judge code symbol or heading level)
  content: string,  // Content information
  prefix: string,
}
/** md selector - Registered version */
export interface MdSelectorSpecSimp{
  id: string
  name: string
  match: RegExp
  detail?: string
  selector: (
    list_text: string[],    // Full text
    from_line: number,        // From which line to start searching
    // confSelect: ConfSelect    // Selector configuration
  )=>MdSelectorRangeSpecSimp|null // Return a MdSelectorRangeSpec. Then the line number of the iterator should jump to the `to` inside to continue looping
}
/** md selector - Strict version */
export interface MdSelectorSpec extends MdSelectorSpecSimp{
  is_disable: boolean
}
/** md selector list */
export let list_mdSelector: MdSelectorSpec[] = []
export function registerMdSelector (simp:MdSelectorSpecSimp){
  list_mdSelector.push({
    id: simp.id,
    name: simp.name,
    match: simp.match,
    detail: simp.detail??"",
    selector: simp.selector,
    is_disable: false
  })
}

// Configure return list
/*export function get_selectors(setting: ABSettingInterface){
  let list_ABMdSelector:any[]=[]
  // if (setting.select_list!=ConfSelect.no) list_ABMdSelector.push(map_ABMdSelector.get("list"))
  // if (setting.select_quote!=ConfSelect.no) list_ABMdSelector.push(map_ABMdSelector.get("quote"))
  // if (setting.select_code!=ConfSelect.no) list_ABMdSelector.push(map_ABMdSelector.get("code"))
  if (setting.select_brace!=ConfSelect.no) list_ABMdSelector.push(ABMdSelector_brace)
  if (setting.select_list!=ConfSelect.no) list_ABMdSelector.push(ABMdSelector_list)
  if (setting.select_quote!=ConfSelect.no) list_ABMdSelector.push(ABMdSelector_quote)
  if (setting.select_code!=ConfSelect.no) list_ABMdSelector.push(ABMdSelector_code)
  if (setting.select_heading!=ConfSelect.no) list_ABMdSelector.push(ABMdSelector_heading)
  return list_ABMdSelector
}*/

/** AnyBlock range manager
 * A piece of text can generate an instance, which is mainly responsible for returning the RangeSpec type
 * One-time use
 */
