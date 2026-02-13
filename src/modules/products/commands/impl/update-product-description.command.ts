export class UpdateProductDescriptionCommand {
  constructor(
    public readonly id: string,
    public readonly description: string,
  ) {}
}
