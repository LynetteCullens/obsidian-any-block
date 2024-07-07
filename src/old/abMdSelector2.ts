import {ABReg} from "src/config/abReg"
import {ConfSelect, type ABSettingInterface} from "src/config/abSettingTab"

/** Keyword matching interface */
export interface MdSelectorSpec {
  from: number,     // Replacement range
  to: number,       // .
  header: string,   // Header is not information
  selector: string, // Range selection method
  content: string   // Content information
}

/** Manager list */
// let map_ABMdSelector:Map<string, any>
// Originally, ts also has py-like registrars? It's called a class decorator, but using this feature requires opening some options:
// @warning: https://blog.csdn.net/m0_38082783/article/details/127048237
function register_list_mdSelector(name: string){
  return function (target: Function){
    // map_ABMdSelector.set(name, target)
  }
}
// Configure the return list
export function get_selectors(setting: ABSettingInterface){
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
}

/** AnyBlock range manager
 * A piece of text can generate an instance, which is mainly responsible for returning the RangeSpec type
 * One-time use
 */
export class ABMdSelector{
  mdText: string = ""     // Full text
  /** Line number - total_ch mapping table
   * The length of this table is the line number+1
   * map_line_ch[i] = the position at the beginning of line i in the sequence
   * map_line_ch[i+1]-1 = the position at the end of line i in the sequence
   */
  settings: ABSettingInterface
  map_line_ch: number[]  // line-ch mapping table
  _specKeywords:MdSelectorSpec[]
  public get specKeywords(){
    return this._specKeywords
  }

  constructor(mdText: string, settings: ABSettingInterface){
    this.mdText = mdText
    this.settings = settings

    this.map_line_ch = [0]
    let count_ch = 0
    for (let line of mdText.split("\n")){
      count_ch = count_ch + line.length + 1
      this.map_line_ch.push(count_ch)
    }
    
    this._specKeywords = this.blockMatch_keyword()
  }

  protected blockMatch_keyword(): MdSelectorSpec[]{
    throw("Error: No overload ABRangeManager::blockMatch_keyword")
  }
}

@register_list_mdSelector("brace")
class ABMdSelector_brace extends ABMdSelector {
  /** Block - Match keyword */
  protected blockMatch_keyword(): MdSelectorSpec[] {
    return this.lineMatch_keyword()
  }

   /** Line - Match keyword (non-inline) */
  private lineMatch_keyword(): MdSelectorSpec[] {
    const matchInfo: MdSelectorSpec[] = []
    const list_text = this.mdText.split("\n")
    let prev_front_line:number[] = []
    for (let i=0; i<list_text.length; i++){
      if(ABReg.reg_front.test(list_text[i])){       // Prefix
        prev_front_line.push(i)
      }
      else if(ABReg.reg_end.test(list_text[i])){    // Suffix
        if(prev_front_line && prev_front_line.length>0){
          const from_line = prev_front_line.pop()??0 // @warning Is it possible to pop out undefine?
          const from = this.map_line_ch[from_line]
          const to = this.map_line_ch[i+1]-1
          matchInfo.push({
            from: from,
            to: to,
            header: list_text[from_line].slice(2,-1),
            selector: "brace",
            content: this.mdText.slice(this.map_line_ch[from_line+1], to-3)
          })
        }
      }
    }
    return matchInfo
  }
}

@register_list_mdSelector("list")
class ABMdSelector_list extends ABMdSelector{

  protected blockMatch_keyword(): MdSelectorSpec[] {
    return  this.lineMatch_keyword()
  }

  private lineMatch_keyword(): MdSelectorSpec[] {
    let matchInfo2:{
      line_from:number, 
      line_to:number,     // Not included
      list_header:string
    }[] = []
    const list_text = this.mdText.split("\n")
    let list_header = ""      // 1. Header information
    let is_list_mode = false  // 2. Whether in the list
    let prev_list_from = 0    // 3. Where to start when in the list
    let record_last_line = 0  // 4. Used to clear the last empty line
    for (let i=0; i<list_text.length; i++){
      if (!is_list_mode){                     // Select start flag
        if (!ABReg.reg_list.test(list_text[i])) continue
        // Try to find headers
        if (i!=0){
          const header = list_text[i-1].match(ABReg.reg_header)
          if (header){
            prev_list_from = i-1
            list_header = header[2]
            is_list_mode = true
            record_last_line=i
            continue
          }
        }
        // No header not selected
        if (this.settings.select_list==ConfSelect.ifhead) continue
        // No header is also selected
        prev_list_from = i
        list_header = ""
        is_list_mode = true
        record_last_line=i
        continue
      }
      else {                                  // Select end flag
        if (ABReg.reg_list.test(list_text[i])) {        // List
          record_last_line=i
          continue 
        }
        if (/^\s+?\S/.test(list_text[i])) {             // Indentation at the beginning
          record_last_line=i
          continue
        }
        if (/^\s*$/.test(list_text[i])) {               // Empty line
          continue
        }
        matchInfo2.push({
          line_from: prev_list_from,
          line_to: record_last_line+1,
          list_header: list_header
        })
        is_list_mode = false
        list_header = ""
      }
    }
    if (is_list_mode){                        // End loop ending
      matchInfo2.push({
        line_from: prev_list_from,
        line_to: record_last_line+1,
        list_header: list_header
      })
      is_list_mode = false
      list_header = ""
    }

    const matchInfo: MdSelectorSpec[] = []
    for (let item of matchInfo2){
      const from = this.map_line_ch[item.line_from]
      const to = this.map_line_ch[item.line_to]-1
      matchInfo.push({
        from: from,
        to: to,
        header: item.list_header.indexOf("2")==0?"list"+item.list_header:item.list_header, // List selector syntactic sugar
        selector: "list",
        content: item.list_header==""?
          this.mdText.slice(from, to):
          this.mdText.slice(this.map_line_ch[item.line_from+1], to)
      })
    }
    return matchInfo
  }
}

@register_list_mdSelector("code")
class ABMdSelector_code extends ABMdSelector{
  protected blockMatch_keyword(): MdSelectorSpec[]{
    const matchInfo: MdSelectorSpec[] = []
    const list_text = this.mdText.split("\n")
    let prev_from = 0
    let prev_header = ""
    let code_flag = ""
    for (let i=0; i<list_text.length; i++){
      if (!code_flag){                          // Select start flag
        // Look for start flag
        const match_tmp = list_text[i].match(ABReg.reg_code)
        if (!match_tmp) continue
        // Try to find header
        if (i!=0) {
          const header = list_text[i-1].match(ABReg.reg_header)
          if (header){
            code_flag = match_tmp[3]
            prev_header = header[4]
            prev_from = i-1
            continue
          }
        }
        // No header not selected
        if (this.settings.select_code==ConfSelect.ifhead) continue
        // No header is also selected
        prev_from = i
        code_flag = match_tmp[3]
        prev_header = ""
        continue
      }
      else {                                    // Select end flag
        if (list_text[i].indexOf(code_flag)==-1) continue
        const from = this.map_line_ch[prev_from]
        const to = this.map_line_ch[i+1]-1  // Including this line
        matchInfo.push({
          from: from,
          to: to,
          header: prev_header,
          selector: "code",
          content: prev_header==""?
            this.mdText.slice(from, to):
            this.mdText.slice(this.map_line_ch[prev_from+1], to)
        })
        prev_header = ""
        code_flag = ""
      }
    }
    // This does not require tail processing
    return matchInfo
  }
}

@register_list_mdSelector("quote")
class ABMdSelector_quote extends ABMdSelector{
  protected blockMatch_keyword(): MdSelectorSpec[]{
    const matchInfo: MdSelectorSpec[] = []
    const list_text = this.mdText.split("\n")
    let prev_from = 0
    let prev_header = ""
    let is_in_quote = false
    for (let i=0; i<list_text.length; i++){
      if (!is_in_quote){                          // Select start flag
        if (ABReg.reg_quote.test(list_text[i])){
          // Try to find header
          if (i!=0) {
            const header = list_text[i-1].match(ABReg.reg_header)
            if (header){
              prev_header = header[2]
              prev_from = i-1
              is_in_quote = true
              continue
            }
          }
          // No header not selected
          if (this.settings.select_quote==ConfSelect.ifhead) continue
          // No header is also selected
          prev_header = ""
          prev_from = i
          is_in_quote = true
          continue
        }
      }
      else {                                      // Select end flag
        if (ABReg.reg_quote.test(list_text[i])) continue
        const from = this.map_line_ch[prev_from]
        const to = this.map_line_ch[i]-1          // Not including this line
        matchInfo.push({
          from: from,
          to: to,
          header: prev_header,
          selector: "quote",
          content: prev_header==""?
            this.mdText.slice(from, to):
            this.mdText.slice(this.map_line_ch[prev_from+1], to)
        })
        prev_header = ""
        is_in_quote = false
      }
    }
    if (is_in_quote){                        // End loop ending
      const i = list_text.length-1
      const from = this.map_line_ch[prev_from]
      const to = this.map_line_ch[i+1]-1   // Including this line
      matchInfo.push({
        from: from,
        to: to,
        header: prev_header,
        selector: "quote",
        content: prev_header==""?
          this.mdText.slice(from, to):
          this.mdText.slice(this.map_line_ch[prev_from+1], to)
      })
      prev_header = ""
      is_in_quote = false
    }
    return matchInfo
  }
}

@register_list_mdSelector("heading")
class ABMdSelector_heading extends ABMdSelector{
  protected blockMatch_keyword(): MdSelectorSpec[]{
    const matchInfo: MdSelectorSpec[] = []
    const list_text = this.mdText.split("\n")
    let prev_from = 0
    let prev_header = ""
    let prev_heading_level = 0
    for (let i=0; i<list_text.length; i++){
      if (prev_heading_level==0){             // Select start flag
        const match_tmp = list_text[i].match(ABReg.reg_heading)
        if (!match_tmp) continue
        // Try to find header
        if (i!=0) {
          const header = list_text[i-1].match(ABReg.reg_header)
          if (header){
            prev_heading_level = match_tmp[3].length
            prev_header = header[4]
            prev_from = i-1
            continue
          }
        }
        // No header not selected
        if (this.settings.select_code==ConfSelect.ifhead) continue
        // No header is also selected
        prev_from = i
        prev_heading_level = match_tmp[3].length
        prev_header = ""
        continue
      }
      else {                                   // Select end flag
        const match_tmp = list_text[i].match(ABReg.reg_heading)
        if (!match_tmp) continue
        if (match_tmp[3].length >= prev_heading_level) continue // 【改】Optional same level
        const from = this.map_line_ch[prev_from]
        const to = this.map_line_ch[i]-1  // Not including this line
        matchInfo.push({
          from: from,
          to: to,
          header: prev_header,
          selector: "heading",
          content: prev_header==""?
            this.mdText.slice(from, to):
            this.mdText.slice(this.map_line_ch[prev_from+1], to)
        })
        
        // Need to go back one line
        prev_header = ""
        prev_heading_level = 0
        i--
      }
    }
    if(prev_heading_level>0){
      const i = list_text.length-1
      const from = this.map_line_ch[prev_from]
      const to = this.map_line_ch[i+1]-1  // Including this line
      matchInfo.push({
        from: from,
        to: to,
        header: prev_header,
        selector: "heading",
        content: prev_header==""?
          this.mdText.slice(from, to):
          this.mdText.slice(this.map_line_ch[prev_from+1], to)
      })
    }
    return matchInfo
  }
}

// Old brace method (inline use), the current method cannot handle inline, these codes are commented out for later use
{
  /** Line - Match keyword (inline) */
  /*private lineMatch_keyword_line(): RangeSpec[] {
    const matchInfo: RangeSpec[] = []
    const matchList: RegExpMatchArray|null= this.mdText.match(this.reg_total);        // Match item

    if (!matchList) return []
    let prevIndex = 0
    for (const matchItem of matchList){
      const from2 = this.mdText.indexOf(matchItem, prevIndex)
      const to2 = from2 + matchItem.length;
      prevIndex = to2;
      let reg_match // Matching regular expression item
      for (let reg in this.list_reg){
        if (matchItem.match(reg)) {reg_match = reg; break;}
      }
      matchInfo.push({
        from: from2,//////////////////// @bug Also need to remove the header information of the brace mode, and then fill in the text
        to: to2,
        header: matchItem,
        match: String(reg_match),
        text: ""
      })
    }
    return matchInfo
  }*/

  /** Transform - Match keyword */
  /*private line2BlockMatch(listSpecKeyword: RangeSpec[]): RangeSpec[]{
    let countBracket = 0  // Bracket count
    let prevBracket = []  // Bracket stack
    let listSpecKeyword_new: RangeSpec[] = []
    for (const matchItem of listSpecKeyword) {
      if (matchItem.header=="%{") {
        countBracket++
        prevBracket.push(matchItem.from)
      }
      else if(matchItem.header=="%}" && countBracket>0) {
        countBracket--
        const from = prevBracket.pop() as number
        listSpecKeyword_new.push({
          from: from,
          to: matchItem.to,
          header: "",
          match: "brace",
          text: this.mdText.slice(from+2, matchItem.to-2)
        })
      }
    }
    return listSpecKeyword_new
  }*/
}
