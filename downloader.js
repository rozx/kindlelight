// required modules
var rq = require('request');
var fs = require('fs-extra');

// main function
function downloader() {

    var self = this;
    var jar;
    var queueList = [];
    var taskFilePath = './data/tasks/downloader.task';
    var READY = 0,
        DOWNLOADING = 1,
        WRITTING = 2,
        ERROR = 3,
        STOPPED = 4;
    var status;


    this.init = function(autoStart) {

        status = READY;

        if (autoStart) self.Start();

        // check if task exists

        fs.ensureFile(taskFilePath, function(err) {

            if (!err) {

                // if so, read it

                console.log('Downloader > Reading task list..');

                fs.readJson(taskFilePath, function(err, packageObj) {

                    queueList = packageObj;

                })
            }
        });

        // check if queueList is undefined

        if (queueList == undefined) queueList = [];

    }


    this.start = function() {

        if (status == READY && queueList.length > 0) {

            self.download(0);

        }

    }

    this.stop = function() {

        status = STOPPED;
    }

    this.queue = function(task) {

        // task = {url : 'xxx.com/a.txt', dir : './data/book/1234/a.txt',encoding : 'utf8',callback : function}

        if (!task.url) return false;

        if (!queueList) queueList = [];

        if (queueList.length == 0 && status == READY) {

            queueList.push(task);

            self.download(0);

            console.log('Downloader > New task queued and start downloading:', task.url);

        } else {

            queueList.push(task);

            console.log('Downloader > New task queued :', task.url);

            if (status == READY || status == STOPPED) self.start();
        }

        self.save();

    }

    this.remove = function(id) {

        if (queueList[id]) {

            delete(queueList[0]);
            queueList.splice(0, 1);



            this.save();

            return true;

        } else {

            return false;
        }

    }


    this.download = function(index) {

        if (status == READY) {



            // make sure it is at the begging of the list

            if (index != 0) {

                var item = queueList(index);

                queueList.splice(index, 1);
                queueList.unshift(item);

            }


            //console.log(queueList,status);
            status = DOWNLOADING;

            // start downloading

            if (queueList[0].encoding == 'binary') {


                console.log('Downloader > Downloading binary file..');
                // if it is binary file

                fs.ensureFile(queueList[0].dir, function(err) {

                    if (!err) {


                        // ensured path exists

                        rq
                            .get(queueList[0].url)
                            .on('response', function(response) {

                                if (response.statusCode != 200) {

                                    console.log('Downloader > Error when downloading! Code:'.response.statusCode);
                                    
                                    self.remove(0);
                                    status = READY;
                                    self.start();

                                }
                            })


                        .pipe(fs.createWriteStream(queueList[0].dir).on('close', function() {
							
                            // callback
                            if (queueList[0].callback) queueList[0].callback();

                            console.log('Downloader > file saved to:', queueList[0].dir);
                            self.remove(0);
                            status = READY;
                            self.start();

                        }));

                    } else {

                        console.log('Downloader > Error when downloading!');

                        self.remove(0);
                        status = READY;
                        self.start();
                    }

                })

            } else {

                // else 

                var data;

                var read = rq.get({
                        url: queueList[0].url,
                        jar: jar,
                        encoding: queueList[0].encoding
                    })
                    .on('response', function(response) {

                        console.log(response.statusCode) // 200

                        if (response.statusCode == 200) {

                            console.log('Downloader > Start downloading.');
                        }


                    })

                .on('error', function(err) {


                    console.log('Downloader > Error when downloading!');
                    self.remove(0);
                    status = READY;
                    self.start();
                })

                .on('data', function(chunk) {

                    data += chunk;

                    //console.log(chunk.length);
                })


                .on('end', function() {

                    console.log('Downloader > Finished download :', queueList[0].url);

                    // callback
                    if (queueList[0].callback) queueList[0].callback(data);


                    // write file

                    if (queueList[0].dir) {

                        fs.outputFile(queueList[0].dir, data, (err) => {

                            if (!err) {

                                console.log('Downloader > file saved.');

                            } else {

                                console.log('Downloader >', err);

                            }

                        });

                    }


                    self.remove(0);
                    status = READY;
                    self.start();

                });


            }




        } else {

            // if it is busy, add the task at the second position

            var item = queue(index);
            queueList.splice(index, 1);
            queueList.splice(1, 0, item);

        }



        return 0;
    }

    this.save = function() {

        fs.outputJson(taskFilePath, queueList, function(err) {

            if (!err) {

                console.log('Downloader > task file saved to local.');

            } else {


                console.log('Downloader > ', err);
            }


        });

    }


}


// export module
module.exports = new downloader();
