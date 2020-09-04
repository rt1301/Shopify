var mongoose = require('mongoose');
var userInfoSchema = new mongoose.Schema({
    email: String,
    role: String,
    productsInCart: Array,
    history: Array
});
module.exports = mongoose.model("Userinfo",userInfoSchema);