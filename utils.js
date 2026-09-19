exports.validateQuestionSchema = function(question) {
    const { type, categorize, cloze, comprehension } = question;
  
    if (!type) throw new Error('Question type is required.');
  
    // Use lowercase types for comparison
    if (type === 'categorize') validateCategorizeQuestion(categorize);
    else if (type === 'cloze') validateClozeQuestion(cloze);
    else if (type === 'comprehension') validateComprehensionQuestion(comprehension);
    else throw new Error(`Invalid question type: ${type}.`);
  };
  
  function validateCategorizeQuestion(categorize) {
    if (!categorize || categorize.length === 0) {
      throw new Error('Categorize questions must have categories with items.');
    }
  
    const categoryNameSet = new Set();
    const itemNameSet = new Set();
  
    categorize.forEach(category => {
      if (!category.categoryName) {
        throw new Error('Each category in Categorize questions must have a categoryName.');
      }
      if (categoryNameSet.has(category.categoryName)) {
        throw new Error(`Duplicate categoryName: "${category.categoryName}" is not allowed.`);
      }
      categoryNameSet.add(category.categoryName);
  
      if (!category.items || category.items.length === 0) {
        throw new Error(`Category "${category.categoryName}" must have at least one item.`);
      }
  
      category.items.forEach(item => {
        if (itemNameSet.has(item)) {
          throw new Error(`Duplicate itemName: "${item}" is not allowed.`);
        }
        itemNameSet.add(item);
      });
    });
  }
  
  function validateClozeQuestion(cloze) {
    if (!cloze || !cloze.displayQuestion || !cloze.originalQuestion) {
      throw new Error('Cloze questions must have a question.');
    }
    if (!cloze.blanks || cloze.blanks.length === 0) {
      throw new Error('Cloze questions must have answers.');
    }
    cloze.blanks.forEach(blank => {
      if (blank.itemSerialNumber === undefined || !blank.itemName || blank.start==undefined || blank.end==undefined) {
        throw new Error('Each answer in Cloze questions must have itemSerialNumber and itemName.');
      }
    });
  }
  
  function validateComprehensionQuestion(comprehension) {
    if (!comprehension || !comprehension.description || !comprehension.description.title || !comprehension.description.content) {
      throw new Error('Comprehension questions must have a title and content in their description.');
    }
    if (!comprehension.questions || comprehension.questions.length === 0) {
      throw new Error('Comprehension questions must have a list of questions.');
    }
    comprehension.questions.forEach(q => {
      if (!q.question || !q.answer || !q.options || q.options.length === 0) {
        throw new Error('Each question in Comprehension must have a question, answer, and options.');
      }
    });
  }
  