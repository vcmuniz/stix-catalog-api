export class RemoveProductAttributeCommand {
  constructor(
    public readonly productId: string,
    public readonly key: string,
  ) {}
}
