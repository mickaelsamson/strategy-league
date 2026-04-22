const mongoose = require('mongoose');

const User = new mongoose.Schema({
 username:String,
 rank:{type:Number,default:1000},
 tier:{type:String,default:"Bronze"}
});

module.exports = mongoose.model('User',User);
