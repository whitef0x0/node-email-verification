"use strict";

var randtoken = require('rand-token'),
    mongoose = require('mongoose'),
    nodemailer = require('nodemailer');


var options = {
    verificationURL: 'http://example.com/email-verification/${URL}',

    //mongo-stuff
    persistentUserModel: null,
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


/**
 * Modify the default configuration.
 *
 * @func configure
 * @param {object} o - options to be changed
*/
var configure = function(o) {
    for (var key in o)
        options[key] = o[key];
    transporter = nodemailer.createTransport(options.transportOptions);
};


/**
 * Create a Mongoose Model for the temporary user, based off of the persistent 
 * User model, i.e. the temporary user inherits the persistent user.
 *
 * @func generateTempUserModel
 * @param {object} User - the persistent User model.
*/
var generateTempUserModel = function(User) {
    var tempUserSchemaObject = {}, // a copy of the schema
        tempUserSchema, tempUserModel;

    // copy over the attributes of the schema
    Object.keys(User.schema.paths).forEach(function(field) {
        tempUserSchemaObject[field] = User.schema.paths[field].options.type; //lol
    });
    tempUserSchemaObject.GENERATED_VERIFYING_URL = String;

    tempUserSchema = mongoose.Schema(tempUserSchemaObject);
    options.tempUserModel = mongoose.model(options.tempUserCollection, tempUserSchema);
};


/**
 * Attempt to create an instance of a temporary user based off of an instance of a 
 * persistent user. If user already exists in the temporary collection, passes null 
 * to the callback function; otherwise, passes the instance to the callback, with a 
 * randomly generated URL associated to it.
 *
 * @func createTempUser
 * @param {object} user - an instance of the persistent User model
 * @return {object} null if user already exists; Mongoose Model instance otherwise
*/
var createTempUser = function(user, callback) {
    if (options.tempUserModel) {
        options.tempUserModel.findOne({email: user.email}, function(err, existingUser) {
            if (err)
                throw err;

            // user has already signed up...
            if (existingUser)
                callback(null);

            else {
                var tempUserData = {},
                    newTempUser;

                // copy the credentials for the user
                Object.keys(user._doc).forEach(function(field) {
                    tempUserData[field] = user[field];
                });
                tempUserData.GENERATED_VERIFYING_URL = randtoken.generate(48);
                callback(new options.tempUserModel(tempUserData));
            }
        });

    } else
        throw new TypeError("Temporary user model not defined. Either you forgot to generate one or you did not predefine one.");
};


/**
 * Save the user to the temporary collection, and send an email to the user 
 * requesting confirmation.
 *
 * @func registerTempUser
 * @param {object} newTempUser - an instance of the temporary user model
*/
var registerTempUser = function(newTempUser) {
    var r = /\$\{URL\}/g;
    newTempUser.save(function(err) {
        if (err)
            throw err;

        // inject newly-created URL into the email's body and FIRE
        var email = newTempUser.email,
            URL = options.verificationURL.replace(r, newTempUser.GENERATED_VERIFYING_URL),
            mailOptions = JSON.parse(JSON.stringify(options.mailOptions));
        mailOptions.to = email;
        mailOptions.html = mailOptions.html.replace(r, URL);
        mailOptions.text = mailOptions.text.replace(r, URL);

        transporter.sendMail(mailOptions, options.sendMailCallback);
    });
};


/**
 * Transfer a temporary user from the temporary collection to the persistent 
 * user collection, removing the URL assigned to it.
 *
 * @func confirmTempUser
 * @param {string} url - the randomly generated URL assigned to a unique email
*/
var confirmTempUser = function(url) {
    var TempUser = options.tempUserModel;

    TempUser.findOne({GENERATED_VERIFYING_URL: url}, function(err, tempUserData) {
        if (err)
            throw err;

        if (tempUserData) {
            var userData = JSON.parse(JSON.stringify(tempUserData)), // copy data
                User = options.persistentUserModel,
                user;

            delete userData['GENERATED_VERIFYING_URL'];
            user = new User(userData);

            // save the 
            user.save(function(err) {
                if (err)
                    throw err;

                TempUser.remove({GENERATED_VERIFYING_URL: url}, function(err) {
                    if (err)
                        throw err;
                    var mailOptions = JSON.parse(JSON.stringify(options.mailOptions));
                    mailOptions.to = userData.email;
                    mailOptions.html = "Your account has been confirmed.";
                    mailOptions.text = "Your account has been confirmed.";

                    transporter.sendMail(mailOptions, options.sendMailCallback);
                });
            });
        }
    });
};

module.exports = {
    options: options,
    configure: configure,
    generateTempUserModel: generateTempUserModel,
    createTempUser: createTempUser,
    registerTempUser: registerTempUser,
    confirmTempUser: confirmTempUser,
};