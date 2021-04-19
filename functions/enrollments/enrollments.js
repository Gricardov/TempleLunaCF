const admin = require("firebase-admin");

const firestore = admin.firestore();

exports.searchEnrolledByEventId = async (eventId, limit = 3, ignoreLimit) => {
    const ref = firestore.collection('inscripciones').where('eventId', '==', eventId);
    if (!ignoreLimit) {
        ref = ref.limit(limit);
    }
    return ref.get()
        .then(qsn => {
            let list = [];
            qsn.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
            return list;
        });
}