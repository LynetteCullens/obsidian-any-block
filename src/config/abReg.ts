/** @attention When modifying regex, pay attention to the position of parentheses to ensure they correspond correctly, otherwise index adjustments will be necessary */
export const ABReg = {
  reg_header:   /^((\s|>\s|-\s|\*\s|\+\s)*)(\[(?!\[)(.*)\])\s*$/,

  // Prefixed version (for selectors)
  reg_headtail: /^((\s|>\s|-\s|\*\s|\+\s)*)(:::)(.*)/,
  reg_list:     /^((\s|>\s|-\s|\*\s|\+\s)*)(-\s|\*\s|\+\s)(.*)/,  //: /^\s*(>\s)*-\s(.*)$/
  reg_code:     /^((\s|>\s|-\s|\*\s|\+\s)*)(```|~~~)(.*)/,      //: /^\s*(>\s|-\s)*(```|~~~)(.*)$/
  reg_quote:    /^((\s|>\s|-\s|\*\s|\+\s)*)(>\s)(.*)/,          // `- > ` does not match; such cases should be recognized as lists
  reg_heading:  /^((\s|>\s|-\s|\*\s|\+\s)*)(\#+\s)(.*)/,
  reg_table:    /^((\s|>\s|-\s|\*\s|\+\s)*)(\|(.*)\|)/,

  // Unprefixed version (for processors, which do not need to handle prefixes as they are already removed at the selector stage)
  reg_headtail_noprefix: /^((\s)*)(:::)(.*)/,
  reg_list_noprefix:     /^((\s)*)(-\s|\*\s|\+\s)(.*)/,
  reg_code_noprefix:     /^((\s)*)(```|~~~)(.*)/,      
  reg_quote_noprefix:    /^((\s)*)(>\s)(.*)/,          
  reg_heading_noprefix:  /^((\s)*)(\#+\s)(.*)/,         
  reg_table_noprefix:    /^((\s)*)(\|(.*)\|)/,

  reg_emptyline_noprefix: /^\s*$/,
  reg_indentline_noprefix: /^\s+?\S/,
};
