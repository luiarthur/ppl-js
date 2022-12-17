import { Distribution } from "./stat.js"

type Dict<T> = {[key: string]: T}

class Message<T> {
    name: string
    dist: Distribution<T>
    value?: T
    observed: boolean

    constructor(name: string, dist: Distribution<T>, value?: T) {
        this.name = name
        this.dist = dist
        this.value = value
        this.observed = !(value === undefined)
    }
}

abstract class Runner {
    abstract run(data: Dict<any>): void
}

class Model extends Runner {
    model: (_: Dict<any>) => void

    constructor(model: (_: Dict<any>) => void) {
        super()
        this.model = model
    }

    run = (data: Dict<any>) => this.model(data)
}

const _stack: Array<Handler> = []
function clear_stack() {
  while(_stack.length > 0) {
    _stack.pop()
  }
}

class Handler extends Runner {
    fn: Runner

    constructor(fn: Runner) {
        super()
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

    run(data: Dict<any>) {
        this.push()
        this.fn.run(data)
        this.pop()
    }

    process<T>(msg: Message<T>) {}
    postprocess<T>(msg: Message<T>) {}
}

class Trace extends Handler {
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

    get_trace(data: Dict<any>) {
        this.run(data)
        return this.result
    }
}

const trace = (fn: Runner) => (new Trace(fn))

class Condition extends Handler {
    substate: Dict<any>
    constructor(fn: Runner, substate: Dict<any>) {
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
        const msg = new Message(name, dist, obs)
        return apply_stack(msg).value!
    }
}

function logpdf(model: Model, state: Dict<any>, args: Dict<any>) {
  const t = trace(condition(model, state)).get_trace(args)
  let lp = 0
  
  const names = Object.keys(t)
  names.forEach(name => {
    const param = t[name]
    lp += param.dist.logpdf(param.value)
  })
  return lp
}

export { trace, condition, logpdf, sample, Model, clear_stack }
