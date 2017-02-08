/*
 Copyright 2016-2017 IBM All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

	  http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

'use strict';

var jsrsasign = require('jsrsasign');
var KEYUTIL = jsrsasign.KEYUTIL;

var FKVS = require('./FileKeyValueStore.js');
var utils = require('../utils');
var ECDSAKey = require('./ecdsa/key.js');

var logger = utils.getLogger('CryptoKeyStore.js');

var CryptoKeyStore = class extends FKVS {
	constructor(options) {
		return super(options);
	}

	getKey(ski) {
		var self = this;

		// first try the private key entry, since it encapsulates both
		// the private key and public key
		return this.getValue(_getKeyIndex(ski, true))
		.then((raw) => {
			if (raw !== null) {
				var privKey = KEYUTIL.getKeyFromPlainPrivatePKCS8PEM(raw);
				// TODO: for now assuming ECDSA keys only, need to add support for RSA keys
				return new ECDSAKey(privKey, privKey.ecparams.keylen);
			}

			// didn't find the private key entry matching the SKI
			// next try the public key entry
			return self.getValue(_getKeyIndex(ski, false));
		}).then((key) => {
			if (key instanceof ECDSAKey)
				return key;

			if (key !== null) {
				var pubKey = KEYUTIL.getKey(key);
				return new ECDSAKey(pubKey, pubKey.ecparams.keylen);
			}
		});
	}

	putKey(key) {
		var idx = _getKeyIndex(key.getSKI(), key.isPrivate());
		var pem = key.toBytes();
		return this.setValue(idx, pem)
		.then(() => {
			return key;
		});
	}
};

function _getKeyIndex(ski, isPrivateKey) {
	if (isPrivateKey)
		return ski + '-priv';
	else
		return ski + '-pub';
}

module.exports = CryptoKeyStore;