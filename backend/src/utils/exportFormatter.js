const normalizeCellValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    if (value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))) {
      return value.join(" | ");
    }

    return JSON.stringify(value);
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const flattenRowForCsv = (row, prefix = "") => {
  return Object.entries(row || {}).reduce((flattened, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(flattened, flattenRowForCsv(value, nextKey));
      return flattened;
    }

    flattened[nextKey] = normalizeCellValue(value);
    return flattened;
  }, {});
};

const escapeCsvCell = (value) => {
  const normalized = normalizeCellValue(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
};

const buildCsvFromRows = (rows) => {
  const flattenedRows = rows.map((row) => flattenRowForCsv(row));
  const headers = [...new Set(flattenedRows.flatMap((row) => Object.keys(row)))];

  if (headers.length === 0) {
    return "";
  }

  const lines = [headers.join(",")];

  for (const row of flattenedRows) {
    lines.push(headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","));
  }

  return lines.join("\n");
};

export { buildCsvFromRows };