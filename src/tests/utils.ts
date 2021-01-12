interface Constructable {
  new(...args: any[]): any
}

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

function produceFoolInstance<T extends Constructable>(Class: T, properties?: DeepPartial<InstanceType<T>>): InstanceType<T> {
  const object = Object.setPrototypeOf({}, Class.prototype);
  return Object.assign(object, properties);
}

export {
  produceFoolInstance,
};
