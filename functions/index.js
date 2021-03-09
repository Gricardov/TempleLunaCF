const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const express = require('express');
const { generateRequestTemplate } = require('./template-generator/template-generator');
const { sanitizeInputRequest, isAuthorized } = require('./helpers/functions');
const { setRequestResultUrl, uploadResultRequest, getStatisticsByIds, takeRequest, setRequestDone, addAvailableRequestStatistics, updateTakenRequestStatistics, addDoneRequestStatistics, addLove } = require('./requests/requests');
const { getArtistData, getProfiles } = require('./users/users');
const { addException } = require('./exceptions/exceptions');
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

exports.updateRequestTrigger = functions.firestore.document('/solicitudes/{id}').onUpdate(async (snap, context) => { // Se encarga de las estadísticas
    const { status: prevStatus } = snap.before.data();
    const { takenBy, type, status: curStatus, name, email } = snap.after.data();
    const requestId = context.params.id;

    if (prevStatus == 'DISPONIBLE' && curStatus == 'TOMADO') {
        return updateTakenRequestStatistics(takenBy, type);
    } else if (prevStatus == 'TOMADO' && curStatus == 'HECHO') {
        await addDoneRequestStatistics(takenBy, type);
        return sendEmail(email,
            type == 'CRITICA' ? '¡Tu crítica Temple Luna está lista!' : type == 'DISENO' ? '¡Tu diseño Temple Luna está listo!' : '¡Tu solicitud Temple Luna está lista!',
            `${process.env.URL_FRONT}?id=${requestId}&templated=true`,
            name,
            'https://www.facebook.com/groups/templeluna'
        );
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
        addException({ message: error, method: '/takeRequest', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }
});

app.post('/addLove', async (request, response) => {
    try {
        const { requestId, direction } = sanitizeInputRequest(request.body);
        await addLove(requestId, direction);
        response.send({ ok: 'ok' });
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        addException({ message: error, method: '/addLove', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
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
        addException({ message: error, method: '/generateResultRequest', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }
});

app.get('/rel_statistics/', async (request, response) => {
    try {
        let textResult = '';
        const artistList = await getProfiles();
        const arrRequestDesign = artistList.map(artist => artist.id + '-DISENO').concat(['DISENO']);
        const arrRequestCritique = artistList.map(artist => artist.id + '-CRITICA').concat(['CRITICA']);
        const statisticsList = await getStatisticsByIds(arrRequestDesign.concat(arrRequestCritique));

        let totDisNum = statisticsList.find(res => res.id === 'DISENO');
        let totCriNum = statisticsList.find(res => res.id === 'CRITICA');

        textResult += (totCriNum ? totCriNum.available : '0') + ' críticas disponibles en total<br/>';
        textResult += (totDisNum ? totDisNum.available : '0') + ' diseños disponibles en total<br/><br/>';

        artistList.map(({ fName, lName, id }) => {
            let criNum = statisticsList.find(res => res.id === id + '-CRITICA');
            let desNum = statisticsList.find(res => res.id === id + '-DISENO');

            const { taken: criTaken, done: criDone } = criNum || {};
            const { taken: desTaken, done: desDone } = desNum || {};

            textResult += fName + ' ' + lName + ' tiene en CRÍTICAS ' + (criTaken ? criTaken : '0') + ' tomadas, ' + (criDone ? criDone : '0') + '  hechas, DISEÑOS ' + (desTaken ? desTaken : '0') + ' tomadas, ' + (desDone ? desDone : '0') + ' hechas<br/>';
        })

        response.send(textResult);

    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        addException({ message: error, method: '/rel_statistics', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }


});


/*app.get('/request-result/:requestId', async (request, response) => {
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
});*/