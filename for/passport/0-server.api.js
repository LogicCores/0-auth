
const ASSERT = require("assert");
const PATH = require("path");
const EXPRESS = require("express");
const PASSPORT = require("passport");
const PASSPORT_GITHUB = require("passport-github");
const CRYPTO = require("crypto");
const UUID = require("uuid");
const LODASH = require("lodash");


exports.app = function (options) {

    if (!options.passport.github.clientSecret) {
        return function (req, res, next) {
            return next();
        }
    }

	var passport = new PASSPORT.Passport();
	passport.serializeUser(function(user, done) {
	    return done(null, user);
	});
	passport.deserializeUser(function(obj, done) {
	    return done(null, obj);
	});
    passport.use(new PASSPORT_GITHUB.Strategy(
        options.passport.github,
        function (accessToken, refreshToken, profile, done) {
            return done(null, {                    
                "id": profile.id,
                "email": profile.emails[0].value,
                "username": profile.username,
                "accessToken": accessToken
            });
        }
    ));


    var app = new EXPRESS();

    app.use(passport.initialize());
    app.use(passport.session());

    app.get("/context.json", function (req, res, next) {

        var services = JSON.parse(JSON.stringify(req.session.services || {}));
        if (!services.github) {
            services.github = {};
        }

        Object.keys(services).forEach(function (service) {
            services[service].urls = {
                "login": PATH.dirname(req.routeUrl) + "/login/github",
                "logout": PATH.dirname(req.routeUrl) + "/logout/github"
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
                        UUID.v4() + ":" + JSON.stringify(req.session.passport.user, null, 4)
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

