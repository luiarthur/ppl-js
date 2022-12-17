import { Distribution, rand, product } from "./stat.js"
import { predictive, logpdf, Model } from "./core.js"

type Dict<T> = {[key: string]: T}
type Data = Dict<any>
type Vector = Array<number>
type Numeric = Vector | number

abstract class Kernel<T> {
    abstract step(current_state: T): T
}

export class MvRWM extends Kernel<Vector> {
    logprob: (_: Vector) => number
    proposal: (_: Vector) => Vector

    constructor(logprob: (_: Vector) => number, proposal: (_: Vector) => Vector) {
        super()
        this.logprob = logprob
        this.proposal = proposal
    }

    step(current_state: Vector): Vector {
        const candidate = this.proposal(current_state)
        const log_acceptance_ratio = (
            this.logprob(candidate) - this.logprob(current_state) 
        )
        const accept = log_acceptance_ratio > Math.log(rand())
        return accept ? candidate : current_state
    }
}

export class Shaper {
    shapes: Dict<number>
    params: Array<string>

    constructor(state: Data) {
        this.shapes = {}
        this.params = Object.keys(state)
    }

    length(x: Numeric): number {
        return (typeof x === "number") ? 1 : x.length
    }

    vec(state: Dict<Numeric>): Vector {
        const out: Vector = []

        this.params.forEach(name => {
            const value = state[name]
            this.shapes[name] = this.length(value)
            if (typeof value === "number") {
                out.push(value)
            } else {
                value.forEach(x => out.push(x))
            }
        })

        return out
    }

    unvec(vec: Vector) {
        let state: Data = {}
        let start = 0
        this.params.forEach(name => {
            const num_elems = this.shapes[name]
            const value = vec.slice(start, start + num_elems)
            state[name] = value.length == 1 ? value[0] : value
            start += num_elems
        })

        return state
    }
}

export class MCMC {
    kernel: Kernel<Vector>
    state: Data
    samples: Array<Data>
    shaper: Shaper

    constructor(kernel: Kernel<Vector>, init_state: Data, shaper: Shaper) {
        this.kernel = kernel
        this.state = init_state
        this.samples = []
        this.shaper = shaper
    }

    fit(num_samples: number, burn: number=0, thin: number=1) {
        const total_iters = burn + num_samples * thin
        let vec_state = this.shaper.vec(this.state)

        for (let i = 0; i < total_iters; i++) {
            vec_state = this.kernel.step(vec_state)
            if (i + 1 > burn && (i + 1) % thin == 0) {
                this.samples.push(Object.assign({}, this.shaper.unvec(vec_state)))
            }
        }
        return this.samples
    }
}

export function mvrwm<T extends Data>(
    model: Model<T>,
    data: T,
    proposal: (_: Vector) => Vector,
    init_state?: Data)
{
    if (init_state === undefined) {
        init_state = predictive(model, data)
    }

    const shaper = new Shaper(init_state)

    const logprob = (vec: Vector) => logpdf(model, shaper.unvec(vec), data)
    const kernel = new MvRWM(logprob, proposal)

    return new MCMC(kernel, init_state, shaper)
}

/* Test. This should compile without errors. */
// import { sample } from "./core.js"
// import { Normal, Uniform, DistFill, randn } from "./stat.js"
// 
// const m = new Model(
//     (data: {x: Vector | number}) => {
//         const mu = sample("mu", new Normal(0, 1))
//         const sigma = sample("sigma", new Uniform(0, 1))
//         
//         if (typeof data.x === "number") {
//             sample("x", DistFill(new Normal(mu, sigma), data.x))
//         } else {
//             sample("x", DistFill(new Normal(mu, sigma), data.x.length), data.x)
//         }
//     }
// )
// 
// const mcmc = mvrwm(
//     m, // model.
//     {x: [0,3,1]}, // data.
//     (x: Vector) => x.map(xi => xi + randn() * 0.1), // proposal.
// )
// 
// console.log(mcmc.fit(10))
