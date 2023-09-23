export const VERIFICATION_REGISTRY_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'trustedForwarderAddress',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'didRegistry',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'InvalidShortString',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'str',
        type: 'string'
      }
    ],
    name: 'StringTooLong',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'by',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'didRegistry',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'status',
        type: 'bool'
      }
    ],
    name: 'DidRegistryChange',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [],
    name: 'EIP712DomainChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'by',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'status',
        type: 'bool'
      }
    ],
    name: 'NewDelegateTypeChange',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'by',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'iat',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      }
    ],
    name: 'NewIssuance',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'by',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isOnHold',
        type: 'bool'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'currentTime',
        type: 'uint256'
      }
    ],
    name: 'NewOnHoldChange',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'by',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'iat',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      }
    ],
    name: 'NewRevocation',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'by',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      }
    ],
    name: 'NewUpdate',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      }
    ],
    name: 'addDelegateType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'didRegistryAddress',
        type: 'address'
      }
    ],
    name: 'addDidRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'defaultDelegateType',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'defaultDidRegistry',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    name: 'didDelegateTypes',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    name: 'didRegistries',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      {
        internalType: 'bytes1',
        name: 'fields',
        type: 'bytes1'
      },
      {
        internalType: 'string',
        name: 'name',
        type: 'string'
      },
      {
        internalType: 'string',
        name: 'version',
        type: 'string'
      },
      {
        internalType: 'uint256',
        name: 'chainId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'verifyingContract',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'salt',
        type: 'bytes32'
      },
      {
        internalType: 'uint256[]',
        name: 'extensions',
        type: 'uint256[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'issuer',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      }
    ],
    name: 'getDetails',
    outputs: [
      {
        internalType: 'uint256',
        name: 'iat',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      },
      {
        internalType: 'bool',
        name: 'onHold',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      }
    ],
    name: 'getDidRegistry',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'issuer',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      }
    ],
    name: 'isValidCredential',
    outputs: [
      {
        internalType: 'bool',
        name: 'value',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      }
    ],
    name: 'isValidDelegateType',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      }
    ],
    name: 'issue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      }
    ],
    name: 'issueByDelegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'uint8',
        name: 'sigV',
        type: 'uint8'
      },
      {
        internalType: 'bytes32',
        name: 'sigR',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'sigS',
        type: 'bytes32'
      }
    ],
    name: 'issueByDelegateSigned',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'uint8',
        name: 'sigV',
        type: 'uint8'
      },
      {
        internalType: 'bytes32',
        name: 'sigR',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'sigS',
        type: 'bytes32'
      }
    ],
    name: 'issueByDelegateWithCustomDelegateTypeSigned',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      }
    ],
    name: 'issueByDelegateWithCustomType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'uint8',
        name: 'sigV',
        type: 'uint8'
      },
      {
        internalType: 'bytes32',
        name: 'sigR',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'sigS',
        type: 'bytes32'
      }
    ],
    name: 'issueSigned',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'bool',
        name: 'onHoldStatus',
        type: 'bool'
      }
    ],
    name: 'onHoldByDelegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'bool',
        name: 'onHoldStatus',
        type: 'bool'
      }
    ],
    name: 'onHoldByDelegateWithCustomType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bool',
        name: 'onHoldStatus',
        type: 'bool'
      }
    ],
    name: 'onHoldChange',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      }
    ],
    name: 'removeDelegateType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'removeDidRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      }
    ],
    name: 'revoke',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      }
    ],
    name: 'revokeByDelegate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'uint8',
        name: 'sigV',
        type: 'uint8'
      },
      {
        internalType: 'bytes32',
        name: 'sigR',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'sigS',
        type: 'bytes32'
      }
    ],
    name: 'revokeByDelegateSigned',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'uint8',
        name: 'sigV',
        type: 'uint8'
      },
      {
        internalType: 'bytes32',
        name: 'sigR',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'sigS',
        type: 'bytes32'
      }
    ],
    name: 'revokeByDelegateWithCustomDelegateTypeSigned',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'delegateType',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      }
    ],
    name: 'revokeByDelegateWithCustomType',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      },
      {
        internalType: 'uint8',
        name: 'sigV',
        type: 'uint8'
      },
      {
        internalType: 'bytes32',
        name: 'sigR',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'sigS',
        type: 'bytes32'
      }
    ],
    name: 'revokeSigned',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'digest',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'exp',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'identity',
        type: 'address'
      }
    ],
    name: 'update',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'version',
    outputs: [
      {
        internalType: 'uint16',
        name: '',
        type: 'uint16'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];
