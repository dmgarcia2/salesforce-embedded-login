var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var app = express();

var request = require('request');
var querystring = require('querystring');

app.use(bodyParser.json());

/* GET home page. */
router.get('/', function(req, res, next) {
	try {	
		res.render('index', {
			salesforce_community_url: process.env.SALESFORCE_COMMUNITY_URL,
			salesforce_client_id: process.env.SALESFORCE_CLIENT_ID,
			salesforce_herokuapp_url: process.env.SALESFORCE_HEROKUAPP_URL,
			salesforce_mode: process.env.SALESFORCE_MODE,
			salesforce_namespace: process.env.SALESFORCE_NAMESPACE,
			salesforce_forgot_password_enabled: process.env.SALESFORCE_FORGOT_PASSWORD_ENABLED,
			salesforce_self_register_enabled: process.env.SALESFORCE_SELF_REGISTER_ENABLED
		});
	} catch (exception) {
		console.log(exception);
	}
});

router.get('/_callback', function(req, res, next) {
	try {
		var code = req.query.code;
		if (code) {
			code = querystring.unescape(code);
		}
		console.log('CALLBACK - code: ' + code);
		var startURL = req.query.state;
		if (startURL) {
			startURL = querystring.unescape(startURL);
		}
		console.log('CALLBACK - startURL: ' + startURL);

		var tokenResponse = null;
		var communityUrl = 'https://' + process.env.SALESFORCE_COMMUNITY_URL;

		var postOptions = {
			url: communityUrl + '/services/oauth2/token',
			method: 'POST',
			form: {
				code: code,
				grant_type: "authorization_code",
				client_id: process.env.SALESFORCE_CLIENT_ID,
				client_secret: process.env.SALESFORCE_CLIENT_SECRET,
				redirect_uri: 'https://' + process.env.SALESFORCE_HEROKUAPP_URL + '/_callback'
			}
		};

		console.log('CALLBACK - POST - options: ' + JSON.stringify(postOptions));

		request(postOptions, function(error, httpResponse, postResponse) {
			console.log('CALLBACK - POST - error:', error);
			console.log('CALLBACK - POST - statusCode:', httpResponse && httpResponse.statusCode);
			console.log('CALLBACK - POST - headers:', httpResponse && httpResponse.headers);
			console.log('CALLBACK - POST - response:', postResponse);

			if (httpResponse && httpResponse.statusCode != 200) {
				res.status(httpResponse.statusCode).json(JSON.parse(postResponse));
				return;
			}

			var postResponseObj = JSON.parse(postResponse);
			var access_token = postResponseObj.access_token;
			var identity = postResponseObj.id;
			console.log('CALLBACK - POST - access_token:', access_token);
			console.log('CALLBACK - POST - identity:', identity);

			var getOptions = {
				url: identity + '?version=latest',
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + access_token
				}
			};
			console.log('CALLBACK - GET - options: ' + JSON.stringify(getOptions));
			request(getOptions, function(error, httpResponse, getResponse) {
				console.log('CALLBACK - GET - error:', error);
				console.log('CALLBACK - GET - statusCode:', httpResponse && httpResponse.statusCode);
				console.log('CALLBACK - GET - headers:', httpResponse && httpResponse.headers);
				console.log('CALLBACK - GET - response:', getResponse);

				if (httpResponse && httpResponse.statusCode != 200) {
					res.status(httpResponse.statusCode).json(JSON.parse(getResponse));
					return;
				}

				var html = '<html><head>' +
						   '<meta name="salesforce-community" content="https://' + communityUrl + '">' +
						   '<meta name="salesforce-mode" content="' + process.env.SALESFORCE_MODE + '-callback">' +
						   '<meta name="salesforce-server-callback" content="true">' +
						   '<meta name="salesforce-server-response" content="' + new Buffer(getResponse).toString('base64') + '">' +
						   '<meta name="salesforce-server-starturl" content="' + startURL + '">' +
						   '<meta name="salesforce-target" content="#salesforce-login">'+
						   '<meta name="salesforce-allowed-domains" content="' + process.env.SALESFORCE_HEROKUAPP_URL + '">' +
						   '<script src="https://' + communityUrl + '/servlet/servlet.loginwidgetcontroller?type=javascript_widget&min=false" async defer></script>' +
						   '</head><body></body></html>';
				console.log('CALLBACK - html: ' + html);

				res.writeHeader(200, {"Content-Type": "text/html"});
				res.write(html);
				res.end();
			});
		});

	} catch (exception) {
		console.log(exception);
	}
});

module.exports = router;
