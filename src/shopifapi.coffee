Queue = require 'burst-queue'
async = require 'async'
req = require 'request'
Log = require './log'

class Shopifapi

    _auth =
        username: ''
        password: ''
        base64: ''
        
    _url = ''
    _log = null
    _queue = null

    _buildOptions = (url, method, data) ->
        options =
            url: url
            method: method
            json: true
            headers:
                "Authorization": _auth.base64
        if data?
            options.body = JSON.stringify data

        return options


    constructor: (options) ->
        _auth = options.auth
        _auth.base64 = "Basic #{(new Buffer([_auth.username, _auth.password].join(':'))).toString('base64')}"
        _url = options.url
        verbose = if options.verbose? then options.verbose else false
        _log = new Log verbose, options.logger
        _queue = new Queue 5*60*1000, 250

    getBaseObj: (obj, args, callback) ->
        argswq = ''
        argswa = ''
        if args
            argswq = '?' + args
            argswa = '&' + args

        countUrl = "#{_url}/admin/#{obj}/count.json#{argswq}"

        countComplete = (err, response, result) ->
            pages = Math.ceil(result.count / 250)
            objects = []

            qtask = (task, callback) ->
                fetch = "#{_url}/admin/#{obj}.json?limit=250&page=#{task.page}#{argswa}"
                options = _buildOptions(fetch, 'GET')
                _queue.add(-> 
                    _log.may fetch
                    request = req options, (err, response, result) ->
                        _log.may(err) if err?
                        if response.statusCode is 500 
                            _log.may "ERROR 500. Retrying..."
                            @retry 0
                        else
                            objects = objects.concat(result[obj])
                            callback(objects) if callback?
                    )

            q = async.queue qtask, 5

            q.drain = ->
                callback(objects) if callback?

            for currPage in [1..pages]
                q.push { page: currPage }

        getData = =>
            _log.may countUrl

            options = 
                url: countUrl
                method: 'GET'
                json: true
                headers:
                    "Authorization": _auth.base64

            _log.may options
            req options, countComplete

        _queue.add getData


    getSubObj: (obj, subobj, args, callback) ->
        fetch = "#{_url}/admin/#{obj}/#{args}/#{subobj}.json"
       
        options = _buildOptions fetch, 'GET'
        _queue.add(->    
            _log.may fetch
            request = req options, (err, response, result) ->
                if response.statusCode is 500 
                  _log.may "ERROR 500. Retrying..."
                  @retry 0
                else
                  callback(result[subobj]) if callback?
            )


    put: (obj, id, data, callback) ->
        put = "#{_url}/admin/#{obj}/#{id}.json"
        options = _buildOptions(put, 'PUT', data)

        _queue.add(->          
            _log.may "PUT #{put}"
            _log.may data

            request = req options, (err, response, result) ->
                if err? then _log.may err
                if result? then _log.may(result)
                callback(if result? then result[obj] else null) if callback?
            )

    post: (obj, data, callback) ->
        post = "#{_url}/admin/#{obj}.json"
        options = _buildOptions(post, 'POST', data)
        
        _queue.add(->
            _log.may "POST #{post}"
            _log.may data

            request = req options, (err, response, result) -> 
                if err? then _log.may err           
                if result? then _log.may(result)
                callback(if result? then result[obj] else null) if callback?
            )

    queue: ->
        _queue.enqueued()

module.exports = Shopifapi