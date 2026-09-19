const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const communityLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
const { listCommunityForms } = require('../controllers/communityController');
const {
    createForm,
    updateForm,
    deployForm,
    setFormVisibility,
    validateFormForPublish,
    getForm,
    deleteForm,
    getForms,
    getFormAuthorId,
} = require('../controllers/formController');
const {
    getUserProfile,
    updateUserProfile,
    registerUser,
    loginUser,
    logoutUser
} = require('../controllers/userController');
const { submitForm } = require('../controllers/submissionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { decodeToken } = require('../middlewares/tokenDecodeMiddleware');
const verifyOtp = require('../controllers/otpController');
const { getClientResponse,getFormResponses,getFormAnalysis,getMySubmissions } = require('../controllers/responseController');


// Form routes
router.post('/form', authenticate, createForm);
router.put('/form/:formId', authenticate, updateForm);
router.put('/form/deploy/:formId', authenticate, deployForm);
router.put('/form/:formId/visibility', authenticate, setFormVisibility);
router.get('/form/:formId/validate', authenticate, validateFormForPublish);
router.get('/community', communityLimiter, listCommunityForms);
router.get('/form/formAuthorId/:formId',getFormAuthorId)
router.get('/form/:formId', getForm);
router.delete('/form/:formId', authenticate, deleteForm);
router.get('/forms',authenticate, getForms)

// User routes
router.get('/profile', authenticate, getUserProfile);
router.put('/updateProfile', authenticate, updateUserProfile);
router.post('/register',authenticate, registerUser);
router.post('/login',authenticate, loginUser);
router.get('/logout', authenticate, logoutUser);

//Otp routes
router.post('/verify-otp',verifyOtp)

// Submission routes
router.post('/submitForm/:formId', submitForm);

// Responses routes
router.get('/clientResponse/:submissionId',getClientResponse);
router.get('/getFormResponses/:formId', authenticate, getFormResponses);
router.get('/formAnalysis/:formId', authenticate, getFormAnalysis);
router.get('/mySubmissions', authenticate, getMySubmissions);

module.exports = router;
