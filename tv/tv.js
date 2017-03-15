/*
 *  Online TV plugin for Movian Media Center
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
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


(function(plugin) {
    var logo = plugin.path + "logo.png";

    function setPageHeader(page, title) {
	page.type = "directory";
	page.contents = "items";
	page.metadata.logo = logo;
	page.metadata.title = new showtime.RichText(title);
    }

    var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45';

    function colorStr(str, color) {
        return '<font color="' + color + '"> (' + str + ')</font>';
    }

    function coloredStr(str, color) {
        return '<font color="' + color + '">' + str + '</font>';
    }

    function base64_decode(data) { // http://kevin.vanzonneveld.net
        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
        if (!data)
            return data;
        data += '';
        do { // unpack four hexets into three octets using index points in b64
            h1 = b64.indexOf(data.charAt(i++));
            h2 = b64.indexOf(data.charAt(i++));
            h3 = b64.indexOf(data.charAt(i++));
            h4 = b64.indexOf(data.charAt(i++));
            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
            o1 = bits >> 16 & 0xff;
            o2 = bits >> 8 & 0xff;
            o3 = bits & 0xff;
            if (h3 == 64)
                tmp_arr[ac++] = String.fromCharCode(o1);
            else if (h4 == 64)
                    tmp_arr[ac++] = String.fromCharCode(o1, o2);
                 else
                    tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        } while (i < data.length);
        dec = tmp_arr.join('');
        return dec;
    }

    function unhash(hash) {
        var hash1 = "2YdkpV7mUNLB8vzMWwI5Z40uc=";
        var hash2 = "lnxg6eGyXbQ3sJD9Rafo1iHTtq";
        for (var i = 0; i < hash1.length; i++) {
            hash = hash.split(hash1[i]).join('--');
            hash = hash.split(hash2[i]).join(hash1[i]);
            hash = hash.split('--').join(hash2[i]);
        }
        return base64_decode(hash);
    }

    var service = plugin.createService(plugin.getDescriptor().title, plugin.getDescriptor().id + ":start", "tv", true, logo);

    var settings = plugin.createSettings(plugin.getDescriptor().title, logo, plugin.getDescriptor().title);

    settings.createBool('dontShowAdult', "Don't show adult channels", true, function(v) {
        service.dontShowAdult = v;
    });

    settings.createBool('disableSampleList', "Don't show Sample M3U list", false, function(v) {
        service.disableSampleList = v;
    });

    settings.createBool('disableSampleXMLList', "Don't show Sample XML list", true, function(v) {
        service.disableSampleXMLList = v;
    });

    settings.createString('acestreamIp', "IP address of AceStream Proxy. Enter IP only.",  '192.168.0.93', function(v) {
        service.acestreamIp = v;
    });

    settings.createAction("cleanFavorites", "Clean My Favorites", function () {
        store.list = "[]";
        showtime.notify('Favorites has been cleaned successfully', 2);
    });

    var store = plugin.createStore('favorites', true);
    if (!store.list)
        store.list = "[]";

    var playlists = plugin.createStore('playlists', true);
    if (!playlists.list)
        playlists.list = "[]";

    var yoooo = plugin.createStore('yoooo', true);

    function addToFavoritesOption(item, link, title, icon) {
        item.link = link;
        item.title = title;
        item.icon = icon;
        item.onEvent("addFavorite", function(item) {
            var entry = showtime.JSONEncode({
                link: encodeURIComponent(this.link),
                title: encodeURIComponent(this.title),
                icon: encodeURIComponent(this.icon)
            });
            store.list = showtime.JSONEncode([entry].concat(eval(store.list)));
            showtime.notify("'" + this.title + "' has been added to My Favorites.", 2);
        }.bind(item));
	item.addOptAction("Add '" + title + "' to My Favorites", "addFavorite");
    }

    var API = 'https://www.googleapis.com/youtube/v3',
        key = "AIzaSyCSDI9_w8ROa1UoE2CNIUdDQnUhNbp9XR4"

    plugin.addURI(plugin.getDescriptor().id + ":youtube:(.*)", function(page, title) {
        // search for the channel
        page.loading = true;
        try {
            doc = showtime.httpReq(API + '/search', {
                args: {
                    part: 'snippet',
                    type: 'video',
                    q: unescape(title),
                    maxResults: 1,
                    eventType: 'live',
                    key: key
                }
            }).toString();
            page.redirect('youtube:video:' + showtime.JSONDecode(doc).items[0].id.videoId);
        } catch(err) {
            page.metadata.title = unescape(title);
            page.error("Sorry, can't get channel's link :(");
        }
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":sputniktv:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        var resp = showtime.httpReq(unescape(url)).toString();
        var match = resp.match(/stream: "([\S\s]*?)"/);
        if (!match)
           match = resp.match(/file=([\S\s]*?)&/);
        if (!match)
           match = resp.match(/"src=([\S\s]*?)&/);
        if (!match)
           match = resp.match(/value="src=([\S\s]*?)"/)
        if (match && showtime.probe(match[1]).result)
           match = resp.match(/file=([\S\s]*?)"/);
        page.loading = false;
        if (match) {
            var link = match[1].toString().replace(/&st=\/online\/video.txt/, '').replace('manifest.f4m', 'playlist.m3u8');
            if (link.match(/m3u8/)) link = 'hls:' + link;
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':sputniktv:' + url + ':' + title,
                sources: [{
                    url: link
                }],
                no_subtitle_scan: true
            });
        } else {
            page.metadata.title = unescape(title);
            page.error("Sorry, can't get the link :(");
        }
    });

    plugin.addURI(plugin.getDescriptor().id + ":ntv:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        var resp = showtime.httpReq(unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/hlsURL = '([\S\s]*?)'/);
        if (match) {
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':ntv:' + url + ':' + title,
                sources: [{
                    url: 'hls:' + match[1]
                }],
                no_subtitle_scan: true
            });
        } else {
            page.metadata.title = unescape(title);
            page.error("Sorry, can't get the link :(");
        }
    });

    function roughSizeOfObject(object) {
        var objectList = [];
        var recurse = function(value) {
            var bytes = 0;
            if (typeof value === 'boolean')
                bytes = 4;
            else if (typeof value === 'string')
                bytes = value.length * 2;
            else if (typeof value === 'number')
                bytes = 8;
            else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
                objectList[ objectList.length ] = value;
                for (i in value) {
                    bytes += 8; // assumed existence overhead
                    bytes += recurse(value[i])
                }
            }
            return bytes;
        }
        return recurse(object);
    }

    plugin.addURI(plugin.getDescriptor().id + ":divan:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        setDivanHeaders();
        var resp = showtime.httpReq(unescape(url).match(/http/) ? unescape(url) : 'http://divan.tv' + unescape(url)).toString();
        var match = resp.match(/file: "([\S\s]*?)"/);
        if (!match) match = resp.match(/stream: "([\S\s]*?)"/);
        if (match) {
            var n = 0;
            while (n < 5)
                try {
                    //var size = roughSizeOfObject(showtime.httpReq(match[1]));
                    //showtime.print(unescape(title) + ': Got ' + size + ' bytes');
                    showtime.httpReq(match[1])
                    break;
                } catch(err) {
                    showtime.print('Retry #' + (n + 1));
                    showtime.sleep(1);
                    n++;
                }
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':divan:' + url + ':' + title,
                sources: [{
                    url: 'hls:' + match[1]
                }],
                no_subtitle_scan: true
            });
        } else {
            page.metadata.title = unescape(title);
            page.error("Sorry, can't get the link :(");
        }
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":tonis:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        var resp = showtime.httpReq(unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/src='(http:\/\/media.wnet.ua\/tonis\/player[\s\S]*?)'/);
        if (match) {
            resp = showtime.httpReq(match[1]).toString();
            var key = resp.match(/"(\?s=[\s\S]*?)"/)[1];
            var link = resp.match(/url: "([\s\S]*?)"/)[1] + key;
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':tonis:' + url + ':' + title,
                sources: [{
                    url: 'hls:' + link.replace('manifest.f4m', 'master.m3u8')
                }],
                no_subtitle_scan: true
            });
        } else {
            page.metadata.title = unescape(title);
            page.error("Sorry, can't get the link :(");
        }
    });

    plugin.addURI(plugin.getDescriptor().id + ":tivix:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        var resp = showtime.httpReq(unescape(url)).toString();
        page.loading = false;
        var re = /file=([\S\s]*?)&/g;
        var match = re.exec(resp);
        if (!match) {
            re = /skin" src="([\S\s]*?)"/g;
            match = re.exec(resp);
        }
        while (match) {
            page.loading = true;
            if (showtime.probe(match[1]).result) {
                match = re.exec(resp);
                continue;
            }
            if (match[1].match(/rtmp/))
                var link = unescape(match[1]) + ' swfUrl=http://tivix.net' + resp.match(/data="(.*)"/)[1] + ' pageUrl=' + unescape(url);
            else
                var link = match[1].match('m3u8') ? 'hls:' + unescape(match[1]) : unescape(match[1]);

            page.loading = false;
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':tivix:' + url + ':' + title,
                sources: [{
                    url: link
                }],
                no_subtitle_scan: true
            });
            return;
        }

        // try to get youtube link
        match = resp.match(/\.com\/v\/([\S\s]*?)(\?|=)/);
        if (match) {
            page.redirect('youtube:video:' + match[1]);
            return;
        }
        page.metadata.title = unescape(title);
        page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":uatoday:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var resp = showtime.httpReq(unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/player.online[\S\s]*?http[\S\s]*?http([\S\s]*?)'/);
        if (match) {
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':uatoday:' + url + ':' + title,
                sources: [{
                    url: 'hls:http' + match[1]
                }],
                no_subtitle_scan: true
            });
        } else {
            page.metadata.title = unescape(title);
            page.error("Sorry, can't get the link :(");
        }
    });

    plugin.addURI(plugin.getDescriptor().id + ":acestream:(.*):(.*)", function(page, id, title) {
        page.type = "video";
        page.source = "videoparams:" + showtime.JSONEncode({
            title: unescape(title),
            canonicalUrl: plugin.getDescriptor().id + ':acestream:' + id + ':' + title,
            sources: [{
                url: 'hls:http://' + service.acestreamIp + ':6878/ace/manifest.m3u8?id=' + id.replace('//', '')
            }],
            no_subtitle_scan: true
        });
    });

    plugin.addURI(plugin.getDescriptor().id + ":seetv:(.*):(.*)", function(page, url, title) {
        page.metadata.title = unescape(title);
        page.loading = true;
        var resp = showtime.httpReq("http://seetv.tv/see/" + unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/"link",([\S\s]*?)\)/);
        if (match) {
            page.loading = true;
            doc = showtime.JSONDecode(showtime.httpReq('http://seetv.tv/get/player/' + match[1], {
                headers: {
                    Referer: 'http://seetv.tv/see/' + unescape(url),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }));
            page.loading = false;

            if (doc && doc.file) {
                page.type = "video";
                page.source = "videoparams:" + showtime.JSONEncode({
                    title: unescape(title),
                    canonicalUrl: plugin.getDescriptor().id + ':seetv:' + url + ':' + title,
                    sources: [{
                        url: 'hls:' + unescape(doc.file)
                    }],
                    no_subtitle_scan: true
                });
            } else
                page.error("Sorry, can't get the link :(");
        } else
            page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":1hd:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var resp = showtime.httpReq(unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/file:"([\S\s]*?)"/);
        if (match) {
             page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':1hd:' + url + ':' + title,
                sources: [{
                    url: match[1]
                }],
                no_subtitle_scan: true
            });
        } else page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":jampo:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var resp = showtime.httpReq("http://tv.jampo.tv/play/channel/" + unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/"st=([\S\s]*?)\&/);
        if (match) {
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':jampo:' + url + ':' + title,
                sources: [{
                    url: 'hls:' + showtime.JSONDecode(unhash(match[1])).file
                }],
                no_subtitle_scan: true
            });
        } else page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":glaz:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var resp = showtime.httpReq("http://www.glaz.tv/online-tv/" + unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/file=([\S\s]*?)\"/);
        if (match) {
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':glaz:' + url + ':' + title,
                sources: [{
                    url: match[1].match(/m3u8/) ? 'hls:' + match[1] : match[1]
                }],
                no_subtitle_scan: true
            });
       } else page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":yamgo:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);

        var resp = showtime.JSONDecode(showtime.httpReq("http://yamgo.com/get/channel?id=" + unescape(url)));
        page.loading = false;
        if (resp.channel && resp.channel.channel_stream) {
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':yamgo:' + url + ':' + title,
                sources: [{
                    url: 'hls:' + resp.channel.channel_stream
                }],
                no_subtitle_scan: true
            });
       } else page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":yamgoClips:(.*):(.*)", function(page, id, title) {
        setPageHeader(page, unescape(title));
        page.loading = true;
        for (var i in clips[id]) {
            page.appendItem('youtube:video:' + clips[id][i].yt_id , "video", {
	        title: new showtime.RichText(clips[id][i].clip_name),
                genre: clips[id][i].subcat_name,
                duration: showtime.durationToString(clips[id][i].clip_duration),
                description: new showtime.RichText(clips[id][i].yt_description)
	    });
        }
        page.loading = false;
    });

    var clips = [];

    plugin.addURI(plugin.getDescriptor().id + ":yamgoYoutube:(.*):(.*)", function(page, id, title) {
        setPageHeader(page, unescape(title));
        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq("http://yamgo.com/get/channel?id=" + unescape(id) + '&shows=1'));

        for (var i in json.shows) {
            page.appendItem(plugin.getDescriptor().id + ":yamgoClips:" + json.shows[i].id + ':' + escape(json.shows[i].name) , "video", {
	        title: new showtime.RichText(json.shows[i].name),
                genre: json.shows[i].subcat,
                duration: showtime.durationToString(json.shows[i].duration),
                icon: json.shows[i].image_url,
                description: new showtime.RichText(json.shows[i].description)
	    });
            clips[json.shows[i].id] = json.shows[i].clips;
        }
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":trk:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var resp = showtime.httpReq('http://' + unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/source: '([\S\s]*?)'/);
            if (match) {
                page.type = "video";
                page.source = "videoparams:" + showtime.JSONEncode({
                    title: unescape(title),
                    canonicalUrl: plugin.getDescriptor().id + ':trk:' + url + ':' + title,
                    sources: [{
                        url: 'hls:' + match[1]
                    }],
                    no_subtitle_scan: true
                });
            } else page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":gamax:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var resp = showtime.httpReq(unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/'file': '([\S\s]*?)' \}/);
            if (match) {
                page.type = "video";
                page.source = "videoparams:" + showtime.JSONEncode({
                    title: unescape(title),
                    canonicalUrl: plugin.getDescriptor().id + ':gamax:' + url + ':' + title,
                    sources: [{
                        url: match[1].match(/m3u8/) ? 'hls:' + match[1] : match[1]
                    }],
                    no_subtitle_scan: true
                });
            } else page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":euronews:(.*):(.*)", function(page, country, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var resp = showtime.httpReq('http://www.euronews.com/news/streaming-live/', {
            postdata: {
                action: 'getHexaglobeUrl'
            }
        }).toString();
        var json = showtime.JSONDecode(showtime.httpReq(resp));
        page.loading = false;
        if (json.status && json.status == 'ok') {
            page.type = "video";
            page.source = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                canonicalUrl: plugin.getDescriptor().id + ':euronews:' + country + ':' + title,
                sources: [{
                    url: 'hls:' + json.primary[country].hls
                }],
                no_subtitle_scan: true
            });
        } else
             page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":vgtrk:(.*):(.*)", function(page, url, title) {
        page.metadata.title = unescape(title);
        page.loading = true;
        var resp = showtime.httpReq(unescape(url)).toString();
        page.loading = false;
        var match = resp.match(/"auto":"([\S\s]*?)"\}/);
            if (match) {
                page.type = "video";
                page.source = "videoparams:" + showtime.JSONEncode({
                    title: unescape(title),
                    canonicalUrl: plugin.getDescriptor().id + ':vgtrk:' + url + ':' + title,
                    sources: [{
                        url: 'hls:' + match[1].replace(/\\/g, '')
                    }],
                    no_subtitle_scan: true
                });
            } else
                 page.error("Sorry, can't get the link :(");
    });

    plugin.addURI(plugin.getDescriptor().id + ":ts:(.*):(.*)", function(page, url, title) {
        page.metadata.title = unescape(title);
        var link = "videoparams:" + showtime.JSONEncode({
            title: unescape(title),
            no_fs_scan: true,
            canonicalUrl: plugin.getDescriptor().id + ':ts:' + url + ':' + title,
            sources: [{
                url: unescape(url),
                mimetype: 'video/mp2t'
            }],
            no_subtitle_scan: true
        });
        page.type = 'video'
        page.source = link;
    });


    function fill_fav(page) {
	var list = eval(store.list);

        if (!list || !list.toString()) {
           page.error("My Favorites list is empty");
           return;
        }
        var pos = 0;
	for (var i in list) {
	    var itemmd = showtime.JSONDecode(list[i]);
	    var item = page.appendItem(decodeURIComponent(itemmd.link), "video", {
       		title: decodeURIComponent(itemmd.title),
		icon: itemmd.icon ? decodeURIComponent(itemmd.icon) : null,
                description: new showtime.RichText(coloredStr('Link: ', orange) + decodeURIComponent(itemmd.link))
	    });
	    item.addOptAction("Remove '" + decodeURIComponent(itemmd.title) + "' from My Favorites", pos);

	    item.onEvent(pos, function(item) {
		var list = eval(store.list);
		showtime.notify("'" + decodeURIComponent(showtime.JSONDecode(list[item]).title) + "' has been removed from My Favorites.", 2);
	        list.splice(item, 1);
		store.list = showtime.JSONEncode(list);
                page.flush();
                fill_fav(page);
	    });
            pos++;
	}
    }

    // Favorites
    plugin.addURI(plugin.getDescriptor().id + ":favorites", function(page) {
        setPageHeader(page, "My Favorites");
        fill_fav(page);
    });

    plugin.addURI(plugin.getDescriptor().id + ":indexTivix:(.*):(.*)", function(page, url, title) {
        setPageHeader(page, decodeURIComponent(title));
        var url = prefixUrl = 'http://tivix.net' + decodeURIComponent(url);
        var tryToSearch = true, fromPage = 1, n = 0;

        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var doc = showtime.httpReq(url).toString();
            page.loading = false;
            // 1-title, 2-url, 3-icon
            var re = /<div class="all_tv" title="(.*?)">[\S\s]{0,2}?.*<a.*?href="(.*?)" title=".*?"><img src="(.*?)"><\/a>/g;
            var match = re.exec(doc);
            while (match) {
                var link = plugin.getDescriptor().id + ":tivix:" + escape(match[2]) + ':' + escape(match[1]);
                var icon = 'http://tivix.net' + match[3];
                var item = page.appendItem(link, "video", {
                    title: match[1],
                    icon: icon
                });
                addToFavoritesOption(item, link, match[1], icon);
                n++;
                match = re.exec(doc);
            }
            page.metadata.title = new showtime.RichText(decodeURIComponent(title) + ' (' + n + ')');
            var next = doc.match(/">Вперед<\/a>/);
            if (!next)
                return tryToSearch = false;
            fromPage++;
            url = prefixUrl + 'page/' + fromPage;;
            return true;
        }
        loader();
        page.paginator = loader;
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":tivixStart", function(page) {
        setPageHeader(page, 'Tivix.net');
        page.loading = true;
        var doc = showtime.httpReq('http://tivix.net').toString();
        page.loading = false;
        var re = /<div class="menuuuuuu"([\S\s]*?)<\/div>/g;
        var menus = re.exec(doc);
        var re2 = /<a href="([\S\s]*?)"[\S\s]*?>([\S\s]*?)<\/a>/g;
        while (menus) {
            var submenus = re2.exec(menus[1]);
            while (submenus) {
                page.appendItem(plugin.getDescriptor().id + ":indexTivix:" + encodeURIComponent(submenus[1]) + ':' + encodeURIComponent(submenus[2]), "directory", {
	            title: submenus[2]
                });
                submenus = re2.exec(menus[1]);
            }
            menus = re.exec(doc);
            page.appendItem("", "separator");
        }
    });

    plugin.addURI(plugin.getDescriptor().id + ":divanStart", function(page) {
        setPageHeader(page, 'Divan.tv');
        page.loading = true;
        var international = false;
        setDivanHeaders();

        var doc = showtime.httpReq('https://divan.tv/tv/?devices=online&access=free').toString();
        if (doc.match(/land-change-site/) || international) {
            international = true;
            doc = showtime.httpReq('https://divan.tv/int/tv/?devices=online&access=free').toString();
        }

        // 1-url, 2-icon, 3-title
        var re = /class="tv-channel[\S\s]*?<a href="([\S\s]*?)"[\S\s]*?src="([\S\s]*?)"[\S\s]*?<a title="([\S\s]*?)"/g;
        var n = 0;

        function appendItems() {
            var match = re.exec(doc);
            while (match) {
                var item = page.appendItem(plugin.getDescriptor().id + ":divan:" + escape(match[1]) + ':' + escape(match[3]), "video", {
                    title: match[3],
                    icon: match[2]
                });
                addToFavoritesOption(item, plugin.getDescriptor().id + ":divan:" + escape(match[1]) + ':' + escape(match[3]), match[3], match[2]);
                match = re.exec(doc);
                n++;
            }
        }

        appendItems();
        var nextPageUrl = 'http://divan.tv/tv/getNextPage';
        if (international)
            nextPageUrl = 'https://divan.tv/int/tv/getNextPage';
        doc = showtime.httpReq(nextPageUrl, {
            postdata: {
                filters: '{"page":2}'
            }
        }).toString();
        appendItems();

        doc = showtime.httpReq(nextPageUrl, {
            postdata: {
                filters: '{"page":3}'
            }
        }).toString();
        appendItems();

        page.metadata.title = 'Divan.tv (' + n + ')';
        page.options.createAction('loginToDivan', 'Login to divan.tv', function() {
            page.loading = false;
            var credentials = plugin.getAuthCredentials(plugin.getDescriptor().id, 'Enter email and password to login', true, 'divan');
            if (credentials.rejected) {
                page.error('Cannot continue without login/password :(');
                return false;
            }
            if (credentials && credentials.username && credentials.password) {
                page.loading = true;
                var resp = showtime.httpReq('http://divan.tv/users/login', {
                    headers: {
                        Origin: 'http://divan.tv',
                        Referer: 'http://divan.tv/',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    postdata: {
                        'data[Form][login]': credentials.username,
                        'data[Form][password]': credentials.password,
                        'data[Form][remember]': 1,
                        '': 'ВОЙТИ'
                    }
                });
                page.flush();
                page.redirect(plugin.getDescriptor().id + ':divanStart');
            }
        });
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":sputnikStart", function(page) {
        setPageHeader(page, 'Sputniktv.in.ua');
        page.loading = true;

        plugin.addHTTPAuth('.*divan\\.tv', function(req) {
            req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
        });
        plugin.addHTTPAuth('.*divan\\.tv.*', function(req) {
            req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
        });

        var n = 0;
        // 1-link, 2-title, 3-epg
        var re = /<div class="channel_main channel" onclick="location.href='([\s\S]*?)'[\s\S]*?<div class="program_title">([\s\S]*?)<\/div>([\s\S]*?)<\/span>/g;

        var html = showtime.httpReq('http://sputniktv.in.ua/tv.html').toString();
        var match = re.exec(html);
        while (match) {
            var epg = match[3].match(/<div class="pstart">([\s\S]*?)<\/div>[\s\S]*?<div class="pstartt">([\s\S]*?)<\/div><div class="progran_translation">([\s\S]*?)<\/div>/);
            if (epg) epg  = coloredStr(' (' + epg[1] + '-' + epg[2] + ') ' + epg[3], orange)
            else epg = ''
            var link = plugin.getDescriptor().id + ':sputniktv:' + escape('http://sputniktv.in.ua/' + match[1]) + ':' + escape(match[2]);
            var item = page.appendItem(link, 'video', {
                title: new showtime.RichText(match[2] + epg),
                description: new showtime.RichText(match[2] + epg)
            });
            addToFavoritesOption(item, link, match[2], '');
            n++;
            match = re.exec(html);
        }
        page.metadata.title = new showtime.RichText('Sputniktv.in.ua (' + n + ')');
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":drundooPlay:(.*):(.*)", function(page, url, title) {
        page.metadata.title = unescape(title);
        page.loading = true;
        var link = null, showDialog = false;
        var doc = showtime.httpReq('http://drundoo.com' + unescape(url)).toString();
        var link = doc.match(/getJSON\(\"([\s\S]*?)\"/);
        if (doc.match(/user_not_logged/)) {
            while (!link) {
                page.loading = false;
                var credentials = plugin.getAuthCredentials(plugin.getDescriptor().id, 'Enter email and password to login', showDialog, 'drundoo');
                if (credentials.rejected) {
                    page.error('Cannot continue without login/password :(');
                    return false;
                }

                if (credentials && credentials.username && credentials.password) {
                    page.loading = true;
                    var resp = showtime.httpReq('http://drundoo.com/users/login/', {
                        headers: {
                            Origin: 'http://drundoo.com',
                            Referer: 'http://drundoo.com/live/',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        postdata: {
                            'login_dialog': 1,
                            'redirect_url': 'http://drundoo.com/live/',
                            email: credentials.username,
                            password: credentials.password
                        }
                    });
                    doc = showtime.httpReq('http://drundoo.com' + unescape(url)).toString();
                }
                showDialog = true;
                link = doc.match(/getJSON\(\"([\s\S]*?)\"/);
            }
        }

        if (link) {
            var json = showtime.JSONDecode(showtime.httpReq('http://drundoo.com' + link[1]));
            page.type = 'video'
            var link = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                no_fs_scan: true,
                canonicalUrl: plugin.getDescriptor().id + ':drundooPlay:' + url + ':' + title,
                sources: [{
                    url: 'hls:' + json.link,
                }],
                no_subtitle_scan: true
            });
            page.source = link;
        } else
            page.error("Sorry can't get the link :(");
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":drundooStart", function(page) {
        setPageHeader(page, 'Drun Doo');
        page.loading = true;
        doc = showtime.httpReq('http://drundoo.com/live/').toString();
        var counter = 0;
        // 1-logo, 2-genres, 3-from, 4-to, 5-playing now, 6-link, 7-title
        var re = /<a class="logo logo-width"[\s\S]*?<img src="([\s\S]*?)"[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<span class="from">([\s\S]*?)<\/span>[\s\S]*?<span class="to">([\s\S]*?)<\/span>[\s\S]*?class="plaing-now">([\s\S]*?)<\/h5>[\s\S]*?<a href="([\s\S]*?)"[\s\S]*?data-ga-label="([\s\S]*?)"/g;
        var match = re.exec(doc);
        while (match) {
            var link = plugin.getDescriptor().id + ':drundooPlay:' + escape(match[6]) + ':' + escape(match[7]);
            var icon = 'http://drundoo.com' + match[1];
            var item = page.appendItem(link, "video", {
                title: new showtime.RichText(match[7] + coloredStr(' (' + match[3] + '-' + match[4] + ') ' + match[5], orange)),
                icon: icon,
                genre: match[2].trim().replace(/;/g, ',').replace(/<[^>]*>/g, ''),
                description: new showtime.RichText(match[7] + coloredStr(' (' + match[3] + '-' + match[4] + ') ' + match[5], orange))
            });
            addToFavoritesOption(item, link, match[7], icon);
            counter++;
            match = re.exec(doc);
        };
        page.metadata.title += ' (' + counter + ')';
        page.options.createAction('setYooooKey', 'Set/change Yoooo.tv key', function() {
            var result = showtime.textDialog('Enter authorization key:', true, true);
            if (!result.rejected && result.input) {
                yoooo.key = result.input;
                var resp = showtime.httpReq('http://yoooo.tv/status.php?key=' + yoooo.key).toString();
                showtime.notify("The key is set: " + resp.trim(), 2);
                page.flush();
                page.redirect(plugin.getDescriptor().id + ':yooooStart');
            }
        });
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":yooooStart", function(page) {
        setPageHeader(page, 'Yoooo.tv');
        page.loading = true;
        var id = yoooo.key ? yoooo.key.trim() : '';
        plugin.addHTTPAuth('.*yoooo\\.tv', function(req) {
            req.setHeader('Cookie', 'yoooo=' + id);
        });
        plugin.addHTTPAuth('.*yoooo\\.tv.*', function(req) {
            req.setHeader('Cookie', 'yoooo=' + id);
        });

        if (!id) {
            var doc = showtime.httpReq('http://yoooo.tv', {
                headers: {
                    'Cookie': ''
                },
                method: 'HEAD'
            });
            if (!doc.headers['Set-Cookie']) {
                page.error("Sorry, can't get ID :(");
                return;
            }
            id = (doc.headers['Set-Cookie']).match(/yoooo=([\S\s]*?);/)[1];
        }

        page.loading = true;
        json = showtime.JSONDecode(showtime.httpReq('http://yoooo.tv/json/channel_now'));
        var counter = 0;
        for (var i in json) {
            var title = json[i].channel_name;
            var link = "videoparams:" + showtime.JSONEncode({
                title: title,
                sources: [{
                    url: 'hls:http://tv.yoooo.tv/onstream/' + id + '/' + i + '.m3u8'
                }],
                no_subtitle_scan: true
            });
            var icon = 'http://yoooo.tv/images/playlist/' + json[i].img;
            var item = page.appendItem(link, "video", {
                title: new showtime.RichText(title + ' - ' + coloredStr(json[i].name, orange)),
                icon: icon,
                duration: json[i].duration / 60,
                description: new showtime.RichText(coloredStr(json[i].name, orange) + ' ' + json[i].descr)
            });
            addToFavoritesOption(item, link, title, icon);
            counter++;
        };
        page.metadata.title = 'Yoooo.tv (' + counter + ')';
        page.options.createAction('setYooooKey', 'Set/change Yoooo.tv key', function() {
            var result = showtime.textDialog('Enter authorization key:', true, true);
            if (!result.rejected && result.input) {
                yoooo.key = result.input;
                var resp = showtime.httpReq('http://yoooo.tv/status.php?key=' + yoooo.key).toString();
                showtime.notify("The key is set. Response: " + resp.trim(), 2);
                page.flush();
                page.redirect(plugin.getDescriptor().id + ':yooooStart');
            }
        });
        page.loading = false;
    });

    function showPlaylist(page) {
	var list = eval(playlists.list);

        if (!list || !list.toString()) {
            page.appendPassiveItem("directory", '', {
                title: "You can add M3U & XML playlists via the page menu"
            });
        }
        var pos = 0;
	for (var i in list) {
	    var itemmd = showtime.JSONDecode(list[i]);
            if (!itemmd.link.match(/m3u:http/) && !itemmd.link.match(/xml:http/))
                itemmd.link = 'm3u:' + itemmd.link;
	    var item = page.appendItem(itemmd.link + ':' + itemmd.title, "directory", {
       		title: decodeURIComponent(itemmd.title),
		link: decodeURIComponent(itemmd.link)
	    });
	    item.addOptAction("Remove '" + decodeURIComponent(itemmd.title) + "' playlist from the list", pos);
	    item.onEvent(pos, function(item) {
		var list = eval(playlists.list);
		showtime.notify("'" + decodeURIComponent(showtime.JSONDecode(list[item]).title) + "' has been removed from from the list.", 2);
	        list.splice(item, 1);
		playlists.list = showtime.JSONEncode(list);
                page.flush();
                page.redirect(plugin.getDescriptor().id + ':start');
	    });
            pos++;
	}
    }

    var m3uItems = [], groups = [], theLastList = '';

    plugin.addURI('m3uGroup:(.*):(.*)', function(page, pl, groupID) {
        setPageHeader(page, decodeURIComponent(groupID));
        if (theLastList != pl)
            readAndParseM3U(page, pl);

        var num = 0;
        for (var i in m3uItems) {
            if (decodeURIComponent(groupID) != m3uItems[i].group)
                continue;
            addItem(page, m3uItems[i].url, m3uItems[i].title, m3uItems[i].logo);
            num++;
        }
        page.metadata.title = decodeURIComponent(groupID) + ' (' + num + ')';
    });

    function readAndParseM3U(page, pl) {
        var tmp = page.metadata.title + '';
        page.loading = true;
        page.metadata.title = 'Downloading M3U list...';
        var m3u = showtime.httpReq(decodeURIComponent(pl)).toString().split('\n');
        theLastList = pl;
        m3uItems = [], groups = [];
        var m3uUrl = '', m3uTitle = '', m3uImage = '', m3uGroup = '';
        var line = '', m3uRegion = '', m3uEpgId = '';
        for (var i = 0; i < m3u.length; i++) {
            page.metadata.title = 'Parsing M3U list. Line ' + i + ' of ' + m3u.length;
            line = m3u[i].trim();
            if (line.substr(0, 7) != '#EXTM3U' && line.indexOf(':') < 0 && line.length != 40) continue; // skip invalid lines
            line = showtime.entityDecode(line.replace(/[\u200B-\u200F\u202A-\u202E]/g, ''));
            switch(line.substr(0, 7)) {
                case '#EXTM3U':
                    var match = line.match(/region=(.*)\b/);
                    if (match)
                        m3uRegion = match[1];
                    break;
                case '#EXTINF':
                    var match = line.match(/#EXTINF:.*,(.*)/);
                    if (match)
                        m3uTitle = match[1].trim();
                    match = line.match(/group-title="([\s\S]*?)"/);
                    if (match) {
                        m3uGroup = match[1].trim();
                        if (groups.indexOf(m3uGroup) < 0)
                            groups.push(m3uGroup);
                    }
                    match = line.match(/tvg-logo=["|”]([\s\S]*?)["|”]/);
                    if (match)
                        m3uImage = match[1].trim();
                    match = line.match(/region="([\s\S]*?)"/);
                    if (match)
                        m3uRegion = match[1];
                    if (m3uRegion) {
                        match = line.match(/description="([\s\S]*?)"/);
                        if (match)
                            m3uEpgId = match[1];
                    }
                    break;
                case '#EXTGRP':
                    var match = line.match(/#EXTGRP:(.*)/);
                    if (match) {
                        m3uGroup = match[1].trim();
                        if (groups.indexOf(m3uGroup) < 0)
                            groups.push(m3uGroup);
                    }
                    break;
                default:
                    if (line[0] == '#') continue; // skip unknown tags
                    line = line.replace(/rtmp:\/\/\$OPT:rtmp-raw=/, '');
                    if (line.indexOf(':') == -1 && line.length == 40)
                        line = 'acestream://' + line;
                    if (m3uImage && m3uImage.substr(0, 4) != 'http')
                        m3uImage = line.match(/^.+?[^\/:](?=[?\/]|$)/) + '/' + m3uImage;
                    m3uItems.push({
                        title: m3uTitle ? m3uTitle : line,
                        url: line,
                        group: m3uGroup,
                        logo: m3uImage,
                        region: m3uRegion,
                        epgid: m3uEpgId
                    });
                    m3uUrl = '', m3uTitle = '', m3uImage = '', m3uEpgId = '';//, m3uGroup = '';
            }
        }
        page.metadata.title = new showtime.RichText(tmp);
        page.loading = false;
    }

    function addItem(page, url, title, icon, description, genre, epgForTitle) {
        if (!epgForTitle) epgForTitle = '';
        // try to detect item type
        var match = url.match(/([\s\S]*?):(.*)/);
        var type = 'video';
        if (match && match[1].toUpperCase().substr(0, 4) != 'HTTP' &&
            match[1].toUpperCase().substr(0, 4) != 'RTMP') {
            var link = plugin.getDescriptor().id + ':' + match[1] + ":" + escape(match[2]) + ':' + escape(title);
            if (match[1].toUpperCase() == 'M3U') { // the link is m3u list
                var link = 'm3u:' + encodeURIComponent(match[2]) + ":" + escape(title);
                type = 'directory'
            }
            var linkUrl = link;
        } else {
            var link = "videoparams:" + showtime.JSONEncode({
                title: title,
                sources: [{
                    url: url.match(/m3u8/) || url.match(/\.smil/) ? 'hls:' + url : url
                }],
                no_fs_scan: true,
                no_subtitle_scan: true
            });
            var linkUrl = url;
        }
        // get icon from description
        if (!icon && description) {
            icon = description.match(/img src="(\s\S*?)"/)
            if (icon) icon = icon[1];
        }
        if (!linkUrl) {
            var item = page.appendPassiveItem(type, '', {
                title: new showtime.RichText(title + epgForTitle),
                icon: icon ? icon : null,
                genre: genre,
                description: new showtime.RichText(description)
            });
        } else {
            var item = page.appendItem(link, type, {
                title: new showtime.RichText(title  + epgForTitle),
                icon: icon ? icon : null,
                genre: genre,
                description: new showtime.RichText((linkUrl ? coloredStr('Link: ', orange) + linkUrl : '') +
                    (description ? '\n' + description : ''))
            });
            addToFavoritesOption(item, link, title, icon);
        }
    }

    plugin.addURI('m3u:(.*):(.*)', function(page, pl, title) {
        setPageHeader(page, unescape(title));
        readAndParseM3U(page, pl);

        var num = 0;
        for (var i in groups) {
            page.appendItem('m3uGroup:' + pl + ':' + encodeURIComponent(groups[i]), "directory", {
	        title: groups[i]
            });
            num++;
        }

        for (var i in m3uItems) {
            if (m3uItems[i].group)
                continue;
            var extension = m3uItems[i].url.split('.').pop().toUpperCase();
            if (extension == 'M3U' || extension == 'PHP' && m3uItems[i].url.toUpperCase().substr(0, 4) != 'RTMP') {
                page.appendItem('m3u:' + encodeURIComponent(m3uItems[i].url) + ':' + encodeURIComponent(m3uItems[i].title), "directory", {
                    title: m3uItems[i].title
                });
                num++;
            } else {
                var description = '';
                if (m3uItems[i].region && m3uItems[i].epgid)
                    description = getEpg(m3uItems[i].region, m3uItems[i].epgid);
                addItem(page, m3uItems[i].url, m3uItems[i].title, m3uItems[i].logo, description, '', epgForTitle);
                epgForTitle = '';
                num++;
            }
        }
        page.metadata.title = new showtime.RichText(unescape(title) + ' (' + num + ')');
    });

    var XML = require('showtime/xml');

    function setColors(s) {
        if (!s) return '';
        return s.toString().replace(/="##/g, '="#').replace(/="lime"/g,
            '="#32CD32"').replace(/="aqua"/g, '="#00FFFF"').replace(/='green'/g,
            '="#00FF00"').replace(/='cyan'/g, '="#00FFFF"').replace(/="LightSalmon"/g,
            '="#ffa07a"').replace(/="PaleGoldenrod"/g, '="#eee8aa"').replace(/="Aquamarine"/g,
            '="#7fffd4"').replace(/="LightSkyBlue"/g, '="#87cefa"').replace(/="palegreen"/g,
            '="#98fb98"').replace(/="yellow"/g, '="#FFFF00"').replace(/font color=""/g, 'font color="#FFFFFF"');
    }

    plugin.addURI(plugin.getDescriptor().id + ':parse:(.*):(.*)', function(page, parser, title) {
        setPageHeader(page, unescape(title));
        page.loading = true;
        var n = 1;
        showtime.print('Parser is: ' + unescape(parser));
        var params = unescape(parser).split('|');
        showtime.print('Requesting: ' + params[0]);
        if (!params[0]) {
            page.error('The link is empty');
            return;
        }
        var html = showtime.httpReq(params[0]).toString();
        var base_url = params[0].match(/^.+?[^\/:](?=[?\/]|$)/);
        if (params.length > 1) {
            var start = html.indexOf(params[1]) + params[1].length;
            var length = html.indexOf(params[2], start) - start;
            var url = html.substr(start, length).split(',');
            showtime.print('Found URL: ' + url);
            //var urlCheck = params[1].replace(/\\\//g, '/') + url + params[2].replace(/\\\//g, '/');
            //if (urlCheck.match(/(http.*)/))
            //    url = urlCheck.match(/(http.*)/)[1];
            if (!url[0].trim()) {
                url = html.match(/pl:"([\s\S]*?)"/)[1];
                showtime.print('Fetching URL from pl: ' + url);
                var json = showtime.JSONDecode(showtime.httpReq(url));
            } else if (url[0].trim().substr(0, 4) != 'http') {
                if (url[0][0] == '/') {
                    page.appendItem(base_url + url[0], 'video', {
                        title: new showtime.RichText(unescape(title))
                    });
                } else {
                    url = url[0].match(/value="([\s\S]*?)"/);
                    if (url) {
                        url = url[1];
                        showtime.print('Fetching URL from value: ' + url);
                        var json = showtime.JSONDecode(showtime.httpReq(url));
                        showtime.print(showtime.JSONEncode(json));
                        for (var i in json.playlist) {
                            if (json.playlist[i].file) {
                                page.appendItem(json.playlist[i].file.split(' ')[0], 'video', {
                                    title: new showtime.RichText(json.playlist[i].comment)
                                });
                            }
                            for (var j in json.playlist[i].playlist) {
                                //showtime.print(json.playlist[i].playlist[j].comment);
                                page.appendItem(json.playlist[i].playlist[j].file.split(' ')[0], 'video', {
                                    title: new showtime.RichText(json.playlist[i].comment + ' - ' + json.playlist[i].playlist[j].comment)
                                });
                            }
                        }
                    } else {
                        showtime.print('Fetching URL from file":": ' + url);
                        var file = html.match(/file":"([\s\S]*?)"/);
                        if (file) {
                            page.appendItem(file[1].replace(/\\\//g, '/'), 'video', {
                                title: new showtime.RichText(unescape(title))
                            });
                        } else {
                            showtime.print('Fetching URL from pl":": ' + url);
                            var pl = html.match(/pl":"([\s\S]*?)"/)[1].replace(/\\\//g, '/');
                            var json = showtime.JSONDecode(showtime.httpReq(pl).toString().trim());
                            for (var i in json.playlist) {
                                if (json.playlist[i].file) {
                                    page.appendItem(json.playlist[i].file.split(' ')[0], 'video', {
                                        title: new showtime.RichText(json.playlist[i].comment)
                                    });
                                }
                                for (var j in json.playlist[i].playlist) {
                                    //showtime.print(json.playlist[i].playlist[j].comment);
                                    page.appendItem(json.playlist[i].playlist[j].file.split(' ')[0], 'video', {
                                        title: new showtime.RichText(json.playlist[i].comment + ' - ' + json.playlist[i].playlist[j].comment)
                                    });
                                }
                            }
                        }
                    }
                }
            } else {
                for (i in url) {
                    page.appendItem(url[i], 'video', {
                        title: new showtime.RichText(unescape(title) + ' #' + n)
                    });
                    n++;
                }
            }
        } else {
            html = html.split('\n');
            for (var i = 0; i < html.length; i++) {
                if (!html[i].trim()) continue;
                page.appendItem(html[i].trim(), 'video', {
                    title: new showtime.RichText(unescape(title) + ' #' + n)
                });
                n++;
            }
        }
        page.loading = false;
    });

    var epgForTitle = '';

    function getEpg(region, channelId) {
        var description = '';
        try {
            var epg = showtime.httpReq('https://tv.yandex.ua/' + region + '/channels/' + channelId);
            // 1-time, 2-title
            var re = /tv-event_wanna-see_check i-bem[\s\S]*?<span class="tv-event__time">([\s\S]*?)<\/span><div class="tv-event__title"><div class="tv-event__title-inner">([\s\S]*?)<\/div>/g;
            var match = re.exec(epg);
            var first = true;
            while (match) {
                if (first) {
                    epgForTitle = coloredStr(' (' + match[1] + ') ' + match[2], orange);
                    first = false;
                }
                description += '<br>' + match[1] + coloredStr(' - ' + match[2], orange);
                match = re.exec(epg);
            }
        } catch(err) {}
        return description;
    }

    var adults = ['O-la-la', 'XXL', 'Русская ночь', 'Blue Hustler', 'Brazzers TV Europe', 'Playboy TV'];

    plugin.addURI('xml:(.*):(.*)', function(page, pl, pageTitle) {
        showtime.print('Main list: ' + decodeURIComponent(pl).trim());
        setPageHeader(page, unescape(pageTitle));
        page.loading = true;
        try {
            var doc = XML.parse(showtime.httpReq(decodeURIComponent(pl)));
        } catch(err) {
            page.error(err);
            return;
        }
        if (!doc.items) {
            page.error('Cannot get proper xml file');
            return;
        }

        var categories = [];
        var category = doc.items.filterNodes('category');
        for (var i = 0; i < category.length; i++)
            categories[category[i].category_id] = category[i].category_title;

        var channels = doc.items.filterNodes('channel');
        var num = 0;
        for (var i = 0; i < channels.length; i++) {
            //if (channels[i].category_id && channels[i].category_id != 1) continue;
            var title = showtime.entityDecode(channels[i].title);
            if (service.dontShowAdult && adults.indexOf(title) != -1) continue;
            //showtime.print(title);
            title = setColors(title);
            var playlist = channels[i].playlist_url;
            var description = channels[i].description ? channels[i].description : null;
            description = setColors(description);

            var icon = null;
            if (channels[i].logo_30x30 && channels[i].logo_30x30.substr(0, 4) == 'http')
                icon = channels[i].logo_30x30;
            if (!icon && channels[i].logo && channels[i].logo.substr(0, 4) == 'http')
                icon = channels[i].logo;
            if (!icon && description) {
               icon = description.match(/src="([\s\S]*?)"/)
               if (icon) icon = showtime.entityDecode(icon[1]);
            }

            // show epg if available
            epgForTitle = '';
            if (channels[i].region && +channels[i].description)
                description = getEpg(channels[i].region, channels[i].description);
            description = description.replace(/<img[\s\S]*?src=[\s\S]*?(>|$)/, '').replace(/\t/g, '').replace(/\n/g, '').trim();

            genre = channels[i].category_id ? categories[channels[i].category_id] : null;
            if (playlist && playlist != 'null' && !channels[i].parser) {
                var extension = playlist.split('.').pop().toLowerCase();
                if (extension != 'm3u')
                    extension = 'xml';
                var url = extension + ':' + encodeURIComponent(playlist) + ':' + escape(title);
                page.appendItem(url, 'video', {
                    title: new showtime.RichText(title + epgForTitle),
                    icon: icon,
                    genre: genre,
                    description: new showtime.RichText((playlist ? coloredStr('Link: ', orange) + playlist + '\n' : '') + description)
                });
            } else {
                if (channels[i].parser)
                    page.appendItem(plugin.getDescriptor().id + ':parse:' + escape(channels[i].parser) + ':' + escape(title), 'directory', {
                        title: new showtime.RichText(title + epgForTitle),
                        genre: genre
                    });
                else {
                    var url = channels[i].stream_url ? channels[i].stream_url : '';
                    var match = url.match(/http:\/\/www.youtube.com\/watch\?v=(.*)/);
                    if (match) {
                        url = 'youtube:video:' + match[1];
                        page.appendItem(url, 'video', {
                            title: title + epgForTitle,
                            icon: icon,
                            genre: genre,
                            description: new showtime.RichText(coloredStr('Link: ', orange) + url)
                        });
                    } else
                        addItem(page, url, title, icon, description, genre, epgForTitle);
                }
            }
            num++;
        }
        page.metadata.title = new showtime.RichText(unescape(pageTitle) + ' (' + num + ')');
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":streamlive:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        //showtime.print(unescape(url));
        var doc = showtime.httpReq(unescape(url)).toString();
        if (!doc.match(/getJSON\("([\s\S]*?)"/)) {
            showtime.trace('Question is: ' + doc.match(/Question:([\s\S]*?)<br/));
            var match = doc.match(/Question: \((\d+) (\-|\+) (\d+)\) x (\d+).*=/);
            if (match) {
                if (match[2] == '+')
                    var captcha = (+match[1] + (+match[3])) * (+match[4]);
                else
                    var captcha = (+match[1] - (+match[3])) * (+match[4]);
                showtime.trace('Sending number: ' + captcha);
                doc = showtime.httpReq(unescape(url), {
                    postdata: {
                        captcha: captcha
                    }
                })
                doc = showtime.httpReq(unescape(url)).toString();
            } else {
                match = null;
                if (doc.indexOf('in the box:') > -1)
                    match = doc.match(/[\s\S]*?in the box: ([\s\S]*?)<br/);
                if (match) {
                    captcha = match[1];
                    showtime.trace('Sending word: ' + captcha);
                    doc = showtime.httpReq(unescape(url), {
                        postdata: {
                            captcha: captcha
                        }
                    })
                    doc = showtime.httpReq(unescape(url)).toString();
                }
            }
        }
        var direct = doc.match(/<source src="([\s\S]*?)"/);
        var token = doc.match(/getJSON\("([\s\S]*?)"/);
        if (!token && !direct) {
            showtime.trace('Cannot pass captcha: ' + doc.match(/Question:([\s\S]*?)<br/));
            page.error('Cannot pass captcha. Return back and retry :(');
            return;
        }
        no_subtitle_scan = true;
        var param = '';
        if (direct) {
            streamer = direct[1];
            no_subtitle_scan = false;
            plugin.addHTTPAuth('.*od\\.streamlive\\.to.*', function(req) {
                req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
                req.setHeader('Host', 'od.streamlive.to');
                req.setHeader('Referer', streamer);
            });
        } else {
            token = showtime.JSONDecode(showtime.httpReq(token[1] + '&_=' +
                 token[1].match(/id=(\d+)/)[1] + Date.now().toString().substr(10, 3), {
                     headers: {
                         Host: 'www.streamlive.to',
                         Referer: unescape(url),
                         'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36',
                         'X-Requested-With': 'XMLHttpRequest'
                     }
            })).token;
            var streamer = doc.match(/streamer: "([\s\S]*?)"/)[1].replace(/\\/g, '');
            param = ' app=' + doc.match(/streamer: "[\s\S]*?(edge[\s\S]*?)"/)[1].replace(/\\/g, '');
            param += ' playpath=' + doc.match(/file: "([\s\S]*?)\./)[1];
            param += ' swfUrl=http://www.streamlive.to/ads/streamlive.swf';
            param += ' tcUrl=' + streamer;
            param += ' pageUrl=' + url;
            param += ' token=' + token;
        }
        page.type = 'video';
        page.source = "videoparams:" + showtime.JSONEncode({
            title: unescape(title),
            canonicalUrl: plugin.getDescriptor().id + ':streamlive:' + url + ':' + title,
            sources: [{
                url: streamer + param
            }],
            no_subtitle_scan: no_subtitle_scan
        });
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":streamliveStart", function(page) {
        setPageHeader(page, 'StreamLive.to');
        page.loading = true;

        plugin.addHTTPAuth('.*streamlive\\.to', function(req) {
            req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
            req.setHeader('Host', 'www.streamlive.to');
            req.setHeader('Origin', 'http://www.streamlive.to');
            req.setHeader('Referer', url);
        });

        plugin.addHTTPAuth('.*streamlive\\.to.*', function(req) {
            req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
            req.setHeader('Host', 'www.streamlive.to');
            req.setHeader('Origin', 'http://www.streamlive.to');
            req.setHeader('Referer', url);
        });

        var url = 'http://www.streamlive.to/channels';
        var doc = showtime.httpReq(url).toString();

        n = 1, tryToSearch = true;
        var totalCount = 0;

        function loader() {
            if (!tryToSearch) return false;
            // 1-logo, 2-title, 3-flags, 4-link, 5-description, 6-viewers, 7-category, 8-totalviews, 9-language
            var re = /class="clist-thumb">[\s\S]*?src="([\s\S]*?)"[\s\S]*?alt="([\s\S]*?)"([\s\S]*?)<a href="([\s\S]*?)"[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<span class="viewers">([\s\S]*?)<\/span>[\s\S]*?<span class="totalviews">([\s\S]*?)<\/span>[\s\S]*?">([\s\S]*?)<\/a>[\s\S]*?">([\s\S]*?)<\/a>/g;
            match = re.exec(doc);
            var itemsCount = 0;
            while (match) {
                if (match[3].match(/premium_only/)) {
                    match = re.exec(doc);
                    continue;
                }
                var link = plugin.getDescriptor().id + ':streamlive:' + escape(match[4]) + ':' + escape(match[2]);
                var iUrl = match[1];
                if (iUrl && (iUrl.substr(0, 2) == '//'))
                    iUrl = 'http:' + iUrl;
                var item = page.appendItem(link, "video", {
                    title: match[2],
                    icon: iUrl,
                    description: new showtime.RichText(coloredStr('Description: ', orange) + match[5].replace(/\s{2,}/g, ' ').replace(/\n/g, '') +
                        coloredStr('\nViewers: ', orange) + match[6] +
                        coloredStr('\nTotal views: ', orange) + match[7] +
                        coloredStr('\nCategory: ', orange) + match[8] +
                        coloredStr('\nLanguage: ', orange) + match[9])
                });
                addToFavoritesOption(item, link, match[2], match[1]);
                match = re.exec(doc);
                itemsCount++;
            };
            if (!itemsCount) return tryToSearch = false;
            totalCount += itemsCount;
            page.metadata.title = 'StreamLive.to (' + totalCount + ')';
            n++;
            doc = showtime.httpReq(url + '/?p=' + n);
            return true;
        }
        loader();
        page.paginator = loader;
        page.loading = false;
    });

    function addActionToTheItem(page, menuText, id, type) {
        page.options.createAction('addPlaylist' + type, menuText, function() {
            var result = showtime.textDialog('Enter the URL to the playlist like:\n' +
                'http://bit.ly/' + id + ' or just bit.ly/' + id + ' or ' + id, true, true);
            if (!result.rejected && result.input) {
                var link = result.input;
                if (!link.match(/\./))
                    link = 'http://bit.ly/' + link;
                if (!link.match(/:\/\//))
                    link = 'http://' + link;
                var result = showtime.textDialog('Enter the name of the playlist:', true, true);
                if (!result.rejected && result.input) {
                    var entry = showtime.JSONEncode({
                        title: encodeURIComponent(result.input),
                        link: type.toLowerCase() + ':' + encodeURIComponent(link)
                    });
                    playlists.list = showtime.JSONEncode([entry].concat(eval(playlists.list)));
                    showtime.notify("Playlist '" + result.input + "' has been added to the list.", 2);
                    page.flush();
                    page.redirect(plugin.getDescriptor().id + ':start');
                }
            }
        });
    }

    var idcJson;

    plugin.addURI(plugin.getDescriptor().id + ":idcPlay:(.*):(.*)", function(page, id, title) {
        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq('http://iptvn.idc.md/api/json/get_url?cid=' + id));
        page.type = 'video'
        var link = "videoparams:" + showtime.JSONEncode({
            title: decodeURI(title),
            no_fs_scan: true,
            canonicalUrl: plugin.getDescriptor().id + ':idcPlay:' + id + ':' + title,
            sources: [{
                url: unescape(json.url).replace('http/ts', 'http'),
                mimetype: 'video/mp2t'
            }],
            no_subtitle_scan: true
        });
        page.source = link;
        page.loading = false;
    });


    function getEpgPeriod(ts1, ts2, epg) {
        if (!ts1 || !ts2 || !epg) return '';
        function tsToTime(ts) {
            var a = new Date(ts * 1000);
            return (a.getHours() < 10 ? '0' + a.getHours() : a.getHours()) + ':' + (a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes());
        }
        return ' (' + tsToTime(ts1) + '-' + tsToTime(ts2) + ') ' + epg;
    }

    plugin.addURI(plugin.getDescriptor().id + ":idcGroups:(.*)", function(page, id) {
        page.loading = true;
        var counter = 0;
        if (!idcJson) getIdc(page, 'https://iptvn.idc.md/api/json/channel_list');
        for (var i in idcJson.groups) {
            if (idcJson.groups[i].id != id)
                continue;
            if (counter == 0)
                setPageHeader(page, coloredStr(decodeURI(idcJson.groups[i].name), idcJson.groups[i].color.replace('#000000', '#FFFFFF')));
            for (var j in idcJson.groups[i].channels) {
                var lines = decodeURI(idcJson.groups[i].channels[j].epg_progname).split('\n');
                page.appendItem(plugin.getDescriptor().id + ":idcPlay:" + idcJson.groups[i].channels[j].id + ':' + idcJson.groups[i].channels[j].name, "video", {
                    title: new showtime.RichText(decodeURI(idcJson.groups[i].channels[j].name) +
                        coloredStr(getEpgPeriod(idcJson.groups[i].channels[j].epg_start, idcJson.groups[i].channels[j].epg_end, lines[0]) , orange)),
                    icon: 'http://iptvn.idc.md' + idcJson.groups[i].channels[j].icon,
                    description: idcJson.groups[i].channels[j].epg_progname ? decodeURI(idcJson.groups[i].channels[j].epg_progname) : null
                });
                counter++;
            }
            break;
        };
        page.metadata.title = new showtime.RichText(page.metadata.title + ' (' + counter + ')');
        page.loading = false;
    });

    function getIdc(page, url) {
        showDialog = false;
        while(1) {
            page.loading = true;
            idcJson = showtime.JSONDecode(showtime.httpReq(url));
            if (!idcJson.error)
                return true;

            while(1) {
                page.loading = false;
                var credentials = plugin.getAuthCredentials(plugin.getDescriptor().id, 'Idc.md requires login to continue', showDialog, 'idc');
                if (credentials.rejected) {
                    page.error('Cannot continue without login/password :(');
                    return false;
                }

                if (credentials && credentials.username && credentials.password) {
                    page.loading = true;
                    var resp = showtime.JSONDecode(showtime.httpReq('https://iptvn.idc.md/api/json/login', {
                        postdata: {
                            login: credentials.username,
                            pass: credentials.password,
                            settings: 'all'
                        }
                    }));
                    page.loading = false;
                    if (!resp.error) break;
                    showtime.message(resp.error.message, true);
                }
                showDialog = true;
            }
        }
    }

    plugin.addURI(plugin.getDescriptor().id + ":idcStart", function(page) {
        setPageHeader(page, 'Idc.md');
        page.loading = true;
        if (!getIdc(page, 'https://iptvn.idc.md/api/json/channel_list')) return;
        var counter = 0;
        for (var i in idcJson.groups) {
            page.appendItem(plugin.getDescriptor().id + ":idcGroups:" + idcJson.groups[i].id, "directory", {
                title: new showtime.RichText(coloredStr(decodeURI(idcJson.groups[i].name), idcJson.groups[i].color.replace('#000000', '#FFFFFF')))
            });
            counter++;
        };
        page.metadata.title = 'Idc.md (' + counter + ')';
        page.loading = false;
    });

    function unpack(str) {

        function get_chunks(str) {
            var chunks = str.match(/eval\(\(?function\(.*?(,0,\{\}\)\)|split\('\|'\)\)\))($|\n)/g);
            return chunks ? chunks : [];
        };

        function detect(str) {
            return (get_chunks(str).length > 0);
        }

        function unpack_chunk(str) {
            var unpacked_source = '';
            var __eval = eval;
            if (detect(str)) {
                try {
                    eval = function (s) { unpacked_source += s; return unpacked_source; };
                    __eval(str);
                    if (typeof unpacked_source == 'string' && unpacked_source) {
                        str = unpacked_source;
                    }
                } catch (e) {
                    // well, it failed. we'll just return the original, instead of crashing on user.
               }
            }
            eval = __eval;
            return str;
        }

        var chunks = get_chunks(str);
        for(var i = 0; i < chunks.length; i++) {
            chunk = chunks[i].replace(/\n$/, '');
            str = str.split(chunk).join(unpack_chunk(chunk));
        }
        return str;
    }

    plugin.addURI(plugin.getDescriptor().id + ":playgoAtDee:(.*):(.*)", function(page, url, title) {
        page.loading = true;
        page.metadata.title = unescape(title);
        var link = null;
        var doc = showtime.httpReq('http://goatd.net/' + unescape(url)).toString();

        // Try castalba
        var match = doc.match(/id="([\s\S]*?)"; ew="/);
        if (match) {
            doc = showtime.httpReq('http://castalba.tv/embed.php?cid='+ match[1]).toString();
            var streamer = doc.match(/'streamer':[\s\S]*?'([\s\S]*?)'/);
            if (streamer) {
                streamer = unescape(streamer[1]);
            } else {
                page.error('Stream is offline');
                return;
            }
            var file = doc.match(/'file': ([\s\S]*?),/)[1];
            file = unescape(unescape(file.replace(/[\'|\(|\)\+|unescape]/g, '')));
            link = streamer + ' playpath=' + file + ' swfUrl=http://static.castalba.tv/player5.9.swf pageUrl=http://castalba.tv/embed.php?cid=' + match[1]
        } else { // Sawlive
            match = doc.match(/swidth=[\s\S]*?src="([\s\S]*?)"/); // extract pseudo link
            showtime.print(match[1]);
            if (match) { // get watch link from pseudo link
                doc = showtime.httpReq(match[1], {
                    headers: {
                        Host: 'www.sawlive.tv',
                        Referer: 'http://goatd.net/' + unescape(url),
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.65 Safari/537.36'
                    }
                }).toString();
                if (doc.match(/y3s=/)) {
                   var referer = 'http://sawlive.tv/embed/watch/' + doc.match(/y3s='([\s\S]*?)'/)[1] + '/' + doc.match(/za3='([\s\S]*?)'/)[1] // extract watch link
                   if (!referer) {
                       referer = doc.match(/swidth[\s\S]*?src="([\s\S]*?)"/); // extract watch link
                       if (referer) referer = referer[1];
                   }
                }
                if (referer) {
                    doc = showtime.httpReq(referer, {
                        headers: {
                            Host: 'www.sawlive.tv',
                            Referer: 'http://goatd.net/' + unescape(url),
                           'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.65 Safari/537.36'
                       }
                    }).toString();
                }

                // try play directly
                var streamer = doc.match(/'streamer', '([\s\S]*?)'/);
                if (streamer) {
                    var link = streamer[1] + ' playpath=' + doc.match(/'file', '([\s\S]*?)'/)[1] + ' swfUrl=http://static3.sawlive.tv/player.swf pageUrl=' + referer;
                } else { // page is crypted
                    link = doc.match(/'file', '([\s\S]*?)'/);
                    if (link)
                        link = link[1];
                    else {
                        var tmp = unescape(unpack(doc)).replace(/document\.write\(unescape\(\'/g, '').replace(/\'\)\);/g, '').replace(/\n/g, '');
                        var referer = tmp.match(/src="([\s\S]*?)["|\']/)[1];
                        try {
                            doc = showtime.httpReq(referer, {
                                headers: {
                                    Host: 'www.sawlive.tv',
                                    Referer: 'http://goatd.net/' + unescape(url),
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.65 Safari/537.36'
                                }
                            }).toString();
                            var streamer = doc.match(/'streamer', '([\s\S]*?)'/);
                            if (streamer) {
                                var link = streamer[1] + ' playpath=' + doc.match(/'file', '([\s\S]*?)'/)[1] + ' swfUrl=http://static3.sawlive.tv/player.swf pageUrl=' + referer;
                            } else {
                                doc = doc.match(/eval\(function([\S\s]*?)\}\((.*)/);
                                if (doc) {
                                    eval('try { function decryptParams' + doc[1] + '}; decodedStr = (decryptParams(' + doc[2] + '} catch (err) {}');
                                    var streamer = decodedStr.match(/'streamer','([\s\S]*?)'/)[1];
                                    var playpath = decodedStr.match(/'file','([\s\S]*?)'/)[1];
                                    var link = streamer + ' playpath=' + playpath + ' swfUrl=http://static3.sawlive.tv/player.swf pageUrl=' + referer;
                                }

                            }
                        } catch(err) {
                            link = false;
                        }
                    }
                }
            }
        }
        if (link) {
            link = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                no_fs_scan: true,
                canonicalUrl: plugin.getDescriptor().id + ':playgoAtDee:' + url + ':' + title,
                sources: [{
                    url: link.indexOf('m3u8') >= 0 ? 'hls:' + link : link
                }],
                no_subtitle_scan: true
            });
            page.type = 'video';
            page.source = link;
        } else
            page.error('Can\'t get link :( Maybe stream is offline?');
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":goAtDeeStart", function(page) {
        setPageHeader(page, 'goATDee.Net');
        page.loading = true;
        var doc = showtime.httpReq('http://goatd.net').toString();
        page.appendItem("", "separator", {
            title: doc.match(/<b>([\s\S]*?)<\/b>/)[1]
        });
        // 1-am/pm time, 2-est time, 3-icon, 4-link, 5-title, 6-cet time
        var re = /<td align="right"><b>([\s\S]*?)<\/b><\/td><td align="left"><b>([\s\S]*?)<\/b><\/td>[\s\S]*?<img src="([\s\S]*?)"[\s\S]*?<a href="([\s\S]*?)"[\s\S]*?blank">([\s\S]*?)<\/a>([\s\S]*?)<\/tr>/g;
        // 1- 6-24h time, 2-cet time
        var re2 = /<td align="right"><b>([\s\S]*?)<\/b><\/td><td align="left"><b>([\s\S]*?)<\/b>/;
        var match = re.exec(doc);
        while (match) {
            var params = re2.exec(match[6]);
            cet = '';
            if (params)
                cet = ' / ' + params[1] + ' ' + params[2];
	    page.appendItem(plugin.getDescriptor().id + ":playgoAtDee:" + escape(match[4]) + ':' + escape(match[5]), "video", {
	        title: new showtime.RichText(match[5] + (match[1] ? coloredStr(' ' + match[1] + ' ' + match[2] + cet, orange) : '')),
                icon: match[3],
                description: new showtime.RichText(match[5] + (match[1] ? coloredStr(' ' + match[1] + ' ' + match[2] + cet, orange) : ''))
	    });
            match = re.exec(doc);
        }
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":playVodSpb:(.*):(.*)", function(page, id, title) {
        page.loading = true;
        page.type = 'video'
        page.metadata.title = unescape(title);
        try {
            setSpbHeaders();
            var json = showtime.JSONDecode(showtime.httpReq('http://tv3.spr.spbtv.com/v1/vods/' + id + '/stream?protocol=hds&'));
            var link = "videoparams:" + showtime.JSONEncode({
                title: showtime.entityDecode(unescape(title)),
                no_fs_scan: true,
                canonicalUrl: plugin.getDescriptor().id + ':playVodSpb:' + id + ':' + title,
                sources: [{
                    url: 'hls:' + json.stream.url.replace('.f4m?', '.m3u8?')
                }],
                no_subtitle_scan: true
            });
            page.source = link;
        } catch(err) {
            if (err.toString().match(/error: 403/))
                err = 'Stream is not available in your country';
            page.error(err);
        }
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":channelSpb:(.*):(.*)", function(page, id, title) {
        setPageHeader(page, unescape(title));
        page.loading = true;
        setSpbHeaders();
        var json = showtime.JSONDecode(showtime.httpReq('http://tv3.spr.spbtv.com/desktop/channels/' + id.match(/ch_(.*)/)[1] + '/videos.json?limit=10000'));
        for (var i in json.videos) {
            var name = json.videos[i].name.replace(/\n/g, '').replace(/''/g, "'").replace(/""/g, '"');
            page.appendItem(plugin.getDescriptor().id + ':playVodSpb:' + escape(json.videos[i].id) + ':' + escape(name), 'video', {
                title: new showtime.RichText(coloredStr(json.videos[i].language.iso2, orange) + ' ' + name.replace(/\\'/g, "'")),
                icon: json.videos[i].images[0] ? json.videos[i].images[0].original_url : null,
                description: new showtime.RichText(coloredStr('Language: ', orange) + json.videos[i].language.name +
                    coloredStr('\nPublishing date: ', orange) + json.videos[i].publishing_date.split('T')[0] +
                    (json.videos[i].description ? coloredStr('\nDescription: ', orange) + json.videos[i].description : '')),
            });
        }
        page.metadata.title += ' (' + json.videos.length + ')';
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":playSpb:(.*):(.*)", function(page, id, title) {
        page.loading = true;
        page.type = 'video'
        page.metadata.title = unescape(title);
        try {
            setSpbHeaders();
            var json = showtime.JSONDecode(showtime.httpReq('http://tv3.spr.spbtv.com/v1/channels/' + id.match(/ch_(.*)/)[1] + '/stream?protocol=hds&'));
            var link = "videoparams:" + showtime.JSONEncode({
                title: unescape(title),
                no_fs_scan: true,
                canonicalUrl: plugin.getDescriptor().id + ':playSpb:' + id + ':' + title,
                sources: [{
                    url: 'hls:' + json.stream.url.replace('.f4m?', '.m3u8?')
                }],
                no_subtitle_scan: true
            });
            page.source = link;
        } catch(err) {
            if (err.toString().match(/error: 403/))
                err = 'Stream is not available in your country';
            page.error(err);
        }
        page.loading = false;
    });

    var spbHeadersAreSet = false;
    function setSpbHeaders() {
        if (!spbHeadersAreSet) {
            plugin.addHTTPAuth('.*spbtv\\.com', function(req) {
                req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
            });
            plugin.addHTTPAuth('.*spbtv\\.com.*', function(req) {
                req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
            });
            spbHeadersAreSet = true;
        }
    }

    var divanHeadersAreSet = false;
    function setDivanHeaders() {
        if (!divanHeadersAreSet) {
            plugin.addHTTPAuth('.*divan\\.tv', function(req) {
                req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
            });
            plugin.addHTTPAuth('.*divan\\.tv.*', function(req) {
                req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
            });
            divanHeadersAreSet = true;
        }
    }

    plugin.addURI(plugin.getDescriptor().id + ":spbStart", function(page) {
        setPageHeader(page, 'Spbtv.com');
        page.loading = true;

        setSpbHeaders();
        var doc = showtime.httpReq('http://spbtv.com/channels/').toString();
        var cList = doc.match(/<div id="channel_list([\s\S]*?)<\/div>/)[1];
        // 1-category/lang/access/type, 2-id, 3-language, 4-logo, 5-description, 6-link, 7-title
        var re = /<li class="([\s\S]*?)" id="([\s\S]*?)">[\s\S]*?<span class="lang">([\s\S]*?)<\/span><img src="([\s\S]*?)"[\s\S]*?<p title="([\s\S]*?)"><a href="([\s\S]*?)">([\s\S]*?)<\/a>/g;
        var match = re.exec(cList);
        var c = 0;
        while (match) {
            if (match[1].match(/paid/)) {
                match = re.exec(cList);
                continue;
            }
            var flags = match[1].split(' ');
            if (flags[4] == 'free') {
                var type = flags[5];
                var lang = flags[3];
            } else {
                var type = flags[4];
                var lang = flags[2];
            }
            if (type == 'vod')
                var route = ":channelSpb:";
            else
                var route = ":playSpb:";
            var link = plugin.getDescriptor().id + route + escape(match[2]) + ':' + escape(match[7]);
            var title = coloredStr(type, orange) + ' ' + match[7] + ' ' + coloredStr(lang, orange);
            var icon = 'http://spbtv.com' + match[4];
            var item = page.appendItem(link, "video", {
	        title: new showtime.RichText(title),
                icon: icon,
                description: new showtime.RichText(match[5])
	    });
            addToFavoritesOption(item, link, match[7], icon);
            c++;
            match = re.exec(cList);
        }
        page.metadata.title = new showtime.RichText(page.metadata.title + ' (' + c + ')');
        page.loading = false;
    });

    var yamgoJson = null;
    function getYamgoJson() {
        var doc = showtime.httpReq('http://yamgo.com').toString();
        var bPattern = 'channels = ';
        var ePattern = '};';
        yamgoJson = doc.substr(doc.indexOf(bPattern) + bPattern.length, doc.indexOf(ePattern) - (doc.indexOf(bPattern) + bPattern.length) + 1);
        if (yamgoJson)
            yamgoJson = showtime.JSONDecode(yamgoJson);
        else {
            page.error('Sorry, can\'t get json with the channel list: (');
            return false;
        }
        return true;
    }

    plugin.addURI(plugin.getDescriptor().id + ":yamgoStart", function(page) {
        setPageHeader(page, 'Yamgo - tv on the go');
        page.loading = true;
        if (!yamgoJson)
           if (!getYamgoJson()) return;

        var c = 0;
        for (var i in yamgoJson) {
            var link = plugin.getDescriptor().id + ':yamgo:' + yamgoJson[i][0].channel_id + ':' + escape(yamgoJson[i][0].channel_name);
            if (yamgoJson[i][0].channel_type == 'YOUTUBE')
                link = plugin.getDescriptor().id + ':yamgoYoutube:' + yamgoJson[i][0].channel_id + ':' + escape(yamgoJson[i][0].channel_name);
            var icon = yamgoJson[i][0].channel_images_tn_large;
            var title = yamgoJson[i][0].channel_name;
            var item = page.appendItem(link, "video", {
	        title: new showtime.RichText(title + ' ' + coloredStr(yamgoJson[i][0].channel_type, orange)),
                genre: yamgoJson[i][0].channel_metakeywords,
                icon: icon,
                description: new showtime.RichText(yamgoJson[i][0].channel_description)
	    });
            c++;
            addToFavoritesOption(item, link, title, icon);
        };
        page.metadata.title = new showtime.RichText(page.metadata.title + ' (' + c + ')');
        page.loading = false;
    });

    // Start page
    plugin.addURI(plugin.getDescriptor().id + ":start", function(page) {
        setPageHeader(page, plugin.getDescriptor().title);
	page.appendItem(plugin.getDescriptor().id + ":favorites", "directory", {
	    title: "My Favorites"
	});

        page.appendItem("", "separator", {
            title: 'M3U & XML playlists'
        });

        addActionToTheItem(page, 'Add M3U playlist', '1Hbuve6', 'M3U');
        addActionToTheItem(page, 'Add XML playlist', '1zVA91a', 'XML');

        if (!service.disableSampleList) {
            var item = page.appendItem('m3u:http%3A%2F%2Fbit.ly%2F1Hbuve6:Sample M3U list', "directory", {
                title: 'Sample M3U list'
            });
        }

        if (!service.disableSampleXMLList) {
            var item = page.appendItem('xml:http%3A%2F%2Fbit.ly%2F1zVA91a:Sample XML list', "directory", {
                title: 'Sample XML list'
            });
        }

        showPlaylist(page);

        page.appendItem("", "separator", {
            title: 'Providers'
        });
	page.appendItem(plugin.getDescriptor().id + ":streamliveStart", "directory", {
	    title: "StreamLive.to"
	});
	//page.appendItem(plugin.getDescriptor().id + ":spbStart", "directory", {
	//    title: "Spbtv.com"
	//});
	page.appendItem(plugin.getDescriptor().id + ":divanStart", "directory", {
	    title: "Divan.tv"
	});
	page.appendItem(plugin.getDescriptor().id + ":tivixStart", "directory", {
	    title: "Tivix.net"
	});
	page.appendItem(plugin.getDescriptor().id + ":sputnikStart", "directory", {
	    title: "Sputniktv.in.ua"
	});
	page.appendItem(plugin.getDescriptor().id + ":yooooStart", "directory", {
	    title: "Yoooo.tv"
	});
	page.appendItem(plugin.getDescriptor().id + ":idcStart", "directory", {
	    title: "Idc.md"
	});
	page.appendItem(plugin.getDescriptor().id + ":goAtDeeStart", "directory", {
	    title: "goATDee.Net"
	});
	page.appendItem(plugin.getDescriptor().id + ":drundooStart", "directory", {
	    title: "DrunDoo.com"
	});
	page.appendItem(plugin.getDescriptor().id + ":yamgoStart", "directory", {
	    title: "Yamgo.com"
	});
    });
})(this);
