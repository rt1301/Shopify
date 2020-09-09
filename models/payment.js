var mongoose = require('mongoose');
var paymentSchema = new mongoose.Schema({
    mode:String,
    cardNo:String,
    cardExp: String,
    cardCvv: String,
    price: String
});
module.exports = mongoose.model("Payment",paymentSchema);