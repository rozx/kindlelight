// required modules                                                                                                                                  
var rq = require('request');
var gbk = require('gbk');
var fs = require('fs');
var cheerio = require('cheerio');
var urlp = require('url');

function wenku() {


    //init vars                                                                                      
    this.module = 'wenku';
    this.url = 'http://www.wenku8.com';
    this.username = 'rozx';
    this.password = '1990710';
    this.loggedIn = false;
    this.lastLogin = undefined;
    this.cookies = undefined;
    this.jar = rq.jar();
    this.cookiePath = './data/cookies/wenku.cookie';
    this.localCookie = undefined;
    this.bookInfo = undefined;
    var self = this;

    //functions                                                                                                                                     

    this.init = function (callback) {

        // check if local cookies is available.                                                        

        var localJar = rq.jar();

        fs.access(self.cookiePath, fs.R_OK | fs.W_OK, (err) => {

            // check whether the local cookies is available.

            if (err) {
                console.log('Wenku > local cookies is not available!');
                self.localCookie = false;

                self.login(self.username, self.password);

            } else {
                console.log('Wenku > Found local cookies!');

                fs.readFile(self.cookiePath, 'utf-8', (err, data) => {

                    if (err) {

                        console.log('Wenku > File read error, online logging..');

                        self.localCookie = false;

                        self.login(self.username, self.password);


                    } else {

                        //console.log(data);

                        console.log('Wenku > Read data.');

                        var cookie = rq.cookie(data);
                        var url = self.url;
                        localJar.setCookie(cookie, url);




                        // localJar = rq.jar(new FileCookieStore(self.cookiePath));                       

                        console.log('Wenku > Logging with local cookies.');

                        self.jar = localJar;
                        self.localCookie = true;

                        // test connection                                                                                             
                        self.checkLogin(true);
                    }
                });

            }
        });

    };


    this.login = function (user, pwd) {

        console.log('Wenku > Logging in...');

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
        }, function (err, res, body) {

            console.log('> Code:', res.statusCode);

            //console.log(body);                                                                                    

            if (res.statusCode == 200) {

                // if loggined in 

                //console.log(gbk.toString('utf-8',body));                                                                                 


                console.log('Wenku > Logged in as ' + user);
                self.cookies = self.jar.getCookieString(self.url);



                console.log('Wenku > Cookies:', self.cookies);

                // set var                                                                                
                self.loggedIn = true;
                self.username = user;
                self.password = pwd;


                // store local cookies                                                                                       
                console.log('Wenku > Saving cookies to local..');


                fs.writeFile(self.cookiePath, self.cookies, (err) => {

                    if (err) console.log(err);

                    console.log('Wenku > Local cookies saved.');

                });

            } else {
                // login failed                                                                                              

                self.loggedIn = false;
                console.log('Wenku > Logging failed.');

            }

        });

        return self.loggedIn;
    };


    this.checkLogin = function (autoLoggin) {

        var keyword = 'logout';



        rq({
            url: self.url + '/index.php',
            encoding: null,
            jar: self.jar
        }, function (error, response, html) {

            if (!error) {
                var html_dec = gbk.toString('utf-8', html);

                //console.log(html_dec);

                //check if user is logged in

                if (html_dec.indexOf(keyword) > -1) {

                    self.loggedIn = true;
                    console.log('Wenku > User has logged in.');
                } else {
                    self.loggedIn = false;
                    console.log('Wenku > User has not logged in');

                    if (autoLoggin) self.login(self.username, self.password);
                }


            } else {

            }
        });



    };

    this.getBookInfo = function (html, bid) {

        // bookInfo = {_id: '1', title: 'God World', id : '1922', image : 'xxx',author: 'xxx',desc: 'xxxxxx',publisher: 'xxx',lastUpdate : 1231232131, listUrl : 'http://www.wenku8.com/novel/0/1922/index.htm'
        //              chapters: [{ title : '1',cover: 'http://xxx.jpg', images: ['aaaa.jpg'],url: 'http://dl.wenku8.com/packtxt.php?aid=1922&vid=67426&charset=utf-8' }]}

        var bookInfo = {};
        var url = self.url + '/book/' + bid + '.htm';



        // load cheerio
        var $ = cheerio.load(html);

        //bookInfo.title = $('.grid caption a').text();
        //bookInfo.id = $('.grid caption a').attr('href').replace('http://www.wenku8.com/book/', '').replace('.htm', '');
        bookInfo.id = bid;
        //bookInfo.image = 'http://img.wkcdn.com/image/1/' + bookInfo.id + '/' + bookInfo.id + 's.jpg';

        bookInfo.listUrl = $('div[style="text-align:center"] a').eq(0).attr('href');
        bookInfo.image = $('div table tr td img').attr('src');
        bookInfo.title = $('div table tr td table tr td span b').text();
        bookInfo.author = $('div table tr td').eq(4).text().split('：')[1];
        bookInfo.publisher = $('div table tr td').eq(3).text().split('：')[1];
        bookInfo.desc = $('div table tr td span').eq(4).text();
        bookInfo.imagesChecked = false;
        bookInfo.lastUpdate = Date.now();


        return bookInfo;
    }


    this.getChapterInfo = function (bookInfo, html) {

        bookInfo.chapters = [];



        if (bookInfo.id != '') {

            var $ = cheerio.load(html);

            $('table tr').nextAll().each(function (i, elem) {

                // for every chapters

                title = $('.odd', elem).text();
                ulink = $('.even a', elem).eq(1).attr('href');
                vid = urlp.parse(ulink, true).query.vid;

                bookInfo.chapters.push({

                    id: i,
                    vid: vid,
                    title: title,
                    url: ulink

                });

            });



            //console.log(bookInfo);

        }

        return bookInfo;

    }


    this.getImages = function (bookInfo, callback) {

        if (bookInfo && bookInfo.listUrl && !bookInfo.imagesChecked) {

            // if there is url exists

            rq({
                url: bookInfo.listUrl,
                encoding: null,
                jar: self.jar
            }, function (error, response, html) {

                if (!error) {
                    // got html successful

                    console.log('Wenku > Checking images for book:', bookInfo.title);

                    var html_dec = gbk.toString('utf-8', html);

                    var $ = cheerio.load(html_dec);

                    var chapterId = -1;

                    $('table tr td').each(function (i, e, array) {

                        //console.log($('a', e).text());

                        if ($(e).attr('class') == 'vcss') {
                            chapterId++;
                        } else if ($('a', e).text().includes('插图')) {

                            var iUrl = urlp.resolve(bookInfo.listUrl, $('a', e).attr('href'));

                            //console.log('Wenku > Found images at chapters: ', chapterId + 1);

                            self.getImage(chapterId, bookInfo, iUrl, function (err,cid,bookInfo) {

                                if (!err) {

                                    console.log('Wenku > Got Images for book:', bookInfo.title, 'chapter:', cid);

                                    //callback
                                    if (callback) {

                                        // set image checked.

                                        bookInfo.imagesChecked = true;

                                        // callback

                                        callback(null, cid, bookInfo)


                                    };

                                }

                            });

                        }


                    });


                } else {

                    // not able to get html

                    if (callback) callback(error);

                }



            });
        } else {

            if (callback) callback(new Error('Url not exists'), null);

        }
    }


    this.getImage = function (cid, bookInfo, url, callback) {

        if (bookInfo && bookInfo.chapters[cid]) {

            // if images are not already exists

            if (!bookInfo.chapters[cid].cover) {

                rq({
                    url: url,
                    encoding: null,
                    jar: self.jar
                }, function (error, response, html) {

                    if (!error) {

                        // no error getting images url

                        html = gbk.toString('utf-8', html);

                        var $ = cheerio.load(html);


                        // getting image url

                        var images = [];

                        // add cover for each chapter
                        var cover = $('.divimage img').attr('src');

                        $('.divimage img').each(function (i, e) {

                            // add each image to array
                            //console.log($(e).attr('src'));
                            images.push($(e).attr('src'));

                        });

                        // add images and cover to bookInfo

                        bookInfo.chapters[cid].cover = cover;
                        bookInfo.chapters[cid].images = images;

                        if (callback) callback(null, cid, bookInfo);



                    } else {

                        if (callback) callback(error);
                    }

                });

            } else {

                // images are already exists
                callback(new Error('Images already exists'));

            }
        } else {

            callback(new Error('Invalid cid or bookInfo'));
        }

    }


    this.__imageCallback = function (current ,total, callback) {
    }




}

// exports                                                                                                                  

module.exports = new wenku();
