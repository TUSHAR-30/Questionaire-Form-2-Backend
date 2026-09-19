// Marks are automatic: 1 mark per sub-part (categorize item / cloze blank / comprehension sub-question).

function computeMaxMarks(form) {
  const perQuestion = form.questions.map((q) => {
    if (q.type === 'categorize') {
      return q.categorize.reduce((sum, cat) => sum + cat.items.length, 0);
    }
    if (q.type === 'cloze') {
      return q.cloze.blanks.length;
    }
    if (q.type === 'comprehension') {
      return q.comprehension.questions.length;
    }
    return 0;
  });

  const total = perQuestion.reduce((sum, marks) => sum + marks, 0);
  return { total, perQuestion };
}

// Grades each response against its form question, annotating each sub-part with the
// correct answer and an isCorrect flag, and tallies the score.
function scoreSubmission(form, responses) {
  let totalScore = 0;
  let maxScore = 0;

  const gradedResponses = responses.map((response, index) => {
    const formQuestion = form.questions[index];
    if (!formQuestion) return response;

    let questionScore = 0;
    let questionMax = 0;

    if (response.type === 'categorize') {
      response.categorize.items.forEach((item) => {
        questionMax++;
        const correctCategory = formQuestion.categorize.find((cat) => cat.items.includes(item.name));
        item.correctCategory = correctCategory ? correctCategory.categoryName : null;
        const droppedCategoryName = item.droppedAt != null ? response.categorize.categories[item.droppedAt] : null;
        item.isCorrect = !!correctCategory && droppedCategoryName === item.correctCategory;
        if (item.isCorrect) questionScore++;
      });
    } else if (response.type === 'cloze') {
      // Slot number = reading-order position in the sentence (what the respondent's UI uses),
      // not the stored itemSerialNumber, which AI-generated questions may number inconsistently.
      const slotOrder = [...formQuestion.cloze.blanks].sort((a, b) => a.start - b.start);
      response.cloze.blanks.forEach((blank) => {
        questionMax++;
        const slotIndex = slotOrder.findIndex((b) => b.itemName === blank.text);
        const correctBlank = slotIndex === -1 ? null : slotOrder[slotIndex];
        blank.correctId = correctBlank ? slotIndex : null;
        blank.isCorrect = correctBlank != null && blank.droppedAt === blank.correctId;
        if (blank.isCorrect) questionScore++;
      });
    } else if (response.type === 'comprehension') {
      response.comprehension.questions.forEach((question, qIndex) => {
        questionMax++;
        const formComprehensionQuestion = formQuestion.comprehension.questions[qIndex];
        const answerIndex = formComprehensionQuestion
          ? formComprehensionQuestion.options.findIndex((option) => option === formComprehensionQuestion.answer)
          : -1;
        question.correctAnswer = answerIndex;
        question.isCorrect = question.selectedOption === answerIndex;
        if (question.isCorrect) questionScore++;
      });
    }

    totalScore += questionScore;
    maxScore += questionMax;
    return response;
  });

  return { totalScore, maxScore, gradedResponses };
}

module.exports = { computeMaxMarks, scoreSubmission };
