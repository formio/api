export default abstract class Swagger {
  get baseRoute() {
    return this._baseRoute;
  }

  set baseRoute(value) {
    this._baseRoute = value;
  }

  constructor(private _baseRoute: string) {}

  public abstract getJson(): any;
}
