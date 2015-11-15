
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;
                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);

                // POLICY: Run validator over config config to ensure all minimum
                //         config is there and we should init. If minimum config
                //         is not there we do not init.

                if (config.context) {

                    var context = config.context();

                    context.setAdapterAPI({});
                }

                self.AspectInstance = function (aspectConfig) {

                    const SERVER = require("./0-server.api").forLib(LIB);

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
                                        
                                        var state = {
                                            "authorized": false
                                        };
                                        
                                        if (
                                            req.session.services &&
                                            Object.keys(req.session.services).length > 0
                                        ) {
                                            state.authorized = true;
                                        }

                                        if (
                                            config.request &&
                                            config.request.stateAlias
                                        ) {
                                            if (!req.state) {
                                                req.state = {};
                                            }
                                            req.state[config.request.stateAlias] = state;
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
