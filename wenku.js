// required modules
var rq = require('request');
var gbk = require('gbk');

// main module
function wenku(){


//init vars
this.module = 'wenku';
this.url = 'http://www.wenku8.com';
this.username = undefined;
this.password = undefined;
this.loggedIn = false;
this.lastLogin = undefined;
this.cookies = undefined;
this.jar = rq.jar();


var self = this;

// functions


this.login = function (user,pwd){                          
		
		// ====================
                                                                                       
        	console.log('> Logging in...');
                                                                                                                                                     
        	var postData = {
                                                                                                                                                     
               		username : user,                                                                                                                     
               		password : pwd,                                                                                                               
               		usecookie : '315360000',
               		action : 'login'
        	};
                                                                                                                                                     
        	rq.post({url : self.url  + '/login.php?do=submit',qs: postData,encoding: null,jar: self.jar},function(err,res,body){
                                                                                                                                                     
        	console.log('> Code:',res.statusCode);
                                                                                                                                                     
        	//console.log(body);
                                                                                                                                                     
        	if(res.statusCode == 200){
                                
		// if loggined in
                
		//console.log(gbk.toString('utf-8',body));

                                                                                    
        	console.log('> Logged in as ' + user);
        	self.cookies = self.jar.getCookieString(self.url);
                                                                                                                                                     
        	console.log('> Cookies:',self.cookies);

		// set var
		self.loggedIn = true;
		self.username = user;
		self.password = pwd;

		
                        

		                                                                                                                             
        	} else {
		// login failed
				
        	self.loggedIn = false;                                                                                                                                    
        	console.log('> Logging failed.');
        
       		}
		
	});		

	return self.loggedIn;
};

}

// exports

module.exports = new wenku();


