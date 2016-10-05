import Failure from '../failure'

export default class EchoService {
  constructor ({logger}) {
    this._logger = logger

    this.commands = {
      success: this.success.bind(this),
      fail: this.fail.bind(this),
      error: this.error.bind(this),
      timeout: this.timeout.bind(this)
    }
  }

  success ({request}) {
    return {echo: request}
  }

  fail ({request}) {
    throw new Failure({
      type: 'echo-failure',
      user: 'You done goofed.',
      real: 'Failure requested by client.',
      data: {request}
    })
  }

  error ({request}) {
    throw new Error('You done goofed.')
  }

  timeout ({request}) {
    return
  }
}
