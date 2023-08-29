const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Assuming you have a 'user' model
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic', // Reference to the 'Topic' model
  },
  message: {
    type: String,
    required: true,
  },
  msgtype: {
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

module.exports = mongoose.model('Message', MessageSchema);
