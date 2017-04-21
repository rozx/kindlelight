#kindlelight
a light novel site for kindle.
It will automatically download files from online and convert it to .mobi file.

source: wenku8.
language: Chinese

基本上就是个人用的轻小说kindle转换器 (-. -)

Important: increase stack size by using 'node --stack-size=val' to prevent the RangeError

CMD: sudo pm2 start kindleLight.js --node-args="--stack-size=65536"

## V0.3
+ Added loacl file check
+ Added download and convert at when new book was inserted.
+ Fixed the coverting error when cover is not found.
+ More minor bugs fixed.

## V0.2c
+ Updated all plugins and urls.
+ Fixed: Converter bug: error when title is too long

## V0.2b
+ Added: downloader and converter status.
+ Fixed: Converter bugs - no callback when finish converting.
+ Fixed: Downloader bugs - crashing when failed to solve dns.


## V0.2a
+ Added: BookInfo page.
+ Added: Local file check.
+ Added: Redirect to result page.
+ Fixed: lots bugs.

## V0.2
+ Added: Index page using ejs.
+ Added: Recent added books and hot books query.
+ Fixed: Cover image on kindle.



## V0.1.1
+ Reworte downloader, now muti-threads enabled.
+ Add duplicate check for converter.
+ Bugs fixed.

## V0.1a
+ Bugs fixed.
+ Now it is able to download images to local.
+ Able to download files.
+ Next: muti-thread download, frontend.

## V0.1
+ Fixed lot's of bugs.
+ Now able to get images.
+ Sepreate books function from main.js.
+ Lots lots lots changes...?
+ New Domain: <a href="http://kindlelight.mobi">http://kindlelight.mobi</a>

## v0.0.9c
+ Fixed converter's tasklist issues.
+ Fixed converter's queue issue.
+ Fixed converter's callback issue.
+ Fixed converter's cover issue.
+ TODO: images from novel, child process management.


## v0.0.9b
+ Bugs fixed.

## v0.0.9
+ Added epub to mobi convertion.
+ Bugs fixed.

## v0.0.8b
+ Minor bugs fixed.
+ Add ending page.
+ Tested .mobi file.
+ Next: convert to .mobi within the program.


## v0.0.8
+ Converter is now working(60%)
+ Next: Convert epud to mobi.


## v0.0.7c
+ Serving favicon.ico
+ Dupilcate requests solved(hopefully).
+ Reworte package.json

## v0.0.7b
+ Now using TingoDB.


## v0.0.7
+ Local file storage(cover,book,conf).
+ Downloader - 90%


## v0.0.6
+ Downloader - 60%
+ Now able to download books and save it to local.



## v0.0.5c
+ Working on downloader.. (20%)

## v0.0.5
+ Now it is able to get novel's chapter info.


## v0.0.4
+ Get Novel info.


## v0.0.3b
+ Add check user login status.



## v0.0.3
+ Added cookies local storage.

- TO DO next: check login.



## v0.0.2

+ Added gbk support.
+ Added cookie support.
+ minor changes.

- TO DO next: cookies local storage, actual login check.

## v0.0.1

init version with github, finally getting it started!

+ server setup!

