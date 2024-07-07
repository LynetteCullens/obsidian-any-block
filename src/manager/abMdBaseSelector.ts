import {ABReg} from "src/config/abReg"
import {
  registerMdSelector, 
  type MdSelectorSpecSimp,
  type MdSelectorRangeSpecSimp
} from "./abMdSelector"

function easySelector(
  list_text:string[],
  from_line:number,
  selector:string, 
  frist_reg:RegExp
):MdSelectorRangeSpecSimp|null{
  let mdRange:MdSelectorRangeSpecSimp = {
    // Note the difference between from_line (counting from the matching line) and mdRange.from_line (counting from the header selector)
    from_line: from_line-1,
    to_line: from_line+1,
    header: "",
    selector: selector,
    levelFlag: "",
    content: "",
    prefix: ""
  }
  // Validate the first line
  if (from_line <= 0) return null
  const first_line_match = list_text[from_line].match(frist_reg)
  if (!first_line_match) return null
  mdRange.prefix = first_line_match[1]  // Can be empty
  mdRange.levelFlag = first_line_match[3]

  // Validate header
  let header_line_match:RegExpMatchArray | null
  if (list_text[from_line-1].indexOf(mdRange.prefix)==0
    && ABReg.reg_emptyline_noprefix.test(list_text[from_line-1]/*.replace(mdRange.prefix, "")*/)
    && from_line>1
  ){
    mdRange.from_line = from_line-2
  }
  header_line_match = list_text[mdRange.from_line].match(ABReg.reg_header)
  if (!header_line_match) return null
  if (header_line_match[1]!=mdRange.prefix) return null
  mdRange.header = header_line_match[4]
  return mdRange
}

function easySelector_headtail(
  list_text:string[],
  from_line:number,
  selector:string, 
  frist_reg:RegExp
):MdSelectorRangeSpecSimp|null{
  let mdRange:MdSelectorRangeSpecSimp = {
    from_line: from_line,
    to_line: from_line+1,
    header: "",
    selector: selector,
    levelFlag: "",
    content: "",
    prefix: ""
  }
  // Validate the first line
  if (from_line <= 0) return null
  const first_line_match = list_text[from_line].match(frist_reg)
  if (!first_line_match) return null
  mdRange.prefix = first_line_match[1]  // Can be empty
  // Validate header
  mdRange.levelFlag = first_line_match[3]
  mdRange.header = first_line_match[4]
  return mdRange
}

/**
 * Head and tail selector
 */
const mdSelector_headtail:MdSelectorSpecSimp = {
  id: "headtail",
  name: "Head and tail selector",
  detail: "Starts with `:::` and ends with `:::`, the processor name is written after the first `:::`, no need to add `[]`. It's basically the same as the code block, which is also a VuePress md extension syntax",
  match: ABReg.reg_headtail,
  selector: (list_text, from_line)=>{
    let mdRangeTmp = easySelector_headtail(list_text, from_line, "headtail", ABReg.reg_headtail)
    if (!mdRangeTmp) return null
    const mdRange = mdRangeTmp
    // Found the beginning, now start looking for the end. No need to loop through the tail processor
    let last_nonempty:number = from_line
    for (let i=from_line+1; i<list_text.length; i++){
      const line = list_text[i]
      // Prefix does not match
      if (line.indexOf(mdRange.prefix)!=0) break
      const line2 = line.replace(mdRange.prefix, "")    // Remove useless prefix
      // Empty line
      if (ABReg.reg_emptyline_noprefix.test(line2)) {continue}
      last_nonempty = i
      // End
      if (ABReg.reg_headtail_noprefix.test(line2)) {last_nonempty = i; break}
    }
    mdRange.to_line = last_nonempty+1
    mdRange.content = list_text
      .slice(from_line+1, mdRange.to_line-1)
      .map((line)=>{return line.replace(mdRange.prefix, "")})
      .join("\n")
    return mdRange
  }
}
registerMdSelector(mdSelector_headtail)

/**
 * List selector
 */
const mdSelector_list:MdSelectorSpecSimp = {
  id: "list",
  name: "List selector",
  match: ABReg.reg_list,
  detail: "Add `[processor name]` header to the previous/two lines of the list, note that the header must be at the same level as the first line of the list",
  selector: (list_text, from_line)=>{
    let mdRangeTmp = easySelector(list_text, from_line, "list", ABReg.reg_list)
    if (!mdRangeTmp) return null
    const mdRange = mdRangeTmp
    // Found the beginning, now start looking for the end. No need to loop through the tail processor
    let last_nonempty:number = from_line
    for (let i=from_line+1; i<list_text.length; i++){
      const line = list_text[i]
      // Prefix does not match
      if (line.indexOf(mdRange.prefix)!=0) break
      const line2 = line.replace(mdRange.prefix, "")    // Remove useless prefix
      // List
      if (ABReg.reg_list_noprefix.test(line2)) {last_nonempty = i; continue}
      // Indentation at the beginning
      if (ABReg.reg_indentline_noprefix.test(line2)) {last_nonempty = i; continue}
      // Empty line
      if (ABReg.reg_emptyline_noprefix.test(line2)) {continue}
      break
    }
    mdRange.to_line = last_nonempty+1
    mdRange.content = list_text
      .slice(from_line, mdRange.to_line)
      .map((line)=>{return line.replace(mdRange.prefix, "")})
      .join("\n")
    return mdRange
  }
}
registerMdSelector(mdSelector_list)

/**
 * Code block selector
 */
const mdSelector_code:MdSelectorSpecSimp = {
  id: "code",
  name: "Code block selector",
  match: ABReg.reg_code,
  detail: "Add `[processor name]` header to the previous/two lines of the code block, note that the header must be at the same level as the first line of the code block",
  selector: (list_text, from_line)=>{
    let mdRangeTmp = easySelector(list_text, from_line, "code", ABReg.reg_code)
    if (!mdRangeTmp) return null
    const mdRange = mdRangeTmp
    // Found the beginning, now start looking for the end. No need to loop through the tail processor
    let last_nonempty:number = from_line
    for (let i=from_line+1; i<list_text.length; i++){
      const line = list_text[i]
      // Prefix does not match
      if (line.indexOf(mdRange.prefix)!=0) break
      const line2 = line.replace(mdRange.prefix, "")    // Remove useless prefix
      // Empty line
      if (ABReg.reg_emptyline_noprefix.test(line2)) {continue}
      last_nonempty = i
      // End
      if (line2.indexOf(mdRange.levelFlag)==0) {last_nonempty = i; break}
    }
    mdRange.to_line = last_nonempty+1
    mdRange.content = list_text
      .slice(from_line, mdRange.to_line)
      .map((line)=>{return line.replace(mdRange.prefix, "")})
      .join("\n")
    return mdRange
  }
}
registerMdSelector(mdSelector_code)

/**
 * Quote block selector
 */
const mdSelector_quote:MdSelectorSpecSimp = {
  id: "quote",
  name: "Quote block selector",
  match: ABReg.reg_quote,
  detail: "Add `[processor name]` header to the previous/two lines of the quote block, note that the header must be at the same level as the first line of the quote block",
  selector: (list_text, from_line)=>{
    let mdRangeTmp = easySelector(list_text, from_line, "quote", ABReg.reg_quote)
    if (!mdRangeTmp) return null
    const mdRange = mdRangeTmp
    // Found the beginning, now start looking for the end. No need to loop through the tail processor
    let last_nonempty:number = from_line
    for (let i=from_line+1; i<list_text.length; i++){
      const line = list_text[i]
      // Prefix does not match
      if (line.indexOf(mdRange.prefix)!=0) break
      const line2 = line.replace(mdRange.prefix, "")    // Remove useless prefix
      // Quote
      if (ABReg.reg_quote_noprefix.test(line2)) {last_nonempty = i; continue}
      break
    }
    mdRange.to_line = last_nonempty+1
    mdRange.content = list_text
      .slice(from_line, mdRange.to_line)
      .map((line)=>{return line.replace(mdRange.prefix, "")})
      .join("\n")
    return mdRange
  }
}
registerMdSelector(mdSelector_quote)

/**
 * Table block selector
 */
const mdSelector_table:MdSelectorSpecSimp = {
  id: "table",
  name: "Table selector",
  match: ABReg.reg_table,
  detail: "Add `[processor name]` header to the previous/two lines of the table, note that the header must be at the same level as the first line of the table",
  selector: (list_text, from_line)=>{
    let mdRangeTmp = easySelector(list_text, from_line, "table", ABReg.reg_table)
    if (!mdRangeTmp) return null
    const mdRange = mdRangeTmp
    // Found the beginning, now start looking for the end. No need to loop through the tail processor
    let last_nonempty:number = from_line
    for (let i=from_line+1; i<list_text.length; i++){
      const line = list_text[i]
      // Prefix does not match
      if (line.indexOf(mdRange.prefix)!=0) break
      const line2 = line.replace(mdRange.prefix, "")    // Remove useless prefix
      // Table
      if (ABReg.reg_table_noprefix.test(line2)) {last_nonempty = i; continue}
      break
    }
    mdRange.to_line = last_nonempty+1
    mdRange.content = list_text
      .slice(from_line, mdRange.to_line)
      .map((line)=>{return line.replace(mdRange.prefix, "")})
      .join("\n")
    return mdRange
  }
}
registerMdSelector(mdSelector_table)

/**
 * Heading selector
 */
const mdSelector_heading:MdSelectorSpecSimp = {
  id: "heading",
  name: "Heading selector",
  match: ABReg.reg_heading,
  detail: "Add `[processor name]` header to the previous/two lines of the heading, note that the header must be at the same level as the first line of the heading",
  selector: (list_text, from_line)=>{
    let mdRangeTmp = easySelector(list_text, from_line, "heading", ABReg.reg_heading)
    if (!mdRangeTmp) return null
    const mdRange = mdRangeTmp
    // Found the beginning, now start looking for the end. No need to loop through the tail processor
    let last_nonempty:number = from_line
    for (let i=from_line+1; i<list_text.length; i++){
      const line = list_text[i]
      // Prefix does not match
      if (line.indexOf(mdRange.prefix)!=0) break
      const line2 = line.replace(mdRange.prefix, "")    // Remove useless prefix
      // Empty line
      if (ABReg.reg_emptyline_noprefix.test(line2)) {continue}
      // Larger heading
      const match = line2.match(ABReg.reg_heading_noprefix)
      if (!match) {last_nonempty=i; continue}
      if (match[3].length < mdRange.levelFlag.length) {break}
      last_nonempty=i;
    }
    mdRange.to_line = last_nonempty+1
    mdRange.content = list_text
      .slice(from_line, mdRange.to_line)
      .map((line)=>{return line.replace(mdRange.prefix, "")})
      .join("\n")
    return mdRange
  }
}
registerMdSelector(mdSelector_heading)
