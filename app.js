var express                 = require('express'),
    app                     = express(),
    mongoose                = require('mongoose'),
    body                    = require('body-parser'),
    flash                   = require('connect-flash'),
    passport				= require('passport'),
	LocalStrategy			= require('passport-local'),
    passportLocalMongoose 	= require('passport-local-mongoose'),
    Item                    = require("./models/items.js"),
    User 					= require("./models/user.js");

mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb://localhost:27017/shopify",{ useNewUrlParser: true, useUnifiedTopology: true, });
app.use(flash());
// PASSPORT CONFIG
app.use(require('express-session')({
    secret: "This is a secret message",
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next)
{
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.currentUser = req.user;
    next();
 });
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(express.static(__dirname + "/public"));
app.use(body.urlencoded({extended : true}));
app.set("view engine","ejs");
// Root Route
app.get("/",isLoggedIn,(req, res)=>{
    if(req.user.role === "Customer")
    {
        res.redirect("/customer/"+req.user.username);
    }
    else if(req.user.role === "Seller")
    {
        res.redirect("/seller/"+req.user.username);
    }
});
// DashBoard Route - customer
app.get("/customer/:id",isLoggedIn,(req, res)=>{
    var customer = req.params.id;
    User.findOne({username:customer},(err,user)=>{
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("/login");
        }
        else
        {
            res.render("dashboard_customer",{user:user});
        }
    });
});
// Dashboard Route - seller
app.get("/seller/:id",isLoggedIn,(req,res)=>{
    var seller = req.params.id;
    Item.find({sellerName:seller},(err,items)=>{
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("/login");
        }
        else
        {
            res.render("dashboard_seller",{user:req.user,items:items});
        }
    });
    
});
// Add a new Item
app.get("/seller/:id/new",isLoggedIn,(req,res)=>{
    res.render("new",{username:req.user.username});
});
app.post("/seller/:id/new",isLoggedIn,(req,res)=>{
    Item.create(req.body.item,(err,items)=>{
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("/seller/"+req.params.id+"/new");
        }
        else
        {
            req.flash("success","Item Created");
            res.redirect("/seller/"+req.params.id);
        }
    });
});
// ================
// AUTH ROUTES
// ================
// show registration form
app.get("/register",function(req, res)
{
	res.render("register",{currentUser:req.user});
});
// handle sign up logic
app.post("/register",function(req,res)
{
    var newUser = new User({username: req.body.username, email:req.body.email,role:req.body.role});
    // var userInfo = {email:req.body.user.email,role:req.body.user.role};
    User.register(newUser,req.body.password,function(err, user)
    {
		if(err)
			{
				req.flash("error",err.message);
				return res.render("register",{currentUser:req.user});
            }
        else
        {
            passport.authenticate("local")(req, res, function()
            {
               req.flash("success","Registration completed");
               res.redirect("/login");
            });
        }
	});
});

// show login form
app.get("/login",function(req, res){
    res.render("login",{currentUser:req.user});
});
// handle login logic
app.post("/login",passport.authenticate("local",
{
failureRedirect: "/login",
failureFlash:"Incorrect Username or Password!",
successRedirect:"/",
}),function(req, res)
{
    req.flash("success","You are logged in as " + req.user.username);
});
// LOGOUT 
app.get("/logout",function(req, res)
{
    req.logout();
    req.flash("success","You are successfully logged out");
	res.redirect("/login");
});
// Logged in middleware
function isLoggedIn(req, res, next)
{
	if(req.isAuthenticated())
		{
			return next();
        }
    req.flash("error","Please Login First");
	res.redirect("/login");	
		
}
app.listen(3000,()=>{
    console.log("Server is running");
});