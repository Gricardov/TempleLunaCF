const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const { generateQRFile, getLinesOfText, getDateText } = require('../helpers/functions');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
require('dotenv').config();

const DEFAULT_BACKGROUND_COLOR = rgb(243 / 255, 241 / 255, 255 / 255);

const templateRequest = fs.readFileSync('templates/sample.pdf');
//const segoeUIFont = fs.readFileSync('./fonts/SegoeUI.ttf');
//const segoeUIBoldFont = fs.readFileSync('./fonts/SegoeUI-Bold.ttf');

exports.generateRequestTemplate = async (artist, requestId, title, intention, hook, ortography, improvement) => {
    // Documento principal
    const pdf = await PDFDocument.load(templateRequest);
    pdf.registerFontkit(fontkit);

    // Parámetros de página
    let lastCoordinates = 0;
    let lineHeight = 10;
    let marginH = 86;
    let marginV = 86;

    // Datos del artista
    const { fName, lName, imgUrl, contactEmail, networks = [] } = artist;

    // Fuentes

    //const segoeUI = await pdf.embedFont(segoeUIFont, { subset: true });
    //const segoeUIBold = await pdf.embedFont(segoeUIBoldFont, { subset: true });
    const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold, { subset: true });
    const helvetica = await pdf.embedFont(StandardFonts.Helvetica, { subset: true });

    const pages = pdf.getPages();

    const { width: width1, height: height1 } = pages[0].getSize();
    const { width: width2, height: height2 } = pages[1].getSize();

    // Página 1

    // Versión
    lastCoordinates = setText(pages[0], helveticaBold, 'V.1.1 Loedrin', 12, rgb(1, 1, 1), width1, 25, 'RIGHT', 20);

    // Código QR
    const qrFile = await generateQRFile(`${process.env.URL_FRONT}?id=${requestId}`, 70);
    const pdfImg = await pdf.embedPng(qrFile);
    lastCoordinates = setImage(pages[0], pdfImg, 70, 70, width1 - pdfImg.width - 25, lastCoordinates.height + lastCoordinates.y + 15);

    // Texto QR
    setText(pages[0], helvetica, 'Lee esta crítica online:', 12, rgb(1, 1, 1), width1, 25, 'RIGHT', lastCoordinates.height + lastCoordinates.y + 15);

    // Página 2

    marginH = 60;

    // Título obra

    lastCoordinates = setText(pages[1], helveticaBold, 'Título de la obra', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', height2 - marginV);

    // Nombre obras
    lastCoordinates = setParagraph(pdf, pages[1], {
        text: title,
        font: helvetica,
        size: 16,
        totalWidth: width2,
        totalHeight: height2,
        marginH,
        marginV,
        mode: 'RIGHT',
        lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 40 }
    });
    //lastCoordinates = setText(pages[1], helvetica, 'Las desventuras de Alyah', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 40);

    // Título nombre artista
    lastCoordinates = setText(pages[1], helveticaBold, 'Autor(a) de la crítica', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

    // Nombre artista
    lastCoordinates = setParagraph(pdf, pages[1], {
        text: fName + ' ' + lName,
        font: helvetica,
        size: 16,
        totalWidth: width2,
        totalHeight: height2,
        marginH,
        marginV,
        mode: 'RIGHT',
        lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 40 }
    });

    // Título redes artista
    lastCoordinates = setText(pages[1], helveticaBold, 'Síguelo(a) en sus redes', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

    // Contactos del artista
    networks.slice(0, 2).map(text => lastCoordinates = setText(pages[1], helvetica, text, 16, rgb(5 / 255, 99 / 255, 193 / 255), width2, marginH, 'RIGHT', lastCoordinates.y - 40));

    if (contactEmail) {
        // Título correo artista
        lastCoordinates = setText(pages[1], helveticaBold, 'Correo de contacto', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

        // Correo artista
        lastCoordinates = setText(pages[1], helvetica, contactEmail, 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 40);
    }

    // Título fecha
    lastCoordinates = setText(pages[1], helveticaBold, 'Fecha de realización', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

    // Fecha
    lastCoordinates = setText(pages[1], helvetica, getDateText(new Date()), 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 40);

    // Página 3

    marginH = 86;

    // Agrego una nueva página
    const page3 = pdf.addPage();
    const { width: width3, height: height3 } = page3.getSize();
    //removePageBackground(page3);

    // Le pongo un fondo rosadito
    page3.drawRectangle({
        color: DEFAULT_BACKGROUND_COLOR,
        width: width3,
        height: height3,
    });

    lastCoordinates = setParagraph(pdf, page3, {
        text: title,
        font: helveticaBold,
        size: 18,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'CENTER',
        lastCoordinates: { ...lastCoordinates, y: height3 - marginV } // Restauro la posición Y al inicio de la página
    });

    if (intention) {
        lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Se entiende lo que quiero transmitir?', 16, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

        lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
            text: intention,
            font: helvetica,
            size: 16,
            totalWidth: width3,
            totalHeight: height3,
            marginH,
            marginV,
            mode: 'LEFT',
            lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 40 }
        })
    }

    if (hook) {
        lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Qué tanto engancha mi obra?', 16, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

        lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
            text: hook,
            font: helvetica,
            size: 16,
            totalWidth: width3,
            totalHeight: height3,
            marginH,
            marginV,
            mode: 'LEFT',
            lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 40 }
        });
    }

    if (ortography) {
        lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Qué tal es mi ortografía?', 16, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

        lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
            text: ortography,
            font: helvetica,
            size: 16,
            totalWidth: width3,
            totalHeight: height3,
            marginH,
            marginV,
            mode: 'LEFT',
            lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 40 }
        });
    }

    if (improvement) {
        lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Qué consejo me darías para mejorar?', 16, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

        lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
            text: improvement,
            font: helvetica,
            size: 16,
            totalWidth: width3,
            totalHeight: height3,
            marginH,
            marginV,
            mode: 'LEFT',
            lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 40 }
        });
    }

    lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
        text: '¿Te sirvió esta crítica?',
        font: helveticaBold,
        size: 12,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'RIGHT',
        lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 60 }
    });

    lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
        text: 'Estás invitado a Temple Luna. Juntos seremos la más grande comunidad de lectores y escritores en latinoamérica.\nLink: https://www.facebook.com/groups/templeluna',
        font: helvetica,
        size: 12,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'RIGHT',
        lastCoordinates: { ...lastCoordinates, y: lastCoordinates.y - 25 }
    });

    const pdfUnit8Array = await pdf.save();
    const fileBuffer = Buffer.from(pdfUnit8Array);

    return fileBuffer;
}

const setParagraph = (doc, page, { text, font, size, color = rgb(0, 0, 0), totalWidth, totalHeight, marginH, marginV, mode, lastCoordinates, lineHeight = 10 }) => {
    let fontHeight = font.heightAtSize(size);

    const setLinesOfText = (currentPage, arrayOfLines, lastCoordinates) => {
        let newPage = currentPage;
        let newCoordinates = lastCoordinates;
        // Itero cada línea de texto
        for (let index = 0; index < arrayOfLines.length; index++) {
            const text = arrayOfLines[index];
            // Verifico si esta línea sigue entrando en la página
            if (newCoordinates.y - fontHeight > marginV) {
                newCoordinates = setText(currentPage, font, text, size, color, totalWidth, marginH, mode, index ? newCoordinates.y - newCoordinates.height - lineHeight : newCoordinates.y);
            } else {
                // Si no entra, agrego una nueva página para meterla ahí
                newPage = doc.addPage();
                // Le pongo un fondo rosadito
                newPage.drawRectangle({
                    color: DEFAULT_BACKGROUND_COLOR,
                    width: newPage.getWidth(),
                    height: newPage.getHeight(),
                });
                // Y llamo a esta misma función, recursivamente
                const newData = setLinesOfText(newPage, arrayOfLines.slice(index), { y: page.getHeight() - marginV, height: 0 });
                newPage = newData.newPage;
                newCoordinates = newData.newCoordinates;
                break;
            }
        }
        return { newPage, newCoordinates };
    }

    const arrayOfLines = getLinesOfText(text, font, size, totalWidth - (2 * marginH));
    const { newPage, newCoordinates } = setLinesOfText(page, arrayOfLines, { y: lastCoordinates.y, height: font.heightAtSize(size) });

    return { ...newCoordinates, height: fontHeight, page: newPage };
}

const setText = (page, font, text, size, color, totalWidth, marginH, mode, y) => {
    let x;
    switch (mode) {
        case 'CENTER':
            x = ((totalWidth - font.widthOfTextAtSize(text, size)) / 2);
            break;

        case 'RIGHT':
            x = totalWidth - font.widthOfTextAtSize(text, size) - marginH;
            break;

        default:
            x = marginH;
            break;
    }
    page.drawText(text, {
        x,
        y,
        size,
        font,
        color,
    });
    return { y, height: font.heightAtSize(size), page }; // Devuelve la coordenada donde se quedó
}

const setImage = (page, pdfImg, width, height, x, y) => {
    page.drawImage(pdfImg, {
        x,
        y,
        width,
        height,
    });
    return { y, height, page };
}