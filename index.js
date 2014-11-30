"use strict";

var randtoken = require('rand-token'),
    mongoose = require('mongoose'),
    nodemailer = require('nodemailer');

var options = {
    verificationURL: 'http://example.com/email-verification/',

    //mongo-stuff
    tempUserModel: null,
    // if a model hasn't been specified...
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
        html: '<p>Please confirm your account by clicking <a href="#{URL}">this link</a>. If you are unable to do so, copy and ' +
                'paste the following link into your browser:</p><p>#{URL}</p>',
        text: 'Please confirm your account by clicking the following link, or by copying and pasting it into your browser: #{URL}'
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

var registerTempUser = function(user) {
    // user is an instance of a Mongoose model (e.g. user = new User())

    var tempUserData = {}, // a copy of the document
        newTempUser;

    // copy over the document and generate the URL
    Object.keys(user._doc).forEach(function(field) {
        tempUserData[field] = user[field];
    });
    tempUserData.GENERATED_VERIFYING_URL = randtoken.generate(48);


    // if temporary user model has been predefined...
    if (options.tempUserModel) {
        newTempUser = new options.tempUserModel(tempUserData);

    // otherwise, generate a Schema on the fly.
    } else {
        var tempUserSchemaObject = {}, // a copy of the schema
            tempUserSchema, tempUserModel;

        // get the type for each field in the document
        Object.keys(user._doc).forEach(function(field) {
            if (field !== '_id')
                tempUserSchemaObject[field] = user[field].constructor;
        });
        tempUserSchemaObject.GENERATED_VERIFYING_URL = String;

        // create the schema, copy over any methods, create model and instance
        tempUserSchema = mongoose.Schema(tempUserSchemaObject);
        for (var method in user.schema.methods)
            tempUserSchema.methods[method] = user.schema.methods[method];
        tempUserModel = mongoose.model(options.tempUserCollection, tempUserSchema);
        newTempUser = new tempUserModel(tempUserData);
    }

    newTempUser.save(function(err) {
        if (err)
            throw err;

        var email = newTempUser.email,
            URL = options.verificationURL + newTempUser.GENERATED_VERIFYING_URL,
            mailOptions = JSON.parse(JSON.stringify(options.mailOptions));
        mailOptions.to = email;
        mailOptions.html = mailOptions.html.replace(/#\{URL\}/g, URL);
        mailOptions.text = mailOptions.text.replace(/#\{URL\}/g, URL);

        transporter.sendMail(mailOptions, options.sendMailCallback);
    });
};

module.exports = {
    options: options,
    configure: configure,
    registerTempUser: registerTempUser,
};