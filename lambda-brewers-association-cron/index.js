var https = require('https');
var AWS			 = require('aws-sdk')
var dynamodb = new AWS.DynamoDB();
var ssm = new AWS.SSM({apiVersion: '2014-11-06'});

var STATE_ABBREVIATION= {
    "California": "CA",
    "Colorado": "CO",
    "Illinois": "IL",
    "Indiana": "IN",
    "Iowa": "IA",
    "Kentucky": "KY",
    "Minnesota": "MN",
    "Michigan": "MI",
    "Missouri": "MO",
    "Nebraska": "NE",
    "Nevada": "NV",
    "North Carolina": "NC",
    "Ohio": "OH",
    "Texas": "TX",
    "Washington": "WA",
    "Wisconsin": "WI"
}

exports.handler = (event, context, callback) => {
	var updated_date_date = new Date()
	var updated_date = updated_date_date.toString()

	var random_num = Math.floor(Math.random() * 999999999)
	var FETCH_URL = "https://www.brewersassociation.org/wp-content/themes/ba2019/json-store/breweries/breweries.json?nocache="+random_num
	console.log(FETCH_URL)
	var US_STATE_FILTERS = ['AL', 'AK', 'AS', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FM', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MH', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'MP', 'OH', 'OK', 'OR', 'PW', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VI', 'VA', 'WA', 'WV', 'WI', 'WY'];

	https.get(FETCH_URL, function(res) {
		// console.log(res)
		console.log("Got response: " + res.statusCode);
		// context.succeed();
		var body = [];
		res.on('data', function(chunk) {
			body.push(chunk);
		});
		res.on('end', function() {
			try {
				body = JSON.parse(Buffer.concat(body).toString());
				var json_body = JSON.parse(body)
				console.log(json_body['ResultData'])
				// var keys = Object.keys(json_body);
				// console.log(keys)
				json_body['ResultData'].forEach(function(brewery) {
					if (brewery['Zip'] != "" && brewery['StateProvince'] != "" && US_STATE_FILTERS.includes(brewery['StateProvince']) && brewery['Type'] != "Planning" && brewery['Type'] != "Contract") {
						console.log("-------")
						// console.log(brewery['Country'] + " - " + brewery['StateProvince'])
						console.log(brewery)
						var params = {
							ExpressionAttributeNames: {
								"#s": "state", 
								"#bn": "brewery_name",
								"#a": "address",
								"#c": "city",
								"#z": "zip",
								"#la": "lat",
								"#lo": "lon",
								"#t": "type",
								"#ud": "updated_date"
							}, 
							ExpressionAttributeValues: {
								":s": {
									S: brewery['StateProvince']
								}, 
								":bn": {
									S: brewery['InstituteName']
								},
								":a": {
									S: brewery['Address1']
								},
								":c": {
									S: brewery['City']
								},
								":z": {
									S: brewery['Zip']
								},
								":la": {
									S: brewery['Latitude']
								},
								":lo": {
									S: brewery['Longitude']
								},
								":t": {
									S: brewery['BreweryType']
								},
								":ud": {
									S: updated_date
								}
							}, 
							Key: {
								"brewery_id": {
									S: brewery['BreweryDBID']
								}
							}, 
							ReturnValues: "ALL_NEW", 
							TableName: process.env.DYNAMODB_TABLE, 
							UpdateExpression: "SET #s = :s, #bn = :bn, #a = :a, #c = :c, #z = :z, #la = :la, #lo = :lo, #t = :t, #ud = :ud"
						};
						dynamodb.updateItem(params, function(err, data) {
							if (err) console.log(err, err.stack); // an error occurred
							else	 console.log(data);		   // successful response
							
						});
					}
				})
			} catch(e) {
				console.log("ERROR")
				console.error(e);
			}
			// console.log(body);
		});
		}).on('error', function(e) {
			console.log("Got error: " + e.message);
			context.done(null, 'FAILURE');
		});
}
