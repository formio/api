import {Api} from '../FormApi';
import {lodash as _} from '../util/lodash';

export class ReferenceHandler {
  public static hiddenFields = ['deleted', '__v', 'machineName'];

  private app: Api;
  private component: any;
  private path: string;
  private req: any;
  private res: any;

  constructor(component: any, path: string, req: any, res: any, app: any) {
    this.app = app;
    this.component = component;
    this.path = path;
    this.req = req;
    this.res = res;
  }

  get resource(): any {
    return _.get(this.res, 'resource.item');
  }

  get resourceValue(): any {
    return _.get(this.resource, `data.${this.path}`);
  }

  set resourceValue(value: any) {
    _.set(this.resource, `data.${this.path}`, value);
  }

  public async onGet(handler: string): Promise<void> {
    if (handler !== 'afterActions' || !this.resource || !this.resourceValue) {
      return;
    }

    const idQuery = this.getIdQuery(this.resourceValue);
    if (!idQuery) {
      return;
    }

    const items = await this.loadReferences({
      _id: idQuery,
      deleted: {$eq: null},
    });

    if (items && items.length > 0) {
      this.resourceValue = this.component.multiple ? items : items[0];
      return;
    }

    this.resourceValue = this.component.multiple
      ? this.resourceValue.map(({_id}) => ({_id}))
      : {_id: this.resourceValue._id};

    return;
  }

  public async onPost(handler: string): Promise<void> {
    if (handler === 'afterValidate') {
      return this.setResourceToRequest();
    } else if (handler === 'afterActions') {
      return this.getResourceFromRequest();
    }

    return;
  }

  public async onPut(handler: string): Promise<void> {
    if (handler === 'afterValidate') {
      return this.setResourceToRequest();
    } else if (handler === 'afterActions') {
      return this.getResourceFromRequest();
    }

    return;
  }

  public async onIndex(handler: string): Promise<void> {
    if (handler !== 'afterActions') {
      return;
    }

    const items = _.get(this.res, 'resource.items');
    if (!items) {
      return;
    }

    const flattenItems = await Promise.all(items.map((item: any) => this.flatItem(item)));
    _.set(this.res, 'resource.items', flattenItems.filter((item) => !!item));

    return;
  }

  private setResourceToRequest(): void {
    const compValue = _.get(this.req.body.data, this.path);

    if (compValue && compValue._id) {
      if (!this.req.resources) {
        this.req.resources = {};
      }

      // Save for later.
      this.req.resources[compValue._id.toString()] = _.omit(compValue, ReferenceHandler.hiddenFields);

      // Ensure we only set the _id of the resource.
      _.set(this.req.body.data, this.path, {
        _id: this.app.db.toID(compValue._id),
      });
    }
  }

  private getResourceFromRequest(): void {
    if (!this.resource) {
      return;
    }

    // Make sure to reset the value on the return result.
    const compValue = this.resourceValue;
    if (!compValue || !compValue._id) {
      return;
    }

    const compValueId = compValue._id.toString();
    if (compValue && this.req.resources && this.req.resources.hasOwnProperty(compValueId)) {
      this.resourceValue = this.req.resources[compValueId];
    }
  }

  private async loadReferences(query: any): Promise<any> {
    const references = await this.app.models.Submission.find(query);
    return references;
  }

  private getIdQuery(compValue: any): any {
    let idQuery: any;

    if (this.component.multiple && Array.isArray(compValue)) {
      idQuery = {$in: []};
      compValue.map((value) => idQuery.$in.push(this.app.db.toID(value._id)));
    } else if (compValue._id) {
      idQuery = this.app.db.toID(compValue._id);
    }

    return idQuery;
  }

  private async flatItem(item: any): Promise<any> {
    if (!item.data[this.path]) {
      return null;
    }

    const idQuery = this.getIdQuery(item.data[this.path]);
    if (!idQuery) {
      return null;
    }

    const items = await this.loadReferences({
      _id: idQuery,
      deleted: {$eq: null},
    });

    if (items && items.length > 0) {
      item.data[this.path] = this.component.multiple ? items : items[0];
      return item;
    }

    return null;
  }
}
