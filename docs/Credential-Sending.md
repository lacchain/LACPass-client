# Credential Sending

1. Set API url to interact with

```sh
api_url=http://localhost:3010 # Set LACPass API url
```

2. Send DDCC data to patient wallet

```sh
curl -X 'POST' \
  'http://localhost:3010/api/v1/verifiable-credential/ddcc/send' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "bundle": {
  "resourceType": "Bundle",
  "id": "4ca19732-837a-48a3-8059-f98acee1ed73",
  "meta": {
    "versionId": "2",
    "lastUpdated": "2023-08-21T19:28:47.673+00:00",
    "source": "#0QGP9sLFOsQcEoOG"
  },
  "identifier": {
    "system": "http://worldhealthorgnaization.github.io/ddcc/Document",
    "value": "5ca19732-837a-48a3-8059-f98bcee1ed73"
  },
  "type": "document",
  "timestamp": "2023-08-21T19:28:45.964Z",
  "link": [
    {
      "relation": "publication",
      "url": "urn:HCID:6624"
    }
  ],
  "entry": [
    {
      "fullUrl": "urn:uuid:351be87f-e802-4b94-8cfd-46e81aa2cd5b",
      "resource": {
        "resourceType": "DocumentReference",
        "meta": {
          "profile": [
            "http://worldhealthorganization.github.io/ddcc/StructureDefinition/DDCCDocumentReferenceQR"
          ]
        },
        "status": "current",
        "type": {
          "coding": [
            {
              "system": "http://worldhealthorganization.github.io/ddcc/CodeSystem/DDCC-QR-Type-CodeSystem",
              "code": "who",
              "display": "WHO DDCC"
            }
          ]
        },
        "subject": {
          "reference": "urn:uuid:28a20344-6f4c-4cc3-adfa-2fdfb59cdeff"
        },
        "authenticator": {
          "reference": "urn:uuid:56e370bb-9f09-345c-b0a5-3c76422a1491"
        },
        "description": "WHO QR code for COVID 19 Vaccine Certificate",
        "content": [
          {
            "attachment": {
              "contentType": "application/json",
              "data": "ewogICAgICAicmVzb3VyY2VUe...yIsCiAgICAgICJzZXgiIDogIm1hbGUiCiAgICB9Cg=="
            },
            "format": {
              "system": "http://worldhealthorganization.github.io/ddcc/CodeSystem/DDCC-QR-Format-CodeSystem",
              "code": "serialized"
            }
          },
          {
            "attachment": {
              "contentType": "image/png",
              "data": "iVBORw0KUV...ORK5CYII="
            },
            "format": {
              "system": "http://worldhealthorganization.github.io/ddcc/CodeSystem/DDCC-QR-Format-CodeSystem",
              "code": "image"
            }
          },
          {
            "attachment": {
              "contentType": "application/pdf",
              "data": "JVBERi0xLjcW5kc3RyZWFtCmVuZG9iagoKOCAwIG9i...HN0cmVhbQplbmRvYmoKCnN0YXJ0eHJlZgoyNDMxOAolJUVPRg=="
            },
            "format": {
              "system": "http://worldhealthorganization.github.io/ddcc/CodeSystem/DDCC-QR-Format-CodeSystem",
              "code": "pdf"
            }
          }
        ]
      }
    }
  ],
  "signature": {
    "type": [
      {
        "system": "urn:iso-astm:E1762-95:2013",
        "code": "1.2.840.10065.1.12.1.5"
      }
    ],
    "when": "2023-08-22T19:38:45.964Z",
    "who": {
      "identifier": {
        "value": "Some Identifier"
      }
    },
    "data": "prOxII3XzrdsOihKp...AN+wAV6m5RxmTdGfUJQkmdXXrVKEw7xl/Q+E+nLcO6NcAKuD+QhGPc0w=="
  }
},
  "issuerDid": "did:lac1:1iT5NSDvBrkYQ9oDtGAdeyYjwDDJLGKbEY4RGzG253RpyEMjiEURhgRTw96qnTfcqNpa",
  "receiverDid": "did:lac1:1iT5QTdhkxWeZALaQMMhwsDzYZmbmE2dD3UZZ1LtdY7BzH6vZEta3AzsJD7RoRjaRkrB"
}'
```

