const rand = () => Math.random()

function randn() {
  const [u, v] = [rand(), rand()]
  const r = Math.sqrt(-2 * Math.log(u))
  const theta = 2 * Math.PI * v
  return r * Math.cos(theta)
}

class Distribution {
  constructor() {}

  logpdf(x) {}
  sample() {}

  run() {
    return this.sample()
  }

  pdf(x) {
    return Math.exp(this.logpdf(x))
  }
}

function DistFill(dist, n) {
  return new DistArray(Array(n).fill(dist))
}

class DistArray extends Distribution {
  constructor(array) {
    super()
    this.array = array
  }

  logpdf(x) {
    let lp = 0
    for (var i = 0; i < x.length; i++) {
      lp += this.array[i].logpdf(x[i])
    }
    return lp
  }

  sample() {
    return this.array.map(a => a.sample())
  }
}

class Uniform extends Distribution {
  constructor(lower, upper) {
    super()
    this.lower = lower
    this.upper = upper
  }

  logpdf(x) {
    if (x < this.lower || x > this.upper) {
      return -Infinity
    } else {
      return -Math.log(this.upper - this.lower)
    }
  }

  sample() {
    const range = this.upper - this.lower
    return Math.random() * range + this.lower
  }
}

class Normal extends Distribution {
  constructor(loc, scale) {
    super()
    this.loc = loc
    this.scale = scale
  }

  logpdf(x) {
    const z = (x - this.loc) / this.scale
    return -0.5 * (Math.log(2 * Math.PI * this.scale * this.scale) + z * z)
  }

  sample() {
    return randn() * this.scale + this.loc
  }
}

function sum(x) {
  const n = x.length
  let s = 0
  for (xi of x) s += xi
  return s
}

const mean = x => sum(x) / x.length

function variance(x) {
  const m = mean(x)
  return mean(x.map(_ => (_ - m) ** 2))
}

const std = x => Math.sqrt(variance(x))

function linspace(startValue, stopValue, cardinality) {
  var arr = [];
  var step = (stopValue - startValue) / (cardinality - 1);
  for (var i = 0; i < cardinality; i++) {
    arr.push(startValue + (step * i));
  }
  return arr;
}
module.exports = {
  Normal, Uniform, DistArray, DistFill,
  mean, sum, variance, linspace,
  rand, randn
}
