import {ABProcessManager} from "./abProcessorManager"
import {ProcessDataType, type ABProcessorSpecSimp} from "./abProcessorInterface"

export const DECOProcessor = 0  // Used for modularity, error prevention, but actually useless

const process_fold:ABProcessorSpecSimp = {
  id: "fold",
  name: "Fold",
  process_param: ProcessDataType.el,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    if(el.children.length!=1) return el
    const sub_el = el.children[0] as HTMLElement
    sub_el.remove()
    sub_el.setAttribute("is_hide", "true")
    sub_el.addClass("ab-deco-fold-content")
    sub_el.hide()
    const mid_el = el.createDiv({cls:["ab-deco-fold"]})
    const sub_button = mid_el.createDiv({cls: ["ab-deco-fold-button"], text: "Expand"})
    sub_button.onclick = ()=>{
      const is_hide = sub_el.getAttribute("is_hide")
      if (is_hide && is_hide=="false") {
        sub_el.setAttribute("is_hide", "true"); 
        sub_el.hide(); 
        sub_button.setText("Expand")
      }
      else if(is_hide && is_hide=="true") {
        sub_el.setAttribute("is_hide", "false");
        sub_el.show(); 
        sub_button.setText("Collapse")
      }
    }
    mid_el.appendChild(sub_button)
    mid_el.appendChild(sub_el)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_fold)

const process_scroll:ABProcessorSpecSimp = {
  id: "scroll",
  name: "Scroll",
  match: /^scroll(\((\d+)\))?(T)?$/,
  default: "scroll(460)",
  process_param: ProcessDataType.el,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    // Find parameters
    const matchs = header.match(/^scroll(\((\d+)\))?(T)?$/)
    if (!matchs) return el
    let arg1
    if (!matchs[1]) arg1=460  // Default value
    else{
      if (!matchs[2]) return el
      arg1 = Number(matchs[2])
      if (isNaN(arg1)) return
    }
    // Modify the element
    if(el.children.length!=1) return el
    const sub_el = el.children[0]
    sub_el.remove()
    const mid_el = el.createDiv({cls:["ab-deco-scroll"]})
    if (!matchs[3]){
      mid_el.addClass("ab-deco-scroll-y")
      mid_el.setAttribute("style", `max-height: ${arg1}px`)
    } else {
      mid_el.addClass("ab-deco-scroll-x")
    }
    mid_el.appendChild(sub_el)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_scroll)

const process_overfold:ABProcessorSpecSimp = {
  id: "overfold",
  name: "Overflow Fold",
  match: /^overfold(\((\d+)\))?$/,
  default: "overfold(380)",
  process_param: ProcessDataType.el,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    // Find parameters
    const matchs = header.match(/^overfold(\((\d+)\))?$/)
    if (!matchs) return el
    let arg1:number
    if (!matchs[1]) arg1=460  // Default value
    else{
      if (!matchs[2]) return el
      arg1 = Number(matchs[2])
      if (isNaN(arg1)) return
    }
    // Modify the element
    if(el.children.length!=1) return el
    const sub_el = el.children[0]
    sub_el.remove()
    const mid_el = el.createDiv({cls:["ab-deco-overfold"]})
    const sub_button = mid_el.createDiv({cls: ["ab-deco-overfold-button"], text: "Expand"})
    sub_el.addClass("ab-deco-overfold-content")
    mid_el.appendChild(sub_el)
    mid_el.appendChild(sub_button)

    mid_el.setAttribute("style", `max-height: ${arg1}px`)
    mid_el.setAttribute("is-fold", "true")
    sub_button.onclick = ()=>{
      const is_fold = mid_el.getAttribute("is-fold")
      if (!is_fold) return
      if (is_fold=="true") {
        mid_el.setAttribute("style", "")
        mid_el.setAttribute("is-fold", "false")
        sub_button.setText("Collapse")
      }
      else{
        mid_el.setAttribute("style", `max-height: ${arg1}px`)
        mid_el.setAttribute("is-fold", "true")
        sub_button.setText("Expand")
      }
    }

    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_overfold)


const process_addClass:ABProcessorSpecSimp = {
  id: "addClass",
  name: "Add Class",
  detail: "Add a class name to the current block",
  match: /^addClass\((.*)\)$/,
  process_param: ProcessDataType.el,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/^addClass\((.*)\)$/)
    if (!matchs || !matchs[1]) return el
    if(el.children.length!=1) return el
    const sub_el = el.children[0]
    sub_el.addClass(String(matchs[1]))
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_addClass)

const process_addDiv:ABProcessorSpecSimp = {
  id: "addDiv",
  name: "Add Div and Class",
  detail: "Add a parent class to the current block, you need to give this parent class a class name",
  match: /^addDiv\((.*)\)$/,
  process_param: ProcessDataType.el,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/^addDiv\((.*)\)$/)
    if (!matchs || !matchs[1]) return el
    const arg1 = matchs[1]
    // Modify the element
    if(el.children.length!=1) return el
    const sub_el = el.children[0]
    sub_el.remove()
    const mid_el = el.createDiv({cls:[arg1]})
    mid_el.appendChild(sub_el)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_addDiv)

const process_heimu:ABProcessorSpecSimp = {
  id: "heimu",
  name: "Blackout",
  detail: "Similar to the blackout effect in Moegirlpedia",
  process_alias: "addClass(ab-deco-heimu)",
  process: (el, header, content)=>{}
}
ABProcessManager.getInstance().registerABProcessor(process_heimu)

const process_title:ABProcessorSpecSimp = {
  id: "title",
  name: "Title",
  match: /^#(.*)/,
  detail: "If you process code or table blocks directly, there will be a special style",
  process_param: ProcessDataType.el,
  process_return: ProcessDataType.el,
  process: (el, header, content)=>{
    const matchs = header.match(/^#(.*)/)
    if (!matchs || !matchs[1]) return el
    const arg1 = matchs[1]

    // Modify the element
    if(el.children.length!=1) return el
    const sub_el = el.children[0] as HTMLElement
    sub_el.remove()
    sub_el.addClass("ab-deco-title-content")
    const mid_el = el.createDiv({cls:["ab-deco-title"]})
    const sub_title = mid_el.createDiv({cls: ["ab-deco-title-title"]})
    sub_title.createEl("p", {text: arg1})
    mid_el.appendChild(sub_title)
    mid_el.appendChild(sub_el)

    // Determine the element type to modify, to modify the title style
    let title_type = "none"
    if (sub_el instanceof HTMLQuoteElement){title_type = "quote"}
    else if (sub_el instanceof HTMLTableElement){title_type = "table"}
    else if (sub_el instanceof HTMLPreElement){
      title_type = "pre"
      ;(()=>{
        // Here I try to get the background color of the code block (failed)
        console.log("style1", window.getComputedStyle(sub_el ,null),
        "style2", window.getComputedStyle(sub_el ,null).getPropertyValue('background-color'),
        "style3", window.getComputedStyle(sub_el ,null).getPropertyValue('background'),
        "style4", window.getComputedStyle(sub_el ,null).backgroundColor,
        "style5", window.getComputedStyle(sub_el ,null).background,
        )
        let color:string = window.getComputedStyle(sub_el ,null).getPropertyValue('background-color'); 
        if (color) sub_title.setAttribute("style", `background-color:${color}`)
        else {
        color = window.getComputedStyle(sub_el ,null).getPropertyValue('background'); 
        sub_title.setAttribute("style", `background:${color}`)
        }
      })//()
    }
    else if (sub_el instanceof HTMLUListElement){title_type = "ul"}
    sub_title.setAttribute("title-type", title_type)
    return el
  }
}
ABProcessManager.getInstance().registerABProcessor(process_title)
