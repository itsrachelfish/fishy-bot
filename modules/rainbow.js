/* 
 * Use the toilet command to generate rainbow text!
 */

var spawn = require('child_process').spawn;
var rainbow =
{
    client: false,
    commands: ['rainbow', 'bigrainbow', 'biggerrainbow', 'metalrainbow'],
    timeout: {},

    // This really should be a core function or something
    reply: function(type, from, to, message)
    {
        // If this is a channel message
        if(to.charAt(0) == '#')
        {
            rainbow.client[type](to, message);
            console.log("["+to+"] <fishy> "+message);
        }
        else
        {
            rainbow.client[type](from, message);
            console.log("["+from+"] <fishy> "+message);
        }
    },

    message: function(from, to, message, details)
    {
        // rainbow commands are prefixed with !
        if(message.charAt(0) == "!")
        {
            message = message.substr(1);
            message = message.split(' ');

            var command = message.shift().toString().toLowerCase();

            // If this command is valid
            if(rainbow.commands.indexOf(command) > -1)
            {
                message = message.join(' ');
                rainbow[command](from, to, message, details);
            }
        }
    },

    checkTimeout: function(to, host)
    {
        // Disable timeouts in botspam
        if(to == '#botspam')
        {
            return;
        }

        if(rainbow.timeout[host])
        {
            var timeout = (rainbow.timeout[host].getTime() - new Date().getTime()) / 1000;
            return timeout;
        }
    },

    setTimeout: function(host, duration)
    {
        var date = new Date();
        rainbow.timeout[host] = new Date(date.getTime() + (duration * 1000));

        setTimeout(function()
        {
            rainbow.timeout[host] = false;
        }, duration * 1000);
    },

    toilet: function(from, to, options, message)
    {
        var toilet = spawn('toilet', options);
        toilet.stdin.write(message);
        toilet.stdin.end();

        toilet.stdout.on('data', function(output)
        {
            // Replace regular spaces with a BLACK BLOCK so things look good in the webchat
            rainbow.reply('say', from, to, String(output).replace(/ /g, '01,01█'));
        });
    },

    rainbow: function(from, to, message, details)
    {
        if(rainbow.checkTimeout(to, details.host))
        {
            rainbow.reply('say', from, to, 'nah bro');
            return;
        }

        rainbow.toilet(from, to, ['--gay', '--irc', '--font', 'term'], message);
        rainbow.setTimeout(details.host, 20);
    },

    bigrainbow: function(from, to, message, details)
    {
        if(message.length > 256 || rainbow.checkTimeout(to, details.host))
        {
            rainbow.reply('say', from, to, 'nah bro');
            return;
        }

        rainbow.toilet(from, to, ['--gay', '--irc', '--font', 'future'], message);
        rainbow.setTimeout(details.host, 60);
    },

    biggerrainbow: function(from, to, message, details)
    {
        if(message.length > 128 || rainbow.checkTimeout(to, details.host))
        {
            rainbow.reply('say', from, to, 'nah bro');
            return;
        }

        rainbow.toilet(from, to, ['--gay', '--irc', '--font', 'mono9'], message);
        rainbow.setTimeout(details.host, 120);
    },

    metalrainbow: function(from, to, message, details)
    {
        if(message.length > 128 || rainbow.checkTimeout(to, details.host))
        {
            rainbow.reply('say', from, to, 'nah bro');
            return;
        }

        rainbow.toilet(from, to, ['--metal', '--irc', '--font', 'mono9'], message);
        rainbow.setTimeout(details.host, 120);
    },

    bind: function()
    {
        rainbow.client.addListener('message', rainbow.message);
    },

    unbind: function()
    {
        rainbow.client.removeListener('message', rainbow.message);
    }
};

module.exports =
{
    load: function(client)
    {
        rainbow.client = client;
        rainbow.bind();
    },

    unload: function()
    {
        rainbow.unbind();
        delete rainbow;
        delete spawn;
    }
}
