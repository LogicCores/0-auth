
exports.forLib = function (LIB) {
    
    var exports = {};

    // TODO: Load adapters as needed on demand
    
    exports.adapters = {
        passport: require("./for/passport/0-window.api").forLib(LIB)
    }
    
    exports.forContexts = function (contexts) {
        
        var exports = {};
    
        var Context = exports.Context = function (defaults) {
            var self = this;
        
            var state = {};
    
            function resetState () {
                // We need to keep 'state.authenticated = null' for first
                // run so an update gets triggered below.
                if (resetState.ranOnce) {
                    state.authenticated = false;
                } else {
                    state.authenticated = null;
                    resetState.ranOnce = true;
                }
                state.serverContext = {};
                LIB._.merge(state, LIB._.cloneDeep(defaults));
            }
            resetState();
    
            self.setAuthenticated = function (authenticated, serverContext) {
                if (state.authenticated) {
                    throw new Error("Already authenticated. Must call 'reset()' first!");
                }
            	try {
            	    var ctx = {};
            	    LIB._.merge(ctx, LIB._.cloneDeep(defaults.serverContext));
            	    LIB._.merge(ctx, LIB._.cloneDeep(serverContext));
                    state.serverContext = ctx;
            	    if (authenticated) {
                        state.authenticated = true;
                        self.emit("changed:authenticated", state.authenticated);
            	    }
            	} catch (err) {
            		console.error("authenticated changed error:", err.stack);
            	}
            }
    
            self.getServiceContext = function (serviceAlias) {
                if (!state.serverContext.services) return null;
                return state.serverContext.services[serviceAlias];
            }
    
            self.getServerContext = function () {
                return state.serverContext;
            }
        
            self.reset = function () {
            	try {
            	    var wasAuthenticated = state.authenticated;
    	            resetState();
                    if (
                        wasAuthenticated === true ||
                        // Trigger once when 'reset()' is called before 'setAuthenticated()' so app
                        // can init from clean locked state
                        wasAuthenticated === null
                    ) {
                        self.emit("changed:authenticated", state.authenticated);
                    }
            	} catch (err) {
            		console.error("reset changed error:", err.stack);
            	}
            }
        
            self.login = function (service) {
        
                // TODO: Track authentication for multiple services.
                if (state.authenticated) {
                    throw new Error("Cannot login. Already authenticated!");
                }
        
                self.emit("login", {
                    service: service
                });
            }
            
            self.logout = function (service) {
        
                // TODO: Track authentication for multiple services.
                if (!state.authenticated) {
                    throw new Error("Cannot logout. Already logged out!");
                }
        
                self.emit("logout", {
                    service: service
                });
            }
        
        }
        Context.prototype = Object.create(LIB.EventEmitter.prototype);
        Context.prototype.contexts = contexts;
    
        return exports;
    }
    
    return exports;
}
