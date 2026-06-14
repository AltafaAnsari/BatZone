const express = require("express");
const app = express();
const path = require('path');
const fs = require("fs");
const multer = require('multer');
const cardModel = require('./models/card');
const userModel = require('./models/user');
const contactModel = require('./models/contact');
const bcrypt = require('bcrypt');
const jwt =  require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const session = require('express-session');

require("dotenv").config();


app.use(cookieParser());
app.use(
  session({
    resave: false,   // resave is false means that the session will not be saved again if it is not modified
    saveUninitialized: false,  // do not create session for the logged in user
    secret: process.env.EXPRESS_SESSION_SECRET,
  })
);
app.use(flash());

app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

// multer configuration---------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });


app.get('/admin', async function(req, res) {
  

  const cards = await cardModel.find();
  res.render('admin', { cards });
})



app.get('/register',  function(req, res) {
  res.render('register');
})

app.post('/register', async function(req, res) {
  let{username, email, password} = req.body;


  bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
     
          let createdUser = await userModel.create({
    username,
    email,
    password: hash
  });
          // set the token here
        let token = jwt.sign({email, userid: createdUser._id}, "shhhh");
        res.cookie("token", token);
        //res.send("Registered");
        //res.send(createdUser);
   res.redirect("/login");
   
      })
  })
  
})

app.get('/', async function(req, res) {
   //const cards = JSON.parse(fs.readFileSync("./data/cards.json"));
   const cards = await cardModel.find();
   res.cookie("token", "");
  res.render('index', { cards });
})

app.post("/add-card", upload.single("image"), async (req, res) => {
  const { title, desc,  price,
  discount } = req.body;

  const imagePath = "/images/" + req.file.filename;

  let card = await cardModel.create({
    image: imagePath,
    title,
    desc,
    price,
  discount
  });

  res.redirect("/admin");
});

app.get('/login', function(req, res) {
  
   res.render('login', { error:[]});
   
})

app.post('/login', async function(req, res) {

  let {email, password} = req.body;
  let user = await userModel.findOne({email: req.body.email});

  if(!user) return res.send("Something went wrong");


    bcrypt.compare(password, user.password, function (err, result) {
    if(result){
      req.flash('error');
      let token = jwt.sign({email, userid: user._id}, process.env.JWT_SECRET);
        res.cookie("token", token);
        res.status(200).redirect("/afterlogin");
    } 
    else res.redirect('/login');
  });

});

app.get('/profile', async function(req, res) {
  
    let decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);  
    let user = await userModel.findOne({ email: decoded.email });
   
  if(!req.cookies.token) {
    return res.send("You must be logged in to access profile.");
  }
  res.render('profile', { user});
})

app.get('/home', async (req, res) => {
  let token = req.cookies.token;
    if(!token) {
   
    return res.redirect('/login');
  }

    let decoded = jwt.verify(token, process.env.JWT_SECRET);  
  let user = await userModel.findOne({ email: decoded.email });
 return res.render('home', { user });
});

app.get('/about', (req, res) => res.render('about'));

app.get('/services', async (req, res) => {
   if(!req.cookies.token) {
   
    return res.redirect('/login');
  }

 let items = await cardModel.find();

  res.render('services', { items });
});

app.get('/contact', (req, res) => res.render('contact'));

app.post('/contact', async (req, res) => {
let {name, email, message} = req.body;

let user = await contactModel.findOne({ email });

if(!user) {
  return res.send("You need to be login to contact us.");
}

let createdContact = await contactModel.create({
  name,
  email,
  message 
});

res.send(createdContact);

});

app.get('/logout', async function(req, res) {
res.clearCookie("token");
res.redirect('/');
});

app.get('/afterlogin', async function(req, res) {
const cards = await cardModel.find();
res.render('afterlogin', { cards });
});

app.get('/description/:cardid',async (req, res) => {
  
   if(!req.cookies.token) {
    return res.redirect('/login');
  }

  let product = await cardModel.findOne({ _id: req.params.cardid });
  //res.render('services');
  return res.render('card', { product });
});



app.get('/cart/add/:cardid',async (req, res) => {
  let decode = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

 let user = await userModel.findOne({email: decode.email});

 user.cart.push(req.params.cardid);
 await user.save();
 req.flash("success", "Card added to cart successfully");
 res.redirect("/cart");
});


app.get('/remove/:cardid',async (req, res) => {
  let decode = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

 let user = await userModel.findOne({email: decode.email});

 user.cart.pull(req.params.cardid);
 await user.save();
 req.flash("success", "Card removed from cart successfully");
 res.redirect("/cart");
});



app.get('/cart', async function(req, res) {
 let decode = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
let user = await userModel.findOne({email: decode.email}).populate('cart');

let total = 0;
user.cart.forEach((item) => {
  total += (item.price + 20 - item.discount);
});

res.render('cart', { cartItems: user.cart, total });
});


app.get('/buy-all', async function(req, res) {
  let decode = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
let user = await userModel.findOne({email: decode.email}).populate('cart');

let total = 0;
user.cart.forEach((item) => {
  total += (item.price + 20 - item.discount);
});

  res.render('payment', { total });
});


app.get('/buy/:cardid', async function(req, res) {
 let card = await cardModel.findOne({_id: req.params.cardid});
const total = card.price + 20 - card.discount;

  res.render('payment', { total });
});


app.get('/pay/upi', async function(req, res) {
  let decode = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
let user = await userModel.findOne({email: decode.email}).populate('cart');

let total = 0;
user.cart.forEach((item) => {
  total += (item.price + 20 - item.discount);
});
res.render('upi', { total });
});




app.listen(3001);

