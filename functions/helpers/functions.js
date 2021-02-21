const QRCode = require('qrcode');
const stream = require('stream');
const admin = require("firebase-admin");
const whitespace = '[\\0\\t\\n\\f\\r\\ ]+';
const forwardSlash = '\\/';
const alphanumerics = '\\w+';
const decimal = '\\d+\\.\\d+|\\d+';
const moment = require('moment');
require("moment/locale/es");

const { PDFRawStream, decodePDFRawStream, arrayAsString, PDFRef } = require('pdf-lib');


// prettier-ignore
const whiteBackgroundOperatorsRegex = new RegExp(
  `${forwardSlash}${alphanumerics}${whitespace}cs${whitespace}` +
  `1${whitespace}1${whitespace}1${whitespace}sc${whitespace}` +
  `(?<x1>${decimal})${whitespace}(?<y1>${decimal})${whitespace}m${whitespace}` +
  `(?<x2>${decimal})${whitespace}(?<y2>${decimal})${whitespace}l${whitespace}` +
  `(?<x3>${decimal})${whitespace}(?<y3>${decimal})${whitespace}l${whitespace}` +
  `(?<x4>${decimal})${whitespace}(?<y4>${decimal})${whitespace}l${whitespace}` +
  `h${whitespace}` +
  `f`
);

const streamToBuffer = stream => {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  })
};

exports.getLinesOfText = (text, font, fontSize, maxWidth) => {
  let linesOfText = [];
  var paragraphs = text.split('\n');
  for (let index = 0; index < paragraphs.length; index++) {
    var paragraph = paragraphs[index];
    if (font.widthOfTextAtSize(paragraph, fontSize) > maxWidth) {
      var words = paragraph.split(' ');
      var newParagraph = [];
      var i = 0;
      newParagraph[i] = [];
      for (let k = 0; k < words.length; k++) {
        var word = words[k];
        newParagraph[i].push(word);
        if (font.widthOfTextAtSize(newParagraph[i].join(' '), fontSize) > maxWidth) {
          newParagraph[i].splice(-1);
          i = i + 1;
          newParagraph[i] = [];
          newParagraph[i].push(word);
        }
      }
      paragraphs[index] = newParagraph.map(p => p.join(' '))//.join('\n');
      linesOfText = linesOfText.concat(paragraphs[index]);
    } else {
      linesOfText.push(paragraph);
    }
  }
  return linesOfText;//paragraphs.join('\n');
}

exports.generateQRFile = async (content, width = 200, errorCorrectionLevel = 'L') => {
  const qrStream = new stream.PassThrough();
  await QRCode.toFileStream(qrStream, content,
    {
      type: 'png',
      width,
      margin: 1,
      color: {
        dark: "#000",
        light: "#FFF"
      },
      errorCorrectionLevel
    }
  );
  return await streamToBuffer(qrStream);
}

const almostEqual = (a, b, error = 0.1) =>
  Math.abs(Number(a) - Number(b)) <= error;

const tryToDecodeStream = (maybeStream) => {
  if (maybeStream instanceof PDFRawStream) {
    return arrayAsString(decodePDFRawStream(maybeStream ? maybeStream : null).decode());
  }
  return undefined;
};

const removeWhiteBackground = (
  streamContents,
  size = { width: 0, height: 0 },
) => {
  let match = streamContents.match(rgx);
  while (match) {
    const { x1, y1, x2, y2, x3, y3, x4, y4 } = match.groups || {};
    const matchSizeIsWithinSize =
      almostEqual(x1, 0) &&
      almostEqual(y1, size.height, 5) &&
      almostEqual(x2, size.width, 5) &&
      almostEqual(y2, size.height, 5) &&
      almostEqual(x3, size.width, 5) &&
      almostEqual(y3, 0) &&
      almostEqual(x4, 0) &&
      almostEqual(y4, 0);
    if (!matchSizeIsWithinSize) break;
    const targetStart = match.index || 0;
    const targetEnd = targetStart + match[0].length;
    streamContents =
      streamContents.substring(0, targetStart) +
      streamContents.substring(targetEnd, streamContents.length);
    match = streamContents.match(rgx);
  }
  return streamContents;
};

const toSentence = (text, limit) => {
  limit = !limit ? text.length : limit;
  if (text && text.length > 0) {
    return text.substring(0, 1).toUpperCase() + text.substring(1, limit);
  } else {
    return '';
  }
}

exports.removePageBackground = (page) => {
  const { Contents } = page.node.normalizedEntries();
  if (!Contents) return;
  Contents.asArray().forEach((streamRef) => {
    if (streamRef instanceof PDFRef) {
      const stream = page.doc.context.lookup(streamRef);
      const contents = tryToDecodeStream(stream);
      if (contents) {
        const newContents = removeWhiteBackground(contents, page.getSize());
        const newStream = page.doc.context.flateStream(newContents);
        page.doc.context.assign(streamRef, newStream);
      }
    }
  });
};

exports.getDateText = (date) => {
  const momentObj = moment(date);
  return toSentence(momentObj.format('D [de] MMMM [del] YYYY'));
}

exports.sanitizeInputRequest = (stringRequest) => {
  const input = JSON.parse(stringRequest);
  const result = {};
  Object.keys(input).forEach(key => {
    result[key] = typeof input[key] == "string" ? input[key].trim() : input[key];
  });
  return result;
}

exports.isAuthorized = async (request) => {
  const tokenId = request.get('Authorization').split('Bearer ')[1];
  let decoded;
  let error;
  try {
    decoded = await admin.auth().verifyIdToken(tokenId);
  } catch (error) {
    console.log(error);
    error = error;
  }
  return { decoded, error };
}