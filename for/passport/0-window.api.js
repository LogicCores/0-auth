
exports.forLib = function (LIB) {
    
    var exports = {};

    exports.spin = function (context) {
    
        var Auth = function () {
            var self = this;
    
            // TODO: Support multiple services
            const SERVICE = "github";
    
    
            function initSession () {
    
                // This will trigger a reset event to ensure everything is initialized
                // from a clean locked state.
                context.reset();
    
    
                var url = context.getServiceContext(SERVICE).urls.context;
    
    			return context.contexts.adapters.fetch.window.fetch(url).then(function(response) {
    				return response.json();
    			}).then(function (serverContext) {
    
    			    // TODO: Use declared criteria to establish when someone
    			    //       is deemed authenticated instead of using just github service.
    			    var authenticated = false;
    			    if (serverContext.services) {
    			        Object.keys(serverContext.services).forEach(function (service) {
    			            if (
    			                service === SERVICE &&
    			                serverContext.services[service].key
    		                ) {
    		                    authenticated = true;
    		                }
    			        });
    			    } else
    			    if (serverContext.authenticated === true) {
    			        authenticated = true;
    			        serverContext = {};
    			    }
    
    			    return context.setAuthenticated(authenticated, serverContext);
    			}).catch(function (err) {
    			    console.error("Error fetching session info from '" + url + "':", err.stack);
    			    throw err;
    			});
            }
    
            context.on("login", function (info) {
    
                var serverContext = context.getServerContext();
    
                if (
                    !serverContext ||
                    !serverContext.services ||
                    !serverContext.services[info.service]
                ) {
                    return;
                }
    
                if (serverContext.services[info.service].key) {
                    throw new Error("Already logged into service '" + info.service + "'");
                }
    
                context.emit("redirect", serverContext.services[info.service].urls.login);
            });
    
            context.on("logout", function (info) {
    
                var serverContext = context.getServerContext();
    
                if (
                    !serverContext ||
                    !serverContext.services ||
                    !serverContext.services[info.service]
                ) {
                    return;
                }
    
                if (!serverContext.services[info.service].key) {
                    throw new Error("Already logged out of service '" + info.service + "'");
                }
    
                context.emit("redirect", serverContext.services[info.service].urls.logout);
            });
    
    
            // Wait for listeners to attach
            setTimeout(function () {
                initSession();
            }, 0);
        }
    
        return new Auth(context);
    }

    return exports;
}
