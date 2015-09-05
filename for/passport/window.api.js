
exports.spin = function (context) {

    var Auth = function () {
        var self = this;

        // TODO: Support multiple namespaces.
        const NS = "0";
        // TODO: Support multiple services
        const SERVICE = "github";


        function initSession () {

            // This will trigger a reset event to ensure everything is initialized
            // from a clean locked state.
            context.reset();


            var url = "/cores/auth/for/passport/" + NS + "/context.json";

			return window.fetch(url, {
			    credentials: "same-origin"
			}).then(function(response) {
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
			    }

			    return context.setAuthenticated(authenticated, serverContext);
			});
        }

        context.on("login", function (info) {

            if (info.namespace !== NS) return;

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

            if (info.namespace !== NS) return;

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
