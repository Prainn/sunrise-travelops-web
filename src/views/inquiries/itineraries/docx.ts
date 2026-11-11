import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import quoteHeaderUrl from "@/assets/images/quote/header.png";
import quoteFooterUrl from "@/assets/images/quote/footer.png";
import type {
  ItineraryQuoteCalculation,
  ItineraryRecord,
  LegacyQuoteCalculation,
  PaxQuoteCalculation,
} from "@/types/itinerary";
import { formatMoney } from "@/utils";
import { buildCustomerDocument, type CustomerDocument, type CustomerSnapshot } from "./customer-document";

export interface ItineraryWordDocument {
  blob: Blob;
  fileName: string;
}
export interface QuoteImages {
  header?: Uint8Array;
  footer?: Uint8Array;
}
interface WordSnapshot extends CustomerSnapshot {
  calculation: ItineraryQuoteCalculation;
}

const FONT = "Microsoft YaHei";
const BORDER = { style: "single" as const, size: 4, color: "9CA3AF" };
// 190 mm content width at 96 dpi, matching the PDF header and footer images.
const IMAGE_WIDTH = 718;

const text = (value: string, options: { bold?: boolean; size?: number } = {}) =>
  new TextRun({ text: value, bold: options.bold, size: options.size ?? 21, font: FONT });

function cell(
  value: string,
  options: {
    bold?: boolean;
    align?: "left" | "center";
    fill?: string;
    columnSpan?: number;
    rowSpan?: number;
    width?: number;
  } = {},
) {
  return new TableCell({
    columnSpan: options.columnSpan,
    rowSpan: options.rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.fill
      ? { type: ShadingType.CLEAR, fill: options.fill, color: "auto" }
      : undefined,
    borders: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: value.split("\n").map(
      (line) =>
        new Paragraph({
          alignment: options.align === "left" ? AlignmentType.LEFT : AlignmentType.CENTER,
          children: [text(line, { bold: options.bold })],
        }),
    ),
  });
}

const table = (rows: TableRow[], columnWidths?: number[]) =>
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths, rows });
const heading = (value: string) =>
  new Paragraph({
    spacing: { before: 200, after: 80 },
    keepNext: true,
    children: [text(value, { bold: true, size: 26 })],
  });
const spacer = () => new Paragraph({ spacing: { after: 100 }, children: [] });

function scheduleTable(customer: CustomerDocument) {
  const header = ["D", "DEPART.", "T", "SIGHT-SEEING REGION", "HOTEL", "M"];
  return table([
    new TableRow({
      tableHeader: true,
      children: header.map((label) => cell(label, { bold: true, fill: "F3F4F6" })),
    }),
    ...customer.schedule.map(
      (day) =>
        new TableRow({
          cantSplit: true,
          children: [
            cell(day.dayLabel),
            cell(day.route),
            cell(day.transport),
            cell(day.description, { align: "left" }),
            cell(day.hotel),
            cell(day.meals),
          ],
        }),
    ),
  ]);
}

function termsTable(customer: CustomerDocument) {
  const { text: labels, termRows: rows } = customer;
  return table([
    ...rows.map(
      ([label, value], index) =>
        new TableRow({
          children: [
            ...(index === 0
              ? [cell(labels.included, { bold: true, fill: "F9FAFB", rowSpan: rows.length })]
              : []),
            cell(label, { bold: true, fill: "F9FAFB" }),
            cell(value, { align: "left" }),
          ],
        }),
    ),
    new TableRow({
      children: [
        cell(labels.excluded, { bold: true, fill: "F9FAFB", columnSpan: 2 }),
        cell(labels.exclusions.map((line, index) => `${index + 1}] ${line}`).join("\n"), {
          align: "left",
        }),
      ],
    }),
  ]);
}

function extraFeeRows(customer: CustomerDocument, span: number) {
  return customer.extraFees.map(
    ([label, value]) =>
      new TableRow({
        children: [cell(label, { bold: true, fill: "F9FAFB" }), cell(value, { columnSpan: span })],
      }),
  );
}

function paxQuoteTables(
  itinerary: ItineraryRecord,
  quote: PaxQuoteCalculation,
  showChildPrice: boolean,
  customer: CustomerDocument,
) {
  const { text: labels } = customer;
  return quote.options.flatMap((option) => {
    const hasBedRates = option.paxPrices.some((price) => price.childWithoutBedUnitPrice != null);
    const childLabels = showChildPrice
      ? hasBedRates
        ? [labels.childWithBed(itinerary.childRate), labels.childWithoutBed(itinerary.childWithoutBedRate)]
        : [labels.childRate(itinerary.childRate)]
      : [];
    const header = [labels.paxTier, labels.adult, ...childLabels, labels.singleSupplement];
    const title = `${customer.hotelTierLabel(option.hotelTier)} · ${customer.vehicleLabel(option.vehicleTier)}`;
    return [
      table([
        new TableRow({
          children: [cell(title, { bold: true, fill: "F3F4F6", columnSpan: header.length })],
        }),
        new TableRow({
          children: header.map((label) => cell(label, { bold: true, fill: "F3F4F6" })),
        }),
        ...option.paxPrices.map(
          (price) =>
            new TableRow({
              children: [
                cell(`${price.pax} PAX`, { bold: true, fill: "F9FAFB" }),
                cell(`RMB ${formatMoney(price.adultUnitPrice)}`),
                ...(showChildPrice
                  ? [
                    cell(`RMB ${formatMoney(price.childUnitPrice)}`),
                    ...(hasBedRates
                      ? [cell(`RMB ${formatMoney(price.childWithoutBedUnitPrice)}`)]
                      : []),
                  ]
                  : []),
                cell(`RMB ${formatMoney(price.singleSupplementUnitCost)}`),
              ],
            }),
        ),
        ...extraFeeRows(customer, header.length - 1),
      ]),
      spacer(),
    ];
  });
}

// Pre-PAX frozen quotes keep their original per-option layout.
function legacyQuoteTables(
  itinerary: ItineraryRecord,
  quote: LegacyQuoteCalculation,
  showChildPrice: boolean,
  customer: CustomerDocument,
) {
  const legacy = itinerary as unknown as {
    adults: number;
    childrenCount: number;
    quote: { options: Array<{ id: string; hotelTier: string; vehicleTier: "standard" | "vip" }> };
  };
  const guests = legacy.adults + legacy.childrenCount;
  const options = legacy.quote.options.flatMap((option) => {
    const calculation = quote.options.find((record) => record.optionId === option.id);
    return calculation ? [{ option, calculation }] : [];
  });
  if (!options.length) return [];
  const row = (label: string, value: (item: (typeof options)[number]) => string) =>
    new TableRow({
      children: [
        cell(label, { bold: true, fill: "F9FAFB" }),
        ...options.map((item) => cell(value(item))),
      ],
    });
  return [
    table([
      new TableRow({
        children: [
          cell("", { fill: "F3F4F6" }),
          ...options.map(({ option }) =>
            cell(
              `${customer.hotelTierLabel(option.hotelTier)}\n${guests}PAX【${customer.vehicleLabel(option.vehicleTier)}】`,
              { bold: true, fill: "F3F4F6" },
            ),
          ),
        ],
      }),
      row(customer.text.adult, ({ calculation }) => `RMB ${formatMoney(calculation.adultUnitPrice)} PP`),
      ...(showChildPrice && legacy.childrenCount
        ? [
          row(customer.text.child, ({ calculation }) => `RMB ${formatMoney(calculation.childUnitPrice)} PP`),
        ]
        : []),
      ...extraFeeRows(customer, options.length),
      row(
        customer.text.singleSupplement,
        ({ calculation }) => `RMB ${formatMoney(calculation.singleSupplementUnitCost)}`,
      ),
    ]),
    spacer(),
  ];
}

function image(data: Uint8Array | undefined, height: number) {
  return data
    ? [
      new Paragraph({
        children: [
          new ImageRun({ type: "png", data, transformation: { width: IMAGE_WIDTH, height } }),
        ],
      }),
    ]
    : [new Paragraph({ children: [] })];
}

/** Builds an editable DOCX from the same frozen customer data that feeds the PDF. */
export async function generateItineraryWordDocument(
  itinerary: ItineraryRecord,
  snapshot: WordSnapshot,
  showChildPrice = false,
  images: QuoteImages = {},
): Promise<ItineraryWordDocument> {
  const quote = snapshot.calculation;
  const customer = buildCustomerDocument(itinerary, snapshot);
  const { notes } = customer;
  const document = new Document({
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 2000, bottom: 1500, left: 567, right: 567, header: 567, footer: 400 },
          },
        },
        headers: { default: new Header({ children: image(images.header, 81) }) },
        footers: { default: new Footer({ children: image(images.footer, 45) }) },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [text(customer.title, { bold: true, size: 32 })],
          }),
          heading(customer.text.scheduleHeading),
          scheduleTable(customer),
          heading(customer.text.termsHeading),
          termsTable(customer),
          heading("pricingVersion" in quote ? customer.text.quoteHeading : customer.text.legacyQuoteHeading),
          ...("pricingVersion" in quote
            ? paxQuoteTables(itinerary, quote, showChildPrice, customer)
            : legacyQuoteTables(itinerary, quote, showChildPrice, customer)),
          ...(notes.length
            ? [
              heading(customer.text.notesHeading),
              ...notes.flatMap((note) =>
                note
                  .split("\n")
                  .map((line) => new Paragraph({ spacing: { after: 40 }, children: [text(line)] })),
              ),
            ]
            : []),
        ],
      },
    ],
  });
  const safe = (value: string) => value.replace(/[\\/:*?"<>|]/g, "-");
  return {
    blob: await Packer.toBlob(document),
    fileName: `${safe(itinerary.code)}-${safe(customer.title)}.docx`,
  };
}

export async function loadQuoteImages(): Promise<QuoteImages> {
  const [header, footer] = await Promise.all(
    [quoteHeaderUrl, quoteFooterUrl].map(
      async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer()),
    ),
  );
  return { header, footer };
}

export function downloadWordDocument(file: ItineraryWordDocument) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
