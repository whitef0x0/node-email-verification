# node email verification
verify user signup with node and mongodb

the way this works (when this actually works) is as follows:
- temporary user is created with a randomly generated URL assigned to it and then saved to a mongoDB collection
- email is sent to the email address the user signed up with
- when the URL is accessed, the user's data is inserted into the real database

### status
currently, temporary users are created (with a random URL) and saved.