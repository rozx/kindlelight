
var fs = require('fs-extra');
var rq = require('request');
var gbk = require('gbk');

var books = function () {
	
	
	var updateCheckLimit = 5;
	
	var autoDownloadTxt = true;
	var autoConvert = true;
    var self = this;
    var bookDir = './data/books/';

    // modules
    var downloader, wenku, converter;
    var bookList;
    // functions

    this.init = function (d,w,c) {

        downloader = d;
        wenku = w;
        converter = c;

    }


    this.updateBookList = function(bookInfo,bookList,callback) {

        //if record is null

        if (bookInfo.title == (undefined || null || '')) return false;

        var cursor = bookList.find({
            'id': bookInfo.id
        });

        cursor.count(function (err, num) {

            if (num <= 0) {

                // insert new record

                bookList.insert(bookInfo);

                console.log('> New record has been inserted.');
                // callback

                if (callback) callback(err);


            } else {

                // update current record

                bookList.update({
                    'id': bookInfo.id
                }, bookInfo, { multi: false, upsert: false, writeConcern: {w:1, j: false}});

                if (callback) callback(err);

                console.log('> Record has been updated. Id:', bookInfo.id);

            }

        });
    }


    this.updateBookItem = function (id, key, content ,bookList) {

        var setModifier = { $set: {} };
        setModifier.$set[key] = content;


        bookList.update({ id: id }, setModifier);

        //console.log('> Item',key, 'Updated.');
    }



    this.getBookById = function (id, bookList, callback) {


        var cursor = bookList.find({
            'id': id
        });

        cursor.toArray(function (err, doc) {


            if (err) console.log(err);
            if (doc) callback(doc[0]);

        });
    }




    this.getCover = function (bookInfo, callback) {

        fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function (err, data) {

            if (err) {

                // file doesn't exist

                downloader.queue({
                    url: bookInfo.image,
                    dir: bookDir + bookInfo.id + '/' + 'image.jpg',
                    encoding: 'binary',
                    callback: function (err) {

                        // call back

                        if (!err) {

                            fs.readFile(bookDir + bookInfo.id + '/' + 'image.jpg', function (err, data) {

                                // no error to open the file

                                if (!err && callback) callback(null,data);

                            });
                        } else {

                            // error to download the file

                            if (callback) callback(err,null);
                        }

                    }
                });


            } else {

                // file exists

                if (callback) callback(null,data);

            }

        });


    }

    this.getBookInfo = function (bid, bookList, forceUpdate, callback) {

        var bookInfo;

        self.getBookById(bid, bookList,function (doc) {

            bookInfo = doc;

            if (!bookInfo || forceUpdate) {

                rq({
                    url: wenku.url + '/book/' + bid + '.htm',
                    encoding: null,
                    jar: wenku.jar
                }, function (err, respond, html) {

                    if (!err) {

                        // get basic book info

                        html = gbk.toString('utf-8', html);


                        var bookInfo = wenku.getBookInfo(html, bid);

                        if (bookInfo.id != '') {
                            // get chapter info

                            rq({
                                url: wenku.url + '/modules/article/packshow.php?id=' + bookInfo.id + '&type=txt',
                                encoding: null,
                                jar: wenku.jar
                            }, function (err, respond2, html) {

                                if (!err) {
                                    // if no error
                                    html = gbk.toString('utf-8', html);
                                    wenku.getChapterInfo(bookInfo, html);
                                    //console.log(bookInfo);

                                    // save info

                                    self.updateBookList(bookInfo, bookList);

                                    // callback

                                    callback(bookInfo);

                                    // get images

                                    wenku.getImages(bookInfo, function (err,cid,bookInfo,images) {

                                        // save images to local
                                        self.saveImages(cid, images, bookInfo, function (err,bookInfo) {

                                            // update cover
                                            if (!err) {
                                                //self.updateBookList(bookInfo, bookList);

                                                var key = 'chapters.' + cid + '.images';

                                                self.updateBookItem(bookInfo.id, key, bookInfo.chapters[cid].images, bookList);
                                                self.updateBookItem(bookInfo.id, 'imagesChecked', true, bookList);
                                            }
                                        });


                                    });
									
									// get txt version of chapters
									
									if(autoDownloadTxt){
									
										bookInfo.chapters.forEach(function (e, i, array){
											
											
											console.log('> Getting book: [' + bookInfo.title + '/' + i + '] content.');
											
											self.getBook(i, bookInfo, bookList, function(err,data) {
				

											// also get cover

											//self.getCover(bookInfo);
											
												if(autoConvert){

													console.log('> Got txt version of the book, converting....');
												
													self.queueToConvert(i, bookInfo, bookList, function (err, type, bookInfo) {
		   

													   if (!err) {

															//redirect to result page

															   
															console.log('> Converting: [' + e.title + '/' + i + ']');
														}
												   
													});
												}

											});

										});
										
									}

                                } else {


                                    console.log('Error: ', err);
                                }

                            });

                        }


                    } else {

                        console.log('> Error in getting book info!' + err);
                    }

                });

            } else {

                // get images

                if (!bookInfo.imagesChecked) {

                    // if image didn't check before

                    wenku.getImages(bookInfo, function (err, cid, bookInfo, images) {

                        // save images to local
                        self.saveImages(cid, images, bookInfo, function (err, bookInfo) {

                            // update cover
                            if (!err) {

                                var key = 'chapters.' + cid + '.images';
                                

                                self.updateBookItem(bookInfo.id, key, bookInfo.chapters[cid].images, bookList);
                                self.updateBookItem(bookInfo.id, 'imagesChecked', true, bookList);

                            }

                        });

                    });

                }
				
				// check local files
				
				self.checkLocalFiles(false ,bookInfo, bookList);
				
				// if bookInfo is already in data base!

                if(callback) callback(bookInfo);

            }


        });


    }
	
	
	this.checkBookUpdate = function (updatedBookList, bookList, callback){
		
		updatedBookList.forEach(function(e,i,array){
			
			if(i <= updateCheckLimit){
			
				self.getBookInfo(e.id, bookList, false, function(bi){
					
					if(bi.wenkuUpdate != e.wenkuUpdate){
						
						console.log('> book  [' + bi.title + '] has a update! Reimporting...');
						
						//self.getBookInfo(e.id, bookList, true, callback);
						
						
						// check the latest chapter
						wenku.getLastestChapter(e.id, function(chapterName){
							
							if(!chapterName){
								
								console.log('> Error getting the chapter name for book id:' + e.id + ', reimporting all.');
								
								self.getBookInfo(e.id, bookList, true, callback);
								
							} else {
								
								var result = false;
								var resultNum = 0;
								
								bi.chapters.forEach(function (chapter, chapterIndex, chapters){
									
									if(chapterName.includes(chapter.title)){
										
										result = true;
										resultNum ++;
										
										if(resultNum > 1) return false;
										
										console.log('> Updating book id:' + e.id + ', Chapter ' + chapter.title);
										
										// found the updated chapter
										// clean local files
										
										self.cleanChapterFilesSync(chapterIndex, bi, bookList);
										self.getChapterLocalContent(chapterIndex, bi, bookList);
										
										// update record
										self.updateBookItem(bi.id, 'wenkuUpdate', e.wenkuUpdate , bookList);
										self.updateBookItem(bi.id, 'lastUpdate', Date.now() , bookList);
										self.updateBookItem(bi.id, 'lastLocalFileCheck', 0 , bookList);
									
										
									}
								
								});
								
								
								// if there is not result, means there is a new chapter
								
								if(!result){
									
									// new chapter
									
									console.log('> Book id:' + e.id + ' has a new  Chapter ' + chapter.title);
									
									
									rq({
										url: wenku.url + '/modules/article/packshow.php?id=' + bookInfo.id + '&type=txt',
										encoding: null,
										jar: wenku.jar
									}, function (err, respond2, html) {
										
										 if (!err) {
											// if no error
											html = gbk.toString('utf-8', html);
											bi = wenku.getChapterInfo(bi, html);
											
											
											// find out the latest chapter
											bi.chapters.forEach(function (chapter, chapterIndex, chapters){
									
												if(chapterName.includes(chapter.title)){
													
													console.log('> Getting local content for new  Chapter ' + chapter.title);
													
													// got ya, get local content
													
													self.getChapterLocalContent(chapterIndex, bi, bookList);
													
													
													// update record
													self.updateBookItem(bi.id, 'chapters', bi.chapters , bookList);
													self.updateBookItem(bi.id, 'wenkuUpdate', e.wenkuUpdate , bookList);
													self.updateBookItem(bi.id, 'lastUpdate', Date.now() , bookList);
													self.updateBookItem(bi.id, 'lastLocalFileCheck', 0 , bookList);
													
													
												}
											});
											
											
										 }
										
										
									});
									
								}
								
								if(resultNum > 1){
									
									// if there is multiple results
									
									console.log('> Multiple results for book id:' + e.id + ", reimporting all.");
								
									self.getBookInfo(e.id, bookList, true, callback);
									
								}
							}
							
						});
						
					} else {
						
						console.log('> book [' + bi.title + '] does not has a update.');
						
						if(callback) callback();
						
					}
					
				});
			}
			
		});
		
	}
	
	this.getChapterLocalContent = function(chapterIndex, bi, bookList){
		
		
		// get image

		wenku.getImages(bi, function (err,cid,bookInfo,images) {

			// save images to local
			self.saveImages(cid, images, bookInfo, function (err,bookInfo) {
				
				if(cid != i) return false;

				// update cover
				if (!err) {
					//self.updateBookList(bookInfo, bookList);

					var key = 'chapters.' + cid + '.images';

					self.updateBookItem(bi.id, key, bi.chapters[cid].images, bookList);
					self.updateBookItem(bi.id, 'imagesChecked', true, bookList);
				}
			});


		});
		
		
		// get local file and convert!
		
		console.log('> Getting book: [' + bi.title + '/' + chapterIndex + '] content.');
		
		self.getBook(chapterIndex, bi, bookList, function(err,data) {
		
			if(autoConvert){

				console.log('> Got txt version of the book, converting....');
			
				self.queueToConvert(chapterIndex, bi, bookList, function (err, type, bookInfo) {


				   if (!err) {

						//redirect to result page

						   
						console.log('> Converting: [' + bi.title + '/' + chapterIndex + ']');
					}
			   
				});
			}

		});	
		
		
	}
	
	
	this.cleanChapterFilesSync = function (cid, bookInfo, bookList){
		
		var txtDir = bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt';
		var epubDir = bookDir + bookInfo.id + '/epub/' + bookInfo.chapters[cid].vid + '.epub';
		var mobiDir = bookDir + bookInfo.id + '/mobi/' + bookInfo.chapters[cid].vid + '.mobi';
		
		// removing txt file
		fs.rmdirSync(txtDir);
		
		// removing epub file
		fs.rmdirSync(epubDir);
		
		// removing mobi file
		fs.rmdirSync(epubDir);
		
		// update records
		
		self.updateBookItem(bookInfo.id, 'chapters.' + cid + '.localFiles.txt', false, bookList);
		self.updateBookItem(bookInfo.id, 'chapters.' + cid + '.localFiles.epub', false, bookList);
		self.updateBookItem(bookInfo.id, 'chapters.' + cid + '.localFiles.mobi', false, bookList);
		
	}
	
	this.checkLocalFiles = function (forceCheck ,bookInfo, bookList){
		
		
		
		
		// for each chapter, check local file
		// check only every one minute
		
		if(forceCheck || !bookInfo.lastLocalFileCheck || Date.now() - bookInfo.lastLocalFileCheck >= 60000){
			
			console.log('> Check local file of: ' + bookInfo.title);
		
			bookInfo.chapters.forEach(function (e, i, array){
				
				

				// check txt version first
				
				var txtDir = bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[i].vid + '.txt';
				
				//console.log('> Checking ' + txtDir);
				
				fs.access(txtDir, 'wr', (err) => {
					
					if(err){
						
						//console.log('> book ' + bookInfo.title + ', chapter ' + i + ' txt version does not exist! ');
						
						var key = 'chapters.' + i + '.localFiles.txt';
						var content = false;


						self.updateBookItem(bookInfo.id, key, content, bookList);
						
					} else {
						
						//console.log('> book ' + bookInfo.title + ', chapter ' + i + ' txt version exist! ');
						
						var key = 'chapters.' + i + '.localFiles.txt';
						var content = true;


						self.updateBookItem(bookInfo.id, key, content, bookList);
					}
					
				});
				
				
				// check epub version
				
				var epubDir = bookDir + bookInfo.id + '/epub/' + bookInfo.chapters[i].vid + '.epub';
				
				fs.access(epubDir , 'wr', (err) => {
					
					if(err){
						
						//console.log('> book ' + bookInfo.title + ', chapter ' + i + ' epub version does not exist! ');
						
						var key = 'chapters.' + i + '.localFiles.epub';
						var content = false;


						self.updateBookItem(bookInfo.id, key, content, bookList);					
						
						
					} else {
						
						//console.log('> book ' + bookInfo.title + ', chapter ' + i + ' epub version exist! ');
						
						var key = 'chapters.' + i + '.localFiles.epub';
						var content = true;


						self.updateBookItem(bookInfo.id, key, content, bookList);	
					}
					
				});


				// check mobi version
				
				var mobiDir = bookDir + bookInfo.id + '/mobi/' + bookInfo.chapters[i].vid + '.mobi';
				
				fs.access(mobiDir, 'wr', (err) => {
					
					if(err){
						
						//console.log('> book ' + bookInfo.title + ', chapter ' + i + ' mobi version does not exist! ');
						
						var key = 'chapters.' + i + '.localFiles.mobi';
						var content = false;


						self.updateBookItem(bookInfo.id, key, content, bookList);	
						
						
						
					} else {
						
						//console.log('> book ' + bookInfo.title + ', chapter ' + i + ' mobi version exist! ');
						
						var key = 'chapters.' + i + '.localFiles.mobi';
						var content = true;


						self.updateBookItem(bookInfo.id, key, content, bookList);	
					}
					
				});
				
				
				// update time
				
				
				self.updateBookItem(bookInfo.id, 'lastLocalFileCheck', Date.now(), bookList);	
			
			});
		}
		
	}


    this.getBook = function (cid, bookInfo,bookList, callback) {


        // check local
        fs.readFile(bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt', 'utf8', function (err, data) {

            if (err) {

                // file doesnt exists



                // download from online

                downloader.queue({
                    url: bookInfo.chapters[cid].url,
                    dir: bookDir + bookInfo.id + '/txt/' + bookInfo.chapters[cid].vid + '.txt',
                    encoding: 'utf8',
                    callback: function (err) {

                        // update record
                        if (!err) {

                            bookInfo.chapters[cid].localFiles.txt = true;
                            self.updateBookList(bookInfo, bookList);

                            // call back

                            callback(null, data);
                        }
                        


                    }
                });



            } else {

                if (!bookInfo.chapters[cid].localFiles.txt) {

                    bookInfo.chapters[cid].localFiles.txt = true;
                    self.updateBookList(bookInfo, bookList);
                }

                // file exists

                callback(err,data);
            }

        });

    }


    this.saveImages = function (cid, images, bookInfo, callback) {

        if (!bookInfo) return null;

        vid = bookInfo.chapters[cid].vid;

        images.forEach(function (element, index, array) {

            // ask downloader to download image

            var localDir = bookDir + bookInfo.id + '/images/' + bookInfo.chapters[cid].vid + '/' +index + '.jpg';

            downloader.queue({
                url: element,
                dir: localDir,
                encoding: 'binary',
                callback: function () {

                    bookInfo.chapters[cid].images[index] = localDir;
                    

                    // call back

                    if (callback) callback(null,bookInfo);

                }
            });



        });

    }


    this.getRecentBooks = function (num, bookList, callback) {


        // get latest updated novels

        if (num <= 0) return false;

        var cursor = bookList.find().sort({ lastUpdate: -1 }).limit(num).toArray(function (err, doc) {

            if (!err) {

                if (callback) callback(null, doc);

            } else {

                if (callback) callback(err, null);

            }


        });



    }

    this.queueToConvert = function (cid, bookInfo, bookList, callback) {

        converter.queue(cid, bookInfo, function (err, t) {

            if (!err) {

                // based on different type, return callback

                if (t == 'epub') {

                    // update bookInfo, tell it local file is ready.

                    console.log('> Update .epub local file..', bookInfo.title, bookInfo.chapters[cid].title);


                    var key = 'chapters.' + cid + '.localFiles.epub';
                    var content = true;


                    self.updateBookItem(bookInfo.id, key, content, bookList);
					self.updateBookItem(bookInfo.id, 'lastUpdate', Date.now(), bookList);


                } else if (t == 'mobi') {

                    // update bookInfo

                    console.log('> Update .mobi local file..', bookInfo.title, bookInfo.chapters[cid].title);


                    var key = 'chapters.' + cid + '.localFiles.mobi';
                    var content = true;


                    self.updateBookItem(bookInfo.id, key, content, bookList);
					self.updateBookItem(bookInfo.id, 'lastUpdate', Date.now(), bookList);


                } else {

                    // callback only when successfully queued
					
					self.updateBookItem(bookInfo.id, 'lastUpdate', Date.now(), bookList);

                    callback(null);
                }

            } else {

                callback(err,null);

            }

        });

    }


    this.getHotBooks = function (num, bookList, callback) {


        // get latest updated novels

        if (num <= 0) return false;

        var cursor = bookList.find().sort({ hotIndex: 1 }).limit(num).toArray(function (err, doc) {

            if (!err) {

                if (callback) callback(null, doc);

            } else {

                if (callback) callback(err, null);

            }


        });

    }

    this.getRandomBooks = function (num,bookList,callback) {

        if (num <= 0) return false;

        var totalNum;

        bookList.find().count(function (err,numb) {

            totalNum = numb;

            if (num >= totalNum) {

                // if there isnt enough number of records

                var cursor = bookList.find().limit(totalNum).toArray(function (err, doc) {

                    if (callback) callback(err, doc);

                });

            } else {

                // if there is enough number of records

                var rand = parseInt(Math.random() * (totalNum - 1));

                var sortRandom = Math.random();
                var sort;

                // random sort methords

                if (sortRandom > 0.9) {

                    sort = { _id: 1 };
                } else if (sortRandom > 0.8) {

                    sort = { _id: -1 };
                } else if (sortRandom > 0.7) {

                    sort = { lastUpdate: 1 };

                } else if (sortRandom > 0.6) {

                    sort = { lastUpdate: -1 };
                } else if (sortRandom > 0.5) {

                    sort = { id: 1 };

                } else if (sortRandom > 0.4) {

                    sort = { id: -1 };
                } else if (sortRandom > 0.3) {

                    sort = { lastUpdate: -1 };

                } else if (sortRandom > 0.2) {

                    sort = { lastUpdate: -1 };
                } else if (sortRandom > 0.1) {

                    sort = { wenkuUpdate: 1 };

                } else if (sortRandom > 0.0) {

                    sort = { wenkuUpdate: -1 };
                }




                var cursor = bookList.find().sort(sort).skip(rand).limit(num).toArray(function (err, doc) {

                    if (callback) callback(err, doc);

                });

            }



        });

        


    }





}



module.exports = new books();