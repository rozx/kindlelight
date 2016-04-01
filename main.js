console.log("> initializing...");

// init vars

var express = require('express');
var app = express();
var port = 80;

// init file system
var fs = require('fs');

// init request 
//var rq = require('request');
var rq = require('request').defaults({jar: true});

// init cheerio

var cheerio = require('cheerio');



console.log("> initialized.");

// listening to port

try{

	app.listen(port);

	console.log("> listening on port:" + port);

} catch (error){

	console.error("> an error just got caught! Maybe you should run it with sudo?");
	console.error('> ',error);

}

// logging in

login('rozx','1990710');


// app config

app.set('view engine', 'jade');
app.use(express.static('public'));
app.use(express.static('data'));

// index

app.get('/', function (req, res) {
                                                                                                                                                     
	res.render('index',{title: 'Kindle Light Novel',message: 'hello world!'});                                                                                                                                              
});

// grab web content
app.param('id',function(req,res,next,id){

	console.log('> Getting book id:' + id);
	next();

});


app.get('/book/:id',function(req,res,next){

	var bid = req.params.id;
	var url = "http://www.wenku8.com/modules/article/packshow.php?id="+ bid  +"&type=txtfull";
	

	// grab web content
	rq({url}, function(error, response, html){
		
		if(!error){
			res.send(html);			

		} else {
			res.send('Error:', error);
		}
	});

	
});


// login function
function login (user,pwd){

	console.log('> Logging in...');

	var postData = {
                                                                                                                                                     
                username : user,                                                                                                                     
                password : pwd,                                                                                                                      
                usecookie : '315360000',
		action : 'login'                                                                                                                
                                                                                                                                                     
        };

	rq.post({url : 'http://www.wenku8.com/login.php?do=submit',qs: postData},function(err,res,body){


		console.log('> Code:',res.statusCode);

		//console.log(body);


			
		if(res.statusCode == 200){

			console.log('> Logged in as ' + user);
			var cookie = rq.cookie('key1=value1');

			console.log('> Cookies:',cookie);
			
			
		} else {
			
			console.log('> Logging failed.');

		}

	});
};


