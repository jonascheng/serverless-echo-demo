function foo() {

  AWS.config.region = 'ap-northeast-1'; // Replace with the region you deploy

  var cognitoidentity = new AWS.CognitoIdentity();
  var params = {
    IdentityPoolId: 'identity-pool-id'
  };

  // Generate a Cognito ID for the 1st time, so IdentityId could be kept for future use
  cognitoidentity.getId(params, function(err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
      alert(JSON.stringify(err));
    } else console.log(data); // successful response

    var params = {
      IdentityId: data.IdentityId
    };

    // Retrieve temp credentials with IdentityId
    cognitoidentity.getCredentialsForIdentity(params, function(err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        alert(JSON.stringify(err));
      } else console.log(data); // successful response

      var apigClient = apigClientFactory.newClient({
        accessKey: data.Credentials.AccessKeyId,
        secretKey: data.Credentials.SecretKey,
        sessionToken: data.Credentials.SessionToken,
        region: 'ap-northeast-1' // Replace with the region you deploy
      });

      var params = {
        //This is where any header, path, or querystring request params go. The key is the parameter named as defined in the API
        echo: "1234"
      };
      var body = {
        //This is where you define the body of the request
        echo: "1234"
      };

      apigClient.echoAwsIamAuthorizationEchoGet(params, body).then(function(result) {
        //This is where you would put a success callback
        console.log(result);
        alert(JSON.stringify(result.data));
      }).catch(function(result) {
        //This is where you would put an error callback
        console.log(result);
        alert("Oops foo!");
      });

      apigClient.echoAwsIamAuthorizationPost(params, body).then(function(result) {
        //This is where you would put a success callback
        console.log(result);
        alert(JSON.stringify(result.data));
      }).catch(function(result) {
        //This is where you would put an error callback
        console.log(result);
        alert("Oops foo!");
      });
    })
  });
}

foo();