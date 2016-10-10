import Failure from './failure'

export default class Server {
  constructor ({port, WsServer, services, logger}) {
    this._port = port
    this._WsServer = WsServer
    this._services = services
    this._logger = logger

    this._socketSeq = 0
  }

  async start () {
    const serviceStarts = []

    for (let namespace in this._services) {
      const service = this._services[namespace]

      if (!service.start) continue

      this._logger.info('Waiting for service %s to start.', namespace)
      serviceStarts.push(service.start())
    }

    await Promise.all(serviceStarts)

    const server = new this._WsServer({host: '0.0.0.0', port: this._port})
    this._logger.info('Listening on port %d.', this._port)
    server.on('connection', this._onConnection())
  }

  _onConnection () {
    return socket => {
      const seq = this._socketSeq++

      socket.once('message', this._onFirstMessage({socket, seq}))
      socket.once('close', this._onClose({seq}))

      this._logger.info('[%d] Socket opened.', seq)
    }
  }

  _onFirstMessage ({socket, seq}) {
    return message => {
      this._logger.info('[%d] [hand] [recv] %s', seq, message)

      const handler = this._onMessage({socket, seq})

      socket.on('message', handler)
      socket.once(
        'close',
        () => socket.removeListener('message', handler)
      )

      this._logger.info('[%d] [hand] [send] OP0200', seq)
      socket.send('OP0200')
    }
  }

  _onMessage ({socket, seq}) {
    return message => {
      try {
        const request = JSON.parse(message)

        if (request.seq) {
          this._logger.info(
            '[%d] [%d] [%d] [recv] %s',
            seq,
            request.session,
            request.seq,
            message
          )
        } else {
          this._logger.info(
            '[%d] [%d] [recv] %s',
            seq,
            request.session,
            message
          )
        }

        this._dispatch({socket, seq, request})
      } catch (e) {
        this._logger.info('[%d] [recv] %s', seq, message)
        this._logger.error(
          '[%d] [err] Invalid message encoding: %s',
          seq,
          e.message
        )
        socket.close()
      }
    }
  }

  async _dispatch ({socket, seq, request}) {
    if (request.type !== 'command.request') return

    const service = this._services[request.namespace]

    if (!service) return // imitates Overpass limitation

    const command = service.commands[request.command]

    if (!command) {
      this._respondWithError({
        socket,
        seq,
        request,
        error: new Error(
          "Undefined command '" + request.command +
          "' in namespace '" + request.namespace + "'."
        )
      })

      return
    }

    const respond = this._createRespond({socket, seq, request})
    const isResponseRequired = !!request.seq

    try {
      const response =
        await command({respond, isResponseRequired, request: request.payload})

      if (response) respond(response)
    } catch (error) {
      if (error instanceof Failure) {
        this._respondWithFailure({socket, seq, request, failure: error})
      } else {
        this._respondWithError({socket, seq, request, error})
      }
    }
  }

  _createRespond ({socket, seq, request}) {
    if (!request.seq) {
      return payload => {
        return this._logger.info(
          '[%d] [%d] [succ] [unsent]',
          seq,
          request.session,
          payload
        )
      }
    }

    return payload => {
      this._logger.info(
        '[%d] [%d] [%d] [succ]',
        seq,
        request.session,
        request.seq,
        payload
      )

      this._send({
        socket,
        seq,
        request,
        message: {
          type: 'command.response',
          responseType: 'success',
          session: request.session,
          seq: request.seq,
          payload: payload
        }
      })
    }
  }

  _respondWithFailure ({socket, seq, request, failure}) {
    if (!request.seq) {
      return this._logger.info(
        '[%d] [%d] [fail] [unsent] [%s] %s',
        seq,
        request.session,
        failure.type,
        failure.real.message,
        failure.real.data
      )
    }

    this._logger.info(
      '[%d] [%d] [%d] [fail] [%s] %s',
      seq,
      request.session,
      request.seq,
      failure.type,
      failure.real.message,
      failure.real.data
    )

    this._send({
      socket,
      seq,
      request,
      message: {
        type: 'command.response',
        responseType: 'failure',
        session: request.session,
        seq: request.seq,
        payload: {
          type: failure.type,
          message: failure.user.message,
          data: failure.user.data
        }
      }
    })
  }

  _respondWithError ({socket, seq, request, error}) {
    if (!request.seq) {
      return this._logger.error(
        '[%d] [%d] [erro] [unsent] %s',
        seq,
        request.session,
        error.message
      )
    }

    this._logger.error(
      '[%d] [%d] [%d] [erro] %s',
      seq,
      request.session,
      request.seq,
      error.message
    )

    this._send({
      socket,
      seq,
      request,
      message: {
        type: 'command.response',
        responseType: 'error',
        session: request.session,
        seq: request.seq
      }
    })
  }

  _send ({socket, seq, request, message}) {
    const data = JSON.stringify(message)

    this._logger.debug(
      '[%d] [%d] [%d] [send] %s',
      seq,
      request.session,
      request.seq,
      data
    )
    socket.send(data)
  }

  _onClose ({seq}) {
    return () => this._logger.info('[%d] Socket closed.', seq)
  }
}
