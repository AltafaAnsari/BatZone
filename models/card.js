const mongoose = require('mongoose');

mongoose.connect(`mongodb://127.0.0.1:27017/testcard`);

const cardSchema = mongoose.Schema({
  image: String,
  title: String,
  desc: String,
  price: Number,
  discount: Number,
})

module.exports = mongoose.model('card', cardSchema);