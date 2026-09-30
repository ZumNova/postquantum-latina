class EventEmitter {
  constructor() {
    this._events = new Map();
  }

  on(event, listener, context) {
    return this._add(event, listener, context, false);
  }

  addListener(event, listener, context) {
    return this.on(event, listener, context);
  }

  once(event, listener, context) {
    return this._add(event, listener, context, true);
  }

  off(event, listener, context, once) {
    return this.removeListener(event, listener, context, once);
  }

  removeListener(event, listener, context, once) {
    const listeners = this._events.get(event);
    if (!listeners) return this;

    const filtered = listeners.filter(item => {
      if (listener && item.listener !== listener) return true;
      if (context && item.context !== context) return true;
      if (once !== undefined && item.once !== once) return true;
      return false;
    });

    if (filtered.length) this._events.set(event, filtered);
    else this._events.delete(event);
    return this;
  }

  removeAllListeners(event) {
    if (event === undefined) this._events.clear();
    else this._events.delete(event);
    return this;
  }

  emit(event, ...args) {
    const listeners = this._events.get(event);
    if (!listeners || !listeners.length) return false;

    for (const item of [...listeners]) {
      item.listener.apply(item.context || this, args);
      if (item.once) this.removeListener(event, item.listener, item.context, true);
    }

    return true;
  }

  listeners(event) {
    return (this._events.get(event) || []).map(item => item.listener);
  }

  listenerCount(event) {
    return (this._events.get(event) || []).length;
  }

  eventNames() {
    return [...this._events.keys()];
  }

  _add(event, listener, context, once) {
    if (typeof listener !== "function") {
      throw new TypeError("The listener must be a function");
    }

    const listeners = this._events.get(event) || [];
    listeners.push({ listener, context, once });
    this._events.set(event, listeners);
    return this;
  }
}

EventEmitter.EventEmitter = EventEmitter;
EventEmitter.prefixed = false;

export { EventEmitter };
export default EventEmitter;
