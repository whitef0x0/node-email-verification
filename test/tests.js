var assert = require('chai').assert;
var should = require('chai').should();
var mongoose = require('mongoose');
var nev = require('../index')(mongoose);
var stubTransport = require('nodemailer-stub-transport');
var user = require('../examples/express/app/userModel'); // sample user schema
mongoose.connect('mongodb://localhost/test_database'); // needed for testing


nev.generateTempUserModel(user);
nev.configure({
  transportOptions: stubTransport(),
  persistentUserModel: user,
  passwordFieldName: 'pw',
});

describe('config & set up tests', function() {

  it('Tests the option object', function() {
    assert.typeOf(nev.options.URLLength, 'number', 'URL Length must be a number');
    assert.typeOf(nev.options.expirationTime, 'number', 'Expiration time must be a number');
    assert.typeOf(nev.options.verificationURL, 'string', 'URL for verification must be a string');
  });

});

describe('MongoDB tests', function() {

  var newUser, newUserURL;

  before(function(done) {
    newUser = new user({
      email: 'foobar@fizzbuzz.com',
      pw: 'pass'
    });

    done();
  });

  it('should create a temporary user (createTempUser())', function(done) {
    nev.createTempUser(newUser, function(err, newTempUser) {
      should.not.exist(err);
      should.exist(newTempUser);

      nev.options.tempUserModel.findOne({
        email: newUser.email
      }).exec(function(err, result) {
        should.not.exist(err);
        should.exist(result);

        result.should.have.property('email').with.length(newUser.email.length);
        result.should.have.property('pw').with.length(4);
        newUserURL = result.GENERATED_VERIFYING_URL;

        done();
      });

    });
  });

  it('should put the temporary user into the persistent collection (confirmTempUser())', function(done) {
    nev.confirmTempUser(newUserURL, function(err, newUser) {
      should.not.exist(err);
      should.exist(newUser);

      user.findOne({
        email: newUser.email
      }).exec(function(err, result) {
        should.not.exist(err);
        should.exist(result);

        result.should.have.property('email').with.length(newUser.email.length);
        result.should.have.property('pw').with.length(4);

        done();
      });
    });
  });

  after(function(done) {
    user.remove().exec(done);
  });
});
