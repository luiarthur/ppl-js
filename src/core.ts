import { Distribution } from "./stat.js"

type Dict<T> = {[key: string]: T}
type Data = Dict<any>
type Vector = Array<number>
type Numeric = Vector | number
type Runner = Model<any> | Handler<any>

class Message<T> {
    name: string
    dist: Distribution<T>
    value?: T
    observed: boolean
    type: string

    constructor(name: string, dist: Distribution<T>, type: string, value?: T) {
        this.name = name
        this.dist = dist
        this.value = value
        this.observed = !(value === undefined)
        this.type = type
    }
}

class Model<T extends Data> {
    model: (data: T) => void

    constructor(model: (data: T) => void) {
        this.model = model
    }

    run = (data: T) => this.model(data)
}

const _stack: Array<Handler<any>> = []
function clear_stack() {
  while(_stack.length > 0) {
    _stack.pop()
  }
}

class Handler<T extends Data> {
    fn: Runner

    constructor(fn: Runner) {
        this.fn = fn
    }

    private push() {
        _stack.push(this)
    }

    private pop() {
        console.assert(
            _stack.pop() === this,
            "Unexpected handler encouuntered! Run `ppl.clear_stack()`!"
        )
    }

    run(data: T) {
        this.push()
        this.fn.run(data)
        this.pop()
    }

    process<S>(msg: Message<S>) {}
    postprocess<S>(msg: Message<S>) {}
}

class Trace<T extends Data> extends Handler<T> {
    result: Dict<any>

    constructor(fn: Runner) {
        super(fn)
        this.result = {}
    }

    postprocess<T>(msg: Message<T>) {
        console.assert(
            !this.result.hasOwnProperty(msg.name),
            "Sample sites must have unique names!"
        )
        this.result[msg.name] = Object.assign({}, msg)
    }

    get_trace(data: T) {
        this.run(data)
        return this.result
    }
}

const trace = (fn: Runner) => (new Trace(fn))

class Condition<T extends Data, S extends Data> extends Handler<T> {
    substate: S
    constructor(fn: Runner, substate: S) {
        super(fn)
        this.substate = substate
    }

    process<T>(msg: Message<T>) {
        if (this.substate.hasOwnProperty(msg.name)) {
            msg.value = this.substate[msg.name]
        }
    }
} 

function condition(fn: Runner, substate: Dict<any>) {
    return new Condition(fn, substate)
}

function apply_stack<T>(msg: Message<T>): Message<T> {
    // Reverses _stack in place.
    for (const handler of _stack.reverse()) {
        handler.process(msg)
    }

    if (msg.value === undefined) {
        msg.value = msg.dist.sample()
    }

    // Reverses _stack again, so order is back to original.
    for (const handler of _stack.reverse()) {
        handler.postprocess(msg)
    }

    return msg
}

function sample<T>(name: string, dist: Distribution<T>, obs?: T): T {
    if (_stack.length == 0) {
        return dist.sample()
    } else {
        const msg = new Message(name, dist, "sample", obs)
        return apply_stack(msg).value!
    }
}

function logpdf<T extends Data, S extends Data>(
    model: Model<T>, state: S, data: T
) {
  // console.log(state)
  const t = trace(condition(model, state)).get_trace(data)
  let lp: number = 0
  
  const names = Object.keys(t)
  names.forEach(name => {
    const param = t[name]
    lp += param.dist.logpdf(param.value)
  })


  return lp
}

function predictive<T extends Data>(
    model: Model<T>, data: Dict<Numeric>, substate?: Dict<Numeric>
) {
    const t = (substate === undefined) ? trace(model).get_trace(data) :
        trace(condition(model, substate)).get_trace(data)

    const out: Dict<Numeric> = {}
    for (const name in t) {
        const msg = t[name]
        if (msg.type == "sample" && !msg.observed) {
            out[name] = msg.value
        }
    }
    return out
}

export { trace, condition, logpdf, sample, Model, clear_stack, predictive}
