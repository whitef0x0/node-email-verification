var express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    mongoose = require('mongoose'),
    bcrypt = require('bcryptjs'),
    Promise = require('bluebird'),
    nev = Promise.promisifyAll(require('../../index')(mongoose));
mongoose.connect('mongodb://localhost/YOUR_DB');

function PromiseError(message) {
    this.name = 'PromiseError';
    this.message = message;
    this.stack = (new Error()).stack;
}
PromiseError.prototype = Object.create(Error.prototype);
PromiseError.prototype.constructor = PromiseError;


// our persistent user model
var User = require('./app/userModel');

// sync version of hashing function
var myHasher = function(password, tempUserData, insertTempUser, callback) {
    var hash = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    return insertTempUser(hash, tempUserData, callback);
};

// async version of hashing function
myHasher = function(password, tempUserData, insertTempUser, callback) {
    bcrypt.genSalt(8, function(err, salt) {
        bcrypt.hash(password, salt, function(err, hash) {
            return insertTempUser(hash, tempUserData, callback);
        });
    });
};

// NEV configuration =====================
nev.configureAsync({
        persistentUserModel: User,
        expirationTime: 600, // 10 minutes

        verificationURL: 'http://localhost:9000/email-verification/${URL}',
        transportOptions: {
            service: 'Gmail',
            auth: {
                user: 'yoursupercoolemailyeah@gmail.com',
                pass: 'yoursupersecurepassword'
            }
        },

        hashingFunction: myHasher,
        passwordFieldName: 'pw',
    })
    .then(function(options) {
        console.log('configured: ' + (typeof options === 'object'));
        return nev.generateTempUserModelAsync(User);
    })
    .then(function(tempUserModel) {
        console.log('generated temp user model: ' + (typeof tempUserModel === 'function'));
    })
    .catch(function(err) {
        console.log('ERROR!');
        console.log(err);
    });


// Express stuff =========================
app.use(bodyParser.urlencoded());
app.get('/', function(req, res) {
    res.sendFile('index.html', {
        root: __dirname
    });
});

app.post('/', function(req, res) {
    var email = req.body.email;

    // register button was clicked
    if (req.body.type === 'register') {
        var pw = req.body.pw;
        var newUser = new User({
            email: email,
            pw: pw
        });

        nev.createTempUserAsync(newUser)
            .then(function(data) {

                var existingPersistentUser = data[0],
                    newTempUser = data[1];

                // user already exists in persistent collection
                if (existingPersistentUser) {
                    res.json({
                        msg: 'You have already signed up and confirmed your account. Did you forget your password?'
                    });
                    throw new PromiseError('User already exists in persistent collection.');
                }

                if (newTempUser) {
                    var URL = newTempUser[nev.options.URLFieldName];
                    return nev.sendVerificationEmailAsync(email, URL);

                    // user already exists in temporary collection!
                } else {
                    res.json({
                        msg: 'You have already signed up. Please check your email to verify your account.'
                    });
                    throw new PromiseError('User already exists in temporary collection.');
                }
            })
            .then(function(info) {
                res.json({
                    msg: 'An email has been sent to you. Please check it to verify your account.',
                    info: info
                });
            })
            .catch(function(err) {
                if (err.name !== 'PromiseError') {
                    return res.status(404).send('FAILED');
                }
            });

        // resend verification button was clicked
    } else {
        nev.resendVerificationEmailAsync(email)
            .then(function(userFound) {
                if (userFound) {
                    res.json({
                        msg: 'An email has been sent to you, yet again. Please check it to verify your account.'
                    });
                } else {
                    res.json({
                        msg: 'Your verification code has expired. Please sign up again.'
                    });
                }
            })
            .catch(function() {
                return res.status(404).send('ERROR: resending verification email FAILED');
            });
    }
});


// user accesses the link that is sent
app.get('/email-verification/:URL', function(req, res) {
    var url = req.params.URL;

    nev.confirmTempUserAsync(url)
        .then(function(user) {
            if (user) {
                return nev.sendConfirmationEmailAsync(user.email);
            } else {
                res.json({
                    msg: 'Couldn\'t confirm user. Perhaps your code expired?'
                });
                throw new PromiseError('User could not be confirmed.');
            }
        })
        .then(function(info) {
            res.json({
                msg: 'You have been confirmed!',
                info: info
            });
        })
        .catch(function(err) {
            if (err.name !== 'PromiseError') {
                res.status(404).send('FAILED');
            }
        });
});


app.listen(9000);
console.log('Express & NEV PROMISIFIED! example listening on 9000...');