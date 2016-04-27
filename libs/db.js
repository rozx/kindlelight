 // init tingodb
   
 var Db = require('tingodb')().Db
 var db = new Db('./data/database/',{});


 // return db
 
 module.exports = db;
