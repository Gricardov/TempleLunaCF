const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const express = require('express');
const app = express();
const cors = require('cors')({ origin: true });
const { generateRequestTemplate } = require('./template-generator/template-generator');
const { sanitizeInputRequest, isAuthorized } = require('./helpers/functions');
const { setRequestResultUrl, uploadResultRequest, getUrlResultByRequestId, setRequestDone } = require('./requests/requests');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

app.use(cors);

exports.app = functions.https.onRequest(app);

app.post('/generateResultRequest', async (request, response) => {
    const { decoded, error } = await isAuthorized(request);
    if (!error) {
        const { requestId, type, title, intention, hook, ortography, improvement } = sanitizeInputRequest(request.body);

        const fileBuffer = await generateRequestTemplate(requestId, title, intention, hook, ortography, improvement);
        const url = await uploadResultRequest(fileBuffer, 'solicitud-critica', uuidv4());
        await setRequestResultUrl(requestId, url);
        await setRequestDone(decoded.user_id, requestId, type);
        response.send({ url });
    } else {
        response.send(405, 'No autorizado');
    }
});

app.get('/request-result/:requestId', async (request, response) => {
    const url = await getUrlResultByRequestId(request.params.requestId);
    if (url) {
        response.redirect(url);
    } else {
        response.send(404, 'Código no encontrado');
    }
});