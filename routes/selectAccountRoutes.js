const express = require('express');
const passport = require('passport');
require('../config/selectAccountpassport'); // Passport configuration file
const jwt = require('jsonwebtoken');
const selectAccountRoutes = express.Router();
let formId=null;

// Google OAuth routes
selectAccountRoutes.get('/google',
(req,res,next)=>{
  formId=req.query.formId;
  next()
},
  passport.authenticate('google-select-account', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Forces Google to show account selection screen
  }));

  selectAccountRoutes.get('/google/callback', 
  passport.authenticate('google-select-account', {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false
  }),
  (req, res) => {
    console.log("req.user",req.user);
     // Successful authentication, generate JWT
     const token = jwt.sign({ email: req.user }, process.env.JWT_SECRET, { expiresIn: process.env.LOGIN_EXPIRES });

     res.cookie('formToken', token, {
       httpOnly: true,
       secure: true, // Set to true in production
       sameSite: 'None',
       expires: new Date(
         Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
       )
     });

    // Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL}/form/${formId}`);
  }
);


module.exports = { selectAccountRoutes };







