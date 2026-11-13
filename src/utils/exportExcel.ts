/**
 * Generator nativ OOXML (.xlsx) fără dependențe externe.
 * Creează o arhivă ZIP (STORE) validă cu stilizare Blue Trans, lățimi automate de coloană,
 * rând de antet înghețat, AutoFilter și suport complet pentru diacritice UTF-8 & celule numerice.
 */

export type ExcelCellValue = string | number | boolean | null | undefined;

export interface ExcelColumn<T> {
  header: string;
  value: (row: T, index: number) => ExcelCellValue;
  minWidth?: number;
  maxWidth?: number;
}

export interface ExportExcelOptions<T> {
  fileName: string;
  sheetName: string;
  rows: readonly T[];
  columns: readonly ExcelColumn<T>[];
}

const textEncoder = new TextEncoder();

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(raw: string): string {
  // Elimină caracterele de control invalide în XML 1.0
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colIndexToLetters(zeroBasedIdx: number): string {
  let n = zeroBasedIdx;
  let letters = '';
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

function sanitizeSheetName(raw: string): string {
  const stripped = raw.replace(/[\\/?*[\]:]/g, ' ').trim();
  return (stripped || 'Export').slice(0, 31);
}

function formatCellValueText(val: ExcelCellValue): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'Da' : 'Nu';
  return String(val);
}

function getDosTimestamp(): { time: number; date: number } {
  const now = new Date();
  const year = Math.max(1980, now.getFullYear());
  const time =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const date =
    (((year - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);
  return { time, date };
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Construiește o arhivă ZIP validă folosind metoda STORE (fără compresie, CRC32 exact). */
function buildZipArchive(entries: readonly ZipEntry[]): Uint8Array {
  const { time: dosTime, date: dosDate } = getDosTimestamp();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const dataBytes = entry.data;
    const sum = crc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed (2.0)
    lv.setUint16(6, 0x0800, true); // Bit 11: UTF-8 filename
    lv.setUint16(8, 0, true); // Compression: STORE
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, sum, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central directory signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0x0800, true); // Bit 11: UTF-8 filename
    cv.setUint16(10, 0, true); // Compression: STORE
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // Extra length
    cv.setUint16(32, 0, true); // Comment length
    cv.setUint16(34, 0, true); // Disk number start
    cv.setUint16(36, 0, true); // Internal attrs
    cv.setUint32(38, 0, true); // External attrs
    cv.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    localChunks.push(localHeader, dataBytes);
    centralChunks.push(centralHeader);
    offset += localHeader.length + size;
  }

  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // End of central directory
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLength = offset + centralSize + eocd.length;
  const archive = new Uint8Array(totalLength);
  let cursor = 0;
  for (const chunk of localChunks) {
    archive.set(chunk, cursor);
    cursor += chunk.length;
  }
  for (const chunk of centralChunks) {
    archive.set(chunk, cursor);
    cursor += chunk.length;
  }
  archive.set(eocd, cursor);
  return archive;
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F274A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function buildWorksheetXml<T>(
  rows: readonly T[],
  columns: readonly ExcelColumn<T>[]
): string {
  const colWidths = columns.map((col) => col.header.length + 4);
  const rowXmlParts: string[] = [];

  // Antet tabel (rândul 1)
  const headerCells = columns
    .map((col, colIdx) => {
      const ref = `${colIndexToLetters(colIdx)}1`;
      return `<c r="${ref}" t="inlineStr" s="1"><is><t xml:space="preserve">${escapeXml(col.header)}</t></is></c>`;
    })
    .join('');
  rowXmlParts.push(`<row r="1" ht="24" customHeight="1">${headerCells}</row>`);

  // Rânduri de date
  rows.forEach((row, rowIdx) => {
    const excelRowNum = rowIdx + 2;
    const styleId = rowIdx % 2 === 1 ? 2 : 0;
    const cellsXml = columns
      .map((col, colIdx) => {
        const val = col.value(row, rowIdx);
        const textLen = formatCellValueText(val).length + 3;
        if (textLen > colWidths[colIdx]) {
          colWidths[colIdx] = textLen;
        }
        const ref = `${colIndexToLetters(colIdx)}${excelRowNum}`;
        if (typeof val === 'number' && Number.isFinite(val)) {
          return `<c r="${ref}" s="${styleId}"><v>${val}</v></c>`;
        }
        const text = formatCellValueText(val);
        return `<c r="${ref}" t="inlineStr" s="${styleId}"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
      })
      .join('');
    rowXmlParts.push(`<row r="${excelRowNum}" ht="20" customHeight="1">${cellsXml}</row>`);
  });

  const colsXml = columns
    .map((col, idx) => {
      const minW = col.minWidth ?? 6;
      const maxW = col.maxWidth ?? 46;
      const width = Math.min(maxW, Math.max(minW, colWidths[idx]));
      return `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`;
    })
    .join('');

  const lastCol = colIndexToLetters(Math.max(0, columns.length - 1));
  const lastRow = rows.length + 1;
  const dimensionRef = `A1:${lastCol}${lastRow}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimensionRef}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowXmlParts.join('')}</sheetData>
  <autoFilter ref="${dimensionRef}"/>
</worksheet>`;
}

/** Construiește binarul OOXML (.xlsx) gata de descărcare sau testare. */
export function buildExcelXlsxBytes<T>(options: ExportExcelOptions<T>): Uint8Array {
  const safeSheet = sanitizeSheetName(options.sheetName);

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(safeSheet)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = buildStylesXml();
  const sheetXml = buildWorksheetXml(options.rows, options.columns);

  return buildZipArchive([
    { name: '[Content_Types].xml', data: textEncoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: textEncoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', data: textEncoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', data: textEncoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: textEncoder.encode(sheetXml) },
  ]);
}

export function getRomaniaDateStamp(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Generează și descarcă un fișier Excel `.xlsx` nativ pentru lista transmisă. */
export function exportRowsToExcel<T>(options: ExportExcelOptions<T>): {
  fileName: string;
  rowCount: number;
} {
  const baseName = options.fileName.replace(/\.xlsx$/i, '');
  const finalFileName = `${baseName}_${getRomaniaDateStamp()}.xlsx`;
  const bytes = buildExcelXlsxBytes(options);
  const copyBuffer = new Uint8Array(bytes.byteLength);
  copyBuffer.set(bytes);
  const blob = new Blob([copyBuffer.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { fileName: finalFileName, rowCount: options.rows.length };
}
