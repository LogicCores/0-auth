
const ASSERT = require("assert");
const PATH = require("path");
const EXPRESS = require("express");
const EXPRESS_SESSION = require("express-session");
const EXPRESS_SESSION_FILE_STORE = require('session-file-store')(EXPRESS_SESSION);
const PASSPORT = require("passport");
const PASSPORT_GITHUB = require("passport-github");
const CRYPTO = require("crypto");
const UUID = require("uuid");
const LODASH = require("lodash");


exports.app = function (options) {

    ASSERT.equal(typeof options.session.secret, "string");

    ASSERT.equal(typeof options.passport.github.clientID, "string");
    ASSERT.equal(typeof options.passport.github.clientSecret, "string");
    ASSERT.equal(typeof options.passport.github.callbackURL, "string");
    ASSERT.equal(typeof options.passport.github.scope, "string");


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

    app.use(EXPRESS_SESSION(LODASH.extend(options.session, {
        store: new EXPRESS_SESSION_FILE_STORE(LODASH.extend(options.session.store, {
            path: options.session.store.basePath
        }))
    })));
    app.use(passport.initialize());
    app.use(passport.session());

    app.get("/context.json", function (req, res, next) {

        var services = JSON.parse(JSON.stringify(req.session.services || {}));
        if (!services.github) {
            services.github = {};
        }
        Object.keys(services).forEach(function (service) {
            services[service].urls = {
                "login": "/cores/auth/for/passport/login/github",
                "logout": "/cores/auth/for/passport/logout/github"
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
            failureRedirect: "/login/fail",
            failureFlash: true
        }),
        function (req, res, next) {
            // We are successfully authenticated!
            if (!req.session.services) {
                req.session.services = {};
            }
            req.session.services["github"] = {
                "key": CRYPTO.createHash("sha1").update(
                    UUID.v4() + ":" + JSON.stringify(req.session.passport.user, null, 4)
                ).digest("hex"),
                "details": req.session.passport.user
            }
            // TODO: Redirect to configured URL or URL requested during login
            return res.redirect("/");
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
        // TODO: Redirect to configured URL or URL requested during logout
        return res.redirect("/");
    });

    app.use("/login/fail", function (req, res, next) {

console.log("LOGIN FAIL!!");

    });


    return function (req, res, next) {

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

