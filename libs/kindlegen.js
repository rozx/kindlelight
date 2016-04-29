 // online convert to .mobi
 var exec = require('child_process').exec;

 var kg = function() {
    
     var path = 'sudo ' + __dirname + '/kindlegen/kindlegen';

     var options = '-c2';

     this.convert = function(file, callback) {
         exec(path + ' '  +options + ' '+ file, function(err, stdout, stderr) {
             if (!err){
                 
                 callback(err,stdout);
             } else {
                
                callback(err,stdout);
             }
         });

     }
 }


 module.exports = new kg();
