  const mongoose = require("mongoose");

  const contactSchema = mongoose.Schema({
    name: String,
    email: String,
    message: String
  })

  module.exports = mongoose.model('contact', contactSchema);