/** MD Selector
 * Old Approach
 *  - Each selector scans the entire document once.
 *  - Drawbacks: Selection areas of different selectors may overlap.
 *    Lack of clear logic.
 *    The layer above needs to fetch the selector list and iterate over it.
 * New Approach (v1.4.0)
 *  - Each line matches all selectors once.
 *  - Advantages: Selection areas of different selectors do not overlap, the number of checks remains the same, only one full document traversal.
 *    Clearer logic.
 *    Internally handles the selector list, better encapsulation.
 *  - Design
 *    Selected an interface similar to abProcessor.
 */

/** Similar to auto processors, but requires less complexity.
 * 
 * Auto Selector (MD version only, HTML logic differs, distinguishes between local and global selectors):
 *  - Automatic selection (using lists).
 *  - Selector registration interface and function (single version).
 *  - Interface with return type.
 * 
 * Auto Processor:
 *  - Automatic processing (using lists).
 *  - Processor registration interface and function (three versions).
 *  - Interface without return type.
 *  - Information overview table.
 */
export function autoMdSelector(
  mdText: string = "",      // Full text
  // setting: ABSettingInterface,
): MdSelectorRangeSpec[]{
  let list_mdSelectorRangeSpec: MdSelectorRangeSpec[] = []
  let list_text: string[] = mdText.split("\n")

  /** Line - total_ch Mapping Table
   * This table has a length of number of lines + 1.
   * map_line_ch[i] = starting position of line i
   * map_line_ch[i+1]-1 = ending position of line i
   */
  // Create line-ch mapping table
  let map_line_ch: number[] = [0]
  let count_ch = 0
  for (let line of list_text){
    count_ch = count_ch + line.length + 1
    map_line_ch.push(count_ch)
  }
  // Traverse the entire text to generate multiple AB block selection ranges
  for (let i=0; i<list_text.length; i++){
    const line = list_text[i]
    for (let selector of list_mdSelector){
      if (selector.match.test(line)) {
        let sim: MdSelectorRangeSpecSimp | null = selector.selector(list_text, i)
        if (!sim) continue
        // Syntactic sugar
        if (sim.selector == "list" && sim.header.indexOf("2") == 0) sim.header = "list" + sim.header
        if (sim.selector == "title") {
          if (sim.header.indexOf("2") == 0) sim.header = "title" + sim.header
          else if (sim.header.indexOf("list") == 0) sim.header = "title2list|" + sim.header
        }
        // Line to character change
        list_mdSelectorRangeSpec.push({
          from_ch: map_line_ch[sim.from_line],
          to_ch: map_line_ch[sim.to_line] - 1,
          header: sim.header,
          selector: sim.selector,
          content: sim.content,
          prefix: sim.prefix,
        })
        i = sim.to_line - 1
        break
      }
    }
  }
  return list_mdSelectorRangeSpec
}

/** Selector Information Table - All Information */
export function generateSelectorInfoTable(el: HTMLElement){
  const table_p = el.createEl("div", {
    cls: ["ab-setting", "md-table-fig1"]
  })
  const table = table_p.createEl("table", {
    cls: ["ab-setting", "md-table-fig2"]
  })
  {
    const thead = table.createEl("thead")
    const tr = thead.createEl("tr")
    tr.createEl("td", { text: "Selector Name" })
    tr.createEl("td", { text: "First Line Regex" })
    tr.createEl("td", { text: "Enabled" })
  }
  const tbody = table.createEl("tbody")
  for (let item of list_mdSelector){
    const tr = tbody.createEl("tr")
    tr.createEl("td", { text: item.name })
    tr.createEl("td", { text: String(item.match) })
    tr.createEl("td", { text: item.is_disable ? "Disabled" : "Enabled" })
  }
  return table_p
}

/** Selector Range - Strict Version */
export interface MdSelectorRangeSpec {
  from_ch: number,  // Start of range
  to_ch: number,    // End of range
  header: string,   // Header information
  selector: string, // Selector (range selection method)
  content: string,  // Content information
  prefix: string,
}

/** Selector Range - Simple Version */
export interface MdSelectorRangeSpecSimp {
  from_line: number, // Start of range
  to_line: number,   // End of range
  header: string,    // Header information
  selector: string,  // Selector (range selection method)
  levelFlag: string, // (Used to determine code symbols or heading levels)
  content: string,   // Content information
  prefix: string,
}

/** MD Selector - Registration Version */
export interface MdSelectorSpecSimp {
  id: string
  name: string
  match: RegExp
  detail?: string
  selector: (
    list_text: string[],    // Entire text
    from_line: number,      // Start searching from which line
    // confSelect: ConfSelect    // Selector configuration
  ) => MdSelectorRangeSpecSimp | null // Returns a MdSelectorRangeSpec. Then the iterator's line number must jump to the `to` inside the loop
}

/** MD Selector - Strict Version */
export interface MdSelectorSpec extends MdSelectorSpecSimp {
  is_disable: boolean
}

/** MD Selector List */
export let list_mdSelector: MdSelectorSpec[] = []
export function registerMdSelector (simp: MdSelectorSpecSimp){
  list_mdSelector.push({
    id: simp.id,
    name: simp.name,
    match: simp.match,
    detail: simp.detail ?? "",
    selector: simp.selector,
    is_disable: false
  })
}

// Configuration return list
/*export function get_selectors(setting: ABSettingInterface){
  let list_ABMdSelector: any[] = []
  // if (setting.select_list != ConfSelect.no) list_ABMdSelector.push(map_ABMdSelector.get("list"))
  // if (setting.select_quote != ConfSelect.no) list_ABMdSelector.push(map_ABMdSelector.get("quote"))
  // if (setting.select_code != ConfSelect.no) list_ABMdSelector.push(map_ABMdSelector.get("code"))
  if (setting.select_brace != ConfSelect.no) list_ABMdSelector.push(ABMdSelector_brace)
  if (setting.select_list != ConfSelect.no) list_ABMdSelector.push(ABMdSelector_list)
  if (setting.select_quote != ConfSelect.no) list_ABMdSelector.push(ABMdSelector_quote)
  if (setting.select_code != ConfSelect.no) list_ABMdSelector.push(ABMdSelector_code)
  if (setting.select_heading != ConfSelect.no) list_ABMdSelector.push(ABMdSelector_heading)
  return list_ABMdSelector
}*/

/** AnyBlock Range Manager
 * A segment of text can generate an instance, mainly responsible for returning RangeSpec type
 * One-time use
 */
