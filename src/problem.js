export default class Problem extends Error {
  constructor ({user, real, data}) {
    super(user)

    this.user = user
    this.real = real
    this.data = data
  }
}
