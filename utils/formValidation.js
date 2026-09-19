// Rules a form must satisfy before it can go live (deploy / publish to community).
// Works on the stored shape (mongoose doc or plain object): { title, questions: [...] }.
// Returns [{ question: <1-based number or null>, message }].

const norm = (s) => String(s ?? '').trim().toLowerCase();
const blankRuns = /_{3,}/g;

// Same word rules as the editor (frontend/src/utils.js): letters/numbers, plus an
// apostrophe or hyphen between two word characters (don't, well-known).
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;
const isWordChar = (ch) => ch !== undefined && ch !== '' && WORD_CHAR.test(ch);
const inWord = (text, i) => {
  const ch = text[i];
  if (ch === undefined) return false;
  if (isWordChar(ch)) return true;
  return (ch === "'" || ch === '’' || ch === '-') && isWordChar(text[i - 1]) && isWordChar(text[i + 1]);
};

function validateForm(form) {
  const issues = [];
  const add = (question, message) => issues.push({ question, message });

  if (!String(form.title ?? '').trim()) add(null, 'Add a title for the form.');

  const questions = form.questions || [];
  if (questions.length === 0) add(null, 'Add at least one question.');

  questions.forEach((q, i) => {
    const n = i + 1;

    if (q.type === 'categorize') {
      const categories = q.categorize || [];
      if (categories.length < 2) add(n, 'Needs at least 2 categories.');

      const categoryNames = new Set();
      const itemNames = new Set();
      categories.forEach((category) => {
        const name = String(category.categoryName ?? '').trim();
        if (!name) add(n, 'A category has no name.');
        else if (categoryNames.has(norm(name))) add(n, `Category "${name}" appears more than once.`);
        else categoryNames.add(norm(name));

        const items = category.items || [];
        if (items.length === 0) add(n, `Category "${name || '(unnamed)'}" has no items.`);
        items.forEach((item) => {
          const text = String(item ?? '').trim();
          if (!text) add(n, 'An item has no text.');
          else if (itemNames.has(norm(text))) add(n, `Item "${text}" appears more than once.`);
          else itemNames.add(norm(text));
        });
      });
    } else if (q.type === 'cloze') {
      const cloze = q.cloze || {};
      const sentence = String(cloze.originalQuestion ?? '');
      const blanks = cloze.blanks || [];

      if (!sentence.trim()) add(n, 'The sentence is empty.');
      if (blanks.length === 0) add(n, 'Select at least one word to turn into a blank.');

      const slots = String(cloze.displayQuestion ?? '').match(blankRuns) || [];
      if (blanks.length > 0 && slots.length !== blanks.length) {
        add(n, `The sentence shows ${slots.length} blank(s) but ${blanks.length} word(s) are selected. Re-select the blanks.`);
      }

      const words = new Set();
      let previousEnd = -1;
      [...blanks].sort((a, b) => a.start - b.start).forEach((blank) => {
        const word = String(blank.itemName ?? '').trim();
        if (!word) {
          add(n, 'A blank has no word.');
        } else {
          if (words.has(norm(word))) add(n, `The word "${word}" is used for more than one blank. Each blank must be a different word.`);
          else words.add(norm(word));
          if (sentence.slice(blank.start, blank.end).trim() !== word) {
            add(n, `Blank "${word}" doesn't match the sentence at its position. Re-select it.`);
          } else if (!inWord(sentence, blank.start) || !inWord(sentence, blank.end - 1) || String(blank.itemName) !== word) {
            add(n, `Blank "${blank.itemName}" includes punctuation or a space at its edge. Re-select just the word.`);
          } else if (inWord(sentence, blank.start - 1) || inWord(sentence, blank.end)) {
            add(n, `Blank "${word}" is part of a longer word in the sentence. Re-select the whole word.`);
          }
        }
        if (blank.start < previousEnd) add(n, `Blanks overlap near "${word}".`);
        previousEnd = blank.end;
      });
    } else if (q.type === 'comprehension') {
      const comprehension = q.comprehension || {};
      const description = comprehension.description || {};
      if (!String(description.title ?? '').trim()) add(n, 'The passage needs a title.');
      if (!String(description.content ?? '').trim()) add(n, 'The passage text is empty.');

      const subQuestions = comprehension.questions || [];
      if (subQuestions.length === 0) add(n, 'Add at least one question about the passage.');
      subQuestions.forEach((sub, j) => {
        const label = `Question ${n}.${j + 1}`;
        const options = (sub.options || []).map((o) => String(o ?? '').trim());
        if (!String(sub.question ?? '').trim()) add(n, `${label} has no question text.`);
        if (options.length < 2) add(n, `${label} needs at least 2 options.`);
        if (options.some((o) => !o)) add(n, `${label} has an empty option.`);
        if (new Set(options.map(norm)).size !== options.length) add(n, `${label} has duplicate options.`);
        if (!String(sub.answer ?? '').trim()) add(n, `${label} has no correct answer selected.`);
        else if (!(sub.options || []).includes(sub.answer)) add(n, `${label}: the correct answer isn't one of the options.`);
      });
    } else {
      add(n, `Unknown question type "${q.type}".`);
    }
  });

  return issues;
}

// Standard 422 body: a readable message plus the full list for the UI.
function invalidFormResponse(issues, prefix) {
  const preview = issues
    .slice(0, 3)
    .map((i) => (i.question ? `Q${i.question}: ${i.message}` : i.message))
    .join(' ');
  const more = issues.length > 3 ? ` (+${issues.length - 3} more)` : '';
  const message = `${prefix} ${preview}${more}`;
  return { message, error: message, issues };
}

module.exports = { validateForm, invalidFormResponse };
