/** @attention Be careful when modifying regular expressions to make sure that the positions of parentheses correspond, otherwise you will have to modify the index */
export const ABReg = {
  reg_header:   /^((\s|>\s|-\s|\*\s|\+\s)*)(\[(?!\[)(.*)\])\s*$/,

  // Prefixed version (for selectors)
  reg_headtail: /^((\s|>\s|-\s|\*\s|\+\s)*)(:::)(.*)/,
  reg_list:     /^((\s|>\s|-\s|\*\s|\+\s)*)(-\s|\*\s|\+\s)(.*)/,  //: /^\s*(>\s)*-\s(.*)$/
  reg_code:     /^((\s|>\s|-\s|\*\s|\+\s)*)(```|~~~)(.*)/,      //: /^\s*(>\s|-\s)*(```|~~~)(.*)$/
  reg_quote:    /^((\s|>\s|-\s|\*\s|\+\s)*)(>\s)(.*)/,          // `- > ` is not matched, it should be considered as a list
  reg_heading:  /^((\s|>\s|-\s|\*\s|\+\s)*)(\#+\s)(.*)/,
  reg_table:    /^((\s|>\s|-\s|\*\s|\+\s)*)(\|(.*)\|)/,

  // Non-prefixed version (for processors, processors don't need to handle prefixes, prefixes have been removed in the selector stage)
  reg_headtail_noprefix: /^((\s)*)(:::)(.*)/,
  reg_list_noprefix:     /^((\s)*)(-\s|\*\s|\+\s)(.*)/,
  reg_code_noprefix:     /^((\s)*)(```|~~~)(.*)/,      
  reg_quote_noprefix:    /^((\s)*)(>\s)(.*)/,          
  reg_heading_noprefix:  /^((\s)*)(\#+\s)(.*)/,         
  reg_table_noprefix:    /^((\s)*)(\|(.*)\|)/,

  reg_emptyline_noprefix:/^\s*$/,
  reg_indentline_noprefix:/^\s+?\S/,
}
