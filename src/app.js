import * as CBOR from 'cbor-js'
import * as winston from 'winston'
import {Server as WsServer} from 'ws'

import EchoService from './service/echo'
import OverpassCborSerialization from './serialization/cbor'
import OverpassJsonSerialization from './serialization/json'
import OverpassMessageMarshaller from './serialization/marshaller'
import OverpassMessageSerialization from './serialization/message'
import OverpassMessageUnmarshaller from './serialization/unmarshaller'
import Server from './server'

if (!process.env.PORT) {
  throw new Error('PORT must be defined.')
}

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      formatter: options => {
        let meta

        if (options.meta && Object.keys(options.meta).length) {
          meta = ' ' + JSON.stringify(options.meta)
        } else {
          meta = ''
        }

        const time = new Date()

        return time.toISOString() +
          ' [' + options.level.substring(0, 4) + '] ' +
          options.message + meta
      }
    })
  ]
})

const cborSerialization = new OverpassCborSerialization({CBOR})
const jsonSerialization = new OverpassJsonSerialization()

const cborMessageSerialization = new OverpassMessageSerialization({
  mimeType: 'application/cbor',
  marshaller: new OverpassMessageMarshaller({serialization: cborSerialization}),
  unmarshaller: new OverpassMessageUnmarshaller({
    serialization: cborSerialization
  })
})
const jsonMessageSerialization = new OverpassMessageSerialization({
  mimeType: 'application/json',
  marshaller: new OverpassMessageMarshaller({serialization: jsonSerialization}),
  unmarshaller: new OverpassMessageUnmarshaller({
    serialization: jsonSerialization
  })
})

const serializations = {
  'application/cbor': cborMessageSerialization,
  'application/json': jsonMessageSerialization
}

const services = {
  'echo.1': new EchoService({logger})
}

const server = new Server({
  serializations,
  services,
  WsServer,
  logger,
  port: process.env.PORT
})

server.start()
