var mongoose = require("mongoose");
var itemSchema = new mongoose.Schema({
    name:String,
    description:String,
    image:String,
    price:String,
    quantity:String,
    sellerName:String
});

module.exports = mongoose.model("Item",itemSchema);