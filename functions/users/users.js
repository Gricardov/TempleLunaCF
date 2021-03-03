const admin = require("firebase-admin");
const firestore = admin.firestore();

exports.getArtistData = async userId => {
    let requestRef = await firestore.collection('perfiles').doc(userId);
    let doc = await requestRef.get();

    if (doc.exists) {
        const { fName, lName, imgUrl, contactEmail, networks } = doc.data();
        return { fName, lName, imgUrl, contactEmail, networks };
    } else {
        throw "El usuario no existe";
    }
}

exports.getProfiles = async () => {
    const qsn = await firestore.collection('perfiles').get();
    let list = [];
    qsn.forEach(doc => list.push({ fName: doc.data().fName, lName: doc.data().lName, id: doc.id }));
    return list;
}