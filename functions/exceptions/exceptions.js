const admin = require("firebase-admin");
const firestore = admin.firestore();

exports.addException = (exception) => {
    return firestore.collection('excepciones').doc().set(exception);
}