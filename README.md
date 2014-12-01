# node email verification
verify user signup with node and mongodb

the way this works (when this actually works) is as follows:
- temporary user is created with a randomly generated URL assigned to it and then saved to a mongoDB collection
- email is sent to the email address the user signed up with
- when the URL is accessed, the user's data is inserted into the real database

### status
- temporary users are created (with a random URL) and saved
- possible to predefine a temporary user schema (which must be identical to the persistent user schema) or generate one based off of a persistent user schema (this should only be done once)
- email is sent with the URL in it, which can be customized