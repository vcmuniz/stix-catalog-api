export class UpdateProductAttributeCommand {
  constructor(
    public readonly productId: string,
    public readonly key: string,
    public readonly value: string | number | boolean,
  ) {}
}
