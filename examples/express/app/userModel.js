var mongoose = require('mongoose'),
    bcrypt   = require('bcrypt');

var userSchema = mongoose.Schema({
    email  : String,
    pw     : String,
    salt   : String,
});

userSchema.pre('save', function(next) {
    if (this.pw) {
        this.pw = this.generateHash(this.pw);
    }
    next();
});


userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.pw);
};

module.exports = mongoose.model('real_users', userSchema);
