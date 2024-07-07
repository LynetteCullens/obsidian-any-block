import html2md from 'html-to-md';
import { ABReg } from "src/config/abReg";
import { ConfDecoration, ConfSelect } from "src/config/abSettingTab";
import { ReplaceRender } from "./replaceRenderChild";
import { ABProcessManager } from "src/replace/abProcessorManager";

/**
 * Html Processor
 * Possible Invocations:
 *   1. Global HTML divided into multiple blocks, each called once
 *   2. Called for each rendering item during local rendering (MarkdownRenderer.renderMarkdown method)
 *   3. Called when creating root nodes (.replaceEl)
 *   4. State is cached; if switched back to edit mode without changes, it won't be called again
 *
 * Overall Logic:
 * - Post processor with markdown restoration functionality
 */
export class ABPosthtmlManager {
  static processor(el, ctx) {
    // Disable if not enabled in settings
    if (this.settings.decoration_render == ConfDecoration.none)
      return;

    // Get source markdown for el
    const mdSrc = getSourceMarkdown(el, ctx);

    // 1. Called due to RenderMarkdown (need to recursively find)
    if (!mdSrc) {
      if (!el.classList.contains("markdown-rendered"))
        return;
      findABBlockRecurve(el);
      // Also fix image errors caused by RenderMarkdown
      // fixing_img(el)
    }
    // 2. Called for each block when splitting HTML (need to find across blocks)
    else {
      for (const subEl of el.children) {
        findABBlockCross(subEl, ctx);
      }

      // Finish and enable global selector
      if (mdSrc.to_line == mdSrc.content.split("\n").length) {
        findABBlockGlobal(el, ctx);
        return;
      } else if (el.classList.contains("mod-footer")) {
        findABBlockGlobal(el, ctx);
        return;
      }
    }
  }
}

/**
 * Find AB Block - Recursive Version
 * Features:
 *  1. Recursive call
 */
function findABBlockRecurve(targetEl) {
  console.log("Preparing to render again", targetEl);
  for (let i = 0; i < targetEl.children.length; i++) {
    const contentEl = targetEl.children[i];
    let headerEl;
    headerEl = i == 0 ? null : targetEl.children[i - 1];

    if (!(contentEl instanceof HTMLUListElement ||
      contentEl instanceof HTMLQuoteElement ||
      contentEl instanceof HTMLPreElement ||
      contentEl instanceof HTMLTableElement))
      continue;

    if (i == 0 || !(headerEl instanceof HTMLParagraphElement)) {
      if (contentEl instanceof HTMLUListElement ||
        contentEl instanceof HTMLQuoteElement)
        findABBlockRecurve(contentEl);
      continue;
    }

    const headerMatch = headerEl.textContent.match(ABReg.reg_header);
    if (!headerMatch) {
      if (contentEl instanceof HTMLUListElement ||
        contentEl instanceof HTMLQuoteElement)
        findABBlockRecurve(contentEl);
      continue;
    }

    const headerStr = headerMatch[4];

    const newEl = document.createElement("div");
    newEl.classList.add("ab-re-rendered");
    headerEl.parentNode.insertBefore(newEl, headerEl.nextSibling);
    ABProcessManager.getInstance().autoABProcessor(newEl, headerStr, html2md(contentEl.innerHTML));

    contentEl.style.display = "none";
    headerEl.style.display = "none";
  }
}

/**
 * Find AB Block - Cross Block Version
 * Features:
 *  1. Traverse through optimized split blocks for AB
 *  2. Only root AB blocks use MarkdownRenderChild for rendering
 *  3. Only search for root AB blocks (currently not functional for this feature)
 */
function findABBlockCross(targetEl, ctx) {
  if (targetEl instanceof HTMLUListElement ||
    targetEl instanceof HTMLQuoteElement ||
    targetEl instanceof HTMLPreElement ||
    targetEl instanceof HTMLTableElement) {
    replaceABBlock(targetEl, ctx);
  }
}

/**
 * Attempt to convert el
 * Determine if there is a header and replace the element
 */
function replaceABBlock(targetEl, ctx) {
  const range = getSourceMarkdown(targetEl, ctx);
  if (!range || !range.header)
    return false;

  if (range.selector == "list") {
    if (range.header.indexOf("2") == 0)
      range.header = "list" + range.header;
  }

  ctx.addChild(new ReplaceRender(targetEl, range.header, range.content));
}

/**
 * Find AB Block - Global Selector Version, rendered only once in the same document
 */
function findABBlockGlobal(el, ctx) {
  const pageEl = document.querySelectorAll(".workspace-leaf.mod-active .markdown-preview-section")[0];
  if (!pageEl)
    return;

  let prevHeader = "";
  let prevEl = null;
  let prevFromLine = 0;
  let prevHeadingLevel = 0;

  for (let i = 0; i < pageEl.children.length; i++) {
    const divEl = pageEl.children[i];
    if (divEl.classList.contains("mod-header") ||
      divEl.classList.contains("markdown-preview-pusher"))
      continue;
    if (divEl.classList.contains("mod-footer"))
      break;

    // Handle previously processed local selectors, and...
    (function () {
      if (!divEl.children[0])
        return;

      const subEl = divEl.children[0];
      if (!(subEl instanceof HTMLElement) || !subEl.classList.contains("ab-replace"))
        return;

      // Hide header block of local selector
      const divElLast = pageEl.children[i - 1];
      if (divElLast.children.length === 1) {
        const subElLast = divElLast.children[0];
        if (subElLast instanceof HTMLParagraphElement &&
          ABReg.reg_header.test(subElLast.textContent))
          divElLast.style.display = "none";
      }
    })();

    if (prevHeadingLevel === 0) {
      if (!divEl.children[0] || !(divEl.children[0] instanceof HTMLHeadingElement))
        continue;

      const mdSrc = getSourceMarkdown(divEl, ctx);
      if (!mdSrc || mdSrc.header === "")
        continue;

      const match = mdSrc.content.match(ABReg.reg_heading);
      if (!match)
        continue;

      prevHeadingLevel = match[1].length;
      prevHeader = mdSrc.header;
      prevFromLine = mdSrc.from_line;
      prevEl = divEl.children[0];

      // Hide header block of global selector
      const divElLast = pageEl.children[i - 1];
      if (divElLast.children.length === 1) {
        const contentElLast = divElLast.children[0];
        if (contentElLast instanceof HTMLParagraphElement &&
          ABReg.reg_header.test(contentElLast.textContent))
          divElLast.style.display = "none";
      }
    } else {
      if (!divEl.children[0]) {
        divEl.style.display = "none";
        continue;
      }
      if (!(divEl.children[0] instanceof HTMLHeadingElement)) {
        divEl.style.display = "none";
        continue;
      }

      const mdSrc = getSourceMarkdown(divEl, ctx);
      if (!mdSrc) {
        divEl.style.display = "none";
        continue;
      }

      const match = mdSrc.content.match(ABReg.reg_heading);
      if (!match || match[1].length >= prevHeadingLevel) {
        divEl.style.display = "none";
        continue;
      }

      // Render
      const cElLast = pageEl.children[i - 1];
      const mdSrcLast = getSourceMarkdown(cElLast, ctx);
      if (!mdSrcLast) {
        console.warn("Unexpected situation occurred when ending title selector.");
        return;
      }

      const header = prevHeader ?? "md";
      const content = mdSrcLast.content.split("\n")
        .slice(prevFromLine, mdSrcLast.to_line).join("\n");

      if (prevEl)
        ctx.addChild(new ReplaceRender(prevEl, header, content));

      prevHeader = "";
      prevFromLine = 0;
      prevHeadingLevel = 0;
      prevEl = null;
      i--; /** Backtrack one step; @bug Next header line will be hidden by the previous one */
    }
  }

  if (prevHeadingLevel > 0) {
    const i = pageEl.children.length - 1;
    const cElLast = pageEl.children[i - 1];
    const mdSrcLast = getSourceMarkdown(cElLast, ctx);
    if (!mdSrcLast) {
      console.warn("Unexpected situation occurred when ending title selector.");
      return;
    }

    const header = prevHeader ?? "md";
    const content = mdSrcLast.content.trim().split("\n")
      .slice(prevFromLine, mdSrcLast.to_line).join("\n");

    if (prevEl)
      ctx.addChild(new ReplaceRender(prevEl, header, content));
  }
}

/**
 * Get HTML Source Markdown
 * Called by processTextSection
 * @returns Three possible results
 *  1. Failed to get info: return null
 *  2. Successfully got info, meets AB block condition: return HTMLSelectorRangeSpec
 *  3. Successfully got info, does not meet AB block condition: return HTMLSelectorRangeSpec, but header is ""
 */
function getSourceMarkdown(sectionEl, ctx) {
  const info = ctx.getSectionInfo(sectionEl);
  if (info) {
    let range = {
      from_line: 0,
      to_line: 1,
      header: "",
      content: ""
    };

    // Directly accesses HTML metadata
    const reference = ConfSelect[info.id] ?? {};
    if (reference.range) {
      range = reference.range;
    } else if (reference.from_line) {
      range.from_line = reference.from_line;
      range.to_line = reference.to_line;
    } else if (reference.header) {
      range.header = reference.header;
    }

    // Check and extract header for AB process
    const range = [...sectionEl.children].find(el =>
      el.classList.contains("ab-renderer"))[ 0 ];
      let not represents need current page. of with So js this incididunt verifications consequat from adipiscing You all amet
