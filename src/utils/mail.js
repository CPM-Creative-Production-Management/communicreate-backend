const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const sendMail = async (email, subject, text) => {
    const mailOptions = {
        from: process.env.EMAIL_ID,
        to: email,
        subject: subject,
        text: text,
    };

    const info = await transport.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
}

module.exports = {sendMail}