export interface InputContext {
  key: string;
  description: string;
}

export class UserInputContext {
  constructor(
    private readonly _key: string,
    private readonly _value: string,
    private readonly _description: string,
  ) {}

  static of(key: string, value: string, description: string) {
    return new UserInputContext(key, value, description);
  }

  asPromptContext(): InputContext {
    return {
      key: this._key,
      description: this._description,
    };
  }

  replaceIn(text: string) {
    return text.replace(this.toUpperSnakeCase(this._key), this._value);
  }

  private toUpperSnakeCase(text: string) {
    return text.toUpperCase().replace(/ /g, '_');
  }
}
