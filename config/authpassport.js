const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../Models/user'); // Ensure this path is correct for your User model

passport.use('google-auth',new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        profile: {
          name: profile.displayName,
        },
        loginMethods: ["google"],
      });
      await user.save();
    }else {
      // If user exists, update loginMethods if Google isn't already added
      if (!user.loginMethods.includes("google")) {
        user.loginMethods.push("google"); // Add "google" method if not already present
        await user.save();
      }
    }

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

