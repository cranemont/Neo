export class UserInput {
  static readonly WRAPPER = '__';

  constructor(
    readonly key: string,
    readonly value: string,
    readonly description: string,
  ) {}

  static of(key: string, value: string, description: string) {
    return new UserInput(
      `${UserInput.WRAPPER}${key.toUpperCase().replaceAll(/ /g, '_')}${UserInput.WRAPPER}`,
      value,
      description,
    );
  }

  mask(text: string): string {
    return text.replaceAll(this.value, this.key);
  }

  unmask(text: string) {
    return text.replaceAll(this.key, this.value);
  }

  get keyWithDescription() {
    return {
      key: this.key,
      description: this.description,
    };
  }
}
