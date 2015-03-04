var fs = require('fs');
var http = require('http');
var querystring = require('querystring');
var crypto = require('crypto');
var compare = require('buffer-equal-constant-time');

function processPost(request, response, callback) {
    var queryData = "";
    if(typeof callback !== 'function') return null;

    if(request.method == 'POST') {
        request.on('data', function(data) {
            queryData += data;
            if(queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });

        request.on('end', function()
        {
            try
            {
                // Check if the server responded with JSON
                request.post = JSON.parse(queryData);
            }
            catch(error)
            {
                // Otherwise, process the post request normally
                request.post = querystring.parse(queryData);
            }
            
            callback(request, response);
        });

    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.end();
    }
}

var github =
{
    core: false,
    client: false,
    server: false,
    port: 1234,
    channel: '#wetfish',
    events: ['gollum', 'push'],

    groups:
    [
        {text: 'couple', 'min': 2, 'max': 2},
        {text: 'few', 'min': 3, 'max': 4},
        {text: 'bunch of', 'min': 5, 'max': 7},
        {text: 'lot of', 'min': 8, 'max': 12},
        {text: 'ton of', 'min': 13, 'max': 0x20000000000000},
    ],

    find_group: function(value)
    {
        for(var i = 0, l = github.groups.length; i < l; i++)
        {
            var group = github.groups[i];

            if(value >= group.min && value <= group.max)
                return group.text;
        }
    },

    sort: function(object)
    {
        var sortable = [];
        
        for(var key in object)
        {
            sortable.push([key, object[key]])
        }
        
        sortable.sort(function(a, b) {return a[1] - b[1]});

        return sortable;
    },

    init: function()
    {
        github.server = http.createServer(function(request, response)
        {
            if(request.method == 'POST')
            {
                processPost(request, response, github.handler);
            }
            else
            {
                response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
                response.end();
            }

        }).listen(github.port);
    },

    handler: function(request, response)
    {
        console.log("_!_ Post request recieved");

        // Calculate SHA hash to verify request
        var verified = github.verify(request.headers['x-hub-signature'], request.post);

        if(verified)
        {
            // Send event to its handler if defined in github.events
            if(github.events.indexOf(request.headers['x-github-event']) > -1)
            {
                github[request.headers['x-github-event']](request.post);
            }
            
            // Write to a logfile
            fs.appendFile('logs/github.txt', JSON.stringify(request.headers) + "\n" + JSON.stringify(request.post) + "\n\n", function (error)
            {
                if(error)
                {
                    console.log("_Error_ Unable to append file!");
                    console.log(error);
                }
            });
        }
        
        response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
        response.end();
    },

    verify: function(hash, payload)
    {
        hash = hash.split('=');

        var calculated = crypto.createHmac(hash[0], github.core.secrets.github_key).update(JSON.stringify(payload)).digest('hex')
        var comparison = compare(new Buffer(hash[1]), new Buffer(calculated));

        return comparison;
    },

    gollum: function(data)
    {
        var user = data.sender.login;
        var name = data.repository.name;
        var page = data.repository.html_url;
        var action = data.pages[0].action;
        var actions = [];

        if(data.pages.length == 1)
        {
            page = data.pages[0].html_url;
            
            var message = "[GitHub] User "+user+" "+action+" a page on the "+name+" wiki. ( "+page+" )";
            github.client.say(github.channel, message);
            console.log(message);
        }

/*
        if(data.pages.length < 8)
        {
            data.pages.forEach(function(page)
            {
                if(typeof actions[page.action] == "undefined")
                    actions[page.action] = 0;

                actions[page.action]++;
            });

            
        }
        else
        {

        }
*/
    },

    push: function(data)
    {
        var name = data.repository.name;
        var page = data.repository.html_url;
        var message;
        
        var author = data.commits[0].author.username;
        var authors = {};

        if(data.commits.length == 1)
        {
            page = data.commits[0].url;
            
            // Possible exploit: Could you put IRC control characters in the name of a project? xD
            // Almost certainly an exploit: IRC control characters in a commit message :P
            message = "[GitHub] A commit was made by "+author+" in the "+name+" project. ( "+data.commits[0].message+" | "+page+" )";
        }
        else
        {
            data.commits.forEach(function(commit)
            {
                if(typeof authors[commit.author.username] == "undefined")
                    authors[commit.author.username] = 0;

                authors[commit.author.username]++;
            });

            authors = Object.keys(authors);

            if(authors.length > 1)
            {
                var last = authors.pop();
                author = authors.join(', ');
                author += " & " + last;
            }
            else
            {
                author = authors[0];
            }

            var group = github.find_group(data.commits.length);
            message = "[GitHub] A "+group+" commits were made by "+author+" in the "+name+" project. ( "+page+" )";
        }
    
        github.client.say(github.channel, message);
        console.log(message);
    }
};


module.exports =
{
    load: function(client, core)
    {
        github.client = client;
        github.core = core;
        github.init();
    },

    unload: function()
    {
        github.server.close();
        
        github.server.on('request', function( req, resp ) { req.socket.end(); });
        github.server.once('close', function()
        {
            // Remove the listeners after the server has shutdown for real.
            github.server.removeAllListeners();
        });
        
        // Delete node modules
        delete fs;
        delete http;
        delete querystring;
        delete crypto;
        delete compare;
        
        // Delete defined variables
        delete processPost;
        delete github;

    },
}
