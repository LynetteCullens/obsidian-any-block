export function getID(length=16){
  return Number(Math.random().toString().substr(3,length) + Date.now()).toString(36);
}

// Let's say we can refer to https://github.com/stonehank/html-to-md
/*export function html2md(el:HTMLElement):string{
  if (el instanceof HTMLUListElement
    || el instanceof HTMLQuoteElement
    || el instanceof HTMLPreElement
  ){
    if(lastEl instanceof HTMLParagraphElement){}


  }

  return html2md('strong and italic', options, force)
}*/
