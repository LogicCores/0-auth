
exports.forLib = function (LIB) {
    var ccjson = this;

    const SERVER = require("./0-server.api");

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;
                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);
                
                self.AspectInstance = function (aspectConfig) {
                    return LIB.Promise.resolve({
                        routesApp: function () {
                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                                    SERVER.app(config)
                                )
                            );
                        },
                        contextApp: function () {
                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                                    function (req, res, next) {
                                        
                                        var context = {
                                            "authorized": false
                                        };
                                        
                                        if (
                                            req.session.services &&
                                            Object.keys(req.session.services).length > 0
                                        ) {
                                            context.authorized = true;
                                        }

                                        if (
                                            config.request &&
                                            config.request.contextAlias
                                        ) {
                                            if (!req.context) {
                                                req.context = {};
                                            }
                                            req.context[config.request.contextAlias] = context;
                                        }

                                        return next();
                                    }
                                )
                            );
                        }
                    });
                }
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
