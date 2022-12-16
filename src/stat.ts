type Vector = Array<number>

// Random number generators.
const rand = () => Math.random()

function randn() {
  const [u, v] = [rand(), rand()]
  const r = Math.sqrt(-2 * Math.log(u))
  const theta = 2 * Math.PI * v
  return r * Math.cos(theta)
}

// Summary stats
function sum(x: Vector) {
  const n = x.length
  let s = 0
  x.forEach(xi => {
    s += xi
  })
  return s
}

const mean = (x: Vector) => sum(x) / x.length

function variance(x: Vector) {
  const m = mean(x)
  return mean(x.map(_ => (_ - m) ** 2))
}

const std = (x: Vector) => Math.sqrt(variance(x))

function linspace(start: number, stop: number, num: number,
                  endpoint: boolean = true) {
    const div = endpoint ? (num - 1) : num
    const step = (stop - start) / div
    return Array.from({length: num}, (_, i) => start + step * i)
}

// Distributions
abstract class Distribution<T> {
  abstract logpdf(x: T): number

  abstract sample(): T 

  run() {
    return this.sample()
  }

  pdf(x: T): number {
    return Math.exp(this.logpdf(x))
  }
}

class DistArray<T> extends Distribution<Array<T>> {
  array: Array<Distribution<T>>

  constructor(array: Array<Distribution<T>>) {
    super()
    this.array = array
  }

  logpdf(x: Array<T>) {
    let lp = 0
    x.forEach(
      (xi, i) => lp += this.array[i].logpdf(xi)
    )
    return lp
  }

  sample() {
    return this.array.map(d => d.sample())
  }
}

function DistFill<T>(dist: Distribution<T>, n: number) {
  return new DistArray(Array(n).fill(dist))
}

class Uniform extends Distribution<number> {
  lower: number
  upper: number

  constructor(lower: number, upper: number) {
    super()
    this.lower = lower
    this.upper = upper
  }

  logpdf(x: number) {
    return -Math.log(this.upper - this.lower)
  }

  sample() {
    const range = this.upper - this.lower
    return range * rand() + this.lower
  }
}

class Normal extends Distribution<number> {
  loc: number
  scale: number

  constructor(loc: number, scale: number) {
    super()
    this.loc = loc
    this.scale = scale
  }

  logpdf(x: number) {
    const z = (x - this.loc) / this.scale
    return -0.5 * (Math.log(2 * Math.PI * this.scale * this.scale) + z * z)
  }

  sample() {
    return randn() * this.scale + this.loc
  }
}

export {
  Distribution, Normal, Uniform, DistArray, DistFill,
  mean, sum, variance, linspace,
  rand, randn
}
