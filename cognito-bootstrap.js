#!/usr/bin/env node

'use strict';

let program = require('commander');
let AWS = require('aws-sdk');

let deployIAMRole = function() {
  return new Promise(function(fulfill, reject) {
    let params;
    let authAssumeRolePolicyDoc = {
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {
          "Federated": "cognito-identity.amazonaws.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "cognito-identity.amazonaws.com:aud": "ap-northeast-1:cec6fd54-188e-4226-af8f-7e0c6cb3aa4e"
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated"
          }
        }
      }]
    };
    let unauthAssumeRolePolicyDoc = {
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {
          "Federated": "cognito-identity.amazonaws.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "cognito-identity.amazonaws.com:aud": "ap-northeast-1:247a8715-a43d-4af7-8030-2574188bd632"
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated"
          }
        }
      }]
    };

    let iam = new AWS.IAM();
    params = {
      AssumeRolePolicyDocument: JSON.stringify(authAssumeRolePolicyDoc),
      /* required */
      RoleName: 'Cognito_EchoAwsIamAuthorization_AuthRole'
      /* required */
    };
    iam.createRole(params, function(err, data) {
      if (err) {
        reject(err); // an error occurred
      } else {
        console.log(data); // successful response
        fulfill(data);
      }
    });
  });
};

let removeIAMRole = function() {

};

let checkIdentityPoolExist = function() {
  return new Promise(function(fulfill, reject) {
    let cognitoidentity = new AWS.CognitoIdentity();

    // check if identity pool exist
    let next;
    do {
      let params = {
        MaxResults: 10,
        /* required */
      };

      cognitoidentity.listIdentityPools(params, function(err, data) {
        if (err) {
          console.error(err, err.stack); // an error occurred
          reject(err);
        } else {
          data.IdentityPools.forEach(function(currentValue) {
            if (currentValue.IdentityPoolName === program.identitypool) {
              reject(new Error('The identity pool name already existed!'));
            }
          });
          if (typeof data.NextToken === "undefined") {
            fulfill(data);
          }
          next = data.NextToken;
        }
      });
    }
    while (next);
  });
};

let deployIdentityPool = function() {
  let cognitoidentity = new AWS.CognitoIdentity();

  // create identity pool
  let params = {
    AllowUnauthenticatedIdentities: true,
    /* required */
    IdentityPoolName: program.identitypool
    /* required */
  };

  cognitoidentity.createIdentityPool(params, function(err, data) {
    if (err) console.error(err, err.stack); // an error occurred
    else {
      console.log('created identity pool id:', data.IdentityPoolId)
      let params = {
        IdentityPoolId: data.IdentityPoolId,
        /* required */
        Roles: {
          /* required */
          authenticated: "arn:aws:iam::151145865037:role/Cognito_EchoAwsIamAuthorization_AuthRole",
          unauthenticated: "arn:aws:iam::151145865037:role/Cognito_MOCKUnauth_Role"
        }
      };
      cognitoidentity.setIdentityPoolRoles(params, function(err, data) {
        if (err) console.error(err, err.stack); // an error occurred
        //        else console.log(data); // successful response
      });
    }
  });
}

let removeIdentityPool = function() {

};

program
  .version('0.0.1')
  .option('--deploy', 'Deploy identity pool configurations to AWS')
  .option('--remove', 'Remove identity pool configurations form AWS')
  .option('--region <value>', 'A region to create identify pool', /^(us-east-1|us-west-1|us-west-2|eu-west-1|eu-central-1|ap-southeast-1|ap-southeast-2|ap-northeast-1|ap-northeast-2|sa-east-1)$/, '')
  .option('--profile <value>', 'A credentials profile name which is defined in ~/.aws/credentials')
  .option('--identitypool <value>', 'An identity pool name, only alphabets and spaces are allowed', /^([\w ]+)$/, '')
  .option('-i, --integer <n>', 'An integer argument', parseInt)
  .option('-f, --float <n>', 'A float argument', parseFloat)
  .parse(process.argv);
/*
console.log(' region: %j', program.region);
console.log(' deploy: %j', program.deploy);
console.log(' profile: %j', program.profile);
console.log(' identitypool: %j', program.identitypool);
*/
// check parameters
if (typeof program.region === "undefined" || program.region === "") {
  console.error('>> no region given!');
  program.help();
}
if (typeof program.profile === "undefined" || program.profile === "") {
  console.error('>> no credentials profile given!');
  program.help();
}
if (typeof program.identitypool === "undefined" || program.identitypool === "") {
  console.error('>> no identity pool name given!');
  program.help();
}

// init AWS.config
AWS.config.update({
  region: program.region,
  apiVersions: {
    iam: '2010-05-08',
    cognitoidentity: '2014-06-30'
  }
});

// init credential from profile
let credentials = new AWS.SharedIniFileCredentials({
  profile: program.profile
});
AWS.config.credentials = credentials;

if (program.deploy) {
  console.log('>> Deploy identity pool configurations to AWS');
  deployIAMRole()
    .then(checkIdentityPoolExist)
    .then(deployIdentityPool)
    .catch(function(e) {
      if (e.code && e.code === "EntityAlreadyExists") {
        console.error('>> The IAM Role already existed!');
        console.error(e);
      } else {
        console.error(e);
      }
    });

} else if (program.remove) {
  console.error('>> Remove identity pool configurations from AWS');
  removeIdentityPool();
} else {
  console.error('>> no deploy or remove given!');
  program.help();
}
/*
let deployA = function() {
  return new Promise(function(fulfill, reject) {
    console.log('deployA');
    fulfill('deployA');
  });
}

let deployB = function() {
  return new Promise(function(fulfill, reject) {
    console.log('deployB');
    fulfill('deployB');
  });
}

deployA().then(deployB);
*/