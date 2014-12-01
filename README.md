# node email verification
verify user signup with node and mongodb

the way this works (when this actually works) is as follows:

- temporary user is created with a randomly generated URL assigned to it and then saved to a mongoDB collection
- email is sent to the email address the user signed up with
- when the URL is accessed, the user's data is inserted into the real collection

### usage
as this is a huge work in progress, this is just based off of the current repository's file structure.

```javascript
var nev = require('./index'),
    User = require('./user'),
    mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/YOUR_DB');
```

before doing anything, make sure to configure the options (see below for more extensive detail on this):
```javascript
nev.configure({
    verificationURL: 'http://myawesomewebsite.com/email-verification/${URL}',
    persistentUserModel: User,
    tempUserCollection: 'myawesomewebsite_tempusers',

    transportOptions: {
        service: 'Gmail',
        auth: {
            user: 'myawesomeemail@gmail.com',
            pass: 'mysupersecretpassword'
        }
    },
    verifyMailOptions: {
        from: 'Do Not Reply <myawesomeemail_do_not_reply@gmail.com>',
        subject: 'Please confirm account',
        html: 'Click the following link to confirm your account:</p><p>${URL}</p>',
        text: 'Please confirm your account by clicking the following link: ${URL}'
    }
});
```

any options not included in the object you pass will take on the default value specified in the section below. calling ```configure``` multiple times with new options will simply change the previously defined options.

to create a temporary user model, you can either generate it using a built-in function, or you can predefine it in a separate file. if you are pre-defining it, it must be IDENTICAL to the user model with an extra field ```GENERATED_VERIFYING_URL: String```. **you're just better off generating a model**.

```javascript
// configuration options go here...

// generating the model, pass the User model defined earlier
nev.generateTempUserModel(User);

// using a predefined file
var TempUser = require('./tempuser.js');
nev.configure({
    tempUserModel: TempUser 
});
```

then, create an instance of the User model, and then pass it as well as a custom callback to ```createTempUser```, one that makes use of the function ```registerTempUser``` and, if you want, handles the case where the temporary user is already in the collection:

```javascript
// get the credentials from request parameters or something
var email = "...",
    password = "...";

var newUser = User({
    email: email,
    password: password
});

nev.createTempUser(newUser, function(newTempUser) {
    // all is well
    if (newTempUser) {
        nev.registerTempUser(newTempUser);
    // user already exists in our temporary collection
    } else {
        console.log('')
    }
});
```

an email will be sent to the email address that the user signed up with. note that this does not handle hashing passwords - that must be done on your own terms.

### options
here are the default options:
```javascript
var options = {
    verificationURL: 'http://example.com/email-verification/${URL}',
    URLLength: 48,

    // mongo-stuff
    persistentUserModel: null,
    tempUserModel: null,
    tempUserCollection: 'temporary_users',
    expirationTime: 86400,

    // emailing options
    transportOptions: {
        service: 'Gmail',
        auth: {
            user: 'user@gmail.com',
            pass: 'password'
        }
    },
    verifyMailOptions: {
        from: 'Do Not Reply <user@gmail.com>',
        subject: 'Confirm your account',
        html: '<p>Please verify your account by clicking <a href="${URL}">this link</a>. If you are unable to do so, copy and ' +
                'paste the following link into your browser:</p><p>${URL}</p>',
        text: 'Please verify your account by clicking the following link, or by copying and pasting it into your browser: ${URL}'
    },
    verifySendMailCallback: function(err, info) {
        if (err) throw err;
        else console.log(info.response);
    },
    sendConfirmationEmail: true,
    confirmMailOptions: {
        from: 'Do Not Reply <user@gmail.com>',
        subject: 'Successfully verified!',
        html: '<p>Your account has been successfully verified.</p>',
        text: 'Your account has been successfully verified.'
    },
    confirmSendMailCallback: function(err, info) {
        if (err) throw err;
        else console.log(info.response);
    },
}
```

- **verificationURL**: the URL for the user to click to verify their account. ```${URL}``` determines where the randomly generated part of the URL goes - it must be included.
- **URLLength**: the length of the randomly-generated string.
- **persistentUserModel**: the Mongoose Model for the persistent user.
- **tempUserModel**: the Mongoose Model for the temporary user. you can generate the model by using ```generateTempUserModel``` and passing it the persistent User model you have defined, or you can define your own model in a separate file and pass it as an option in ```configure``` instead.
- **tempUserCollection**: the name of the MongoDB collection for temporary users.
- **expirationTime**: the amount of time that the temporary user will be kept in collection, measured in seconds.
- **transportOptions**: the options that will be passed to ```nodemailer.createTransport```.
- **verifyMailOptions**: the options that will be passed to ```nodemailer.createTransport({...}).sendMail``` when sending an email for verification. you must include ```${URL}``` somewhere in the ```html``` and/or ```text``` fields to put the URL in these strings.
- **verifySendMailCallback**: the callback function that will be passed to ```nodemailer.createTransport({...}).sendMail``` when sending an email for verification.
- **sendConfirmationEmail**: send an email upon the user verifiying their account to notify them of verification.
- **confirmMailOptions**: the options that will be passed to ```nodemailer.createTransport({...}).sendMail``` when sending an email to notify the user that their account has been verified. you must include ```${URL}``` somewhere in the ```html``` and/or ```text``` fields to put the URL in these strings.
- **confirmSendMailCallback**: the callback function that will be passed to ```nodemailer.createTransport({...}).sendMail``` when sending an email to notify the user that their account has been verified.

### status
- temporary users are created (with a random URL) and saved
- possible to predefine a temporary user schema (which must be identical to the persistent user schema) or generate one based off of a persistent user schema (this should only be done once)
- email is sent with the URL in it, which can be customized
- temporary users can be confirmed and changed into persistent users

### todo
- **development**: add grunt tasks
- *new option*: default callback to ```createTempUser```
- *new option*: custom field name for the randomly-generated URL
- add working example with Express

### acknowledgements
thanks to [Frank Cash](https://github.com/frankcash) for looking over my code.

### license
ISC