var assert = require('chai').assert;
var should = require('chai').should();
var expect = require('chai').expect;
var mongoose = require('mongoose');
var nev = require('../index');
var stubTransport = require('nodemailer-stub-transport');
var user = require('../examples/express/app/userModel'); // sample user schema

nev.generateTempUserModel(user);
nev.configure({
  transportOptions: stubTransport(),
});

describe('config & set up tests', function(){

  it('Tests the option object', function(){
    assert.typeOf(nev.options.URLLength, 'number', 'URL Length must be a number');
    assert.typeOf(nev.options.expirationTime, 'number', 'Expiration time must be a number');
    assert.typeOf(nev.options.verificationURL, 'string', 'URL for verification must be a string');
  });

});

describe('db tests', function(){

  before(function(done){
    newUser = new user({
      email: 'foobar@fizzbuzz.com',
      pw: 'pass'
    });

    newUser.save(function (err) {
      should.not.exist(err);
      done();
    });
  });

  it('should send an email without any errors (sendVerificationEmail())', function(done){
    nev.sendVerificationEmail('foobar@fizzbuzz.com','foo', function (err, info) {
      should.not.exist(err);
      should.exist(info);

      // console.log(info.response.toString());
      done();
    });
  });

  it('should create a temporary user without any errors (createTempUser())', function(done){

    nev.createTempUser(newUser, function(newTempUser) {

      // new user created
      if (newTempUser) {
        nev.registerTempUser(newTempUser);
      }

      nev.options.tempUserModel.findOne({ email : newUser.email }).exec( function(err, result){
        should.not.exist(err);
        should.exist(result);

        result.should.have.property('email').with.length(newUser.email.length);
        result.should.have.property('pw').with.length(60);

        done();
      });

    });
  });

  it('should confirm a temp user without any errors (sendVerificationEmail())', function(done){
    nev.createTempUser(newUser, function(newTempUser) {
      // console.log(newTempUser);

      if (newTempUser) {
        nev.registerTempUser(newTempUser);
      }

      nev.sendConfirmationEmail(newTempUser.email, function(err, info){
        should.not.exist(err);
        should.exist(info);

        console.log(info.response.toString());
        done();
      });
    });
  });

  afterEach(function(done) {
    nev.options.tempUserModel.remove().exec(done);
  });

  after(function(done) {
    user.remove().exec(done);
  });

});
