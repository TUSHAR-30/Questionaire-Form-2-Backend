const Form = require('../Models/form');
const User = require('../Models/user');
const Submission = require('../Models/submission');
const { computeMaxMarks } = require('../utils/scoring');
const { getRequesterEmails } = require('../utils/identity');

const QUESTION_TYPES = ['categorize', 'cloze', 'comprehension'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Public listing of forms published to the community. Returns a whitelist of metadata only:
// never question content or answers.
exports.listCommunityForms = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 24);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const type = QUESTION_TYPES.includes(req.query.type) ? req.query.type : null;
    const sort = req.query.sort === 'popular' ? 'popular' : 'newest';
    const notFilled = req.query.notFilled === 'true';

    const emails = await getRequesterEmails(req);
    const viewerKnown = emails.length > 0;

    const filter = { isDeployed: true, isPublic: true };
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }
    if (type) filter['questions.type'] = type;
    if (notFilled && viewerKnown) {
      const filledFormIds = await Submission.distinct('formId', { userId: { $in: emails } });
      if (filledFormIds.length) filter._id = { $nin: filledFormIds };
    }

    const sortSpec = sort === 'popular'
      ? { submissionCount: -1, publishedAt: -1 }
      : { publishedAt: -1 };

    const [total, forms] = await Promise.all([
      Form.countDocuments(filter),
      Form.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit),
    ]);

    const [authors, attempts] = await Promise.all([
      User.find({ _id: { $in: forms.map((f) => f.userId) } }).select('profile.name'),
      viewerKnown && forms.length
        ? Submission.find({
            userId: { $in: emails },
            formId: { $in: forms.map((f) => f._id.toString()) },
          }).select('formId score maxScore')
        : [],
    ]);

    const authorName = new Map(authors.map((u) => [u._id.toString(), u.profile?.name || 'Anonymous']));
    const attemptByForm = new Map(attempts.map((s) => [s.formId, s]));

    const data = forms.map((form) => {
      const questionTypes = { categorize: 0, cloze: 0, comprehension: 0 };
      form.questions.forEach((question) => { questionTypes[question.type]++; });
      const attempt = attemptByForm.get(form._id.toString());
      return {
        _id: form._id,
        title: form.title,
        description: form.description || '',
        authorName: authorName.get(form.userId.toString()) || 'Anonymous',
        questionCount: form.questions.length,
        questionTypes,
        maxMarks: computeMaxMarks(form).total,
        submissionCount: form.submissionCount || 0,
        publishedAt: form.publishedAt || form.createdAt,
        myAttempt: attempt
          ? { submissionId: attempt._id, score: attempt.score, maxScore: attempt.maxScore }
          : null,
      };
    });

    res.status(200).json({
      forms: data,
      page,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      viewerKnown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load community forms' });
  }
};
