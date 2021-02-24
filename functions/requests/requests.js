const admin = require("firebase-admin");
const FileType = require('file-type');
const moment = require('moment');
const { Storage } = require('@google-cloud/storage');

const firestore = admin.firestore();
const storage = new Storage({ keyFilename: "./key.json" });

exports.takeRequest = async (workerId, requestId, type, expDays) => {

    let requestRef = await firestore.collection('solicitudes').doc(requestId);
    let doc = await requestRef.get();

    if (doc.exists) {
        if (doc.data().status == 'DISPONIBLE') { // Solo se va a tomar uno disponible
            requestRef.update({
                takenBy: workerId,
                status: 'TOMADO',
                takenAt: new Date(),
                expDate: moment().add(expDays, 'days').toDate()
            });

            const refStatistics = firestore.collection('estadisticas').doc(type);

            return firestore.runTransaction(async transaction => {
                let doc2 = await transaction.get(refStatistics);
                if (doc2.exists) {
                    if (doc2.data().available > 0) {
                        transaction.update(refStatistics, {
                            available: admin.firestore.FieldValue.increment(-1)
                        });
                    }

                    let statisticsRef2 = firestore.collection('estadisticas').doc(workerId + '-' + type);
                    return statisticsRef2.update({
                        taken: admin.firestore.FieldValue.increment(1)
                    });

                } else {
                    throw "No se encuentra el usuario";
                }
            });

        } else {
            throw "La solicitud ya ha sido tomada";
        }
    }
}

exports.setRequestDone = async (workerId, requestId, type) => {

    const batch = firestore.batch();
    let requestRef = firestore.collection('solicitudes').doc(requestId); // Actualizo el estado de la solicitud
    batch.update(requestRef, {
        takenBy: workerId,
        status: 'HECHO',
    });

    // Y finalmente, actualizo las estadísticas
    let statisticsRef = firestore.collection('estadisticas').doc(workerId + '-' + type);

    batch.update(statisticsRef, {
        taken: admin.firestore.FieldValue.increment(-1),
        done: admin.firestore.FieldValue.increment(1)
    });

    return batch.commit();
}

exports.getUrlResultByRequestId = async (requestId) => {
    const result = await admin.firestore().collection('solicitudes').doc(requestId).get();
    if (result.exists) {
        return result.data().resultUrl;
    }
    return null;
}

exports.setRequestResultUrl = async (requestId, url) => {
    return admin.firestore().collection('solicitudes').doc(requestId).update({ resultUrl: url });
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