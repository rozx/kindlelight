// required modules
var rq = require('request');
var gbk = require('gbk');
var fs = require('fs-extra');
var cheerio = require('cheerio');
var urlp = require('url');

function wenku() {

    //init vars
    this.module = 'wenku';
    this.url = 'http://www.wenku8.com';
    this.username = undefined;
    this.password = undefined;
    this.loggedIn = false;
    this.lastLogin = undefined;
    this.cookies = undefined;
    this.jar = rq.jar();
    this.cookiePath = './data/cookies/wenku.cookie';
    this.userPath = './data/user/wenku.user';
    this.localCookie = undefined;
    this.bookInfo = undefined;
    var self = this;

    //functions

    this.init = function(callback) {

        // check if local cookies is available.

        var localJar = rq.jar();

        fs.access(self.cookiePath, fs.R_OK | fs.W_OK, (err) => {

            // check whether the local cookies is available.

            if (err) {
                console.log('Wenku > local cookies is not available!');
                self.localCookie = false;

                self.login();

            } else {
                console.log('Wenku > Found local cookies!');

                fs.readFile(self.cookiePath, 'utf-8', (err, data) => {

                    if (err) {

                        console.log('Wenku > File read error, online logging..');

                        self.localCookie = false;

                        self.login();

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

    this.login = function() {

        console.log('Wenku > Logging in...');

        // first check local file for username and password

        // ensure dir
        fs.ensureFileSync(self.userPath);

        // read file as json

        console.log('Wenku > Reading local user profile..');

        const userProfile = fs.readJsonSync(self.userPath, {
            throws: false
        })


        if (!userProfile) {

            console.log('Wenku > Local user file not found.');

            self.username = '';
            self.password = '';
            //self.loggedIn = false;


        } else {

            console.log('Wenku > Local user file found.');

            self.username = userProfile.username;
            self.password = userProfile.password;

        }

        var postData = {

            username: self.username,
            password: self.password,
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


                console.log('Wenku > Logging... ');
                self.cookies = self.jar.getCookieString(self.url);

                console.log('Wenku > Cookies:', self.cookies);

                // set var
                self.loggedIn = true;
                //self.username = user;
                //self.password = pwd;


                // store local cookies
                console.log('Wenku > Saving cookies to local..');

                fs.writeFile(self.cookiePath, self.cookies, (err) => {

                    if (err)
                        console.log(err);

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

    this.checkLogin = function(autoLoggin) {

        var keyword = 'logout';

        rq({
            url: self.url + '/index.php',
            encoding: null,
            jar: self.jar
        }, function(error, response, html) {

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

                    if (autoLoggin)
                        self.login();
                }

            } else {}
        });

    };

    this.getBookInfo = function(html, bid) {

        // bookInfo = {_id: '1', title: 'God World', id : '1922', image : 'xxx',author: 'xxx', status : '连载中 | 已完成', wenkuUpdate:'2015-1-1', hotIndex: 0 ,desc: 'xxxxxx',publisher: 'xxx',lastUpdate : 1231232131, listUrl : 'http://www.wenku8.com/novel/0/1922/index.htm'
        //              chapters: [{ title : '1', localFiles : {txt : false, epub: false, mobi: false } ,lastConvert: 5454334 ,images: ['aaaa.jpg'],url: 'http://dl.wenku8.com/packtxt.php?aid=1922&vid=67426&charset=utf-8' }]}

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
        bookInfo.status = $('div table tr td').eq(5).text().split('：')[1];
        bookInfo.hotIndex = 0;
        bookInfo.wenkuUpdate = $('div table tr td').eq(6).text().split('：')[1];
        bookInfo.publisher = $('div table tr td').eq(3).text().split('：')[1];
        //bookInfo.desc = $('div table tr td span').eq(4).text();
        bookInfo.desc = $('span[style="font-size:14px;"]').eq(1).text();
        bookInfo.imagesChecked = false;
        bookInfo.lastUpdate = Date.now();
        bookInfo.lastLocalFileCheck = 0;

        return bookInfo;
    }

    this.getChapterInfo = function(bookInfo, html) {

        // Sync function

        bookInfo.chapters = [];

        if (bookInfo.id != '') {

            var $ = cheerio.load(html);

            $('table tr').nextAll().each(function(i, elem) {

                // for every chapters

                title = $('.odd', elem).text();
                ulink = $('.even a', elem).eq(1).attr('href');
                vid = urlp.parse(ulink, true).query.vid;

                bookInfo.chapters.push({

                    id: i,
                    vid: vid,
                    title: title,
                    url: ulink,
                    lastConvert: 0,
                    localFiles: {
                        txt: false,
                        epub: false,
                        mobi: false
                    },
                    images: []

                });

            });

            //console.log(bookInfo);

        }

        return bookInfo;

    }

    this.getImages = function(bookInfo, callback) {

        if (bookInfo && bookInfo.listUrl && !bookInfo.imagesChecked) {

            // if there is url exists

            rq({
                url: bookInfo.listUrl,
                encoding: null,
                jar: self.jar
            }, function(error, response, html) {

                if (!error) {
                    // got html successful

                    console.log('Wenku > Checking images for book:', bookInfo.title);

                    var html_dec = gbk.toString('utf-8', html);

                    var $ = cheerio.load(html_dec);

                    var chapterId = -1;

                    $('table tr td').each(function(i, e, array) {

                        //console.log($('a', e).text());

                        if ($(e).attr('class') == 'vcss') {
                            chapterId++;
                        } else if ($('a', e).text().includes('插图')) {

                            var iUrl = urlp.resolve(bookInfo.listUrl, $('a', e).attr('href'));

                            //console.log('Wenku > Found images at chapters: ', chapterId + 1);

                            self.getImage(chapterId, bookInfo, iUrl, function(err, cid, bookInfo, images) {

                                if (!err) {

                                    console.log('Wenku > Got Images for book:', bookInfo.title, 'chapter:', cid);

                                    //callback
                                    if (callback) {

                                        // set image checked.

                                        bookInfo.imagesChecked = true;

                                        // callback

                                        callback(null, cid, bookInfo, images)

                                    };

                                }

                            });

                        }

                    });

                } else {

                    // not able to get html

                    if (callback)
                        callback(error);

                }

            });
        } else {

            if (callback)
                callback(new Error('Url not exists'), null);

        }
    }

    this.getImage = function(cid, bookInfo, url, callback) {

        if (bookInfo && bookInfo.chapters[cid]) {

            // if images are not already exists

            if (!bookInfo.chapters[cid].cover) {

                rq({
                    url: url,
                    encoding: null,
                    jar: self.jar
                }, function(error, response, html) {

                    if (!error) {

                        // no error getting images url

                        html = gbk.toString('utf-8', html);

                        var $ = cheerio.load(html);

                        // getting image url

                        var images = [];

                        // add cover for each chapter
                        //var cover = $('.divimage img').attr('src');

                        $('.divimage img').each(function(i, e) {

                            // add each image to array
                            //console.log($(e).attr('src'));
                            images.push($(e).attr('src'));

                        });

                        // add images and cover to bookInfo

                        //bookInfo.chapters[cid].cover = cover;
                        bookInfo.chapters[cid].images = images;

                        if (callback)
                            callback(null, cid, bookInfo, images);

                    } else {

                        if (callback)
                            callback(error);
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

    this.__imageCallback = function(current, total, callback) {}

    this.getUpdateBookList = function(callback) {

        // updatedBookList = [{id: '123132', title : 'bookTitle', wenkuUpdate: '2015-1-1'}]

        var updateUrl = self.url + '/modules/article/toplist.php?sort=lastupdate';
        var updatedBookList = [];

        rq({
            url: updateUrl,
            encoding: null,
            jar: self.jar

        }, function(error, response, html) {

            if (!error) {
                var html_dec = gbk.toString('utf-8', html);

                //console.log(html_dec);

                //check if user is logged in

                var $ = cheerio.load(html_dec);

                console.log('Wenku > Checking book updates..');
                //console.log($('div[style="margin-top:5px;"] p').eq(0).text());

                $('div[style="margin-top:5px;"]').each(function(i, e, a) {

                    var bookInfo = {};
                    bookInfo.id = $('b a', e).attr('href').replace('.htm', '').replace(self.url + '/book/', '').replace('/', '');
                    bookInfo.title = $('b a', e).text();
                    bookInfo.wenkuUpdate = $('p', e).eq(1).text().split('/')[0].split(':')[1];

                    //console.log("Wenku > Checking " + bookInfo.id + '/', i);


                    console.log('Wenku > Last update: [' + bookInfo.title + '/' + bookInfo.wenkuUpdate + ']');

                    updatedBookList.push(bookInfo);

                });

                if (callback)
                    callback(null, updatedBookList);

            } else {

                console.log('Wenku > checking updates error!', error);

                if (callback)
                    callback(error, null);

            }
        });

    }

    this.getLastestChapter = function(bid, callback) {

        var updateUrl = self.url + '/book/' + bid + '.htm';
        var chapterName = '';

        rq({
            url: updateUrl,
            encoding: null,
            jar: self.jar

        }, function(error, response, html) {

            if (!error) {

                var html_dec = gbk.toString('utf-8', html);
                var $ = cheerio.load(html_dec);

                console.log('Wenku > Checking update chapter for book id:' + bid);

                chapterName = $('span[style="font-size:14px;"] a').text();

                callback(chapterName);

            } else {

                if (callback)
                    callback(null);
            }

        });
    }

}

// exports

module.exports = new wenku();