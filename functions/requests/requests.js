const admin = require("firebase-admin");
const FileType = require('file-type');
const { Storage } = require('@google-cloud/storage');

const firestore = admin.firestore();
const storage = new Storage({ keyFilename: "./key.json" });

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