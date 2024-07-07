import {
  MarkdownRenderChild,
  MarkdownRenderer,
} from "obsidian";

export class ABCodeblockManager {
  static processor(src, blockEl, ctx) {
    let child = new MarkdownRenderChild(blockEl);
    ctx.addChild(child);

    blockEl.classList.add("markdown-rendered");
    MarkdownRenderer.renderMarkdown(src, blockEl, ctx.sourcePath, child);
  }
}
