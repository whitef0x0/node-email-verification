var randtoken = require('rand-token'),
	mongoose = require('mongoose');

var options = {
	auth: {
		user: 'user@gmail.com',
		pass: 'password'
	},
	userSchema: null,
	hashPassword: false
};

var configure = function(o) {
	for (var key in o)
		options[key] = o[key];
};

var registerTempUser = function(user) {
	// user is an instance of a Mongoose model (e.g. user = new User())

	var tempUserData = {}, // copy the user document
		tempUserSchemaObject = {}, // copy the user schema
		tempUserSchema, tempUser;

	Object.keys(user._doc).forEach(function(field) {
		if (field !== '_id') {
			tempUserData[field] = user[field];
			tempUserSchemaObject[field] = user[field].constructor;
		}
	});
	tempUserData.GENERATED_VERIFYING_URL = randtoken.generate(48);
	tempUserSchemaObject.GENERATED_VERIFYING_URL = String;

	tempUserSchema = mongoose.Schema(tempUserSchemaObject);
	for (var method in user.schema.methods)
		tempUserSchema.methods[method] = user.schema.methods[method];
	tempUser = mongoose.model("temporary_users", tempUserSchema);

	newTempUser = new tempUser(tempUserData);
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