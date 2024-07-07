import {MarkdownRenderChild, MarkdownRenderer} from 'obsidian';

import {ABProcessManager} from "./abProcessorManager"
import {ProcessDataType, type ABProcessorSpecSimp} from "./abProcessorInterface"
import {ABReg} from "src/config/abReg"
import {ListProcess} from "./listProcessor"
import {getID} from "src/utils/utils"

import mermaid from "mermaid"
import mindmap from '@mermaid-js/mermaid-mindmap';
const initialize = mermaid.registerExternalDiagrams([mindmap]);
export const mermaid_init = async () => {
  await initialize;
};

/**
 * Splitting the call of registerABProcessor into two steps because:
 * 1. It's easier to quickly find the desired processor in the outline
 * 2. Allows processors to call each other
 */

const process_md:ABProcessorSpecSimp = {
  id: "md",
  name: "md",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const subEl = el.createDiv()
    subEl.addClass("markdown-rendered")
    const child = new MarkdownRenderChild(subEl);
    MarkdownRenderer.renderMarkdown(content, subEl, "", child);
    // ctx.addChild(child);
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_md)

const process_quote:ABProcessorSpecSimp = {
  id: "quote",
  name: "Add Quote Block",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    return content.split("\n").map((line)=>{return "> "+line}).join("\n")
  }
}
ABProcessManager.getInstance().registerABProcessor(process_quote)

const process_code:ABProcessorSpecSimp = {
  id: "code",
  name: "Add Code Block",
  match: /^code(\((.*)\))?$/,
  default: "code()",
  detail: "Without `()` indicates using the first line of the original text as the code type, empty parentheses indicate that the code type is empty",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    let matchs = header.match(/^code(\((.*)\))?$/)
    if (!matchs) return content
    if (matchs[1]) content = matchs[2]+"\n"+content
    return "```"+content+"\n```"
  }
}
ABProcessManager.getInstance().registerABProcessor(process_code)

const process_Xquote:ABProcessorSpecSimp = {
  id: "Xquote",
  name: "Remove Quote Block",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    return content.split("\n").map(line=>{
      return line.replace(/^>\s/, "")
    }).join("\n")
  }
}
ABProcessManager.getInstance().registerABProcessor(process_Xquote)

const process_Xcode:ABProcessorSpecSimp = {
  id: "Xcode",
  name: "Remove Code Block",
  match: /^Xcode(\((true|false)\))?$/,
  default: "Xcode(true)",
  detail: "The parameter is whether to remove the code type, defaults to false. Notation: code|Xcode or code()|Xcode(true) content remains unchanged",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    let matchs = header.match(/^Xcode(\((true|false)\))?$/)
    if (!matchs) return content
    let remove_flag:boolean
    if (matchs[1]=="") remove_flag=false
    else remove_flag= (matchs[2]=="true")
    let list_content = content.split("\n")
    // Start removing
    let code_flag = ""
    let line_start = -1
    let line_end = -1
    for (let i=0; i<list_content.length; i++){
      if (code_flag==""){     // Look for the start flag
        const match_tmp = list_content[i].match(ABReg.reg_code)
        if(match_tmp){
          code_flag = match_tmp[3]
          line_start = i
        }
      }
      else {                  // Look for the end flag
        if(list_content[i].indexOf(code_flag)>=0){
          line_end = i
          break
        }
      }
    }
    if(line_start>=0 && line_end>0) { // Avoid situations where there is a beginning but no end
      if(remove_flag) list_content[line_start] = list_content[line_start].replace(/^```(.*)$|^~~~(.*)$/, "")
      else list_content[line_start] = list_content[line_start].replace(/^```|^~~~/, "")
      list_content[line_end] = list_content[line_end].replace(/^```|^~~~/, "")
      content = list_content.join("\n")//.trim()
    }
    return content
  }
}
ABProcessManager.getInstance().registerABProcessor(process_Xcode)

const process_X:ABProcessorSpecSimp = {
  id: "X",
  name: "Remove Code or Quote Block",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    let flag = ""
    for (let line of content.split("\n")){
      if (ABReg.reg_code.test(line)) {flag="code";break}
      else if (ABReg.reg_quote.test(line)) {flag="quote";break}
    }
    if (flag=="code") return process_Xcode.process(el, header, content)
    else if (flag=="quote") return process_Xquote.process(el, header, content)
    return content
  }
}
ABProcessManager.getInstance().registerABProcessor(process_X)

const process_code2quote:ABProcessorSpecSimp = {
  id: "code2quote",
  name: "Code to Quote Block",
  process_alias: "Xcode|quote",
  process: ()=>{}
}
ABProcessManager.getInstance().registerABProcessor(process_code2quote)

const process_quote2code:ABProcessorSpecSimp = {
  id: "quote2code",
  name: "Quote to Code Block",
  match: /^quote2code(\((.*)\))?$/,
  default: "quote2code()",
  process_alias: "Xquote|code%1",
  process: ()=>{
    /*let matchs = header.match(/^quote2code(\((.*)\))?$/)
    if (!matchs) return content
    content = text_Xquote(content)
    if (matchs[1]) content = matchs[2]+"\n"+content
    content = text_code(content)
    return content*/
  }
}
ABProcessManager.getInstance().registerABProcessor(process_quote2code)

const process_slice:ABProcessorSpecSimp = {
  id: "slice",
  name: "Slice",
  match: /^slice\((\s*\d+\s*?)(,\s*-?\d+\s*)?\)$/,
  detail: "Same as the js slice method",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    // Slice seems to be unafraid of overflow or crossover, it will automatically become an empty array. It's very convenient and doesn't need to judge too many things.
    const list_match = header.match(/^slice\((\s*\d+\s*)(,\s*-?\d+\s*)?\)$/)
    if (!list_match) return content
    const arg1 = Number(list_match[1].trim())
    if (isNaN(arg1)) return content
    const arg2 = Number(list_match[2].replace(",","").trim())
    // Single parameter
    if (isNaN(arg2)) {
      return content.split("\n").slice(arg1).join("\n")
    }
    // Double parameter
    else {
      return content.split("\n").slice(arg1, arg2).join("\n")
    }
  }
}
ABProcessManager.getInstance().registerABProcessor(process_slice)

const process_add:ABProcessorSpecSimp = {
  id: "add",
  name: "Add Content",
  match: /^add\((.*?)(,\s*-?\d+\s*)?\)$/,
  detail: "Add. Parameter 2 is the line order, default 0, line end -1. It will be inserted and added",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    const list_match = header.match(/^add\((.*?)(,\s*-?\d+\s*)?\)$/)
    if (!list_match) return content
    if (!list_match[1]) return content
    const arg1 = (list_match[1].trim())
    if (!arg1) return content
    let arg2:number
    if (!list_match[2]) arg2 = 0
    else{
      arg2 = Number(list_match[2].replace(",","").trim())
      if (isNaN(arg2)) {
        arg2 = 0
      }
    }
    const list_content = content.split("\n")
    if (arg2>=0 && arg2<list_content.length) list_content[arg2] = arg1+"\n"+list_content[arg2]
    else if(arg2<0 && (arg2*-1)<=list_content.length) {
      arg2 = list_content.length+arg2
      list_content[arg2] = arg1+"\n"+list_content[arg2]
    }
    return list_content.join("\n")
  }
}
ABProcessManager.getInstance().registerABProcessor(process_add)

const process_title2list:ABProcessorSpecSimp = {
  id: "title2list",
  name: "Title to List",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  detail: "Can also be used as a more powerful list parser",
  process: (el, header, content)=>{
    content = ListProcess.title2list(content, el)
    return content
  }
}
ABProcessManager.getInstance().registerABProcessor(process_title2list)

const process_title2table:ABProcessorSpecSimp = {
  id: "title2table",
  name: "Title to Table",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    content = ListProcess.title2list(content, el)
    ListProcess.list2table(content, el)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_title2table)

const process_title2mindmap:ABProcessorSpecSimp = {
  id: "title2mindmap",
  name: "Title to Mind Map",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    content = ListProcess.title2list(content, el)
    ListProcess.list2mindmap(content, el)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_title2mindmap)

const process_listroot:ABProcessorSpecSimp = {
  id: "listroot",
  name: "Add List Root",
  match: /^listroot\((.*)\)$/,
  default: "listroot(root)",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    const list_match = header.match(/^listroot\((.*)\)$/)
    if (!list_match) return content
    const arg1 = list_match[1].trim()
    content = content.split("\n").map(line=>{return "  "+line}).join("\n")
    content = "- "+arg1+"\n"+content
    return content
  }
}
ABProcessManager.getInstance().registerABProcessor(process_listroot)

const process_listXinline:ABProcessorSpecSimp = {
  id: "listXinline",
  name: "Remove Inline Line Breaks from List",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    return ListProcess.listXinline(content)
  }
}
ABProcessManager.getInstance().registerABProcessor(process_listXinline)

const process_list2table:ABProcessorSpecSimp = {
  id: "list2table",
  name: "List to Table",
  match: /list2(md)?table(T)?/,
  default: "list2table",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/list2(md)?table(T)?/)
    if (!matchs) return el
    ListProcess.list2table(content, el, matchs[2]=="T")
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2table)

const process_list2lt:ABProcessorSpecSimp = {
  id: "list2lt",
  name: "List to List Table",
  match: /list2(md)?lt(T)?/,
  default: "list2lt",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/list2(md)?lt(T)?/)
    if (!matchs) return el
    ListProcess.list2lt(content, el, matchs[2]=="T")
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2lt)

const process_list2folder:ABProcessorSpecSimp = {
  id: "list2folder",
  name: "List to Tree Directory",
  match: /list2(md)?folder(T)?/,
  default: "list2folder",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/list2(md)?folder(T)?/)
    if (!matchs) return el
    ListProcess.list2folder(content, el, matchs[2]=="T")
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2lt)

const process_list2ut:ABProcessorSpecSimp = {
  id: "list2ut",
  name: "List to Two-Dimensional Table",
  match: /list2(md)?ut(T)?/,
  default: "list2ut",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/list2(md)?ut(T)?/)
    if (!matchs) return el
    ListProcess.list2ut(content, el, matchs[2]=="T")
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2ut)

const process_list2timeline:ABProcessorSpecSimp = {
  id: "list2timeline",
  name: "Level 1 List to Timeline",
  match: /list2(md)?timeline(T)?/,
  default: "list2mdtimeline",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/list2(md)?timeline(T)?/)
    if (!matchs) return el
    ListProcess.list2timeline(content, el, matchs[2]=="T")
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2timeline)

const process_list2tab:ABProcessorSpecSimp = {
  id: "list2tab",
  name: "Level 1 List to Tab Bar",
  match: /list2(md)?tab(T)?$/,
  default: "list2mdtab",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/list2(md)?tab(T)?$/)
    if (!matchs) return el
    ListProcess.list2tab(content, el, matchs[2]=="T")
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2tab)

const process_list2mermaid:ABProcessorSpecSimp = {
  id: "list2mermaid",
  name: "List to Mermaid Flowchart",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    ListProcess.list2mermaid(content, el)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2mermaid)

const process_list2mindmap:ABProcessorSpecSimp = {
  id: "list2mindmap",
  name: "List to Mermaid Mind Map",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    ListProcess.list2mindmap(content, el)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_list2mindmap)

const process_callout:ABProcessorSpecSimp = {
  id: "callout",
  name: "Callout Syntax Sugar",
  match: /^\!/,
  default: "!note",
  detail: "Requires obsidian 0.14 or above to support callout syntax",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.text,
  process: (el, header, content)=>{
    return "```ad-"+header.slice(1)+"\n"+content+"\n```"
  }
}
ABProcessManager.getInstance().registerABProcessor(process_callout)

const process_mermaid:ABProcessorSpecSimp = {
  id: "mermaid",
  name: "New Mermaid",
  match: /^mermaid(\((.*)\))?$/,
  default: "mermaid(graph TB)",
  detail: "Due to the need to be compatible with mindmaps, the latest version of mermaid built into the plugin will be used here",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    let matchs = content.match(/^mermaid(\((.*)\))?$/)
    if (!matchs) return el
    if (matchs[1]) content = matchs[2]+"\n"+content

    ;(async (el:HTMLDivElement, header:string, content:string)=>{
      await mermaid_init()
      await mermaid.mermaidAPI.renderAsync("ab-mermaid-"+getID(), content, (svgCode: string)=>{
        el.innerHTML = svgCode
      });
    })(el, header, content)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_mermaid)

const process_text:ABProcessorSpecSimp = {
  id: "text",
  name: "Plain Text",
  detail: "Actually, it's generally more recommended to use code() instead, which is more precise",
  process_param: ProcessDataType.text,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    // Text element. Pre is not good to use, here we still have to use <br> to break lines
    // `<p>${content.split("\n").map(line=>{return "<span>"+line+"</span>"}).join("<br/>")}</p>`
    el.innerHTML = `<p>${content.replace(/ /g, " ").split("\n").join("<br/>")}</p>`
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_text)
