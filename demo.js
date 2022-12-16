import { stat, ppl } from "./src/index.js"

console.log("Running PPL.js demo!")

const model = new ppl.Model(
  data => {
    const mu = ppl.sample("mu", new stat.Normal(0, 3))
    const sigma = ppl.sample("sigma", new stat.Uniform(0, 1))

    const likelihood = ppl.haskey(data, "x") ? new stat.DistArray(
      data.x.map(_ => new stat.Normal(mu, sigma))
    ) : new stat.DistFill(new stat.Normal(mu, sigma), data.num_obs)

    ppl.sample("x", likelihood, data.x)
  }
)

const data = {
  x: [1,3,5]
}
// ppl.trace(model).get_trace(data)
model.run(data)

const t1 = ppl.trace(model).get_trace({num_obs: 10})
const t2 = ppl.trace(ppl.condition(model, {mu: 3, sigma: 0.1})).get_trace({num_obs: 2})
const t3 = ppl.trace(model).get_trace(data)

const big_data = {
  x: stat.DistFill(new stat.Normal(3, 0.5), 2000).sample()
}

const ms = stat.linspace(2.8, 3.2, 15)
const profile = ms.map(m => ppl.logpdf(model, {mu: m, sigma: 0.5}, big_data))

// print.
const ts = [t1, t2, t3]
ts.forEach(function(t, i) {
   document.getElementById(`demo-t${i + 1}`).innerHTML = `
   <h2>t${i + 1}</h2>
   <p>
   ${JSON.stringify(t)}
   </p>
   `
})

let result = "<h2>Profile</h2>"
ms.forEach(function(m, i) {
  result += `${m.toFixed(2)}: ${profile[i].toFixed(2)}<br>`
})
document.getElementById(`demo-profile`).innerHTML = result
