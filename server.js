require('dotenv').config();
if(process.env.DEV=="local"){
  process.env.CONN_STR=process.env.LOCAL_CONN_STR;
  process.env.FRONTEND_URL=process.env.FRONTEND_URL_LOCAL;
  process.env.BACKEND_URL=process.env.BACKEND_URL_LOCAL;
}


const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const routes = require('./routes/routes');
const airoutes = require('./routes/aiRoutes');

const { authRoutes } = require('./routes/authRoutes'); // New route for Google Auth
const { selectAccountRoutes } = require('./routes/selectAccountRoutes');
const Submission = require('./Models/submission');

mongoose.connect(process.env.CONN_STR, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));


const app = express();
// app.set('trust proxy', 1);
// app.set('trust proxy',true)

app.use(morgan("dev"));


// CORS setup
app.use(cors({
  origin: [process.env.FRONTEND_URL],
  methods: ["GET", "PUT", "DELETE", "POST", "PATCH"],
  credentials: true,
}));


// app.use(async (req, res, next) => {
//   try {
//     const response = await axios.get('https://api.ipify.org?format=json');
//     let publicIp = response.data.ip;
//     req.publicIp=publicIp;
//     console.log("publicIp",publicIp)
//     console.log("req.publicIp",req.publicIp)

//   } catch (error) {
//     console.error('Error fetching public IP:', error.message);
//   }

//   next();
// });

app.use(express.json());//in order to attach application/json data coming from client into the request'body
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));  //in order to attach application/x-www-form-urlencoded data coming from client into the request'body (This middleware is added just for burpsuite testing)

// app.use(passport.initialize());


// Use routes
app.use('/api/formSubmissionUserEmail', async(req, res, next) => {
  const token = req.cookies.formToken || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded) {
        return res.status(200).json({ formSubmissionUserEmail:decoded.email });
      }
    } catch (err) {
      return res.status(201).json({ message: 'Invalid or expired token.' });
    }
  }
  else { 
    return res.status(202).json({ message: 'Invalid or expired token.' });
  }

})
app.use('/api/checkDuplicateFormSubmissionEmail/:formId/:formSubmissionUserEmail',async(req, res, next) => {
  const { formId, formSubmissionUserEmail } = req.params;

  // Validate required fields
  if (!formId || !formSubmissionUserEmail ) {
    return res.status(400).json({ error: 'missing data.' });
  }

  const isExistingUserEmailWithThisForm=await Submission.findOne({ userId: formSubmissionUserEmail , formId:formId })
  if(isExistingUserEmailWithThisForm){
    return res.status(200).json({ isDuplicateRequest:true });
  }
  else{
    return res.status(200).json({ isDuplicateRequest:false });
  }
})
app.use('/api/auth', authRoutes);
app.use('/api/selectAccount', selectAccountRoutes);
app.use('/api/ai',airoutes)
app.use('/api', routes);

// Start server
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


