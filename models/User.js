const mongoose = require('mongoose');

const User = new mongoose.Schema({
 username:String,
 xp:{type:Number,default:0},
 level:{type:Number,default:1},
 badges:[String],
 attendance:{type:Number,default:0},
 xpHistory:[{date:Date,xp:Number}]
});

module.exports = mongoose.model('User',User);
