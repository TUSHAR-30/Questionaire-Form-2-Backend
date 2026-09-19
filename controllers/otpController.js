const OTP = require('../Models/otp');
const User = require('../Models/user');
const jwt = require('jsonwebtoken');


const verifyOtp = async (req, res) => {
    const { email, password, profile, otp } = req.body;

    try {
        // Find OTP in the database
        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {
            return res.status(404).json({ message: "No OTP record found for this email" });
        }

        // Check if OTP matches and is not expired
        const isOtpValid = otpRecord.otp === otp && otpRecord.expiresAt > Date.now();

        if (!isOtpValid) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        await OTP.deleteOne({ email }); // Clean up OTP record

        // Check if the user already exists
        let user;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            existingUser.loginMethods.push("email");
            existingUser.password=password;
            await existingUser.save();
            user=existingUser;
        }
        else {
            // Create a new user 
            const newUser = await User.create({ email, password, profile,loginMethods:["email"] });
            user=newUser
        }


        //   Generate a JWT token for the new user
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.LOGIN_EXPIRES }
        );

        //   Send token as a cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            expires: new Date(
                Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
            ),
        });

        res.status(201).json({
            message: 'OTP verified.Registration successful',
            user,
            token,
        });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = verifyOtp;
