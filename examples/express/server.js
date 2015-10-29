var express = require('express'),
  bodyParser = require('body-parser'),
  app = express(),
  mongoose = require('mongoose'),
  nev = require('../../index')(mongoose);
mongoose.connect('mongodb://localhost/YOUR_DB');

// our persistent user model
var User = require('./app/userModel');


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
      // new user created
      if (newTempUser) {
        // hash the password here
        newTempUser.pw = newTempUser.generateHash(newTempUser.pw);
        nev.registerTempUser(newTempUser, function(err) {
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
      setTimeout(function() {
        res.redirect('/');
      }, 5000);
    }
  });
});


app.listen(8000);
console.log('Express & NEV example listening on 8000...');