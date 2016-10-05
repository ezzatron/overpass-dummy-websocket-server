import * as winston from 'winston'
import {Server as WsServer} from 'ws'

import EchoService from './service/echo'
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
const services = {
  'echo.1': new EchoService({logger})
}
const server = new Server({services, WsServer, logger, port: process.env.PORT})

server.start()
