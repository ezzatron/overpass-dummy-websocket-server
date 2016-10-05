import Failure from '../failure'

export default class EchoService {
  constructor ({logger}) {
    this._logger = logger

    this.commands = {
      echo: this.echo.bind(this),
      fail: this.fail.bind(this),
      error: this.error.bind(this)
    }
  }

  async start () {
    this._logger.info('[echo] Service starting.')

    await new Promise((resolve, reject) => {
      setTimeout(resolve, 3000)
    })

    this._logger.info('[echo] Service started.')
  }

  async echo ({request}) {
    this._logger.info('[echo] Pausing for dramatic effect.')

    await new Promise((resolve, reject) => {
      setTimeout(resolve, 3000)
    })

    return {echo: request}
  }

  async fail ({request}) {
    throw new Failure({
      type: 'echo-failure',
      user: 'You done goofed.',
      real: 'Failure requested by client.',
      data: {request}
    })
  }

  async error ({request}) {
    throw new Error('You done goofed.')
  }
}
