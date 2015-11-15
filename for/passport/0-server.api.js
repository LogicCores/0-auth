
const PASSPORT = require("passport");
const PASSPORT_GITHUB = require("passport-github");
const CRYPTO = require("crypto");


exports.forLib = function (LIB) {
    
    var exports = {};

    exports.app = function (options) {
    
        var app = new LIB.express();
    
        if (options.forceAuthenticated === true) {
    
            app.get("/context.json", function (req, res, next) {
                res.writeHead(200, {
                    "Content-Type": "application/javascript"
                });
                res.end(JSON.stringify({
                    "authenticated": true
                }, null, 4));
                return;
            });

        } else {

        	var passport = new PASSPORT.Passport();
        	passport.serializeUser(function(user, done) {
        	    return done(null, user);
        	});
        	passport.deserializeUser(function(obj, done) {
        	    return done(null, obj);
        	});

            console.log("Github callback url:", options.passport.github.callbackUR);

            passport.use(new PASSPORT_GITHUB.Strategy(
                options.passport.github,
                function (accessToken, refreshToken, profile, done) {
                    return done(null, {
                        "id": profile.id,
                        "email": (profile.emails && profile.emails[0] && profile.emails[0].value) || null,
                        "username": profile.username,
                        "accessToken": accessToken
                    });
                }
            ));

            app.use(passport.initialize());
            app.use(passport.session());

            app.get("/context.json", function (req, res, next) {

                var services = JSON.parse(JSON.stringify(req.session.services || {}));
                if (!services.github) {
                    services.github = {};
                }

                Object.keys(services).forEach(function (service) {
                    services[service].urls = {
                        "login": LIB.path.dirname(req.routeUrl) + "/login/github",
                        "logout": LIB.path.dirname(req.routeUrl) + "/logout/github"
                    }
                });

                var context = {
                    "services": services
                };

                res.writeHead(200, {
                    "Content-Type": "application/javascript"
                });
                res.end(JSON.stringify(context, null, 4));
                return;
            });

            app.get(
                "/login/github",
                passport.authenticate("github")
            );
        
            app.get(
                "/callback/github",
                passport.authenticate("github", {
                    failureRedirect: options.urls.loginFail,
                    failureFlash: true
                }),
                function (req, res, next) {
                    // We are successfully authenticated!
                    if (!req.session.services) {
                        req.session.services = {};
                    }
                    
                    function finalize () {
                        req.session.services["github"] = {
                            "key": CRYPTO.createHash("sha1").update(
                                LIB.uuid.v4() + ":" + JSON.stringify(req.session.passport.user, null, 4)
                            ).digest("hex"),
                            "details": req.session.passport.user
                        }
                        return res.redirect(options.urls.afterLogin);
                    }
        
                    if (options.restrict) {
                        return options.restrict(
                            req.session.passport.user
                        ).then(function () {
                            return finalize();
                        }).catch(function (err) {
                            console.error("User does not have access to restricted area!", err.stack);
                            return res.redirect(options.urls.loginFail);
                        });
                    }
                    return finalize();
                }
            );
        
            app.get("/logout/github", function (req, res, next) {
                req.logout();
                if (
                    req.session.services &&
                    req.session.services["github"]
                ) {
                    delete req.session.services["github"];
                }
                return res.redirect(options.urls.afterLogout);
            });
        }
    
    
        return function (req, res, next) {
    
            req.routeUrl = req.url;
            req.url = req.params[0];
    
            return app(req, res, function (err) {
        		if (err) {
        			console.error(err.stack);
        			res.writeHead(500);
        			res.end("Internal Server Error");
        			return;
        		}
                var err = new Error("Unknown route '" + req.url + "'");
                err.code = 403;
                return next(err);
        	});
        };

    }

    return exports;
}
