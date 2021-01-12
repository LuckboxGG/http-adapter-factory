interface Constructable {
  new(...args: any[]): any
}

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

type OptionalProperties<T extends Constructable> = DeepPartial<{ [P in keyof InstanceType<T>]: InstanceType<T>[P] }>;

function produceFoolInstance<T extends Constructable>(Class: T, properties?: OptionalProperties<T>): InstanceType<T> {
  const object = Object.setPrototypeOf({}, Class.prototype);
  return Object.assign(object, properties);
}

export {
  produceFoolInstance,
};
