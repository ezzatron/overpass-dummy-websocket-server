export default class EchoService {
  constructor ({logger}) {
    this._logger = logger

    this.commands = {echo: this.echo.bind(this)}
  }

  async start () {
    this._logger.info('[echo] Service starting.')

    await new Promise((resolve, reject) => {
      setTimeout(resolve, 3000)
    })

    this._logger.info('[echo] Service started.')
  }

  async echo ({request, respond}) {
    this._logger.info('[echo] Pausing for dramatic effect.')

    await new Promise((resolve, reject) => {
      setTimeout(resolve, 3000)
    })

    return {echo: request}
  }
}
