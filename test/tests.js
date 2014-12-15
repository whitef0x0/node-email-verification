var assert = require('chai').assert;
var should = require('chai').should();
var expect = require('chai').expect;
var mongoose = require('mongoose');
var main = require('../index');
var user = require('../examples/express/app/userModel'); // sample user schema

main.generateTempUserModel(user);

describe("config & set up tests", function(){

  it("Tests the option object", function(){
    assert.typeOf(main.options.URLLength, 'number', "URL Length must be a number");
    assert.typeOf(main.options.expirationTime, 'number', "Expiration time must be a number");
    assert.typeOf(main.options.verificationURL, 'string', "URL for verification must be a string");
  });

});

describe("db tests", function(){
  before(function(){
    newUser = new user({
      email: "foobar@fizzbuzz.com",
      pw: "pass"
    });
  });

  it("Tests sending email", function(){
    main.sendVerificationEmail("foobar@fizzbuzz.com","foo");
  });

  it("Tests adding a temp user", function(done){

    main.createTempUser(newUser, function(newTempUser) {
      // new user created
      if (newTempUser) {
        main.registerTempUser(newTempUser);
        // user already exists in temporary collection!
      }
    });


    main.options.tempUserModel.findOne({ email : newUser.email }).exec( function(err, result){
      should.not.exist(err);
      should.exist(result);
      result.should.have.property('email').with.length(newUser.email.length);
      result.should.have.property('pw').with.length(newUser.pw.length);
      done();
    });


  });

});
