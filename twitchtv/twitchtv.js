/**
 * TwitchTV plugin for Movian Media Center
 *
 *  Copyright (C) 2015 lprot
 *  Based on the plugin of Fábio Ferreira (facanferff)
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
    var logo = plugin.path + "logo.png", API = 'https://api.twitch.tv/kraken';
    var itemsPerPage = 50;
	var header={debug:false,headers:{'Client-ID':'awyezs6zu2vcnaekftdjy77evgk9jn'}};

    var service = plugin.createService(plugin.getDescriptor().title, plugin.getDescriptor().id + ":start", "video", true, logo);

    var settings = plugin.createSettings(plugin.getDescriptor().title, logo, plugin.getDescriptor().synopsis);

    function setPageHeader(page, title) {
	page.type = "directory";
	page.contents = "items";
        page.entries = 0;
        if (page.metadata) {
	    page.metadata.logo = logo;
	    page.metadata.title = title;
        };
	page.loading = false;
    }

    function trim(s) {
        return s.replace(/(\r\n|\n|\r)/gm, "").replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, " ");
    }

    var blue = "6699CC", orange = "FFA500";

    function colorStr(str, color) {
        return '<font color="' + color + '">(' + str + ')</font>';
    }

    function coloredStr(str, color) {
        return '<font color="' + color + '">' + str + '</font>';
    }

    settings.createInfo("info", logo, plugin.getDescriptor().synopsis);

    var videoQualities = [
        ['0', 'chunked', true], ['1', '720p60'], ['2', '720p30'], ['3', '480p30']
    ];
    settings.createMultiOpt("videoQuality", "Video Quality", videoQualities, function(v) {
        service.videoQuality = v;
    });

    // Discard favorites
    settings.createAction("cleanFavorites", "Clean My Favorites", function() {
        store.list = "[]";
        showtime.notify('My Favorites has been cleaned successfully', 2);
    });

    var store = plugin.createStore('favorites', true)
    if (!store.list) {
        store.list = "[]";
    }

    plugin.addURI(plugin.getDescriptor().id + ":teams", function (page) {
        setPageHeader(page, plugin.getDescriptor().title + ' - Teams');
        var tryToSearch = true, first = true;
        var url = API + '/teams?limit=' + itemsPerPage;
        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url, header));
            page.loading = false;
            for (var i in json.teams) {
                page.appendItem(plugin.getDescriptor().id + ":team:" + encodeURIComponent(json.teams[i].name), "video", {
                    title: new showtime.RichText(json.teams[i].display_name),
                    icon: json.teams[i].logo,
                    description: new showtime.RichText(coloredStr('Name: ', orange) + json.teams[i].name +
                        coloredStr('\nCreated at: ', orange) + json.teams[i].created_at +
                        coloredStr('\nUpdated at: ', orange) + json.teams[i].updated_at +
                        coloredStr('\nInfo: ', orange) + trim(json.teams[i].info)
                    )
                });
                page.entries++;
            }
            if (json.teams.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
    });

    plugin.addURI(plugin.getDescriptor().id + ":start", function (page) {
        setPageHeader(page, plugin.getDescriptor().title + ' - Home');
        page.appendItem(plugin.getDescriptor().id + ":favorites", "directory", {
            title: "My Favorites"
        });
        page.appendItem(plugin.getDescriptor().id + ":teams", "directory", {
            title: "The List of Teams"
        });

        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq(API + '/streams/summary',header).toString());
        page.loading = false;
        page.metadata.title += ' (Channels: ' + json.channels + ' Viewers: ' + json.viewers + ')';

        // Featured streams
        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq(API + '/streams/featured',header));
        page.loading = false;
        page.appendItem("", "separator", {
            title: 'Featured streams (' + json.featured.length + ')'
        });

        for (var i in json.featured) {
            page.appendItem(plugin.getDescriptor().id + ':channel:' + encodeURIComponent(json.featured[i].stream.channel.name) + ':' + encodeURIComponent(json.featured[i].stream.channel.display_name), "video", {
                title: new showtime.RichText((json.featured[i].stream.game ? json.featured[i].stream.game + ' - ' : '') + json.featured[i].stream.channel.display_name + coloredStr(' (' + json.featured[i].stream.viewers + ')', orange)),
                icon: json.featured[i].stream.preview.large,
                description: new showtime.RichText(coloredStr('Viewing this stream: ', orange) + json.featured[i].stream.viewers +
                    coloredStr('\nStream created at: ', orange) + json.featured[i].stream.created_at +
                    coloredStr('\nChannel created at: ', orange) + json.featured[i].stream.channel.created_at +
                    coloredStr('\nChannel updated at: ', orange) + json.featured[i].stream.channel.updated_at +
                    (json.featured[i].stream.channel.mature ? coloredStr('\nMature: ', orange) + json.featured[i].stream.channel.mature : '') +
                    (json.featured[i].stream.channel.language ? coloredStr('\nChannel language: ', orange) + json.featured[i].stream.channel.language : '') +
                    (json.featured[i].stream.channel.views ? coloredStr('\nChannel views: ', orange) + json.featured[i].stream.channel.views : '') +
                    (json.featured[i].stream.channel.followers ? coloredStr('\nChannel followers: ', orange) + json.featured[i].stream.channel.followers : '') +
                    (json.featured[i].stream.channel.status ? coloredStr('\nChannel status: ', orange) + json.featured[i].stream.channel.status : '')
                )
            });
        }

        // Top Games
        var tryToSearch = true, first = true;
		var url = API + '/games/top?limit=' + itemsPerPage;
        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url,header));
            if (first) {
                page.appendItem("", "separator", {
                    title: 'Top Games (' + json._total + ')'
                });
                first = false;
            }
            page.loading = false;
            for (var i in json.top) {
                if (!json.top[i].game.name) // db errors?
                    continue;
                page.appendItem(plugin.getDescriptor().id + ":game:" + encodeURIComponent(json.top[i].game.name), "video", {
                    title: new showtime.RichText(json.top[i].game.name + coloredStr(' (' + json.top[i].viewers + ')', orange)),
                    icon: json.top[i].game.box.large,
                    description: new showtime.RichText(coloredStr('Viewers: ', orange) + json.top[i].viewers +
                        coloredStr('\nChannels: ', orange) + json.top[i].channels
                    )
                });
                page.entries++;
            }
            if (json.top.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
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

	    var item = page.appendItem(plugin.getDescriptor().id + ':channel:' + itemmd.name + ':' + itemmd.display_name, "video", {
		title: decodeURIComponent(itemmd.display_name)
	    });

            item.addOptAction("Remove '" + itemmd.name + "' from My Favorites", pos);

	    item.onEvent(pos, function(item) {
		var list = eval(store.list);
		showtime.notify("'" + showtime.JSONDecode(list[item]).name + "' has been removed from My Favorites.", 2);
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

    plugin.addURI(plugin.getDescriptor().id + ":team:(.*)", function(page, team) {
        setPageHeader(page, plugin.getDescriptor().title + ' - Channels of: ' + decodeURIComponent(team));
        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq('http://api.twitch.tv/api/team/' + team + '/live_channels.json',header).toString());
        page.loading = false;
        for (var i in json.channels) {
            page.appendItem(plugin.getDescriptor().id + ":channel:" + encodeURIComponent(json.channels[i].channel.name)  + ':' + encodeURIComponent(json.channels[i].channel.display_name), "video", {
                title: new showtime.RichText(json.channels[i].channel.display_name + ' - ' + json.channels[i].channel.title + coloredStr(' (' + json.channels[i].channel.current_viewers + ')', orange)),
                icon: json.channels[i].channel.image.size600,
                description: new showtime.RichText(coloredStr('Viewing this channel: ', orange) + json.channels[i].channel.current_viewers +
                    coloredStr('\nMeta game: ', orange) + json.channels[i].channel.meta_game +
                    (json.channels[i].channel.total_views ? coloredStr('\nTotal views: ', orange) + json.channels[i].channel.total_views : '') +
                    (json.channels[i].channel.followers_count ? coloredStr('\nChannel followers: ', orange) + json.channels[i].channel.followers_count : '') +
                    (json.channels[i].channel.status ? coloredStr('\nChannel status: ', orange) + json.channels[i].channel.status : '')
                )
            });
        }

        if (json.channels.length == 0)
            page.appendPassiveItem('video', '', {
                title: 'Currently there is no live channels of this team'
            });
    });

    plugin.addURI(plugin.getDescriptor().id + ":video:(.*):(.*)", function (page, id, name) {
        setPageHeader(page, plugin.getDescriptor().title + ' - ' + decodeURIComponent(name));
        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq('https://api.twitch.tv/kraken/videos/' + id, header ) );
        page.loading = false;
		page.type = "video";
		var tit=json.title;
        // Get sig and token
        page.loading = true;
		var idv=id.slice(1);
        var json = showtime.JSONDecode(
            showtime.httpReq('https://api.twitch.tv/api/vods/' + idv + '/access_token', header)
        );

        // Download playlist and split it into multilines
        var playlist = showtime.httpReq('https://usher.ttvnw.net/vod/' + idv +
            '.m3u8?sig=' + json.sig + '&token=' + json.token +
            '&allow_source=true',header).toString().split('\n');

        page.loading = false;
        var url = null;

        // Loop through the playlist and select preferred quality
        for (var line = 0; line < playlist.length; line++) {
            if (playlist[line].indexOf('EXT-X-MEDIA:TYPE=VIDEO') > -1) {
                var url = playlist[line + 2];
                if (playlist[line].indexOf(videoQualities[service.videoQuality].toString().split(',')[1]) > -1 || !service.videoQuality)
                    break;
            }
        }

        page.loading = false;

        if (!url) {
            page.error("Cannot find stream URL.");
            return;
        }

        page.source = "videoparams:" + showtime.JSONEncode({
            title: tit,
            sources: [{
                url: url
            }],
            no_subtitle_scan: true
        });
    });

    plugin.addURI(plugin.getDescriptor().id + ":play:(.*)", function (page, name) {
        page.type = "video";

        // Get sig and token
        page.loading = true;
        var json = showtime.JSONDecode(
            showtime.httpReq('https://api.twitch.tv/api/channels/' + name + '/access_token', header)
        );

        // Download playlist and split it into multilines
        var playlist = showtime.httpReq('http://usher.twitch.tv/api/channel/hls/' + name +
            '.m3u8?sig=' + json.sig + '&token=' + json.token +
            '&allow_source=true',header).toString().split('\n');

        page.loading = false;
        var url = null;

        // Loop through the playlist and select preferred quality
        for (var line = 0; line < playlist.length; line++) {
            if (playlist[line].indexOf('EXT-X-MEDIA:TYPE=VIDEO') > -1) {
                var url = playlist[line + 2];
                if (playlist[line].indexOf(videoQualities[service.videoQuality].toString().split(',')[1]) > -1 || !service.videoQuality)
                    break;
            }
        }

        page.loading = false;

        if (!url) {
            page.error("Cannot find stream URL.");
            return;
        }

        page.source = "videoparams:" + showtime.JSONEncode({
            title: name,
            sources: [{
                url: url
            }],
            no_subtitle_scan: true
        });
    });

    plugin.addURI(plugin.getDescriptor().id + ":past:(.*):(.*)", function (page, name, display_name) {
        setPageHeader(page, plugin.getDescriptor().title + ' - Past broadcasts for: ' + decodeURIComponent(display_name));
        var url = API + '/channels/' + name + '/videos?broadcast_type=archive';
        var tryToSearch = true;

        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url,header));
            page.loading = false;
            for (var i in json.videos) {
                page.appendItem(plugin.getDescriptor().id + ":video:" + json.videos[i]._id + ':' + encodeURIComponent(json.videos[i].title), "video", {
                    title: new showtime.RichText(json.videos[i].title + coloredStr(' (' + json.videos[i].views + ')', orange)),
                    icon: json.videos[i].preview,
                    duration: json.videos[i].length,
                    description: new showtime.RichText(coloredStr('Views: ', orange) + json.videos[i].views +
                        (json.videos[i].game ? coloredStr('\nGame: ', orange) + json.videos[i].game : '') +
                        (json.videos[i].recorded_at ? coloredStr('\nRecorded at: ', orange) + json.videos[i].recorded_at : '') +
                        (json.videos[i].description ? coloredStr('\nDescription: ', orange) + json.videos[i].description : '')
                    )
                });
                page.entries++;
            }
            if (json.videos.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
    });

    plugin.addURI(plugin.getDescriptor().id + ":user:(.*)", function (page, query) {
        setPageHeader(page, query);
        var tryToSearch = true, first = true;
        var url = API + '/search/channels?q=' + encodeURIComponent(query) + '&limit=' + itemsPerPage;
        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url,header));
            page.loading = false;
            if (first && page.metadata) {
                page.metadata.title +=  ' (' + json._total + ')';
                first = false;
            }
            for (var i in json.channels) {
                page.appendItem(plugin.getDescriptor().id + ':channel:' + encodeURIComponent(json.channels[i].name) + ':' + encodeURIComponent(json.channels[i].display_name), 'video', {
                    title: json.channels[i].display_name + (json.channels[i].game ? ' - ' + json.channels[i].game : ''),
                    icon: json.channels[i].logo,
                    description: new showtime.RichText((json.channels[i].views ? coloredStr('\nChannel views: ', orange) + json.channels[i].views : '') +
                        coloredStr('\nCreated at: ', orange) + json.channels[i].created_at +
                        coloredStr('\nUpdated at: ', orange) + json.channels[i].updated_at +
                        (json.channels[i].mature ? coloredStr('\nMature: ', orange) + json.channels[i].mature : '') +
                        (json.channels[i].language ? coloredStr('\nLanguage: ', orange) + json.channels[i].language : '') +
                        (json.channels[i].followers ? coloredStr('\nFollowers: ', orange) + json.channels[i].followers : '') +
                        (json.channels[i].status ? coloredStr('\nStatus: ', orange) + json.channels[i].status : '')
                    )
                });
                page.entries++;
            }
            if (json.channels.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
    });

    plugin.addURI(plugin.getDescriptor().id + ":channel:(.*):(.*)", function (page, name, display_name) {
        setPageHeader(page, plugin.getDescriptor().title + ' - ' + decodeURIComponent(display_name));
        page.entries = 0;
        page.options.createAction('addToFavorites', "Add '" + decodeURIComponent(display_name) + "' to My Favorites", function() {
            var entry = showtime.JSONEncode({
                name: name,
                display_name: display_name
            });
            store.list = showtime.JSONEncode([entry].concat(eval(store.list)));
            showtime.notify("'" + decodeURIComponent(display_name) + "' has been added to My Favorites.", 2);
        });

        var tryToSearch = true, first = true;
        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq(API + '/streams/' + name, header));
        page.loading = false;
        if (json.stream) {
            page.appendItem("", "separator", {
                title: 'Stream'
            });
            page.appendItem(plugin.getDescriptor().id + ":play:" + encodeURIComponent(json.stream.channel.name), "video", {
                title: new showtime.RichText((json.stream.game ? json.stream.game + ' - ' : '') + json.stream.channel.display_name + coloredStr(' (' + json.stream.viewers + ')', orange)),
                icon: json.stream.preview.large,
                description: new showtime.RichText(coloredStr('Viewing this stream: ', orange) + json.stream.viewers +
                    coloredStr('\nStream created at: ', orange) + json.stream.created_at +
                    coloredStr('\nChannel created at: ', orange) + json.stream.channel.created_at +
                    coloredStr('\nChannel updated at: ', orange) + json.stream.channel.updated_at +
                    (json.stream.channel.mature ? coloredStr('\nMature: ', orange) + json.stream.channel.mature : '') +
                    (json.stream.channel.language ? coloredStr('\nChannel language: ', orange) + json.stream.channel.language : '') +
                    (json.stream.channel.views ? coloredStr('\nChannel views: ', orange) + json.stream.channel.views : '') +
                    (json.stream.channel.followers ? coloredStr('\nChannel followers: ', orange) + json.stream.channel.followers : '') +
                    (json.stream.channel.status ? coloredStr('\nChannel status: ', orange) + json.stream.channel.status : '')
                )
            });
            page.entries++;
        }

        page.appendItem(plugin.getDescriptor().id + ":past:" + name + ':' + display_name, "directory", {
            title: 'Past broadcasts'
        });

        var url = API + '/channels/' + name + '/videos';
        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url,header));
            page.loading = false;
            if (json.videos.length && first) {
                page.appendItem("", "separator", {
                    title: 'Videos'
                });
                first = false;
            }
            for (var i in json.videos) {
                page.appendItem(plugin.getDescriptor().id + ":video:" + json.videos[i]._id + ':' + encodeURIComponent(json.videos[i].title), "video", {
                    title: new showtime.RichText(json.videos[i].title + coloredStr(' (' + json.videos[i].views + ')', orange)),
                    icon: json.videos[i].preview,
                    duration: json.videos[i].length,
                    description: new showtime.RichText(coloredStr('Views: ', orange) + json.videos[i].views +
                        (json.videos[i].game ? coloredStr('\nGame: ', orange) + json.videos[i].game : '') +
                        (json.videos[i].recorded_at ? coloredStr('\nRecorded at: ', orange) + json.videos[i].recorded_at : '') +
                        (json.videos[i].description ? coloredStr('\nDescription: ', orange) + json.videos[i].description : '')
                    )
                });
                page.entries++;
            }
            if (json.videos.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
        if (!page.entries)
            page.appendPassiveItem('video', '', {
                title: 'Currently this channel is empty :('
            });
    });

    plugin.addSearcher(plugin.getDescriptor().title + ' - Channels', logo, function (page, query) {
        setPageHeader(page, plugin.getDescriptor().title + ' - Channels');
        var tryToSearch = true, first = true;
        var url = API + '/search/channels?q=' + encodeURIComponent(query) + '&limit=' + itemsPerPage;
        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url,header));
            page.loading = false;
            if (first && page.metadata) {
                page.metadata.title +=  ' (' + json._total + ')';
                first = false;
            }
            for (var i in json.channels) {
                page.appendItem(plugin.getDescriptor().id + ':channel:' + encodeURIComponent(json.channels[i].name) + ':' + encodeURIComponent(json.channels[i].display_name), 'video', {
                    title: json.channels[i].display_name + (json.channels[i].game ? ' - ' + json.channels[i].game : ''),
                    icon: json.channels[i].logo,
                    description: new showtime.RichText((json.channels[i].views ? coloredStr('\nChannel views: ', orange) + json.channels[i].views : '') +
                        coloredStr('\nCreated at: ', orange) + json.channels[i].created_at +
                        coloredStr('\nUpdated at: ', orange) + json.channels[i].updated_at +
                        (json.channels[i].mature ? coloredStr('\nMature: ', orange) + json.channels[i].mature : '') +
                        (json.channels[i].language ? coloredStr('\nLanguage: ', orange) + json.channels[i].language : '') +
                        (json.channels[i].followers ? coloredStr('\nFollowers: ', orange) + json.channels[i].followers : '') +
                        (json.channels[i].status ? coloredStr('\nStatus: ', orange) + json.channels[i].status : '')
                    )
                });
                page.entries++;
            }
            if (json.channels.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
    });

    plugin.addSearcher(plugin.getDescriptor().title + ' - Streams', logo, function (page, query) {
        setPageHeader(page, plugin.getDescriptor().title + ' - Streams');
        var tryToSearch = true, first = true;
        var url = API + '/search/streams?limit=' + itemsPerPage + '&q=' + encodeURIComponent(query);
        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url,header));
            page.loading = false;
            if (first && page.metadata) {
                page.metadata.title +=  ' (' + json._total + ')';
                first = false;
            }
            for (var i in json.streams) {
                page.appendItem(plugin.getDescriptor().id + ":channel:" + encodeURIComponent(json.streams[i].channel.name) + ':' + encodeURIComponent(json.streams[i].channel.display_name), "video", {
                    title: new showtime.RichText((json.streams[i].game ? json.streams[i].game + ' - ' : '') + json.streams[i].channel.display_name + coloredStr(' (' + json.streams[i].viewers + ')', orange)),
                    icon: json.streams[i].preview.large,
                    description: new showtime.RichText(coloredStr('Viewing this stream: ', orange) + json.streams[i].viewers +
                        coloredStr('\nStream created at: ', orange) + json.streams[i].created_at +
                        coloredStr('\nChannel created at: ', orange) + json.streams[i].channel.created_at +
                        coloredStr('\nChannel updated at: ', orange) + json.streams[i].channel.updated_at +
                        (json.streams[i].channel.mature ? coloredStr('\nMature: ', orange) + json.streams[i].channel.mature : '') +
                        (json.streams[i].channel.language ? coloredStr('\nChannel language: ', orange) + json.streams[i].channel.language : '') +
                        (json.streams[i].channel.views ? coloredStr('\nChannel views: ', orange) + json.streams[i].channel.views : '') +
                        (json.streams[i].channel.followers ? coloredStr('\nChannel followers: ', orange) + json.streams[i].channel.followers : '') +
                        (json.streams[i].channel.status ? coloredStr('\nChannel status: ', orange) + json.streams[i].channel.status : '')
                    )
                });
                page.entries++;
            }
            if (json.streams.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
    });

    plugin.addURI(plugin.getDescriptor().id + ":game:(.*)", function (page, name) {
        setPageHeader(page, 'Channels casting: ' + decodeURIComponent(name));
        var tryToSearch = true, first = true;
        var url = API + '/streams?game=' + name + '&limit=' + itemsPerPage ;
        function loader() {
            if (!tryToSearch) return false;
            page.loading = true;
            var json = showtime.JSONDecode(showtime.httpReq(url,header));
            if (first) {
                page.metadata.title +=  ' (' + json._total + ')';
                first = false;
            }
            page.loading = false;
            for (var i in json.streams) {
                page.appendItem(plugin.getDescriptor().id + ':channel:' + encodeURIComponent(json.streams[i].channel.name) + ':' + encodeURIComponent(json.streams[i].channel.display_name), 'video', {
                    title: new showtime.RichText(json.streams[i].channel.display_name + coloredStr(' (' + json.streams[i].viewers + ')', orange)),
                    icon: json.streams[i].preview.large,
                    description: new showtime.RichText(coloredStr('Viewing this stream: ', orange) + json.streams[i].viewers +
                        coloredStr('\nStream created at: ', orange) + json.streams[i].created_at +
                        coloredStr('\nChannel created at: ', orange) + json.streams[i].channel.created_at +
                        coloredStr('\nChannel updated at: ', orange) + json.streams[i].channel.updated_at +
                        (json.streams[i].channel.mature ? coloredStr('\nMature: ', orange) + json.streams[i].channel.mature : '') +
                        (json.streams[i].channel.language ? coloredStr('\nChannel language: ', orange) + json.streams[i].channel.language : '') +
                        (json.streams[i].channel.views ? coloredStr('\nChannel views: ', orange) + json.streams[i].channel.views : '') +
                        (json.streams[i].channel.followers ? coloredStr('\nChannel followers: ', orange) + json.streams[i].channel.followers : '') +
                        (json.streams[i].channel.status ? coloredStr('\nChannel status: ', orange) + json.streams[i].channel.status : '')
                    )
                });
                page.entries++;
            }
            if (json.streams.length == 0)
                return tryToSearch = false;
            url = json['_links'].next;
            return true;
        }
        loader();
        page.paginator = loader;
    });

    plugin.addSearcher(plugin.getDescriptor().title + ' - Games', logo, function (page, query) {
        setPageHeader(page, plugin.getDescriptor().title + ' - Games');
        page.loading = true;
        var json = showtime.JSONDecode(showtime.httpReq(API + '/search/games?type=suggest&query=' + encodeURIComponent(query) + '&live=true',header));
        page.loading = false;
        for (var i in json.games) {
            page.appendItem(plugin.getDescriptor().id + ":game:" + encodeURIComponent(json.games[i].name), "video", {
                title: new showtime.RichText(json.games[i].name + coloredStr(' (' + json.games[i].popularity + ')', orange)),
                icon: json.games[i].box.large,
                description: new showtime.RichText(coloredStr('Popularity: ', orange) + json.games[i].popularity)
            });
            page.entries++;
        }
    });
})(this);
