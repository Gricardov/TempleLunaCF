const functions = require("firebase-functions");
const admin = require("firebase-admin");
const serviceAccount = require("./key.json");
const stream = require('stream');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')({ origin: true });
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const app = express();
app.use(cors);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const { generateRequestTemplate } = require('./template-generator/template-generator');
const { isAuthorized, getDateText } = require('./helpers/functions');
const { setRequestResultUrl, uploadResultRequest, getStatisticsByIds, getRequest, takeRequest, setRequestDone, resignRequest, addAvailableRequestStatistics, updateTakenRequestStatistics, addDoneRequestStatistics, updateResignedRequestStatistics, addLove, addComment, searchByPrefixTitle, searchByWorkerId } = require('./requests/requests');
const { searchEnrolledByEventId } = require('./enrollments/enrollments');
const { createProfile, getArtistData, getProfiles } = require('./users/users');
const { addException } = require('./exceptions/exceptions');
const { sendEmail } = require('./mail/sender');

const expDays = 7;

exports.app = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onRequest(app);

// Triggers

// Al crear un usuario
exports.createUser = functions.auth.user().onCreate(user => {
    try {
        return createProfile(user);
    } catch (error) {
        console.log(error);
        addException({ message: error, method: '/createUser', date: admin.firestore.FieldValue.serverTimestamp(), extra: user });
    }
})

// Al crear una solicitud
exports.createRequestTrigger = functions.firestore.document('/solicitudes/{id}').onCreate((snap, context) => {
    try {
        return addAvailableRequestStatistics(snap.data().type);
    } catch (error) {
        console.log(error);
        addException({ message: error, method: '/createRequestTrigger', date: admin.firestore.FieldValue.serverTimestamp(), extra: snap });
    }
});

// Al actualizar el estado de una solicitud
exports.updateRequestTrigger = functions.firestore.document('/solicitudes/{id}').onUpdate(async (snap, context) => { // Se encarga de las estadísticas
    try {
        const { status: prevStatus, likes: prevLikes, feedback: prevFeedback } = snap.before.data();
        const { resignedFrom, takenBy, type, status: curStatus, name, email, title, likes: curLikes, feedback: curFeedback } = snap.after.data();
        const requestId = context.params.id;

        // Actualiza las estadísticas (o envía correo) de acuerdo al estado de la solicitud
        if (prevStatus == 'DISPONIBLE' && curStatus == 'TOMADO') {
            return updateTakenRequestStatistics(takenBy, type);
        } else if (prevStatus == 'TOMADO' && curStatus == 'HECHO') {
            await addDoneRequestStatistics(takenBy, type);
            return sendEmail(email, name.split(' ')[0], 'REQUEST_DONE', { requestId, type, title }
            );
        } else if (prevStatus == 'TOMADO' && curStatus == 'DISPONIBLE') {
            return updateResignedRequestStatistics(resignedFrom, type);
        }

        // Envía correo a los artistas si reciben un like o comentario
        if (curStatus == 'HECHO') {
            const artist = await getArtistData(takenBy);
            if (prevLikes != curLikes) {
                return sendEmail(artist.contactEmail, artist.fName, 'LIKE_GIVEN', { requestId, title });
            }
            if (prevFeedback != curFeedback) {
                return sendEmail(artist.contactEmail, artist.fName, 'FEEDBACK_GIVEN', { requestId, title });
            }
        }

    } catch (error) {
        console.log(error);
        addException({ message: error, method: '/updateRequestTrigger', date: admin.firestore.FieldValue.serverTimestamp(), extra: snap });
    }
});

app.post('/takeRequest', async (request, response) => {
    try {
        const { decoded, error } = await isAuthorized(request);
        if (!error) {
            const { requestId } = request.body;
            await takeRequest(decoded.user_id, requestId, expDays);
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

app.post('/resignRequest', async (request, response) => {
    try {
        const { decoded, error } = await isAuthorized(request);
        if (!error) {
            const { requestId } = request.body;
            await resignRequest(decoded.user_id, requestId);
            response.send({ ok: 'ok' });
        } else {
            response.send(405, 'No autorizado');
        }
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        addException({ message: error, method: '/resignRequest', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }
});

app.post('/addLove', async (request, response) => {
    try {
        const { id: requestId, direction } = request.body;
        await addLove(requestId, direction);
        response.send({ ok: 'ok' });
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        addException({ message: error, method: '/addLove', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }
});

app.post('/addComment', async (request, response) => {
    try {
        const { id: requestId, alias, message } = request.body;
        if (message.length <= 1000 && alias.length <= 50) {
            await addComment(requestId, alias, message);
            response.send({ ok: 'ok' });
        } else {
            response.send(500, 'El mensaje y el alias no pueden exceder los caracteres permitidos');
        }
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        addException({ message: error, method: '/addComment', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }
});

app.post('/getArtistDataById', async (request, response) => {
    try {
        const { id } = request.body;
        const artist = await getArtistData(id);
        if (artist) {
            response.send({ networks: [], services: [], roles: [], ...artist });
        } else {
            console.log('No existe el artista');
            response.send(500, 'No existe el artista');
        }
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        addException({ message: error, method: '/getArtistDataById', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }
});

app.post('/generateResultRequest', async (request, response) => {
    try {
        const { decoded, error } = await isAuthorized(request);
        if (!error) {
            let url;
            let artist;
            let fileBuffer;
            const { requestId, type, title, intention, hook, ortography, improvement, urlResult, correctedText } = request.body;
            switch (type) {
                case 'CRITICA':
                    artist = await getArtistData(decoded.user_id);
                    fileBuffer = await generateRequestTemplate(type, artist, requestId, title, intention, hook, ortography, improvement);
                    url = await uploadResultRequest(fileBuffer, 'solicitud-critica', uuidv4());
                    await setRequestResultUrl(requestId, url);
                    await setRequestDone(decoded.user_id, requestId, type);
                    break;
                case 'CORRECCION':
                    artist = await getArtistData(decoded.user_id);
                    fileBuffer = await generateRequestTemplate(type, artist, requestId, title, undefined, undefined, undefined, improvement, correctedText);
                    url = await uploadResultRequest(fileBuffer, 'solicitud-correccion', uuidv4());
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

// Testing
// Hasta que no haga un panel de admin
app.get('/resignRequest', async (request, response) => {
    try {
        const requestId = request.query.id;
        await resignRequest(null, requestId, true);
        response.send({ ok: 'ok' });
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        addException({ message: error, method: '/resignRequest', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.body });
    }
});

app.get('/testTemplate/:id', async (request, response) => {
    try {
        const fileBuffer = await generateRequestTemplate(request.params.id, { fName: 'MILAGROS', lName: 'MARAVILLA', contactEmail: 'cora@gmail.com', networks: ['templeluna.app'] }, 'ID PRUEBA', 'TÍTULO', 'INTENCIÓN', 'ENGANCHE', 'ORTOGRAFIA', 'PUNTOS DE MEJORA');
        var bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(fileBuffer));
        bufferStream.pipe(response);
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
    }
});

app.post('/sendTestEmail/', async (request, response) => {
    try {
        const { toMail, toName } = request.body;
        sendEmail(toMail, toName, 'TEST', {});
        response.send({ ok: 'ok' });
    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
    }
});

app.get('/genStatistics/', async (request, response) => {
    try {
        let textResult = '';
        const artistList = await getProfiles();
        const arrRequestDesign = artistList.map(artist => artist.id + '-DISENO').concat(['DISENO']);
        const arrRequestCritique = artistList.map(artist => artist.id + '-CRITICA').concat(['CRITICA']);
        const arrRequestCorrection = artistList.map(artist => artist.id + '-CORRECCION').concat(['CORRECCION']);
        const statisticsList = await getStatisticsByIds(arrRequestDesign.concat(arrRequestCritique).concat(arrRequestCorrection));

        let totDisNum = statisticsList.find(res => res.id === 'DISENO');
        let totCriNum = statisticsList.find(res => res.id === 'CRITICA');
        let totCorNum = statisticsList.find(res => res.id === 'CORRECCION');

        textResult += (totCriNum ? totCriNum.available : '0') + ' críticas disponibles en total<br/>';
        textResult += (totDisNum ? totDisNum.available : '0') + ' diseños disponibles en total<br/>';
        textResult += (totCorNum ? totCorNum.available : '0') + ' correcciones disponibles en total<br/><br/>';

        artistList.map(({ fName, lName, id }) => {
            let criNum = statisticsList.find(res => res.id === id + '-CRITICA');
            let desNum = statisticsList.find(res => res.id === id + '-DISENO');
            let corNum = statisticsList.find(res => res.id === id + '-CORRECCION');

            const { taken: criTaken, done: criDone } = criNum || {};
            const { taken: desTaken, done: desDone } = desNum || {};
            const { taken: corTaken, done: corDone } = corNum || {};

            textResult +=
                fName + ' ' + lName + '( ' + id + ' ) tiene en ' +
                'CRÍTICAS ' + (criTaken ? criTaken : '0') + ' tomadas, ' + (criDone ? criDone : '0') + '  hechas, ' +
                'DISEÑOS ' + (desTaken ? desTaken : '0') + ' tomadas, ' + (desDone ? desDone : '0') + ' hechas, ' +
                'CORRECCIONES ' + (corTaken ? corTaken : '0') + ' tomadas, ' + (corDone ? corDone : '0') + ' hechas, ' +
                '<br/>';
        })
        response.send(textResult);

    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        //addException({ message: error, method: '/genStatistics', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.query });
    }

});

app.get('/searchRequestsByTitlePrefixes/', async (request, response) => {
    try {
        let textResult = '';
        const prefix = request.query.prefix;
        const list = await searchByPrefixTitle(prefix);

        list.map(({ title, id, takenBy, designType, type, status, name, phone, email }) => {
            textResult += '<b>Título:</b> ' + title + '<br/>';
            textResult += '<b>Id:</b> ' + id + '<br/>';
            takenBy && (textResult += '<b>Tomado por:</b> ' + takenBy + '<br/>');
            textResult += '<b>Tipo:</b> ' + type + '<br/>';
            type == 'DISENO' && (textResult += '<b>Tipo de diseño:</b> ' + designType + '<br/>');
            textResult += '<b>Estado:</b> ' + status + '<br/>';
            textResult += '<b>Solicitante:</b> ' + name + '<br/>';
            textResult += '<b>Teléfono:</b> ' + phone + '<br/>';
            textResult += '<b>Email:</b> ' + email + '<br/>';
            textResult += '<br/><br/>'
        });

        if (textResult) {
            response.send(textResult);
        } else {
            response.send('La búsqueda no produjo resultados');
        }

    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        //addException({ message: error, method: '/searchRequestsByTitlePrefixes', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.query });
    }
});

app.get('/getRequestsByWorker/', async (request, response) => {
    try {
        let textResult = '';
        const id = request.query.id;
        const list = await searchByWorkerId(id, null, true);

        list && list.length > 0 && (textResult += '<b>Total:</b> ' + list.length + '<br/><br/>');

        list.map(({ title, id, takenBy, type, designType, status, name, phone, email }) => {
            textResult += '<b>Título:</b> ' + title + '<br/>';
            textResult += '<b>Id:</b> ' + id + '<br/>';
            takenBy && (textResult += '<b>Tomado por:</b> ' + takenBy + '<br/>');
            textResult += '<b>Tipo:</b> ' + type + '<br/>';
            type == 'DISENO' && (textResult += '<b>Tipo de diseño:</b> ' + designType + '<br/>');
            textResult += '<b>Estado:</b> ' + status + '<br/>';
            textResult += '<b>Solicitante:</b> ' + name + '<br/>';
            textResult += '<b>Teléfono:</b> ' + phone + '<br/>';
            textResult += '<b>Email:</b> ' + email + '<br/>';
            textResult += '<br/><br/>'
        });

        if (textResult) {
            response.send(textResult);
        } else {
            response.send('La búsqueda no produjo resultados');
        }

    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        //addException({ message: error, method: '/getRequestsByWorker', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.query });
    }
});

app.get('/getEnrolledByEvent/', async (request, response) => {
    try {
        let textResult = '';
        const id = request.query.id;
        const list = await searchEnrolledByEventId(id, null, true);

        if (list && list.length > 0) {
            textResult += '<b>Total:</b> ' + list.length + '<br/>';
            textResult += '<b>Autores:</b> ' + list.filter(enr => enr.role == 'AUT').length + '<br/>';
            textResult += '<b>Audiencia:</b> ' + list.filter(enr => enr.role == 'AUD').length + '<br/><br/>';
        }

        list.map(({ name, createdAt, age, phone, email, id, role, link, urlImgInv }) => {
            textResult += '<b>Id:</b> ' + id + '<br/>';
            textResult += '<b>Participante:</b> ' + name + '<br/>';
            role == 'AUT' && (textResult += '<b>Link:</b> <a target="_blank" href=' + link + '>' + link + '</a><br/>');
            textResult += '<b>Rol:</b> ' + role + '<br/>';
            textResult += '<b>Url comprobante:</b> <a target="_blank" href=' + urlImgInv + '>Aquí</a><br/>';
            textResult += '<b>Unido en:</b> ' + getDateText(moment(createdAt._seconds * 1000).toDate()) + '<br/>';
            textResult += '<b>Edad:</b> ' + age + '<br/>';
            textResult += '<b>Teléfono:</b> ' + phone + '<br/>';
            textResult += '<b>Email:</b> ' + email + '<br/>';
            textResult += '<br/><br/>'
        });

        if (textResult) {
            response.send(textResult);
        } else {
            response.send('La búsqueda no produjo resultados');
        }

    } catch (error) {
        console.log(error);
        response.send(500, 'Error al realizar la operación');
        //addException({ message: error, method: '/getRequestsByWorker', date: admin.firestore.FieldValue.serverTimestamp(), extra: request.query });
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