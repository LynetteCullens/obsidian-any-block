import type {MarkdownPostProcessorContext} from "obsidian"
import{
  MarkdownRenderChild,
  MarkdownRenderer,
} from "obsidian";

export class ABCodeblockManager{
  static processor(
    // plugin_this: AnyBlockPlugin,                       // 使用bind方法被绑进来的
    src: string,                                // Code block content
    blockEl: HTMLElement,                       // Element where the code block is rendered
    ctx: MarkdownPostProcessorContext,
  ) {
    let child = new MarkdownRenderChild(blockEl);
    ctx.addChild(child);
  
    blockEl.addClass("markdown-rendered")
    MarkdownRenderer.renderMarkdown(src, blockEl, ctx.sourcePath, child);
  }
}
