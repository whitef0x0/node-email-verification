"use strict";

var randtoken = require('rand-token'),
    mongoose = require('mongoose');

var options = {
    auth: {
        user: 'user@gmail.com',
        pass: 'password'
    },
    tempUserModel: null,

    // if a model hasn't been specified...
    tempUserCollection: 'temporary_users',
    hashPassword: false,

};

var configure = function(o) {
    for (var key in o)
        options[key] = o[key];
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
    });
};

module.exports = {
    options: options,
    configure: configure,
    registerTempUser: registerTempUser,
};