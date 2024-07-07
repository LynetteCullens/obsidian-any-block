/** File containing extended processors based on interfaces */
import {MarkdownRenderChild, MarkdownRenderer} from 'obsidian';
import {
  ProcessDataType, 
  type ABProcessorSpec,
  type ABProcessorSpecSimp,
  type ABProcessorSpecUser
} from './abProcessorInterface'

export class ABProcessManager {
  // Singleton pattern
  static getInstance(): ABProcessManager {
    if (!ABProcessManager.m_instance) {
      ABProcessManager.m_instance = new ABProcessManager();
    }
    return ABProcessManager.m_instance;
  }
  
  /** Automatically find the matching ab processor for processing
   * ab processors can convert text or generate DOM elements based on header and content
   */
  public autoABProcessor(el:HTMLDivElement, header:string, content:string):HTMLElement{
    let prev_result:any = content
    let list_header = header.split("|")
    let prev_type: ProcessDataType = ProcessDataType.text
    prev_result = this.autoABProcessor_runProcessor(el, list_header, prev_result, prev_type)
    
    // Tail processing. If it's still text content, give it a md renderer
    if (prev_type==ProcessDataType.text) {
      const subEl = el.createDiv()
      subEl.addClass("markdown-rendered")
      const child = new MarkdownRenderChild(subEl);
      MarkdownRenderer.renderMarkdown(prev_result, subEl, "", child);
      prev_type = ProcessDataType.el
      prev_result = el
    }
    return prev_result
  }

  /// Processor Overview Table - Drop-Down Box Recommendations
  getProcessorOptions(){
    return this.list_abProcessor
    .filter(item=>{
      return item.default
    })
    .map(item=>{
      return {id:item.default, name:item.name}
    })
  }

  /// Processor Overview Table - All Information
  generateProcessorInfoTable(el: HTMLElement){
    const table_p = el.createEl("div",{
      cls: ["ab-setting","md-table-fig1"]
    })
    const table = table_p.createEl("table",{
      cls: ["ab-setting","md-table-fig2"]
    })
    {
      const thead = table.createEl("thead")
      const tr = thead.createEl("tr")
      tr.createEl("td", {text: "Processor Name"})
      tr.createEl("td", {text: "Drop-Down Box Default"})
      tr.createEl("td", {text: "Usage Description"})
      tr.createEl("td", {text: "Processing Type"})
      tr.createEl("td", {text: "Output Type"})
      tr.createEl("td", {text: "Regular Expression"})
      tr.createEl("td", {text: "Alias Replacement"})
      tr.createEl("td", {text: "Is Enabled"})
      tr.createEl("td", {text: "Definition Source"})
    }
    const tbody = table.createEl("tbody")
    for (let item of this.list_abProcessor){
      const tr = tbody.createEl("tr")
      tr.createEl("td", {text: item.name})
      tr.createEl("td", {text: String(item.default)})
      tr.createEl("td", {text: item.detail, attr:{"style":"max-width:240px;overflow-x:auto"}})
      // tr.createEl("td", {text: item.is_render?"渲染":"文本"})
      tr.createEl("td", {text: String(item.process_param)})
      tr.createEl("td", {text: String(item.process_return)})
      tr.createEl("td", {text: String(item.match)})
      tr.createEl("td", {text: item.process_alias})
      tr.createEl("td", {text: item.is_disable?"Disabled":"Enabled"})
      tr.createEl("td", {text: item.register_from})
    }
    return table_p
  }

  /// User registers processors
  registerABProcessor(process: ABProcessorSpec| ABProcessorSpecSimp| ABProcessorSpecUser){
    this.list_abProcessor.push(this.adaptToABProcessorSepc(process));
  }

  private static m_instance: ABProcessManager // Singleton

  /// ab Processor - Strict Version, Interface and List
  private list_abProcessor: ABProcessorSpec[] = []

  /// Adapter
  private adaptToABProcessorSepc(process: ABProcessorSpec| ABProcessorSpecSimp| ABProcessorSpecUser): ABProcessorSpec{
    if ('is_disable' in process) { // Strict Version, Storage Version
      return process
    }
    else if ('process' in process) { // User Version, Registration Version
      return this.adaptToABProcessorSepc_simp(process)
    }
    else { // Alias Version, No Code Version
      return this.adaptToABProcessorSepc_user(process)
    }
  }

  private adaptToABProcessorSepc_simp(sim: ABProcessorSpecSimp):ABProcessorSpec{
    //type t_param = Parameters<typeof sim.process>
    //type t_return = ReturnType<typeof sim.process>
    const abProcessorSpec:ABProcessorSpec = {
      id: sim.id,
      name: sim.name,
      match: sim.match??sim.id,
      default: sim.default??(!sim.match||typeof(sim.match)=="string")?sim.id:null,
      detail: sim.detail??"",
      process_alias: sim.process_alias??"",
      process_param: sim.process_param??null,
      process_return: sim.process_return??null,
      process: sim.process,
      is_disable: false,
      register_from: "Built-in",
    }
    return abProcessorSpec
  }

  private adaptToABProcessorSepc_user(sim: ABProcessorSpecUser):ABProcessorSpec{
    const abProcessorSpec:ABProcessorSpec = {
      id: sim.id,
      name: sim.name,
      match: /^\//.test(sim.match)?RegExp(sim.match):sim.match,
      default: null,
      detail: "",
      process_alias: sim.process_alias,
      process_param: null,
      process_return: null,
      process: ()=>{},
      is_disable: false,
      register_from: "User",
    }
    return abProcessorSpec
  }

  // Iterable function
  private autoABProcessor_runProcessor(el:HTMLDivElement, list_header:string[], prev_result:any, prev_type:ProcessDataType):any{
    // Loop through the header group until all text processors are traversed or a rendering processor is encountered
    for (let item_header of list_header){
      for (let abReplaceProcessor of this.list_abProcessor){
        // Find the processor through the header
        if (typeof(abReplaceProcessor.match)=='string'){if (abReplaceProcessor.match!=item_header) continue}
        else {if (!abReplaceProcessor.match.test(item_header)) continue}
        // Check if there is an alias. If so, recursively call
        if(abReplaceProcessor.process_alias){
          // Alias supports referencing regular expression parameters
          let alias = abReplaceProcessor.process_alias
          ;(()=>{
            if (abReplaceProcessor.process_alias.indexOf("%")<0) return
            if (typeof(abReplaceProcessor.match)=="string") return
            const matchs = item_header.match(abReplaceProcessor.match)
            if (!matchs) return
            const len = matchs.length
            if (len==1) return
            // replaceAlias
            for (let i=1; i<len; i++){
              if (!matchs[i]) continue
              alias = alias.replace(RegExp(`%${i}`), matchs[i]) /** @bug Ideally it should use `(?<!\\)%${i}`, but ob does not support forward lookups in regular expressions */
            }
          })()
          prev_result = this.autoABProcessor_runProcessor(el, alias.split("|"), prev_result, prev_type)
        }
        // If not, use the process method
        else if(abReplaceProcessor.process){
          // Check input type
          if(abReplaceProcessor.process_param != prev_type){
            if (abReplaceProcessor.process_param==ProcessDataType.el && prev_type==ProcessDataType.text){
              const subEl = el.createDiv()
              subEl.addClass("markdown-rendered")
              const child = new MarkdownRenderChild(subEl);
              MarkdownRenderer.renderMarkdown(prev_result, subEl, "", child);
              prev_type = ProcessDataType.el
              prev_result = el
            }
            else{
              console.warn("Processor parameter type error", abReplaceProcessor.process_param, prev_type);
              break
            }
          }
          // Execute processor
          prev_result = abReplaceProcessor.process(el, item_header, prev_result)
          // Check output type
          if(prev_result instanceof HTMLElement){prev_type = ProcessDataType.el}
          else if(typeof(prev_result) == "string"){prev_type = ProcessDataType.text}
          else {
            console.warn("Processor output type error", abReplaceProcessor.process_param, prev_type);
            break
          }
        }
        else{
          console.warn("Processor must implement process or process_alias method")
        }
      }
    }
    return prev_result
  }
}
