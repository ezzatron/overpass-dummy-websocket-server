import {
  COMMAND_RESPONSE_SUCCESS,
  COMMAND_RESPONSE_FAILURE,
  COMMAND_RESPONSE_ERROR
} from '../constants'

export default class OverpassMessageMarshaller {
  constructor ({serialization}) {
    this._serialization = serialization
  }

  marshal (message) {
    const header = this._serialization.serialize(this._header(message))
    let payload

    if (message.payload) {
      payload = this._serialization.serialize(message.payload)
    }

    return [header, payload]
  }

  _header (message) {
    const header = [message.type, message.session]

    switch (message.type) {
      case COMMAND_RESPONSE_SUCCESS:
      case COMMAND_RESPONSE_FAILURE:
      case COMMAND_RESPONSE_ERROR:
        return this._commandResponseHeader(message, header)
    }

    throw new Error(
      'Unsupported message type: ' + message.type + '.'
    )
  }

  _commandResponseHeader (message, header) {
    header.push(message.seq)

    return header
  }
}
