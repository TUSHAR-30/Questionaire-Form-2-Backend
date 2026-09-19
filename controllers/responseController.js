const Form = require('../Models/form');
const Submission = require('../Models/submission');
const { computeMaxMarks } = require('../utils/scoring');

exports.getClientResponse = async (req, res) => {
  try {
    // Fetch the submission object
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(400).json("Submission Not found");
    }

    // Fetch the associated form
    const form = await Form.findById(submission.formId);
    if (!form) {
      return res.status(400).json("Form Not found");
    }

    return res.status(200).json({ submission, form });
  } catch (error) {
    console.error('Error enriching submission:', error.message);
    throw error;
  }
}

// Get form submissions
exports.getFormResponses = async (req, res) => {
  try {
    // Fetch submissions for the form
    const submissions = await Submission.find({ formId: req.params.formId });
    const data = submissions.map((submission) => {
      let { userId, _id: submissionId, createdAt, score, maxScore } = submission;

      createdAt = new Date(createdAt);
      const year = createdAt.getFullYear(); // 2025
      const month = (createdAt.getMonth() + 1).toString().padStart(2, '0'); // 01 (add 1 because getMonth() returns 0-based index)
      const date = createdAt.getDate().toString().padStart(2, '0'); // 25

      createdAt=`${date}-${month}-${year}` ;

      return {
        userId,
        submissionId,
        createdAt,
        score,
        maxScore,
      }
    })

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get the forms the logged-in user has filled (submissions are keyed by respondent email)
exports.getMySubmissions = async (req, res) => {
  try {
    const email = req.user.email;
    const submissions = await Submission.find({
      userId: { $in: [email, email.toLowerCase()] },
    }).sort({ createdAt: -1 });

    const forms = await Form.find({ _id: { $in: submissions.map((s) => s.formId) } }).select('title');
    const titleById = new Map(forms.map((f) => [f._id.toString(), f.title]));

    const data = submissions.map((s) => ({
      submissionId: s._id,
      formId: s.formId,
      formTitle: titleById.get(s.formId) || null,
      score: s.score,
      maxScore: s.maxScore,
      createdAt: s.createdAt,
    }));

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get aggregate analysis for a form (average score, per-question accuracy)
exports.getFormAnalysis = async (req, res) => {
  try {
    const form = await Form.findOne({ _id: req.params.formId, userId: req.user.id });
    if (!form) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} does not found in your account` });
    }

    const submissions = await Submission.find({ formId: req.params.formId });

    const totalSubmissions = submissions.length;
    const maxScore = computeMaxMarks(form).total;
    const averageScore = totalSubmissions
      ? submissions.reduce((sum, s) => sum + (s.score || 0), 0) / totalSubmissions
      : 0;

    const perQuestionStats = form.questions.map((q, index) => {
      let correctCount = 0;
      let totalAttempts = 0;

      submissions.forEach((sub) => {
        const response = sub.responses[index];
        if (!response) return;

        if (response.type === 'categorize') {
          response.categorize.items.forEach((item) => {
            totalAttempts++;
            if (item.isCorrect) correctCount++;
          });
        } else if (response.type === 'cloze') {
          response.cloze.blanks.forEach((blank) => {
            totalAttempts++;
            if (blank.isCorrect) correctCount++;
          });
        } else if (response.type === 'comprehension') {
          response.comprehension.questions.forEach((sq) => {
            totalAttempts++;
            if (sq.isCorrect) correctCount++;
          });
        }
      });

      return {
        index,
        type: q.type,
        correctCount,
        totalAttempts,
        accuracyPct: totalAttempts ? Math.round((correctCount / totalAttempts) * 100) : 0,
      };
    });

    res.status(200).json({ totalSubmissions, averageScore, maxScore, perQuestionStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
