# Credential Sending

1. Set API url to interact with

```sh
api_url=http://localhost:3010 # Set LACPass API url
```

2. Send DDCC data through to patient wallet

```sh
## input variables
path_to_qr=../qr-code-examples/qr-example-1 # you should point to the public pem certificate that represents the signing certificate used to sign 
issuer_did="did:lac1:1iT4kYaSKhpM7BFB75ZxYF7V3uTRAeWfPvwhFZXJQj8WrJakCczSatqNVvKZTnsD3uMz"
receiver_did="did:lac1:1iT5hMy9wbHfnd7C7QJCsQEiF7PusFngyCu2YqgLmCNJPQX77Z8WaXG6cwQtC4czY74w" #TODO: use

## TODO: add additional fields

# process
send_ddcc_vc_url="$api_url"/api/v1/verifiable-credential/ddcc/send
data='{"issuerDid":'\"$issuer_did\"', "receiverDid":'\"$receiver_did\"'}'
curl -X 'POST' ${send_ddcc_vc_url} -H 'accept: application/json' -F qrCode=@$path_to_qr -F data="$data"
```
