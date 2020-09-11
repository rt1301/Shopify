var express                 = require('express'),
    app                     = express(),
    mongoose                = require('mongoose'),
    body                    = require('body-parser'),
    flash                   = require('connect-flash'),
    methodOverride          = require('method-override'),
    passport				= require('passport'),
    LocalStrategy			= require('passport-local'),
    passportLocalMongoose 	= require('passport-local-mongoose'),
    Item                    = require("./models/items.js"),
    Payment                 = require("./models/payment.js"),
    User 					= require("./models/user.js");
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect("mongodb://localhost:27017/shopify",{ useNewUrlParser: true, useUnifiedTopology: true,useFindAndModify:false });
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
    Item.find({},(err,foundItems)=>{
        if(err)
        {
            console.log(err);
        }
        else
        {
            res.locals.searchItems = foundItems;
        }
    });
    next();
 });
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(methodOverride("_method"));
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
    Item.find({},(err,items)=>{
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("/login");
        }
        else
        {
            res.render("dashboard_customer",{user:req.user,items:items});
        }
    })
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

// Edit Route
app.get("/seller/:username/:id/edit",isLoggedIn,(req,res)=>{
    var id = req.params.id;
    Item.findById(id,(err,item)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            res.render("edit",{username:req.user.username,item:item});
        }
    });
});
app.put("/seller/:username/:id",isLoggedIn,(req,res)=>{
    var id = req.params.id;
    var data = req.body.item;
    Item.findByIdAndUpdate(id,data,(err, updatedItem)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            res.redirect("/seller/"+req.params.username);
        }
    });
});
// Arrived Orders route
var arrivedOrders = [];

app.get("/seller/:username/orders",isLoggedIn,(req, res)=>{
    User.find({role:'Customer'},(err,foundUsers)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            for(var i=0;i<foundUsers.length;i++)
            {
                for(var j=0;j<foundUsers[i].history.length;j++)
                {
                    if(foundUsers[i].history[j].seller === req.user.username)
                    {
                        arrivedOrders.push(foundUsers[i].history[j]);
                    }
                }
            }
        }
    });
    User.findOne({username:req.params.username},(err,seller)=>{
        if(err)
        {
            console.log(err);
        }
        else
        {
            var price = [];
            var date = [];
            for(var i=0;i<arrivedOrders.length;i++)
            {
                seller.history[i] = arrivedOrders[i];
                price[i] = arrivedOrders[i].price;
                date[i] = arrivedOrders[i].date.toString();
                date[i] = date[i].substring(0,10).substring(4,7);
            }
            seller.markModified('history');
            seller.save();
            res.render("arrived_orders",{items:seller.history,price:price,date:date});
            arrivedOrders = [];
        }
    });
});
function compare(a, b) 
{
    // Use toUpperCase() to ignore character casing
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();
  
    let comparison = 0;
    if (nameA > nameB) {
      comparison = 1;
    } else if (nameA < nameB) {
      comparison = -1;
    }
    return comparison;
}
// Products route
app.get("/customer/:username/products/:type",isLoggedIn,(req, res)=>{
    var type = req.params.type;
    Item.find({category:type},(err,items)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            var sortedItems = items.sort(compare);
            res.render("product_list",{user:req.user,items:sortedItems,type:type});
        }
    });
});
app.post("/customer/:username/products/:type/:id",isLoggedIn,(req, res)=>{
    var type = req.params.type;
    var id   = req.params.id;
    var quantity = req.body.quantity;
    Item.findById(id,(err,foundItem)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            var prevQuantity = foundItem.quantity;
            var newQuantity = Number(prevQuantity) - Number(quantity);
            foundItem.quantity = newQuantity.toString();
            foundItem.save(function(err, updatedItem){
                if(err)
                {
                    req.flash("error",err.message);
                    res.redirect("back");
                }
                else
                {
                    User.find({username:req.params.username},(err,foundUser)=>{
                        if(err)
                        {
                            req.flash("error",err.message);
                            res.redirect("back");
                        }
                        else
                        {
                            var data = {
                                item: updatedItem.name,
                                quantity: quantity,
                                price: (Number(updatedItem.price)*Number(quantity)).toString(),
                                date: new Date,
                                id: updatedItem._id,
                                seller: updatedItem.sellerName,
                                image: updatedItem.image,
                                customer: foundUser[0].username,
                                customerEmail: foundUser[0].email
                            }
                            foundUser[0].productsInCart.push(data);
                            foundUser[0].save((err,updatedUser)=>{
                                if(err)
                                {
                                    req.flash("error",err.message);
                                    res.redirect("back");
                                }
                                else
                                {
                                    console.log(updatedUser);
                                    req.flash("success","Product Added in Cart");
                                }
                            });
                        }
                    });
                }
            });
            res.redirect("/customer/"+req.user.username+"/products/"+type);
        }
    });
});
// Past Orders Route
app.get("/customer/:username/pastOrders",isLoggedIn,(req, res)=>{
    User.findOne({username:req.params.username},(err, foundUser)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect('back');
        }
        else
        {
            res.render("past_order",{items:foundUser.history});
        }
    })
    
})
// Function to check duplicate values in array
const findDuplicates = (arr) => 
{
    let sorted_arr = arr.slice().sort();
    let results = [];
    for (let i = 0; i < sorted_arr.length - 1; i++) {
      if (sorted_arr[i + 1] == sorted_arr[i]) {
        results.push(sorted_arr[i]);
      }
    }
    return results;
}
var initialQuantity = 0;
// Cart Route
app.get("/customer/:username/cart",isLoggedIn,(req,res)=>{
    var products = req.user.productsInCart;
    var itemNames = [];
    var itemQuantities =0;
    var itemPrices = 0;
    var itemImage;
    var itemSeller;
    var itemId;
    var repObj = [];
    var obj = [];
    for(var i=0;i<products.length;i++)
    {
        itemNames.push(products[i].item);
    }
    var repeatedItems = findDuplicates(itemNames);
    for(var i=0;i<repeatedItems.length;i++)
    {
        for(var j=0;j<products.length;j++)
        {
            if(products[j].item === repeatedItems[i])
            {
                itemQuantities+= Number(products[j].quantity);
                itemPrices+= Number(products[j].price);
                itemImage = products[j].image;
                itemSeller = products[j].seller;
                itemId = products[j].id;
            }
            if(products[j].item !== repeatedItems[i])
            {
                obj.push(products[j]);
            }

        }
        repObj.push({
            item: repeatedItems[i],
            quantity: itemQuantities.toString(),
            price: itemPrices.toString(),
            date: new Date,
            image:  itemImage,
            seller: itemSeller,
            customer: req.user.username,
            customerEmail:req.user.email,
            id: itemId
        });
    }
    User.find({username:req.user.username},(err, foundUser)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            if(repObj.concat(obj).length!==0)
            {
                foundUser[0].productsInCart = repObj.concat(obj);
                foundUser[0].save();
            }
            
        }
    });
    if(repObj.concat(obj).length!==0)
    {
        res.render("cart",{items:repObj.concat(obj)});
    }
    else
    {
        // console.log(products);
        res.render("cart",{items:products});
    }
});
// Edit Cart Items route
app.get("/customer/:username/cart/:itemName/edit",isLoggedIn,(req, res)=>{
var productName = req.params.itemName;
User.findOne({username:req.user.username},(err,foundUser)=>{
    if(err)
    {
        req.flash("error",err.message);
        res.redirect("back");
    }
    else
    {
        Item.findOne({name:productName},(err,foundItem)=>{
            for(var i=0;i<foundUser.productsInCart.length;i++)
        {
            if(foundUser.productsInCart[i].item === productName)
            {
                var products = foundUser.productsInCart[i];
            }
        }
        initialQuantity = products.quantity;
        res.render("edit_cart",{products:products,maxQuantity:foundItem.quantity});
        })
    }
});
});
app.put("/customer/:username/cart/:item",isLoggedIn,(req,res)=>{
    var updatedQuantity = Number(initialQuantity) - Number(req.body.quantity);
    User.find({username:req.user.username},(err,foundUser)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            Item.findOne({name:req.params.item},(err,item)=>{
                if(err)
                {
                    req.flash("error",err.message);
                    res.redirect("back");
                }
                else
                {
                    for(var i=0;i<foundUser[0].productsInCart.length;i++)
                    {
                    if(foundUser[0].productsInCart[i].item === req.params.item)
                    {
                        foundUser[0].productsInCart[i].quantity = req.body.quantity.toString();
                        foundUser[0].productsInCart[i].price = (Number(item.price)*Number(req.body.quantity)).toString();
                    }
                    }
                    item.quantity = (Number(item.quantity)+updatedQuantity).toString();
                    item.markModified('quantity');
                    item.save();
                    foundUser[0].markModified('productsInCart');
                    foundUser[0].save((err,updatedUser)=>{
                        console.log(updatedUser);
                        req.flash("success","Product Edited");
                        res.redirect("/customer/"+req.params.username+"/cart");
                    });
                }
            });
            
        }
        });
    
});
// Remove element from array
function removeItemOnce(arr, value) 
{
    var index = arr.indexOf(value);
    if (index > -1) {
      arr.splice(index, 1);
    }
    return arr;
}
// Delete product from Cart
app.delete("/customer/:username/cart/:item",isLoggedIn,(req, res)=>{
    User.findOne({username:req.params.username},(err,foundUser)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            Item.findOne({name:req.params.item},(err,item)=>{
                if(err)
                {
                    req.flash("error",err.message);
                    res.redirect("back");
                }
                else
                {
                    var removedQuantity;
                    for(var i=0;i<foundUser.productsInCart.length;i++)
                    {
                        if(foundUser.productsInCart[i].item === req.params.item)
                        {
                            removedQuantity = foundUser.productsInCart[i].quantity;
                            removeItemOnce(foundUser.productsInCart,foundUser.productsInCart[i]);
                            console.log(foundUser.productsInCart);
                        }
                    }
                    item.quantity = (Number(item.quantity) + Number(removedQuantity)).toString();
                    item.markModified('quantity');
                    item.save((err,updatedItem)=>{
                        console.log(updatedItem.quantity);
                    });
                    foundUser.markModified('productsInCart');
                    foundUser.save((err,updatedUser)=>
                    {
                        console.log(updatedUser);
                        req.flash("success","Product Deleted");
                        res.redirect("/customer/"+req.params.username+"/cart");
                    });
                }
            });
        }
    });
});
// Checkout Page
app.get("/customer/:username/checkout",isLoggedIn,(req, res)=>{
    res.render("checkout",{products:req.user.productsInCart});
});
app.post("/customer/:username/checkout/payment",isLoggedIn,(req, res)=>{
    var paymentDetails = req.body.payment;
    User.findOne({username:req.params.username},(err,foundUser)=>{
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("back");
        }
        else
        {
            for(var i=0;i<foundUser.productsInCart.length;i++)
            {
                foundUser.history[i] = foundUser.productsInCart[i];
            }
            foundUser.markModified('history');
            Payment.create(paymentDetails,(err,payment)=>{
                if(err)
                {
                    req.flash("error",err.message);
                }
                else
                {
                    foundUser.productsInCart.splice(0,foundUser.productsInCart.length);
                    foundUser.markModified('productsInCart');
                    foundUser.save((err,updatedUser)=>{
                        if(err)
                        {
                            console.log(err);
                        }
                    });
                    req.flash("success","Payment Successfully Done");
                    res.redirect("/customer/"+req.params.username);
                }
            });
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