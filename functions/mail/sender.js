const fs = require('fs');
const nodemailer = require('nodemailer');
const mailTemplate = fs.readFileSync(__dirname + '/../templates/mail.html');

require('dotenv').config();

exports.sendEmail = (receiver, title, linkTo, authorName, pageLink) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'templelunalye@gmail.com',
            pass: process.env.TEMP_KEY
        }
    });

    const mailOptions = {
        from: 'Temple Luna <templelunalye@gmail.com',
        to: receiver,
        subject: title,
        text: `Hola ${authorName}. Tu trabajo final puede ser encontrado aquí:\n${linkTo}\nTe esperamos en la mejor comunidad literaria del mundo: ${pageLink}\nEquipo Temple Luna.`,
        html: mailTemplate.toString().replace(/{{pagelink}}/g, pageLink).replace(/{{linkto}}/g, linkTo).replace(/{{artistname}}/g, authorName).replace(/{{title}}/g, title)
    };

    return transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Correo enviado: ' + info.response);
        }
    });
}