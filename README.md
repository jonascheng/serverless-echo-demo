# serverless-echo-demo
A simple ECHO service to demo AWS/Cognito

## Install

The steps below can be taken to install the project and initialize it.

Open a command line terminal and cd to the location where you will be placing the serverless-survey-forms project.

Clone the project directly from Github:

```git clone https://github.com/trendmicro/serverless-echo-demo.git```

Enter the serverless-echo-demo folder that was just created:

```cd serverless-echo-demo```

Initialize the project:

```serverless project init```

Install npm dependency modules in serverless-echo-demo:

```npm install```

Deploy your functions and endpoints:

```serverless dash deploy```

## Test in Browser/Javascript

* Login `AWS Management Console` and open `Amazon API Gateway`
* Under `APIs\serverless-echo-demo\Stages`, click on `dev`
* Select tab `SDK Generation`
* Set `Platform` as `Javascript`
* Click `Generate SDK` and download an archived file
* Decompress the download file to the `.\test` 
* Download [aws-sdk](https://github.com/aws/aws-sdk-js/releases) from Github
* Decompress the download file to the `.\test`
* Create a static script.js with the following content in the previous folder
* Replace [ap-northeast-1] and [identity-pool-id] in `.\test\script.js`
    
```javascript
function foo() {

  AWS.config.region = 'ap-northeast-1'; // Replace with the region you deploy

  var cognitoidentity = new AWS.CognitoIdentity();
  var params = {
    IdentityPoolId: 'identity-pool-id'
  };

  // Generate a Cognito ID for the 1st time, so IdentityId could be kept for future use
  cognitoidentity.getId(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data); // successful response

    var params = {
      IdentityId: data.IdentityId
    };

    // Retrieve temp credentials with IdentityId
    cognitoidentity.getCredentialsForIdentity(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else console.log(data); // successful response

      var apigClient = apigClientFactory.newClient({
        accessKey: data.Credentials.AccessKeyId,
        secretKey: data.Credentials.SecretKey,
        sessionToken: data.Credentials.SessionToken,
        region: 'ap-northeast-1' // Replace with the region you deploy
      });

      var params = {
        //This is where any header, path, or querystring request params go. The key is the parameter named as defined in the API
        foo: "foo"
      };

      apigClient.demoGet(params).then(function(result) {
        //This is where you would put a success callback
        console.log(result);
        alert("Hello foo!");
      }).catch(function(result) {
        //This is where you would put an error callback
        console.log(result);
        alert("Oops foo!");
      });
    })

  });
}

foo();
```