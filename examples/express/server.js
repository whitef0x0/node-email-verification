var express = require('express'),
  bodyParser = require('body-parser'),
  app = express(),
  mongoose = require('mongoose'),
  bcrypt = require('bcryptjs'),
  nev = require('../../index')(mongoose);
mongoose.connect('mongodb://localhost/YOUR_DB');

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
nev.configure({
  persistentUserModel: User,
  expirationTime: 600, // 10 minutes

  verificationURL: 'http://localhost:8000/email-verification/${URL}',
  transportOptions: {
    service: 'Gmail',
    auth: {
      user: 'yoursupercoolemailyeah@gmail.com',
      pass: 'yoursupersecurepassword'
    }
  },

  hashingFunction: myHasher,
  passwordFieldName: 'pw',
});

nev.generateTempUserModel(User);


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

    nev.createTempUser(newUser, function(err, newTempUser) {
      if (err) {
        return res.status(404).send('FAILED');
      }

      // new user created
      if (newTempUser) {
        var URL = newTempUser[nev.options.URLFieldName];

        nev.sendVerificationEmail(email, URL, function(err, info) {
          res.json({
            msg: 'An email has been sent to you. Please check it to verify your account.'
          });
        });

      // user already exists in temporary collection!
      } else {
        res.json({
          msg: 'You have already signed up. Please check your email to verify your account.'
        });
      }
    });

  // resend verification button was clicked
  } else {
    nev.resendVerificationEmail(email, function(err, userFound) {
      if (userFound) {
        res.json({
          msg: 'An email has been sent to you, yet again. Please check it to verify your account.'
        });
      } else {
        res.json({
          msg: 'Your verification code has expired. Please sign up again.'
        });
      }
    });
  }
});


// user accesses the link that is sent
app.get('/email-verification/:URL', function(req, res) {
  var url = req.params.URL;

  nev.confirmTempUser(url, function(err, user) {
    if (user) {
      nev.sendConfirmationEmail(user['email'], function(err, info) {
        res.send('You have been confirmed!');
      });
    } else {
      res.status(404).send('FAILED');
    }
  });
});


app.listen(8000);
console.log('Express & NEV example listening on 8000...');
