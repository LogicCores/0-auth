
// TODO: Load adapters as needed on demand

exports.adapters = {
    passport: require("./for/passport/window.api")
}


var Context = exports.Context = function () {
    var self = this;

    var state = {
        authenticated: null,
        serverContext: null
    };
    
    self.setAuthenticated = function (authenticated, serverContext) {
        if (state.authenticated) {
            throw new Error("Already authenticated. Must call 'reset()' first!");
        }
    	try {
            state.serverContext = serverContext;
    	    if (authenticated) {
                state.authenticated = true;
                self.emit("changed:authenticated", state.authenticated);
    	    }
    	} catch (err) {
    		console.error("authenticated changed error:", err.stack);
    	}
    }
    
    self.getServerContext = function () {
        return state.serverContext;
    }

    self.reset = function () {
    	try {
    	    var wasAuthenticated = state.authenticated;
    	    state.authenticated = false;
            state.serverContext = null;
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

    self.login = function (namespace, service) {

        // TODO: Track authentication for multiple services.
        if (state.authenticated) {
            throw new Error("Cannot login. Already authenticated!");
        }

        self.emit("login", {
            namespace: namespace,
            service: service
        });
    }
    
    self.logout = function (namespace, service) {

        // TODO: Track authentication for multiple services.
        if (!state.authenticated) {
            throw new Error("Cannot logout. Already logged out!");
        }

        self.emit("logout", {
            namespace: namespace,
            service: service
        });
    }

}
Context.prototype = Object.create(window.EventEmitter.prototype);
