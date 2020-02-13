'use strict';

const request = require('request');
const logger = require('./log');

module.exports.RestClient = function (options) {
  let instance = {};

  let OAuth, oauth, token;
  if(!options.useBasicAuth){
    OAuth = require('oauth-1.0a');
    oauth = OAuth({
      consumer: {
        public: options.consumerKey,
        secret: options.consumerSecret
      },
      signature_method: 'HMAC-SHA1'
    });
    token = {
      public: options.accessToken,
      secret: options.accessTokenSecret
    };
  }

  function apiCall(request_data, request_token = '') {
    logger.debug('Calling API endpoint: ' + request_data.method + ' ' + request_data.url + ' token: ' + request_token);
    const requestOptions = {
      url: request_data.url,
      method: request_data.method,
      headers: options.useBasicAuth ? { 'AuthType': 'Basic' } : request_token ? { 'Authorization': 'Bearer ' + request_token } : oauth.toHeader(oauth.authorize(request_data, token)),
      json: true,
      body: request_data.body,
    }
    logger.info(requestOptions);

    /* eslint no-undef: off*/
    return new Promise(function (resolve, reject) {
      request(requestOptions, function (error, response, body) {
        logger.debug('Response received')
        if (error) {
          logger.error('Error occured: ' + error);
          reject(error);
          return;
        } else if (!httpCallSucceeded(response)) {
          let errorMessage = ''

          if (body) {
            errorMessage = 'HTTP ERROR ' + body.code;
          } else {
            errorMessage = 'HTTP ERROR ' + response.code;
          }

          if (body && body.hasOwnProperty('result'))
            errorMessage = errorString(body.result, body.hasOwnProperty('parameters') ? body.parameters : {});

          logger.error('API call failed: ' + errorMessage);
          reject(errorMessage);
        }
        resolve(body);
      });
    });
  }

  instance.consumerToken = function (login_data) {
    return apiCall({
      url: createUrl('/integration/customer/token'),
      method: 'POST',
      body: login_data
    })
  }

  function httpCallSucceeded(response) {
    return response.statusCode >= 200 && response.statusCode < 300;
  }

  function errorString(message, parameters) {
    if (parameters === null) {
      return message;
    }
    let parameterPlaceholder
    if (parameters instanceof Array) {
      for (let i = 0; i < parameters.length; i++) {
        parameterPlaceholder = '%' + (i + 1).toString();
        message = message.replace(parameterPlaceholder, parameters[i]);
      }
    } else if (parameters instanceof Object) {
      for (let key in parameters) {
        parameterPlaceholder = '%' + key;
        message = message.replace(parameterPlaceholder, parameters[key]);
      }
    }

    return message;
  }

  instance.get = function (resourceUrl, request_token = '') {
    const request_data = {
      url: createUrl(resourceUrl),
      method: 'GET'
    };
    return apiCall(request_data, request_token);
  }

  function createUrl(resourceUrl) {
    return options.url + '/' + resourceUrl;
  }

  instance.post = function (resourceUrl, data, request_token = '') {
    const request_data = {
      url: createUrl(resourceUrl),
      method: 'POST',
      body: data
    };
    return apiCall(request_data, request_token);
  }

  instance.patch = function (resourceUrl, data, request_token = '') {
    const request_data = {
      url: createUrl(resourceUrl),
      method: 'PATCH',
      body: data
    };
    return apiCall(request_data, request_token);
  }

  instance.put = function (resourceUrl, data, request_token = '') {
    const request_data = {
      url: createUrl(resourceUrl),
      method: 'PUT',
      body: data
    };
    return apiCall(request_data, request_token);
  }

  instance.delete = function (resourceUrl, request_token = '') {
    const request_data = {
      url: createUrl(resourceUrl),
      method: 'DELETE'
    };
    return apiCall(request_data, request_token);
  }

  return instance;
}
