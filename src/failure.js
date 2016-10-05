export default class Failure extends Error {
  constructor ({type, user, userData, real, data}) {
    super(user)

    this.type = type
    this.user = user
    this.userData = userData
    this.real = real
    this.data = data
  }
}
