export function rows(csv: string): Record<string,string>[] {
  const entries: string[][] = []; let current: string[] = [], cell = "", quoted = false;
  const input = csv.replace(/^\uFEFF/,"");
  const headerLine=input.split(/\r?\n/,1)[0]??"";
  const delimiter=(headerLine.match(/;/g)??[]).length>(headerLine.match(/,/g)??[]).length?";":",";
  for (let i=0;i<input.length;i++) {
    const ch=input[i];
    if (ch==='"') { if (quoted && input[i+1]==='"') {cell+='"'; i++;} else quoted=!quoted; }
    else if (ch===delimiter && !quoted) {current.push(cell); cell="";}
    else if ((ch==="\n" || ch==="\r") && !quoted) {if(ch==="\r" && input[i+1]==="\n")i++; current.push(cell); entries.push(current); current=[]; cell="";}
    else cell+=ch;
  }
  if (quoted) throw new Error("CSV inválido: aspas não fechadas");
  if (current.length || cell) {current.push(cell); entries.push(current);}
  const [header,...lines]=entries;
  if(!header)throw new Error("CSV vazio");
  return lines.filter(x=>x.some(v=>v.trim())).map(line=>Object.fromEntries(header.map((key,i)=>[key.trim(),line[i]??""])));
}

