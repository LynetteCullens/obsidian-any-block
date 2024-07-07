import { MarkdownRenderer, MarkdownRenderChild, } from 'obsidian'
import mermaid from "mermaid"
import {getID} from "src/utils/utils"
import { ABReg } from 'src/config/abReg'

import GeneratorBranchTable from "src/svelte/GeneratorBranchTable.svelte"
import GeneratorListTable from "src/svelte/GeneratorListTable.svelte"
import GeneratorTab from "src/svelte/GeneratorTab.svelte"

// Common table data, one element equals a cell item
// interface TableItem{
//   level: number;          // Level
//   content: string;        // Content
//   tableRow: number,       // Number of rows spanned
//   tableLine: number       // Corresponding first line sequence
//   // Number of columns spanned
// }
// export type List_TableItem = TableItem[]
