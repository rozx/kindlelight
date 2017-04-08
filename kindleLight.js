console.log("> initializing...");

// init vars

var express = require('express');
var app = express();
var port = 80;
var jar;

//var bookFile = bookDir + 'bookList.json';
var bookList;

// init util
var util = require('util');
// init file system
var fs = require('fs-extra');

// init url
var url = require('url');

// init encoding 

var gbk = require('gbk');

// init request 

var rq = require('request').defaults({
    jar: true
});

// init cheerio

var cheerio = require('cheerio');

// init repeat

var repeat = require('repeat');

// init tingodb

var db = require('./libs/db.js');

// init wenku8 module
var wenku = require('./libs/wenku.js');

// init downloader module
var downloader = require('./libs/downloader.js');

// init converter
var conv = require('./libs/converter.js');

// init other modules
var books = require('./libs/books.js');

// init favicon
var favicon = require('serve-favicon');

// init dateformat
var dateFormat = require('dateformat');

console.log("> initialized.");

// app config

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static('./data/books'));
app.use(favicon(__dirname + '/public/favicon.ico'));
app.set('views', __dirname + '/views');

// listening to port

try {

    app.listen(port);

    console.log("> listening on port:" + port);

} catch (error) {

    console.error("> an error just got caught! Maybe you should run it with sudo?");
    console.error('> ', error);

}

// init

Init();


// index

app.get('/', function (req, res) {

    res.redirect('/index');


});

app.get('/index', function (req, res) {



    // Get recent updated books.
    books.getRecentBooks(8, bookList, function (err, recent) {

        // get recent books

        // Get hot books

        books.getHotBooks(8, bookList, function (err2, hot) {


            // Get random books

            books.getRandomBooks(4, bookList, function (err3, random) { 

            if (!(err || err2 || err3)) {

                res.render('Index/index', { recentBooks: recent, hotBooks: hot, randBooks: random, dateFormat: dateFormat, downListNum: downloader.getTaskNum(), convListNum: conv.getTaskNum() });

            } else {

                console.log('> Internal server error!',err,err2,err3);



                res.status(500);
                res.end();
                }

            });

        });


    });

});

app.get('*', function(req, res, next) {

    // prevent duplicate requests

    if (req.headers.accept == "*/*") {

        //console.log('duplicate request!');
        
        //console.log(req.headers);

        //res.status(404);
        //res.end('Duplicate request!');
     

        //console.log(req.headers);
        next();

    } else {

        next();
    }

});

// grab web content
app.param('id', function(req, res, next, id) {

    //console.log('> Client requesting book id:' + id);


    if (wenku.loggedIn && id) {

        if (!jar) {

            jar = wenku.jar;
            downloader.jar = jar;
            

            rq = rq.defaults({
                jar: jar
            });
        }

        if (!books.bookList) books.bookList = bookList;

        next();

    } else {

        console.log('> Can not get book id:' + id);
        res.send('Can not get book id:' + id);

        wenku.login(wenku.username, wenku.password);
    }

});

app.get('/book/cover/:bid', function(req, res) {

    var bid = req.params.bid;
    
    //console.log('> Cover requested:',bid);

    books.getBookById(bid, bookList,function(bookInfo) {

        if (bookInfo) {

            books.getCover(bookInfo, function (err, data) {

                if (!err) {

                    res.writeHead(200, {
                        'Content-Type': 'image/jepg'
                    });
                    res.end(data, 'binary');


                } else {

                    res.end();
                }
            });
        }
    });

});




app.get('/book/:id', function(req, res, next) {

    var bid = req.params.id;
    var bookInfo;

    console.log('> Bookinfo requested, id:', bid);


    books.getBookInfo(bid, bookList, false, function(bi) {

        bookInfo = bi;
        //res.send('<img src="/book/cover/' + bid + '">' + '<br>' + JSON.stringify(bookInfo));

        if (bi) {

            res.render('Index/bookInfo', { bookInfo: bi, dateFormat: dateFormat});
			
        } else {

            res.status(500);
            res.end();
        }
    });

});



app.get('/read/:bid/', function(req, res, next) {

    var bid = req.params.bid;

    books.getBookInfo(bid, bookList, false, function(bookInfo) {

        if (bookInfo) {

            books.getCover(bookInfo);
            // if book exist
            res.send(bookInfo);

        } else {


            res.send('book doesn\'t exist :<');
        }

    });


});



app.get('/require/:bid/:cid', function(req, res, next) {

    var bid = req.params.bid;
    var cid = req.params.cid;



    books.getBookById(bid, bookList,function(bookInfo) {

        if (!cid) cid = 0;

        if (bookInfo && bookInfo.chapters[cid]) {

            // start downloader
            //if (downloader.status == downloader.READY) downloader.start();

            // ==== 

            console.log('> Getting book: [' + bid + '/' + cid + '] content.');

            books.getBook(cid, bookInfo, bookList, function(err,data) {
                

                // also get cover

                books.getCover(bookInfo);

                //console.log(data);
                res.redirect('/result?success=true&message=1');

            });



            //res.send(bookInfo);

        } else {

            console.log('> Book id:[' + bid + "] doesnt exist!");

            res.status(404);
            res.json({
                error: 'Invalid Book id.'
            });
            //res.send(': ( the content you are looking for is missing..');

        }

    });

});


app.get('/convert/:bid/:cid',function(req,res,next){

    var bid = req.params.bid;
    var cid = req.params.cid;


    books.getBookById(bid,bookList,function(bookInfo){
        
       console.log('> Start converting:',bookInfo.title);

       books.queueToConvert(cid, bookInfo,bookList, function (err, type, bookInfo) {
       

           if (!err) {

                   //redirect to result page

                   res.redirect('/result?success=true&message=0');

            }
       
       });
    
    });


});


app.get('/checkUpdate',function(req,res,next){
	
	


	res.send('Good!');
});



app.get('/download/:format/:id/:cid', function(req,res,next){

    var bid = req.params.id;
    var cid = req.params.cid;
    var format = req.params.format;

    

    books.getBookInfo(bid, bookList, false, function (bookInfo) {

        if (bookInfo) {

            var file = 'data/books/' + bid + '/' + format + '/' + bookInfo.chapters[cid].vid + '.' + format;

            // open file
            fs.readFile(file, (err, data) => {
                if (err) {

                    res.send('Invalid file.');
                } else {

                    res.download(file);
                }
            });
        } else {

            res.send('Invalid file.');
        }

    });

});


app.get('/result', function (req, res, next) {

    var success = req.query.success;
    var message = req.query.message;
    var msg;

    if (success == null) success = false, msg = 'No message.';

    if (success == true) {

        if (message == 'conv') {

            // successfully queued the convertion

            msg = '本小说已加入转换任务，根据已有的任务，将于5 - 30分钟后转换完成。请刷新查看结果。';
            

        } else if (message == 'require') {

            msg = '已加入服务器下载列表，请刷新查看结果。';
            

        }

        

    }

    res.render('Result/jump', { success: success, message: 'OK : )' });

    

});

app.use(function (req, res, next) {


    res.status(404);
    res.render('Error/404');
    //res.send('Invalid URL');

});

function Init() {

    wenku.init();
    downloader.init(false);
    conv.init();

    // set books
    bookList = db.collection('books');
    books.init(downloader, wenku, conv);
    
    repeat(TimedJobs).every(60, 'min').start.in(5, 'sec');
	
	console.log('> Started timed jobs..');

}


function TimedJobs(){
	
	console.log('> Start checking update..');
	
	wenku.getUpdateBookList(function(error, updatedBookList){

		books.checkBookUpdate(updatedBookList, bookList, function(err){
		
			
		
		});
	//res.send(updatedBookList);

	});
	
}
