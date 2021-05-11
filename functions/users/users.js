const admin = require("firebase-admin");
const firestore = admin.firestore();

exports.createProfile = async (user) => {
    return firestore.collection('perfiles').doc(user.uid).set({
        contactEmail: user.email,
        fName: 'Nuevo',
        lName: 'Usuario',
        urlImg: '',
        likes: 0,
        views: 0,
        roles: [],
        services: [],
        networks: []
    }, { merge: true });
}

exports.getArtistData = async userId => {
    let requestRef = await firestore.collection('perfiles').doc(userId);
    let doc = await requestRef.get();

    if (doc.exists) {
        return { ...doc.data(), id: doc.id };
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