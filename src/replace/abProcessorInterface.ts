/** ab Processor Sub-Interface
 * @warn Extension is not allowed for now, the parameters and return values of the processor are currently manually checked one by one
 */
export enum ProcessDataType {
  text= "string",
  el= "HTMLElement"
}

/// ab Processor Interface - Strict Version, Storage Version
export interface ABProcessorSpec{
  id: string
  name: string
  match: RegExp|string
  default: string|null
  detail: string
  process_alias: string,
  process_param: ProcessDataType|null,
  process_return: ProcessDataType|null,
  process: (el:HTMLDivElement, header:string, content:string)=> any
  is_disable: boolean   // Whether to disable, default is false
  register_from: string // Built-in, other plugins, panel settings, if it is another plugin, the name of the plugin needs to be provided (I don't know if it can be automatically identified)
  // Non-registration items:
  // ~~is_inner：This cannot be set, used to distinguish between internal and external~~
  // is_enable: This item can be disabled after loading
}

/** ab Processor - Syntactic Sugar Version, Interface and Registration Function
 * Use ab Processor Interface - User Syntactic Sugar Version
 * It is not allowed to write the strict version directly, some parameters cannot be filled by the user
 */
export interface ABProcessorSpecSimp{
  id: string            // Unique identifier (also used as a matching item when match is not filled)
  name: string          // Processor name
  match?: RegExp|string // Processor matching regular expression (if not filled, it is id, not name! name can be translated or duplicated) If filled and is of regular expression type, it will not be displayed in the drop-down box
  default?: string|null // Default rule for drop-down selection, if not filled: non-regular expression defaults to id, if there is a regular expression, it is empty
  detail?: string       // Processor description
  // is_render?: boolean   // Whether to render the processor, defaults to true. False is for text processor
  process_alias?: string    // Assembly, if it is not an empty string, it will override the process method, but still need to give process an empty implementation
  process_param?: ProcessDataType
  process_return?: ProcessDataType
  process: (el:HTMLDivElement, header:string, content:string)=> any
                        // Processor
}

/** ab Processor - User Version, Interface and Registration Function
 * Use ab Processor Interface - User Version (all string storage)
 * Feature: Cannot register process (cannot be stored in txt), can only register aliases
 */
export interface ABProcessorSpecUser{
  id:string
  name:string
  match:string
  process_alias:string
}
