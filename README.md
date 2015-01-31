# node email verification
[![NPM](https://nodei.co/npm/email-verification.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/email-verification/)

verify user signup with node and mongodb

the way this works is as follows:

- temporary user is created with a randomly generated URL assigned to it and then saved to a mongoDB collection
- email is sent to the email address the user signed up with
- when the URL is accessed, the user's data is transferred to the real collection

a temporary user document has a TTL of 24 hours by default, but this (as well as many other things) can be configured. see the options section for more details. it is also possible to resend the verification email if needed.

## installation
via npm:

```
npm install email-verification
```

## examples
this little guide of sorts assumes you have a directory structure like so:

```
app/
-- userModel.js
-- tempUserModel.js
node_modules/
server.js
```

all of the code in this section takes place in server.js.

```javascript
var nev = require('email-verification'),
    User = require('./app/userModel'),
    mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/YOUR_DB');
```

before doing anything, make sure to configure the options (see the section below for more extensive detail on this):

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

any options not included in the object you pass will take on the default value specified in the section below. calling `configure` multiple times with new options will simply change the previously defined options.

to create a temporary user model, you can either generate it using a built-in function, or you can predefine it in a separate file. if you are pre-defining it, it must be IDENTICAL to the user model with an extra field for the URL; the default one is `GENERATED_VERIFYING_URL: String`. **you're just better off generating a model**.

```javascript
// configuration options go here...

// generating the model, pass the User model defined earlier
nev.generateTempUserModel(User);

// using a predefined file
var TempUser = require('./app/tempUserModel');
nev.configure({
    tempUserModel: TempUser 
});
```

then, create an instance of the User model, and then pass it as well as a custom callback to `createTempUser`, one that makes use of the function `registerTempUser` and, if you want, handles the case where the temporary user is already in the collection:

```javascript
// get the credentials from request parameters or something
var email = "...",
    password = "...";

var newUser = User({
    email: email,
    password: password
});

nev.createTempUser(newUser, function(newTempUser) {
    // a new user
    if (newTempUser) {
        nev.registerTempUser(newTempUser);
        // flash message of success

    // user already exists in our temporary collection
    } else {
        // flash message of failure...
    }
});
```

an email will be sent to the email address that the user signed up with. note that this does not handle hashing passwords - that must be done on your own terms. to see how to do this, check the Express example.

to move a user from the temporary storage to 'persistent' storage (e.g. when they actually access the URL we sent them), we call `confirmTempUser`, which takes the URL as well as a callback with one argument (the instance of the User model, or null) as arguments. if the callback's argument is null, it is most likely because their data expired.

```javascript
var url = '...';
nev.confirmTempUser(url, function(user) {
    if (user)
        // redirect to their profile
    else
        // redirect to sign-up
});
```

if you want the user to be able to request another verification email, simply call `resendVerificationEmail`, which takes the user's email address and a callback with one argument (again, whether or not the user was found) as arguments:

```javascript
var email = '...';
nev.resendVerificationEmail(email, function(userFound) {
    if (userFound)
        // email has been sent
    else
        // flash message of failure...
});
```

to see a fully functioning example that uses Express as the backend, check out the [**examples section**](https://github.com/StDako/node-email-verification/tree/master/examples/express).

## API
#### `configure(options)`
changes the default configuration by passing an object of options; see the section below for a list of all options.

#### `generateTempUserModel(UserModel)`
generates a Mongoose Model for the temporary user based off of `UserModel`, the persistent user model. the temporary model is essentially a duplicate of the persistent model except that it has the field `{GENERATED_VERIFYING_URL: String}` for the randomly generated URL by default (the field name can be changed in the options). if the persistent model has the field `createdAt`, then an expiration time (`expires`) is added to it with a default value of 24 hours; otherwise, the field is created as such:

```
{
    ...
    createdAt: {
        type: Date,
        expires: 86400,
        default: Date.now
    }
    ...
}
```

note that `createdAt` will not be transferred to persistent storage (yet?).

#### `createTempUser(user, callback(tempuser))`
attempts to create an instance of a temporary user model based off of an instance of a persistent user, `user`. `tempuser` is the temporary user instance if the user doesn't exist in the temporary collection, or `null` otherwise. it is most convenient to call `registerTempUser` in the "success" case (i.e. not `null`) of the callback.

if a temporary user model hasn't yet been defined (generated or otherwise), a TypeError will be thrown.

#### `registerTempUser(tempuser)`
saves the instance of the temporary user model, `tempuser`, to the temporary collection, and then sends an email to the user requesting verification.

#### `confirmTempUser(url, callback(user))`
transfers a temporary user (found by `url`) from the temporary collection to the persistent collection and remove the URL assigned to the user. `userTransferred` is the persistent user instance if  the user has been successfully transferred (i.e. the user accessed URL before expiration) and `null` otherwise; this can be used for redirection and what not.

#### `resendVerificationEmail(email, callback(userFound))`
resends the verification email to a user, given their email. `userFound` is `true` if the user has been found in the temporary collection (i.e. their data hasn't expired yet) and `false` otherwise.


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
    emailFieldName: 'email',
    URLFieldName: 'GENERATED_VERIFYING_URL',
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

- **verificationURL**: the URL for the user to click to verify their account. `${URL}` determines where the randomly generated part of the URL goes - it must be included.
- **URLLength**: the length of the randomly-generated string.
- **persistentUserModel**: the Mongoose Model for the persistent user.
- **tempUserModel**: the Mongoose Model for the temporary user. you can generate the model by using `generateTempUserModel` and passing it the persistent User model you have defined, or you can define your own model in a separate file and pass it as an option in `configure` instead.
- **tempUserCollection**: the name of the MongoDB collection for temporary users.
- **emailFieldName**: the field name for the user's email. if the field is nested within another object(s), use dot notation to access it, e.g. `{local: {email: ...}}` would use `'local.email'`.
- **URLFieldName**: the field name for the randomly-generated URL.
- **expirationTime**: the amount of time that the temporary user will be kept in collection, measured in seconds.
- **transportOptions**: the options that will be passed to `nodemailer.createTransport`.
- **verifyMailOptions**: the options that will be passed to `nodemailer.createTransport({...}).sendMail` when sending an email for verification. you must include `${URL}` somewhere in the `html` and/or `text` fields to put the URL in these strings.
- **verifySendMailCallback**: the callback function that will be passed to `nodemailer.createTransport({...}).sendMail` when sending an email for verification.
- **sendConfirmationEmail**: send an email upon the user verifiying their account to notify them of verification.
- **confirmMailOptions**: the options that will be passed to `nodemailer.createTransport({...}).sendMail` when sending an email to notify the user that their account has been verified. you must include `${URL}` somewhere in the `html` and/or `text` fields to put the URL in these strings.
- **confirmSendMailCallback**: the callback function that will be passed to `nodemailer.createTransport({...}).sendMail` when sending an email to notify the user that their account has been verified.

### todo
- **development**: add a task runner WE NEED TESTS
- **development**: throw more errors
- *nice to have*: working examples with Sails and HapiJS (maybe Koa and Total as well?)

### acknowledgements
thanks to [Frank Cash](https://github.com/frankcash) for looking over my code.

### license
ISC
