const Submission = require('../Models/submission');
const Form = require('../Models/form');
const { scoreSubmission } = require('../utils/scoring');

// Submit form data
exports.submitForm = async (req, res) => {
  const { formId, userId, responses, deviceInfo } = req.body;

  // Validate required fields
  if (!formId || !responses || !userId || !Array.isArray(responses)) {
    return res.status(400).json({ error: 'missing data.' });
  }

  const isExistingUserEmailWithThisForm = await Submission.findOne({ userId: userId, formId: formId })
  if (isExistingUserEmailWithThisForm) {
    return res.status(401).json({ error: 'Form is already submitted with this given email.Change email' });
  }

  const form = await Form.findById(formId);
  if (!form) {
    return res.status(404).json({ error: 'Form not found.' });
  }
  if (!form.isDeployed) {
    return res.status(403).json({ error: 'This form is not accepting responses.' });
  }

  const { totalScore, maxScore, gradedResponses } = scoreSubmission(form, responses);

  try {
    let newSubmission = new Submission({
      formId: formId,
      userId: userId,
      responses: gradedResponses,
      score: totalScore,
      maxScore: maxScore,
      ipAddress: req.publicIp || req.connection.remoteAddress || null,
      deviceInfo
    });


    newSubmission = await newSubmission.save();
    form.submissionCount++;
    await form.save();

    return res.status(201).json({
      message: 'Form submission saved successfully!',
      submissionId: newSubmission._id,
      score: totalScore,
      maxScore,
    });


  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
};

