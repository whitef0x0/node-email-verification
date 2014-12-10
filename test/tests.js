var assert = require('chai').assert;
var should = require('chai').should();
var expect = require('chai').expect;
var main = require('../index');
describe("main tests", function(){




  it("Tests the option object", function(){
    assert.typeOf(main.options.URLLength, 'number', "URL Length must be a number");
    assert.typeOf(main.options.expirationTime, 'number', "Expiration time must be a number");
    assert.typeOf(main.options.verificationURL, 'string', "URL for verification must be a number");
  });


  it("Tests sending email", function(done){
    main.sendVerificationEmail("fizzbuzz@foo.bar","foo");
  });
});
