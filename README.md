# LACPass Client

## Getting Started

- [Configuration Guide](docs/tech/configuration.md)
- [API Usage](docs/API-Guide.md)

## LACPass Client component 

### Summary
The LACCPass Client component allows Ministries of Health to handle the onboarding, as well as the issuance and delivery of health certificates to patients.
This section contains the steps to run the LACPass Client component, and specifies how to use the endpoints.

### Requirements
- Make sure you have up and running and instance of the LACPass Client component available at https://github.com/lacchain/IPS-national-backend
- Access to the client-helper executable script available at https://github.com/lacchain/IPS-national-backend#lacchain-setup-and-onboard-helper

### Verify Service availability
1. Running the lacpass-lacchain component from IPS-national-backend will expose the service at port 3010
2. Verify the lacpass-lacchain component is running either checking the logs or just performing a telnet command in a bash shell: 

![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/telnet3010.png)

### Running Setup/Onboard steps

It is time to run the CLI (Client helper executable script) to setup your DID and set some keys.
1. Make sure you have verified the service availability as described in the previous section
2. Before running the CLI make sure to execute this in a linux bash terminal: ./client-helper.sh
3. Now enter the URL of the lacpass-lacchain verified in the previous section
4. The following menu is presented:
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/CLIMainMenu.png)

5. If you don't have a PKI or don't have any signing key to attest health certificates then you can create a Self-Signed Certificate "SSC". Type that if needed and enter the required information.
- The end of this process will create a directory named "cert" inside the directory you are running the script:

* NOTE: DSC.key will be the private key used to sign Health Certificates. For that:
* You can copy the DSC.key into the directory cert-data located in the root directory of your IPS-national-backend repository.

6. Next, create a DID, type "CD" in the CLI main menu, and a DID will be created, for instance:
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/didtxtfile.png)

Just as a reference, the created DID (Decentralized Identifier) will be saved in a file named "did.txt" 

7. Now it is the time to associate the DID you just created with the X.509 certificate, that you can use to sign Health Certificates. Type "AX" in the CLI main menu.
* Enter the path where the X.509 public key is located, for example if you run step 5, then the path will be:
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/X509path.png)

* After pressing enter you should get the following successful message:
![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/didx509association.png)

8. Create a manager. Type "CM" in the CLI main menu.
*  Enter the number of days to consider the manager to be created as valid, for example: 1000; as shown in the following figure. Suggested: do not enter a number less than 365 days.

![](https://github.com/lacchain/LACPass-client/blob/master/docs/examples/creatingManager.png)



## Changelog
- [Changelog](./CHANGELOG.md)

