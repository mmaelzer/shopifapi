
class Log
    constructor: (verbose, logger) ->
        @verbose = if verbose? then verbose else false
    may: (msg) ->
        if @verbose then @log(msg)
    must: (msg) ->
        @log msg
    log: (msg) ->
        if logger? then logger.log(msg) else console.log(msg)

module.exports = Log