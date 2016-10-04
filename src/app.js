import * as logger from 'winston'
import {Server as WsServer} from 'ws'

import Server from './server'

if (!process.env.PORT) {
  throw new Error('PORT must be defined.')
}

const services = []
const server = new Server({services, WsServer, logger, port: process.env.PORT})

server.start()
