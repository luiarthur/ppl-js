import { logpdf } from "./dist/core.js"
import { stat, ppl, inference } from "./dist/ppl.js"
import { randn } from "./dist/stat.js"


console.log("Running ppl-js demo!")

const model = new ppl.Model(
  data => {
    const mu = ppl.sample("mu", new stat.Normal(0, 3))
    const sigma = ppl.sample("sigma", new stat.Uniform(0, 1))

    const likelihood = data.hasOwnProperty("x") ? new stat.DistArray(
      data.x.map(_ => new stat.Normal(mu, sigma))
    ) : new stat.DistFill(new stat.Normal(mu, sigma), data.num_obs)

    ppl.sample("x", likelihood, data.x)
  }
)

// const data = {
//   x: [1,3,5]
// }
// // ppl.trace(model).get_trace(data)
// model.run(data)
// 
// const t1 = ppl.trace(model).get_trace({num_obs: 10})
// const t2 = ppl.trace(ppl.condition(model, {mu: 3, sigma: 0.1})).get_trace({num_obs: 2})
// const t3 = ppl.trace(model).get_trace(data)
// 
// const big_data = {
//   x: stat.DistFill(new stat.Normal(3, 0.5), 2000).sample()
// }
// 
// const ms = stat.linspace(2.8, 3.2, 15)
// const profile = ms.map(m => ppl.logpdf(model, {mu: m, sigma: 0.5}, big_data))
// 
// // print.
// const ts = [t1, t2, t3]
// ts.forEach(function(t, i) {
//    document.getElementById(`demo-t${i + 1}`).innerHTML = `
//    <h2>t${i + 1}</h2>
//    <p>
//    ${JSON.stringify(t)}
//    </p>
//    `
// })
// 
// let result = "<h2>Profile</h2>"
// ms.forEach(function(m, i) {
//   result += `${m.toFixed(2)}: ${profile[i].toFixed(2)}<br>`
// })
// document.getElementById(`demo-profile`).innerHTML = result

// True population
const true_pop_dist = new stat.Normal(3, 0.5)

// MCMC
const big_data = {
  x: stat.DistFill(true_pop_dist, 2000).sample()
}

const mcmc = inference.mvrwm(
  model,
  big_data,
  x => x.map(xi => 0.1 * randn() + xi),
  {mu: 0, sigma: 0.1}
)
const chain = mcmc.fit(15, 2000, 100)
// const chain = mcmc.fit(10)

function bundle(chain) {
  const names = Object.keys(chain[0])
  const out = {}
  names.forEach(name => {
    out[name] = chain.map(s => s[name])
  })
  return out
}

const summaries = bundle(chain)

document.getElementById(`demo-mcmc`).innerHTML = `
<h2>MCMC</h2>

<h3>True Population Distribution</h3>
<p>${JSON.stringify(true_pop_dist)}</p>

<h3>Posterior Samples</h3>
${JSON.stringify(chain)}

<h3>mu</h3>
<ul>
  <li> Mean: ${stat.mean(summaries.mu).toFixed(5)} </li>
  <li> Std: ${stat.std(summaries.mu).toFixed(5)} </li>
</ul>

<h3>sigma</h3>
<ul>
  <li> Mean: ${stat.mean(summaries.sigma).toFixed(5)} </li>
  <li> Std: ${stat.std(summaries.sigma).toFixed(5)} </li>
</ul>
`
