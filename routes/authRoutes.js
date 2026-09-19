const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
require('../config/authpassport'); // Passport configuration file
const authRoutes = express.Router();


// Google OAuth routes
authRoutes.get('/google',
  passport.authenticate('google-auth', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Forces Google to show account selection screen
  }));

authRoutes.get('/google/callback', 
  passport.authenticate('google-auth', {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false
  }),
  (req, res) => {

    console.log(req.user);
    // Successful authentication, generate JWT
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: process.env.LOGIN_EXPIRES });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Set to true in production
      sameSite: 'None',
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      )
    });

    // Redirect to the owner's forms dashboard
    res.redirect(`${process.env.FRONTEND_URL}/userForms`);
  }
);


module.exports = { authRoutes };







