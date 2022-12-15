const assert = require("assert")

// Global handler stack.
const _stack = []

function clear_stack() {
  while(_stack.length > 0) {
    _stack.pop()
  }
}

const haskey = (obj, name) => obj[name] !== undefined

class Handler {
  constructor(fn) { this.fn = fn }

  #push() { _stack.push(this) }
  #pop() { assert(_stack.pop() === this) }

  run(args) {
    this.#push()
    const result = this.fn.run(args)
    this.#pop()
    return result
  }

  process(msg) { }
  postprocess(msg) { }
}

class Trace extends Handler {
  constructor(fn) {
    super(fn)
    this.result = {}
  }

  postprocess(msg) {
    assert(!haskey(this.result, msg.name), "Sample sites must have unique names!")
    this.result[msg.name] = Object.assign({}, msg)
  }

  get_trace(args) {
    this.run(args)
    return this.result
  }
}

const trace = (fn) => (new Trace(fn))

class Condition extends Handler {
  constructor(fn, substate) {
    super(fn)
    this.substate = substate
  }

  process(msg) {
    if (haskey(this.substate, msg.name)) {
      msg.value = this.substate[msg.name]
    }
  }
}

const condition = (fn, substate) => (new Condition(fn, substate))

function apply_stack(msg) {
  // Reverse in place.
  for (handler of _stack.reverse()) {
    handler.process(msg)
  }

  if (msg.value === null) {
    msg.value = msg.dist.sample()
  }

  // Reverse again, so order is back to original.
  for (handler of _stack.reverse()) {
    handler.postprocess(msg)
  }

  return msg
}

function sample(name, dist, obs=null) {
  if (_stack.length == 0) {
    return dist.sample()
  } else {
    const msg = {
      name: name,
      dist: dist,
      value: obs,
      observed: (obs !== null)
    }
    return apply_stack(msg).value
  }
}
 
function logpdf(model, state, args) {
  t = trace(condition(model, state)).get_trace(args)
  let lp = 0
  
  const names = Object.keys(t)
  for (name of names) {
    param = t[name]
    lp += param.dist.logpdf(param.value)
  }
  return lp
}

class Model {
  constructor(model) {
    this.model = model
  }

  run(data) { return this.model(data) }
}

module.exports = {
  trace, condition, logpdf, sample, Model,
  clear_stack, haskey
}
