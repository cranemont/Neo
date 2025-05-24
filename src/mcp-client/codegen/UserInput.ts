export class UserInput {
  constructor(
    private readonly _key: string,
    private readonly _value: string,
    private readonly _description: string,
  ) {}

  static of(key: string, value: string, description: string) {
    return new UserInput(key, value, description);
  }

  unmask(text: string) {
    return text.replace(this.toUpperSnakeCase(this._key), this._value);
  }

  private toUpperSnakeCase(text: string) {
    return text.toUpperCase().replace(/ /g, '_');
  }

  get keyWithDescription() {
    return {
      key: this._key,
      description: this._description,
    };
  }
}
