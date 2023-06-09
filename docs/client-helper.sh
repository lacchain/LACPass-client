# !/bin/bash
######################### DID ##########################
function createDid() {
    create_did_url="$api_url"/api/v1/did/lac1
    r=$(curl -s -X 'POST' \
        ${create_did_url} \
        -H 'accept: application/json' \
        -d '')

    did=$(echo $r | sed 's/^{"did":"//' | sed 's/"}$//')
    if [[ $did == *"did:"* ]]; then
        echo "Saving did to did.txt file"
        echo $did >did.txt
        echo "Did was created: $did"
    else
        echo "there was an error creating the did, please check your service"
    fi
}

function createDidAndSaveToFile() {
    echo
    echo "*********Starting DID creation process**********"
    echo
    if [ -f "did.txt" ]; then
        echo "A did.txt file already exists, do you want to overwrite it? (y/n)"
        echo
        read isToBeOverridden
        echo
        if [[ ("$isToBeOverridden" != "y") && ("$isToBeOverridden" != "yes") && ("$isToBeOverridden" != "Y") && ("$isToBeOverridden" != "YES") ]]; then
            echo "cancelling operation, bye ..."
            sleep 2
        else
            echo overriding did.txt with new content
            createDid
        fi
    else
        createDid
    fi
    echo
}

############ Signing Certs ###########
function addX509Certificate() {
    echo
    echo "*********Starting X509/DID association process**********"
    echo
    echo "Please enter the path to the x509 Signing Certificate, must be something like: ../certs/DSC/DSC.crt " #todo save path to consume later
    echo
    read path_to_crt
    echo
    if [ -f $path_to_crt ]; then
        echo "File found, stating the process ..."
        if [ -f "did.txt" ]; then
            did=$(cat did.txt | sed 's/^{"did":"//' | sed 's/"}$//')
            echo Associating $did to certificate file
            # process
            add_pem_certificate_url="$api_url"/api/v1/did/lac1/attribute/add/jwk-from-x509certificate
            relation=asse
            data="{\"did\":\"$did\", \"relation\":\"$relation\"}"
            curl -X POST ${add_pem_certificate_url} -H "accept: application/json" -F x509Cert=@$path_to_crt -F data="$data"
            echo
        else
            echo "Could not find any did at ./did.txt ..."
            echo You many need to create a did
            echo If you have the did.txt file in another location just bring it to this location.
        fi
    else
        echo "No file was found at the specified path ... exiting"
    fi
    echo
}

function revokex59Certificate() {
    echo
    echo "*********Starting X509/DID disassociation process**********"
    echo
    echo "Please enter the path to the x509 Signing Certificate, must be something like: ../certs/DSC/DSC.crt"
    echo
    read path_to_crt
    echo
    if [ -f $path_to_crt ]; then
        echo "File found, stating the process ..."
        if [ -f "did.txt" ]; then
            did=$(cat did.txt | sed 's/^{"did":"//' | sed 's/"}$//')
            echo found did is $did ...

            compromised=false
            echo "Enter backward revocation days, must be a zero or positive number"
            echo
            read backwardRevocationDays
            echo
            echo Starting disassociation process ...
            # process
            disassociate_pem_certificate_url="$api_url"/api/v1/did/lac1/attribute/revoke/jwk-from-x509certificate
            relation=asse
            data='{"did":'"\"$did\""', "relation":'"\"$relation\""', "compromised":'$compromised', "backwardRevocationDays":'$backwardRevocationDays'}'
            curl -X 'DELETE' ${disassociate_pem_certificate_url} -H 'accept: application/json' -F x509Cert=@$path_to_crt -F data="$data"
            echo
        else
            echo "Could not find any did at ./did.txt ..."
            echo You many need to create a did
            echo If you have the did.txt file in another location just bring it to this location.
        fi
    else
        echo "No file was found at the specified path ... exiting"
    fi
    echo
}

######################### CHAIN OF TRUST ##########################

function createManager() {
    echo
    echo "*********Starting Manager creation process**********"
    echo
    manager_url="$api_url"/api/v1/manager
    if [ -f "did.txt" ]; then
        did=$(cat did.txt | sed 's/^{"did":"//' | sed 's/"}$//')

        echo Creating new manager and associatig to did $did

        echo "Please enter the amount of days in which the manager will be considered valid"
        echo
        read validDays
        echo
        #validDays=100 # Number of days in which the manager to be created will be considered valid
        add_manager_url=$manager_url
        curl -X 'POST' \
            ${add_manager_url} \
            -H 'accept: application/json' \
            -H 'Content-Type: application/json' \
            -d '{
        "did": '\"$did\"',
        "validDays": '$validDays'
        }'

        echo
    else
        echo "Could not find any did at ./did.txt ..."
        echo You many need to create a did
        echo If you have the did.txt file in another location just bring it to this location.
    fi
}

function getManager() {
    echo
    echo "*********Getting Manager **********"
    echo
    manager_url="$api_url"/api/v1/manager
    if [ -f "did.txt" ]; then
        did=$(cat did.txt | sed 's/^{"did":"//' | sed 's/"}$//')

        echo Getting current manager associated to did $did
        echo

        get_manager_url="$manager_url"/"$did"
        curl -X 'GET' \
            $get_manager_url \
            -H 'accept: application/json'

        echo
    else
        echo "Could not find any did at ./did.txt ..."
        echo You many need to create a did
        echo If you have the did.txt file in another location just bring it to this location.
    fi
}

############## CLI ##########

function actions() {
    echo ACTIONS
    echo type "CD" to create a new did
    echo type "AX" to associate a did to an x509 certificate
    echo type "DX" to disassociate a did from an x509 certificate
    echo type "CM" to create a new chain of trust manager
    echo type "GCM" to get the curent manager
    echo
    read action
    echo
    case "${action}" in
    "CD")
        createDidAndSaveToFile
        ;;
    "AX")
        addX509Certificate
        ;;
    "DX")
        revokex59Certificate
        ;;
    "CM")
        createManager
        ;;
    "GCM")
        getManager
        ;;
    esac
}

echo
echo "*************************************************************************"
echo "****************** Wecome to the LACPass-Client Helper ******************"
echo "*************************************************************************"
echo
echo "Please enter the API URL to connect to, make sure it is something like http://localhost:3010"
echo
read api_url
echo
if [[ $api_url == *"http"* ]]; then
    actions
else
    echo "Please check the api_url, that must be in the format, something like http://localhost:3010 but found ${api_url}"
fi
