const fs = require('fs');
const nodemailer = require('nodemailer');
const mailTemplate = fs.readFileSync(__dirname + '/../templates/mail.html');
require('dotenv').config();

exports.sendEmail = (receiver, receiverName, type = 'REQUEST_DONE', extraData) => {

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'templelunalye@gmail.com',
            pass: process.env.TEMP_KEY
        }
    });

    let subject = '';
    let linkTo = '';
    let joinLink = process.env.URL_GROUP_FB;
    let altText = '';
    let htmlText = '';

    switch (type) {
        case 'REQUEST_DONE':
            {
                const { title, requestId, type } = extraData;

                subject = type == 'CRITICA' ? '¡Tu crítica Temple Luna está lista!' : type == 'DISENO' ? '¡Tu diseño Temple Luna está listo!' : type == 'CORRECCION' ? '¡Tu corrección Temple Luna está lista!' : '¡Tu solicitud Temple Luna está lista!';
                linkTo = `${process.env.URL_FRONT}prev_resultado/?id=${requestId}&t=${encodeURIComponent(title)}&templated=true`;
                altText = `Hola ${receiverName}.\nTu trabajo final puede ser encontrado aquí:\n${linkTo}\nTe esperamos en la mejor comunidad literaria del mundo: ${joinLink}\nEquipo Temple Luna.`;
                htmlText = mailTemplate.toString()
                    .replace(/{{title}}/g, subject)
                    .replace(/{{bodyText}}/g, `¡Hola, ${receiverName}!<br/>Uno de nuestros artistas ha tomado tu solicitud. No olvides compartirlo, eso ayuda mucho al artista`)
                    .replace(/{{linkto}}/g, linkTo);
            }
            break;

        case 'FEEDBACK_GIVEN':
            {
                const { title, requestId } = extraData;

                subject = '¡Has recibido un comentario!';
                linkTo = `${process.env.URL_FRONT}admin/?viewFeedback=${requestId}`;
                altText = `Hola ${receiverName}.\nTu trabajo en la obra "${title}" ha recibido un comentario. Leelo en tu cuenta o a través de este link:\n${linkTo}\nNo olvides que te queremos.\nEquipo Temple Luna.`;
                htmlText = mailTemplate.toString()
                    .replace(/{{title}}/g, subject)
                    .replace(/{{bodyText}}/g, `¡Hola, ${receiverName}!<br/>Tu trabajo en la obra "${title}" ha recibido un comentario ¡Felicitaciones!. Leelo en tu cuenta o desde aquí:`)
                    .replace(/{{linkto}}/g, linkTo);
            }
            break;

        case 'LIKE_GIVEN':
            {
                const { title, requestId } = extraData;

                subject = '¡Has recibido un corazón!';
                linkTo = `${process.env.URL_FRONT}admin/`;
                altText = `Hola ${receiverName}.\nTu trabajo en la obra "${title}" ha recibido un corazón. Míralo desde tu cuenta aquí:\n${linkTo}\nNo olvides que te queremos.\nEquipo Temple Luna.`;
                htmlText = mailTemplate.toString()
                    .replace(/{{title}}/g, subject)
                    .replace(/{{bodyText}}/g, `¡Hola, ${receiverName}!<br/>Tu trabajo en la obra "${title}" ha recibido un corazón ¡Felicitaciones!. Leelo en tu cuenta desde aquí:`)
                    .replace(/{{linkto}}/g, linkTo);
            }
            break;
    }

    const mailOptions = {
        from: 'Temple Luna <templelunalye@gmail.com',
        to: receiver,
        subject,
        text: altText,
        html: htmlText
    };

    return transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            throw new Error(error);
        } else {
            console.log('Correo enviado: ' + info.response);
        }
    });
}