const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  formId: { type: String },
  userId: { type: String },
  ipAddress:{ type: String },
  deviceInfo: {
    userAgent: { type: String }, // Browser's User-Agent string
    platform: { type: String }, // OS platform (e.g., "Win32", "MacIntel")
    language: { type: String }, // User's preferred language
    screenResolution: { type: String }, // Screen resolution (e.g., "1920x1080")
  },
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  responses: [
    {
      type: { type: String, required: true, enum: ['categorize', 'cloze', 'comprehension'] },
      imageUrl: String, // Optional field, if present

      categorize: {
        categories: [String], // List of categories
        items: [
          {
            name: { type: String, required: true },
            droppedAt: { type: Number, default: null }, // Index of the category the item was dropped in, or null if not dropped
            correctCategory:{type:String},
            isCorrect:{type:Boolean, default:false}
          },
        ],
      },

      cloze: {
        displayText: String, // Original question text with blanks
        blanks: [
          {
            id: { type: String, required: true }, // Unique blank identifier
            text: { type: String, required: true }, // Original text of the blank
            droppedAt: { type: Number, default: null }, // User's chosen position or null if not answered
            correctId:{type:Number},
            isCorrect:{type:Boolean, default:false}
          },
        ],
      },

      comprehension: {
        description: {
          title: String,
          content: String,
        },
        questions: [
          {
            question: { type: String, required: true },
            selectedOption: { type: Number, default: null }, // Index of the chosen option
            options: [
              {
                id: { type: String, required: true }, // Unique option identifier
                text: { type: String, required: true }, // Option text
              },
            ],
            correctAnswer:{type:Number},
            isCorrect:{type:Boolean, default:false}
          },
        ],
      },
    },
  ],
}, {
  timestamps: true,
}
);

submissionSchema.index({ userId: 1, formId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
