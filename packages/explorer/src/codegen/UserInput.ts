export class UserInput {
  static readonly WRAPPER = '__';

  constructor(
    private readonly _key: string,
    private readonly _value: string,
    private readonly _description: string,
  ) {}

  static of(key: string, value: string, description: string) {
    return new UserInput(
      `${UserInput.WRAPPER}${key.toUpperCase().replaceAll(/ /g, '_')}${UserInput.WRAPPER}`,
      value,
      description,
    );
  }

  mask(text: string): string {
    return text.replaceAll(this._value, this._key);
  }

  unmask(text: string) {
    return text.replaceAll(this._key, this._value);
  }

  get keyWithDescription() {
    return {
      key: this._key,
      description: this._description,
    };
  }
}
