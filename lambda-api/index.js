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
	console.log(event)

	if (event['httpMethod'] == "GET") {
		if (event['resource'] == "/brewery/ba/state/{state}" || event['resource'] == "/brewery/ba/state/{state}/count") {
			console.log("HERE")
			console.log(event['pathParameters']['state'])
			var state = event['pathParameters']['state']
			if (event['pathParameters']['state'].length != 2) {
				state = STATE_ABBREVIATION[event['pathParameters']['state']]
			}
			getBreweriesFromState(event['pathParameters']['state'].toUpperCase(), process.env.BA_DYNAMODB_TABLE).then(function(breweries) {
				console.log(breweries)
				if (event['resource'] == "/brewery/ba/state/{state}") {
					if (typeof event['queryStringParameters'] !== 'undefined' && event['queryStringParameters'] != null) {
						if (typeof event['queryStringParameters']['field'] !== 'undefined') {
							var newArray = []
							breweries.forEach(function(brewery) {
								newArray.push(brewery[event['queryStringParameters']['field']])
							})
							response(null, newArray, callback)
						} else {
							response(null, breweries, callback)
						}
					} else {
						response(null, breweries, callback)
					}
				} else {
					response(null, breweries.length, callback)
				}
			})
			// response(null, "MADE IR", callback)
		} else if (event['resource'] == "/brewery/gs/state/{state}" || event['resource'] == "/brewery/gs/state/{state}/count") {
			console.log("HERE")
			console.log(event['pathParameters']['state'])
			var state = event['pathParameters']['state']
			if (event['pathParameters']['state'].length != 2) {
				state = STATE_ABBREVIATION[event['pathParameters']['state']]
			}
			getBreweriesFromState(event['pathParameters']['state'].toUpperCase(), process.env.GS_DYNAMODB_TABLE).then(function(breweries) {
				console.log(breweries)
				if (event['resource'] == "/brewery/gs/state/{state}") {
					if (typeof event['queryStringParameters'] !== 'undefined' && event['queryStringParameters'] != null) {
						if (typeof event['queryStringParameters']['field'] !== 'undefined') {
							var newArray = []
							breweries.forEach(function(brewery) {
								newArray.push(brewery[event['queryStringParameters']['field']])
							})
							response(null, newArray, callback)
						} else {
							response(null, breweries, callback)
						}
					} else {
						response(null, breweries, callback)
					}
				} else {
					response(null, breweries.length, callback)
				}
			})
			// response(null, "MADE IR", callback)
		} else if (event['resource'] == "/brewery/count") {
			var params = {
				Name: '/brewery-app/state-totals'
			};
			ssm.getParameter(params, function(err, totals) {
				if (err) console.log(err, err.stack); // an error occurred
				else {
					console.log(totals['Parameter']['Value'])
					response(null, JSON.parse(totals['Parameter']['Value']), callback)
				}
			})

		} else if (event['resource'] == "/brewery/gs") {
			var params = {
				TableName: process.env.GS_DYNAMODB_TABLE
			   };
			   dynamodb.scan(params, function(err, data) {
					if (err) console.log(err, err.stack); // an error occurred
					else {
						console.log(data);
						var cleaned_breweries = []
						data['Items'].forEach(function(dynamo_brewery) {
							cleaned_breweries.push(AWS.DynamoDB.Converter.unmarshall(dynamo_brewery))
						})
						cleaned_breweries.sort((a, b) => (a.brewery_name > b.brewery_name) ? 1 : -1)
						console.log("CLEANED")
						console.log(cleaned_breweries)
						response(null, cleaned_breweries, callback)
					}
			   });

		}
	}
}

function getBreweriesFromState(state_abr, dynamo_table) {
	return new Promise ( ( resolve, reject ) => {
		var params = {
			ExpressionAttributeValues: {
				":state": {
					S: state_abr
				}
			}, 
			ExpressionAttributeNames: {
				"#state" : "state"
			},
			KeyConditionExpression: "#state = :state", 
			IndexName: "state-index",
			TableName: dynamo_table
		};
		dynamodb.query(params, function(err, data) {
			if (err) {
				console.log(err, err.stack);
			} else {
				console.log(data);
				var cleaned_breweries = []
				data['Items'].forEach(function(dynamo_brewery) {
					cleaned_breweries.push(AWS.DynamoDB.Converter.unmarshall(dynamo_brewery))
				})
				cleaned_breweries.sort((a, b) => (a.brewery_name > b.brewery_name) ? 1 : -1)
				console.log("CLEANED")
				console.log(cleaned_breweries)
				resolve(cleaned_breweries)
			}
		});
	})
}

function response(err, res, callback) {
    console.log("API Response")
    if (err) {
        console.log(err)
    }
    // mysql.end()
    callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? JSON.stringify(err) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
            // 'Access-Control-Allow-Origin': 'https://app.workerscan.com',
            'Access-Control-Allow-Origin': '*',
            // 'Access-Control-Allow-Headers': 'Authorization',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        }
    });
}