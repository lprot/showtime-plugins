/**
 * fs.ua plugin for Movian Media Center
 *
 *  Copyright (C) 2015 lprot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

(function(plugin) {
    var logo = plugin.path + "logo.jpg";

    var folderList = [];

    var service = plugin.createService(plugin.getDescriptor().id, plugin.getDescriptor().id + ":start", "video", true, logo);

    var settings = plugin.createSettings(plugin.getDescriptor().id, logo, plugin.getDescriptor().synopsis);
    settings.createDivider('Settings');
    settings.createString('baseUrl', "Base URL without '/' at the end", 'http://fs.to', function(v) {
        service.baseUrl = v;
    });

	////////////////////////////////////////////Login of site & Exit of site///////////////////////////////////////
	
	settings.createDivider('Авторизация на FS.TO');	
	var store = plugin.createStore('authinfo', true);
	
	// Залогинится
	settings.createAction('createAuth', 'Войти на сайт', function login(){	
		var credentials = plugin.getAuthCredentials(plugin.getDescriptor().synopsis, 
		                                            'Пожалуйста введите свой логин и пароль от сайта', true);    
		
		if (credentials.rejected) {
            showtime.notify('Для завершения авторизации вы должны ввести логин и пароль вашего аккаунта', 5, '');
            return;
        }
	    if (credentials.username && credentials.password) {			
	        var doc = showtime.httpReq(service.baseUrl.toString() + "/login.aspx", {
			    headers: {"Accept": "application/json, text/javascript, */*; q=0.01",
                          "Accept-Language": "ru,en-US;q=0.7,en;q=0.3",
                          "Accept-Encoding": "gzip, deflate",
                          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                          "X-Requested-With": "XMLHttpRequest",
                          "Referer": "http://fs.to/",
                          "Connection": "keep-alive",
                          "Pragma": "no-cache",
                          "Cache-Control": "no-cache",},
                postdata: "login=" + credentials.username + "&passwd=" + credentials.password + "&remember=1",
			    noFail: true,
			    debug: true,
				noFollow: true
            });
			  
			showtime.notify("Отсылаем запрос на авторизацию", 5, '');
			//if (doc.statuscode == 200){ //Available only from 4.99.211 version
			    if (doc.toString().match(/"state":"auth_success"/) || doc.toString().match(/isLogged : true/)) {
			        store.access_data = { username : credentials.username, password : credentials.password };
			        showtime.notify("Авторизация успешна", 5, '');
				} else if (doc.toString().match(/"state":"auth_error"/) || doc.toString().match(/isLogged : false/)){
					        showtime.notify("Авторизация не удачна, логин или пароль введены неверно.", 5, '');
							login();
						} else showtime.notify("Что то здесь не так нужно разобраться", 5, '');
			//} else {showtime.notify("Запрос на авторизацию не удачен, статус=" + doc.statuscode , 5, '');}			
        } else {
	        showtime.notify('Для завершения авторизации вы должны ввести логин и пароль вашего аккаунта', 5, '');
            login();				
		}
	});
	
	// Разлогинится
	settings.createAction('clearAuth', 'Выйти с сайта', function() {
	    var confirm = showtime.message("Вы уверены, что хотите разлогинится на сайте", true, true);
	    if (confirm){
	        store.access_data = {};
	   		var doc = showtime.httpReq(service.baseUrl.toString() + "/logout.aspx", { 
	    	    headers: {"Accept": "application/json, text/javascript, */*; q=0.01",
                          "Accept-Language": "ru,en-US;q=0.7,en;q=0.3",
                          "Accept-Encoding": "gzip, deflate",
                          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                          "X-Requested-With": "XMLHttpRequest",
                          "Referer": "http://fs.to/",
                          "Connection": "keep-alive",
                          "Pragma": "no-cache",
                          "Cache-Control": "no-cache",},
                postdata: "",
	    	    noFail: true,
	    	    debug: true,
	    		noFollow: true
            });
            showtime.notify('Movian разлогинен на FS.TO', 3, '');
		}
    });
 
 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function setPageHeader(page, title) {
        if (page.metadata) {
            page.metadata.title = title;
            page.metadata.logo = logo;
        }
        page.type = "directory";
        page.contents = "items";
        page.loading = true;
    }

    // remove multiple, leading or trailing spaces and line feeds
    function trim(s) {
        if (s) return s.replace(/(\r\n|\n|\r)/gm, "").replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, " ").replace(/\t/g,'');
        return '';
    }

    function removeSlashes(s) {
        return s.replace(/\\'/g, '\'').replace(/\\"/g, '"').replace(/\\0/g, '\0').replace(/\\\\/g, '\\');
    }

    function blueStr(str) {
        return '<font color="6699CC">' + str + '</font>';
    }

    var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45',  white = 'FFFFFF';

    function colorStr(str, color) {
        return '<font color="' + color + '">(' + str + ')</font>';
    }

    function coloredStr(str, color) {
        return '<font color="' + color + '">' + str + '</font>';
    }

    function getFontColor(type) {
        switch (type) {
            case "Видео":
                return '"FFDE00"';
            case "Аудио":
                return '"FF0000"';
            case "Игры":
                return '"92CD00"';
            case "Литература":
                return '"6699CC"';
            default:
                return '"FFDE00"';
        }
    }

    function getType(type) {
        type = type.toLowerCase();
        switch (type) {
            case "mkv":
            case "avi":
            case "flv":
            case "mp4":
            case "mov":
            case "ts":
            case "mpg":
            case "mpeg":
            case "vob":
            case "iso":
            case "m4v":
            case "wmv":
            case "m2ts":
                return "video";
            case "jpg":
            case "jpeg":
            case "png":
            case "bmp":
            case "gif":
                return "image";
            case "mp3":
            case "flac":
            case "wav":
            case "ogg":
            case "aac":
            case "m4a":
            case "ape":
            case "dts":
            case "ac3":
            case "opus":
                return "audio";
            default:
                return "file";
        }
    }

    // Appends the item and lists it's root folder
    plugin.addURI(plugin.getDescriptor().id + ":screens:(.*):(.*)", function(page, screens, title) {
        setPageHeader(page, unescape(title));
        screens = unescape(screens);
        var re = /rel="([\S\s]*?)"/g;
        var m = re.exec(screens);
        var i = 0;
        while (m) {
            i++;
            page.appendItem(m[1], "image", {
                title: 'Скриншот' + i
            });
            m = re.exec(screens);
        };
        page.loading = false;
    });

    // Appends the item and lists it's root folder
    plugin.addURI(plugin.getDescriptor().id + ":listRoot:(.*):(.*)", function(page, url, title) {
        title = unescape(title).replace(/(<([^>]+)>)/ig).replace(/undefined/g,'');
        setPageHeader(page, title);
        var response = showtime.httpReq(service.baseUrl + url).toString();

        // Scrape icon
	var icon = response.match(/<link rel="image_src" href="([^"]+)"/);
	if (icon) icon = "http:" + icon[1];

        // Scrape description
	var description = response.match(/<p class="item-decription [^"]+">([\S\s]*?)<\/p>/);
	if (description) description = coloredStr("Описание: ", orange) + description[1]; else description = '';

        // Scrape duration
        var duration = response.match(/itemprop="duration"[\S\s]*?>([\S\s]*?)<\/span>/);
        if (duration) duration = duration[1].trim().substr(0, 8);

        // Scrape item info
        var iteminfo = response.match(/<div class="item-info">([\S\s]*?)<\/div>/);
        if (iteminfo) {
           iteminfo = iteminfo.toString();
           // Scrape years
           var year = iteminfo.match(/Год:[\S\s]*?<span>([\S\s]*?)<\/span>/);
           if (year) {
              year = year[1];
           } else { // handle as serials
              year = iteminfo.match(/показа:[\S\s]*?<span>([\S\s]*?)<\/span>[\S\s]*?<span>([\S\s]*?)<\/span>/);
              if (year) year = year[1];
           };

           // Scrape genres
           var htmlBlock = iteminfo.match(/itemprop="genre"([\S\s]*?)<\/td>/);
           // Try to handle as shows
           if (!htmlBlock) htmlBlock = iteminfo.match(/Жанр:([\S\s]*?)<\/tr>/);
           if (htmlBlock) {
              var genres = '';
              var notFirst = 0;
              var re = /<span>([\S\s]*?)<\/span>/g;
              var m = re.exec(htmlBlock[1]);
              while (m) {
                    if (!notFirst) genres = genres + m[1]; else genres = genres + ", " + m[1];
                    notFirst++;
                    m = re.exec(htmlBlock[1]);
              };
           }; // Scrape genres

           // Try to get status
           htmlBlock = iteminfo.match(/Статус:[\S\s]*?<\/td>[\S\s]*?>([\S\s]*?)<\/td>/);
           if (htmlBlock)
              description = coloredStr("Статус: ", orange) + trim(htmlBlock[1]) + " " + description;
        };
        // Scrape votes
        htmlBlock = response.match(/<div class="b-tab-item__vote-value m-tab-item__vote-value_type_yes">([\S\s]*?)<\/div>[\S\s]*?<div class="b-tab-item__vote-value m-tab-item__vote-value_type_no">([\S\s]*?)<\/div>/);
        if (htmlBlock) {
            description = '(' + coloredStr(htmlBlock[1], green) + '/' + coloredStr(htmlBlock[2], red) + ') ' + description;
        } // Scrape votes

        // scrape original title
        htmlBlock = response.match(/itemprop="alternativeHeadline">([\S\s]*?)<\/div>/);
        if (htmlBlock) {
            title += ' | ' + htmlBlock[1];
            page.metadata.title += ' | ' + htmlBlock[1];
        }

        playOnlineUrl = url;
        page.appendItem(plugin.getDescriptor().id + ":playOnline:" + escape(title), "video", {
            title: new showtime.RichText(title),
            duration: duration,
            icon: icon,
            year: +year,
            genre: genres,
            description: new showtime.RichText(description)
        });

        // Scrape trailer
        htmlBlock = response.match(/window\.location\.hostname \+ '([\S\s]*?)'/);
        if (htmlBlock) {
            page.appendItem(service.baseUrl + htmlBlock[1], "video", {
                title: 'Трейлер',
                icon: icon
            });
        } // Scrape trailer

        // Scrape screenshots
        htmlBlock = response.match(/<div class="items">([\S\s]*?)<\/div>/);
        if (htmlBlock) {
            if (trim(htmlBlock[1])) {
                page.appendItem(plugin.getDescriptor().id + ':screens:' + escape(htmlBlock[1])+':'+escape(title), "directory", {
                    title: 'Скриншоты'
                });
            }
        } // Scrape screenshots

        var what_else = response.match(/<div class="b-posters">([\S\s]*?)<div class="clear">/);

        // list files/folders
        page.loading = true;
        try {
            processAjax(page, url, 0, title);
        } catch(err) {
            showtime.trace(err);
        }

        if (iteminfo) {
            // Show year
            var year = iteminfo.match(/Год:[\S\s]*?<a href="([\S\s]*?)"[\S\s]*?<span>([\S\s]*?)<\/span>/);
            if (year) {
                page.appendItem("", "separator", {
                    title: 'Год'
                });
                page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + year[1]) + ":" + escape(year[2]) + ':no:&sort=rating', "directory", {
                    title: year[2]
                });
            } else { // handle as serials
                year = iteminfo.match(/показа:[\S\s]*?<a href="([\S\s]*?)"[\S\s]*?<span>([\S\s]*?)<\/span>[\S\s]*?<span>([\S\s]*?)<\/span>/);
                if (year && !year[2].match(/span/)) {
                    page.appendItem("", "separator", {
                        title: 'Год'
                    });
                    page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + year[1]) + ":" + escape(year[2]) + ':no:&sort=rating', "directory", {
                        title: year[2]
                    });
                }
            };

            // Scrape genres
            htmlBlock = iteminfo.match(/itemprop="genre"([\S\s]*?)<\/td>/);
            // Try to handle as shows
            if (!htmlBlock) htmlBlock = iteminfo.match(/Жанр:([\S\s]*?)<\/tr>/);
            if (htmlBlock) {
                page.appendItem("", "separator", {
                    title: 'Жанр'
                });
                var re = /<a href="([\S\s]*?)"[\S\s]*?<span>([\S\s]*?)<\/span>/g;
                var m = re.exec(htmlBlock[1]);
                while (m) {
                    page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + m[1]) + ":" + escape('Отбор по жанру: '+m[2]) + ':no:&sort=year', "directory", {
                        title: m[2]
                    });
                    m = re.exec(htmlBlock[1]);
                };
            }; // Scrape genres

            // Scrape countries
            var htmlBlock = iteminfo.match(/Страна:([\S\s]*?)<\/tr>/);
            if (htmlBlock) {
                page.appendItem("", "separator", {
                    title: 'Страна'
                });
                var re = /<a href="([\S\s]*?)"[\S\s]*?<\/span>([\S\s]*?)<\/span>/g;
                var m = re.exec(htmlBlock[1]);
                while (m) {
                    page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + m[1]) + ":" + escape('Отбор по стране: '+trim(showtime.entityDecode(m[2]))) + ':no:&sort=year', "directory", {
                        title: trim(showtime.entityDecode(m[2]))
                    });
                    m = re.exec(htmlBlock[1]);
                };
           }; // Scrape countries

            // Show directors
            htmlBlock = iteminfo.match(/itemprop="director"([\S\s]*?)<\/td>/);
            if (htmlBlock) {
                page.appendItem("", "separator", {
                    title: 'Режиссеры'
                });
                //1-link, 2-title
                var re = /<a href="([\S\s]*?)"[\S\s]*?<span itemprop="name">([\S\s]*?)<\/span>/g;
                var m = re.exec(htmlBlock[1]);
                while (m) {
                    page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + m[1]) + ":" + escape('Отбор по режиссеру: '+m[2]) + ':no:&sort=year', "directory", {
                        title: m[2]
                    });
                    m = re.exec(htmlBlock[1]);
                };
            };
            // Show actors
            htmlBlock = iteminfo.match(/itemprop="actor"([\S\s]*?)<\/td>/);
            if (htmlBlock) {
                page.appendItem("", "separator", {
                    title: 'Актеры'
                });
                //1-link, 2-title
                var re = /<a href="([\S\s]*?)"[\S\s]*?<span itemprop="name">([\S\s]*?)<\/span>/g;
                var m = re.exec(htmlBlock[1]);
                while (m) {
                    page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + m[1]) + ":" + escape('Отбор по актеру: '+m[2]) + ':no:&sort=year', "directory", {
                        title: m[2]
                    });
                    m = re.exec(htmlBlock[1]);
                };
            } else { // Try to handle as shows
                htmlBlock = iteminfo.match(/Ведущие:([\S\s]*?)<\/tr>/);
                if (htmlBlock) {
                    page.appendItem("", "separator", {
                        title: 'Ведущие'
                    });
                    //1-link, 2-title
                    var re = /<a href="([\S\s]*?)"[\S\s]*?<span>([\S\s]*?)<\/span>/g;
                    var m = re.exec(htmlBlock[1]);
                    while (m) {
                        page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + m[1]) + ":" + escape('Отбор по ведущему: '+m[2]) + ':no:&sort=year', "directory", {
                            title: m[2]
                        });
                        m = re.exec(htmlBlock[1]);
                    };
                }
            }; // handle as shows
        };

        // Show related
        if (what_else) {
            what_else = what_else[1];
            page.appendItem("", "separator", {
                title: 'Похожие материалы'
            });
            // 1 - link, 2 - image, 3 - title
            re = /<a href="([^"]+)[\S\s]*?url\('([^']+)[\S\s]*?<span class="m-poster-new__full_title">([\S\s]*?)<\/span>/g;
            m = re.exec(what_else);
            while (m) {
                title = m[3].replace('<p>', " / ").replace('</p><p>', " ").replace('</p>', "");
                page.appendItem(plugin.getDescriptor().id + ":listRoot:" + m[1] + ":" + escape(title), "video", {
                    title: new showtime.RichText(title),
                    icon: setIconSize(m[2], 2)
                });
                m = re.exec(what_else);
            }
        }

        // Show comments
        var commented = response.match(/linkreview: '\/review\/(.*)'/);
        if (commented) {
            var tryToSearch = true, id = commented[1], counter = 0;;

            function loader() {
                if (!tryToSearch) return false;
                commented = showtime.httpReq(service.baseUrl + '/review/list/' + id + '?loadedcount=' + counter).toString();
                if (!counter)
                    var count = commented.match(/<p class="b-item-material-comments__count">([\S\s]*?)<\/p>/);
                    if (!count)
                        return tryToSearch = false;
                    page.appendItem("", "separator", {
                        title: count[1].replace('<span itemprop="reviewCount">', '').replace('</span>', '').replace('  ', ' ')
                    });

                // 1-icon, 2-nick, 3-datetime, 4-positive, 5-negative, 6-description
                re = /url\('([\S\s]*?)'\);[\S\s]*?<span itemprop="reviewer">([\S\s]*?)<\/span>[\S\s]*?datetime="[\S\s]*?">([\S\s]*?)<\/time>[\S\s]*?<span class="b-item-material-comments__item-answer-value">([\S\s]*?)<\/span>[\S\s]*?<span class="b-item-material-comments__item-answer-value">([\S\s]*?)<\/span>[\S\s]*?itemprop="description">([\S\s]*?)<\/div>/g;
                var match = re.exec(commented);
                while (match) {
                    page.appendPassiveItem('video', '', {
                        title: new showtime.RichText(trim(match[2]) + ' (' + coloredStr(match[4], green) + ' / ' + coloredStr(match[5], red) + ') ' + trim(match[3])),
                        icon: setIconSize(match[1], 1),
                        description: new showtime.RichText(match[6])
                    });
                    match = re.exec(commented);
                    counter++;
                }
                if (commented.match(/data-count="end"/)) return tryToSearch = false;
                return true;
            }
            loader();
            page.paginator = loader;
        }
        page.loading = false;
    });

    function getId(id) {
        if (id.indexOf(',') > -1)
            id = id.substr(0, id.indexOf(','));
        return id.replace(/\'/g, '');
    }

    function getQualities(blob) {
        // 1-filter value, 2-visual name
        var re = /name="([\s\S]*?)">([\s\S]*?)<\/a>/g;
        var match = re.exec(blob);
        var first = true;
        var out = [];
        while (match) {
            var item = {
                filter: match[1],
                name: match[2]
            };
            out.push(item)
            match = re.exec(blob);
        }
        if (!out.length)
            out.push({
                filter: '0',
                name: ''
            });
        return out;
    }

    function processAjax(page, url, folder, title, quality) {
        page.loading = true;
        //showtime.print(service.baseUrl + unescape(url) + '?ajax&blocked=0&folder=' + folder);
        var response = showtime.httpReq(service.baseUrl + unescape(url) + '?ajax&blocked=0&folder=' + folder).toString();
        response = response.substr(response.indexOf('class="filelist'), response.lastIndexOf('</ul>'));
        response = response.replace(/<ul class="filelist([\s\S]*?)<\/ul>/g, '');
        // 1-type(folder/file), 2-body
        var re = /<li class="([^"]+)([\S\s]*?)(<\/li>|"  >)/g;
        var m = re.exec(response);
        folderList = [];
        var pos = 0;
        while (m) {
            if (m[1].indexOf("file") > -1) {
                if (quality != '0'  && m[1].match(/b-file-new m-file-new_type_video (.*)\s/)[1] != quality) {
                    m = re.exec(response);
                    continue;
                }
                var flv_link = "";
                if (m[2].match(/a href="([^"]+)/))
                    flv_link = m[2].match(/a href="([^"]+)/)[1];
                var name = m[2].match(/span class="[\S\s]*?filename-text".?>([\S\s]*?)<\/span>/)[1];
                var size = m[2].match(/span class="[\S\s]*?material-size">([\S\s]*?)<\/span>/)[1];
                var direct_link = m[2].match(/" href="([^"]+)/)[1];
                if (getType(direct_link.split('.').pop()) == 'video') {
                    folderList.push({
                        title: page.metadata.title,
                        flvlink: flv_link,
                        directlink: direct_link
                    });
                    page.appendItem(plugin.getDescriptor().id + ":play:" + escape(name) + ':' + pos, 'video', {
                        title: new showtime.RichText(name + ' ' + colorStr(size, blue))
                    });
                    pos++;
                } else {
                    page.appendItem(service.baseUrl + direct_link, getType(direct_link.split('.').pop()), {
                        title: new showtime.RichText(name + ' ' + colorStr(size, blue))
                    });
                }
            } else {
                if (m[1].indexOf("folder") > -1 && m[2].indexOf("m-current") == -1) {
                    // 1-folder mark, 2-lang/type, 3-folderID, 4-title, 5-qualities, 6-details, 7-size, 8-date
                    var n = m[2].match(/class="b-folder-mark([\S\s]*?)"[\S\s]*?class="link-([\S\s]*?)title" rel="\{parent_id: (.*)\}"[\S\s]*?>([\S\s]*?)<\/a>([\S\s]*?)<\/div>[\S\s]*?<span class="material-[\S\s]*?">([\S\s]*?)<\/span>[\S\s]*?<span class="material-[\S\s]*?">([\S\s]*?)<\/span>[\S\s]*?<span class="material-[\S\s]*?">([^\<]+)<\/span>/);
                    if (n) {
                        var mark = n[1].replace(' m-', '');
                        var qualities = getQualities(n[5]);
                        for (var i in qualities) {
                            page.appendItem(plugin.getDescriptor().id + ":listFolder:" + escape(url) + ":" + getId(n[3]) + ":" + escape(unescape(title)) + ':' + qualities[i].filter, "directory", {
                                title: new showtime.RichText((mark ? coloredStr(mark, orange) + ' ' : '') +
                                    coloredStr(n[2].replace('simple ', '').replace('subtype ', '').replace('m-', ''), orange) +
                                    trim(n[4]) + ' ' +
                                    (qualities[i].name ? coloredStr(qualities[i].name, blue) + ' ' : '') +
                                    colorStr(n[6], orange) + ' ' +
                                    colorStr(n[7], blue) + ' ' +
                                    n[8])
                            });
                        }
                    } else {
                        // 1-lang/type, 2-folderID, 3-title, 4-details, 5-size, 6-date
                        n = m[2].replace('<span class="material-size"></span>', '').match(/link-([\S\s]*?)title" rel="\{parent_id: (.*)\}"[\S\s]*?>([\S\s]*?)<\/a>[\S\s]*?<span class="material-[\S\s]*?">([\S\s]*?)<\/span>[\S\s]*?<span class="material-details">([^\<]+)[\S\s]*?<span class="material-date">([^\<]+)<\/span>/);
                        var lang = n[1].replace('simple ', '').replace('subtype ', '').replace('m-', '');
                        page.appendItem(plugin.getDescriptor().id + ":listFolder:" + escape(url) + ":" + getId(n[2]) + ":" + escape(unescape(title)) + ':0', "directory", {
                            title: new showtime.RichText((lang ? coloredStr(lang, orange) + ' ' : '') +
                                trim(n[3]) + ' ' +
                                colorStr(n[4], orange) + ' ' +
                                colorStr(n[5], blue) + ' ' +
                                n[6])
                        });
                    }
                }
            }
            m = re.exec(response);
        }
        page.loading = false;
    }

    plugin.addURI(plugin.getDescriptor().id + ":listFolder:(.*):(.*):(.*):(.*)", function(page, url, folder, title, quality) {
        setPageHeader(page, unescape(title));
        processAjax(page, url, folder, title, quality);
    });

    // Search IMDB ID by title
    function getIMDBid(title) {
        var imdbid = null;
        var title = showtime.entityDecode(unescape(title)).toString();
        showtime.print('Splitting the title for IMDB ID request: ' + title);
        var splittedTitle = title.split('|');
        if (splittedTitle.length == 1)
            splittedTitle = title.split('/');
        if (splittedTitle.length == 1)
            splittedTitle = title.split('-');
        showtime.print('Splitted title is: ' + splittedTitle);
        if (splittedTitle[1]) { // first we look by original title
            var cleanTitle = splittedTitle[1].trim();
            var match = cleanTitle.match(/[^\(|\[|\.]*/);
            if (match)
                cleanTitle = match;
            showtime.print('Trying to get IMDB ID for: ' + cleanTitle);
            resp = showtime.httpReq('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + encodeURIComponent(cleanTitle)).toString();
            imdbid = resp.match(/<a href="\/title\/(tt\d+)\//);
            if (!imdbid && cleanTitle.indexOf('/') != -1) {
                splittedTitle2 = cleanTitle.split('/');
                for (var i in splittedTitle2) {
                    showtime.print('Trying to get IMDB ID for: ' + splittedTitle2[i].trim());
                    resp = showtime.httpReq('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + encodeURIComponent(splittedTitle2[i].trim())).toString();
                    imdbid = resp.match(/<a href="\/title\/(tt\d+)\//);
                    if (imdbid) break;
                }
            }
        }
        if (!imdbid)
            for (var i in splittedTitle) {
                if (i == 1) continue; // we already checked that
                var cleanTitle = splittedTitle[i].trim();
                var match = cleanTitle.match(/[^\(|\[|\.]*/);
                if (match)
                    cleanTitle = match;
                showtime.print('Trying to get IMDB ID for: ' + cleanTitle);
                resp = showtime.httpReq('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + encodeURIComponent(cleanTitle)).toString();
                imdbid = resp.match(/<a href="\/title\/(tt\d+)\//);
                if (imdbid) break;
            }

        if (imdbid) {
            showtime.print('Got following IMDB ID: ' + imdbid[1]);
            return imdbid[1];
        }
        showtime.print('Cannot get IMDB ID :(');
        return imdbid;
    };

    // Processes "Play online" button
    var playOnlineUrl;
    plugin.addURI(plugin.getDescriptor().id + ":playOnline:(.*)", function(page, title) {
        page.loading = true;
        var response = showtime.httpReq(service.baseUrl + playOnlineUrl).toString();
        page.loading = false;
        var url = response.match(/playlist: \[[\S\s]*?url: '([^']+)/) // Some clips autoplay
        if (!url) {
            page.loading = true;
            response = showtime.httpReq(service.baseUrl + response.match(/<div id="page-item-viewonline"[\S\s]*?<a href="([^"]+)/)[1]).toString();
            page.loading = false;
            response = response.match(/<a id="[\S\s]*?" href="([\S\s]*?)" title="([\S\s]*?)"/);
            if (!response) {
                page.error("Линк на проигрывание отсутствует :(");
                return;
            }
            page.loading = true;
            url = showtime.httpReq(service.baseUrl + response[1]).toString().match(/playlist: \[[\S\s]*?url: '([^']+)/);
            page.loading = false;
        }
        page.type = "video";
        page.source = "videoparams:" + showtime.JSONEncode({
            title: unescape(title),
            imdbid: getIMDBid(title),
            canonicalUrl: plugin.getDescriptor().id + ":playOnline:" + title,
            sources: [{
                url: service.baseUrl + url[1]
            }]
        });
    });

    // Play URL
    plugin.addURI(plugin.getDescriptor().id + ":play:(.*):(.*)", function(page, title, pos) {
        page.type = "video";
        page.loading = true;
        if (showtime.probe(service.baseUrl + folderList[pos].directlink).result == 0) {
            var season = null, episode = null;
            var name = unescape(title).toUpperCase();
            var series = name.match(/S(\d{1,2})E(\d{3})/); // SxExxx, SxxExxx
            if (!series) series = name.match(/S(\d{1,2})E(\d{2})/); // SxExx, SxxExx
            if (series) {
                season = +series[1];
                episode = +series[2];
                showtime.print('Season: ' + season + ' Episode: ' + episode);
            }
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ":play:" + title + ':' + pos,
                imdbid: getIMDBid(folderList[pos].title),
                season: season,
                episode: episode,
                sources: [{
                    url: service.baseUrl + folderList[pos].directlink
                }],
                no_fs_scan: true
            });
            page.loading = false;
            return;
        }
        page.loading = true;
        var response = showtime.httpReq(service.baseUrl + folderList[pos].flvlink).toString();
        page.loading = false;
        title = response.match(/<title>([\S\s]*?)<\/title>/)[1];
        var blob = response.match(/class="b-view-material"([\S\s]*?)<\/div>/);
        if (blob)
            var link = blob[1].match(/<a href="([^"]+)/)[1];
        if (!link)
            var m = response.match(/playlist: \[[\S\s]*?url: '([^']+)/);
        else {
            page.loading = true;
            var m = showtime.httpReq(service.baseUrl + folderList[pos].flvlink).toString().match(/playlist: \[[\S\s]*?url: '([^']+)/);
            page.loading = false;
        }
        if (!m) { // first file from the first folder
            page.loading = true;
            m = showtime.httpReq(service.baseUrl + folderList[pos].flvlink + '?ajax&blocked=0&folder=0').toString().match(/class="filelist m-current"[\S\s]*?" href="([^"]+)/);
            page.loading = false;
        }
        if (m) {
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ":play:" + title + ':' + pos,
                imdbid: getIMDBid(folderList[pos].title),
                sources: [{
                    url: service.baseUrl + m[1]
                }]
            });
        } else page.error("Линк не проигрывается :(");
    });

    // Index page
    plugin.addURI(plugin.getDescriptor().id + ":index:(.*):(.*):(.*):(.*)", function(page, url, title, populars, param) {
        if (param == 'noparam') param = ''; // workaround for ps3 regex quirks
        setPageHeader(page, unescape(title));
        try {
             var doc = showtime.httpReq(url.substr(0,4) == 'http' ? unescape(url) + '?view=detailed'+param : service.baseUrl + unescape(url) + '?view=detailed'+param).toString();
        } catch (err) {}

        if (doc) {
             if (populars == 'yes') {
                var match = doc.match(/<div id="adsProxy-zone-section-glowadswide"><\/div>([\S\s]*?)<div class="b-clear">/);
                if (match) {
                    showPopulars(page, match[1], 'Самое просматриваемое сейчас');
    	            page.appendItem("", "separator", {
                        title: ''
                    });
                }
             }

            function loader() {
                response = doc.match(/<div class="b-section-list([\S\s]*?)<script type="text\/javascript">/)[1];
                indexer(page);
                var nextPage = doc.match(/<a class="next-link"href="([\S\s]*?)">/);
                if (nextPage) {
                    page.loading = true;
                    doc = showtime.httpReq(nextPage[1].substr(0, 4) == 'http' ? nextPage[1] : service.baseUrl + nextPage[1]).toString();
                    page.loading = false;
                    return true;
                }
                return false;
            }
            loader();
            page.paginator = loader;
        };
        page.loading = false;
    });

    // Top 9
    function showPopulars(page, match, title) {
        page.appendItem("", "separator", {
            title: title
        });

        // 1-link, 2-logo, 3-title
        var re = /<div class="b-poster-[\S\s]*?<a href="([\S\s]*?)"[\S\s]*?url\('([\S\s]*?)'\)[\S\s]*?<span class=".-poster-[\S\s]*?title">([\S\s]*?)<\/span>/g;
        var m = re.exec(match);
        while (m) {
            page.appendItem(plugin.getDescriptor().id + ":listRoot:" + m[1] + ":" + escape(trim(m[3])), "video", {
                title: new showtime.RichText(trim(m[3]).replace(/(<([^>]+)>)/ig, "")),
                icon: setIconSize(m[2], 2)
            });
            m = re.exec(match);
        }
    }

    // shows last commented
    var comments;
    plugin.addURI(plugin.getDescriptor().id + ":comments", function(page) {
        setPageHeader(page, 'Обcуждаемые материалы');
        //1-link, 2-title, 3-icon, 4-type, 5-year, 6-country, 7-genres list,
        //8-directors, 9-actors, 10-positive/negative, 11-rating, 12-text, 13-nick,
        //14-positive/negative, 15-rating, 16-text, 17-nick
        var re = /<a href="([\S\s]*?)"[\S\s]*?<span class="b-main__top-commentable-item-title-value">([\S\s]*?)<\/span>[\S\s]*?url\(([\S\s]*?)\);[\S\s]*?<span class="b-main__top-commentable-item-subsection">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__top-commentable-item-year-country">([\S\s]*?)<span class="b-main__new-item-attributes-delimiter"><\/span>([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__top-commentable-item-genre">([\S\s]*?)<span class="b-main__top-commentable-item-director">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__top-commentable-item-cast">([\S\s]*?)<\/span>[\S\s]*?class="b-main__top-commentable-item-comment m-main__top-commentable-item-comment_bg_([\S\s]*?)">[\S\s]*?<span class="b-main__top-commentable-item-comment-content-rating">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__top-commentable-item-comment-content-text">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__top-commentable-item-comment-content-name m-main__top-commentable-item-comment-content-name_">([\S\s]*?)<\/span>[\S\s]*?class="b-main__top-commentable-item-comment m-main__top-commentable-item-comment_bg_([\S\s]*?)">[\S\s]*?<span class="b-main__top-commentable-item-comment-content-rating">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__top-commentable-item-comment-content-text">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__top-commentable-item-comment-content-name m-main__top-commentable-item-comment-content-name_">([\S\s]*?)<\/span>/g;
        var match = re.exec(comments);
        while (match) {
            page.appendItem(plugin.getDescriptor().id + ":listRoot:" + match[1]+ ':' + escape(trim(match[2])), 'video', {
                title: trim(match[2]),
                icon: setIconSize(match[3], 2),
                year: +(trim(match[5].replace(/\D+/, '')).substr(0,4)),
                genre: new showtime.RichText(match[4] + ' ' + colorStr(trim(match[7].replace(/<[^>]*>/g, '')), orange)),
                description: new showtime.RichText(colorStr(trim(match[11]), match[10] == "negative" ? red : green) + ' '+
                    coloredStr(match[13], orange) + ': ' + match[12] + ' '+
                    '<br>' + colorStr(trim(match[15]), match[14] == "negative" ? red : green) + ' '+
                    coloredStr(match[17], orange) + ': ' + match[16])
            });
            match = re.exec(comments);
        }
        page.loading = false;
    });

    var response;
    function indexer(page) {
        page.loading = true;
        // 1-link, 2-icon, 3-title, 4-qualities(for films),
        // 5-votes+, 6-votes-, 7-year/country, 8-genre/actors, 9-description
        var re = /<a class="b-poster-detail__link" href="([\S\s]*?)">[\S\s]*?<img src="([\S\s]*?)" alt='([\S\s]*?)' width=([\S\s]*?)<span class="b-poster-detail__vote-positive">([\S\s]*?)<\/span>[\S\s]*?<span class="b-poster-detail__vote-negative">([\S\s]*?)<\/span>[\S\s]*?<span class="b-poster-detail__field">([\S\s]*?)<\/span>[\S\s]*?<span class="b-poster-detail__field">([\S\s]*?)<\/span>[\S\s]*?<span class="b-poster-detail__description">([\S\s]*?)<\/span>/g;
        var match = re.exec(response);
        while (match) {
            // parsing quality list
            var quality = '';
            var re2 = /<span class="quality m-([\S\s]*?)">/m;
            var match2 = re2.exec(match[4]);
            if (match2)
                quality = match2[1].toUpperCase();
            var genre = '', actors = '';
            if (quality) {
                quality = coloredStr(quality, blue) + ' ';
                actors = coloredStr('Актеры: ', orange) + match[8] + ' ';
            } else {
                genre = match[8];
            }
            page.appendItem(plugin.getDescriptor().id + ":listRoot:" + escape(match[1]) + ":" + escape(match[3].replace(/\\\'/g, "'").replace(/\\\"/g, '"')), "video", {
                title: new showtime.RichText(quality + match[3].replace(/\\\'/g, "'").replace(/\\\"/g, '"')),
                icon: setIconSize(match[2], 2),
                genre: genre,
                year: +match[7].substr(0,4),
                description: new showtime.RichText('('+coloredStr(match[5], green)+'/'+coloredStr(match[6], red) + ') ' + actors + coloredStr("Производство: ", orange) + ' ' +
                    trim(match[7].split('●')[1]) + ' ' + (match[9] ? coloredStr("<br>Описание: ", orange) + trim(match[9]) : ''))
            });
            match = re.exec(response);
        }
        page.loading = false;
    }

    function processScroller(page, url) {
        page.loading = true;
        try {
            var doc = showtime.httpReq(service.baseUrl + url).toString();
        } catch (err) {}

        if (doc) {
            var match = doc.match(/<div class="b-nowviewed">([\S\s]*?)<div class="b-clear">/);
            if (match)
                showPopulars(page, match[1], 'Самое просматриваемое сейчас');
            else { // try like series
                var match = doc.match(/<div id="adsProxy-zone-section-glowadswide">([\S\s]*?)<div class="b-clear">/);
                if (match)
                    showPopulars(page, match[1], 'Популярно сейчас');
            }

            //show populars
            var tryToSearch = true, counter = 0;
            function loader() {
                if (!tryToSearch) return false;
                response = doc.match(/<div class="b-section-list([\S\s]*?)<script type="text\/javascript">/);
                if (response) {
                    response = response[1];
                    if (!counter)
                        page.appendItem("", "separator", {
                            title: 'Популярные материалы'
                        });
                    indexer(page);
                    counter++;
                }
                var next = response.match(/<a class="next-link"href="([\S\s]*?)">/);
                if (!next) return tryToSearch = false;
                page.loading = true;
                doc = showtime.httpReq(service.baseUrl + next[1]).toString();
                page.loading = false;
                return true;
            }
            loader();
            page.paginator = loader;
        }
        page.loading = false;
    }

    // lists submenu
    plugin.addURI(plugin.getDescriptor().id + ":submenu:(.*):(.*):(.*)", function(page, url, title, menu) {
        setPageHeader(page, unescape(title));
        menu = unescape(menu);
        //1-url, 2-title
        var re = /<a class="b-header__menu-subsections-item" href="([\S\s]*?)">[\S\s]*?<span class="b-header__menu-subsections-item-title m-header__menu-subsections-item-title_type_[\S\s]*?">([\S\s]*?)<\/span>/g;
        var match = re.exec(menu);
        while (match) {
            page.appendItem(plugin.getDescriptor().id + ":index:" + escape(service.baseUrl + match[1]) + ':' + trim(match[2]) + ':yes:noparam', 'directory', {
                title: trim(match[2])
            });
            match = re.exec(menu);
        }
        processScroller(page, url);
    });
	

	/////////////////////////////////////////////////// Lists favorite menu///////////////////////////////////////////////////
	
	plugin.addURI(plugin.getDescriptor().id + ":myfavourites", function(page) {
        setPageHeader(page, "В избранном на FS.to");
		response = showtime.httpReq(service.baseUrl + "/myfavourites.aspx").toString().replace(/<div class="b-header__menu-section m-header__menu-section_type_fsua">/g, '');
		
        // Building favorite menu
		var menu = response.match(/<div class="b-tabs-decorated">[\S\s]*?<ul>[\S\s]*?(<li[\S\s]*<\/li>)[\S\s]*?<\/ul>[\S\s]*?<\/div>/)[1]; //находим блок меню
		
		//1-url, 2-title
		var re = /<li[\S\s]*?<a href="([\S\s]*?)">([\S\s]*?)<\/a><\/li>/g; 
		var match = re.exec(menu);
		while (match) {
            page.appendItem(plugin.getDescriptor().id + ":myfavourites_menu:" + match[1]+ ':' + escape(trim(match[2].replace(/&nbsp;/, " "))), 'directory', {
                title: trim(match[2].replace(/&nbsp;/, " "))
            });
            match = re.exec(menu);
        }
        page.loading = false;		
    });
	
	plugin.addURI(plugin.getDescriptor().id + ":myfavourites_menu:(.*):(.*)", function(page, url, title) {
	    setPageHeader(page, unescape(title));
		response = showtime.httpReq(service.baseUrl + url).toString().replace(/<div class="b-header__menu-section m-header__menu-section_type_fsua">/g, '');
		
		//0-subsection, 1-title, 2-section, 3-subsection
		var re = /<span class="section-title"><b>([\S\s]*?)<\/b>[\S\s]*?<div class="b-section-footer">[\S\s]*?<a href="#" class="b-add" rel="\{section: '([\S\s]*?)', subsection: '([\S\s]*?)'\}[\S\s]*?<\/div>[\S\s]*?<\/div>/g;		
		var match = re.exec(response);
		while (match) {
		    page.appendItem(plugin.getDescriptor().id + ":myfavourites_content:" + url + ':' + escape(trim(match[1])) + ':' + match[2] + ':' +  match[3], 'directory', {
                title: trim(match[1])
            });
		    match = re.exec(response);
		}
		page.loading = false;
	});
	
	plugin.addURI(plugin.getDescriptor().id + ":myfavourites_content:(.*):(.*):(.*):(.*)", function(page, url, title, section, subsection) {
	    setPageHeader(page, unescape(title));
		
		//1-url, 2- poster 3-title
	    var re = /<a href="([\S\s]*?)" class="b-poster-thin[\S\s]*?style="background-image: url\('([\S\s]*?)'\)"[\S\s]*?<b class=[\S\s]*?<span>([\S\s]*?)<\/p><\/span><\/b>[\S\s]*?<\/a>/g ;
		var curpage, dig_curpage = 0;
		do{
			if (!dig_curpage) {
			    curpage = "";
			} else {
			    curpage = dig_curpage;
			}
		    var ajax = url.split("?")[0] + "?" + "ajax&" + url.split("?")[1] + "&section=" + section + "&subsection=" + subsection + "&action=get_list&rows=1&curpage=" + curpage;
			response = showtime.httpReq(service.baseUrl + ajax).toString();
			var obj_response = showtime.JSONDecode(response);
			match = re.exec(obj_response.content);
			while (match) {		 
                title = match[3].replace('<p>', " / ").replace('</p><p>', " ").replace('</p>', "");
                page.appendItem(plugin.getDescriptor().id +":listRoot:" + match[1]+ ':' + escape(trim(match[3])), 'video', {
                    title: new showtime.RichText(title),
                    icon: setIconSize(match[2], 2)
                });
			 match = re.exec(obj_response.content);
            }			
			dig_curpage++ ;
        } while (!obj_response.islast);			
		  
		 page.loading = false;
		 
	});
	
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function setIconSize(s, size) {
	    s = "http:" + s; //Fixed posters
        result = s;
        var lastMatch = s.lastIndexOf('/');
        if (lastMatch != -1)
            result = s.substr(0, s.substr(0, lastMatch - 1).lastIndexOf('/') + 1) + size + s.substr(lastMatch);
        return result;
    }

    plugin.addURI(plugin.getDescriptor().id + ":start", function(page) {
        setPageHeader(page, plugin.getDescriptor().synopsis);
        response = showtime.httpReq(service.baseUrl).toString().replace(/<div class="b-header__menu-section m-header__menu-section_type_fsua">/g, '');

        // Building menu
        if (response.match(/<link rel="canonical" href="http:\/\/cxz.to/)) { // cxz.to
            //1-link, 2-title
            var re = /<div class="b-header__menu-section[\S\s]*?<a href="([\S\s]*?)"[\S\s]*?">([\S\s]*?)<\/a>/g;
            var match = re.exec(response);
            while (match) {
                page.appendItem(plugin.getDescriptor().id + ":index:" + match[1]+ ':' + escape(trim(match[2])) + ':no:noparam', 'directory', {
                    title: trim(match[2])
                });
                match = re.exec(response);
            }
        } else {
            //1-link, 2-title, 3-submenus
            var re = /<div class="b-header__menu-section[\S\s]*?<a href="([\S\s]*?)"[\S\s]*?">([\S\s]*?)<\/a>([\S\s]*?)<div class="b-clear">/g;
            var match = re.exec(response);
            while (match) {
                page.appendItem(plugin.getDescriptor().id + ":submenu:" + match[1]+ ':' + escape(trim(match[2])) + ':' + escape(match[3]), 'directory', {
                    title: trim(match[2])
                });
                match = re.exec(response);
            }
        }
		
		//////////////////////////////////////////////If login, add my favorites/////////////////////////////////// 
		
		if (response.match(/b-header__user-icon b-header__user-favourites/)){
		    page.appendItem(plugin.getDescriptor().id + ":myfavourites", 'directory', {
                    title: "В избранном на FS.to"
                });
		}	
		
		//////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Scraping commentable
        comments = response.match(/<div class="b-main__top-commentable-inner">([\S\s]*?)<div class="b-clear">/);
        if (comments) {
            comments = comments[1];
            page.appendItem(plugin.getDescriptor().id + ':comments', "directory", {
                title: 'Обcуждаемые материалы'
            });
        }

        // Show most popular
        match = response.match(/__posters([\S\s]*?)<div class="b-clear">/);
        if (match)
            showPopulars(page, match[1], 'Самые популярные материалы');

        // Front page scraper
        var doc = response.match(/<div class="b-main__new-title">([\S\s]*?)#content-->/);
        if (doc) {
            page.appendItem("", "separator", {
                title: 'Новое на сайте'
            });

            //1-link, 2-icon, 3-type, 4-title, 5-genre, 6-produced, 7-description,
            //8-author, 9-time
            var re = /<a href="([\S\s]*?)"[\S\s]*?url\('([\S\s]*?)'\);[\S\s]*?<span class="b-main__new-item-subsection">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__new-item-title m-main__new-item-title_theme_[\S\s]*?">([\S\s]*?)<\/span>[\S\s]*?<span>([\S\s]*?)<\/span>[\S\s]*?<\/span>([\S\s]*?)<\/span>([\S\s]*?)<span class="b-main__new-item-add-info-auth">([\S\s]*?)<\/span>[\S\s]*?<span class="b-main__new-item-add-info-time">([\S\s]*?)<\/span>/g;

            var match = re.exec(doc[1]);
            while (match) {
                var description = trim(match[7].replace(/<[^>]*>/g, '').replace('.......',''))
                page.appendItem(plugin.getDescriptor().id + ":listRoot:" + escape(match[1]) + ":" + escape(showtime.entityDecode(match[4])), "video", {
                    title: new showtime.RichText(match[4]),
                    icon: setIconSize(match[2], 2),
                    genre: new showtime.RichText(match[3] + ' ' + (trim(match[5].replace(/<[^>]*>/g, '')) ? colorStr(trim(match[5]), orange) : '')),
                    description: new showtime.RichText((trim(match[6]) ? coloredStr('Произведено: ',orange) + trim(match[6]) + ' ' : '') +
                       coloredStr('Добавил: ',orange) + match[8] + ' ' + colorStr(match[9], blue) +
                       (description ? coloredStr(' Описание: ',orange) + description : ''))
                });
                match = re.exec(doc[1]);
            }
        } else {
            page.appendItem("", "separator", {
               title: 'Популярные материалы'
            });
            indexer(page);
        }
        page.loading = false;
    });

    plugin.addSearcher(plugin.getDescriptor().id, logo, function(page, query) {
	page.entries = 0;
	var fromPage = 0, tryToSearch = true;
	
	// 1-link, 2-icon, 3-title, 4-subsection, 5-genres, 6-likes, 7-dislikes, 8-description
	var re = /<a href="([\S\s]*?)"[\S\s]*?<img src="([\S\s]*?)"[\S\s]*?results-item-title">([\S\s]*?)<\/span>[\S\s]*?results-item-subsection">([\S\s]*?)<\/span>([\S\s]*?)item-rating[\S\s]*?results-item-rating-positive">([\S\s]*?)<\/span>[\S\s]*?results-item-rating-negative">([\S\s]*?)<\/span>[\S\s]*?results-item-description">([\S\s]*?)<\/span>/g;
	
	function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
	    var response = showtime.httpReq(service.baseUrl + '/search.aspx', {
                args: {
                   search: query,
                   page: fromPage ? fromPage : ''
                }
            }).toString();
            response = response.match(/<div class="b-search-page__results">([\S\s]*?)<\/div>/);
	    page.loading = false;
            if (response) {
                var match = re.exec(response[1]);
                while (match) {
                    var genres = match[5].match(/item-genres">([\S\s]*?)<\/span>/);
                    genres ? genres = ' ' + colorStr(genres[1], orange) : genres = '';
                    var rate = match[6] - match[7];
                    // positve rate = green, negative = red, zero = white
	            if (rate > 0)
		        rate = colorStr('+' + rate.toString(), green);
	            else
                        if (rate < 0)
		            rate = colorStr(rate, red);
                        else
                            rate = '';
                    page.appendItem(plugin.getDescriptor().id + ":listRoot:" + escape(match[1]) + ":" + escape(match[3]), "video", {
                        title: new showtime.RichText(rate + ' ' + match[3]),
                        icon: setIconSize(match[2], 2),
                        genre: new showtime.RichText(match[4] + genres),
                        description: new showtime.RichText('('+coloredStr(match[6], green)+'/'+coloredStr(match[7], red) + ') ' + coloredStr(' Описание: ', orange) + match[8])
                    });
                    page.entries++;
                    match = re.exec(response[1]);
                };
                if (!response[1].match(/<b>Следующая страница<\/b>/))
                   return tryToSearch = false;
                fromPage++;
                return true;
            }
	};
	loader();
	page.paginator = loader;
      });
})(this);