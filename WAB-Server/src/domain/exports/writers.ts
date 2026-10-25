import ExcelJS from 'exceljs';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import {
  CSV_BOM,
  EXPORT_FILES,
  PDF_FONT_SIZE,
  PDF_FONTS,
  PDF_FONT_DIR,
  ARABIC_TEXT_PATTERN,
  PDF_CELL_PADDING,
  PDF_MARGIN,
  PDF_ROW_HEIGHT,
  PDF_TITLE_SIZE,
  type ExportFormat,
} from '../../constants/exports';

export type Cell = string | number | boolean | null;

export interface ExportTable {
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly Cell[])[];
}

export interface RenderedFile {
  readonly body: Buffer;
  readonly contentType: string;
  readonly extension: string;
}

/** Cells that a spreadsheet would read as a formula get a leading apostrophe (CSV/Excel injection). */
const FORMULA_START = /^[=+\-@\t\r]/;
export const safeText = (value: Cell): string => {
  const text = value === null ? '' : String(value);
  return FORMULA_START.test(text) ? `'${text}` : text;
};
/** Numbers stay numbers; text is neutralized. */
const safeCell = (value: Cell): string | number | boolean =>
  typeof value === 'number' || typeof value === 'boolean' ? value : safeText(value);

const csvField = (text: string): string =>
  /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;

const renderCsv = (table: ExportTable): Buffer => {
  const lines = [table.columns.map((c) => csvField(safeText(c))).join(',')];
  for (const row of table.rows) lines.push(row.map((c) => csvField(safeText(c))).join(','));
  return Buffer.from(CSV_BOM + lines.join('\r\n') + '\r\n', 'utf8');
};

const renderXlsx = async (table: ExportTable): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(table.title.slice(0, 31));
  sheet.addRow(table.columns.map(safeText)).font = { bold: true };
  for (const row of table.rows) sheet.addRow(row.map(safeCell));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const written = await workbook.xlsx.writeBuffer();
  return Buffer.from(written);
};

/** `WAB-Server/assets/fonts/<file>` from `src/` and from `dist/` alike. */
const fontPath = (file: string): string =>
  resolve(__dirname, '..', '..', '..', ...PDF_FONT_DIR, file);

const renderPdf = (table: ExportTable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: PDF_MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);
    for (const font of Object.values(PDF_FONTS)) doc.registerFont(font.name, fontPath(font.file));
    const width = doc.page.width - PDF_MARGIN * 2;
    const columnWidth = width / Math.max(table.columns.length, 1);
    const drawRow = (cells: readonly Cell[], bold: boolean): void => {
      if (doc.y + PDF_ROW_HEIGHT > doc.page.height - PDF_MARGIN) doc.addPage();
      const y = doc.y;
      doc.font(bold ? PDF_FONTS.bold.name : PDF_FONTS.regular.name).fontSize(PDF_FONT_SIZE);
      cells.forEach((cell, i) => {
        const text = safeText(cell);
        doc.text(text, PDF_MARGIN + i * columnWidth, y, {
          width: columnWidth - PDF_CELL_PADDING,
          height: PDF_ROW_HEIGHT,
          ellipsis: true,
          lineBreak: false,
          align: ARABIC_TEXT_PATTERN.test(text) ? 'right' : 'left',
        });
      });
      doc.y = y + PDF_ROW_HEIGHT;
      doc.x = PDF_MARGIN;
    };
    doc.font(PDF_FONTS.bold.name).fontSize(PDF_TITLE_SIZE).text(table.title);
    doc.moveDown();
    drawRow(table.columns, true);
    for (const row of table.rows) drawRow(row, false);
    doc.end();
  });

/** Writes the table as the requested file. PDF embeds a font with Arabic shaping (SRV-126). */
export const renderTable = async (
  table: ExportTable,
  format: ExportFormat,
): Promise<RenderedFile> => {
  const file = EXPORT_FILES[format];
  const body =
    format === 'CSV'
      ? renderCsv(table)
      : format === 'XLSX'
        ? await renderXlsx(table)
        : await renderPdf(table);
  return { body, contentType: file.contentType, extension: file.extension };
};
