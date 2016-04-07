// required modules                                                                                                                                  
var rq = require('request');                                                                                                                         
var gbk = require('gbk');                                                                                                                            
var fs = require('fs');  

function wenku() {                                                                                                                                   
                                                                                                                                                     
                                                                                                                                                     
    //init vars                                                                                                                                      
    this.module = 'wenku';                                                                                                                           
    this.url = 'http://www.wenku8.com';                                                                                                              
    this.username = 'rozx';                                                                                                                          
    this.password = '1990710';                                                                                                                       
    this.loggedIn = false;                                                                                                                           
    this.lastLogin = undefined;                                                                                                                      
    this.cookies = undefined;                                                                                                                        
    this.jar = rq.jar();                                                                                                                             
    this.cookiePath = './data/cookies/wenku.cookie';                                                                                                 
    this.localCookie = undefined;                                                                                                                    
                                                                                                                                                     
                                                                                                                                                     
    var self = this;                                                                                                                                 
                                                                                                                                                     
    // functions                                                                                                                                     
                                                                                                                                                     
    this.init = function(path) {                                                                                                                     
                                                                                                                                                     
        // check if local cookies is avavilabel                                                                                                      
                                                                                                                                                     
        var localJar = rq.jar();                                                                                                                     
                                                                                                                                                     
        fs.access(self.cookiePath, fs.R_OK | fs.W_OK, (err) => {                                                                                     
                                                                                                                                                     
            // check whether the local cookies is available.                                                                                         
                                                                                                                                                     
            if (err) {                                                                                                                               
                console.log('> local cookies is not available!');                                                                                    
                self.localCookie = false;                                                                                                            
                                                                                                                                                     
                self.login(self.username, self.password);                                                                                            
                                                                                                                                                     
            } else {                                                                                                                                 
                console.log('> Found local cookies!');                                                                                               
                                                                                                                                                     
                fs.readFile(self.cookiePath, 'utf-8', (err, data) => {                                                                               
                                                                                                                                                     
                    if (err) {                                                                                                                       
                                                                                                                                                     
                        console.log('> File read error, online logging..');                                                                          
                                                                                                                                                     
                        self.localCookie = false;                                                                                                    
                                                                                                                                                     
                        self.login(self.username, self.password);                                                                                    
                                                                                                                                                     
                                                                                                                                                     
                    } else {                                                                                                                         
                                                                                                                                                     
                        //console.log(data);                                                                                                         
                                                                                                                                                     
                        console.log('> Read data.');                                                                                                 
                                                                                                                                                     
                        var cookie = rq.cookie(data);                                                                                                
                        var url = self.url;                                                                                                          
                        localJar.setCookie(cookie, url);                                                                                             
                                                                                                                                                     
                                                                                                                                                     
                                                                                                                                                     
                                                                                                                                                     
                        // localJar = rq.jar(new FileCookieStore(self.cookiePath));                                                                  
                                                                                                                                                     
                        console.log('> Logging with local cookies.');                                                                                
                                                                                                                                                     
                        self.jar = localJar;                                                                                                         
                        self.localCookie = true;                                                                                                     
                                                                                                                                                     
                        // test connection                                                                                                           
                        self.checkLogin();
			self.loggedIn = true;                                                                                                           
                    }                                                                                                                                
                });                                                                                                                                  
                                                                                                                                                     
            }                                                                                                                                        
        });                                                                                                                                          
                                                                                                                                                     
    };                                                                                                                                               
                                                                                                                                                     
                                                                                                                                                     
    this.login = function(user, pwd) {                                                                                                               
                                                                                                                                                     
        console.log('> Logging in...');                                                                                                              
                                                                                                                                                     
        var postData = {                                                                                                                             
                                                                                                                                                     
            username: user,                                                                                                                          
            password: pwd,                                                                                                                           
            usecookie: '315360000',                                                                                                                  
            action: 'login'                                                                                                                          
        };                                                                                                                                           
                                                                                                                                                     
        rq.post({                                                                                                                                    
            url: self.url + '/login.php?do=submit',                                                                                                  
            qs: postData,                                                                                                                            
            encoding: null,                                                                                                                          
            jar: self.jar                                                                                                                            
        }, function(err, res, body) {                                                                                                                
                                                                                                                                                     
            console.log('> Code:', res.statusCode);                                                                                                  
                                                                                                                                                     
            //console.log(body);                                                                                                                     
                                                                                                                                                     
            if (res.statusCode == 200) {                                                                                                             
                                                                                                                                                     
                // if loggined in                                                                                                                    
                                                                                                                                                     
                //console.log(gbk.toString('utf-8',body));                                                                                           
                                                                                                                                                     
                                                                                                                                                     
                console.log('> Logged in as ' + user);                                                                                               
                self.cookies = self.jar.getCookieString(self.url);                                                                                   
                                                                                                                                                     
                                                                                                                                                     
                                                                                                                                                     
                console.log('> Cookies:', self.cookies);                                                                                             
                                                                                                                                                     
                // set var                                                                                                                           
                self.loggedIn = true;                                                                                                                
                self.username = user;                                                                                                                
                self.password = pwd;                                                                                                                 
                                                                                                                                                     
                                                                                                                                                     
                // store local cookies                                                                                                               
                console.log('> Saving cookies to local..');                                                                                          
                                                                                                                                                     
                                                                                                                                                     
                fs.writeFile(self.cookiePath, self.cookies, (err) => {                                                                               
                                                                                                                                                     
                    if (err) console.log(err);                                                                                                       
                                                                                                                                                     
                    console.log('> Local cookies saved.');                                                                                           
                                                                                                                                                     
                });                                                                                                                                  
                                                                                                                                                     
            } else {                                                                                                                                 
                // login failed                                                                                                                      
                                                                                                                                                     
                self.loggedIn = false;                                                                                                               
                console.log('> Logging failed.');                                                                                                    
                                                                                                                                                     
            }                                                                                                                                        
                                                                                                                                                     
        });                                                                                                                                          
                                                                                                                                                     
        return self.loggedIn;                                                                                                                        
    };                                                                                                                                               
                                                                                                                                                     
                                                                                                                                                     
    this.checkLogin = function() {                                                                                                                   
                                                                                                                                                     
        var keyword = "登录";                                                                                                                          
                                                                                                                                                     
                                                                                                                                                     
                                                                                                                                                     
    };                                                                                                                                               
                                                                                                                                                     
                                                                                                                                                     
}                                                                                                                                                    
                                                                                                                                                     
// exports                                                                                                                                           
                                                                                                                                                     
module.exports = new wenku();


