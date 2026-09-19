const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  questions: [
    {
      type: { type: String, required: true, enum: ['categorize', 'cloze', 'comprehension'] }, 
      imageUrl: String, // Optional field

      categorize: [
        {
          categoryName: { type: String, required: function () { return this.type === 'categorize'; } },
          items: { type: [String], required: function () { return this.type === 'categorize'; } },
        },
      ],
      cloze: {
        displayQuestion: { type: String, required: function () { return this.type === 'cloze'; } },
        originalQuestion: { type: String, required: function () { return this.type === 'cloze'; } },
        blanks: {
          type: [
            {
              itemSerialNumber: { type: Number, required: true },
              itemName: { type: String, required: true },
              start:{ type: Number, required: true },
              end:{ type: Number, required: true },
            },
          ],
          required: function () { return this.type === 'cloze'; },
        },
      },
      comprehension: {
        description: {
          title: { type: String, required: function () { return this.type === 'comprehension'; } },
          content: { type: String, required: function () { return this.type === 'comprehension'; } },
        },
        questions: {
          type: [
            {
              question: { type: String, required: true },
              answer: { type: String, required: true },
              options: { type: [String], required: true },
            },
          ],
          required: function () { return this.type === 'comprehension'; },
        },
      },
    },
  ],
  isDeployed: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false }, // listed on the Community page (requires isDeployed)
  publishedAt: Date,
  submissionCount:{type:Number,default:0},
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

formSchema.index({ isPublic: 1, isDeployed: 1, publishedAt: -1 });

module.exports = mongoose.model('Form', formSchema);
