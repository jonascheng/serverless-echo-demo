# serverless-echo-demo
A simple ECHO service to demo AWS API Gateway in different scenarios:
* Simple API Gateway without authentication
* API Gateway with API Key
* API Gateway with AWS_IAM authentication

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

## Futher Configuration on AWS Console

### API Key

### Identity Pool Id

You may refer to my [article](https://jonascheng.github.io/aws/2016/05/19/cognito-with-unauthenticated-identities/) to set up unauthenticated identities, or you could leverage [script](https://github.com/jonascheng/serverless-echo-demo/blob/master/cognito-bootstrap.js) for the same purpose, for example:

```
./cognito-bootstrap.js 
    --deploy 
    --region ap-northeast-1 
    --profile serverless-echo-demo_dev 
    --identitypool slsechodemo 
    --restapi serverless-echo-demo 
    --stage dev
...
Added identity pool id: ap-northeast-1:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
...

```

After manual operation or script execution, you should keep identity pool id for use later.

## How to Verify?

### Simple API Gateway without authentication

This is obviously easy to verify thru Postman tool.

You should be able to get the following responses:

```
GET https://[API ID].execute-api.[REGION].amazonaws.com/[STAGE]/echo_no_authorization/1234

>>>
{
  "message": "Go Serverless! Your Lambda function executed successfully!",
  "request": {
    "apigw": {
      "httpMethod": "GET",
      "queryParams": "{}",
      "pathParams": "{echo=1234}",
      "payload": {}
    }
  }
}

```

```
POST https://[API ID].execute-api.[REGION].amazonaws.com/[STAGE]/echo_no_authorization

BODY: application/json
{
  "echo": 1234
}

>>>
{
  "message": "Go Serverless! Your Lambda function executed successfully!",
  "request": {
    "apigw": {
      "httpMethod": "POST",
      "queryParams": "{}",
      "pathParams": "{}",
      "payload": {
        "echo": 1234
      }
    }
  }
}

```

### API Gateway with API Key

The only difference is either GET or POST request should carry additional header x-api-key. The key should be the one you configured in AWS Console above.

```
GET https://[API ID].execute-api.[REGION].amazonaws.com/[STAGE]/echo_api_key_authorization/1234

HEADER: x-api-key: [API KEY]

``` 

```
POST https://[API ID].execute-api.[REGION].amazonaws.com/[STAGE]/echo_api_key_authorization

HEADER: x-api-key: [API KEY]
BODY: application/json
{
  "echo": 1234
}

``` 

### API Gateway with AWS_IAM authentication

#### Test in Browser/Javascript

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

      ...
      
      var apigClient = apigClientFactory.newClient({
        accessKey: data.Credentials.AccessKeyId,
        secretKey: data.Credentials.SecretKey,
        sessionToken: data.Credentials.SessionToken,
        region: 'ap-northeast-1' // Replace with the region you deploy
      });

      ...
      
    })
  });
}

foo();
```

#### Test in iOS SDK
