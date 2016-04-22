console.log("> initializing...");

// init vars

var express = require('express');
var app = express();
var port = 80;
var jar;
var bookList = [];

// init file system
var fs = require('fs');

// init encoding 

var gbk = require('gbk');

// init request 

var rq = require('request').defaults({
    jar: true
});

// init cheerio

var cheerio = require('cheerio');

// init wenku8 module
var wenku = require('./wenku.js');

// init downloader module
var downloader = require('./downloader.js');

console.log("> initialized.");



// listening to port

try {

    app.listen(port);

    console.log("> listening on port:" + port);

} catch (error) {

    console.error("> an error just got caught! Maybe you should run it with sudo?");
    console.error('> ', error);

}

// logging in

wenku.init();
downloader.init(false);

//console.log('> logging to: ' + wenku.url);

// app config

app.set('view engine', 'jade');
app.use(express.static('public'));
app.use(express.static('data'));

// index

app.get('/', function(req, res) {

    res.render('index', {
        title: 'Kindle Light Novel',
        message: 'hello world!'
    });
});

// grab web content
app.param('id', function(req, res, next, id) {
    
    console.log('> Client requesting book id:' + id);


    if (wenku.loggedIn && id) {

        if (!jar) {

            jar = wenku.jar;
            downloader.jar = jar;

            rq = rq.defaults({
                jar: jar
            });
        }
        next();

    } else {

        console.log('> Can not get book id:' + id);
        res.send('Can not get book id:' + id);

        wenku.login(wenku.username, wenku.password);
    }

});


app.get('/book/:id', function(req, res, next) {

    var bid = req.params.id;
    var bookInfo;

    rq({
        url: wenku.url + '/book/'  + bid + '.htm',
        encoding: null,
        jar: wenku.jar
    }, function(err, respond, html) {

        if (!err) {

	// get basic book info
	
            html = gbk.toString('utf-8', html);


            var bookInfo = wenku.getBookInfo(html, bid);

            if(bookInfo.id != ''){
                // get chapter info
                
                rq({url : wenku.url + '/modules/article/packtxt.php?id=' + bookInfo.id,
                   encoding : null,
                   jar : wenku.jar},function(err,respond2,html){
                   
                       if(!err){
                           // if no error
                            html = gbk.toString('utf-8',html);
                            wenku.getChapterInfo(bookInfo,html);
                            //console.log(bookInfo);
                            
                            // save info
                            
                            index = GetIndexById(bookInfo.id,bookList);

                            if(index == -1){
                            
                                // if the id doesnt exist, create new

                                bookList.push(bookInfo);
                            
                            } else {

                                // update book info
                                
                                bookList[index] = bookInfo;

                            }




                            res.send('<img src="' + bookInfo.id + '">' + '<br>' + JSON.stringify(bookInfo));
                       } else {
                            throw err;
                            console.log('Error: ',err);
                       }
                   
                   }
                    );

            }

            //res.send('<img src="' + bookInfo.id + '">' + '<br>' + JSON.stringify(bookInfo));

        } else {
            throw err;
            console.log('> Error in getting book info!' + err);
        }

    });

});




app.get('/read/:bid',function(req,res,next){
    
    var bid = req.params.bid;
    var bookInfo = GetBookById(bid,bookList);


    if(bookInfo){

        // start downloader
        downloader.Start();

        // ==== 
    
        console.log('> Getting book: [' + bid + '] content.');
        res.send(bookInfo);

    } else {
   
        console.log('> Book id:[' + bid + "] doesnt exist!");
        res.send(': ( the content you are looking for is missing..');
    
    }

});

function GetIndexById(id,list){

    for(i = 0; i < list.length; i++){
    
        if(list[i].id == id){
        
            return i;
        }
    }

    return -1;

}


function GetBookById(id,list){

    for(i = 0; i < list.length; i++){
        
        if(list[i].id == id){
        
            return list[i];
        }

    }

    return false;


}
