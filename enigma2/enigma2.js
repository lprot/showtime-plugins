/*
 *  Enigma2
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

var XML = require('showtime/xml');

(function(plugin) {
    var logo = plugin.path + "logo.png";
    var slogan = "Enigma2";

    function setPageHeader(page, title) {
	page.type = "directory";
	page.contents = "items";
	page.metadata.logo = logo;
	page.metadata.title = title;
	page.loading = false;
    }

    var blue = '6699CC',
        orange = 'FFA500',
        red = 'EE0000',
        green = '008B45';

    function coloredStr(str, color) {
        return '<font color="' + color + '">' + str + '</font>';
    }

    function colorStr(str, color) {
        return coloredStr(' (' + str + ')', color);
    }

    plugin.createService(slogan, plugin.getDescriptor().id + ":start", "tv", true, logo);

    var store = plugin.createStore('config', true);

    // Play current channel
    plugin.addURI(plugin.getDescriptor().id + ":streamFromCurrent:(.*)", function(page, url) {
        page.loading = true;
        var doc = showtime.httpReq(unescape(url) + '/web/getcurrent');
        doc = XML.parse(doc);
        var link = "videoparams:" + showtime.JSONEncode({
            title: doc.e2currentserviceinformation.e2service.e2servicename,
            no_fs_scan: true,
            canonicalUrl: plugin.getDescriptor().id + ':streamFromCurrent',
            sources: [{
                url: unescape(url).replace('https:', 'http:') + ':8001/' + doc.e2currentserviceinformation.e2service.e2servicereference,
                mimetype: 'video/mp2t'
            }]
        });
        page.type = 'video'
        page.source = link;
        page.loading = false;
    });

    plugin.addURI(plugin.getDescriptor().id + ":zapTo:(.*):(.*):(.*)", function(page, url, serviceName, serviceReference) {
        setPageHeader(page, unescape(url) + ' - ' + unescape(serviceName));
        page.loading = true;
        var doc = showtime.httpReq(unescape(url) + '/web/zap?sRef=' + serviceReference);
        page.loading = false;
        doc = XML.parse(doc);
        showtime.notify(doc.e2simplexmlresult.e2statetext, 3);

        var link = "videoparams:" + showtime.JSONEncode({
            title: unescape(serviceName),
            no_fs_scan: true,
            canonicalUrl: plugin.getDescriptor().id + ':zapTo:' + url + ':' + serviceName + ':' + serviceReference,
            sources: [{
                url: unescape(url).replace('https:', 'http:') + ':8001/' + serviceReference,
                mimetype: 'video/mp2t'
            }]
        });
        page.type = 'video'
        page.source = link;
    });

    plugin.addURI(plugin.getDescriptor().id + ":getServices:(.*):(.*):(.*)", function(page, url, serviceName, serviceReference) {
        setPageHeader(page, unescape(url) + ' - ' + unescape(serviceName));
        page.loading = true;
        var doc = showtime.httpReq(unescape(url) + '/web/getservices?sRef=' + serviceReference);
        page.loading = false;
        doc = XML.parse(doc);
        var e2services = doc.e2servicelist.filterNodes('e2service');
        for (var i = 0; i < e2services.length; i++) {
             page.appendItem(plugin.getDescriptor().id + ":zapTo:" + url + ':' + escape(e2services[i].e2servicename) + ':' + encodeURIComponent(e2services[i].e2servicereference), "directory", {
                 title: e2services[i].e2servicename
             });
        }
    });

    plugin.addURI(plugin.getDescriptor().id + ":bouquets:(.*)", function(page, url) {
        setPageHeader(page, unescape(url) + ' - Bouquets');
        page.loading = true;
        var doc = showtime.httpReq(unescape(url) + '/web/getservices');
        page.loading = false;
        doc = XML.parse(doc);
        var e2services = doc.e2servicelist.filterNodes('e2service');
        for (var i = 0; i < e2services.length; i++) {
             page.appendItem(plugin.getDescriptor().id + ":getServices:" + url + ':' + escape(e2services[i].e2servicename) + ':' + encodeURIComponent(e2services[i].e2servicereference), "directory", {
                 title: e2services[i].e2servicename
             });
        }
    });

    plugin.addURI(plugin.getDescriptor().id + ":processReceiver:(.*)", function(page, url) {
        setPageHeader(page, unescape(url));
        page.appendItem(plugin.getDescriptor().id + ":streamFromCurrent:" + url, "video", {
            title: 'Stream from the current channel',
            icon: unescape(url) + '/grab?format=jpg&r=640'
        });
        page.appendItem(plugin.getDescriptor().id + ":bouquets:" + url, "directory", {
            title: 'Bouquets'
        });

    });

    function showReceivers(page) {
        page.flush();
        if (!store.receivers) {
            page.appendPassiveItem("directory", '' , {
	        title: "Receiver's list is empty, you can add a receiver from the page menu"
            });
        } else {
            var receivers = store.receivers.split(',');
            for (var i in receivers) {
                var description = '';
                try {
                    page.loading = true;
                    var doc = showtime.httpReq(unescape(receivers[i]) + '/web/about');
                    page.loading = false;
                    doc = XML.parse(doc);
                    description = coloredStr('Current service: ', orange) + doc.e2abouts.e2about.e2servicename +
                        coloredStr('\nService provider: ', orange) + doc.e2abouts.e2about.e2serviceprovider +
                        coloredStr('\nReceiver model: ', orange) + doc.e2abouts.e2about.e2model +
                        coloredStr('\nFirmware version: ', orange) + doc.e2abouts.e2about.e2imageversion +
                        coloredStr('\nEnigma version: ', orange) + doc.e2abouts.e2about.e2enigmaversion +
                        coloredStr('\nWebif version: ', orange) + doc.e2abouts.e2about.e2webifversion
                } catch(err) {}
                var item = page.appendItem(plugin.getDescriptor().id + ":processReceiver:" + receivers[i], "video", {
                    title: unescape(receivers[i]),
                    icon: unescape(receivers[i]) + '/grab?format=jpg&r=640',
                    description: new showtime.RichText(description)
                });
                item.id = +i;
                item.title = unescape(receivers[i]);
                item.onEvent("deleteReceiver", function(item) {
                    var arr = store.receivers.split(',');
                    arr.splice(this.id, 1);
                    store.receivers = arr.toString();
	            showtime.notify("'" + this.title + "' has been deleted from the list.", 2);
                    showReceivers(page);
	        }.bind(item));
                item.addOptAction("Delete receiver '" + unescape(receivers[i]) + "' from the list", "deleteReceiver");
            }
        }
    }

    // Start page
    plugin.addURI(plugin.getDescriptor().id + ":start", function(page) {
        setPageHeader(page, plugin.getDescriptor().synopsis);
        page.options.createAction('addReceiver', 'Add receiver', function() {
            var result = showtime.textDialog('Enter IP address or DNS address of the receiver like:\n' +
                'http://192.168.0.1 or https://192.168.0.1 or http://nameOfTheReceiver or https://nameOfTheReceiver', true, true);
            if (!result.rejected && result.input) {
                var receivers = [];
                if (store.receivers)
                    receivers = store.receivers.split(',');
                receivers.push(escape(result.input));
                store.receivers = receivers.toString();
                showtime.notify("Receiver '" + result.input + "' has been added to the list.", 2);
                showReceivers(page);
            }
        });
        showReceivers(page);
    });
})(this);