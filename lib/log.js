/**
 *  @param {Boolean=} verbose
 *  @param {Function} logger
 */
function Log(verbose, logger) {
  log = logger || console.log;
  this.must = log;
  this.may = verbose ? log : function() {};
}

module.exports = Log;