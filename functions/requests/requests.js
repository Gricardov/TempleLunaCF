const admin = require("firebase-admin");
const FileType = require('file-type');
const moment = require('moment');
const { Storage } = require('@google-cloud/storage');

const firestore = admin.firestore();
const storage = new Storage({ keyFilename: "./key.json" });

const configureBucketCors = async () => {
    await storage.bucket('gs://temple-luna.appspot.com').setCorsConfiguration([
        {
            maxAgeSeconds: 3600,
            method: ['GET'],
            origin: ['*'],
            responseHeader: ['*'],
        },
    ]);
}

configureBucketCors();

exports.addAvailableRequestStatistics = async (type) => {
    const refStatistics = firestore.collection('estadisticas').doc(type);
    return refStatistics.set({
        available: admin.firestore.FieldValue.increment(1)
    }, { merge: true });
}

exports.updateTakenRequestStatistics = async (workerId, type) => {
    const refStatistics = firestore.collection('estadisticas').doc(type);
    return firestore.runTransaction(async transaction => {
        let doc2 = await transaction.get(refStatistics);
        if (doc2.exists && doc2.data().available > 0) {
            await transaction.set(refStatistics, {
                available: admin.firestore.FieldValue.increment(-1)
            }, { merge: true });
        }

        let statisticsRef2 = firestore.collection('estadisticas').doc(workerId + '-' + type);
        return statisticsRef2.set({
            taken: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
    });
}

exports.addDoneRequestStatistics = async (workerId, type) => {
    const refStatistics = firestore.collection('estadisticas').doc(workerId + '-' + type);
    return refStatistics.set({
        taken: admin.firestore.FieldValue.increment(-1),
        done: admin.firestore.FieldValue.increment(1)
    }, { merge: true });
}

exports.getRequest = async (requestId) => {
    const result = await firestore.collection('solicitudes').doc(requestId).get();
    if (result.exists) {
        return { ...result.data(), id: result.id };
    }
    throw "La solicitud no existe";
}

exports.takeRequest = async (workerId, requestId, type, expDays) => {
    let requestRef = await firestore.collection('solicitudes').doc(requestId);
    let doc = await requestRef.get();

    if (doc.exists) {
        if (doc.data().status == 'DISPONIBLE') { // Solo se va a tomar uno disponible
            return requestRef.update({
                takenBy: workerId,
                status: 'TOMADO',
                takenAt: new Date(),
                expDate: moment().add(expDays, 'days').toDate()
            });
        } else {
            throw "La solicitud ya ha sido tomada";
        }
    }
}

exports.setRequestDone = async (workerId, requestId, type) => {
    let requestRef = firestore.collection('solicitudes').doc(requestId); // Actualizo el estado de la solicitud
    return requestRef.update({
        takenBy: workerId,
        status: 'HECHO',
    });
}

exports.getUrlResultByRequestId = async (requestId) => {
    const result = await firestore.collection('solicitudes').doc(requestId).get();
    if (result.exists) {
        return result.data().resultUrl;
    }
    throw "No existe la url";
}

exports.setRequestResultUrl = async (requestId, url) => {
    return firestore.collection('solicitudes').doc(requestId).update({ resultUrl: url });
}

exports.getStatisticsByIds = async (idArrays) => {
    const results = [];
    const promises = idArrays.map(id => firestore.collection('estadisticas').doc(id).get());
    const dsn = await Promise.all(promises);
    dsn.map(doc => {
        if (doc.exists) {
            return results.push({ ...doc.data(), id: doc.id });
        }
        return;
    })
    return results;
}

exports.addLove = async (requestId, direction) => {
    const refStatistics = firestore.collection('solicitudes').doc(requestId);
    if (direction == 1) {
        return refStatistics.set({
            likes: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
    } else {
        throw "Solo puedes agregar o quitar un corazón";
    }
}

exports.addComment = async (requestId, alias, message) => {
    return firestore.collection('solicitudes').doc(requestId).set({
        feedback: {
            alias,
            message,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
    }, { merge: true });
}

exports.uploadResultRequest = async (fileBuffer, path, filename) => {
    const metadata = await FileType.fromBuffer(fileBuffer);
    const file = storage.bucket('gs://temple-luna.appspot.com').file(`${path}/${filename}.${metadata.ext}`);
    await file.save(fileBuffer, {
        gzip: true,
        metadata: {
            cacheControl: 'public, max-age=31536000',
        }
    });
    const urls = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2500',
    });
    return urls[0];
}