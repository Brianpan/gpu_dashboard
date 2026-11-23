// Minimal RFC-4180 parser: handles quoted fields with embedded commas, since
// the throughput methodology column contains free-text notes.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export async function fetchCsv(path: string): Promise<Record<string, string>[]> {
  const res = await fetch(path);
  const text = await res.text();
  const rows = parseCsvRows(text.trim());
  const header = rows[0]!;
  return rows.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    header.forEach((key, i) => (row[key] = cells[i] ?? ""));
    return row;
  });
}
