
exports.forLib = function (LIB) {

    var exports = {};

    exports.adapters = {
        passport: require("./for/passport/0-server.api")
    };

    return exports;
}
