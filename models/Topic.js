const mongoose = require('mongoose');
const { Schema } = mongoose;

const TopicSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Assuming you have a 'user' model
  },
  topic: {
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Topic', TopicSchema);
