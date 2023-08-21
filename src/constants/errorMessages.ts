import {
  BadRequestError,
  HttpError,
  InternalServerError,
  UnauthorizedError
} from 'routing-controllers';

export enum ErrorsMessages {
  MISSING_PARAMS = 'Missing params on body',
  INVALID_CREDENTIALS = 'Invalid credentials',
  EMAIL_NOT_SENT = 'Error at sending email',
  REDIS_ERROR = 'Error in redis database',
  REDIS_ERROR_SET_TOKEN = "Error setting user's token in blacklist",
  UNKNOWN = 'Unknown error',
  BODY_ERRORS = "You have errors in your request's body." +
    "Check 'errors' field for more details.",
  PASSWORD_ERROR = 'Property password must be longer than or equal to 6 characters',
  // HTTP STANDARD MESSAGES
  INTERNAL_SERVER_ERROR = 'Internal Server Error',
  BAD_REQUEST_ERROR = 'Bad request error',
  USER_ALREADY_EXISTS = 'A user with this email is already registered',
  CREATE_DID_ERROR = 'An internal server error occurred while trying to create a new did',
  GET_DID_CONTROLLER_ERROR = 'Error while trying to get did controller',
  DECODE_DID_CONTROLLER_ERROR = 'Error while decoding did',
  ADD_ATTRIBUTE_ERROR = 'Error while associating attribute to did',
  MANAGER_CREATION_ERROR = 'Error while creating manager',
  MANAGER_GET_ERROR = 'Error while requesting manager details',
  RESOLVE_DID_ERROR = 'Unable to resolve did',
  // eslint-disable-next-line max-len
  CREATE_DID_JWT_ERROR = 'An internal server error occurred while trying to create a new did-jwt',
  INVALID_DID = 'Invalid did params',
  DIDCOMM_ENCRYPT = 'An error occurred while trying to encrypt with didcomm protocol',
  KEY_AGREEMENT_NOT_FOUND = 'Key agreement was not found',
  // eslint-disable-next-line max-len
  SECURE_RELAY_MESSAGE_DELIVERY_ERROR = 'An internal server error occurred while trying to send message through secure relay message deliverer',
  DDCC_DATA_ERROR = 'No ddcc data was found in the incoming request',
  VACCINATION_MISSING_ATTRIBUTE = 'No vaccination attribute was found',
  COUNTRY_MISSING_ATTRIBUTE = 'No country attribute was found',
  VACCINE_MISSING_ATTRIBUTE = 'No vaccine attribute was found',
  PLAIN_MESSAGE_SIGNING_ERROR = 'There was an error while trying to sign plain message',
  CANONICALIZE_ERROR = 'An error occurred while trying to canonicalize message',
  VM_NOT_FOUND = 'Verification method was not found'
}

export const Errors = {
  [ErrorsMessages.MISSING_PARAMS]: new BadRequestError(
    ErrorsMessages.MISSING_PARAMS
  ),
  [ErrorsMessages.INVALID_CREDENTIALS]: new UnauthorizedError(
    ErrorsMessages.INVALID_CREDENTIALS
  ),
  // Throw a BadGateway error
  [ErrorsMessages.EMAIL_NOT_SENT]: new HttpError(
    502,
    ErrorsMessages.EMAIL_NOT_SENT
  ),
  [ErrorsMessages.BAD_REQUEST_ERROR]: new InternalServerError(
    ErrorsMessages.BAD_REQUEST_ERROR
  )
};
