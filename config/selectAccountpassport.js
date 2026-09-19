const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

passport.use('google-select-account',new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/selectAccount/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = profile.emails[0].value;
    console.log("user",user);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

