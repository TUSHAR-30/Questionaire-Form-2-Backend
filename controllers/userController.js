const { body, validationResult } = require('express-validator');
const User = require('../Models/user');
const jwt = require('jsonwebtoken');
const sendOtp = require('../utils/sendOtp'); // OTP utility function
// const {limiter} = require("../Classes/rateLimitStore");


// Regex Patterns
const regexPatterns = {
  name: /^(?=.*[a-zA-Z]).{1,}$/, // At least one alphabet, allows anything else.
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, // Basic email validation with a minimum of 2 characters after the last dot.
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/, // At least 8 characters, with at least one alphabet and one number.
};

// Registration validation middleware
const validateRegister = [
  // Email validation
  body('email')
    .matches(regexPatterns.email)
    .withMessage('Invalid email address'),

  // Password validation
  body('password')
    .matches(regexPatterns.password)
    .withMessage('Password must be at least 8 characters long and contain at least one letter and one number'),

  // Name validation
  body('profile.name')
    .matches(regexPatterns.name)
    .withMessage('Name must contain at least one alphabet and can contain any other characters')
    .notEmpty()
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string'),
];

exports.registerUser = [
  validateRegister,

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors
      });
    }

    const { email } = req.body;

    try {
      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (existingUser.loginMethods.includes("email")) {
          return res.status(409).json({ message: 'User already exists' });
        }
      }

      await sendOtp(email);  // The OTP function is called here in the backend
      res.status(201).json({ message: 'OTP sent to your email!' });

    } catch (err) {
      console.error('Error during registration:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
];



exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.LOGIN_EXPIRES });

    // if (limiter.resetKey) {
    //   await limiter.resetKey(req.publicIp);  // Reset the rate limit for the IP
    // } else {
    //   console.log(`No rate limit entry for IP: ${req.ip}`);
    // }

    // Send token as a cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      )
    });

    res.status(200).json({ message: 'Login successful', token, user });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.logoutUser = (req, res) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: true,
      // path: "/",
      sameSite: "None",
    })
    .header('Cache-Control', 'no-cache, no-store, must-revalidate')
    .header('Pragma', 'no-cache')
    .header('Expires', '0')
    .json({
      success: true,
      message: "User Logged Out!",
    });
};



exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fields allowed to be updated
    const { profile } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the profile fields if provided
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    // Save the updated user data
    const updatedUser = await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email, // Email remains unchanged
        profile: updatedUser.profile,
      },
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

