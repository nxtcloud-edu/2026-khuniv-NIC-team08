import { readFileSync } from "node:fs";

const CLOCK_TIMESTAMP = /^(\d{1,2}):(\d{2}):(\d{2})$/;
const TRANSCRIPT_RANGE = /^(\d{1,2}:\d{2}:\d{2}) --> (\d{1,2}:\d{2}:\d{2})$/;

export function clockToSeconds(timestamp) {
  const match = CLOCK_TIMESTAMP.exec(timestamp);
  if (!match) throw new Error(`Invalid HH:MM:SS timestamp: ${timestamp}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export function secondsToTimestamp(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function parseTranscript(text, recordingStartedAt) {
  const recordingStart = clockToSeconds(recordingStartedAt);
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

  return blocks.map((block, index) => {
    const [range, ...speechLines] = block.split("\n");
    const match = TRANSCRIPT_RANGE.exec(range);
    if (!match || speechLines.length === 0) {
      throw new Error(`Invalid transcript block ${index + 1}`);
    }

    const speakerAndText = speechLines.join(" ").match(/^([^:]+):\s*(.+)$/);
    if (!speakerAndText) throw new Error(`Missing speaker in transcript block ${index + 1}`);

    return {
      start: clockToSeconds(match[1]) - recordingStart,
      end: clockToSeconds(match[2]) - recordingStart,
      speaker: speakerAndText[1].trim(),
      text: speakerAndText[2].trim(),
    };
  });
}

function indexPdfObjects(pdfBytes) {
  const pdfText = pdfBytes.toString("latin1");
  const matches = [...pdfText.matchAll(/(?:^|[\r\n])(\d+)\s+(\d+)\s+obj\b/g)];
  const objects = new Map();

  matches.forEach((match, index) => {
    const objectNumber = Number(match[1]);
    const start = match.index + match[0].indexOf(match[1]);
    const end = index + 1 < matches.length ? matches[index + 1].index : pdfBytes.length;
    objects.set(objectNumber, { start, end, text: pdfText.slice(start, end) });
  });
  return objects;
}

export function extractJpegPages(pdfPath) {
  const pdfBytes = readFileSync(pdfPath);
  if (!pdfBytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error(`${pdfPath} is not a PDF file`);
  }

  const objects = indexPdfObjects(pdfBytes);
  const pageObjects = [...objects.entries()]
    .filter(([, object]) => /\/Type\s*\/Page(?!s)\b/.test(object.text))
    .sort(([left], [right]) => left - right);

  return pageObjects.map(([pageObjectNumber, pageObject], index) => {
    const imageReference = /\/XObject\s*<<[\s\S]*?\/\w+\s+(\d+)\s+\d+\s+R/.exec(
      pageObject.text,
    );
    if (!imageReference) throw new Error(`PDF page object ${pageObjectNumber} has no image`);

    const imageObjectNumber = Number(imageReference[1]);
    const imageObject = objects.get(imageObjectNumber);
    if (!imageObject || !/\/Subtype\s*\/Image\b/.test(imageObject.text)) {
      throw new Error(`PDF page ${index + 1} does not reference an image object`);
    }
    if (!/\/Filter\s*\/DCTDecode\b/.test(imageObject.text)) {
      throw new Error(`PDF page ${index + 1} is not backed by a JPEG image`);
    }

    const streamMarker = imageObject.text.indexOf("stream");
    const header = imageObject.text.slice(0, streamMarker);
    const length = Number(/\/Length\s+(\d+)/.exec(header)?.[1]);
    const width = Number(/\/Width\s+(\d+)/.exec(header)?.[1]);
    const height = Number(/\/Height\s+(\d+)/.exec(header)?.[1]);
    if (streamMarker < 0 || !Number.isFinite(length)) {
      throw new Error(`Invalid JPEG stream on PDF page ${index + 1}`);
    }

    const absoluteStreamMarker = imageObject.start + streamMarker;
    let dataStart = absoluteStreamMarker + "stream".length;
    if (pdfBytes[dataStart] === 13) dataStart += 1;
    if (pdfBytes[dataStart] === 10) dataStart += 1;
    const jpeg = pdfBytes.subarray(dataStart, dataStart + length);
    if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
      throw new Error(`Invalid JPEG signature on PDF page ${index + 1}`);
    }

    return { pageNumber: index + 1, width, height, jpeg };
  });
}

export function isMp4File(filePath) {
  const header = readFileSync(filePath).subarray(0, 32);
  return header.length >= 12 && header.toString("ascii", 4, 8) === "ftyp";
}
