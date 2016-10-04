import Problem from './problem'

export default class Server {
  constructor ({port, WsServer, services, logger}) {
    this.port = port
    this.WsServer = WsServer
    this.services = services
    this.logger = logger

    this.seq = 0
  }

  async start () {
    await Promise.all(this.services.map(service => service.start()))

    const server = new this.WsServer({port: this.port})
    this.logger.info('Listening on port %d.', this.port)
    server.on('connection', this.onConnection())
  }

  onConnection () {
    const server = this

    return connection => {
      const seq = server.seq++

      connection.once('message', server.onFirstMessage({connection, seq}))
      connection.once('close', server.onClose({seq}))

      server.logger.info('Connection %d opened.', seq)
    }
  }

  onFirstMessage ({connection, seq}) {
    const server = this

    return message => {
      server.logger.info('[recv] [%d] %s', seq, message)

      const handler = server.onMessage({connection, seq})

      connection.on('message', handler)
      connection.once(
        'close',
        () => connection.removeListener('message', handler)
      )

      server.logger.info('[send] [%d] OP0200', seq)
      connection.send('OP0200')
    }
  }

  onMessage ({connection, seq}) {
    const server = this

    return message => {
      server.logger.info('[recv] [%d] %d', seq, message)

      try {
        const request = JSON.parse(message)
        server.dispatch({connection, seq, request})
      } catch (e) {
        server.logger.error(
          '[%d] Invalid message encoding: %s',
          seq,
          e.message
        )
        connection.close()
      }
    }
  }

  async dispatch ({connection, seq, request}) {
    if (request.type !== 'command.request') return

    const command = this.findCommand({command: request.command})

    if (!command) return

    const respond = this.createRespond({connection, seq, request})

    try {
      const response = await command({respond, request: request.payload})
      if (response) respond(response)
    } catch (error) {
      let problem

      if (error instanceof Problem) {
        problem = error
      } else {
        problem = new Problem({
          user: 'A server error occurred.',
          real: error.message,
          data: {error}
        })
      }

      this.respondWithProblem({connection, seq, request, problem})
    }
  }

  findCommand ({command}) {
    for (let service in this.services) {
      if (!command.startsWith(service.prefix)) continue

      for (let serviceCommand in service.commands) {
        if (service.prefix + '.' + serviceCommand === command) {
          return service[command].bind(service)
        }
      }
    }
  }

  createRespond ({connection, seq, request}) {
    const server = this

    return payload => {
      const message = {
        type: 'command.response',
        session: request.session,
        seq: request.seq,
        payload: payload
      }
      const json = JSON.stringify(message)

      server.logger.info('[send] [%d] %s', seq, json)
      connection.send(json)
    }
  }

  respondWithProblem ({connection, seq, request, problem}) {
    this.logger.error('[%d] %s', seq, problem.real, problem.data)

    const message = {
      type: 'command.response',
      session: request.session,
      seq: request.seq,
      payload: problem.user,
      error: true
    }
    const json = JSON.stringify(message)

    this.logger.info('[send] [%d] %s', seq, json)
    connection.send(json)
  }

  onClose ({seq}) {
    const server = this

    return () => server.logger.info('Connection %d closed.', seq)
  }
}
