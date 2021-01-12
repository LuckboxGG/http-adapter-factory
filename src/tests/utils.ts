interface Constructable {
  new(...args: any[]): any
}

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

function produceFoolInstance<T extends Constructable, Instance = InstanceType<T>>(Class: T, properties?: DeepPartial<Instance>): Instance {
  const object = Object.setPrototypeOf({}, Class.prototype);
  return Object.assign(object, properties);
}

export {
  produceFoolInstance,
};
