# LACPass Client component

## Summary  

The LACCPass Client component allows Ministries of Health to handle the onboarding, as well as the issuance and delivery of health certificates to patients.
This section describes the steps to run the LACPass Client component, and specifies how to use the endpoints.

### Requirements
- Make sure you have up and running and instance of the LACPass Client component available at https://github.com/lacchain/IPS-national-backend
- Access to the client-helper executable script available at https://github.com/lacchain/IPS-national-backend#lacchain-setup-and-onboard-helper
- Internet access

### Verify Service availability
1. Running the lacpass-lacchain component from IPS-national-backend will expose the service at port 3010
2. Verify the lacpass-lacchain component is running either checking the logs or just performing a telnet command in a bash shell: 

![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/telnet3010.png)

### Running Setup/Onboard steps

It is time to run the CLI (Client helper executable script) to setup your DID and set some keys.
1. Make sure you have verified the service availability as described in the previous section
2. Before running the CLI make sure to execute this in a linux bash terminal:


`$ ./client-helper.sh`


3. Now enter the URL of the lacpass-lacchain verified in the previous section as shown in the following prompt


![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/apiURL.png)

4. The following menu is presented:


![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/CLIMainMenu.png)

5. If you don't have a PKI or don't have any signing key to attest health certificates then you can create a Self-Signed Certificate (SSC). If this is the case, type 'SSC' and enter the required information.
- The end of this process will create a subdirectory named `/certs` inside the directory you are running the script:


![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/certsDir.png)

* NOTE: DSC.key will be the private key used to sign Health Certificates. For that:

   You can copy the DSC.key into the directory cert-data located in the root directory of your IPS-national-backend repository.
   Rename the new copy of DSC.crt to priv.pem

6. Next, create a decentralized identifier [DID](https://w3c.github.io/did-core), type "CD" in the CLI main menu, and a DID will be created, for instance:
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/didtxtfile.png)

   * Just as a reference, the created DID (Decentralized Identifier) will be saved in a file named "did.txt" 

7. Now it is the time to associate the DID you just created with the X.509 certificate, that you can use to sign Health Certificates. Type "AX" in the CLI main menu.
* Enter the path where the X.509 public key is located, for example if you run step 5, then the path will be:
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/X509path.png)

* After pressing enter you should get the following successful message:
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/didx509association.png)

8. Create a manager. Type "CM" in the CLI main menu.
*  Enter the number of days to consider the manager to be created as valid, for example: 1000; as shown in the following figure. Suggested: do not enter a number less than 365 days.
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/creatingManager.png)
* A successful response will be something like:  
* Type 'exit' to end the setup process:

After having run the previous steps, you will have the following information inside the directory /lacchain-setup-helper:
* A did.txt file which contains the DID for your organization. Keep it in a place you can always access it.
* The /certs directory, containing the SCA and DSC subdirectories.

### Sharing onboarding material 

Now you are ready to share onboarding information with the committee. 

1. Start the CLI again
2. In options choose "GCM" (Get Current Manager) to get the entity and manager details
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/GCM.png)
a. copy the content in a text file, give it a nmae like "Entity-manager_Details.txt"

3. Pack the following information in a zip file:

a. Entity-Manager-Details.txt you just got in the previous step
b. The SCA.crt file, located inside the directory /lacchain-setup-helper/certs/SCA/SCA.crt
c. Identifying information
	i. Legal Name
	ii. FHIR-URL
	iii. Country/Country Code

4. Send the information via email to epacheco@iadb.org and antoniole@iadb.org

### Sending Certificates wrapped as Verifiable Credentials

In this section you will learn how to use the send verifiable credentials endpoint exposed by the lacpass-lacchain component. If you successfully followed the previous steps, you are ready to send health certificates to your users. 

As explained in “Verify Service availability” lacpass-lacchain runs on port 3010 by default. To send DDCCCoreDataSet health certificates you can use the postman tool:

* Method: POST
* http://localhost:3010/api/v1/verifiable-credential/ddcc/send (update the host properly in case you are not accessing via localhost)
* The required payload to send has the following structure:
	{ 
	 "bundle":
			{
			 "entry": 
			  ["string"]		
			},
	 "issuerDid": "string",
	 "receiverDid": "string"
	}

Where:
* bundle: FHIR bundle, just copy and paste the full FHIR bundle
* IssuerDid: Issuer DID, this is the decentralized identifier you created in the section Running Setup/Onboard steps in step 6 and that is available in the lacchain-setup-helper/did.txt file
* receiverDid: This is the Receiver DID (the patient/individual receiving the certificate) will share with you to receive the issued credential in their wallet. Patients/individuals can easily get their unique identifier (DID) after setting up the wallet available at https://lacpass-openprotest-wallet.lacchain.net/

NOTE: A full example with the required payload is available at https://github.com/lacchain/LACPass-client/blob/master/docs/Credential-Sending.md

### LACPass Verifier

LACPass Verifier is the last component used to verify DDCC-compliant health certificates. This component is made up of two subcomponents:

1. LACPass-front-verifier: This is a full front-end component that needs to be connected to LACPass-trusted-List to check the validity of health certificates. The repository is available at https://github.com/lacchain/LACPass-front-verifier
2. LACPass-trusted-list: This is the backend API component which cryptographically verifies certificate issuers and decodes data returning it alongside the certificate health validity. Access to this repository is available at https://github.com/lacchain/LACPass-trusted-list

NOTE: A fully runnning instance of LACPass Verifier can be found at https://lacpass.lacchain.net/


## Getting Started

- [Configuration Guide](docs/tech/configuration.md)
- [API Usage](docs/API-Guide.md)

## Changelog
- [Changelog](./CHANGELOG.md)

