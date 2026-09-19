const Form = require('../Models/form');
const User = require('../Models/user');
const jwt = require('jsonwebtoken');

const { validateQuestionSchema } = require("../utils")
const { computeMaxMarks } = require('../utils/scoring');
const { validateForm, invalidFormResponse } = require('../utils/formValidation');

// Fisher-Yates shuffle — used so the respondent doesn't see categorize items /
// cloze word-bank entries in an order that trivially reveals the answer.
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function requestedRouteClient(req, form) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) return false
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return false;
    if (user._id.toString() != form.userId.toString()) return false;
    return true;
  } catch (err) {
    console.log("err", err)
    return false;
  }

}

const processFormResponse = (form, isAuthor) => {
  // Compute marks before cloning/transforming, since categorize/cloze/comprehension
  // sub-part counts are read straight off the original mongoose shape.
  const { total: maxMarks, perQuestion: marksPerQuestion } = computeMaxMarks(form);

  // Clone the form object to avoid mutating the original data
  const processedForm = JSON.parse(JSON.stringify(form));
  processedForm.maxMarks = maxMarks;

  processedForm.questions = processedForm.questions.map((question, questionIndex) => {
    question.marks = marksPerQuestion[questionIndex];
    if (question.type === 'cloze' && !isAuthor) {
      // Remove specific fields from 'cloze' question type
      delete question.cloze.originalQuestion;
      question.cloze.blanks.forEach((blank) => {
        delete blank.itemSerialNumber;
        delete blank.start;
        delete blank.end;
      });
      // Shuffle the word bank so its order doesn't reveal each word's correct slot.
      question.cloze.blanks = shuffle(question.cloze.blanks);
    }

    if (question.type === 'comprehension' && !isAuthor) {
      // Remove 'answer' field from 'comprehension' question type
      question.comprehension.questions.forEach((q) => {
        delete q.answer;
      });
    }

    if (question.type === 'categorize') {
      // Transform categorize array into an object
      const categories = question.categorize.map((cat) => cat.categoryName);
      let items = question.categorize.flatMap((cat) =>  cat.items.map((item,itemIndex) => ({
        name: item,
        category: isAuthor?cat.categoryName:undefined,
      }))
    )
      // Shuffle so item order doesn't trivially reveal which category each belongs to.
      if (!isAuthor) items = shuffle(items);

      question.categorize = {
        categories,
        items,
      };
    }

    return question;
  });

  return processedForm;
};


// Create form
exports.createForm = async (req, res) => {
  const { title, description, questions } = req.body;
  const userId = req.user.id;
  try {

    // Validate each question's structure
    for (const question of questions) {
      validateQuestionSchema(question);
    }

    const newForm = new Form({ title, description, questions, userId });
    await newForm.save();
    res.status(201).json(newForm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update form
exports.updateForm = async (req, res) => {
  const { title, description, questions } = req.body;

  try {

    // Validate each question's structure
    for (const question of questions) {
      validateQuestionSchema(question);
    }

    // A live form must never be saved into an invalid state.
    const existing = await Form.findOne({ _id: req.params.formId, userId: req.user.id }).select('isDeployed');
    if (existing?.isDeployed) {
      const issues = validateForm({ title, questions });
      if (issues.length) {
        return res.status(422).json(invalidFormResponse(issues, 'This form is live, so fix these before saving:'));
      }
    }

    const updatedForm = await Form.findOneAndUpdate(
      { _id: req.params.formId, userId: req.user.id },
      { title, description, questions },
      {
        new: true, // Return the updated document
        runValidators: true, // Run schema validations
      }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} does not found in your account` });
    }

    res.status(200).json(updatedForm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Deploy form
exports.deployForm = async (req, res) => {
  try {
    console.log(req.params.formId)
    console.log(req.user.id)

    const form = await Form.findOne({ _id: req.params.formId, userId: req.user.id });
    if (!form) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} does not found in your account` });
    }

    const issues = validateForm(form);
    if (issues.length) {
      return res.status(422).json(invalidFormResponse(issues, 'Fix these before deploying:'));
    }

    form.isDeployed = true;
    await form.save();
    res.status(200).json({ message: 'Form deployed successfully', form });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Report whether the owner's form is ready to go live, and what is wrong if not.
exports.validateFormForPublish = async (req, res) => {
  try {
    const form = await Form.findOne({ _id: req.params.formId, userId: req.user.id });
    if (!form) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} does not found in your account` });
    }
    const issues = validateForm(form);
    res.status(200).json({ valid: issues.length === 0, issues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Publish to / remove from the Community listing. Publishing auto-deploys the form.
exports.setFormVisibility = async (req, res) => {
  try {
    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: '`isPublic` must be true or false.' });
    }

    const form = await Form.findOne({ _id: req.params.formId, userId: req.user.id });
    if (!form) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} does not found in your account` });
    }

    if (isPublic) {
      const issues = validateForm(form);
      if (issues.length) {
        return res.status(422).json(invalidFormResponse(issues, 'Fix these before publishing:'));
      }
      if (!form.isPublic) form.publishedAt = new Date();
      form.isDeployed = true;
    }
    form.isPublic = isPublic;
    await form.save();

    res.status(200).json({ message: isPublic ? 'Published to community' : 'Removed from community', form });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get formAuthorId
exports.getFormAuthorId = async (req, res) => {
  try {
    let form = await Form.findById(req.params.formId);
    if (!form) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} not found in your account` });
    }
    const formAuthorId = form.userId
    res.status(200).json(formAuthorId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// Get form
exports.getForm = async (req, res) => {
  try {
    let form = await Form.findById(req.params.formId);
    if (!form) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} not found in your account` });
    }
    const isAuthor = await requestedRouteClient(req, form);
    // Drafts are only visible to their author.
    if (!isAuthor && !form.isDeployed) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} not found` });
    }
    const processedForm = processFormResponse(form, isAuthor);
    res.status(200).json(processedForm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Get all Forms
exports.getForms = async (req, res) => {
  try {
    const forms = await Form.find({ userId: req.user.id });
    const formsWithMarks = forms.map((form) => {
      const formObj = form.toObject();
      formObj.maxMarks = computeMaxMarks(form).total;
      return formObj;
    });
    res.status(200).json({ count: forms.length, forms: formsWithMarks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete form
exports.deleteForm = async (req, res) => {
  try {

    const deletedForm = await Form.findOneAndDelete({ _id: req.params.formId, userId: req.user.id });

    if (!deletedForm) {
      return res.status(404).json({ message: `Form with ID ${req.params.formId} not found in your account` });
    }

    res.status(200).json({ message: 'Form deleted successfully', deletedForm });
  } catch (err) {
    console.error('Error deleting form:', err);
    res.status(500).json({ error: err.message });
  }
};

