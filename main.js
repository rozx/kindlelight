console.log("> initializing...");

// init vars

var express = require('express');
var app = express();
var port = 8080;
var jar;

// init file system
var fs = require('fs');

// init encoding 

var gbk = require('gbk');

// init request 

var rq = require('request').defaults({jar: true});

// init cheerio

var cheerio = require('cheerio');

// init wenku8 module
var wenku = require('./wenku.js');

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

wenku.login('rozx','1990710');
console.log('> logging to: ' + wenku.url);

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
		

	if(wenku.loggedIn){
		
		if(!jar){

			jar = wenku.jar;
				
			rq = rq.defaults({jar: jar});
		}
		next();	
	
	} else {
		
		console.log('> Can not get book id:' + id);
		res.send('Can not get book id:' + id);
	}

});


app.get('/book/:id',function(req,res,next){

	var bid = req.params.id;
	var url = "http://www.wenku8.com/modules/article/packshow.php?id="+ bid  +"&type=txtfull";
	

	// grab web content
	rq({url: url, encoding: null}, function(error, response, html){
		
		if(!error){

			var html_dec = gbk.toString('utf-8', html);	

			res.send(html_dec);			

		} else {
			res.send('Error:', error);
		}
	});

	
});


