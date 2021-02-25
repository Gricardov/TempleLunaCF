const nodemailer = require('nodemailer');
require('dotenv').config();

exports.sendEmail = (receiver, subject, body) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'templelunalye@gmail.com',
            pass: process.env.TEMP_KEY
        }
    });

    const mailOptions = {
        from: 'Temple Luna <templelunalye@gmail.com>',
        to: receiver,
        subject,
        text: body
    };

    return transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Correo enviado: ' + info.response);
        }
    });
}