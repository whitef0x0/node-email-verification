"use strict";

var randtoken = require('rand-token'),
    mongoose = require('mongoose'),
    nodemailer = require('nodemailer');

var options = {
    verificationURL: 'http://example.com/email-verification/${URL}',

    //mongo-stuff
    tempUserModel: null,
    tempUserCollection: 'temporary_users',
    hashPassword: false,

    // emailing options
    transportOptions: {
        service: 'Gmail',
        auth: {
            user: 'user@gmail.com',
            pass: 'password'
        }
    },
    mailOptions: {
        from: 'Do Not Reply <user@gmail.com>',
        subject: 'Confirm your account',
        html: '<p>Please confirm your account by clicking <a href="${URL}">this link</a>. If you are unable to do so, copy and ' +
                'paste the following link into your browser:</p><p>${URL}</p>',
        text: 'Please confirm your account by clicking the following link, or by copying and pasting it into your browser: ${URL}'
    },
    sendMailCallback: function(err, info) {
        if (err) throw err;
        else console.log(info.response);
    }
};


var transporter = nodemailer.createTransport(options.transportOptions);


var configure = function(o) {
    for (var key in o)
        options[key] = o[key];
    transporter = nodemailer.createTransport(options.transportOptions);
};


var generateTempUserModel = function(User) {
    // User is a Mongoose model
    var tempUserSchemaObject = {}, // a copy of the schema
        tempUserSchema, tempUserModel;

    // copy over the attributes of the schema
    Object.keys(User.schema.paths).forEach(function(field) {
        if (field !== '_id' && field !== '__v')
            tempUserSchemaObject[field] = User.schema.paths[field].options.type; //lol
    });
    tempUserSchemaObject.GENERATED_VERIFYING_URL = String;

    tempUserSchema = mongoose.Schema(tempUserSchemaObject);
    options.tempUserModel = mongoose.model(options.tempUserCollection, tempUserSchema);
};


var registerTempUser = function(user) {
    // user is an instance of a Mongoose model (e.g. user = new User())
    if (options.tempUserModel) {
        var tempUserData = {},
            newTempUser;

        Object.keys(user._doc).forEach(function(field) {
            tempUserData[field] = user[field];
        });
        tempUserData.GENERATED_VERIFYING_URL = randtoken.generate(48);
        newTempUser = new options.tempUserModel(tempUserData);

        newTempUser.save(function(err) {
            if (err)
                throw err;

            var email = newTempUser.email,
                URL = options.verificationURL + newTempUser.GENERATED_VERIFYING_URL,
                mailOptions = JSON.parse(JSON.stringify(options.mailOptions));
            mailOptions.to = email;
            mailOptions.html = mailOptions.html.replace(/$\{URL\}/g, URL);
            mailOptions.text = mailOptions.text.replace(/$\{URL\}/g, URL);

            transporter.sendMail(mailOptions, options.sendMailCallback);
        });

    } else
        throw new TypeError("Temporary user model not defined. Either you forgot to generate one or you did not predefine one.");
};

module.exports = {
    options: options,
    configure: configure,
    registerTempUser: registerTempUser,
    generateTempUserModel: generateTempUserModel
};