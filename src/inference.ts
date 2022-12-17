import { Distribution, rand, product } from "./stat.js"

type Dict<T> = {[key: string]: T}
type Vector = Array<number>

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

    step(current_state: Vector) {
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
    dim: number

    constructor(shapes: Dict<number>, dim: number) {
        this.dim = dim
        this.shapes = shapes
    }

    length(x: Vector | number): number {
        return (typeof x === "number") ? 1 : x.length
    }

    vec(state: Dict<number | Vector>) {
        const out = []
        this.shapes = {}
        for (const key in state) {
            const value = state[key]
            this.shapes[key] = this.length(value)
            if (typeof value === "number") {
                out.push(value)
            } else {
                value.forEach(x => out.push(x))
            }
        }
    }

    unvec(vec: Vector) {
        let state: {[keys: string]: any} = {}
        let start = 0
        for (const name in this.shapes) {
            const num_elems = this.shapes[name]
            const value = vec.slice(start, start + num_elems)
            state[name] = value
            start += num_elems
        }
        return state
    }
}

export class MCMC {
    kernel: Kernel<Dict<any>>
    state: Dict<any>
    samples: Array<Dict<any>>
    shaper: Shaper

    constructor(kernel: Kernel<Dict<any>>, init_state: Dict<any>, shaper: Shaper) {
        this.kernel = kernel
        this.state = init_state
        this.samples = []
        this.shaper = shaper
    }

    fit(num_samples: number, burn: number=0, thin: number=1) {
        const total_iters = burn + num_samples * thin
        for (let i = 0; i < total_iters; i++) {
            this.state = this.kernel.step(this.state)
            if (i + 1 > burn && (i + 1) % thin == 0) {
                this.samples.push(Object.assign({}, this.state))
            }
        }
        return this.samples
    }
}