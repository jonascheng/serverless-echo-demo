#!/usr/bin/env node

'use strict';

let program = require('commander');
let AWS = require('aws-sdk');

function IdentityPoolOP(_identityPoolName, _region, _restapi, _stage) {
  let _identityPoolId = "";
  let _accountId = "";
  let _restApiId = "";
  let _arnAuthRole = "";
  let _arnUnauthRole = "";

  // compose IAM role anme
  let _authrole = 'Cognito_' + _identityPoolName + '_AuthRole'
  let _unauthrole = 'Cognito_' + _identityPoolName + '_UnauthRole'

  // lookup identity pool id against identity pool name
  function lookupIdentityPoolId(identityPoolName, identityPoolId, next) {
    return new Promise(function(resolve, reject) {
      let params;

      // cached?
      if (_identityPoolId !== "") {
        resolve(_identityPoolId);
      } else if (typeof next === "undefined") { // no further request, stop condition
        _identityPoolId = identityPoolId;
        resolve(identityPoolId);
      } else {
        if (next !== "") { // need further request
          params = {
            MaxResults: 10,
            /* required */
            NextToken: next
          };
        } else { // first request
          params = {
            MaxResults: 10
            /* required */
          };
        }

        let cognitoidentity = new AWS.CognitoIdentity();
        cognitoidentity.listIdentityPools(params, function(err, data) {
          if (err) {
            reject(err);
          } else {
            data.IdentityPools.forEach(function(currentValue) {
              if (currentValue.IdentityPoolName === identityPoolName) {
                console.log('>> found corresponding identity id:', currentValue.IdentityPoolId);
                identityPoolId = currentValue.IdentityPoolId;
              }
            });
            lookupIdentityPoolId(identityPoolName, identityPoolId, data.NextToken)
              .then(function(identityPoolId) {
                resolve(identityPoolId);
              });
          }
        });
      }
    });
  };

  // lookup rest api id against rest api name
  function lookupRestApiId(restApiName, restApiId, next) {
    return new Promise(function(resolve, reject) {
      let params;

      // cached?
      if (_restApiId !== "") {
        resolve(_restApiId);
      } else if (typeof next === "undefined") { // no further request, stop condition
        _restApiId = restApiId;
        resolve(restApiId);
      } else {
        if (next !== "") { // need further request
          params = {
            limit: 10,
            /* required */
            position: next
          };
        } else { // first request
          params = {
            limit: 10
            /* required */
          };
        }

        let apigateway = new AWS.APIGateway();
        apigateway.getRestApis(params, function(err, data) {
          if (err) {
            reject(err);
          } else {
            data.items.forEach(function(currentValue) {
              if (currentValue.name === restApiName) {
                console.log('>> found corresponding rest api id:', currentValue.id);
                _restApiId = restApiId = currentValue.id;
              }
            });
            lookupRestApiId(restApiName, restApiId, data.position)
              .then(function(restApiId) {
                resolve(restApiId);
              });
          }
        });
      }
    });
  };

  // lookup account id
  function lookupAccountId() {
    return new Promise(function(resolve, reject) {
      // cached?
      if (_accountId !== "") {
        resolve(_accountId);
      } else {
        let sts = new AWS.STS();
        sts.getCallerIdentity({}, function(err, data) {
          if (err) {
            reject(err);
          } else {
            _accountId = data.Account;
            resolve(_accountId);
          }
        });
      }
    });
  };

  // add identity pool
  function addIdentityPoolId() {
    return new Promise(function(resolve, reject) {
      if (_identityPoolId !== "") { // identity pool already existed
        console.log('>> Existing identity pool:', _identityPoolName);
        resolve();
      } else {
        console.log('>> Add identity pool:', _identityPoolName);

        let cognitoidentity = new AWS.CognitoIdentity();
        let params = {
          AllowUnauthenticatedIdentities: true,
          /* required */
          IdentityPoolName: _identityPoolName
          /* required */
        };
        cognitoidentity.createIdentityPool(params, function(err, data) {
          if (err) {
            reject(err);
          } else {
            console.log('Added identity pool id:', data.IdentityPoolId);
            _identityPoolId = data.IdentityPoolId;
            resolve();
          }
        });
      }
    });
  };

  // set identity pool roles
  function setIdentityPoolRoles() {
    return new Promise(function(resolve, reject) {
      console.log('>> Set identity pool roles');

      let cognitoidentity = new AWS.CognitoIdentity();
      let params = {
        IdentityPoolId: _identityPoolId,
        /* required */
        Roles: {
          /* required */
          authenticated: _arnAuthRole,
          unauthenticated: _arnUnauthRole
        }
      };
      cognitoidentity.setIdentityPoolRoles(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  // delete identity pool
  function deleteIdentityPoolId(identityPoolId) {
    return new Promise(function(resolve, reject) {
      if (identityPoolId === "") { // no identity pool id
        resolve();
      } else {
        console.log('>> Delete identity id:', identityPoolId);

        let cognitoidentity = new AWS.CognitoIdentity();
        let params = {
          IdentityPoolId: identityPoolId
          /* required */
        };
        cognitoidentity.deleteIdentityPool(params, function(err, data) {
          if (err) {
            reject(err);
          } else {
            console.log('>> Deleted identity pool id:', identityPoolId);
            resolve();
          }
        });
      }
    });
  };

  // get existing IAM role's ARN
  function getRoleArn(iamRoleName) {
    return new Promise(function(resolve, reject) {
      let iam = new AWS.IAM();
      let params = {
        RoleName: iamRoleName
        /* required */
      };
      iam.getRole(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data.Role.Arn);
        }
      });
    });
  };

  // add IAM role policy
  function attachIAMRolePolicy(iamRoleName, policyDocument) {
    return new Promise(function(resolve, reject) {
      console.log('>> Attach IAM role policy:', iamRoleName);

      let iam = new AWS.IAM();
      let params = {
        PolicyDocument: JSON.stringify(policyDocument),
        /* required */
        PolicyName: iamRoleName + '_policy',
        /* required */
        RoleName: iamRoleName
        /* required */
      };
      iam.putRolePolicy(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          console.log('>> Attached IAM role policy:\n', JSON.stringify(policyDocument));
          resolve();
        }
      });
    });
  };

  // add IAM role and return (fulfill) with ARN
  function addIAMRole(iamRoleName, assumeRolePolicyDocument, rolePolicy) {
    return new Promise(function(resolve, reject) {
      console.log('>> Add IAM role:', iamRoleName);

      let iam = new AWS.IAM();
      let params = {
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
        /* required */
        RoleName: iamRoleName
        /* required */
      };
      iam.createRole(params, function(err, data) {
        if (err) {
          if (err.code === "EntityAlreadyExists") { // ignore this error
            console.log('>> Existing IAM role:', iamRoleName);
            attachIAMRolePolicy(iamRoleName, rolePolicy)
              .then(function() {
                getRoleArn(iamRoleName)
                  .then(resolve)
                  .catch(reject);
              })
              .catch(reject);
          } else {
            reject(err); // an error occurred
          }
        } else {
          console.log('>> Added IAM role:', iamRoleName, '(', data.Role.Arn, ')');
          attachIAMRolePolicy(iamRoleName, rolePolicy)
            .then(function() {
              resolve(data.Role.Arn);

            })
            .catch(reject);
        }
      });
    });
  };

  // detach IAM role policy
  function detachIAMRolePolicy(iamRoleName) {
    return new Promise(function(resolve, reject) {
      console.log('>> Detach IAM role policy:', iamRoleName);

      let iam = new AWS.IAM();
      var params = {
        PolicyName: iamRoleName + '_policy',
        /* required */
        RoleName: iamRoleName
        /* required */
      };
      iam.deleteRolePolicy(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  // delete IAM role
  function deleteIAMRole(iamRoleName) {
    return new Promise(function(resolve, reject) {
      detachIAMRolePolicy(iamRoleName)
        .then(function() {
          console.log('>> Delete IAM role:', iamRoleName);

          let iam = new AWS.IAM();
          let params = {
            RoleName: iamRoleName
            /* required */
          };
          iam.deleteRole(params, function(err, data) {
            if (err) {
              if (err.code === "NoSuchEntity") // ignore this error
                resolve();
              else
                reject(err);
            } else {
              console.log('>> Deleted IAM role:', iamRoleName);
              resolve();
            }
          });
        })
        .catch(reject);
    });
  };

  this.deployIdentityPool = function() {
    return new Promise(function(resolve, reject) {
      console.log('>> Deploy identity pool:', _identityPoolName);

      lookupIdentityPoolId(_identityPoolName, "", "")
        .then(addIdentityPoolId)
        .then(deployIAMRole)
        .then(setIdentityPoolRoles)
        .then(resolve)
        .catch(reject);
    });
  };

  this.removeIdentityPool = function() {
    return new Promise(function(resolve, reject) {
      console.log('>> Delete identity pool:', _identityPoolName);

      lookupIdentityPoolId(_identityPoolName, "", "")
        .then(deleteIdentityPoolId)
        .then(removeIAMRole)
        .then(resolve)
        .catch(reject);
    });
  };

  function deployIAMRole() {
    return new Promise(function(resolve, reject) {
      let p1 = lookupRestApiId(_restapi, "", "");
      let p2 = lookupAccountId();

      Promise.all([p1, p2])
        .then(function() { // compose assume role policy document
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
                  "cognito-identity.amazonaws.com:aud": _identityPoolId
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
                  "cognito-identity.amazonaws.com:aud": _identityPoolId
                },
                "ForAnyValue:StringLike": {
                  "cognito-identity.amazonaws.com:amr": "unauthenticated"
                }
              }
            }]
          };
          let authRolePolicy = {
            "Version": "2012-10-17",
            "Statement": [{
              "Effect": "Allow",
              "Action": [
                "mobileanalytics:PutEvents",
                "cognito-sync:*",
                "cognito-identity:*"
              ],
              "Resource": [
                "*"
              ]
            }]
          };
          let unauthRolePolicy = {
            "Version": "2012-10-17",
            "Statement": [{
              "Effect": "Allow",
              "Action": [
                "execute-api:Invoke"
              ],
              "Resource": [
                "arn:aws:execute-api:" + _region + ":" + _accountId + ":" + _restApiId + "/" + _stage + "/*/*"
              ]
            }]
          };
          let p1 = addIAMRole(_authrole, authAssumeRolePolicyDoc, authRolePolicy);
          let p2 = addIAMRole(_unauthrole, unauthAssumeRolePolicyDoc, unauthRolePolicy);
          Promise.all([p1, p2])
            .then(function(arns) {
              _arnAuthRole = arns[0];
              _arnUnauthRole = arns[1];
              resolve();
            })
            .catch(reject);
        })
        .catch(reject);
    });
  };

  function removeIAMRole() {
    return new Promise(function(resolve, reject) {
      // compose IAM role name
      let p1 = deleteIAMRole(_authrole);
      let p2 = deleteIAMRole(_unauthrole);
      Promise.all([p1, p2])
        .then(resolve)
        .catch(reject);
    });
  };
};

program
  .version('0.0.1')
  .description('The script manages an unauthenticated identity pool and authorize to access one restapi endpoint')
  .option('--deploy', 'Deploy identity pool configurations to AWS')
  .option('--remove', 'Remove identity pool configurations form AWS')
  .option('--region <value>', 'A region to create identify pool', /^(us-east-1|us-west-1|us-west-2|eu-west-1|eu-central-1|ap-southeast-1|ap-southeast-2|ap-northeast-1|ap-northeast-2|sa-east-1)$/, '')
  .option('--profile <value>', 'A credentials profile name which is defined in ~/.aws/credentials')
  .option('--restapi <value>', 'A rest api name, which is allowed to be involked by unauthenticated identity pool')
  .option('--stage <value>', 'A stage name, which is allowed to be invoklked by unauthenticated identity pool')
  .option('--identitypool <value>', 'An identity pool name, only alphabets and spaces are allowed', /^([\w ]+)$/, '')
  .parse(process.argv);

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
if (typeof program.restapi === "undefined" || program.restapi === "") {
  console.error('>> no rest api name given!');
  program.help();
}
if (typeof program.stage === "undefined" || program.stage === "") {
  console.error('>> no stage name given!');
  program.help();
}

// init AWS.config
AWS.config.update({
  region: program.region,
  apiVersions: {
    iam: '2010-05-08',
    cognitoidentity: '2014-06-30',
    apigateway: '2015-07-09',
    sts: '2011-06-15'
  }
});

// init credential from profile
let credentials = new AWS.SharedIniFileCredentials({
  profile: program.profile
});
AWS.config.credentials = credentials;

if (program.deploy) {
  console.log('>> Deploy identity pool configurations to AWS');
  let obj = new IdentityPoolOP(program.identitypool, program.region, program.restapi, program.stage);
  obj.deployIdentityPool()
    .catch(function(e) {
      console.error(e);
    });
} else if (program.remove) {
  console.log('>> Remove identity pool configurations from AWS');
  let obj = new IdentityPoolOP(program.identitypool, program.region, program.restapi, program.stage);
  obj.removeIdentityPool()
    .catch(function(e) {
      console.error(e);
    });
} else {
  console.error('>> no deploy or remove given!');
  program.help();
}