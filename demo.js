const stat = require("./src/stat.js")
const ppl = require("./src/core.js")

console.log("Hi")
console.log(new stat.Normal(0, 3))

const model = new ppl.Model(
  data => {
    const mu = ppl.sample("mu", new stat.Normal(0, 3))
    const sigma = ppl.sample("sigma", new stat.Uniform(0, 1))

    var likelihood;
    if (ppl.haskey(data, "x")) {
      likelihood = new stat.DistArray(
        data.x.map(_ => new stat.Normal(mu, sigma))
      )
    } else {
      likelihood = new stat.DistFill(new stat.Normal(mu, sigma), data.num_obs)
    }

    ppl.sample("x", likelihood, obs = data.x)
  }
)

const data = {
  x: [1,3,5]
}
// ppl.trace(model).get_trace(data)
model.run(data)

var t1 = ppl.trace(model).get_trace({num_obs: 10})
var t2 = ppl.trace(ppl.condition(model, {mu: 3, sigma: 0.1})).get_trace({num_obs: 2})
var t3 = ppl.trace(model).get_trace(data)

console.log(t1)
console.log(t2)
console.log(t3)

const big_data = {
  x: stat.DistFill(new stat.Normal(3, 0.5), 2000).sample()
}

const ms = stat.linspace(2.8, 3.2, 15)
const profile = ms.map(m => ppl.logpdf(model, {mu: m, sigma: 0.5}, big_data))

ms.forEach(function(m, i) {
  console.log(`${m.toFixed(2)}: ${profile[i].toFixed(2)}`)
})
