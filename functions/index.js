const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stream = require('stream');
const { generateRequestTemplate } = require('./template-generator/template-generator');

exports.generatePdf = functions.https.onRequest(async (request, response) => {
    const fileBuffer = await generateRequestTemplate();
    var readStream = new stream.PassThrough();
    readStream.end(fileBuffer);

    response.set('Content-disposition', 'attachment; filename=' + 'sorgalim.pdf');
    response.set('Content-Type', 'text/plain');
    readStream.pipe(response);
})
