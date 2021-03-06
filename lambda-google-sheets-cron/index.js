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

	var params = {
		Name: '/brewery-app/api-key',
		WithDecryption: true
	};
	ssm.getParameter(params, function(err, API_KEY) {
		if (err) console.log(err, err.stack); // an error occurred
		else {
			var params = {
				Name: '/brewery-app/sheet-id',
				WithDecryption: true
			};
			ssm.getParameter(params, function(err, SHEET_ID) {
				if (err) console.log(err, err.stack); // an error occurred
				else {
					var FETCH_URL = "https://sheets.googleapis.com/v4/spreadsheets/"+SHEET_ID['Parameter']['Value']+"/values/USA\!A2:P100?key="+API_KEY['Parameter']['Value']+"&majorDimension=COLUMNS"
					console.log(FETCH_URL)

					https.get(FETCH_URL, function(res) {
						var body = [];
						res.on('data', function(chunk) {
							body.push(chunk);
						});
						res.on('end', function() {
							try {
								body = JSON.parse(Buffer.concat(body).toString());
								console.log(body)
								console.log(body['values'])
								var state_total = {}
								body['values'].forEach(function(row) {
									var state = row[0].split("(")[0].trim();
									var state_abr = STATE_ABBREVIATION[state]

									for (var r = 1; r < row.length; r++) {
										var params = {
											ExpressionAttributeNames: {
												"#s": "state",
												"#ud": "updated_date"
											}, 
											ExpressionAttributeValues: {
												":s": {
													S: state_abr
												},
												":ud": {
													S: updated_date
												}
											}, 
											Key: {
												"brewery_name": {
													S: row[r]
												}
											}, 
											ReturnValues: "ALL_NEW", 
											TableName: process.env.DYNAMODB_TABLE, 
											UpdateExpression: "SET #s = :s, #ud = :ud"
										};
										dynamodb.updateItem(params, function(err, data) {
											if (err) console.log(err, err.stack); // an error occurred
											else	 console.log(data);		   // successful response
											
										});

										if (state_total[state]) {
											state_total[state] = state_total[state] + 1
										} else {
											state_total[state] = 1
										}
									}
								})

								var params = {
									Name: '/brewery-app/state-totals',
									Value: JSON.stringify(state_total),
									Overwrite: true,
									Type: 'String'
								};
								ssm.putParameter(params, function(err, data) {
									if (err) console.log(err, err.stack); // an error occurred
									else     console.log(data);           // successful response
								});
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
			});
		}
	});
}