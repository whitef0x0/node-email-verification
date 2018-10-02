var should = require('chai').should();
var mongoose = require('mongoose');
var nev = require('../index')(mongoose);
var stubTransport = require('nodemailer-stub-transport');
var user = require('../examples/express/app/userModel'); // sample user schema
mongoose.connect('mongodb://localhost/test_database'); // needed for testing

describe('config & set up tests', function() {

  var tempUserModel;

  it('Generates a temp user model', function(done) {
    nev.generateTempUserModel(user, function(err, generatedTempUserModel) {
      tempUserModel = generatedTempUserModel;
      done();
    });
  });

  describe('Test configuration error throwing', function() {

    var defaultOptions;

    before(function() {
      defaultOptions = JSON.parse(JSON.stringify(nev.options));
    });


    var tests = [{
        field: 'verificationURL',
        wrongValue: 100,
        reason: 'type'
      },
      {
        field: 'verificationURL',
        wrongValue: 'someurl',
        reason: 'value'
      },
      {
        field: 'URLLength',
        wrongValue: 'str',
        reason: 'type'
      },
      {
        field: 'URLLength',
        wrongValue: -20,
        reason: 'value'
      },
      {
        field: 'URLLength',
        wrongValue: 5.5,
        reason: 'value'
      },
      {
        field: 'tempUserCollection',
        wrongValue: null,
        reason: 'type'
      },
      {
        field: 'emailFieldName',
        wrongValue: [],
        reason: 'type'
      },
      {
        field: 'passwordFieldName',
        wrongValue: {},
        reason: 'type'
      },
      {
        field: 'URLFieldName',
        wrongValue: 5.5,
        reason: 'type'
      },
      {
        field: 'expirationTime',
        wrongValue: '100',
        reason: 'type'
      },
      {
        field: 'expirationTime',
        wrongValue: -42,
        reason: 'value'
      },
      {
        field: 'expirationTime',
        wrongValue: 4.2,
        reason: 'value'
      },
    ];

    tests.forEach(function(test) {
      it('should throw an error for invalid ' + test.field + ' ' + test.reason, function(done) {
        var optionsToConfigure = {};
        optionsToConfigure[test.field] = test.wrongValue;
        nev.configure(optionsToConfigure, function(err, options) {
          should.exist(err);
          should.not.exist(options);
          done();
        });
      });
    });

    after(function(done) {
      var newOptions = JSON.parse(JSON.stringify(defaultOptions));
      newOptions.tempUserModel = tempUserModel;
      newOptions.transportOptions = stubTransport();
      newOptions.persistentUserModel = user;
      newOptions.passwordFieldName = 'pw';
      nev.configure(newOptions, done);
    });
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
    nev.createTempUser(newUser, function(err, existingPersistentUser, newTempUser) {
      should.not.exist(err);
      should.not.exist(existingPersistentUser);
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