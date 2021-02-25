const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const express = require('express');
const { generateRequestTemplate } = require('./template-generator/template-generator');
const { sanitizeInputRequest, isAuthorized } = require('./helpers/functions');
const { setRequestResultUrl, uploadResultRequest, getUrlResultByRequestId, takeRequest, setRequestDone, addAvailableRequestStatistics, updateTakenRequestStatistics, addDoneRequestStatistics } = require('./requests/requests');
const { getArtistData } = require('./users/users');
const { sendEmail } = require('./mail/sender');

const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const cors = require('cors')({ origin: true });
app.use(cors);

exports.app = functions.https.onRequest(app);

exports.createRequestTrigger = functions.firestore.document('/solicitudes/{id}').onCreate((snap, context) => {
    return addAvailableRequestStatistics(snap.data().type);
});

exports.updateRequestTrigger = functions.firestore.document('/solicitudes/{id}').onUpdate(async (snap, context) => {
    const { takenBy, type, status, name, email } = snap.after.data();
    const requestId = context.params.id;

    switch (status) {
        case 'TOMADO':
            await updateTakenRequestStatistics(takenBy, type);
            return;
        case 'HECHO':
            // Y aquí solo queda enviar correo
            await addDoneRequestStatistics(takenBy, type);
            return sendEmail(email,
                type == 'CRITICA' ? '¡Tu crítica Temple Luna está lista!' : type == 'DISENO' ? '¡Tu diseño Temple Luna está listo!' : '¡Tu solicitud Temple Luna está lista!',
                `Hola ${name}. Tu trabajo final puede ser encontrado aquí:\n${process.env.URL_FRONT}/id=${requestId}\nTe esperamos en la mejor comunidad literaria del mundo: https://www.facebook.com/groups/templeluna\nEquipo Temple Luna.`
            );
        default:
            return;
    }
});

app.post('/takeRequest', async (request, response) => {
    try {
        const { decoded, error } = await isAuthorized(request);
        if (!error) {
            const { requestId, type, expDays } = sanitizeInputRequest(request.body);
            await takeRequest(decoded.user_id, requestId, type, expDays);
            response.send({ ok: 'ok' });
        } else {
            response.send(405, 'No autorizado');
        }
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
    }
});

app.post('/generateResultRequest', async (request, response) => {
    try {
        const { decoded, error } = await isAuthorized(request);
        if (!error) {
            let url;
            const { requestId, type, title, intention, hook, ortography, improvement, urlResult, comment } = sanitizeInputRequest(request.body);
            switch (type) {
                case 'CRITICA':
                    const artist = await getArtistData(decoded.user_id);
                    const fileBuffer = await generateRequestTemplate(artist, requestId, title, intention, hook, ortography, improvement);
                    url = await uploadResultRequest(fileBuffer, 'solicitud-critica', uuidv4());
                    await setRequestResultUrl(requestId, url);
                    await setRequestDone(decoded.user_id, requestId, type);
                    break;
                default: // DISEÑO
                    url = urlResult;
                    await setRequestResultUrl(requestId, url);
                    await setRequestDone(decoded.user_id, requestId, type);
                    break;
            }
            response.send({ url });
        } else {
            response.send(405, 'No autorizado');
        }
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
    }
});

app.get('/request-result/:requestId', async (request, response) => {
    try {
        const url = await getUrlResultByRequestId(request.params.requestId);
        if (url) {
            response.redirect(url);
        } else {
            response.send(404, 'Código no encontrado');
        }
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
    }
});