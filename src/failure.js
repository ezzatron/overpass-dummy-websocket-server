export default class Failure extends Error {
  constructor ({type, user, real, data}) {
    super(user)

    this.type = type
    this.user = user
    this.real = real
    this.data = data
  }
}
