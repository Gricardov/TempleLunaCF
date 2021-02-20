const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const { generateQRFile, getLinesOfText, getDateText } = require('../helpers/functions');
const { PDFDocument, rgb, StandardFonts, setLineHeight } = require('pdf-lib');

const DEFAULT_BACKGROUND_COLOR = rgb(243 / 255, 241 / 255, 255 / 255);

const templateRequest = fs.readFileSync('./templates/sample.pdf');
const segoeUIFont = fs.readFileSync('./fonts/SegoeUI.ttf');
const segoeUIBoldFont = fs.readFileSync('./fonts/SegoeUI-Bold.ttf');

exports.generateRequestTemplate = async () => {
    // Documento principal
    const pdf = await PDFDocument.load(templateRequest);
    pdf.registerFontkit(fontkit);

    // Parámetros de página
    let lastCoordinates = 0;
    let lineHeight = 10;
    let marginH = 86;
    let marginV = 86;

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
    lastCoordinates = setText(pages[0], helveticaBold, 'V.1.0 Loedrin', 12, rgb(1, 1, 1), width1, 25, 'RIGHT', 20);

    // Código QR
    const qrFile = await generateQRFile('file:///C:/Users/Gricardov/Downloads/sorgalim%20(13).pdf', 70);
    const pdfImg = await pdf.embedPng(qrFile);
    lastCoordinates = setImage(pages[0], pdfImg, 70, 70, width1 - pdfImg.width - 25, lastCoordinates.height + lastCoordinates.y + 15);

    // Texto QR
    setText(pages[0], helvetica, 'Lee esta crítica online:', 12, rgb(1, 1, 1), width1, 25, 'RIGHT', lastCoordinates.height + lastCoordinates.y + 15);

    // Página 2

    marginH = 60;

    // Título obra
    lastCoordinates = setText(pages[1], helveticaBold, 'Título de la obra', 18, rgb(0, 0, 0), width2, marginH, 'RIGHT', height2 - marginV);

    // Nombre obras
    lastCoordinates = setText(pages[1], helvetica, 'Las desventuras de Alyah', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 40);

    // Título nombre artista
    lastCoordinates = setText(pages[1], helveticaBold, 'Autor(a) de la crítica', 18, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

    // Nombre artista
    lastCoordinates = setText(pages[1], helvetica, 'Mandala Baptiste Sorgalim', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 40);

    // Título redes artista
    lastCoordinates = setText(pages[1], helveticaBold, 'Síguelo(a) en sus redes', 18, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

    // Contactos del artista
    ['milaluna@gmail.com', 'twitter.com'].slice(0, 2).map(text => lastCoordinates = setText(pages[1], helvetica, text, 16, rgb(5 / 255, 99 / 255, 193 / 255), width2, marginH, 'RIGHT', lastCoordinates.y - 40));

    // Título correo artista
    lastCoordinates = setText(pages[1], helveticaBold, 'Correo de contacto', 18, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

    // Correo artista
    lastCoordinates = setText(pages[1], helvetica, 'sorgalim@sorgalim.com', 16, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 40);

    // Título correo artista
    lastCoordinates = setText(pages[1], helveticaBold, 'Fecha de realización', 18, rgb(0, 0, 0), width2, marginH, 'RIGHT', lastCoordinates.y - 60);

    // Correo artista
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

    // Restauro la posición Y
    lastCoordinates.y = height3 - marginV;

    lastCoordinates = setParagraph(pdf, page3, {
        text: 'Las desventuras de Alyah',
        font: helveticaBold,
        size: 18,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'CENTER',
        lastCoordinates
    });

    lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Se entiende lo que quiero transmitir?', 16, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

    lastCoordinates.y -= 40;

    lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
        text: 'Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. '+
        'Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. Si, tu obra genera una intriga por saber que sigue con cada capitulo logras que salga esa curiosidad por saber el porquede lo que esta pasando en historia. afk an fod hfudhfus hfuis hfis f',
        font: helvetica,
        size: 16,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'LEFT',
        lastCoordinates
    });

    /*lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Qué tanto engancha mi obra?', 18, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

    lastCoordinates.y = lastCoordinates.y - 40;

    lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
        text: 'Yo diria que engancha lo bastante para no parar en leerla, tu forma de plantear la situación es muy buena y logras atrapar al lector con tu obra llena de misterio e intriga.',
        font: helvetica,
        size: 16,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'LEFT',
        lastCoordinates
    });

    lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Qué tal es mi ortografía?', 18, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

    lastCoordinates.y = lastCoordinates.y - 40;

    lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
        text: 'Tienes  unvocabulario  bastante  amplio  y  eso  es  muy bueno,  ya  que  no  repites  casi  palabras  en  una  misma oración, no obstante tienes uno que otro error en el uso de signos de puntuación, al igual en tu redacción tienes unos errores muy pequeños, trata de revisar de nuevo el textoy ver bien las mayúsculas.',
        font: helvetica,
        size: 16,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'LEFT',
        lastCoordinates
    });

    lastCoordinates = setText(lastCoordinates.page, helveticaBold, '¿Qué consejo me darías para mejorar?', 18, rgb(0, 0, 0), width2, marginH, 'LEFT', lastCoordinates.y - 60);

    lastCoordinates.y = lastCoordinates.y - 40;

    lastCoordinates = setParagraph(pdf, lastCoordinates.page, {
        text: 'Tienes un vocabulario bastante amplio y eso es muy bueno, ya que no repites casi palabras en una misma oración, no obstante tienes uno que otro error en el uso de signos de puntuación, al igual en tu redacción tienes unos errores muy pequeños, trata de revisar de nuevo el textoy ver bien las mayúsculas.',
        font: helvetica,
        size: 16,
        totalWidth: width3,
        totalHeight: height3,
        marginH,
        marginV,
        mode: 'LEFT',
        lastCoordinates
    });
*/

    const pdfUnit8Array = await pdf.save();
    return Buffer.from(pdfUnit8Array);
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
            if (lastCoordinates.y - fontHeight > marginV) {
                lastCoordinates = setText(currentPage, font, text, size, color, totalWidth, marginH, mode, index ? lastCoordinates.y - lastCoordinates.height - lineHeight : lastCoordinates.y);
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
                const newData = setLinesOfText(newPage, arrayOfLines.slice(index), { y: page.getHeight() - marginV, height: font.heightAtSize(size) });
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