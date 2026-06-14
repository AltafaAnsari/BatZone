  const mongoose = require("mongoose");

  const userSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
     cart: [
      {
    type: mongoose.Schema.Types.ObjectId,
    ref: "card",
  }
],
  })

  module.exports = mongoose.model('user', userSchema);