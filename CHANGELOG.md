# Changelog

### 0.0.10

### Bug Fixes
* Fixes incorrect encoded value for 'domain' attribute in proof.
* Update lacchain trust dependency to version 0.0.7 (fix revoke jwk case)

### 0.0.9

* Update verification Registry default contract address for OpenProtest network to '0x64CaA0fC7E0C1f051078da9525A31D00dB1F50eE' (since this considers isRevoked flag on queried for a digest issued by some entity)
### 0.0.8

* Update credential schema version to https://www.w3.org/ns/credentials/v2
* Add support for ecdsa-jcs-2019 cryptographic suite for verifiable credentials

### 0.0.7

* Add PoE for emitted credentials.
* Add configuration variable `PROOF_OF_EXISTENCE_MODE` to set PoE mode:
  * DISABLED: Proof of existence is disabled, in the respose the field TxHash is set to null
  * STRICT: Proof of existence must strictly succeed otherwise the request throws and in the respose the field TxHash is set to null, otherwise that field will have a valid transaction hash
  * ENABLED_NOT_THROWABLE: If Proof of existence fails the request does not throw but in the respose the field TxHash is set to null, otherwise that field will have a valid transaction hash
* Updates verification registry to '0xF17Da8641771c0196318515b662b0C00132C4163' which by default uses 
didRegistry: 0x43dE0954a2c83A415d82b9F31705B969b5856003
* Considers certificate period fields (if defined) as the verifiable credential issuance/expiration dates
* Add additional fields
* validates mandatory and optional DDCCCoreDataSet fields
* Downgrades ethers to version 5.6.5 since it was needed to use GasModel Library.

### 0.0.6

* add additional codes for "brand" field used to transform DDCCCoreDataSeet to Verifiable Credential.
## 0.0.5

* Added version information on start up.
* Added docker-compose with configuration pointing to the [latest lacpass-client docker image](https://hub.docker.com/r/eumb602/lacpass-client/tags)
* Updated open-protest RPC URL connection.

## 0.0.3

### Additions and Improvements
* Added support to transform a FHIR bundle resource to a verifiable credential according to: 
  * https://www.w3.org/2018/credentials/v1
  * https://w3id.org/vaccination/v1
  * https://credentials-library.lacchain.net/credentials/health/vaccination/v2
* Integrated with Secure Relay Service to transfer credentials to destination targets.

### Bug Fixes
* Fixes incorrect set of in memory public key for authentication.

### Available docker image

* [link](https://hub.docker.com/r/eumb602/lacpass-client/tags)


